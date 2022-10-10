function runGC()
{
      gc(false);        // run soft gc
}

function checkEvents()
{
      processEvents();  // process events to keep GUI responsible
      runGC();
}

/// Init filter sets. We used to have actual Set object but
// use a simple array so we can add object into it.
// There are file sets for each possible filters and
// each array element has file name and used flag.
function initFilterSets()
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
function findFilterSet(filterSet, filetype)
{
      for (var i = 0; i < filterSet.length; i++) {
            if (filterSet[i][0] == filetype) {
                  return filterSet[i][1];
            }
      }
      throwFatalError("findFilterSet bad filetype " + filetype);
      return null;
}

// Add file base name to the filter set object
// We use file base name to detect filter files
function addFilterSetFile(filterSet, filePath, filetype)
{
      var basename = File.extractName(filePath);
      console.writeln("addFilterSetFile add " + basename + " filter "+ filetype);
      filterSet[filterSet.length] = { name: basename, used: false };
}

// Try to find base file name from filter set objects.
// We use simple linear search which should be fine
// for most data sizes.
function findFilterForFile(filterSet, filePath, filename_postfix)
{
      var basename = File.extractName(filePath);
      if (filename_postfix.length > 0) {
            // strip filename_postfix from the end
            basename = basename.slice(0, basename.length - filename_postfix.length);
      }
      console.writeln("findFilterForFile " + basename);
      for (var i = 0; i < filterSet.length; i++) {
            var filterFileSet = filterSet[i][1];
            for (j = 0; j < filterFileSet.length; j++) {
                  if (!filterFileSet[j].used && filterFileSet[j].name == basename) {
                        console.writeln("findFilterForFile filter " + filterSet[i][0]);
                        filterFileSet[j].used = true;
                        return filterSet[i][0];
                  }
            }
      }
      return null;
}

function clearFilterFileUsedFlags(filterSet)
{
      console.writeln("clearUsedFilterForFiles");
      for (var i = 0; i < filterSet.length; i++) {
            var filterFileSet = filterSet[i][1];
            for (j = 0; j < filterFileSet.length; j++) {
                  filterFileSet[j].used = false;
            }
      }
      return null;
}

function setDefaultDirs()
{
      AutoOutputDir = "AutoOutput";
      AutoCalibratedDir = "AutoCalibrated";
      AutoMasterDir = "AutoMaster";
      AutoProcessedDir = "AutoProcessed";
}

function clearDefaultDirs()
{
      AutoOutputDir = ".";
      AutoCalibratedDir = ".";
      AutoMasterDir = ".";
      AutoProcessedDir = ".";
}

function ensurePathEndSlash(dir)
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

function removePathEndSlash(dir)
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

function removePathEndDot(dir)
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
function parseNewOutputDir(filePath, subdir)
{
      var path = ensurePathEndSlash(File.extractDrive(filePath) + File.extractDirectory(filePath));
      path = ensurePathEndSlash(path + subdir);
      console.writeln("parseNewOutputDir " + path);
      return path;
}

// If path is relative and not absolute, we append it to the 
// path of the image file
function pathIsRelative(p)
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

function throwFatalError(txt)
{
      addProcessingStepAndStatusInfo(txt);
      run_results.fatal_error = txt;
      is_processing = false;
      throw new Error(txt);
}

function winIsValid(w)
{
      return w != null;
}

function checkWinFilePath(w)
{
      if (w.filePath) {
            outputRootDir = getOutputDir(w.filePath);
      }
}

function checkAutoCont(w)
{
      if (winIsValid(w))  {
            checkWinFilePath(w);
            return true;
      } else {
            return false;
      }
}

function findWindow(id)
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

function closeAllWindowsSubstr(id_substr)
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

function getWindowList()
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

function getWindowListReverse()
{
      var windowListReverse = [];
      var windowList = getWindowList();
      for (var i = windowList.length-1; i >= 0; i--) {
            if (windowList[i].match(/undo[1-9]*/g) == null) {
                  windowListReverse[windowListReverse.length] = windowList[i];
            }
      }
      return windowListReverse;
}

function findWindowId(id)
{
      var w = findWindow(id);

      if (w == null) {
            return null;
      }

      return w.mainView.id;
}

function windowShowif(id)
{
      var w = findWindow(id);
      if (w != null) {
            w.show();
      }
}

// Iconify the window, the return value is the window,
// only as a convenience to windowIconizeAndKeywordif()
function windowIconizeif(id)
{
      if (id == null) {
            return null;
      }
      var w = findWindow(id);

      if (w != null) {
            /* Method iconize() will put the icon at the middle position
               of the window. To get icons to the top left corner we
               first move the window middle position there to get
               the icon at the right position. Then we restore the 
               window position back to old position.
            */
            var oldpos = new Point(w.position);  // save old position
            if (iconPoint == null) {
                  /* Get first icon to upper left corner. */
                  iconPoint = new Point(
                                    -(w.width / 2) + 5 + columnCount*300,
                                    -(w.height / 2) + 5 + iconStartRow * 32);
                  console.writeln("Icon " + id + " start from position " + iconPoint + ", iconStartRow " + iconStartRow + ", columnCount " + columnCount);
            } else {
                  /* Put next icons in a nice row below the first icon.
                  */
                  // iconPoint.moveBy(0, 32);
                  iconPoint = new Point(
                        -(w.width / 2) + 5 + columnCount*300,
                        -(w.height / 2) + 5 + iconStartRow * 32 + haveIconized * 32);
                  // console.writeln("Next icon " + id + " position " + iconPoint + ", iconStartRow " + iconStartRow + ", columnCount " + columnCount);
            }
            w.position = new Point(iconPoint);  // set window position to get correct icon position
            w.iconize();
            w.position = oldpos;                // restore window position

            haveIconized++;
      }
      return w;
}

function windowIconizeAndKeywordif(id)
{
      var w = windowIconizeif(id);

      if (w != null) {
 
            // Set processed image keyword. It will not overwrite old
            // keyword. If we later set a final image keyword it will overwrite
            // this keyword.
            setProcessedImageKeyword(w);
      }
}

function windowRenameKeepifEx(old_name, new_name, keepif, allow_duplicate_name)
{
      if (old_name == new_name) {
            return new_name;
      }
      var w = ImageWindow.windowById(old_name);
      w.mainView.id = new_name;
      if (!keepif) {
            addScriptWindow(new_name);
      }
      if (!allow_duplicate_name && w.mainView.id != new_name) {
            fatalWindowNameFailed("Window rename from " + old_name + " to " + new_name + " failed, name is " + w.mainView.id);
      }
      return w.mainView.id;
}

function windowRenameKeepif(old_name, new_name, keepif)
{
      return windowRenameKeepifEx(old_name, new_name, keepif, false);
}

function windowRename(old_name, new_name)
{
      return windowRenameKeepif(old_name, new_name, false);
}

// Add a script window that will be closed when close all is clicked
// Useful for temporary windows that do not have a fixed name
function addScriptWindow(name)
{
      all_windows[all_windows.length] = name;
}

function forceCloseOneWindow(w)
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
function closeOneWindow(id)
{
      var w = findWindow(id);
      if (w != null) {
            forceCloseOneWindow(w);
      }
}

// close all windows from an array
function closeAllWindowsFromArray(arr)
{
      for (var i = 0; i < arr.length; i++) {
            // console.writeln(" AINew Closing Window: " + arr[i]);
            closeOneWindow(arr[i]+"_stars");
            closeOneWindow(arr[i]);
      }
}

// For the final window, we may have more different names with
// both prefix or postfix added
function closeFinalWindowsFromArray(arr)
{
      for (var i = 0; i < arr.length; i++) {
            closeOneWindow(arr[i]);
            closeOneWindow(arr[i]+"_stars");
            closeOneWindow(arr[i]+"_starless");
            closeOneWindow(arr[i]+"_extra");
            closeOneWindow(arr[i]+"_extra_starless");
            closeOneWindow(arr[i]+"_extra_stars");
            closeOneWindow(arr[i]+"_extra_combined");
      }
}

function closeTempWindowsForOneImage(id)
{
      closeOneWindow(id + "_max");
      closeOneWindow(id + "_map");
      closeOneWindow(id + "_stars");
      closeOneWindow(id + "_map_mask");
      closeOneWindow(id + "_map_stars");
      closeOneWindow(id + "_map_pm");
      closeOneWindow(id + "_mask");
      closeOneWindow(id + "_tmp");
}

function closeTempWindows()
{
      for (var i = 0; i < integration_LRGB_windows.length; i++) {
            closeTempWindowsForOneImage(integration_LRGB_windows[i]);
            closeTempWindowsForOneImage(integration_LRGB_windows[i] + "_BE");
      }
      for (var i = 0; i < integration_color_windows.length; i++) {
            closeTempWindowsForOneImage(integration_color_windows[i]);
            closeTempWindowsForOneImage(integration_color_windows[i] + "_BE");
      }
}

function findFromArray(arr, id)
{
      for (var i = 0; i < arr.length; i++) {
            if (arr[i] == id) {
                  return true;
            }
      }
      return false;
}

// close all windows created by this script
function closeAllWindows(keep_integrated_imgs, force_close)
{
      closeTempWindows();

      if (keep_integrated_imgs) {
            var isLRGB = false;
            var integration_windows = integration_LRGB_windows;
            if (par.save_processed_channel_images.val ||
                  preprocessed_images == start_images.L_R_G_B_PROCESSED) 
            {
                  integration_windows = integration_windows.concat(integration_processed_channel_windows);
            }
            for (var i = 0; i < integration_windows.length; i++) {
                  if (findWindow(integration_windows[i]) != null) {
                        // we have LRGB images
                        closeAllWindowsFromArray(integration_color_windows);
                        isLRGB = true;
                        break;
                  }
            }
            if (!isLRGB) {
                  // we have color image
                  closeAllWindowsFromArray(integration_windows);
                  integration_windows = integration_color_windows;
            }
            for (var i = 0; i < all_windows.length; i++) {
                  // check that we do not close integration windows
                  if (!findFromArray(integration_windows, all_windows[i])) {
                        closeOneWindow(all_windows[i]);
                  }
            }
      } else {
            closeAllWindowsFromArray(all_windows);
            closeAllWindowsFromArray(integration_LRGB_windows);
            closeAllWindowsFromArray(integration_color_windows);
            closeAllWindowsFromArray(integration_crop_windows);
            closeAllWindowsFromArray(integration_processed_channel_windows);
      }
      closeAllWindowsFromArray(fixed_windows);
      closeAllWindowsFromArray(calibrate_windows);

      use_force_close = force_close;

      closeFinalWindowsFromArray(final_windows);

      use_force_close = true;

      runGC();
}

function getOutputDir(filePath)
{
      var outputDir = outputRootDir;
      if (outputRootDir == "" || pathIsRelative(outputRootDir)) {
            if (filePath != null && filePath != "") {
                  outputDir = parseNewOutputDir(filePath, outputRootDir);
                  console.writeln("getOutputDir, outputDir ", outputDir);
            } else {
                  outputDir = "";
                  console.writeln("outputDir empty filePath");
            }
      }
      return outputDir;
}


function testDirectoryIsWriteable(dir)
{
      var fname = ensurePathEndSlash(dir) + "info.txt";
      var info = directoryInfo.replace(/<br>/g, "\n");
      try {
            let file = new File();
            file.createForWriting(fname);
            file.outTextLn(info);
            file.close();
      } catch (error) {
            console.criticalln(error);
            throwFatalError("Failed to write to directory " + dir);
      }
}

function ensureDir(dir)
{
      // console.writeln("ensureDir " + dir)
      if (dir == "") {
            return;
      }
      var noslashdir = removePathEndSlash(dir);
      noslashdir = removePathEndDot(noslashdir);
      if (!File.directoryExists(noslashdir)) {
            console.writeln("Create directory " + noslashdir);
            File.createDirectory(noslashdir);
            if (!File.directoryExists(noslashdir)) {
                  throwFatalError("Failed to create directory " + noslashdir);
            }
            testDirectoryIsWriteable(noslashdir);
      }
}

function saveLastDir(dirname)
{
      ppar.lastDir = removePathEndSlash(dirname);
      if (!do_not_write_settings) {
            Settings.write(SETTINGSKEY + '/lastDir', DataType_String, ppar.lastDir);
            console.writeln("Save lastDir '" + ppar.lastDir + "'");
      }
}

function combinePath(p1, p2)
{
      if (p1 == "") {
            return "";
      } else {
            return ensurePathEndSlash(p1) + p2;
      }
}

function saveWindowEx(path, id, optional_unique_part, save_id)
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
            throwFatalError("Failed to save image: " + fname);
      }
      return fname;
}

function saveProcessedChannelImage(id, save_id)
{
      if (id == null || !par.save_processed_channel_images.val) {
            return;
      }

      // Replace _map or _map_pm to _processed
      if (save_id) {
            save_id = save_id.replace(/_map.*/g, "_processed");
      } else {
            save_id = id.replace(/_map.*/g, "_processed");
      }
      copyWindow(findWindow(id), save_id);

      processed_channel_images[processed_channel_images.length] = save_id;

      console.writeln("Save processed channel image " + id + " as " + save_id);

      saveProcessedWindow(outputRootDir, save_id);
}

function saveProcessedWindow(path, id)
{
      if (id == null) {
            return null;
      }
      if (path == "") {
            console.criticalln("No output directory, cannot save image "+ id);
            return null;
      }
      var processedPath = combinePath(path, AutoProcessedDir);
      ensureDir(processedPath);
      return saveWindowEx(ensurePathEndSlash(processedPath), id, getOptionalUniqueFilenamePart());
}

function saveMasterWindow(path, id)
{
      if (path == "") {
            throwFatalError("No output directory, cannot save image "+ id);
      }
      var masterDir = combinePath(path, AutoMasterDir);
      ensureDir(outputRootDir);
      ensureDir(masterDir);
      var fname = saveWindowEx(ensurePathEndSlash(masterDir), id, "");
      if (fname == null) {
            throwFatalError("Failed to save work image: " + ensurePathEndSlash(masterDir) + id);
      }
      return fname;
}

function saveFinalImageWindow(win, dir, name, bits)
{
      console.writeln("saveFinalImageWindow " + name);
      var copy_win = copyWindow(win, ensure_win_prefix(name + "_savetmp"));
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
                  save_name = ensurePathEndSlash(dir) + name + new_postfix + getOptionalUniqueFilenamePart() + ".tif";
            } else {
                  // we already have bits added to name
                  save_name = ensurePathEndSlash(dir) + name + getOptionalUniqueFilenamePart() + ".tif";
            }

            if (copy_win.bitsPerSample != bits) {
                  console.writeln("saveFinalImageWindow:set bits to " + bits);
                  copy_win.setSampleFormat(bits, false);
            }
      } else {
            save_name = ensurePathEndSlash(dir) + name + getOptionalUniqueFilenamePart() + ".xisf";
      }
      console.writeln("saveFinalImageWindow:save name " + name);
      // Save image. No format options, no warning messages, 
      // no strict mode, no overwrite checks.
      if (!copy_win.saveAs(save_name, false, false, false, false)) {
            throwFatalError("Failed to save image: " + outputPath);
      }
      forceCloseOneWindow(copy_win);
}

function saveAllFinalImageWindows(bits)
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
            saveLastDir(gdd.directory);
            for (var i = 0; i < finalimages.length; i++) {
                  saveFinalImageWindow(finalimages[i], gdd.directory, finalimages[i].mainView.id, bits);
            }
      }
      console.writeln("All final image windows are saved!");
}

function fatalWindowNameFailed(txt)
{
      console.criticalln(txt);
      console.criticalln("Close old images or use a different window prefix.");
      throwFatalError("Processing stopped");
}

function copyWindowEx(sourceWindow, name, allow_duplicate_name)
{
      if (sourceWindow == null) {
            throwFatalError("Window not found, cannot copy to " + name);
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

      addScriptWindow(name);

      if (targetWindow.mainView.id != name && !allow_duplicate_name) {
            fatalWindowNameFailed("Failed to copy window to name " + name + ", copied window name is " + targetWindow.mainView.id);
      }

      console.writeln("copy window " + sourceWindow.mainView.id + " to " + name);

      return targetWindow;
}

function copyWindow(sourceWindow, name)
{
      return copyWindowEx(sourceWindow, name, false);
}

