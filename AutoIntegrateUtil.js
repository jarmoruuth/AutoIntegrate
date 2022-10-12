/*
        AutoIntegrate utility functions.

Copyright (c) 2018-2022 Jarmo Ruuth.

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

var par = global.par;
var ppar = global.ppar;

var use_force_close = true;

this.runGC = function()
{
      gc(false);        // run soft gc
}

this.checkEvents = function()
{
      processEvents();  // process events to keep GUI responsible
      util.runGC();
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
                  console.writeln("Icon " + id + " start from position " + global.iconPoint + ", global.iconStartRow " + global.iconStartRow + ", global.columnCount " + global.columnCount);
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

function findKeywords(imageWindow, keywordname) 
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

function setFITSKeywordNoOverwrite(imageWindow, name, value, comment) 
{
      if (findKeywords(imageWindow, name)) {
            console.writeln("keyword already set");
            return;
      }
      util.setFITSKeyword(imageWindow, name, value, comment);
}

function setProcessedImageKeyword(imageWindow) 
{
      console.writeln("setProcessedImageKeyword to " + imageWindow.mainView.id);
      setFITSKeywordNoOverwrite(
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
      if (old_name == new_name) {
            return new_name;
      }
      var w = ImageWindow.windowById(old_name);
      w.mainView.id = new_name;
      if (!keepif) {
            util.addScriptWindow(new_name);
      }
      if (!allow_duplicate_name && w.mainView.id != new_name) {
            util.fatalWindowNameFailed("Window rename from " + old_name + " to " + new_name + " failed, name is " + w.mainView.id);
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


this.testDirectoryIsWriteable = function(dir)
{
      var fname = util.ensurePathEndSlash(dir) + "info.txt";
      var info = global.directoryInfo.replace(/<br>/g, "\n");
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

this.saveWindowEx = function(path, id, optional_unique_part, save_id)
{
      if (path == null || id == null) {
            return null;
      }
      if (save_id) {
            var fname = path + save_id + optional_unique_part + ".xisf";
            console.writeln("saveWindowEx " + id + " as " + fname);
      } else {
            var fname = path + id + optional_unique_part + ".xisf";
            console.writeln("saveWindowEx " + fname);
      }
      console.writeln("saveWindowEx " + fname);

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
      targetWindow.mainView.endProcess();

      targetWindow.show();

      util.addScriptWindow(name);

      if (targetWindow.mainView.id != name && !allow_duplicate_name) {
            util.fatalWindowNameFailed("Failed to copy window to name " + name + ", copied window name is " + targetWindow.mainView.id);
      }

      console.writeln("copy window " + sourceWindow.mainView.id + " to " + name);

      return targetWindow;
}

this.copyWindow = function(sourceWindow, name)
{
      return util.copyWindowEx(sourceWindow, name, false);
}

this.addProcessingStep = function(txt)
{
      console.noteln("AutoIntegrate: " + txt);
      global.processing_steps = global.processing_steps + "\n" + txt;
}

this.updateStatusInfoLabel = function(txt)
{
      if (txt.length > 100) {
            txt = txt.substring(0, 100);
      }
      if (global.tabStatusInfoLabel != null) {
            global.tabStatusInfoLabel.text = txt;
      }
      if (global.use_preview && global.sideStatusInfoLabel != null) {
            global.sideStatusInfoLabel.text = txt;
      }
}

this.addStatusInfo = function(txt)
{
      console.noteln("------------------------");
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
      return par.extra_ABE.val || 
             par.extra_darker_background.val || 
             par.extra_ET.val || 
             par.extra_HDRMLT.val || 
             par.extra_LHE.val || 
             par.extra_contrast.val ||
             par.extra_stretch.val ||
             par.extra_shadowclipping.val ||
             par.extra_smoothbackground.val ||
             par.extra_noise_reduction.val ||
             par.extra_ACDNR.val ||
             par.extra_color_noise.val ||
             par.extra_sharpen.val ||
             par.extra_unsharpmask.val ||
             par.extra_saturation.val ||
             par.extra_smaller_stars.val;
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
             par.run_orange_hue_shift.val ||
             par.run_hue_shift.val ||
             par.run_narrowband_SCNR.val ||
             par.leave_some_green.val;
}

this.mapBadChars = function(str)
{
      str = str.replace(/ /g,"_");
      str = str.replace(/-/g,"_");
      str = str.replace(/,/g,"_");
      return str;
}

}  /* AutoIntegrateUtil */

AutoIntegrateUtil.prototype = new Object;
