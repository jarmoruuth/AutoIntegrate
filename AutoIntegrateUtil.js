/*
        AutoIntegrate utility functions.

Copyright (c) 2018-2026 Jarmo Ruuth.

Crop to common area code

      Copyright (c) 2022 Jean-Marc Lugrin.

Window name prefix and icon location code

      Copyright (c) 2021 rob pfile.

This product is based on software from the PixInsight project, developed
by Pleiades Astrophoto and its contributors (https://pixinsight.com/).

*/

#ifndef AUTOINTEGRATEUTIL_JS
#define AUTOINTEGRATEUTIL_JS

class AutoIntegrateUtil extends Object
{
    constructor(global) {
        super();

this.gui = null;
this.global = global;
this.par = global.par;
this.ppar = this.global.ppar;

this.loggingEnabled = true;
this.beginLogCallback = null;
this.endLogCallback = null;

this.executed_processes = [];

}

/* Set optional GUI object to update GUI components.
 */
setGUI(aigui)
{
      this.gui = aigui;
}

init_pixinsight_version()
{
      this.global.pixinsight_version_str = CoreApplication.versionMajor + '.' + CoreApplication.versionMinor + '.' + 
                                      CoreApplication.versionRelease + '-' + CoreApplication.versionRevision +
                                      ' build '  + CoreApplication.versionBuild;
      this.global.pixinsight_version_num = CoreApplication.versionMajor * 1e6 + 
                                      CoreApplication.versionMinor * 1e4 + 
                                      CoreApplication.versionRelease * 1e2 + 
                                      CoreApplication.versionRevision;
      this.global.pixinsight_build_num = CoreApplication.versionBuild;
}

runGarbageCollection()
{
      if (0) {
            var start_time = Date.now();
            gc();
            var end_time = Date.now();
            var time_sec = (end_time-start_time)/1000;
            if (time_sec >= 1.0) {
                  console.writeln("runGarbageCollection, " + time_sec + " sec");
            }
      }
}

checkEvents()
{
      CoreApplication.processEvents();  // process events to keep GUI responsible
      this.runGarbageCollection();
}

/// Init filter sets. We used to have actual Set object but
// use a simple array so we can add object into it.
// There are file sets for each possible filters and
// each array element has file name and used flag.
initFilterSets()
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
findFilterSet(filterSet, filetype)
{
      for (var i = 0; i < filterSet.length; i++) {
            if (filterSet[i][0] == filetype) {
                  return filterSet[i][1];
            }
      }
      this.throwFatalError("findFilterSet bad filetype " + filetype);
      return null;
}

// Add file base name to the filter set object
// We use file base name to detect filter files
addFilterSetFile(filterSet, filePath, filetype)
{
      var basename = File.extractName(filePath);
      console.writeln("addFilterSetFile add " + basename + " filter "+ filetype);
      filterSet[filterSet.length] = { name: basename, used: false };
}

// Try to find base file name from filter set objects.
// We use simple linear search which should be fine
// for most data sizes.
findFilterForFile(filterSet, filePath, filename_postfix)
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
removeFilterFile(filterSet, filePath)
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

clearFilterFileUsedFlags(filterSet)
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

setDefaultDirs()
{
      this.global.AutoOutputDir = "AutoOutput";
      this.global.AutoCalibratedDir = "AutoCalibrated";
      this.global.AutoMasterDir = "AutoMaster";
      this.global.AutoProcessedDir = "AutoProcessed";
}

clearDefaultDirs()
{
      this.global.AutoOutputDir = ".";
      this.global.AutoCalibratedDir = ".";
      this.global.AutoMasterDir = ".";
      this.global.AutoProcessedDir = ".";
}

ensurePathEndSlash(dir)
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

removePathEndSlash(dir)
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

removePathEndDot(dir)
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
parseNewOutputDir(filePath, subdir)
{
      var path = this.ensurePathEndSlash(File.extractDrive(filePath) + File.extractDirectory(filePath));
      path = this.ensurePathEndSlash(path + subdir);
      path = this.normalizePath(path);
      console.writeln("parseNewOutputDir " + path);
      return path;
}

// If path is relative and not absolute, we append it to the 
// path of the image file
pathIsRelative(p)
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

throwFatalError(txt)
{
      this.addProcessingStepAndStatusInfo(txt);
      this.global.run_results.fatal_error = txt;
      this.global.is_processing = this.global.processing_state.none;
      throw new Error(txt);
}

findWindow(id)
{
      if (id == null || id == undefined) {
            return null;
      }
      //return ImageWindow.windowById(id);
      var images = ImageWindow.windows;
      if (images == null || images == undefined) {
            return null;
      }
      for (var i = 0; i < images.length; i++) {
            if (images[i].mainView != null
                && images[i].mainView != undefined
                && images[i].mainView.id == id)
            {
               return images[i];
            }
      }
      return null;
}

isDefaultImageId(str) 
{
      // Regular expression to match the pattern "Image" followed by a number
      const regex = /^Image\d+$/i; 
    
      // Test the string against the regular expression
      return regex.test(str);
}

getFnameIfGeneratedWindowId(imgWin) 
{
      var filePath = imgWin.filePath;
      if (filePath == null || filePath == undefined) {
            return null;
      }
      var fname = File.extractName(filePath);
      if (fname == imgWin.mainView.id) {
            // fname and view id match, not using a system generated view id
            return null;
      }
      if (!this.isDefaultImageId(imgWin.mainView.id)) {
            // not using a system generated view id, maybe user changed the view id
            return null;
      }
      return fname;
}

getBaseWindowId(imgWin)
{
      var fname = this.getFnameIfGeneratedWindowId(imgWin);
      if (fname != null) {
            // We have system generated view id, use the file name
            return fname;
      }
      return imgWin.mainView.id;

}

findWindowOrFile(id)
{
      if (id == null || id == undefined) {
            return null;
      }
      var images = ImageWindow.windows;
      if (images == null || images == undefined) {
            return null;
      }

      var w = this.findWindow(id);
      if (w != null) {
            return w;
      }
      // Window not found by view id, try to find using a file name
      var found_win = null;
      for (var i = 0; i < images.length; i++) {
            if (images[i].mainView == null
                || images[i].mainView == undefined)
            {
                  continue;
            }
            var fname = this.getFnameIfGeneratedWindowId(images[i]);
            if (fname == null) {
                  // not using a system generated view id so we
                  // have already checked the id
                  continue;
            }
            // We have a system generated default view id, check if we have a match with the file name
            if (fname == id) {
                  if (found_win != null) {
                        // Duplicate file name found, we cannot use the file name
                        this.addCriticalStatus("Duplicate file name " + id + " found, cannot use the file");
                        return null;
                  }
                  found_win = images[i];
            }
      }
      if (found_win != null) {
            found_win.mainView.id = id;  // Ensure that the window id is the same as the file name
      }
      return found_win;
}

findWindowStartsWith(id)
{
      if (id == null || id == undefined) {
            return null;
      }
      var images = ImageWindow.windows;
      if (images == null || images == undefined) {
            return null;
      }
      for (var i = 0; i < images.length; i++) {
            if (images[i].mainView != null
                && images[i].mainView != undefined
                && images[i].mainView.id.startsWith(id))
            {
               return images[i];
            }
      }
      return null;
}

findWindowRe(re)
{
      if (re == null || re == undefined) {
            return null;
      }
      var images = ImageWindow.windows;
      if (images == null || images == undefined) {
            return null;
      }
      for (var i = 0; i < images.length; i++) {
            if (images[i].mainView != null
                && images[i].mainView != undefined
                && images[i].mainView.id.match(re))
            {
               return images[i];
            }
      }
      return null;
}

findWindowFromArray(arr)
{
      for (var i = 0; i < arr.length; i++) {
            if (this.findWindow(arr[i]) != null) {
                  return true;
            }
      }
      return false;
}

closeAllWindowsSubstr(id_substr)
{
      var images = ImageWindow.windows;
      if (images == null || images == undefined) {
            return;
      }
      for (var i = 0; i < images.length; i++) {
            if (images[i].mainView != null
                && images[i].mainView != undefined
                && images[i].mainView.id.indexOf(id_substr) != -1) 
            {
               images[i].close;
            }
      }
}

getWindowList()
{
      var windowList = [];
      var images = ImageWindow.windows;
      if (images == null || images == undefined) {
            return windowList;
      }
      for (var i = 0; i < images.length; i++) {
            try {
                  if (images[i].mainView == null || images[i].mainView == undefined) {
                        continue;
                  }
                  windowList[windowList.length] = images[i].mainView.id;
            } catch (err) {
                  // ignore errors
            }
      }
      return windowList;
}

getWindowListReverse()
{
      var windowListReverse = [];
      var windowList = this.getWindowList();
      for (var i = windowList.length-1; i >= 0; i--) {
            if (windowList[i].match(/undo[1-9]*/g) == null) {
                  windowListReverse[windowListReverse.length] = windowList[i];
            }
      }
      return windowListReverse;
}

findWindowId(id)
{
      var w = this.findWindow(id);

      if (w == null) {
            return null;
      }

      return w.mainView.id;
}

findWindowOrFileId(id)
{
      var w = this.findWindowOrFile(id);

      if (w == null) {
            return null;
      }

      return w.mainView.id;
}

windowShowif(id)
{
      var w = this.findWindow(id);
      if (w != null) {
            w.show();
      }
}

// Iconify the window, the return value is the window,
// only as a convenience to this.windowIconizeAndKeywordif()
windowIconizeEx(id, columnCount, iconStartRow, haveIconizedCount)
{
      if (id == null) {
            return null;
      }
      if (this.global.get_flowchart_data) {
            return null;
      }

      console.writeln("windowIconizeEx " + id + " columnCount " + columnCount + " iconStartRow " + iconStartRow + " haveIconizedCount " + haveIconizedCount);

      var w = this.findWindow(id);

      if (w != null) {
            if (w.iconic) {
                  console.writeln("Window " + id + " is already iconized");
                  return null;
            }
      
            /* Method iconize() will put the icon at the middle position
               of the window. To get icons to the top left corner we
               first move the window middle position there to get
               the icon at the right position. Then we restore the 
               window position back to old position.
            */
            var oldpos = new Point(w.position);  // save old position
            if (this.global.iconPoint == null) {
                  /* Get first icon to upper left corner. */
                  this.global.iconPoint = new Point(
                                          -(w.width / 2) + 5 + columnCount * 300,
                                          -(w.height / 2) + 5 + iconStartRow * 32);
                  //console.writeln("Icon " + id + " start from position " + iconPoint + ", iconStartRow " + iconStartRow + ", columnCount " + columnCount);
            } else {
                  /* Put next icons in a nice row below the first icon.
                  */
                  // this.global.iconPoint.moveBy(0, 32);
                  this.global.iconPoint = new Point(
                                          -(w.width / 2) + 5 + columnCount * 300,
                                          -(w.height / 2) + 5 + iconStartRow * 32 + haveIconizedCount * 32);
                  // console.writeln("Next icon " + id + " position " + iconPoint + ", iconStartRow " + iconStartRow + ", columnCount " + columnCount);
            }
            w.position = new Point(this.global.iconPoint);  // set window position to get correct icon position
            w.iconize();
            w.position = oldpos;                // restore window position
      }
      // console.writeln("windowIconizeEx done");
      return w;
}

windowIconizeFindPosition(id, keep_iconized)
{
      var index = 0;
      var iconStartRow = 0;
      var columnCount = 0;
      var prefixlen = 0;

      if (id == null) {
            return null;
      }

      // console.writeln("windowIconizeFindPosition " + id);

      if (this.global.get_flowchart_data) {
            return null;
      }

      // See if this window has some known prefix
      // If not, we use position 0
      for (var i = 0; i < this.ppar.prefixArray.length; i++) {
            // console.writeln("windowIconizeFindPosition check prefix " + this.ppar.prefixArray[i][1]);
            if (this.ppar.prefixArray[i][1] != "" && id.startsWith(this.ppar.prefixArray[i][1])) {
                  if (this.ppar.prefixArray[i][1].length > prefixlen) {
                        // console.writeln("windowIconizeFindPosition found prefix " + this.ppar.prefixArray[i][1]);
                        prefixlen = this.ppar.prefixArray[i][1].length;
                        index = i;
                  }
            }
      }
      if (this.ppar.prefixArray.length == 0) {
            // No prefixes, add one
            this.ppar.prefixArray[0] = [ 0, "", 0 ];
      }
      columnCount = this.ppar.prefixArray[index][0];
      iconStartRow = this.ppar.prefixArray[index][2];

      console.writeln("windowIconizeFindPosition " + id + " columnCount " + columnCount + " iconStartRow " + iconStartRow);

      var w = this.windowIconizeEx(id, columnCount, iconStartRow, this.global.haveIconized);
      if (w != null) {
            this.ppar.prefixArray[index][2]++;
            this.global.haveIconized++;
            if (!keep_iconized) {
                  // console.writeln("windowIconizeFindPosition show");
                  w.show();
            }
      }
      // console.writeln("windowIconizeFindPosition done");
      return w;
}

// Iconify the window, the return value is the window,
// only as a convenience to this.windowIconizeAndKeywordif()
windowIconizeif(id, show_image)
{
      if (id == null) {
            return null;
      }
      if (this.global.get_flowchart_data) {
            this.closeOneWindowById(id);
            return null;
      }

      var w = this.windowIconizeEx(id, this.global.columnCount, this.global.iconStartRow, this.global.haveIconized);
      if (w != null) {
            this.global.haveIconized++;
            if (show_image) {
                  w.show();
            }
      }

      return w;
}

batchWindowSetPosition(id, count)
{
      var w = this.findWindow(id);
      if (w != null) {
            var windowPoint = new Point(
                                    5 + 300 + count * 64,
                                    5 + count * 32);
            w.position = new Point(windowPoint);
      }
}

autointegrateProcessingHistory(imageWindow)
{
      var keywords = imageWindow.keywords;
      var history = {
            AutoIntegrate: [],
            info: [],
            options: [],
            steps: [],
            enhancements: []
      };
      var is_history = false;
      // AutoIntegrate keyword first
      for (var i = 0; i < keywords.length; i++) {
            var keyword = keywords[i];
            if (keyword.name == 'AutoIntegrate') {
                  history.AutoIntegrate[history.AutoIntegrate.length] = [ keyword.strippedValue.trim(), keyword.comment.trim() ]; 
                  is_history = true;
            }
            var trimmedComment = keyword.comment.trim();
            if (keyword.name == 'HISTORY' && trimmedComment == "AutoIntegrate processing" && keyword.strippedValue.startsWith("Step")) {
                  history.steps[history.steps.length] = [ keyword.name, keyword.strippedValue.trim(), keyword.comment.trim() ]; 
                  is_history = true;
            }
            if (keyword.name == 'HISTORY' && trimmedComment.startsWith("AutoIntegrate processing info")
                && keyword.strippedValue != "Processing options:") 
            {
                  history.info[history.info.length] = [ keyword.name, keyword.strippedValue.trim(), keyword.comment.trim() ]; 
                  is_history = true;
            }
            if (keyword.name == 'HISTORY' && trimmedComment.startsWith("AutoIntegrate processing option")
                && keyword.strippedValue != "Processing options:") 
            {
                  history.options[history.options.length] = [ keyword.name, keyword.strippedValue.trim(), keyword.comment.trim() ]; 
                  is_history = true;
            }
            if (keyword.name == 'HISTORY' && trimmedComment.startsWith("AutoIntegrate enhancements")) {
                  history.enhancements[history.enhancements.length] = [ keyword.name, keyword.strippedValue.trim(), keyword.comment.trim() ]; 
                  is_history = true;
            }
      }
      if (is_history) {
            return history;
      } else {
            return null;
      }
}

filterKeywords(imageWindow, keywordname) 
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

findDrizzleScale(imageWindow) 
{
      var scale = 0;
      var keywords = imageWindow.keywords;
      for (var i = 0; i < keywords.length; i++) {
            var keyword = keywords[i];
            if (keyword.name == 'HISTORY') {
                  var value = keyword.strippedValue.trim();
                  if (value.startsWith("DrizzleIntegration.scale:")) {
                        var parts = value.split(" ");
                        if (parts.length > 1) {
                              scale = parseFloat(parts[1]);
                              break;
                        }
                  }
            }
      }
      return scale;
}

findDrizzle(imgWin)
{
      for (var i = 0; i < imgWin.keywords.length; i++) {
            switch (imgWin.keywords[i].name) {
                  case "AutoIntegrateDrizzle":
                        var value = imgWin.keywords[i].strippedValue.trim();
                        console.writeln("AutoIntegrateDrizzle=" + value);
                        var drizzle = parseInt(value);
                        return drizzle;
                  default:
                        break;
            }
      }
      var scale = this.findDrizzleScale(imgWin);
      if (scale > 1) {
            console.writeln("Using image metadata drizzle scale " + scale);
            return scale;
      }

      return 1;
}


copyKeywords(imageWindow) 
{
      var newKeywords = [];
      var keywords = imageWindow.keywords;
      for (var i = 0; i < keywords.length; i++) {
            newKeywords[newKeywords.length] = new FITSKeyword(keywords[i]);
      }
      return newKeywords;
}

// Overwrite an old keyword or add a new one
setFITSKeyword(imageWindow, name, value, comment) 
{
      var oldKeywords = this.filterKeywords(imageWindow, name);
      imageWindow.keywords = oldKeywords.concat([
         new FITSKeyword(
            name,
            value,
            comment
         )
      ]);
}

// Append a new keyword, allows multiple keywords with same name
appenFITSKeyword(imageWindow, name, value, comment) 
{
      imageWindow.keywords = imageWindow.keywords.concat([
         new FITSKeyword(
            name,
            value,
            comment
         )
      ]);
}

getKeywordValue(imageWindow, keywordname) 
{
      var keywords = imageWindow.keywords;
      if (!keywords) {
            return null;
      }
      for (var i = 0; i < keywords.length; i++) {
            var keyword = keywords[i];
            if (keyword.name == keywordname) {
                  return keyword.strippedValue.trim();
            }
      }
      return null;
}

findKeywordName(imageWindow, keywordname) 
{
      var keywords = imageWindow.keywords;
      if (!keywords) {
            return null;
      }
      for (var i = 0; i < keywords.length; i++) {
            var keyword = keywords[i];
            if (keyword.name == keywordname) {
                  return true;
            }
      }
      return false;
}

setFITSKeywordNoOverwrite(imageWindow, name, value, comment)
{
      if (this.findKeywordName(imageWindow, name)) {
            console.writeln("keyword already set");
            return;
      }
      this.setFITSKeyword(imageWindow, name, value, comment);
}

setProcessedImageKeyword(imageWindow) 
{
      console.writeln("setProcessedImageKeyword to " + imageWindow.mainView.id);
      this.setFITSKeywordNoOverwrite(
            imageWindow,
            "AutoIntegrate",
            "processedimage",
            "AutoIntegrate processed intermediate image");
}

windowIconizeAndKeywordif(id, show_image, find_prefix)
{
      if (find_prefix) {
            var w = this.windowIconizeFindPosition(id, true);
      } else {
            var w = this.windowIconizeif(id);
      }

      if (w != null) {
 
            // Set processed image keyword. It will not overwrite old
            // keyword. If we later set a final image keyword it will overwrite
            // this keyword.
            this.setProcessedImageKeyword(w);
      }
      if (show_image) {
            w.show();
      }
}

// Add a script window that will be closed when close all is clicked
// Useful for temporary windows that do not have a fixed name
addScriptWindow(name)
{
      this.global.all_windows[this.global.all_windows.length] = name;
}

windowRenameKeepifEx(old_name, new_name, keepif, allow_duplicate_name)
{
      if (this.par.debug.val) {
            console.writeln("windowRenameKeepifEx " + old_name + " to " + new_name + ", keepif " + keepif + ", allow_duplicate_name " + allow_duplicate_name);
      }
      if (this.global.get_flowchart_data) {
            allow_duplicate_name = true;
      }
      if (old_name == new_name) {
            return new_name;
      }
      var w = this.findWindow(old_name);
      if (!w) {
            this.throwFatalError("Could not find image " + old_name + " for rename");
      }
      w.mainView.id = new_name;
      if (!keepif) {
            this.addScriptWindow(new_name);
      }
      if (!allow_duplicate_name && w.mainView.id != new_name) {
            this.fatalWindowNameFailed("Window rename from " + old_name + " to " + new_name + " failed, name is " + w.mainView.id);
      }
      if (this.global.get_flowchart_data && w.mainView.id != new_name) {
            this.global.flowchartWindows[this.global.flowchartWindows.length] = w.mainView.id;
      }
      this.addExecutedProcessScriptAction("rename", [ old_name, w.mainView.id ]);
      return w.mainView.id;
}

windowRenameKeepif(old_name, new_name, keepif)
{
      return this.windowRenameKeepifEx(old_name, new_name, keepif, false);
}

windowRename(old_name, new_name)
{
      return this.windowRenameKeepif(old_name, new_name, false);
}

closeOneWindow(w, force_close = true)
{
      if (w == null) {
            return;
      }
      if (this.par.keep_temporary_images.val) {
            w.mainView.id = "tmp_" + w.mainView.id;
            w.show();
            console.writeln("Rename window to " + w.mainView.id);
      } else if (force_close) {
            // Force close will close the window without asking
            if (!this.global.get_flowchart_data) {
                  // console.writeln("Force close " + w.mainView.id);
            }
            this.addExecutedProcessScriptAction("closeWindow", [ w.mainView.id ]);
            w.forceClose();
      } else {
            // PixInsight will ask if file is changed but not saved
            console.writeln("Close " + w.mainView.id);
            this.addExecutedProcessScriptAction("closeWindow", [ w.mainView.id ]);
            w.close();
      }
}

// close one window
closeOneWindowById(id, force_close = true)
{
      var w = this.findWindow(id);
      if (w != null) {
            this.closeOneWindow(w, force_close);
      }
}

closeWindowsFromArray(arr)
{
      for (var i = 0; i < arr.length; i++) {
            this.closeOneWindowById(arr[i]);
      }
}

// For the final window, we may have more different names with
// both prefix or postfix added
closeFinalWindowsFromArray(arr, force_close)
{
      for (var i = 0; i < arr.length; i++) {
            this.closeOneWindowById(arr[i], force_close);
            this.closeOneWindowById(arr[i]+"_stars", force_close);
            this.closeOneWindowById(arr[i]+"_starless", force_close);
            this.closeOneWindowById(arr[i]+"_enh", force_close);
            this.closeOneWindowById(arr[i]+"_enh_starless", force_close);
            this.closeOneWindowById(arr[i]+"_enh_stars", force_close);
            this.closeOneWindowById(arr[i]+"_enh_combined", force_close);
      }
}

closeTempWindowsForOneImage(id)
{
      this.closeOneWindowById(id + "_max");
      this.closeOneWindowById(id + "_map");
      this.closeOneWindowById(id + "_map_linear_fit_reference");
      this.closeOneWindowById(id + "_stars");
      this.closeOneWindowById(id + "_map_mask");
      this.closeOneWindowById(id + "_map_stars");
      this.closeOneWindowById(id + "_map_pm");
      this.closeOneWindowById(id + "_mask");
      this.closeOneWindowById(id + "_tmp");
      this.closeOneWindowById(id + "_solvercopy");
      this.closeOneWindowById(id + "_combined_solvercopy");
}

closeTempWindows()
{
      for (var i = 0; i < this.global.integration_LRGB_windows.length; i++) {
            this.closeTempWindowsForOneImage(this.global.integration_LRGB_windows[i]);
            this.closeTempWindowsForOneImage(this.global.integration_LRGB_windows[i] + "_BE");
      }
      for (var i = 0; i < this.global.integration_color_windows.length; i++) {
            this.closeTempWindowsForOneImage(this.global.integration_color_windows[i]);
            this.closeTempWindowsForOneImage(this.global.integration_color_windows[i] + "_BE");
      }
      this.closeWindowsFromArray(this.global.temporary_windows);
      this.global.temporary_windows = [];
}

// close all windows from an array
closeAllWindowsFromArray(arr, keep_base_image = false, print_names = false)
{
      for (var i = 0; i < arr.length; i++) {
            if (print_names) {
                  console.writeln("closeAllWindowsFromArray: " + arr[i]);
            }
            if (this.findWindowStartsWith(arr[i])) {
                  this.closeOneWindowById(arr[i]+"_stars");
                  this.closeOneWindowById(arr[i]+"_for_stars");
                  this.closeOneWindowById(arr[i]+"_for_stars_HT");
                  this.closeOneWindowById(arr[i]+"_starless");
                  this.closeOneWindowById(arr[i]+"_map");
                  this.closeOneWindowById(arr[i]+"_MGC_gradient_model");
                  this.closeOneWindowById(arr[i]+"_model");
                  this.closeOneWindowById(arr[i]+"_highpass");
                  this.closeOneWindowById(arr[i]+"_lowpass");
                  this.closeOneWindowById(arr[i]+"_DBEsamples");
                  this.closeOneWindowById(arr[i]+"_map_DBEsamples");
                  if (!keep_base_image) {
                        this.closeOneWindowById(arr[i]);
                  }
                  if (arr[i].indexOf("Integration_") != -1) {
                        // For possible old images
                        this.closeOneWindowById(arr[i] + "_NB_enhanced");
                        this.closeOneWindowById(arr[i] + "_NB_combine");
                        this.closeOneWindowById(arr[i] + "_NB_max");
                        this.closeOneWindowById(arr[i] + "_processed_starless");
                        this.closeOneWindowById(arr[i] + "_background");
                        this.closeOneWindowById(arr[i] + "_map_background");
                  }
                  if (arr[i].indexOf("AutoMasterDark") != -1) {
                        // Close all windows starting with AutoMasterDark, as we may have multiple master darks with different integration settings
                        for (;;) {
                              var win = this.findWindowStartsWith(arr[i]);
                              if (win == null) {
                                    break;
                              }
                              this.closeOneWindow(win);
                        }
                  }
            }
      }
}

// close all windows created by this script
closeAllWindows(keep_integrated_imgs, force_close)
{
      this.closeTempWindows();

      if (keep_integrated_imgs) {
            var isLRGB = false;
            for (var i = 0; i < this.global.integration_LRGB_windows.length; i++) {
                  if (this.findWindow(this.global.integration_LRGB_windows[i]) != null) {
                        // we have LRGB images
                        isLRGB = true;
                        break;
                  }
            }
            if (isLRGB) {
                  this.closeAllWindowsFromArray(this.global.integration_LRGB_windows, true);        // keep_base_image = true
                  this.closeAllWindowsFromArray(this.global.integration_color_windows, false);
                  var integration_windows = this.global.integration_LRGB_windows;
            } else {
                  this.closeAllWindowsFromArray(this.global.integration_color_windows, true);       // keep_base_image = true
                  this.closeAllWindowsFromArray(this.global.integration_LRGB_windows, false);
                  var integration_windows = this.global.integration_color_windows;
            }
            for (var i = 0; i < this.global.all_windows.length; i++) {
                  // check that we do not close integration windows
                  if (!this.findFromArray(integration_windows, this.global.all_windows[i]) &&
                      !this.findFromArray(this.global.integration_data_windows, this.global.all_windows[i]))
                  {
                        this.closeOneWindowById(this.global.all_windows[i]);
                  }
            }
      } else {
            this.closeAllWindowsFromArray(this.global.all_windows);
            this.closeAllWindowsFromArray(this.global.integration_LRGB_windows);
            this.closeAllWindowsFromArray(this.global.integration_color_windows);
            this.closeAllWindowsFromArray(this.global.integration_data_windows);
      }
      this.closeAllWindowsFromArray(this.global.fixed_windows);
      this.closeAllWindowsFromArray(this.global.calibrate_windows);

      this.closeFinalWindowsFromArray(this.global.final_windows, force_close);

      this.runGarbageCollection();
}

findFromArray(arr, id)
{
      for (var i = 0; i < arr.length; i++) {
            if (arr[i] == id) {
                  return true;
            }
      }
      return false;
}

fixWindowArray(arr, prev_prefix, cur_prefix)
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

getWindowPrefix(basename, curname)
{
      return curname.substring(0, curname.length - basename.length);
}

// Fix all fixed window names by having the given prefix
// We find possible previous prefix from the known fixed
// window name
fixAllWindowArrays(new_prefix)
{
      var old_prefix = this.getWindowPrefix("Integration_L", this.global.integration_LRGB_windows[0]);
      if (old_prefix == new_prefix) {
            // no change
            // console.writeln("fixAllWindowArrays no change in prefix '" + new_prefix + "'");
            return;
      }
      // console.writeln("fixAllWindowArrays set new prefix '" + new_prefix + "'");
      this.fixWindowArray(this.global.integration_LRGB_windows, old_prefix, new_prefix);
      this.fixWindowArray(this.global.integration_color_windows, old_prefix, new_prefix);
      this.fixWindowArray(this.global.integration_data_windows, old_prefix, new_prefix);
      this.fixWindowArray(this.global.intermediate_windows, old_prefix, new_prefix);
      this.fixWindowArray(this.global.fixed_windows, old_prefix, new_prefix);
      this.fixWindowArray(this.global.calibrate_windows, old_prefix, new_prefix);
      this.fixWindowArray(this.global.final_windows, old_prefix, new_prefix);
}

setOutputRootDir(path)
{
      if (this.global.outputRootDir != path) {
            console.noteln("setOutputRootDir, new outputRootDir " + path);
            this.global.outputRootDir = path;
      }
}

getOutputDir(filePath)
{
      var outputDir = this.global.outputRootDir;
      if (this.global.outputRootDir == "" || this.pathIsRelative(this.global.outputRootDir)) {
            console.writeln("getOutputDir, filePath ", filePath);
            if (filePath != null && filePath != "") {
                  outputDir = this.parseNewOutputDir(filePath, this.global.outputRootDir);
                  console.writeln("getOutputDir, outputDir ", outputDir);
            } else {
                  outputDir = "";
                  console.writeln("outputDir empty filePath");
            }
            // Check if some directory in this.global.openedLightsDirectories is a prefix
            // for the outputDir, then we use the directory from the list
            if (this.global.openedLightsDirectories.length > 0) {
                  for (var i = 0; i < this.global.openedLightsDirectories.length; i++) {
                        var dir = this.ensurePathEndSlash(this.global.openedLightsDirectories[i]);
                        console.writeln("getOutputDir, openedLightsDirectories[ " + i + "] " + dir);
                        if (outputDir.startsWith(dir)) {
                              outputDir = dir;
                              console.noteln("getOutputDir, using openedLightsDirectory " + outputDir);
                              break;
                        }
                  }
            } else {
                  console.writeln("getOutputDir, no openedLightsDirectories, using outputRootDir " + outputDir);
            }
      }
      return outputDir;
}

// Write something to a directory to test if it is writeable
testDirectoryIsWriteable(dir)
{
      var fname = this.ensurePathEndSlash(dir) + "info.txt";
      var info = this.global.getDirectoryInfo(true);
      try {
            let file = new File();
            file.createForWriting(fname);
            file.outTextLn(info);
            file.close();
      } catch (error) {
            console.criticalln(error);
            this.throwFatalError("Failed to write to directory " + dir);
      }
}

ensureDir(dir)
{
      // console.writeln("ensureDir " + dir)
      if (dir == "") {
            return;
      }
      var noslashdir = this.removePathEndSlash(dir);
      noslashdir = this.removePathEndDot(noslashdir);
      if (!File.directoryExists(noslashdir)) {
            console.writeln("Create directory " + noslashdir);
            File.createDirectory(noslashdir);
            if (!File.directoryExists(noslashdir)) {
                  this.throwFatalError("Failed to create directory " + noslashdir);
            }
            this.testDirectoryIsWriteable(noslashdir);
      }
}

saveLastDir(dirname)
{
      this.ppar.lastDir = this.removePathEndSlash(dirname);
      if (!this.global.do_not_write_settings) {
            Settings.write("AutoIntegrate" + '/lastDir', DataType.String, this.ppar.lastDir);
            if (this.global.debug) console.writeln("Save lastDir '" + this.ppar.lastDir + "'");
      }
}

restoreLastDir()
{
      var tempSetting = Settings.read("AutoIntegrate" + "/lastDir", DataType.String);
      if (Settings.lastReadOK) {
            if (this.global.debug) console.writeln("AutoIntegrate: Restored lastDir '" + tempSetting + "' from settings.");
            this.ppar.lastDir = tempSetting;
      }
}

saveMasterDir(dirname)
{
      this.ppar.masterDir = this.removePathEndSlash(dirname);
      if (!this.global.do_not_write_settings) {
            Settings.write("AutoIntegrate" + '/masterDir', DataType.String, this.ppar.masterDir);
            if (this.global.debug) console.writeln("Save masterDir '" + this.ppar.masterDir + "'");
      }
}

restoreMasterDir()
{
      var tempSetting = Settings.read("AutoIntegrate" + "/masterDir", DataType.String);
      if (Settings.lastReadOK) {
            if (this.global.debug) console.writeln("AutoIntegrate: Restored masterDir '" + tempSetting + "' from settings.");
            this.ppar.masterDir = tempSetting;
      }
}

readOneParameterFromPersistentModuleSettings(name, type)
{
      name = "AutoIntegrate" + '/' + this.mapBadChars(name);
      switch (type) {
            case 'S':
                  var tempSetting = Settings.read(name, DataType.String);
                  break;
            case 'O':
                  var tempSetting = Settings.read(name, DataType.String);
                  break;
            case 'B':
                  var tempSetting = Settings.read(name, DataType.Boolean);
                  break;
            case 'I':
                  var tempSetting = Settings.read(name, DataType.Int32);
                  break;
            case 'R':
                  var tempSetting = Settings.read(name, DataType.Real32);
                  break;
            default:
                  this.throwFatalError("Unknown type '" + type + '" for parameter ' + name);
                  break;
      }
      if (Settings.lastReadOK) {
            console.writeln("AutoIntegrate: read parameter from settings " + name + "=" + tempSetting);
            if (type == 'O') {
                  // Convert Json string to an object
                  tempSetting = JSON.parse(tempSetting);
            }
            return tempSetting;
      } else {
            return null;
      }
}

readParameterFromSettings(param)
{
      var val = this.readOneParameterFromPersistentModuleSettings(param.name, param.type);
      if (val == null && param.oldname != undefined) {
            val = this.readOneParameterFromPersistentModuleSettings(param.oldname, param.type);
      }
      if (val != null) {
            this.global.setParameterValue(param, val);
            if (param.reset != undefined) {
                  param.reset();
            }
      }
}

// Read default parameters from persistent module settings
readParametersFromPersistentModuleSettings()
{
      if (this.global.do_not_read_settings) {
            console.writeln("Use default settings, do not read parameter values from persistent module settings");
            return;
      }
      if (!this.global.ai_use_persistent_module_settings) {
            console.writeln("skip readParametersFromPersistentModuleSettings");
            return;
      }
      console.writeln("readParametersFromPersistentModuleSettings");
      for (let x in this.par) {
            this.readParameterFromSettings(this.par[x]);
      }
}

writeParameterToSettings(param)
{
      var name = "AutoIntegrate" + '/' + this.mapBadChars(param.name);
      if (this.global.isParameterChanged(param)) {
            // not a default value, save setting
            console.writeln("AutoIntegrate: save to settings " + name + "=" + param.val);
            switch (param.type) {
                  case 'S':
                        Settings.write(name, DataType.String, param.val);
                        break;
                  case 'O':
                        // Write object as a Json string
                        Settings.write(name, DataType.String, JSON.stringify(param.val));
                        break;
                  case 'B':
                        Settings.write(name, DataType.Boolean, param.val);
                        break;
                  case 'I':
                        Settings.write(name, DataType.Int32, param.val);
                        break;
                  case 'R':
                        Settings.write(name, DataType.Real32, param.val);
                        break;
                  default:
                        this.throwFatalError("Unknown type '" + param.type + '" for parameter ' + name);
                        break;
            }
            if (param.oldname != undefined) {
                  // remove old name
                  Settings.remove("AutoIntegrate" + '/' + this.mapBadChars(param.oldname));
            }
      } else {
            // default value, remove possible setting
            Settings.remove(name);
      }
}

combinePath(p1, p2)
{
      if (p1 == "") {
            return "";
      } else {
            return this.normalizePath(this.ensurePathEndSlash(p1) + p2);
      }
}

saveWindowEx(path, id, optional_unique_part, optional_save_id, optional_extension = ".xisf")
{
      if (path == null || id == null) {
            return null;
      }
      if (optional_save_id) {
            var fname = path + optional_save_id + optional_unique_part + optional_extension;
            console.writeln("saveWindowEx " + id + " as " + fname);
      } else {
            var fname = path + id + optional_unique_part + optional_extension;
            console.writeln("saveWindowEx " + fname);
      }

      if (this.global.get_flowchart_data) {
            return fname;
      }

      var w = this.findWindow(id);

      if (w == null) {
            return null;
      }

      // Save image. No format options, no warning messages, 
      // no strict mode, no overwrite checks.
      if (!w.saveAs(fname, false, false, false, false)) {
            this.throwFatalError("Failed to save image: " + fname);
      }
      return fname;
}

saveWindowAsJpg(imgWin, jpeg_filename, quality)
{
      console.writeln("saveWindowAsJpg " + jpeg_filename + " quality " + quality);
      var fileFormat = new FileFormat( ".jpg", false/*toRead*/, true/*toWrite*/ );
      if (fileFormat.isNull) {
            this.throwFatalError("No installed file format can write .jpg files.");
      }
      var file = new FileFormatInstance( fileFormat );
      if (file.isNull) {
            this.throwFatalError("Unable to instantiate file format: " + fileFormat.name);
      }
      if (!file.create(jpeg_filename, format("quality %d", quality))) {
            this.throwFatalError("Error creating file: " + jpeg_filename);
      }
      if (!file.writeImage( imgWin.mainView.image)) {
            this.throwFatalError("Error writing file: " + jpeg_filename);
      }
      file.close();
}

getOptionalUniqueFilenamePart()
{
      if (this.par.unique_file_names.val) {
            return format("_%04d%02d%02d_%02d%02d%02d",
                          this.global.processingDate.getFullYear(), this.global.processingDate.getMonth() + 1, this.global.processingDate.getDate(),
                          this.global.processingDate.getHours(), this.global.processingDate.getMinutes(), this.global.processingDate.getSeconds());
      } else {
            return "";
      }
}

saveFinalImageWindow(win, dir, name, bits)
{
      console.writeln("saveFinalImageWindow " + name);
      var copy_win = null;
      var save_name;
      var save_win = win;

      // Bits 1 mean JPG
      if (bits == 1) {
            this.saveWindowAsJpg(win, this.ensurePathEndSlash(dir) + name + this.getOptionalUniqueFilenamePart() + ".jpg", this.par.save_final_image_jpg_quality.val);
            return;
      }

      if (bits == 8 || bits == 16) {
            // 8 and 16 bite are TIFF, 32 is XISF
            copy_win = this.copyWindow(win, this.ensure_win_prefix(name + "_savetmp"));
            if (bits == 16) {
                  var new_postfix = "";
            } else {
                  var new_postfix = "_" + bits;
            }
            var old_postfix = name.substr(name.length - new_postfix.length);
            if (old_postfix != new_postfix) {
                  save_name = this.ensurePathEndSlash(dir) + name + new_postfix + this.getOptionalUniqueFilenamePart() + ".tif";
            } else {
                  // we already have bits added to name
                  save_name = this.ensurePathEndSlash(dir) + name + this.getOptionalUniqueFilenamePart() + ".tif";
            }

            if (copy_win.bitsPerSample != bits) {
                  console.writeln("saveFinalImageWindow:set bits to " + bits);
                  copy_win.setSampleFormat(bits, false);
            }
            save_win = copy_win;
      } else if (bits == 32) {
            // 32 bits is XISF
            save_name = this.ensurePathEndSlash(dir) + name + this.getOptionalUniqueFilenamePart() + ".xisf";
      } else  {
            this.throwFatalError("Unsupported bits per sample: " + bits);
      }
      console.writeln("saveFinalImageWindow:save name " + name);
      // Save image. No format options, no warning messages, 
      // no strict mode, no overwrite checks.
      if (!save_win.saveAs(save_name, false, false, false, false)) {
            this.throwFatalError("Failed to save image: " + save_name);
      }
      if (copy_win != null) {
            this.closeOneWindow(copy_win);
      }
}

saveAllFinalImageWindows(bits)
{
      console.writeln("saveAllFinalImageWindows");

      // Find a windows that has a keyword which tells this is
      // a final image file
      var images = ImageWindow.windows;
      var finalimages = [];
      for (var i = 0; i < images.length; i++) {
            var imageWindow = images[i];
            var keywords = imageWindow.keywords;
            if (keywords != null && keywords != undefined) {
                  for (var j = 0; j != keywords.length; j++) {
                        var keyword = keywords[j].name;
                        var value = keywords[j].strippedValue.trim();
                        if (this.par.save_all_files.val) {
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
            gdd.initialPath = this.ppar.lastDir;
      }

      if (gdd.execute()) {
            console.writeln("saveAllFinalImageWindows:dir " + gdd.directory);
            this.saveLastDir(gdd.directory);
            for (var i = 0; i < finalimages.length; i++) {
                  this.saveFinalImageWindow(finalimages[i], gdd.directory, finalimages[i].mainView.id, bits);
            }
      }
      console.writeln("All final image windows are saved!");
}

fatalWindowNameFailed(txt)
{
      console.criticalln(txt);
      console.criticalln("Close old images or use a different window prefix.");
      this.throwFatalError("Processing stopped");
}

add_test_image(id, testid, testmode)
{
      if (testmode) {
            var copy_id = this.ppar.win_prefix + testid;
            this.closeOneWindowById(copy_id);
            console.writeln("add_test_image " + id + " as " + copy_id);
            this.copyWindowEx(this.findWindow(id), copy_id, true);
            this.global.test_image_ids.push(copy_id);
      }
}

copyWindowEx(sourceWindow, name, allow_duplicate_name)
{
      name = this.validateViewIdCharacters(name);
      
      if (this.par.debug.val) {
            console.writeln("copyWindowEx " + sourceWindow.mainView.id + " to " + name + ", allow_duplicate_name " + allow_duplicate_name);
      }
      if (this.global.get_flowchart_data) {
            allow_duplicate_name = true;
      }
      if (sourceWindow == null) {
            this.throwFatalError("No source window, cannot copy to " + name);
      }
      var targetWindow = new ImageWindow(
                              sourceWindow.mainView.image.width,
                              sourceWindow.mainView.image.height,
                              sourceWindow.mainView.image.numberOfChannels,
                              sourceWindow.mainView.window.bitsPerSample,
                              sourceWindow.mainView.window.isFloatSample,
                              sourceWindow.mainView.image.colorSpace != ColorSpace.Gray,
                              name);
      targetWindow.mainView.beginProcess(UndoFlag.NoSwapFile);
      targetWindow.mainView.image.assign(sourceWindow.mainView.image);
      targetWindow.keywords = sourceWindow.keywords;
      if (this.global.pixinsight_version_num >= 1080902) {
            targetWindow.copyAstrometricSolution(sourceWindow);
      }
      targetWindow.mainView.endProcess();

      targetWindow.show();

      this.addScriptWindow(name);

      if (targetWindow.mainView.id != name && !allow_duplicate_name) {
            this.fatalWindowNameFailed("Failed to copy window to name " + name + ", copied window name is " + targetWindow.mainView.id);
      }

      if (!this.global.get_flowchart_data || this.par.debug.val) {
            if (this.global.debug) console.writeln("copy window " + sourceWindow.mainView.id + " to " + name);
      }

      if (this.global.get_flowchart_data) {
            this.global.flowchartWindows[this.global.flowchartWindows.length] = targetWindow.mainView.id;
      }

      // Skip some temporary images
      if (name.indexOf("preview_tmp") == -1) {
            this.addExecutedProcessScriptAction("copyWindow", [ sourceWindow.mainView.id, name ]);
      }

      return targetWindow;
}

arraysEqual(a, b) {
      if (a === b) return true;
      if (a == null || b == null) return false;
      if (a.length != b.length) return false;
      for (var i = 0; i < a.length; i++) {
            if (a[i] !== b[i]) return false;
      }
      return true;
}

copyWindow(sourceWindow, name)
{
      return this.copyWindowEx(sourceWindow, name, false);
}


forceCopyWindow(sourceWindow, name)
{
      this.closeOneWindowById(name);
      return this.copyWindowEx(sourceWindow, name, false);
}

/* Open a file as image window. */
openImageWindowFromFile(fileName, allow_missing_file = false, close_old_window = false)
{
      if (allow_missing_file && !File.exists(fileName)) {
            return null;
      }
      var id = File.extractName(fileName);
      if (close_old_window) {
            this.closeOneWindowById(id);
      }
      var imageWindows = ImageWindow.open(fileName);
      if (!imageWindows || imageWindows.length == 0) {
            this.throwFatalError("*** openImageWindowFromFile Error: imageWindows.length: " + imageWindows.length + ", file " + fileName);
      }
      var imageWindow = imageWindows[0];
      if (imageWindow == null) {
            this.throwFatalError("*** openImageWindowFromFile Error: Can't read file: " + fileName);
      }
      return imageWindow;
}

copyAstrometricSolutionFromWindow(targetWindow, imgWin)
{
      console.writeln("copyAstrometricSolutionFromWindow from " + imgWin.mainView.id + " to " + targetWindow.mainView.id);

      if (imgWin.astrometricSolutionSummary().length == 0) {
            console.criticalln("copyAstrometricSolutionFromFile: no astrometric solution in " + imgWin.mainView.id);
            var succ = false;
      } else if (imgWin.mainView.image.width != targetWindow.mainView.image.width || imgWin.mainView.image.height != targetWindow.mainView.image.height) {
            console.criticalln("copyAstrometricSolutionFromFile: image size mismatch " + imgWin.mainView.id + " " + targetWindow.mainView.id);
            var succ = false;
      } else {
            console.writeln("copyAstrometricSolutionFromFile: copy from " + imgWin.mainView.id + " to " + targetWindow.mainView.id);
            targetWindow.copyAstrometricSolution(imgWin);
            var succ = true;
      }
      return succ;
}

copyAstrometricSolutionFromFile(targetId, fname)
{
      console.writeln("copyAstrometricSolutionFromFile from " + fname + " to " + targetId);

      var targetWindow = this.findWindow(targetId);
      if (targetWindow == null) {
            console.criticalln("copyAstrometricSolutionFromFile: target window not found " + targetId);
            return false;
      }
      targetWindow.show();

      console.writeln("copyAstrometricSolutionFromFile: open " + fname);
      var imgWin = this.openImageWindowFromFile(fname);
      imgWin.show();

      var succ = this.copyAstrometricSolutionFromWindow(targetWindow, imgWin);

      this.closeOneWindowById(imgWin.mainView.id);
      return succ;
}

// Update keywords in target window with keywords from source window
// using a list of keywords to update
updateWindowKeywords(target_keywords, source_keywords, keyword_list)
{
      console.writeln("updateWindowKeywords");

      var new_keywords = [];

      // We keep all current target keywords so make a copy of target keywords
      for (var i = 0; i < target_keywords.length; i++) {
            new_keywords[new_keywords.length] = new FITSKeyword(target_keywords[i]);
      }
      target_keywords = null;

      for (var i = 0; i < keyword_list.length; i++) {
            // Find keyword in source_keywords
            for (var j = 0; j < source_keywords.length; j++) {
                  if (source_keywords[j].name == keyword_list[i]) {
                        break;
                  }
            }
            if (j == source_keywords.length) {
                  // Keyword not in source, skip
                  continue;
            }
            // Find keyword in new_keywords (target)
            for (var k = 0; k < new_keywords.length; k++) {
                  if (new_keywords[k].name == keyword_list[i]) {
                        break;
                  }
            }
            if (k == new_keywords.length) {
                  // Keyword not in target, append a new one
                  new_keywords[new_keywords.length] = new FITSKeyword(source_keywords[j]);
            } else {
                  // Keyword already in target, overwrite
                  new_keywords[k] = new FITSKeyword(source_keywords[j]);
            }
      }
      return new_keywords;
}

copyKeywordsFromWindow(targetWindow, imgWin)
{
      console.writeln("copyKeywordsFromWindow from " + targetWindow.mainView.id + " to " + imgWin.mainView.id);

      var keyword_list = [
            "RADESYS",
            "RA",
            "DEC",
            "OBJCTRA",
            "OBJCTDEC",
            "DATE-OBS",
            "DATE-BEG",
            "DATE-END",
            "OBSGEO-L",
            "OBSGEO-B",
            "OBSGEO-H",
            "FOCALLEN",
            "FOCAL",
            "XPIXSZ",
            "YPIXSZ",
            "EXPTIME",
            "SITELONG",
            "SITELAT",
            "LAT-OBS",
            "LONG-OBS",
            "ALT-OBS",
            "TELESCOP",
            "INSTRUME",
            "OBJECT",
            "OBSERVER",
            "OWNER",
            "NAXIS1",
            "NAXIS2",
            "BSCALE",
            "BZERO",
            "CREATOR",
            "OBSERVAT",
            "TIMESYS"
      ];
      targetWindow.keywords = this.updateWindowKeywords(targetWindow.keywords, imgWin.keywords, keyword_list);
}

copyKeywordsFromFile(targetId, fname)
{
      console.writeln("copyKeywordsFromFile from " + fname + " to " + targetId);

      var targetWindow = this.findWindow(targetId);
      if (targetWindow == null) {
            console.criticalln("copyKeywordsFromFile: target window not found " + targetId);
            return false;
      }
      targetWindow.show();

      console.writeln("copyKeywordsFromFile: open " + fname);
      var imgWin = this.openImageWindowFromFile(fname);
      if (imgWin == null) {
            console.criticalln("copyKeywordsFromFile: failed to open " + fname);
            return false;
      }
      imgWin.show();

      this.copyKeywordsFromWindow(targetWindow, imgWin);

      imgWin.forceClose();
      return true;
}

createEmptyBitmap(width, height, fill_color)
{
      var bitmap = new Bitmap(width, height);

      bitmap.fill(fill_color);

      return bitmap;
}

createImageFromBitmap(bitmap)
{
      var image = new Image(
                        bitmap.width, 
                        bitmap.height,
                        3,
                        ColorSpace.RGB);

      image.blend(bitmap);
                  
      return image;
}

createWindowFromBitmap(bitmap, id)
{
      var win = new ImageWindow(
                        bitmap.width,
                        bitmap.height,
                        3,
                        32,
                        true,
                        true,
                        id);

      win.mainView.beginProcess(UndoFlag.NoSwapFile);
      win.mainView.image.blend(bitmap);
      win.mainView.endProcess();
                  
      return win;
}

getWindowBitmap(imgWin)
{
      var bmp = new Bitmap(imgWin.mainView.image.width, imgWin.mainView.image.height);
      bmp.assign(imgWin.mainView.image.render());
      return bmp;
}

createWindowFromImage(image, name, allow_duplicate_name)
{
      if (this.par.debug.val) {
            console.writeln("createWindowFromImage " + name + ", allow_duplicate_name " + allow_duplicate_name);
      }
      if (this.global.get_flowchart_data) {
            allow_duplicate_name = true;
      }
      if (image == null) {
            this.throwFatalError("Image not found, cannot create " + name);
      }
      if (this.par.debug.val) {
            console.writeln("createWindowFromImage, create new image, width " + image.width + "x" + image.height);
      }
      if (image.width <= 0 || image.height <= 0) {
            this.throwFatalError("Image has invalid size " + image.width + "x" + image.height + ", cannot create " + name);
      }
      var targetWindow = new ImageWindow(image.width, image.height);
      targetWindow.mainView.id = name;

      targetWindow.mainView.beginProcess(UndoFlag.NoSwapFile);
      targetWindow.mainView.image.assign(image);
      targetWindow.mainView.endProcess();

      this.addScriptWindow(name);

      if (targetWindow.mainView.id != name && !allow_duplicate_name) {
            this.fatalWindowNameFailed("Failed to create window with name " + name + ", window name is " + targetWindow.mainView.id);
      }

      if (!this.global.get_flowchart_data || this.par.debug.val) {
            console.writeln("createWindowFromImage " + name);
      }

      if (this.global.get_flowchart_data) {
            this.global.flowchartWindows[this.global.flowchartWindows.length] = targetWindow.mainView.id;
      }

      if (this.par.debug.val) {
            console.writeln("createWindowFromImage, return image, name " + targetWindow.mainView.id);
      }
      return targetWindow;
}

printMemoryStatus(txt = "")
{
      let memoryStatus = System.physicalMemoryStatus();
      console.writeln("Memory status: " + parseInt((memoryStatus.totalBytes - memoryStatus.availableBytes) / (1024 * 1024)) + " MB used" + (txt ? " - " + txt : ""));
}

addProcessingStep(txt)
{
      console.noteln("AutoIntegrate: " + txt);
      this.printMemoryStatus(txt);
      this.global.processing_steps = this.global.processing_steps + "\n" + txt;
}

updateStatusInfoLabel(txt, write_to_console = false)
{
      if (this.global.get_flowchart_data) {
            return;
      }
      if (write_to_console) {
            console.noteln(txt);
      }
      if (txt.length > 100) {
            txt = txt.substring(0, 100);
      }
      if (this.global.statusInfoLabel != null) {
            this.global.statusInfoLabel.text = txt;
      }
}

// Add critical status message to a list of messages
// and update status info label
addCriticalStatus(txt)
{
      if (txt == null || txt == undefined || txt == "") {
            return;
      }
      if (txt.startsWith("Error:")) {
            txt = txt.substring(6);
      }
      txt = txt.trim();
      console.criticalln("Error: " + txt);
      if (this.global.processing_errors == "") {
            this.global.processing_errors = "Error: " + txt;
      } else {
            this.global.processing_errors = this.global.processing_errors + "\n" + "Error: " + txt;
      }
}

addWarningStatus(txt)
{
      if (txt == null || txt == undefined || txt == "") {
            return;
      }
      if (txt.startsWith("Warning:")) {
            txt = txt.substring(8);
      }
      txt = txt.trim();
      console.warningln("Warning: " + txt);
      if (this.global.processing_warnings == "") {
            this.global.processing_warnings = "Warning: " + txt;
      } else {
            this.global.processing_warnings = this.global.processing_warnings + "\n" + "Warning: " + txt;
      }
}

addStatusInfo(txt)
{
      console.noteln("------------------------");
      console.noteln(txt);
      this.updateStatusInfoLabel(txt);
      this.checkEvents();
}

addProcessingStepAndStatusInfo(txt)
{
      this.addProcessingStep(txt);
      this.updateStatusInfoLabel(txt);
}

ensure_win_prefix_ex(id, prefix)
{
      if (id == null) {
            return null;
      }
      if (prefix != "" && !id.startsWith(prefix)) {
            return prefix + id;
      } else {
            return id;
      }
}

ensure_win_prefix(id)
{
      return this.ensure_win_prefix_ex(id, this.ppar.win_prefix);
}

remove_autocontinue_prefix(id)
{
      if (this.ppar.autocontinue_win_prefix != "" 
          && this.ppar.autocontinue_win_prefix != this.ppar.win_prefix 
          && id.startsWith(this.ppar.autocontinue_win_prefix)) 
      {
            return id.substring(this.ppar.autocontinue_win_prefix.length);
      } else {
            return id;
      }
}

is_non_starless_option()
{
      return this.par.enhancements_backgroundneutralization.val ||
             this.par.enhancements_GC.val || 
             this.par.enhancements_banding_reduction.val ||
             this.par.enhancements_darker_background.val || 
             this.par.enhancements_darker_highlights.val ||
             this.par.enhancements_ET.val || 
             this.par.enhancements_HDRMLT.val || 
             this.par.enhancements_LHE.val || 
             this.par.enhancements_contrast.val ||
             this.par.enhancements_stretch.val ||
             this.par.enhancements_autostf.val ||
             this.par.enhancements_shadowclipping.val ||
             this.par.enhancements_smoothbackground.val ||
             this.par.enhancements_noise_reduction.val ||
             this.par.enhancements_ACDNR.val ||
             this.par.enhancements_color_noise.val ||
             this.par.enhancements_sharpen.val ||
             this.par.enhancements_unsharpmask.val ||
             this.par.enhancements_highpass_sharpen.val ||
             this.par.enhancements_saturation.val ||
             this.par.enhancements_clarity.val ||
             this.par.enhancements_smaller_stars.val ||
             this.par.enhancements_normalize_channels.val ||
             this.par.enhancements_adjust_channels.val ||
             this.par.enhancements_shadow_enhance.val ||
             this.par.enhancements_highlight_enhance.val ||
             this.par.enhancements_gamma.val ||
             this.par.enhancements_auto_contrast.val ||
             this.par.enhancements_color_calibration.val ||
             this.par.enhancements_ha_mapping.val ||
             this.par.enhancements_solve_image.val ||
             this.par.enhancements_annotate_image.val ||
             this.par.enhancements_signature.val ||
             this.par.enhancements_rotate.val ||
             this.par.enhancements_fix_star_cores.val ||
             this.par.enhancements_selective_color.val;
}

is_enhancements_option()
{
      return this.par.enhancements_remove_stars.val || 
             this.par.enhancements_combine_stars.val ||
             this.is_non_starless_option();
}

is_narrowband_option()
{
      return this.par.fix_narrowband_star_color.val ||
             this.par.run_orange_hue_shift.val ||
             this.par.run_hue_shift.val ||
             this.par.run_foraxx_mapping.val ||
             this.par.run_enhancements_narrowband_mapping.val ||
             this.par.run_orangeblue_colors.val ||
             this.par.run_narrowband_SCNR.val ||
             this.par.leave_some_green.val ||
             this.par.remove_magenta_color.val;
}

validateViewIdCharacters(p)
{
      p = p.replace(/[^A-Za-z0-9]/gi,'_');
      //p = p.replace(/_+$/,'');
      if (p.match(/^\d/)) {
            // if user tries to start prefix with a digit, prepend an underscore
            p = "_" + p;
      }
      return p;
}

mapBadChars(str)
{
      str = str.replace(/ /g,"_");
      str = str.replace(/-/g,"_");
      str = str.replace(/,/g,"_");
      str = str.replace(/:/g,"_");
      str = str.replace(/\+/g,"_");
      return str;
}

mapBadWindowNameChars(str)
{
      str = this.mapBadChars(str);
      str = str.replace(/\./g,"_");
      return str;
}

replacePostfixOrAppend(name, postfixarr, new_postfix)
{
      if (name.endsWith(new_postfix)) {
            // we already have a correct postfix
            return name;
      }
      for (var i = 0; i < postfixarr.length; i++) {
            var postfix = postfixarr[i];
            if (name.endsWith(postfix)) {
                  // replace postfix with new postfix
                  return name.substr(0, name.length - postfix.length) + new_postfix;
            }
      }
      // something else than expected postfix, just append new postfix
      return name + new_postfix;
}

ensureDialogFilePath(names)
{
      if (this.global.outputRootDir == "") {
            var gdd = new GetDirectoryDialog;
            gdd.caption = "Select Save Directory for " + names;
            gdd.initialPath = this.ppar.lastDir;
            console.noteln(gdd.caption);
            if (!gdd.execute()) {
                  console.writeln("No path for " + names + ', nothing written');
                  return 0;
            }
            this.saveLastDir(gdd.directory);
            this.setOutputRootDir(gdd.directory);
            if (this.global.outputRootDir != "") {
                  this.setOutputRootDir(this.ensurePathEndSlash(this.global.outputRootDir));
            }
            console.writeln("ensureDialogFilePath, set outputRootDir ", this.global.outputRootDir);
            return 1;
      } else {
            return 2;
      }
}

setParameterDefaults()
{
      console.writeln("Set parameter defaults");
      for (let x in this.par) {
            var param = this.par[x];
            if (!param.skip_reset) {
                  this.global.setParameterValue(param, param.def);
                  if (param.reset != undefined) {
                        param.reset();
                  }
            }
      }
}

recordParam(param)
{
      if (this.global.debug) {
            if (param.used) {
                  console.criticalln("Error:recordParam: parameter " + JSON.stringify(param) + " already used");
            } else {
                  param.used = true;
            }
      }
}

getSettingsFromJson(settings)
{
      if (settings == null || settings == undefined) {
            console.noteln("getSettingsFromJson: empty settings");
            return;
      }

      if (this.par.reset_on_setup_load.val) {
            this.setParameterDefaults();
      }

      console.noteln("Restore " + settings.length + " settings");

      for (var i = 0; i < settings.length; i++) {
            for (let x in this.par) {
                  var param = this.par[x];
                  if (param.name == settings[i][0]) {
                        var name_found = true;
                  } else if (param.oldname != undefined && param.oldname == settings[i][0]) {
                        var name_found = true;
                  } else {
                        var name_found = false;
                  }
                  if (name_found && !param.skip_reset) {
                        this.global.setParameterValue(param, settings[i][1]);
                        if (param.reset != undefined) {
                              param.reset();
                        }
                        if (param.type == 'O') {
                              console.writeln("getSettingsFromJson, set " + param.name + "=" + JSON.stringify(param.val) );
                        } else {
                              console.writeln("getSettingsFromJson, set " + param.name + "=" + param.val);
                        }
                  }
            }
      }
}

/* Read saved Json file info.
 */ 
readJsonFile(fname, lights_only)
{
      console.writeln("readJsonFile " + fname + " lights_only " + lights_only);

      var jsonFile = File.openFileForReading(fname);
      if (!jsonFile.isOpen) {
            console.criticalln("Could not open file " + fname);
            return null;
      }
      var jsonStr = jsonFile.read(DataType.ByteArray, jsonFile.size);
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
            this.getSettingsFromJson(saveInfo.settings);
      }
      if (saveInfo.window_prefix != null && saveInfo.window_prefix != undefined) {
            this.ppar.win_prefix = saveInfo.window_prefix;
            if (this.gui) {
                  this.gui.updateWindowPrefix();
            }
            console.writeln("Restored window prefix " + this.ppar.win_prefix);
      }

      let saveDir = File.extractDrive(fname) + File.extractDirectory(fname);
      console.writeln("Restored saveDir " + saveDir + " from Json file path");

      if (saveInfo.output_dir != null && saveInfo.output_dir != undefined) {
            // in saveInfo.output_dir replace text "$(setupDir)" with saveDir
            console.writeln("Restored output directory " + saveInfo.output_dir);
            let outputDir = saveInfo.output_dir.replace("$(setupDir)", saveDir);
            outputDir = outputDir.replace("$(saveDir)", saveDir);   // for compatibility check also saveDir
            console.writeln("Updated output directory " + outputDir);
            if (this.gui) {
                  this.gui.updateOutputDirEdit(outputDir);
            }
      } else {
            // Use saveDir as output root directory
            this.setOutputRootDir(this.ensurePathEndSlash(saveDir));
      }

      this.saveInfoMakeFullPaths(saveInfo, saveDir);

      if (saveInfo.best_image != null && saveInfo.best_image != undefined) {
            if (!File.exists(saveInfo.best_image)) {
                  console.criticalln("Restored best image " + saveInfo.best_image + " does not exist");
                  this.global.user_selected_best_image = null;
            } else {
                  console.writeln("Restored best image " + saveInfo.best_image);
                  this.global.user_selected_best_image = saveInfo.best_image;
            }
      }
      if (saveInfo.reference_image != null && saveInfo.reference_image != undefined) {
            let file_not_found = false
            for (var i = 0; i < saveInfo.reference_image.length; i++) {
                  if (!File.exists(saveInfo.reference_image[i][0])) {
                        console.criticalln("Restored reference image " + saveInfo.reference_image[i][0] + " does not exist");
                        file_not_found = true;
                        break;
                  }
            }
            if (file_not_found) {
                  this.global.user_selected_reference_image = [];
            } else {
                  console.writeln("Restored reference images " + saveInfo.reference_image);
                  this.global.user_selected_reference_image = saveInfo.reference_image;
            }
      }
      if (saveInfo.star_alignment_image != null && saveInfo.star_alignment_image != undefined) {
            if (!File.exists(saveInfo.star_alignment_image)) {
                  console.criticalln("Restored star alignment image " + saveInfo.star_alignment_image + " does not exist");
                  this.global.star_alignment_image = null;
            } else {
                  console.writeln("Restored star alignment image " + saveInfo.star_alignment_image);
                  this.global.star_alignment_image = saveInfo.star_alignment_image;
            }
      }
      if (saveInfo.defectInfo != null && saveInfo.defectInfo != undefined) {
            console.writeln("Restored defect info");
            this.global.LDDDefectInfo = saveInfo.defectInfo;
      }
      if (saveInfo.exclusion_areas != null && saveInfo.exclusion_areas != undefined) {
            console.writeln("Restored exclusion areas");
            // Check if saveInfo.exclusion_areas is an array
            if (Array.isArray(saveInfo.exclusion_areas)) {
                  console.criticalln("Restored old format exclusion areas, it is recommended to recreate exclusion areas");
                  this.global.exclusion_areas.polygons = saveInfo.exclusion_areas;
            } else {
                  this.global.exclusion_areas = saveInfo.exclusion_areas;
            }
      }
      if (saveInfo.saved_measurements != null && saveInfo.saved_measurements != undefined) {
            console.writeln("Restored subframe selector measurements");
            this.global.saved_measurements = saveInfo.saved_measurements;
            this.global.saved_measurements_sorted = null;
      }
      if (saveInfo.flowchartData != null && saveInfo.flowchartData != undefined) {
            console.writeln("Restored flowchart data");
            this.global.flowchartData = saveInfo.flowchartData;
      } else {
            this.global.flowchartData = null;
      }

      var pagearray = [];
      for (var i = 0; i < this.global.pages.END; i++) {
            pagearray[i] = null;
      }
      var fileInfoList = saveInfo.fileinfo;
      var found_files = false;
      for (var i = 0; i < fileInfoList.length; i++) {
            var saveInfo = fileInfoList[i];
            console.writeln("readJsonFile " + saveInfo.pagename);
            if (lights_only && saveInfo.pageindex != this.global.pages.LIGHTS) {
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
                        case this.global.pages.LIGHTS:
                              console.writeln("readJsonFile, set manual filters for lights");
                              this.global.lightFilterSet = filterSet;
                              break;
                        case this.global.pages.FLATS:
                              console.writeln("readJsonFile, set manual filters for flats");
                              this.global.flatFilterSet = filterSet;
                              break;
                        case this.global.pages.FLAT_DARKS:
                              console.writeln("readJsonFile, set manual filters for flat darks");
                              this.global.flatDarkFilterSet = filterSet;
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

addJsonFileInfo(fileInfoList, pageIndex, treeboxfiles, filterset)
{
      var name = "";
      switch (pageIndex) {
            case this.global.pages.LIGHTS:
                  name = "Lights";
                  break;
            case this.global.pages.BIAS:
                  name = "Bias";
                  break;
            case this.global.pages.DARKS:
                  name = "Darks";
                  break;
            case this.global.pages.FLATS:
                  name = "Flats";
                  break;
            case this.global.pages.FLAT_DARKS:
                  name = "FlatDarks";
                  break;
      }
      fileInfoList[fileInfoList.length] = { pageindex: pageIndex, pagename: name, files: treeboxfiles, filterset: filterset };
}

getChangedSettingsAsJson()
{
      var settings = [];
      console.writeln("getChangedSettingsAsJson");
      for (let x in this.par) {
            var param = this.par[x];
            if (this.global.isParameterChanged(param) && !param.skip_reset) {
                  console.writeln("getChangedSettingsAsJson, save " + param.name + "=" + param.val);
                  settings[settings.length] = [ param.name, param.val ];
            }
      }
      console.noteln("Saving " + settings.length + " settings");
      return settings;
}

copy_user_selected_reference_image_array()
{
      var copyarr = [];

      for (var i = 0; i < this.global.user_selected_reference_image.length; i++) {
            var elem = [];
            for (var j = 0; j < this.global.user_selected_reference_image[i].length; j++) {
                  elem[elem.length] = this.global.user_selected_reference_image[i][j];
            }
            copyarr[copyarr.length] = elem;
      }
      return copyarr;
}

initJsonSaveInfo(fileInfoList, save_settings, saveDir)
{
      if (save_settings) {
            var changed_settings = this.getChangedSettingsAsJson();
            var saveInfo = { version: 3, fileinfo: fileInfoList, settings: changed_settings };
            if (this.ppar.win_prefix != '') {
                  saveInfo.window_prefix = this.ppar.win_prefix;
            }
            if (this.gui) {
                  var outputDirEditPath = this.gui.getOutputDirEdit();
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
            if (this.global.user_selected_best_image != null) {
                  saveInfo.best_image = this.global.user_selected_best_image;
            }
            if (this.global.user_selected_reference_image.length > 0) {
                  // Need to make a copy so we do not update the original array
                  saveInfo.reference_image = this.copy_user_selected_reference_image_array();
            }
            if (this.global.star_alignment_image != null) {
                  saveInfo.star_alignment_image = this.global.star_alignment_image;
            }
            if (this.global.LDDDefectInfo.length > 0) {
                  saveInfo.defectInfo = this.global.LDDDefectInfo;
            }
            if (this.global.exclusion_areas.polygons.length > 0) {
                  saveInfo.exclusion_areas = this.global.exclusion_areas;
            }
            if (this.global.saved_measurements != null) {
                  saveInfo.saved_measurements = this.global.saved_measurements;
            }
            if (this.global.flowchartData != null) {
                  saveInfo.flowchartData = this.global.flowchartData;
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
saveInfoMakeRelativePaths(saveInfo, saveDir)
{
      if (saveDir == null || saveDir == "") {
            this.throwFatalError("saveInfoMakeRelativePaths, empty saveDir");
      }
      saveDir = this.ensurePathEndSlash(saveDir);
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

saveInfoMakeFullPaths(saveInfo, saveDir)
{
      if (saveDir == null || saveDir == "") {
            this.throwFatalError("saveInfoMakeFullPaths, empty saveDir");
      }
      saveDir = this.ensurePathEndSlash(saveDir);
      console.writeln("saveInfoMakeFullPaths, saveDir " + saveDir);
      var fileInfoList = saveInfo.fileinfo;
      for (var i = 0; i < fileInfoList.length; i++) {
            for (var j = 0; j < fileInfoList[i].files.length; j++) {
                  var fname = fileInfoList[i].files[j][0];
                  if (this.pathIsRelative(fname)) {
                        fileInfoList[i].files[j][0] = saveDir + fname;
                  }
            }
      }
      if (saveInfo.best_image != null && saveInfo.best_image != undefined) {
            if (this.pathIsRelative(saveInfo.best_image)) {
                  saveInfo.best_image = saveDir + saveInfo.best_image;
            }
      }
      if (saveInfo.reference_image != null && saveInfo.reference_image != undefined) {
            for (var i = 0; i < saveInfo.reference_image.length; i++) {
                  if (this.pathIsRelative(saveInfo.reference_image[i][0])) {
                        saveInfo.reference_image[i][0] = saveDir + saveInfo.reference_image[i][0];
                  }
            }
      }
      if (saveInfo.star_alignment_image != null && saveInfo.star_alignment_image != undefined) {
            if (this.pathIsRelative(saveInfo.star_alignment_image)) {
                  saveInfo.star_alignment_image = saveDir + saveInfo.star_alignment_image;
            }
      }
      return saveInfo;
}

/* Save file info to a file.
 */
saveJsonFileEx(parent, save_settings, autosave_json_filename, default_json_filename = null)
{
      console.writeln("saveJsonFile");

      let fileInfoList = [];

      if (this.gui) {
            for (let pageIndex = 0; pageIndex < parent.treeBox.length; pageIndex++) {
                  let treeBox = parent.treeBox[pageIndex];
                  let treeboxfiles = [];
                  let filterSet = null;
                  let name = "";
                  switch (pageIndex) {
                        case this.global.pages.LIGHTS:
                              name = "Lights";
                              filterSet = this.global.lightFilterSet;
                              break;
                        case this.global.pages.BIAS:
                              name = "Bias";
                              break;
                        case this.global.pages.DARKS:
                              name = "Darks";
                              break;
                        case this.global.pages.FLATS:
                              name = "Flats";
                              filterSet = this.global.flatFilterSet;
                              break;
                        case this.global.pages.FLAT_DARKS:
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

                  this.gui.getTreeBoxNodeFiles(treeBox, treeboxfiles);

                  console.writeln("Found " + treeboxfiles.length + " files");

                  if (treeboxfiles.length == 0) {
                        // no files
                        continue;
                  }

                  if (filterSet != null) {
                        this.clearFilterFileUsedFlags(filterSet);
                  }
                  this.addJsonFileInfo(fileInfoList, pageIndex, treeboxfiles, filterSet);
            }

            if (fileInfoList.length == 0 && !save_settings) {
                  // nothing to save
                  console.writeln("No files to save.");
                  return;
            }
      }

      if (autosave_json_filename == null) {
            let saveFileDialog = new SaveFileDialog();
            saveFileDialog.caption = "Save As";
            saveFileDialog.filters = [["Json files", "*.json"], ["All files", "*.*"]];
            if (fileInfoList.length > 0) {
                  var outputDir = this.ensurePathEndSlash(this.getOutputDir(fileInfoList[0].files[0][0]));
            } else {
                  var outputDir = this.ensurePathEndSlash(this.getOutputDir(""));
                  if (outputDir == "") {
                        outputDir = this.ensurePathEndSlash(this.ppar.lastDir);
                  }
            }
            if (default_json_filename != null) {
                  saveFileDialog.initialPath = outputDir + default_json_filename;
            } else if (save_settings) {
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
            let dialogRet = this.ensureDialogFilePath(autosave_json_filename);
            if (dialogRet == 0) {
                  // Canceled, do not save
                  return;
            }
            let json_path;
            if (dialogRet == 1) {
                  // User gave explicit directory
                  json_path = this.global.outputRootDir;
            } else {
                  // Not saving to AutoProcessed directory
                  //json_path = this.combinePath(this.global.outputRootDir, this.global.AutoProcessedDir); 
                  
                  // Saving to lights directory, or user given output directory
                  // This way we get relative paths to file so it is easy to move around
                  // or even share with lights files.
                  json_path = this.global.outputRootDir;
            }
            var saveDir = this.ensurePathEndSlash(json_path);
            var json_path_and_filename = saveDir + autosave_json_filename;
      }
      this.saveLastDir(saveDir);
      try {
            let saveInfo = this.initJsonSaveInfo(fileInfoList, save_settings, saveDir);
            let file = new File();
            this.saveInfoMakeRelativePaths(saveInfo, saveDir);
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

getReferenceBasename(processed_name, filename_postfix)
{
      let processed_basename = File.extractName(processed_name);
      if (filename_postfix.length > 0 && processed_basename.endsWith(filename_postfix)) {
            // strip filename_postfix from the end
            processed_basename = processed_basename.slice(0, processed_basename.length - filename_postfix.length);
      }
      //console.writeln("getReferenceBasename ", processed_name, " ", filename_postfix, " ", processed_basename);
      return processed_basename;
}

compareReferenceFileNames(reference_name, processed_name, filename_postfix)
{
      let reference_basename = this.getReferenceBasename(reference_name, filename_postfix);
      let processed_basename = this.getReferenceBasename(processed_name, filename_postfix);
      return reference_basename == processed_basename;
}

normalizePath(filePath) 
{
      let newPath = filePath.split("/./").join("/");
      if (this.par.debug.val) {
            console.writeln("normalizePath " + filePath + " -> " + newPath);
      }
      return newPath;
}

saveJsonFile(parent, save_settings, default_json_filename = null)
{
      this.saveJsonFileEx(parent, save_settings, null, default_json_filename);
}

formatToolTip(txt)
{
      if (txt.substr(0, 1) == "<") {
            return txt;
      } else {
            return "<p>" + txt + "</p>";
      }
}

getScreenSize(dialog)
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
adjustDialogToScreen(dialog, preview_control, maxsize, preview_width, preview_height)
{
      var changes = false;
      
      var sz = this.getScreenSize(dialog);
      var screen_width = sz[0];
      var screen_height = sz[1];
      if (this.par.debug.val) console.writeln("DEBUG:adjustDialogToScreen, screen size " + screen_width + "x" + screen_height + ", preview size " + preview_width + "x" + preview_height);

      if (maxsize) {
            var limit = 50;
            var target_width = Math.floor(screen_width * 0.95);
            var target_height = Math.floor(screen_height * 0.9);
            if (this.par.debug.val) console.writeln("DEBUG:adjustDialogToScreen, maxsize, target size " + target_width + "x" + target_height);
      } else {
            var limit = 100;
            var target_width = Math.floor(screen_width * 0.7);
            var target_height = Math.floor(screen_height * 0.7);
            if (this.par.debug.val) console.writeln("DEBUG:adjustDialogToScreen, target size " + target_width + "x" + target_height);
      }
      var step = limit / 2;

      var dialog_width = dialog.width;
      var dialog_height = dialog.height;

      if (!maxsize && dialog_width < target_width - limit && dialog_height < target_height - limit) {
            // Dialog already fits on screen
            if (this.par.debug.val) console.writeln("DEBUG:adjustDialogToScreen, Dialog already fits on screen");
            return { width: preview_width, height: preview_height, changes: changes };
      }

      if (this.par.debug.val) {
            console.writeln("DEBUG:adjustDialogToScreen, maxsize " + maxsize + ", screen size " + screen_width + "x" + screen_height + ", target size " + target_width + "x" + target_height + ", preview size " + preview_width + "x" + preview_height);
            console.writeln("DEBUG:adjustDialogToScreen, start, screen size " + screen_width + "x" + screen_height + ", dialog size " + dialog_width + "x" + dialog_height + ", preview size " + preview_width + "x" + preview_height);
      }

      var original_preview_width = preview_width;
      var original_preview_height = preview_height;
      var prev_preview_width = preview_width;
      var prev_preview_height = preview_height;

      for (var i = 0; i < 100; i++) {
            preview_control.setSize(preview_width, preview_height);
            preview_control.ensureLayoutUpdated();
            preview_control.adjustToContents();
            dialog.ensureLayoutUpdated();
            dialog.adjustToContents();

            if (dialog_width == dialog.width && dialog_height == dialog.height) {
                  // No change
                  // Restore previous values
                  preview_width = prev_preview_width;
                  preview_height = prev_preview_height;
                  if (this.par.debug.val) {
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
                        if (this.par.debug.val) {
                              console.writeln("DEBUG:adjustDialogToScreen, maxsize, stop, close enough, screen size " + screen_width + "x" + screen_height + ", dialog size " + dialog_width + "x" + dialog_height + ", preview size " + preview_width + "x" + preview_height + ", i " + i );
                        }
                        break;
                  }
            } else {
                  // Just make sure that the dialog fits on screen
                  if (dialog_width < target_width - limit && dialog_height < target_height - limit) {
                        // We are close enough
                        if (this.par.debug.val) {
                              console.writeln("DEBUG:adjustDialogToScreen, stop, close enough, screen size " + screen_width + "x" + screen_height + ", dialog size " + dialog_width + "x" + dialog_height + ", preview size " + preview_width + "x" + preview_height + ", i " + i );
                        }
                        break;
                  }
            }

            if (this.par.debug.val) {
                  console.writeln("DEBUG:adjustDialogToScreen, screen size " + screen_width + "x" + screen_height + ", dialog size " + dialog_width + "x" + dialog_height + ", preview size " + preview_width + "x" + preview_height + ", i " + i );
            }

            prev_preview_width = preview_width;
            prev_preview_height = preview_height;
      
            /* With maxsize, try to make dialog bigger if it is smaller than target size.
             */
            if (maxsize && dialog_width < target_width + limit) {
                  preview_width = preview_width + step;
                  if (this.par.debug.val) console.writeln("DEBUG:adjustDialogToScreen, increase preview width to " + preview_width);
            }
            if (maxsize && dialog_height < target_height + limit) {
                  preview_height = preview_height + step;
                  if (this.par.debug.val) console.writeln("DEBUG:adjustDialogToScreen, increase preview height to " + preview_height);
            }
            /* Make dialog smaller if it is bigger than target size.
             */
            if (dialog_width > target_width - limit) {
                  preview_width = preview_width - step;
                  if (this.par.debug.val) console.writeln("DEBUG:adjustDialogToScreen, decrease preview width to " + preview_width);
            }
            if (dialog_height > target_height - limit) {
                  preview_height = preview_height - step;
                  if (this.par.debug.val) console.writeln("DEBUG:adjustDialogToScreen, decrease preview height to " + preview_height);
            }
      }
      if (original_preview_width != preview_width || original_preview_height != preview_height) {
            changes = true;
      }
      if (changes) {
            if (i > 1) {
                  console.writeln("Adjust Dialog to screen, screen size " + screen_width + "x" + screen_height + ", dialog size " + dialog_width + "x" + dialog_height + ", preview size " + preview_width + "x" + preview_height + ", steps " + i );
            } else {
                  console.writeln("Adjust Dialog to screen, screen size " + screen_width + "x" + screen_height + ", dialog size " + dialog_width + "x" + dialog_height + ", preview size " + preview_width + "x" + preview_height);
            }
      } else {
            if (this.par.debug.val) console.writeln("DEBUG:adjustDialogToScreen, no changes, screen size " + screen_width + "x" + screen_height + ", dialog size " + dialog_width + "x" + dialog_height + ", preview size " + preview_width + "x" + preview_height);
      }

      return { width: preview_width, height: preview_height, changes: changes };
}

get_execute_time_str(start_time, end_time) 
{
      var elapsed_time = (end_time - start_time) / 1000;
      var elapsed_time_str = "";
      if (elapsed_time >= 3600) {
            var hours = Math.floor(elapsed_time / 3600);
            elapsed_time_str = elapsed_time_str + hours + "h";
            elapsed_time -= hours * 3600;
      }
      if (elapsed_time >= 60) {
            var minutes = Math.floor(elapsed_time / 60);
            elapsed_time_str = elapsed_time_str + minutes + "m";
            elapsed_time -= minutes * 60;
      }
      if (elapsed_time < 59) {
            elapsed_time = Math.round(elapsed_time);
      } else {
            elapsed_time = Math.floor(elapsed_time);
      }
      elapsed_time_str = elapsed_time_str + elapsed_time + "s";
      return elapsed_time_str;
}

get_node_execute_time_str(node)
{
      if (node.end_time) {
            return " (" + this.get_execute_time_str(node.start_time, node.end_time) + ")";
      } else {
            return "";
      }
}

// Get exclusion areas scaled to the target image size
getScaledExclusionAreas(exclusionAreas, targetImage, rescale = true) 
{
      if (exclusionAreas.polygons.length == 0) {
            // No exclusion areas
            return exclusionAreas;
      }

      // By default we do rescale when we do checks for image size
      if (rescale) {
            // Check if image dimensions in exclusionAreas are the same as in targetImage
            if (exclusionAreas.image_width == targetImage.mainView.image.width &&
                  exclusionAreas.image_height == targetImage.mainView.image.height) 
            {
                  // No scaling needed
                  return exclusionAreas;
            }

            // Check for old format without image dimensions
            if (exclusionAreas.image_width == 0 || exclusionAreas.image_height == 0) {
                  if (this.global.is_processing != this.global.processing_state.none) {
                        this.addCriticalStatus("Exclusion areas image size is not defined, please recreate exclusion areas");
                  } else {
                        console.criticalln("Exclusion areas image size is not defined, please recreate exclusion areas");
                  }
                  return exclusionAreas;
            }

            // Check image aspect ratio, we allow some different because of cropping
            var exclusionAreasScale = exclusionAreas.image_width / exclusionAreas.image_height;
            var targetImageScale = targetImage.mainView.image.width / targetImage.mainView.image.height;
            if (Math.abs(exclusionAreasScale - targetImageScale) > 0.05) {
                  if (this.global.is_processing != this.global.processing_state.none) {
                        this.addCriticalStatus("Exclusion areas aspect ratio " + exclusionAreas.image_width + "x" + exclusionAreas.image_height + " does not match target aspect ratio " + targetImage.mainView.image.width + "x" + targetImage.mainView.image.height);
                  } else {
                        console.criticalln("Exclusion areas aspect ratio " + exclusionAreas.image_width + "x" + exclusionAreas.image_height + " does not match target aspect ratio " + targetImage.mainView.image.width + "x" + targetImage.mainView.image.height);
                  }
            }

            var drizzle = this.findDrizzle(targetImage);

            // Give a message if exclusionAreas image size is more than 5% different from target image size
            // Drizzle in target image may change the image size, so we that in the calculation
            var limit = this.par.crop_check_limit.val / 100;
            if (Math.abs(exclusionAreas.image_width * drizzle - targetImage.mainView.image.width) > limit * targetImage.mainView.image.width ||
            Math.abs(exclusionAreas.image_height * drizzle - targetImage.mainView.image.height) > limit * targetImage.mainView.image.height) 
            {
                  if (this.global.is_processing != this.global.processing_state.none) {
                        this.addCriticalStatus("Exclusion areas size " + exclusionAreas.image_width + "x" + exclusionAreas.image_height + " does not match target image size " + targetImage.mainView.image.width + "x" + targetImage.mainView.image.height);
                  } else {
                        console.criticalln("Exclusion areas size " + exclusionAreas.image_width + "x" + exclusionAreas.image_height + " does not match target image size " + targetImage.mainView.image.width + "x" + targetImage.mainView.image.height);
                  }
            }
      }
      var scaleX = targetImage.mainView.image.width / exclusionAreas.image_width;
      var scaleY = targetImage.mainView.image.height / exclusionAreas.image_height;

      var scaledExclusionAreas = [];
      for (var i = 0; i < exclusionAreas.polygons.length; i++) {
            var polygon = exclusionAreas.polygons[i];
            var scaledPolygon = [];
            for (var j = 0; j < polygon.length; j++) {
                  // console.writeln("Scaling point: " + polygon[j].x + ", " + polygon[j].y);
                  scaledPolygon.push({ x: Math.floor(polygon[j].x * scaleX), y: Math.floor(polygon[j].y * scaleY) });
            }
            scaledExclusionAreas.push(scaledPolygon);
      }

      return { polygons: scaledExclusionAreas, image_width: targetImage.mainView.image.width, image_height: targetImage.mainView.image.height };
}

addExecutedProcess(obj, txt = "", imageId = null)
{
      if (!this.global.get_flowchart_data
          && this.global.is_processing != this.global.processing_state.none
          && !this.global.creating_mask
          && !this.global.skip_process_value_save)
      {
            this.executed_processes.push(
                  { 
                        src: obj.toSource("XPSM 1.0"), 
                        src_js: obj.toSource(), 
                        processId: obj.processId(),
                        txt: txt,
                        imageId: imageId,
                        action: null
                  }
            );
      }
}

addExecutedProcessScriptAction(actiontxt, options)
{
      if (!this.global.get_flowchart_data
          && this.global.is_processing != this.global.processing_state.none
          && !this.global.creating_mask
          && !this.global.skip_process_value_save)
      {
            if (actiontxt == "rename") {
                  var action = "renameWindow('" + options[0] + "', '" + options[1] + "');";

            } else if (actiontxt == "copyWindow") {
                  var action = "copyWindow('" + options[0] + "', '" + options[1] + "');\n";

            } else if (actiontxt == "closeWindow") {
                  var action = "closeWindow('" + options[0] + "');\n";

            } else if (actiontxt == "newWindow") {
                  var action = "new ImageWindow(" + options[0] + ", " + options[1] + ", " + options[2] + ", " + options[3] + ", " + options[4] + ", " + options[5] + ", '" + options[6] + "');\n";

            } else {
                  this.throwFatalError("addExecutedProcessScriptAction, unknown action " + actiontxt);
                  return;
            }
            this.executed_processes.push(
                  { 
                        src: null, 
                        src_js: null, 
                        processId: 0,
                        txt: action,
                        imageId: null,
                        action: action
                  }
            );
      }
}

writeExecutedProcessesToScript(filename)
{
      console.writeln("Write executed processes to script file " + filename);
      var file = new File();
      file.createForWriting(filename);
      file.outText("// AutoIntegrate executed processes\n");
      file.outText("// Generated on " + (new Date()).toString() + "\n");
      file.outText("// PixInsight version " + this.global.pixinsight_version_str + "\n");
      file.outText("// AutoIntegrate version " + this.global.autointegrate_version + "\n");
      file.outTextLn("");
      file.outTextLn("#engine v8");
      file.outTextLn("");
      file.outTextLn("function copyWindow(sourceId, targetId) {");
      file.outTextLn("      console.writeln('Copying window: ' + sourceId + ' to ' + targetId);");
      file.outTextLn("      var sourceWindow = ImageWindow.windowById(sourceId);");
      file.outTextLn("      if (sourceWindow == null || sourceWindow.isNull) {");
      file.outTextLn("            throw new Error('copyWindow:Source window ' + sourceId + ' is null');");
      file.outTextLn("      }");
      file.outTextLn("      var targetWindow = new ImageWindow(");
      file.outTextLn("                              sourceWindow.mainView.image.width,");
      file.outTextLn("                              sourceWindow.mainView.image.height,");
      file.outTextLn("                              sourceWindow.mainView.image.numberOfChannels,");
      file.outTextLn("                              sourceWindow.mainView.window.bitsPerSample,");
      file.outTextLn("                              sourceWindow.mainView.window.isFloatSample,");
      file.outTextLn("                              sourceWindow.mainView.image.colorSpace != ColorSpace.Gray,");
      file.outTextLn("                              targetId);");
      file.outTextLn("      targetWindow.mainView.beginProcess(UndoFlag.NoSwapFile);");
      file.outTextLn("      targetWindow.mainView.image.assign(sourceWindow.mainView.image);");
      file.outTextLn("      targetWindow.mainView.endProcess();");
      file.outTextLn("      targetWindow.show();");
      file.outTextLn("}");
      file.outTextLn("function renameWindow(oldId, newId) {");
      file.outTextLn("      console.writeln('Renaming window: ' + oldId + ' to ' + newId);");
      file.outTextLn("      var sourceWindow = ImageWindow.windowById(oldId);");
      file.outTextLn("      if (sourceWindow == null || sourceWindow.isNull) {");
      file.outTextLn("            throw new Error('renameWindow: Source window ' + oldId + ' is null');");
      file.outTextLn("      }");
      file.outTextLn("      sourceWindow.mainView.id = newId;");
      file.outTextLn("}");
      file.outTextLn("function closeWindow(windowId) {");
      file.outTextLn("      console.writeln('Closing window: ' + windowId);");
      file.outTextLn("      var window = ImageWindow.windowById(windowId);");
      file.outTextLn("      if (window == null || window.isNull) {");
      file.outTextLn("            return;");
      file.outTextLn("      }");
      file.outTextLn("      window.forceClose();");
      file.outTextLn("}");
      file.outTextLn("function printMemoryStatus(txt = \"\") {");
      file.outTextLn("      let memoryStatus = System.physicalMemoryStatus();");
      file.outTextLn("      console.writeln(\"Memory status: \" + parseInt((memoryStatus.totalBytes - memoryStatus.availableBytes) / (1024 * 1024)) + \" MB used\" + (txt ? \" - \" + txt : \"\"));");
      file.outTextLn("}");

      file.outTextLn("");
      file.outTextLn("console.beginLog();");
      file.outTextLn("printMemoryStatus('Before processing');");

      for (var i = 0; i < this.executed_processes.length; i++) {
            var src_js = this.executed_processes[i].src_js;
            if (src_js == null) {
                  // This is a script action, write code to execute the action with options
                  file.outTextLn(this.executed_processes[i].action);
            } else {
                  file.outTextLn("");
                  file.outTextLn(src_js);
                  if (this.executed_processes[i].imageId != null) {
                        file.outTextLn("P.executeOn(ImageWindow.windowById('" + this.executed_processes[i].imageId + "').mainView, false);");
                  } else {
                        file.outTextLn("P.executeGlobal();");
                  }
                  var txt = this.executed_processes[i].txt ? " " + this.executed_processes[i].txt : "";
                  file.outTextLn("printMemoryStatus('After " + this.executed_processes[i].processId + txt + "');");
            }
      }
      file.outTextLn("");
      file.outTextLn("printMemoryStatus('After processing');");
      file.outTextLn("console.noteln('Processing completed');");
      file.outTextLn("var logtxt = console.endLog();");
      file.outTextLn("var file = new File();");
      file.outTextLn("file.createForWriting('" + filename.replace(/\.js$/, ".log") + "');");
      file.outTextLn("file.write(logtxt);");
      file.outTextLn("file.close();");

      file.close();
}

writeExecutedProcessesToXPSM(filename)
{
      console.writeln("Write executed processes to XPSM file " + filename);
      var file = new File();
      file.createForWriting(filename);

      file.outTextLn('<?xml version="1.0" encoding="UTF-8"?>');
      file.outTextLn('<!--');
      file.outTextLn('********************************************************************');
      file.outTextLn('PixInsight XML Process Serialization Module - XPSM 1.0');
      file.outTextLn('AutoIntegrate processings steps');
      file.outTextLn('********************************************************************');
      file.outTextLn('Generated on ' + (new Date()).toString());
      file.outTextLn('PixInsight version ' + this.global.pixinsight_version_str);
      file.outTextLn('AutoIntegrate version ' + this.global.autointegrate_version);
      file.outTextLn('********************************************************************');
      file.outTextLn('-->');

      file.outText('<xpsm version=\"1.0\"');
      file.outText(' mlns="http://www.pixinsight.com/xpsm"');
      file.outText(' xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"');
      file.outText(' xsi:schemaLocation="http://www.pixinsight.com/xpsm');
      file.outTextLn(' http://pixinsight.com/xpsm/xpsm-1.0.xsd">');

      // Write process instances
      for (var i = 0; i < this.executed_processes.length; i++) {
            var src = this.executed_processes[i].src;
            if (src == null) {
                  continue;
            }
            var processId = this.executed_processes[i].processId;
            file.outTextLn('<!-- ' + processId + (i+1) + ' -->');
            src = src.replace(processId + "_instance", "ai_" + processId + "_instance" + (i+1));
            src = src.replace(/Integration_([LRGBSHOC])_map/g, "Integration_$1");
            src = src.replace(/Integration_RGB_map/g, "Integration_RGB");
            file.outTextLn(src);
      }

      // write icons
      for (var i = 0; i < this.executed_processes.length; i++) {
            var processId = this.executed_processes[i].processId;
            var txt = this.executed_processes[i].txt;
            if (txt != "" && txt != null) {
                  txt = '_' + txt;
            }
            file.outTextLn('<icon id="ai_' + processId + txt + '_' + (i+1) + '"' +
                           ' instance="ai_' + processId + '_instance' + (i+1) + '"' +
                           ' xpos="' + (this.global.screen_width - 600) + '" ypos="' + (5 + 32 * (i+1)) + '" workspace="Workspace01"/>');
      }
      file.outTextLn('</xpsm>\n');
      file.close();
}

beginLog()
{
      if (this.beginLogCallback != null) {
            this.beginLogCallback();
      }
      if (this.loggingEnabled) {
            console.beginLog();
      }
}

endLog()
{
      if (this.loggingEnabled) {
            var logtext = console.endLog();
      } else {
            var logtext = null;
      }
      if (this.endLogCallback != null) {
            this.endLogCallback();
      }
      return logtext;
}

initStandalone()
{
    this.readParametersFromPersistentModuleSettings();
    this.restoreLastDir();
    this.restoreMasterDir();
}

/* Interface functions.

// Setup
this.setGUI = setGUI;
this.init_pixinsight_version = init_pixinsight_version;

this.runGarbageCollection = runGarbageCollection;
this.checkEvents = checkEvents;

// Filter sets
this.initFilterSets = initFilterSets;
this.findFilterSet = findFilterSet;
this.addFilterSetFile = addFilterSetFile;
this.findFilterForFile = findFilterForFile;
this.removeFilterFile = removeFilterFile;
this.clearFilterFileUsedFlags = clearFilterFileUsedFlags;

// File handling
this.setDefaultDirs = setDefaultDirs;
this.clearDefaultDirs = clearDefaultDirs;
this.ensurePathEndSlash = ensurePathEndSlash;
this.removePathEndSlash = removePathEndSlash;
this.removePathEndDot = removePathEndDot;
this.parseNewOutputDir = parseNewOutputDir;
this.pathIsRelative = pathIsRelative;
this.getOutputDir = getOutputDir;
this.setOutputRootDir = setOutputRootDir;
this.testDirectoryIsWriteable = testDirectoryIsWriteable;
this.ensureDir = ensureDir;
this.saveLastDir = saveLastDir;
this.restoreLastDir = restoreLastDir;
this.saveMasterDir = saveMasterDir;
this.restoreMasterDir = restoreMasterDir;
this.combinePath = combinePath;
this.getOptionalUniqueFilenamePart = getOptionalUniqueFilenamePart;
this.ensureDialogFilePath = ensureDialogFilePath;
this.compareReferenceFileNames = compareReferenceFileNames;
this.normalizePath = normalizePath;

// Info and error handling
this.throwFatalError = throwFatalError;
this.fatalWindowNameFailed = fatalWindowNameFailed;
this.updateStatusInfoLabel = updateStatusInfoLabel;
this.addCriticalStatus = addCriticalStatus;
this.addWarningStatus = addWarningStatus;
this.addStatusInfo = addStatusInfo;
this.addProcessingStepAndStatusInfo = addProcessingStepAndStatusInfo;

// Window handling
this.findWindow = findWindow;
this.getBaseWindowId = getBaseWindowId;
this.findWindowOrFile = findWindowOrFile;
this.findWindowStartsWith = findWindowStartsWith;
this.findWindowRe = findWindowRe;
this.findWindowFromArray = findWindowFromArray;
this.closeAllWindowsSubstr = closeAllWindowsSubstr;
this.getWindowList = getWindowList;
this.getWindowListReverse = getWindowListReverse;
this.findWindowId = findWindowId;
this.findWindowOrFileId = findWindowOrFileId;
this.windowShowif = windowShowif;

// Window iconize and position
this.windowIconizeFindPosition = windowIconizeFindPosition;
this.windowIconizeif = windowIconizeif;
this.windowIconizeAndKeywordif = windowIconizeAndKeywordif;
this.batchWindowSetPosition = batchWindowSetPosition;

// History and keywords
this.autointegrateProcessingHistory = autointegrateProcessingHistory;
this.filterKeywords = filterKeywords;
this.findDrizzle = findDrizzle;
this.findDrizzleScale = findDrizzleScale;
this.copyKeywords = copyKeywords;
this.setFITSKeyword = setFITSKeyword;
this.appenFITSKeyword = appenFITSKeyword;
this.getKeywordValue = getKeywordValue;
this.findKeywordName = findKeywordName;
this.setFITSKeywordNoOverwrite = setFITSKeywordNoOverwrite;
this.copyKeywordsFromWindow = copyKeywordsFromWindow;
this.copyKeywordsFromFile = copyKeywordsFromFile;
this.addProcessingStep = addProcessingStep;

this.addScriptWindow = addScriptWindow;

// Rename windows
this.windowRenameKeepifEx = windowRenameKeepifEx;
this.windowRenameKeepif = windowRenameKeepif;
this.windowRename = windowRename;

// Close windows
this.closeOneWindow = closeOneWindow;
this.closeOneWindowById = closeOneWindowById;
this.closeWindowsFromArray = closeWindowsFromArray;
this.closeFinalWindowsFromArray = closeFinalWindowsFromArray;
this.closeTempWindowsForOneImage = closeTempWindowsForOneImage;
this.closeTempWindows = closeTempWindows;
this.closeAllWindowsFromArray = closeAllWindowsFromArray;
this.closeAllWindows = closeAllWindows;

// Window arrays
this.findFromArray = findFromArray;
this.fixAllWindowArrays = fixAllWindowArrays;

// Save windows
this.saveWindowEx = saveWindowEx;
this.saveFinalImageWindow = saveFinalImageWindow;
this.saveAllFinalImageWindows = saveAllFinalImageWindows;
this.saveWindowAsJpg = saveWindowAsJpg;

this.add_test_image = add_test_image;
this.copyWindowEx = copyWindowEx;

// Copy windows
this.copyWindow = copyWindow;
this.forceCopyWindow = forceCopyWindow;
this.openImageWindowFromFile = openImageWindowFromFile;
this.copyAstrometricSolutionFromWindow = copyAstrometricSolutionFromWindow;
this.copyAstrometricSolutionFromFile = copyAstrometricSolutionFromFile;

// Create new windows
this.createImageFromBitmap = createImageFromBitmap;
this.createWindowFromBitmap = createWindowFromBitmap;
this.getWindowBitmap = getWindowBitmap;
this.createWindowFromImage = createWindowFromImage;
this.createEmptyBitmap = createEmptyBitmap;

// Prefix and postfix handling
this.ensure_win_prefix_ex = ensure_win_prefix_ex;
this.ensure_win_prefix = ensure_win_prefix;
this.remove_autocontinue_prefix = remove_autocontinue_prefix;
this.replacePostfixOrAppend = replacePostfixOrAppend;

// Json files
this.readJsonFile = readJsonFile;
this.addJsonFileInfo = addJsonFileInfo;
this.initJsonSaveInfo = initJsonSaveInfo;
this.saveJsonFileEx = saveJsonFileEx;
this.saveJsonFile = saveJsonFile;

// Parameters and options
this.is_enhancements_option = is_enhancements_option;
this.is_narrowband_option = is_narrowband_option;
this.setParameterDefaults = setParameterDefaults;
this.recordParam = recordParam;
this.writeParameterToSettings = writeParameterToSettings;
this.readParameterFromSettings = readParameterFromSettings;
this.readParametersFromPersistentModuleSettings = readParametersFromPersistentModuleSettings

// Character and name checking
this.mapBadChars = mapBadChars;
this.mapBadWindowNameChars = mapBadWindowNameChars;
this.validateViewIdCharacters = validateViewIdCharacters;

// Console logging
this.beginLog = beginLog;
this.endLog = endLog;

this.arraysEqual = arraysEqual;

this.formatToolTip = formatToolTip;
this.getScreenSize = getScreenSize;
this.adjustDialogToScreen = adjustDialogToScreen;

this.get_execute_time_str = get_execute_time_str;
this.get_node_execute_time_str = get_node_execute_time_str;

this.getScaledExclusionAreas = getScaledExclusionAreas;

this.initStandalone = initStandalone;

 */

}  /* AutoIntegrateUtil */

#endif  /* AUTOINTEGRATEUTIL_JS */
