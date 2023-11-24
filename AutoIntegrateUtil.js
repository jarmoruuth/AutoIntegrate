/*
        AutoIntegrate utility functions.

Copyright (c) 2018-2023 Jarmo Ruuth.

Crop to common area code

      Copyright (c) 2022 Jean-Marc Lugrin.

Window name prefix and icon location code

      Copyright (c) 2021 rob pfile.

This product is based on software from the PixInsight project, developed
by Pleiades Astrophoto and its contributors (https://pixinsight.com/).

*/

function AutoIntegrateUtil(global)
{

this.__base__ = Object;
this.__base__();

var util = this;
var gui = null;

var par = global.par;
var ppar = global.ppar;

var use_force_close = true;

/* Set optional GUI object to update GUI components.
 */
this.setGUI = function(aigui)
{
      gui = aigui;
}

this.init_pixinsight_version = function()
{
      global.pixinsight_version_str = CoreApplication.versionMajor + '.' + CoreApplication.versionMinor + '.' + 
                                      CoreApplication.versionRelease + '-' + CoreApplication.versionRevision;
      global.pixinsight_version_num = CoreApplication.versionMajor * 1e6 + 
                                      CoreApplication.versionMinor * 1e4 + 
                                      CoreApplication.versionRelease * 1e2 + 
                                      CoreApplication.versionRevision;     
}

this.runGarbageCollection = function()
{
      gc(false);        // run soft gc
}

this.checkEvents = function()
{
      processEvents();  // process events to keep GUI responsible
      util.runGarbageCollection();
}

/// Init filter sets. We used to have actual Set object but
// use a simple array so we can add object into it.
// There are file sets for each possible filters and
// each array element has file name and used flag.
this.initFilterSets = function()
{
      return [
            ['L', []],
            ['R', []],
            ['G', []],
            ['B', []],
            ['H', []],
            ['S', []],
            ['O', []],
            ['C', []]
      ];
}

// find filter set object based on file type
this.findFilterSet = function(filterSet, filetype)
{
      for (var i = 0; i < filterSet.length; i++) {
            if (filterSet[i][0] == filetype) {
                  return filterSet[i][1];
            }
      }
      util.throwFatalError("findFilterSet bad filetype " + filetype);
      return null;
}

// Add file base name to the filter set object
// We use file base name to detect filter files
this.addFilterSetFile = function(filterSet, filePath, filetype)
{
      var basename = File.extractName(filePath);
      console.writeln("addFilterSetFile add " + basename + " filter "+ filetype);
      filterSet[filterSet.length] = { name: basename, used: false };
}

// Try to find base file name from filter set objects.
// We use simple linear search which should be fine
// for most data sizes.
this.findFilterForFile = function(filterSet, filePath, filename_postfix)
{
      var basename = File.extractName(filePath);
      if (filename_postfix.length > 0) {
            // strip filename_postfix from the end
            basename = basename.slice(0, basename.length - filename_postfix.length);
      }
      console.writeln("findFilterForFile " + basename);
      for (var i = 0; i < filterSet.length; i++) {
            var filterFileSet = filterSet[i][1];
            for (var j = 0; j < filterFileSet.length; j++) {
                  if (!filterFileSet[j].used && filterFileSet[j].name == basename) {
                        console.writeln("findFilterForFile filter " + filterSet[i][0]);
                        filterFileSet[j].used = true;
                        return filterSet[i][0];
                  }
            }
      }
      return null;
}

// remove a file from filter set
this.removeFilterFile = function(filterSet, filePath)
{
      var basename = File.extractName(filePath);
      for (var i = 0; i < filterSet.length; i++) {
            var filterFileSet = filterSet[i][1];
            for (var j = 0; j < filterFileSet.length; j++) {
                  if (filterFileSet[j].name == basename) {
                        filterFileSet.splice(j, 1);
                        return;
                  }
            }
      }
}

this.clearFilterFileUsedFlags = function(filterSet)
{
      console.writeln("clearUsedFilterForFiles");
      for (var i = 0; i < filterSet.length; i++) {
            var filterFileSet = filterSet[i][1];
            for (var j = 0; j < filterFileSet.length; j++) {
                  filterFileSet[j].used = false;
            }
      }
      return null;
}

this.setDefaultDirs = function()
{
      global.AutoOutputDir = "AutoOutput";
      global.AutoCalibratedDir = "AutoCalibrated";
      global.AutoMasterDir = "AutoMaster";
      global.AutoProcessedDir = "AutoProcessed";
}

this.clearDefaultDirs = function()
{
      global.AutoOutputDir = ".";
      global.AutoCalibratedDir = ".";
      global.AutoMasterDir = ".";
      global.AutoProcessedDir = ".";
}

this.ensurePathEndSlash = function(dir)
{
      if (dir.length > 0) {
            switch (dir[dir.length-1]) {
                  case '/':
                  case '\\':
                  case ':':
                        return dir;
                  default:
                        return dir + '/';
            }
      }
      return dir;
}

this.removePathEndSlash = function(dir)
{
      if (dir.length > 1) {
            switch (dir[dir.length-1]) {
                  case '/':
                  case '\\':
                        return dir.slice(0, -1);
                  default:
                        return dir;
            }
      }
      return dir;
}

this.removePathEndDot = function(dir)
{
      if (dir.length > 0) {
            switch (dir.substr(-2, 2)) {
                  case '/.':
                  case '\\.':
                        return dir.slice(0, -2);
                  default:
                        return dir;
            }
      }
      return dir;
}

// parse full path from file name appended with '/
this.parseNewOutputDir = function(filePath, subdir)
{
      var path = util.ensurePathEndSlash(File.extractDrive(filePath) + File.extractDirectory(filePath));
      path = util.ensurePathEndSlash(path + subdir);
      console.writeln("parseNewOutputDir " + path);
      return path;
}

// If path is relative and not absolute, we append it to the 
// path of the image file
this.pathIsRelative = function(p)
{
      var dir = File.extractDirectory(p);
      if (dir == null || dir == '') {
            return true;
      }
      switch (dir[0]) {
            case '/':
            case '\\':
                  return false;
            default:
                  return true;
      }
}

this.throwFatalError = function(txt)
{
      util.addProcessingStepAndStatusInfo(txt);
      global.run_results.fatal_error = txt;
      global.is_processing = false;
      throw new Error(txt);
}

this.findWindow = function(id)
{
      if (id == null || id == undefined) {
            return null;
      }
      var images = ImageWindow.windows;
      if (images == null || images == undefined) {
            return null;
      }
      for (var i in images) {
            if (images[i].mainView != null
                && images[i].mainView != undefined
                && images[i].mainView.id == id)
            {
               return images[i];
            }
      }
      return null;
}

this.findWindowRe = function(re)
{
      if (re == null || re == undefined) {
            return null;
      }
      var images = ImageWindow.windows;
      if (images == null || images == undefined) {
            return null;
      }
      for (var i in images) {
            if (images[i].mainView != null
                && images[i].mainView != undefined
                && images[i].mainView.id.match(re))
            {
               return images[i];
            }
      }
      return null;
}

this.closeAllWindowsSubstr = function(id_substr)
{
      var images = ImageWindow.windows;
      if (images == null || images == undefined) {
            return;
      }
      for (var i in images) {
            if (images[i].mainView != null
                && images[i].mainView != undefined
                && images[i].mainView.id.indexOf(id_substr) != -1) 
            {
               images[i].close;
            }
      }
}

this.getWindowList = function()
{
      var windowList = [];
      var images = ImageWindow.windows;
      if (images == null || images == undefined) {
            return windowList;
      }
      for (var i in images) {
            try {
                  if (images[i].mainView != null && images[i].mainView != undefined) {
                        windowList[windowList.length] = images[i].mainView.id;
                  }
            } catch (err) {
                  // ignore errors
            }
      }
      return windowList;
}

this.getWindowListReverse = function()
{
      var windowListReverse = [];
      var windowList = util.getWindowList();
      for (var i = windowList.length-1; i >= 0; i--) {
            if (windowList[i].match(/undo[1-9]*/g) == null) {
                  windowListReverse[windowListReverse.length] = windowList[i];
            }
      }
      return windowListReverse;
}

this.findWindowId = function(id)
{
      var w = util.findWindow(id);

      if (w == null) {
            return null;
      }

      return w.mainView.id;
}

this.windowShowif = function(id)
{
      var w = util.findWindow(id);
      if (w != null) {
            w.show();
      }
}

// Iconify the window, the return value is the window,
// only as a convenience to this.windowIconizeAndKeywordif()
this.windowIconizeif = function(id)
{
      if (id == null) {
            return null;
      }
      if (global.flowchart) {
            util.closeOneWindow(id);
            return null;
      }

      var w = util.findWindow(id);

      if (w != null) {
            /* Method iconize() will put the icon at the middle position
               of the window. To get icons to the top left corner we
               first move the window middle position there to get
               the icon at the right position. Then we restore the 
               window position back to old position.
            */
            var oldpos = new Point(w.position);  // save old position
            if (global.iconPoint == null) {
                  /* Get first icon to upper left corner. */
                  global.iconPoint = new Point(
                                    -(w.width / 2) + 5 + global.columnCount*300,
                                    -(w.height / 2) + 5 + global.iconStartRow * 32);
                  //console.writeln("Icon " + id + " start from position " + global.iconPoint + ", global.iconStartRow " + global.iconStartRow + ", global.columnCount " + global.columnCount);
            } else {
                  /* Put next icons in a nice row below the first icon.
                  */
                  // global.iconPoint.moveBy(0, 32);
                  global.iconPoint = new Point(
                        -(w.width / 2) + 5 + global.columnCount*300,
                        -(w.height / 2) + 5 + global.iconStartRow * 32 + global.haveIconized * 32);
                  // console.writeln("Next icon " + id + " position " + global.iconPoint + ", global.iconStartRow " + global.iconStartRow + ", global.columnCount " + global.columnCount);
            }
            w.position = new Point(global.iconPoint);  // set window position to get correct icon position
            w.iconize();
            w.position = oldpos;                // restore window position

            global.haveIconized++;
      }
      return w;
}

this.filterKeywords = function(imageWindow, keywordname) 
{
      var oldKeywords = [];
      var keywords = imageWindow.keywords;
      for (var i = 0; i < keywords.length; i++) {
            var keyword = keywords[i];
            if (keyword.name != keywordname) {
                  oldKeywords[oldKeywords.length] = keyword;
            }
      }
      return oldKeywords;
}

// Overwrite an old keyword or add a new one
this.setFITSKeyword = function(imageWindow, name, value, comment) 
{
      var oldKeywords = util.filterKeywords(imageWindow, name);
      imageWindow.keywords = oldKeywords.concat([
         new FITSKeyword(
            name,
            value,
            comment
         )
      ]);
}

// Append a new keyword, allows multiple keywords with same name
this.appenFITSKeyword = function(imageWindow, name, value, comment) 
{
      imageWindow.keywords = imageWindow.keywords.concat([
         new FITSKeyword(
            name,
            value,
            comment
         )
      ]);
}

this.getKeywordValue = function(imageWindow, keywordname) 
{
      var keywords = imageWindow.keywords;
      for (var i = 0; i < keywords.length; i++) {
            var keyword = keywords[i];
            if (keyword.name == keywordname) {
                  return keyword.strippedValue.trim();
            }
      }
      return null;
}

this.findKeywordName = function(imageWindow, keywordname) 
{
      var keywords = imageWindow.keywords;
      for (var i = 0; i < keywords.length; i++) {
            var keyword = keywords[i];
            if (keyword.name == keywordname) {
                  return true;
            }
      }
      return false;
}

this.setFITSKeywordNoOverwrite = function(imageWindow, name, value, comment)
{
      if (util.findKeywordName(imageWindow, name)) {
            console.writeln("keyword already set");
            return;
      }
      util.setFITSKeyword(imageWindow, name, value, comment);
}

function setProcessedImageKeyword(imageWindow) 
{
      console.writeln("setProcessedImageKeyword to " + imageWindow.mainView.id);
      util.setFITSKeywordNoOverwrite(
            imageWindow,
            "AutoIntegrate",
            "processedimage",
            "AutoIntegrate processed intermediate image");
}

this.windowIconizeAndKeywordif = function(id)
{
      var w = util.windowIconizeif(id);

      if (w != null) {
 
            // Set processed image keyword. It will not overwrite old
            // keyword. If we later set a final image keyword it will overwrite
            // this keyword.
            setProcessedImageKeyword(w);
      }
}

// Add a script window that will be closed when close all is clicked
// Useful for temporary windows that do not have a fixed name
this.addScriptWindow = function(name)
{
      global.all_windows[global.all_windows.length] = name;
}

this.windowRenameKeepifEx = function(old_name, new_name, keepif, allow_duplicate_name)
{
      if (global.flowchart) {
            allow_duplicate_name = true;
      }
      if (old_name == new_name) {
            return new_name;
      }
      var w = util.findWindow(old_name);
      if (!w) {
            util.throwFatalError("Could not find image " + old_name + " for rename");
      }
      w.mainView.id = new_name;
      if (!keepif) {
            util.addScriptWindow(new_name);
      }
      if (!allow_duplicate_name && w.mainView.id != new_name) {
            util.fatalWindowNameFailed("Window rename from " + old_name + " to " + new_name + " failed, name is " + w.mainView.id);
      }
      if (global.flowchart && w.mainView.id != new_name) {
            global.flowchartWindows[global.flowchartWindows.length] = w.mainView.id;
      }
      return w.mainView.id;
}

this.windowRenameKeepif = function(old_name, new_name, keepif)
{
      return util.windowRenameKeepifEx(old_name, new_name, keepif, false);
}

this.windowRename = function(old_name, new_name)
{
      return util.windowRenameKeepif(old_name, new_name, false);
}

this.forceCloseOneWindow = function(w)
{
      if (w == null) {
            return;
      }
      if (par.keep_temporary_images.val) {
            w.mainView.id = "tmp_" + w.mainView.id;
            w.show();
            console.writeln("Rename window to " + w.mainView.id);
      } else if (use_force_close) {
            w.forceClose();
      } else {
            // PixInsight will ask if file is changed but not saved
            w.close();
      }
}

// close one window
this.closeOneWindow = function(id)
{
      var w = util.findWindow(id);
      if (w != null) {
            util.forceCloseOneWindow(w);
      }
}

// For the final window, we may have more different names with
// both prefix or postfix added
this.closeFinalWindowsFromArray = function(arr, force_close)
{
      use_force_close = force_close;

      for (var i = 0; i < arr.length; i++) {
            util.closeOneWindow(arr[i]);
            util.closeOneWindow(arr[i]+"_stars");
            util.closeOneWindow(arr[i]+"_starless");
            util.closeOneWindow(arr[i]+"_extra");
            util.closeOneWindow(arr[i]+"_extra_starless");
            util.closeOneWindow(arr[i]+"_extra_stars");
            util.closeOneWindow(arr[i]+"_extra_combined");
      }

      use_force_close = true;
}

this.closeTempWindowsForOneImage = function(id)
{
      util.closeOneWindow(id + "_max");
      util.closeOneWindow(id + "_map");
      util.closeOneWindow(id + "_stars");
      util.closeOneWindow(id + "_map_mask");
      util.closeOneWindow(id + "_map_stars");
      util.closeOneWindow(id + "_map_pm");
      util.closeOneWindow(id + "_mask");
      util.closeOneWindow(id + "_tmp");
}

this.closeTempWindows = function()
{
      for (var i = 0; i < global.integration_LRGB_windows.length; i++) {
            util.closeTempWindowsForOneImage(global.integration_LRGB_windows[i]);
            util.closeTempWindowsForOneImage(global.integration_LRGB_windows[i] + "_BE");
      }
      for (var i = 0; i < global.integration_color_windows.length; i++) {
            util.closeTempWindowsForOneImage(global.integration_color_windows[i]);
            util.closeTempWindowsForOneImage(global.integration_color_windows[i] + "_BE");
      }
}

this.findFromArray = function(arr, id)
{
      for (var i = 0; i < arr.length; i++) {
            if (arr[i] == id) {
                  return true;
            }
      }
      return false;
}

function fixWindowArray(arr, prev_prefix, cur_prefix)
{
    if (prev_prefix != "") {
        // in this situation we've fixed up the array at least once, but the user changed the prefix
        // in the UI and so the old prefix must be removed from the array before prepending the new one.

        for (var i = 0; i < arr.length; i++) {
            arr[i] = arr[i].substring(arr[i].indexOf(prev_prefix.toString()) + prev_prefix.length);
        }
    }

    // add the window prefix to the array.

    for (var i = 0; i < arr.length; i++) {
        arr[i] = cur_prefix + arr[i];
    }

}

function getWindowPrefix(basename, curname)
{
      return curname.substring(0, curname.length - basename.length);
}

// Fix all fixed window names by having the given prefix
// We find possible previous prefix from the known fixed
// window name
this.fixAllWindowArrays = function(new_prefix)
{
      var old_prefix = getWindowPrefix("Integration_L", global.integration_LRGB_windows[0]);
      if (old_prefix == new_prefix) {
            // no change
            // console.writeln("fixAllWindowArrays no change in prefix '" + new_prefix + "'");
            return;
      }
      // console.writeln("fixAllWindowArrays set new prefix '" + new_prefix + "'");
      fixWindowArray(global.integration_LRGB_windows, old_prefix, new_prefix);
      fixWindowArray(global.integration_processed_channel_windows, old_prefix, new_prefix);
      fixWindowArray(global.integration_color_windows, old_prefix, new_prefix);
      fixWindowArray(global.integration_crop_windows, old_prefix, new_prefix);
      fixWindowArray(global.fixed_windows, old_prefix, new_prefix);
      fixWindowArray(global.calibrate_windows, old_prefix, new_prefix);
      fixWindowArray(global.final_windows, old_prefix, new_prefix);
}

this.getOutputDir = function(filePath)
{
      var outputDir = global.outputRootDir;
      if (global.outputRootDir == "" || util.pathIsRelative(global.outputRootDir)) {
            if (filePath != null && filePath != "") {
                  outputDir = util.parseNewOutputDir(filePath, global.outputRootDir);
                  console.writeln("getOutputDir, outputDir ", outputDir);
            } else {
                  outputDir = "";
                  console.writeln("outputDir empty filePath");
            }
      }
      return outputDir;
}

// Write something to a directory to test if it is writeable
this.testDirectoryIsWriteable = function(dir)
{
      var fname = util.ensurePathEndSlash(dir) + "info.txt";
      var info = global.getDirectoryInfo(true);
      try {
            let file = new File();
            file.createForWriting(fname);
            file.outTextLn(info);
            file.close();
      } catch (error) {
            console.criticalln(error);
            util.throwFatalError("Failed to write to directory " + dir);
      }
}

this.ensureDir = function(dir)
{
      // console.writeln("ensureDir " + dir)
      if (dir == "") {
            return;
      }
      var noslashdir = util.removePathEndSlash(dir);
      noslashdir = util.removePathEndDot(noslashdir);
      if (!File.directoryExists(noslashdir)) {
            console.writeln("Create directory " + noslashdir);
            File.createDirectory(noslashdir);
            if (!File.directoryExists(noslashdir)) {
                  util.throwFatalError("Failed to create directory " + noslashdir);
            }
            util.testDirectoryIsWriteable(noslashdir);
      }
}

this.saveLastDir = function(dirname)
{
      ppar.lastDir = util.removePathEndSlash(dirname);
      if (!global.do_not_write_settings) {
            Settings.write(SETTINGSKEY + '/lastDir', DataType_String, ppar.lastDir);
            console.writeln("Save lastDir '" + ppar.lastDir + "'");
      }
}

this.combinePath = function(p1, p2)
{
      if (p1 == "") {
            return "";
      } else {
            return util.ensurePathEndSlash(p1) + p2;
      }
}

this.saveWindowEx = function(path, id, optional_unique_part, optional_save_id)
{
      if (path == null || id == null) {
            return null;
      }
      if (optional_save_id) {
            var fname = path + optional_save_id + optional_unique_part + ".xisf";
            console.writeln("saveWindowEx " + id + " as " + fname);
      } else {
            var fname = path + id + optional_unique_part + ".xisf";
            console.writeln("saveWindowEx " + fname);
      }

      if (global.flowchart) {
            return fname;
      }

      var w = ImageWindow.windowById(id);

      if (w == null) {
            return null;
      }

      // Save image. No format options, no warning messages, 
      // no strict mode, no overwrite checks.
      if (!w.saveAs(fname, false, false, false, false)) {
            util.throwFatalError("Failed to save image: " + fname);
      }
      return fname;
}

this.getOptionalUniqueFilenamePart = function()
{
      if (par.unique_file_names.val) {
            return format("_%04d%02d%02d_%02d%02d%02d",
                          global.processingDate.getFullYear(), global.processingDate.getMonth() + 1, global.processingDate.getDate(),
                          global.processingDate.getHours(), global.processingDate.getMinutes(), global.processingDate.getSeconds());
      } else {
            return "";
      }
}

this.saveFinalImageWindow = function(win, dir, name, bits)
{
      console.writeln("saveFinalImageWindow " + name);
      var copy_win = util.copyWindow(win, util.ensure_win_prefix(name + "_savetmp"));
      var save_name;

      // 8 and 16 bite are TIFF, 32 is XISF
      if (bits != 32) {
            if (bits == 16) {
                  var new_postfix = "";
            } else {
                  var new_postfix = "_" + bits;
            }
            var old_postfix = name.substr(name.length - new_postfix.length);
            if (old_postfix != new_postfix) {
                  save_name = this.ensurePathEndSlash(dir) + name + new_postfix + util.getOptionalUniqueFilenamePart() + ".tif";
            } else {
                  // we already have bits added to name
                  save_name = util.ensurePathEndSlash(dir) + name + util.getOptionalUniqueFilenamePart() + ".tif";
            }

            if (copy_win.bitsPerSample != bits) {
                  console.writeln("saveFinalImageWindow:set bits to " + bits);
                  copy_win.setSampleFormat(bits, false);
            }
      } else {
            save_name = util.ensurePathEndSlash(dir) + name + util.getOptionalUniqueFilenamePart() + ".xisf";
      }
      console.writeln("saveFinalImageWindow:save name " + name);
      // Save image. No format options, no warning messages, 
      // no strict mode, no overwrite checks.
      if (!copy_win.saveAs(save_name, false, false, false, false)) {
            util.throwFatalError("Failed to save image: " + save_name);
      }
      util.forceCloseOneWindow(copy_win);
}

this.saveAllFinalImageWindows = function(bits)
{
      console.writeln("saveAllFinalImageWindows");

      // Find a windows that has a keyword which tells this is
      // a final image file
      var images = ImageWindow.windows;
      var finalimages = [];
      for (var i in images) {
            var imageWindow = images[i];
            var keywords = imageWindow.keywords;
            if (keywords != null && keywords != undefined) {
                  for (var j = 0; j != keywords.length; j++) {
                        var keyword = keywords[j].name;
                        var value = keywords[j].strippedValue.trim();
                        if (par.save_all_files.val) {
                              var savefile = keyword == "AutoIntegrate" && (value == "finalimage" || value == "processedimage");
                        } else {
                              var savefile = keyword == "AutoIntegrate" && value == "finalimage";
                        }
                        if (savefile) {
                              // we need to save this image window 
                              if (imageWindow.mainView != null 
                                  && imageWindow.mainView != undefined
                                  && imageWindow.mainView.id
                                  && imageWindow.mainView.id.match(/undo[1-9]*/g) == null)
                              {
                                    finalimages[finalimages.length] = imageWindow;
                              }
                              break;
                        }
                  }
            }
      }

      if (finalimages.length == 0) {
            console.noteln("No final images found");
            return;
      }

      var gdd = new GetDirectoryDialog;
      gdd.caption = "Select Final Image Save Directory";
      var filePath = finalimages[0].filePath;
      if (filePath != null) {
            gdd.initialPath = File.extractDrive(filePath) + File.extractDirectory(filePath);
      } else {
            gdd.initialPath = ppar.lastDir;
      }

      if (gdd.execute()) {
            console.writeln("saveAllFinalImageWindows:dir " + gdd.directory);
            util.saveLastDir(gdd.directory);
            for (var i = 0; i < finalimages.length; i++) {
                  util.saveFinalImageWindow(finalimages[i], gdd.directory, finalimages[i].mainView.id, bits);
            }
      }
      console.writeln("All final image windows are saved!");
}

this.fatalWindowNameFailed = function(txt)
{
      console.criticalln(txt);
      console.criticalln("Close old images or use a different window prefix.");
      util.throwFatalError("Processing stopped");
}

this.copyWindowEx = function(sourceWindow, name, allow_duplicate_name)
{
      if (global.flowchart) {
            allow_duplicate_name = true;
      }
      if (sourceWindow == null) {
            util.throwFatalError("Window not found, cannot copy to " + name);
      }
      var targetWindow = new ImageWindow(
                              sourceWindow.mainView.image.width,
                              sourceWindow.mainView.image.height,
                              sourceWindow.mainView.image.numberOfChannels,
                              sourceWindow.mainView.window.bitsPerSample,
                              sourceWindow.mainView.window.isFloatSample,
                              sourceWindow.mainView.image.colorSpace != ColorSpace_Gray,
                              name);
      targetWindow.mainView.beginProcess(UndoFlag_NoSwapFile);
      targetWindow.mainView.image.assign(sourceWindow.mainView.image);
      targetWindow.keywords = sourceWindow.keywords;
      if (global.pixinsight_version_num >= 1080902) {
            targetWindow.copyAstrometricSolution(sourceWindow);
      }
      targetWindow.mainView.endProcess();

      targetWindow.show();

      util.addScriptWindow(name);

      if (targetWindow.mainView.id != name && !allow_duplicate_name) {
            util.fatalWindowNameFailed("Failed to copy window to name " + name + ", copied window name is " + targetWindow.mainView.id);
      }

      console.writeln("copy window " + sourceWindow.mainView.id + " to " + name);

      if (global.flowchart) {
            global.flowchartWindows[global.flowchartWindows.length] = targetWindow.mainView.id;
      }

      return targetWindow;
}

this.copyWindow = function(sourceWindow, name)
{
      return util.copyWindowEx(sourceWindow, name, false);
}

this.createWindowFromBitmap = function(bitmap, id)
{
      var win = new ImageWindow(
                        bitmap.width,
                        bitmap.height,
                        3,
                        32,
                        true,
                        true,
                        id);

      win.mainView.beginProcess(UndoFlag_NoSwapFile);
      win.mainView.image.blend(bitmap);
      win.mainView.endProcess();
                  
      return win;
}

this.addProcessingStep = function(txt)
{
      console.noteln("AutoIntegrate: " + txt);
      global.processing_steps = global.processing_steps + "\n" + txt;
}

this.updateStatusInfoLabel = function(txt)
{
      if (global.flowchart) {
            return;
      }
      if (txt.length > 100) {
            txt = txt.substring(0, 100);
      }
      if (global.tabStatusInfoLabel != null) {
            global.tabStatusInfoLabel.text = txt;
      }
      if (global.sideStatusInfoLabel != null) {
            global.sideStatusInfoLabel.text = txt;
      }
}

this.addCriticalStatus = function(txt)
{
      console.criticalln(txt);
      global.processing_errors = global.processing_errors + "\n" + txt;
}

this.addStatusInfo = function(txt)
{
      console.noteln("------------------------");
      console.noteln(txt);
      util.updateStatusInfoLabel(txt);
      util.checkEvents();
}

this.addProcessingStepAndStatusInfo = function(txt)
{
      util.addProcessingStep(txt);
      util.updateStatusInfoLabel(txt);
}

this.ensure_win_prefix = function(id)
{
      if (ppar.win_prefix != "" && !id.startsWith(ppar.win_prefix)) {
            return ppar.win_prefix + id;
      } else {
            return id;
      }
}

function is_non_starless_option()
{
      return par.extra_GC.val || 
             par.extra_banding_reduction.val ||
             par.extra_darker_background.val || 
             par.extra_darker_hightlights.val ||
             par.extra_ET.val || 
             par.extra_HDRMLT.val || 
             par.extra_LHE.val || 
             par.extra_contrast.val ||
             par.extra_stretch.val ||
             par.extra_autostf.val ||
             par.extra_shadowclipping.val ||
             par.extra_smoothbackground.val ||
             par.extra_noise_reduction.val ||
             par.extra_ACDNR.val ||
             par.extra_color_noise.val ||
             par.extra_sharpen.val ||
             par.extra_unsharpmask.val ||
             par.extra_saturation.val ||
             par.extra_clarity.val ||
             par.extra_smaller_stars.val ||
             par.extra_normalize_channels.val ||
             par.extra_adjust_channels.val ||
             par.extra_shadow_enhance.val ||
             par.extra_highlight_enhance.val ||
             par.extra_gamma.val ||
             par.extra_auto_contrast.val ||
             par.extra_color_calibration.val ||
             par.extra_solve_image.val ||
             par.extra_annotate_image.val ||
             par.extra_rotate.val;
}

this.is_extra_option = function()
{
      return par.extra_remove_stars.val || 
             par.extra_combine_stars.val ||
             is_non_starless_option();
}

this.is_narrowband_option = function()
{
      return par.fix_narrowband_star_color.val ||
             par.run_less_green_hue_shift.val ||
             par.run_orange_hue_shift.val ||
             par.run_hue_shift.val ||
             par.run_foraxx_mapping.val ||
             par.run_extra_narrowband_mapping.val ||
             par.run_orangeblue_colors.val ||
             par.run_colorized_narrowband.val ||
             par.run_narrowband_SCNR.val ||
             par.leave_some_green.val ||
             par.remove_magenta_color.val;
}

this.mapBadChars = function(str)
{
      str = str.replace(/ /g,"_");
      str = str.replace(/-/g,"_");
      str = str.replace(/,/g,"_");
      return str;
}

this.ensureDialogFilePath = function(names)
{
      if (global.outputRootDir == "") {
            var gdd = new GetDirectoryDialog;
            gdd.caption = "Select Save Directory for " + names;
            gdd.initialPath = ppar.lastDir;
            console.noteln(gdd.caption);
            if (!gdd.execute()) {
                  console.writeln("No path for " + names + ', nothing written');
                  return 0;
            }
            util.saveLastDir(gdd.directory);
            global.outputRootDir = gdd.directory;
            if (global.outputRootDir != "") {
                  global.outputRootDir = util.ensurePathEndSlash(global.outputRootDir);
            }
            console.writeln("ensureDialogFilePath, set global.outputRootDir ", global.outputRootDir);
            return 1;
      } else {
            return 2;
      }
}

this.setParameterDefaults = function()
{
      console.writeln("Set parameter defaults");
      for (let x in par) {
            var param = par[x];
            if (!param.skip_reset) {
                  param.val = param.def;
                  if (param.reset != undefined) {
                        param.reset();
                  }
            }
      }
}

function getSettingsFromJson(settings)
{
      if (settings == null || settings == undefined) {
            console.noteln("getSettingsFromJson: empty settings");
            return;
      }

      if (par.reset_on_setup_load.val) {
            util.setParameterDefaults();
      }

      console.noteln("Restore " + settings.length + " settings");

      for (var i = 0; i < settings.length; i++) {
            for (let x in par) {
                  var param = par[x];
                  if (param.name == settings[i][0]) {
                        var name_found = true;
                  } else if (param.oldname != undefined && param.oldname == settings[i][0]) {
                        var name_found = true;
                  } else {
                        var name_found = false;
                  }
                  if (name_found) {
                        param.val = settings[i][1];
                        if (param.reset != undefined) {
                              param.reset();
                        }
                        console.writeln("getSettingsFromJson, set " + param.name + "=" + param.val);
                  }
            }
      }
}

/* Read saved Json file info.
 */ 
this.readJsonFile = function(fname, lights_only)
{
      console.writeln("readJsonFile " + fname + " lights_only " + lights_only);

      var jsonFile = File.openFileForReading(fname);
      if (!jsonFile.isOpen) {
            console.criticalln("Could not open file " + fname);
            return null;
      }
      var jsonStr = jsonFile.read(DataType_ByteArray, jsonFile.size);
      jsonFile.close();

      var saveInfo = JSON.parse(jsonStr);
      if (saveInfo == null) {
            console.criticalln("Could not parse Json data in file " + fname);
            return null;
      }
      switch (saveInfo.version) {
            case 1:
            case 2:
            case 3:
                  // ok
                  break;
            default:
                  console.criticalln("Incorrect version " +  saveInfo.version + " in file " + fname);
                  return null;
      }
      
      if (saveInfo.version >= 2) {
            // read parameter values
            getSettingsFromJson(saveInfo.settings);
      }
      if (saveInfo.window_prefix != null && saveInfo.window_prefix != undefined) {
            ppar.win_prefix = saveInfo.window_prefix;
            if (gui) {
                  gui.updateWindowPrefix();
            }
            console.writeln("Restored window prefix " + ppar.win_prefix);
      }

      let saveDir = File.extractDrive(fname) + File.extractDirectory(fname);

      if (saveInfo.output_dir != null && saveInfo.output_dir != undefined) {
            var outputDir = saveInfo.output_dir.replace("$(setupDir)", saveDir);
            outputDir = saveInfo.output_dir.replace("$(saveDir)", saveDir);   // for compatibility
            if (gui) {
                  gui.updateOutputDirEdit(outputDir);
            }
            console.writeln("Restored output directory " + outputDir);
      }

      saveInfoMakeFullPaths(saveInfo, saveDir);

      if (saveInfo.best_image != null && saveInfo.best_image != undefined) {
            console.writeln("Restored best image " + saveInfo.best_image);
            global.user_selected_best_image = saveInfo.best_image;
      }
      if (saveInfo.reference_image != null && saveInfo.reference_image != undefined) {
            console.writeln("Restored reference images " + saveInfo.reference_image);
            global.user_selected_reference_image = saveInfo.reference_image;
      }
      if (saveInfo.star_alignment_image != null && saveInfo.star_alignment_image != undefined) {
            console.writeln("Restored star alignment image " + saveInfo.star_alignment_image);
            global.star_alignment_image = saveInfo.star_alignment_image;
      }
      if (saveInfo.defectInfo != null && saveInfo.defectInfo != undefined) {
            console.writeln("Restored defect info");
            global.LDDDefectInfo = saveInfo.defectInfo;
      }
      if (saveInfo.saved_measurements != null && saveInfo.saved_measurements != undefined) {
            console.writeln("Restored subframe selector measurements");
            global.saved_measurements = saveInfo.saved_measurements;
      }
      if (saveInfo.flowchartData != null && saveInfo.flowchartData != undefined) {
            console.writeln("Restored flowchart data");
            global.flowchartData = saveInfo.flowchartData;
      }

      var pagearray = [];
      for (var i = 0; i < global.pages.END; i++) {
            pagearray[i] = null;
      }
      var fileInfoList = saveInfo.fileinfo;
      var found_files = false;
      for (var i = 0; i < fileInfoList.length; i++) {
            var saveInfo = fileInfoList[i];
            console.writeln("readJsonFile " + saveInfo.pagename);
            if (lights_only && saveInfo.pageindex != global.pages.LIGHTS) {
                  console.writeln("readJsonFile, lights_only, skip");
                  continue;
            }
            if (saveInfo.files.length == 0) {
                  console.writeln("readJsonFile, no files, skip");
                  continue;
            }
            found_files = true;
            pagearray[saveInfo.pageindex] = saveInfo.files;
            var filterSet = saveInfo.filterset;
            if (filterSet != null) {
                  switch (saveInfo.pageindex) {
                        case global.pages.LIGHTS:
                              console.writeln("readJsonFile, set manual filters for lights");
                              global.lightFilterSet = filterSet;
                              break;
                        case global.pages.FLATS:
                              console.writeln("readJsonFile, set manual filters for flats");
                              global.flatFilterSet = filterSet;
                              break;
                        default:
                              console.criticalln("Incorrect page index " +  saveInfo.pageindex + " for filter set in file " + fname);
                              return null;
                  }
            }
      }
      if (!found_files) {
            console.writeln("readJsonFile, no files found");
            return null;
      }
      console.writeln("readJsonFile, return files for pages");
      return pagearray;
}

this.addJsonFileInfo = function(fileInfoList, pageIndex, treeboxfiles, filterset)
{
      var name = "";
      switch (pageIndex) {
            case global.pages.LIGHTS:
                  name = "Lights";
                  break;
            case global.pages.BIAS:
                  name = "Bias";
                  break;
            case global.pages.DARKS:
                  name = "Darks";
                  break;
            case global.pages.FLATS:
                  name = "Flats";
                  break;
            case global.pages.FLAT_DARKS:
                  name = "FlatDarks";
                  break;
      }
      fileInfoList[fileInfoList.length] = { pageindex: pageIndex, pagename: name, files: treeboxfiles, filterset: filterset };
}

function getChangedSettingsAsJson()
{
      var settings = [];
      console.writeln("getChangedSettingsAsJson");
      for (let x in par) {
            var param = par[x];
            if (param.val != param.def) {
                  console.writeln("getChangedSettingsAsJson, save " + param.name + "=" + param.val);
                  settings[settings.length] = [ param.name, param.val ];
            }
      }
      console.noteln("Saving " + settings.length + " settings");
      return settings;
}

function copy_user_selected_reference_image_array()
{
      var copyarr = [];

      for (var i = 0; i < global.user_selected_reference_image.length; i++) {
            var elem = [];
            for (var j = 0; j < global.user_selected_reference_image[i].length; j++) {
                  elem[elem.length] = global.user_selected_reference_image[i][j];
            }
            copyarr[copyarr.length] = elem;
      }
      return copyarr;
}

this.initJsonSaveInfo = function(fileInfoList, save_settings, saveDir)
{
      if (save_settings) {
            var changed_settings = getChangedSettingsAsJson();
            var saveInfo = { version: 3, fileinfo: fileInfoList, settings: changed_settings };
            if (ppar.win_prefix != '') {
                  saveInfo.window_prefix = ppar.win_prefix;
            }
            if (gui) {
                  var outputDirEditPath = gui.getOutputDirEdit();
            } else {
                  var outputDirEditPath = '';
            }
            if (outputDirEditPath != '') {
                  /* Output directory box is not empty, save it in the Json file.
                   * If saveDir is a prefix of outputDirEditPath we save
                   * relative path and add special marker $(setupDir).
                   * When reading a Json file $(setupDir) is replaced with
                   * used saveDir. This makes the Json easier to move or
                   * share since the path is relative.
                   */ 
                  if (outputDirEditPath.startsWith(saveDir)) {
                        // replace saveDir prefix with $(setupDir)
                        saveInfo.output_dir = outputDirEditPath.replace(saveDir, "$(setupDir)");
                  } else {
                        // save full path
                        saveInfo.output_dir = outputDirEditPath;
                  }
            }
            if (global.user_selected_best_image != null) {
                  saveInfo.best_image = global.user_selected_best_image;
            }
            if (global.user_selected_reference_image.length > 0) {
                  // Need to make a copy so we do not update the original array
                  saveInfo.reference_image = copy_user_selected_reference_image_array();
            }
            if (global.star_alignment_image != null) {
                  saveInfo.star_alignment_image = global.star_alignment_image;
            }
            if (global.LDDDefectInfo.length > 0) {
                  saveInfo.defectInfo = global.LDDDefectInfo;
            }
            if (global.saved_measurements != null) {
                  saveInfo.saved_measurements = global.saved_measurements;
            }
            if (global.flowchartData != null) {
                  saveInfo.flowchartData = global.flowchartData;
            }
      } else {
            var saveInfo = { version: 1, fileinfo: fileInfoList };
      }
      return saveInfo
}

/* Fix paths so that they are relative to saveDir if they have a common prefix.
 *
 * Relative paths make it easier to move files and corresponding Json file
 * around or even share it with someone else.
 *
 * For example if saveDir is /Telescopes/TelescopeLive/NGC104/ and 
 * file name is /Telescopes/TelescopeLive/NGC104/Lights/Red/NGC104_R.fits
 * we save the file name as Lights/Red/NGC104_R.fits. If saveDir is not a prefix
 * of file name we save the full path.
 */
function saveInfoMakeRelativePaths(saveInfo, saveDir)
{
      if (saveDir == null || saveDir == "") {
            util.throwFatalError("saveInfoMakeRelativePaths, empty saveDir");
      }
      saveDir = util.ensurePathEndSlash(saveDir);
      console.writeln("saveInfoMakeRelativePaths, saveDir "+ saveDir);
      var fileInfoList = saveInfo.fileinfo;
      for (var i = 0; i < fileInfoList.length; i++) {
            for (var j = 0; j < fileInfoList[i].files.length; j++) {
                  var fname = fileInfoList[i].files[j][0];
                  if (fname.startsWith(saveDir)) {
                        fileInfoList[i].files[j][0] = fname.substring(saveDir.length);
                  }
            }
      }
      if (saveInfo.best_image != null && saveInfo.best_image != undefined) {
            if (saveInfo.best_image.startsWith(saveDir)) {
                  saveInfo.best_image = saveInfo.best_image.substring(saveDir.length);
            }
      }
      if (saveInfo.reference_image != null && saveInfo.reference_image != undefined) {
            for (var i = 0; i < saveInfo.reference_image.length; i++) {
                  if (saveInfo.reference_image[i][0].startsWith(saveDir)) {
                        saveInfo.reference_image[i][0] = saveInfo.reference_image[i][0].substring(saveDir.length);
                  }
            }
      }
      if (saveInfo.star_alignment_image != null && saveInfo.star_alignment_image != undefined) {
            if (saveInfo.star_alignment_image.startsWith(saveDir)) {
                  saveInfo.star_alignment_image = saveInfo.star_alignment_image.substring(saveDir.length);
            }
      }
      return saveInfo;
}

function saveInfoMakeFullPaths(saveInfo, saveDir)
{
      if (saveDir == null || saveDir == "") {
            util.throwFatalError("saveInfoMakeFullPaths, empty saveDir");
      }
      saveDir = util.ensurePathEndSlash(saveDir);
      console.writeln("saveInfoMakeFullPaths, saveDir " + saveDir);
      var fileInfoList = saveInfo.fileinfo;
      for (var i = 0; i < fileInfoList.length; i++) {
            for (var j = 0; j < fileInfoList[i].files.length; j++) {
                  var fname = fileInfoList[i].files[j][0];
                  if (util.pathIsRelative(fname)) {
                        fileInfoList[i].files[j][0] = saveDir + fname;
                  }
            }
      }
      if (saveInfo.best_image != null && saveInfo.best_image != undefined) {
            if (util.pathIsRelative(saveInfo.best_image)) {
                  saveInfo.best_image = saveDir + saveInfo.best_image;
            }
      }
      if (saveInfo.reference_image != null && saveInfo.reference_image != undefined) {
            for (var i = 0; i < saveInfo.reference_image.length; i++) {
                  if (util.pathIsRelative(saveInfo.reference_image[i][0])) {
                        saveInfo.reference_image[i][0] = saveDir + saveInfo.reference_image[i][0];
                  }
            }
      }
      if (saveInfo.star_alignment_image != null && saveInfo.star_alignment_image != undefined) {
            if (util.pathIsRelative(saveInfo.star_alignment_image)) {
                  saveInfo.star_alignment_image = saveDir + saveInfo.star_alignment_image;
            }
      }
      return saveInfo;
}

/* Save file info to a file.
 */
this.saveJsonFileEx = function(parent, save_settings, autosave_json_filename)
{
      if (!gui) {
            return;
      }
      console.writeln("saveJsonFile");

      let fileInfoList = [];

      for (let pageIndex = 0; pageIndex < parent.treeBox.length; pageIndex++) {
            let treeBox = parent.treeBox[pageIndex];
            let treeboxfiles = [];
            let filterSet = null;
            let name = "";
            switch (pageIndex) {
                  case global.pages.LIGHTS:
                        name = "Lights";
                        filterSet = global.lightFilterSet;
                        break;
                  case global.pages.BIAS:
                        name = "Bias";
                        break;
                  case global.pages.DARKS:
                        name = "Darks";
                        break;
                  case global.pages.FLATS:
                        name = "Flats";
                        filterSet = global.flatFilterSet;
                        break;
                  case global.pages.FLAT_DARKS:
                        name = "FlatDarks";
                        break;
                  default:
                        name = "Unknown";
                        break;
            }

            if (treeBox.numberOfChildren == 0) {
                  continue;
            }

            console.writeln(name + " files");

            gui.getTreeBoxNodeFiles(treeBox, treeboxfiles);

            console.writeln("Found " + treeboxfiles.length + " files");

            if (treeboxfiles.length == 0) {
                  // no files
                  continue;
            }

            if (filterSet != null) {
                  util.clearFilterFileUsedFlags(filterSet);
            }
            util.addJsonFileInfo(fileInfoList, pageIndex, treeboxfiles, filterSet);
      }

      if (fileInfoList.length == 0 && !save_settings) {
            // nothing to save
            console.writeln("No files to save.");
            return;
      }

      if (autosave_json_filename == null) {
            let saveFileDialog = new SaveFileDialog();
            saveFileDialog.caption = "Save As";
            saveFileDialog.filters = [["Json files", "*.json"], ["All files", "*.*"]];
            if (fileInfoList.length > 0) {
                  var outputDir = util.ensurePathEndSlash(util.getOutputDir(fileInfoList[0].files[0][0]));
            } else {
                  var outputDir = util.ensurePathEndSlash(util.getOutputDir(""));
                  if (outputDir == "") {
                        outputDir = util.ensurePathEndSlash(ppar.lastDir);
                  }
            }
            if (save_settings) {
                  saveFileDialog.initialPath = outputDir + "AutoSetup.json";
            } else {
                  saveFileDialog.initialPath = outputDir + "AutoFiles.json";
            }
            if (!saveFileDialog.execute()) {
                  return;
            }
            var saveDir = File.extractDrive(saveFileDialog.fileName) + File.extractDirectory(saveFileDialog.fileName);
            var json_path_and_filename = saveFileDialog.fileName;
      } else {
            let dialogRet = util.ensureDialogFilePath(autosave_json_filename);
            if (dialogRet == 0) {
                  // Canceled, do not save
                  return;
            }
            let json_path;
            if (dialogRet == 1) {
                  // User gave explicit directory
                  json_path = global.outputRootDir;
            } else {
                  // Not saving to AutoProcessed directory
                  //json_path = util.combinePath(global.outputRootDir, global.AutoProcessedDir); 
                  
                  // Saving to lights directory, or user given output directory
                  // This way we get relative paths to file so it is easy to move around
                  // or even share with lights files.
                  json_path = global.outputRootDir;
            }
            var saveDir = util.ensurePathEndSlash(json_path);
            var json_path_and_filename = saveDir + autosave_json_filename;
      }
      util.saveLastDir(saveDir);
      try {
            let saveInfo = util.initJsonSaveInfo(fileInfoList, save_settings, saveDir);
            let file = new File();
            saveInfoMakeRelativePaths(saveInfo, saveDir);
            let saveInfoJson = JSON.stringify(saveInfo, null, 2);
            file.createForWriting(json_path_and_filename);
            file.outTextLn(saveInfoJson);
            file.close();
            console.noteln("Saved to a file "+ json_path_and_filename);
      } catch (error) {
            console.criticalln("Error: failed to write file "+ json_path_and_filename);
            console.criticalln(error);
      }
}

function getReferenceBasename(processed_name, filename_postfix)
{
      let processed_basename = File.extractName(processed_name);
      if (filename_postfix.length > 0 && processed_basename.endsWith(filename_postfix)) {
            // strip filename_postfix from the end
            processed_basename = processed_basename.slice(0, processed_basename.length - filename_postfix.length);
      }
      //console.writeln("getReferenceBasename ", processed_name, " ", filename_postfix, " ", processed_basename);
      return processed_basename;
}

this.compareReferenceFileNames = function(reference_name, processed_name, filename_postfix)
{
      let reference_basename = getReferenceBasename(reference_name, filename_postfix);
      let processed_basename = getReferenceBasename(processed_name, filename_postfix);
      return reference_basename == processed_basename;
}

this.saveJsonFile = function(parent, save_settings)
{
      util.saveJsonFileEx(parent, save_settings, null);
}

this.formatToolTip = function(txt)
{
      if (txt.substr(0, 1) == "<") {
            return txt;
      } else {
            return "<p>" + txt + "</p>";
      }
}

this.getScreenSize = function(dialog)
{
      if (dialog.availableScreenRect != undefined) {
            var screen_width = dialog.availableScreenRect.width;
            var screen_height = dialog.availableScreenRect.height;
       } else {
            console.criticalln("getScreenSize: availableScreenRect is undefined, using size 1680 x 1050 as default");
            var screen_width = 1680;
            var screen_height = 1050;
       }

       return [screen_width, screen_height];
}

// Adjust dialog to screen size by adjusting preview control size
this.adjustDialogToScreen = function(dialog, preview_control, maxsize, preview_width, preview_height)
{
      var changes = false;
      
      var sz = util.getScreenSize(dialog);
      var screen_width = sz[0];
      var screen_height = sz[1];

      if (maxsize) {
            var limit = 50;
            var target_width = screen_width;
            var target_height = screen_height;
      } else {
            var limit = 100;
            var target_width = Math.floor(screen_width * 0.7);
            var target_height = Math.floor(screen_height * 0.7);
      }
      var step = limit / 2;

      var dialog_width = dialog.width;
      var dialog_height = dialog.height;

      if (!maxsize && dialog_width < target_width - limit && dialog_height < target_height - limit) {
            // Dialog already fits on screen
            return { width: preview_width, height: preview_height, changes: changes };
      }

      if (par.debug.val) {
            console.writeln("DEBUG:adjustDialogToScreen, maxsize " + maxsize + ", screen size " + screen_width + "x" + screen_height + ", target size " + target_width + "x" + target_height + ", preview size " + preview_width + "x" + preview_height);
            console.writeln("DEBUG:adjustDialogToScreen, start, screen size " + screen_width + "x" + screen_height + ", dialog size " + dialog_width + "x" + dialog_height + ", preview size " + preview_width + "x" + preview_height);
      }

      var prev_preview_width = preview_width;
      var prev_preview_height = preview_height;

      for (var i = 0; i < 100; i++) {
            preview_control.setSize(preview_width, preview_height);
            preview_control.adjustToContents();
            dialog.adjustToContents();

            if (dialog_width == dialog.width && dialog_height == dialog.height) {
                  // No change
                  // Restore previous values
                  preview_width = prev_preview_width;
                  preview_height = prev_preview_height;
                  if (par.debug.val) {
                        console.writeln("DEBUG:adjustDialogToScreen, stop, no change, screen size " + screen_width + "x" + screen_height + ", dialog size " + dialog_width + "x" + dialog_height + ", preview size " + preview_width + "x" + preview_height + ", i " + i );   
                  }
                  break;
            }

            dialog_width = dialog.width;
            dialog_height = dialog.height;
      
            if (maxsize) {
                  // Try to get dialog as close to screen size as possible.
                  if (dialog_width < target_width 
                      && dialog_width >= target_width - limit
                      && dialog_height < target_height 
                      && dialog_height >= target_height - limit)
                  {
                        // We are close enough
                        if (par.debug.val) {
                              console.writeln("DEBUG:adjustDialogToScreen, stop, close enough, screen size " + screen_width + "x" + screen_height + ", dialog size " + dialog_width + "x" + dialog_height + ", preview size " + preview_width + "x" + preview_height + ", i " + i );
                        }
                        break;
                  }
            } else {
                  // Just make sure that the dialog fits on screen
                  if (dialog_width < target_width - limit && dialog_height < target_height - limit) {
                        // We are close enough
                        if (par.debug.val) {
                              console.writeln("DEBUG:adjustDialogToScreen, stop, close enough, screen size " + screen_width + "x" + screen_height + ", dialog size " + dialog_width + "x" + dialog_height + ", preview size " + preview_width + "x" + preview_height + ", i " + i );
                        }
                        break;
                  }
            }

            if (par.debug.val) {
                  console.writeln("DEBUG:adjustDialogToScreen, screen size " + screen_width + "x" + screen_height + ", dialog size " + dialog_width + "x" + dialog_height + ", preview size " + preview_width + "x" + preview_height + ", i " + i );
            }

            prev_preview_width = preview_width;
            prev_preview_height = preview_height;
      
            if (maxsize && dialog_width < target_width + limit) {
                  preview_width = preview_width + step;
            }
            if (maxsize && dialog_height < target_height + limit) {
                  preview_height = preview_height + step;
            }
            if (dialog_width > target_width - limit) {
                  preview_width = preview_width - step;
            }
            if (dialog_height > target_height - limit) {
                  preview_height = preview_height - step;
            }
            changes = true;
      }
      if (changes) {
            console.writeln("adjustDialogToScreen, screen size " + screen_width + "x" + screen_height + ", dialog size " + dialog_width + "x" + dialog_height + ", preview size " + preview_width + "x" + preview_height + ", steps " + i );
      }

      return { width: preview_width, height: preview_height, changes: changes };
}

}  /* AutoIntegrateUtil */

AutoIntegrateUtil.prototype = new Object;
