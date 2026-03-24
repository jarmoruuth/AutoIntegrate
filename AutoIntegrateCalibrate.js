/*
      AutoIntegrate Calibrate.

      Image calibration functions for AutoIntegrate script.

      Copyright (c) 2018-2026 Jarmo Ruuth.

*/

#ifndef AUTOINTEGRATECALIBRATE_JS
#define AUTOINTEGRATECALIBRATE_JS

class AutoIntegrateCalibrate extends Object
{
      constructor(global, util, flowchart, engine) {
            super();
            this.global = global;
            this.util = util;
            this.flowchart = flowchart;
            this.engine = engine;
            this.par = global.par;
            this.ppar = global.ppar;
      }

/*
 * Image calibration as described in Light Vortex Astronomy.
 */

// Integrate (stack) bias and dark images
runImageIntegrationBiasDarks(images, name, type, exptime)
{
      console.writeln("runImageIntegrationBiasDarks, images[0] " + images[0][1] + ", name " + name);
      var exptimeTxt = (exptime != null && exptime > 0) ? " (" + exptime + "s)" : "";
      var node = this.flowchart.flowchartOperation("ImageIntegration:" + type + exptimeTxt);

      if (this.global.get_flowchart_data) {
            return this.engine.flowchartNewIntegrationImage(images[0][1], name);
      }

      this.engine.ensureThreeImages(images);

      var P = new ImageIntegration;
      P.images = images; // [ enabled, path, drizzlePath, localNormalizationDataPath ];
      P.rejection = this.engine.getRejectionAlgorithm(images.length);
      P.weightMode = ImageIntegration.DontCare;
      P.normalization = ImageIntegration.NoNormalization;
      P.rangeClipLow = false;
      if (this.global.pixinsight_version_num < 1080812) {
            P.evaluateNoise = false;
      } else {
            P.evaluateSNR = false;
      }
      P.subtractPedestals = false;

      P.executeGlobal();

      this.util.closeOneWindowById(P.highRejectionMapImageId);
      this.util.closeOneWindowById(P.lowRejectionMapImageId);
      this.util.closeOneWindowById(P.slopeMapImageId);

      this.engine.printAndSaveProcessValues(P, type);
      this.engine.engine_end_process(node);

      var new_name = this.util.windowRename(P.integrationImageId, name);

      this.engine.setAutoIntegrateVersionIfNeeded(this.util.findWindow(new_name));

      console.writeln("runImageIntegrationBiasDarks, integrated image " + new_name);

      return new_name;
}

// Generate SuperBias from integrated bias image
runSuberBias(biasWin)
{
      console.writeln("runSuberBias, bias " + biasWin.mainView.id);
      var node = this.flowchart.flowchartOperation("Superbias");

      if (this.global.get_flowchart_data) {
            return this.engine.flowchartNewImage(biasWin, this.ppar.win_prefix + "AutoMasterSuperBias");
      }

      var P = new Superbias;

      biasWin.mainView.beginProcess(UndoFlag.NoSwapFile);

      P.executeOn(biasWin.mainView, false);

      biasWin.mainView.endProcess();

      var targetWindow = ImageWindow.activeWindow;

      this.engine.printAndSaveProcessValues(P, "", biasWin.mainView.id);
      this.engine.engine_end_process(node, biasWin, "Superbias", false);

      this.util.windowRenameKeepif(targetWindow.mainView.id, this.ppar.win_prefix + "AutoMasterSuperBias", true);

      return targetWindow.mainView.id
}

/* Group dark file paths by their exposure time.
 * fileNames is an array of file path strings.
 * Returns array of { exptime: <number>, files: [<paths>] }.
 */
groupDarksByExposureTime(fileNames)
{
      var groups = {};
      for (var i = 0; i < fileNames.length; i++) {
            var exptime = this.engine.getExptimeFromFile(fileNames[i]);
            var key = exptime.toString();
            if (!groups[key]) {
                  groups[key] = { exptime: exptime, files: [] };
            }
            groups[key].files.push(fileNames[i]);
      }
      var result = [];
      for (var key in groups) {
            result.push(groups[key]);
      }
      return result;
}

// Group light file-info objects (which already carry .exptime) by exposure time.
// Returns array of { exptime, files[] } similar to groupDarksByExposureTime.
groupLightsByExposureTime(filearr)
{
      var groups = {};
      for (var i = 0; i < filearr.length; i++) {
            var exptime = filearr[i].exptime;
            var key = exptime.toString();
            if (!groups[key]) {
                  groups[key] = { exptime: exptime, files: [] };
            }
            groups[key].files.push(filearr[i]);
      }
      var result = [];
      for (var key in groups) {
            result.push(groups[key]);
      }
      return result;
}

/* Select the best matching master dark for a target exposure time.
 * masterdarkInfoArr may be a single path string, an array of { exptime, path }
 * objects, or null. Returns the best matching path, or null if none available.
 */
selectMasterDarkForExptime(masterdarkInfoArr, targetExptime)
{
      if (masterdarkInfoArr == null) {
            return null;
      }
      if (!Array.isArray(masterdarkInfoArr)) {
            // Single master dark — warn if its exposure time differs too much from the lights.
            var darkExptime = this.engine.getExptimeFromFile(masterdarkInfoArr);
            console.writeln("selectMasterDarkForExptime: single master dark " + masterdarkInfoArr + ", exptime " + darkExptime + "s, targetExptime " + targetExptime + "s");
            if (darkExptime > 0 && Math.abs(darkExptime - targetExptime) > 0.1 * targetExptime) {
                  this.util.addWarningStatus("Warning: Master dark exposure time " + darkExptime + "s does not closely match light exposure time " + targetExptime + "s");
            }
            return masterdarkInfoArr;
      }
      // Find exact or closest match
      var bestIdx = 0;
      var bestDiff = Math.abs(masterdarkInfoArr[0].exptime - targetExptime);
      for (var i = 1; i < masterdarkInfoArr.length; i++) {
            var diff = Math.abs(masterdarkInfoArr[i].exptime - targetExptime);
            if (diff < bestDiff) {
                  bestDiff = diff;
                  bestIdx = i;
            }
      }
      // Report a warning if exposure times differ too much (e.g. more than 10%)
      var bestExptime = masterdarkInfoArr[bestIdx].exptime;
      console.writeln("selectMasterDarkForExptime: best match " + masterdarkInfoArr[bestIdx].path + ", exptime " + bestExptime + "s, targetExptime " + targetExptime + "s");
      if (bestDiff > 0.1 * targetExptime) {
            this.util.addWarningStatus("Warning: No closely matching master dark found for exposure time " + targetExptime + ". Best match is " + bestExptime);
      }
      return masterdarkInfoArr[bestIdx].path;
}

/* Match a master file to images. There can be an array of
 * master files in which case we try find the best match.
 * Images is a list of [enabled, path]
 */
matchMasterToImages(images, masterPath)
{
      if (!Array.isArray(masterPath)) {
            console.writeln("matchMasterToImages, masterPath " + masterPath);
            return masterPath;
      }
      if (masterPath.length == 1) {
            console.writeln("matchMasterToImages, masterPath[0] " + masterPath[0]);
            return masterPath[0];
      }

      /* Try find best match from masterPath for images.
       * Pick first image file as a reference.
       */
      var imageWin = this.util.openImageWindowFromFile(images[0][1]);
      console.writeln("matchMasterToImages, images[0][1] " + images[0][1]);
      console.writeln("matchMasterToImages, imageWin.width " + imageWin.mainView.image.width + ", imageWin.height "+ imageWin.mainView.image.height);

      /* Loop through master files and pick the matching one.
       */
      var matchingMaster = null;
      for (var i = 0; i < masterPath.length; i++) {
            var masterWin = this.util.openImageWindowFromFile(masterPath[i]);
            console.writeln("matchMasterToImages, check masterPath[ " + i + "] " + masterPath[i]);
            console.writeln("matchMasterToImages, masterWin.width " + masterWin.mainView.image.width + ", masterWin.height " + masterWin.mainView.image.height);
            if (masterWin.mainView.image.width == imageWin.mainView.image.width
                && masterWin.mainView.image.height == imageWin.mainView.image.height)
            {
                  /* We have a match. */
                  matchingMaster = masterPath[i];
                  console.writeln("matchMasterToImages, found match " + matchingMaster);
            }
            this.util.closeOneWindow(masterWin);
            if (matchingMaster != null) {
                  break;
            }
      }
      this.util.closeOneWindow(imageWin);

      if (matchingMaster == null) {
            this.util.throwFatalError("***matchMasterToImages Error: Can't find matching master file");
      }

      return matchingMaster;
}

// Run ImageCalibration to darks using master bias image
// Output will be _c.xisf images
runCalibrateDarks(fileNames, masterbiasPath)
{
      if (!this.par.bias_use_on_darks.val) {
            console.noteln("runCalibrateDarks, bias use on darks is disabled");
            return fileNames;
      }
      if (masterbiasPath == null) {
            console.noteln("runCalibrateDarks, no master bias");
            return fileNames;
      }

      console.noteln("runCalibrateDarks, images[0] " + fileNames[0][1] + ", master bias " + masterbiasPath);
      console.writeln("runCalibrateDarks, master bias " + masterbiasPath);
      var node = this.flowchart.flowchartOperation("ImageCalibration:darks");

      if (this.global.get_flowchart_data) {
            return fileNames;
      }

      var P = new ImageCalibration;
      P.targetFrames = this.engine.fileNamesToEnabledPath(fileNames); // [ enabled, path ];
      P.outputPedestalMode = ImageCalibration.OutputPedestal_Auto;
      P.enableCFA = this.engine.is_color_files && this.engine.local_debayer_pattern != 'None';
      P.cfaPattern = this.global.debayerPattern_enums[this.global.debayerPattern_values.indexOf(this.engine.local_debayer_pattern)];
      P.masterBiasEnabled = true;
      P.masterBiasPath = this.matchMasterToImages(P.targetFrames, masterbiasPath);
      P.masterDarkEnabled = false;
      P.masterFlatEnabled = false;
      P.outputDirectory = this.global.outputRootDir + this.global.AutoOutputDir;
      P.overwriteExistingFiles = true;

      P.executeGlobal();

      this.engine.printAndSaveProcessValues(P, "darks");
      this.engine.engine_end_process(node);

      return this.engine.fileNamesFromOutputData(P.outputData);
}

// Run ImageCalibration to flats using master bias and master dark images
// Output will be _c.xisf images
runCalibrateFlats(images, masterbiasPath, masterdarkPath, masterflatdarkPath, filterName)
{
      if (!this.par.use_darks_on_flat_calibrate.val) {
            masterdarkPath = null;
      }
      if (masterbiasPath == null && masterdarkPath == null && masterflatdarkPath == null) {
            console.noteln("runCalibrateFlats, no master bias or dark");
            return this.engine.imagesEnabledPathToFileList(images);
      }

      var txt = "";
      if (masterflatdarkPath != null) {
            txt = this.appendTxtWithComma(txt, "flat darks");
      } else if (masterbiasPath != null) {
            txt = this.appendTxtWithComma(txt, "bias");
      }
      if (masterdarkPath != null && this.par.use_darks_on_flat_calibrate.val && masterflatdarkPath == null) {
            txt = this.appendTxtWithComma(txt, "darks");
      }
      if (txt != "") {
            txt = " (use " + txt + ")";
      }

      console.noteln("runCalibrateFlats, images[0] " + images[0][1]);
      var node = this.flowchart.flowchartOperation("ImageCalibration:flats" + txt);

      if (this.global.get_flowchart_data) {
            return this.engine.imagesEnabledPathToFileList(images);
      }

      var P = new ImageCalibration;
      P.targetFrames = images; // [ // enabled, path ];
      P.outputPedestalMode = ImageCalibration.OutputPedestal_Auto;
      P.enableCFA = this.engine.is_color_files && this.engine.local_debayer_pattern != 'None';
      P.cfaPattern = this.global.debayerPattern_enums[this.global.debayerPattern_values.indexOf(this.engine.local_debayer_pattern)];
      if (masterflatdarkPath != null) {
            console.writeln("runCalibrateFlats, master flat dark " + masterflatdarkPath);
            P.masterBiasEnabled = true;
            P.masterBiasPath = this.matchMasterToImages(images, masterflatdarkPath);
      } else if (masterbiasPath != null) {
            console.writeln("runCalibrateFlats, master bias " + masterbiasPath);
            P.masterBiasEnabled = true;
            P.masterBiasPath = this.matchMasterToImages(images, masterbiasPath);
      } else {
            console.writeln("runCalibrateFlats, no master bias or flat dark");
            P.masterBiasEnabled = false;
            P.masterBiasPath = "";
      }
      if (masterdarkPath != null && this.par.use_darks_on_flat_calibrate.val && masterflatdarkPath == null) {
            console.writeln("runCalibrateFlats, master dark " + masterdarkPath);
            P.masterDarkEnabled = true;
            P.masterDarkPath = this.matchMasterToImages(images, masterdarkPath);
      } else {
            console.writeln("runCalibrateFlats, no master dark");
            P.masterDarkEnabled = false;
            P.masterDarkPath = "";
      }
      P.masterFlatEnabled = false;
      P.masterFlatPath = "";
      P.calibrateBias = false;
      if (this.darkIsBiasCalibrated(masterdarkPath)) {
            P.calibrateDark = false;
      } else {
            P.calibrateDark = true;
      }
      P.outputDirectory = this.global.outputRootDir + this.global.AutoOutputDir;
      P.overwriteExistingFiles = true;

      P.executeGlobal();

      this.engine.printAndSaveProcessValues(P, "flats_" + filterName);
      this.engine.engine_end_process(node);

      return this.engine.fileNamesFromOutputData(P.outputData);
}

// Run image integration on flat frames
// If you have stars in flat frames, set
// P.pcClipLow and P.pcClipHigh to a
// tiny value like 0.010
runImageIntegrationFlats(images, name, filterName)
{
      console.writeln("runImageIntegrationFlats, images[0] " + images[0][1] + ", name " + name);
      var node = this.flowchart.flowchartOperation("ImageIntegration:flats");

      if (this.global.get_flowchart_data) {
            return this.engine.flowchartNewIntegrationImage(images[0][1], name);
      }

      var P = new ImageIntegration;
      // Flats must always use Average combination for a proper master flat;
      // the user's integration_combination setting applies only to light frames.
      P.combination = ImageIntegration.Average;

      P.images = images; // [ enabled, path, drizzlePath, localNormalizationDataPath ];
      P.weightMode = ImageIntegration.DontCare;
      P.normalization = ImageIntegration.MultiplicativeWithScaling;
      P.rejection = ImageIntegration.PercentileClip;
      P.rejectionNormalization = ImageIntegration.EqualizeFluxes;
      if (this.par.stars_in_flats.val) {
            P.pcClipLow = 0.010;
            P.pcClipHigh = 0.010;
      } else {
            P.pcClipLow = 0.200;
            P.pcClipHigh = 0.100;
      }
      P.rangeClipLow = false;
      P.subtractPedestals = false;

      P.executeGlobal();

      this.util.closeOneWindowById(P.highRejectionMapImageId);
      this.util.closeOneWindowById(P.lowRejectionMapImageId);
      this.util.closeOneWindowById(P.slopeMapImageId);

      this.engine.printAndSaveProcessValues(P, "flats_" + filterName);
      this.engine.engine_end_process(node);

      var new_name = this.util.windowRename(P.integrationImageId, name);

      this.engine.setAutoIntegrateVersionIfNeeded(this.util.findWindow(new_name));

      console.writeln("runImageIntegrationFlats, integrated image " + new_name);

      return new_name;
}

appendTxtWithComma(txt, append)
{
      if (txt != "") {
            txt = txt + ", ";
      }
      return txt + append;
}

runCalibrateLights(images, masterbiasPath, masterdarkPath, masterflatPath, filterName, exptime)
{
      if (!this.par.bias_use_on_lights.val) {
            if (masterdarkPath != null && !this.darkIsBiasCalibrated(masterdarkPath)) {
                  // Dark still contains bias signal (not pre-calibrated), so subtracting
                  // the dark from lights naturally cancels the bias — no need to apply
                  // bias separately.
                  console.noteln("runCalibrateLights, master dark has bias (CALSTAT has no B), bias cancels via dark subtraction, ignore master bias");
                  masterbiasPath = null;
            }
            // When the dark had bias subtracted (CALSTAT has B, or pre_calibrate_darks
            // is set), the dark has no bias, so master bias must be applied directly
            // to lights — do not null masterbiasPath.
      }
      if (masterbiasPath == null && masterdarkPath == null && masterflatPath == null) {
            console.noteln("runCalibrateLights, no master bias, dark or flat");
            return this.engine.imagesEnabledPathToFileList(images);
      }

      console.noteln("runCalibrateLights, images[0] " + images[0][1]);

      var txt = "";
      if (masterbiasPath != null) {
            txt = this.appendTxtWithComma(txt, "bias");
      }
      if (masterdarkPath != null) {
            txt = this.appendTxtWithComma(txt, "darks");
      }
      if (masterflatPath != null) {
            txt = this.appendTxtWithComma(txt, "flats");
      }
      if (exptime != null && exptime > 0) {
            txt = this.appendTxtWithComma(txt, exptime + "s");
      }
      if (txt != "") {
            txt = " (" + txt + ")";
      }

      var node = this.flowchart.flowchartOperation("ImageCalibration:lights" + txt);

      if (this.global.get_flowchart_data) {
            return this.engine.imagesEnabledPathToFileList(images);
      }

      var P = new ImageCalibration;
      P.targetFrames = images; // [ enabled, path ];
      P.enableCFA = this.engine.is_color_files && this.engine.local_debayer_pattern != 'None';
      P.cfaPattern = this.global.debayerPattern_enums[this.global.debayerPattern_values.indexOf(this.engine.local_debayer_pattern)];
      if (this.par.auto_output_pedestal.val) {
            console.writeln("runCalibrateLights, auto output pedestal");
            P.outputPedestalMode = ImageCalibration.OutputPedestal_Auto;
      } else {
            console.writeln("runCalibrateLights, literal output pedestal " + this.par.output_pedestal.val);
            P.outputPedestalMode = ImageCalibration.OutputPedestal_Literal;
            P.outputPedestal = this.par.output_pedestal.val;
      }
      if (masterbiasPath != null) {
            console.writeln("runCalibrateLights, master bias " + masterbiasPath);
            P.masterBiasEnabled = true;
            P.masterBiasPath = this.matchMasterToImages(images, masterbiasPath);
      } else {
            console.writeln("runCalibrateLights, no master bias");
            P.masterBiasEnabled = false;
            P.masterBiasPath = "";
      }
      if (masterdarkPath != null) {
            console.writeln("runCalibrateLights, master dark " + masterdarkPath);
            P.masterDarkEnabled = true;
            P.masterDarkPath = this.matchMasterToImages(images, masterdarkPath);
      } else {
            console.writeln("runCalibrateLights, no master dark");
            P.masterDarkEnabled = false;
            P.masterDarkPath = "";
      }
      if (masterflatPath != null) {
            console.writeln("runCalibrateLights, master flat " + masterflatPath);
            P.masterFlatEnabled = true;
            P.masterFlatPath = this.matchMasterToImages(images, masterflatPath);
      } else {
            console.writeln("runCalibrateLights, no master flat");
            P.masterFlatEnabled = false;
            P.masterFlatPath = "";
      }
      if (this.par.optimize_darks.val) {
            P.calibrateBias = false;
            if (this.darkIsBiasCalibrated(masterdarkPath)) {
                  P.calibrateDark = false;
            } else {
                  P.calibrateDark = true;
            }
            P.calibrateFlat = false;
            P.optimizeDarks = true;

      } else {
            P.calibrateBias = false;
            P.calibrateDark = false;
            P.calibrateFlat = false;
            P.optimizeDarks = false;
      }
      P.outputDirectory = this.global.outputRootDir + this.global.AutoCalibratedDir;
      P.overwriteExistingFiles = true;

      P.executeGlobal();

      this.engine.printAndSaveProcessValues(P, "lights_" + filterName);
      this.engine.engine_end_process(node);

      return this.engine.fileNamesFromOutputData(P.outputData);
}

// Returns true if the master dark file had bias subtracted during its creation,
// detected via the CALSTAT FITS keyword ('B' present). Falls back to the
// pre_calibrate_darks parameter when the keyword is absent (e.g. older files).
darkIsBiasCalibrated(darkPath)
{
      if (darkPath == null) {
            return this.par.pre_calibrate_darks.val;
      }
      var keywords = this.engine.getFileKeywords(darkPath);
      for (var i = 0; i < keywords.length; i++) {
            if (keywords[i].name == "CALSTAT") {
                  var calstat = keywords[i].strippedValue.trim().toUpperCase();
                  console.writeln("darkIsBiasCalibrated, CALSTAT=" + calstat + " in " + darkPath);
                  return calstat.indexOf('B') >= 0;
            }
      }
      // No CALSTAT keyword — fall back to user parameter.
      console.writeln("darkIsBiasCalibrated, no CALSTAT in " + darkPath + ", using pre_calibrate_darks=" + this.par.pre_calibrate_darks.val);
      return this.par.pre_calibrate_darks.val;
}

getFileProcessedStatusCalibrated(fileNames, postfix)
{
      return this.engine.getFileProcessedStatusEx(fileNames, postfix, this.global.outputRootDir + this.global.AutoCalibratedDir);
}

getOutputDirFromCalibrationFiles()
{
      // Use the first available calibration file to determine output directory
      var calibFile = null;
      if (this.engine.biasFileNames && this.engine.biasFileNames.length > 0) {
            calibFile = this.engine.biasFileNames[0];
      } else if (this.engine.darkFileNames && this.engine.darkFileNames.length > 0) {
            calibFile = this.engine.darkFileNames[0];
      } else if (this.engine.flatFileNames && this.engine.flatFileNames.length > 0) {
            calibFile = this.engine.flatFileNames[0];
      } else if (this.engine.flatdarkFileNames && this.engine.flatdarkFileNames.length > 0) {
            calibFile = this.engine.flatdarkFileNames[0];
      }
      if (calibFile != null) {
            return this.util.getOutputDir(calibFile);
      }
      return this.global.outputRootDir;
}

/***************************************************************************
 *
 *    this.calibrateEngine
 *
 * Calibration this to run image calibration
 * if bias, dark and/or flat files are selected.
 */
calibrateEngine(filtered_lights)
{
       if (this.engine.biasFileNames == null) {
             this.engine.biasFileNames = [];
       }
       if (this.engine.flatdarkFileNames == null) {
             this.engine.flatdarkFileNames = [];
       }
       if (this.engine.flatFileNames == null) {
             this.engine.flatFileNames = [];
       }
       if (this.engine.darkFileNames == null) {
             this.engine.darkFileNames = [];
       }
       if (this.engine.lightFileNames == null) {
             this.engine.lightFileNames = [];
       }
       if (this.engine.biasFileNames.length == 0
           && this.engine.flatdarkFileNames.length == 0
           && this.engine.flatFileNames.length == 0
           && this.engine.darkFileNames.length == 0)
       {
             // do not calibrate
             this.util.addProcessingStep("calibrateEngine, no bias, flat or dark files");
             return [ this.engine.lightFileNames , '' ];
       }

       this.util.addProcessingStepAndStatusInfo("Image calibration");

       this.util.ensureDir(this.global.outputRootDir);
       this.util.ensureDir(this.util.combinePath(this.global.outputRootDir, this.global.AutoMasterDir));
       this.util.ensureDir(this.util.combinePath(this.global.outputRootDir, this.global.AutoOutputDir));
       if (!this.par.generate_masters_only.val) {
            // When we generate master we still use
            // - AutoOutputDir for temp files
            // - AutoProcessedDir for AutoIntegrate.log
            this.util.ensureDir(this.util.combinePath(this.global.outputRootDir, this.global.AutoCalibratedDir));
       }

       if (this.global.get_flowchart_data) {
            // Filter files for this.global.get_flowchart_data.
            this.engine.flatFileNames = this.engine.flowchartFilterFiles(this.engine.flatFileNames, this.global.pages.FLATS);
            this.engine.flatdarkFileNames = this.engine.flowchartFilterFiles(this.engine.flatdarkFileNames, this.global.pages.FLAT_DARKS);
            // Dark files are not filtered here: the dark integration code calls
            // groupDarksByExposureTime internally, so each exposure group already
            // produces its own this.flowchart operation without further filtering needed.
      }

       // Collect filter files
       var filtered_flats = this.engine.getFilterFiles(this.engine.flatFileNames, this.global.pages.FLATS, '');
       var filtered_flatdarks = this.engine.getFilterFiles(this.engine.flatdarkFileNames, this.global.pages.FLAT_DARKS, '');

       this.engine.is_color_files = filtered_flats.color_files;

       if (this.engine.flatFileNames.length > 0 && this.engine.lightFileNames.length > 0) {
             // we have flats and lights
             // check that filtered files match
             for (var i = 0; i < filtered_flats.allfilesarr.length; i++) {
                   var is_flats = filtered_flats.allfilesarr[i].files.length > 0;
                   var is_lights = filtered_lights.allfilesarr[i].files.length > 0;
                   if (is_lights && !is_flats) {
                         // We need to have flafs for all filters used in lights
                         this.util.throwFatalError("No flats for filter " + filtered_flats.allfilesarr[i].filter + " but we have lights for this filter. Please check that you have flats for all filters used in lights and that the filter information is correct.");
                   }
             }
       }
       if (this.engine.flatFileNames.length > 0 && this.engine.flatdarkFileNames.length > 0) {
            // we have flats and flat darks
            // check that filtered files match
            for (var i = 0; i < filtered_flats.allfilesarr.length; i++) {
                  var is_flats = filtered_flats.allfilesarr[i].files.length > 0;
                  var is_flatdarks = filtered_flatdarks.allfilesarr[i].files.length > 0;
                  if (is_flats != is_flatdarks) {
                        // lights and flats do not match on filters
                        this.util.throwFatalError("Filters on flats and flat darks do not match for filter " + filtered_flats.allfilesarr[i].filter + ". Please check that you have flat darks for all filters used in flats and that the filter information is correct.");
                  }
            }
      }

       /*
        * Bias files
        *
        * Generate a master bias file.
        */
       if (this.par.bias_master_files.val) {
             // We have an array of master bias files, we match them by resolution
             this.util.addProcessingStep("calibrateEngine use existing master bias files " + this.engine.biasFileNames);
             var masterbiasPath = this.engine.biasFileNames;
       } else if (this.engine.biasFileNames.length == 1) {
             this.util.addProcessingStep("calibrateEngine use existing master bias " + this.engine.biasFileNames[0]);
             var masterbiasPath = this.engine.biasFileNames[0];
       } else if (this.engine.biasFileNames.length > 0) {
             this.util.addProcessingStep("calibrateEngine generate master bias using " + this.engine.biasFileNames.length + " files");
             // integrate bias images
             var biasimages = this.engine.filesForImageIntegration(this.engine.biasFileNames);
             var masterbiasid = this.runImageIntegrationBiasDarks(biasimages, this.ppar.win_prefix + "AutoMasterBias", "bias");

             // save master bias
             this.engine.setImagetypKeyword(this.util.findWindow(masterbiasid), "Master bias");
             var masterbiasPath = this.engine.saveMasterWindow(this.global.outputRootDir, masterbiasid);

             // optionally generate superbias
             if (this.par.create_superbias.val) {
                   var masterbiaswin = this.util.findWindow(masterbiasid);
                   var mastersuperbiasid = this.runSuberBias(masterbiaswin);
                   this.engine.setImagetypKeyword(this.util.findWindow(mastersuperbiasid), "Master bias");
                   var masterbiasPath = this.engine.saveMasterWindow(this.global.outputRootDir, mastersuperbiasid);
                   this.engine.guiUpdatePreviewId(mastersuperbiasid);
             } else {
                   this.engine.guiUpdatePreviewId(masterbiasid);
             }
       } else {
             this.util.addProcessingStep("calibrateEngine no master bias");
             var masterbiasPath = null;
       }

       /*
        * Flat dark files
        *
        * Generate a master flat dark file for each filter.
        */
       if (this.engine.flatdarkFileNames.length > 0) {
            // generate master flat dark for each filter
            this.util.addProcessingStep("calibrateEngine generate master flat darks");
            var masterflatdarkPath = [];
            this.flowchart.flowchartParentBegin("Flat darks");
            for (var i = 0; i < filtered_flatdarks.allfilesarr.length; i++) {
                  var filterFiles = filtered_flatdarks.allfilesarr[i].files;
                  var filterName = filtered_flatdarks.allfilesarr[i].filter;
                  this.flowchart.flowchartChildBegin(filterName);
                  if (this.par.flat_dark_master_files.val) {
                        // We have an array of master flat dark files, we match them by resolution
                        this.util.addProcessingStep("calibrateEngine use existing " + filterName + " master flat dark files");
                        masterflatdarkPath[i] = filterFiles.length == 1 ? filterFiles[0].name : filterFiles.map(function(f) { return f.name; });
                  } else if (filterFiles.length == 1) {
                        this.util.addProcessingStep("calibrateEngine use existing " + filterName + " master flat dark " + filterFiles[0].name);
                        masterflatdarkPath[i] = filterFiles[0].name;
                  } else if (filterFiles.length > 0) {
                        // integrate flat darks to generate master flat dark for each filter
                        this.util.addProcessingStep("calibrateEngine create " + filterName + " master flat dark");
                        var flatdarkimages = this.engine.filesForImageIntegrationFromFilearr(filterFiles);
                        console.writeln("flatdarkimages[0] " + flatdarkimages[0][1]);
                        var masterflatdarkid = this.runImageIntegrationBiasDarks(flatdarkimages, this.ppar.win_prefix + "AutoMasterFlatDark_" + filterName, "flatdark");
                        console.writeln("masterflatdarkid " + masterflatdarkid);
                        this.engine.setImagetypKeyword(this.util.findWindow(masterflatdarkid), "Master flat dark");
                        masterflatdarkPath[i] = this.engine.saveMasterWindow(this.global.outputRootDir, masterflatdarkid);
                        this.engine.guiUpdatePreviewId(masterflatdarkid);
                  } else {
                        masterflatdarkPath[i] = null;
                  }
                  this.flowchart.flowchartChildEnd(filterName);
            }
            this.flowchart.flowchartParentEnd("Flat darks");
      } else {
             this.util.addProcessingStep("calibrateEngine no master flat dark");
             var masterflatdarkPath = null;
       }

       /*
        * Dark files
        *
        * Generate master dark file(s). If we have dark files with different exposure times,
        * we generate a master dark for each exposure time group. If we have only one dark file,
        * we use it as master dark file assuming it is already calibrated.
        * If we have master dark files option selected, we use the provided master dark files.
        * If we have only one dark file for each exposure, we use it as master dark file assuming
        * it is already calibrated.
        * If we have multiple dark files, we group them by exposure time and generate a master dark
        * for each exposure time group.
        */
       if (this.par.dark_master_files.val) {
             this.util.addProcessingStep("calibrateEngine use existing master dark files " + this.engine.darkFileNames);
             if (this.engine.darkFileNames.length == 1) {
                   var masterdarkPath = this.engine.darkFileNames[0];
             } else {
                   // Group master darks by exposure time so selectMasterDarkForExptime can match them
                   var darkExptimeGroups = this.groupDarksByExposureTime(this.engine.darkFileNames);
                   if (darkExptimeGroups.length == 1) {
                         // All same exposure time, pass as array for resolution matching
                         var masterdarkPath = this.engine.darkFileNames;
                   } else {
                         // Multiple exposure time groups, build { exptime, path } array
                         var masterdarkPath = [];
                         for (var dg = 0; dg < darkExptimeGroups.length; dg++) {
                               var groupFiles = darkExptimeGroups[dg].files;
                               var groupExptime = darkExptimeGroups[dg].exptime;
                               if (groupFiles.length == 1) {
                                     masterdarkPath.push({ exptime: groupExptime, path: groupFiles[0] });
                               } else {
                                     // Multiple master darks at same exposure, pass array for resolution matching
                                     masterdarkPath.push({ exptime: groupExptime, path: groupFiles });
                               }
                         }
                   }
             }
       } else if (this.engine.darkFileNames.length == 1) {
             this.util.addProcessingStep("calibrateEngine use existing master dark " + this.engine.darkFileNames[0]);
             var masterdarkPath = this.engine.darkFileNames[0];
       } else if (this.engine.darkFileNames.length > 0) {
             // Group dark frames by exposure time
             var darkExptimeGroups = this.groupDarksByExposureTime(this.engine.darkFileNames);
             this.util.addProcessingStep("calibrateEngine generate master dark using " + this.engine.darkFileNames.length + " files in " + darkExptimeGroups.length + " exposure time group(s)");

             if (darkExptimeGroups.length == 1) {
                   // Single exposure time group, create one master dark as before
                   var groupExptime = darkExptimeGroups[0].exptime;
                   var groupName = groupExptime + "s";
                   if (this.par.pre_calibrate_darks.val && masterbiasPath != null) {
                         var darkcalFileNames = this.runCalibrateDarks(darkExptimeGroups[0].files, masterbiasPath);
                         var darkimages = this.engine.filesForImageIntegration(darkcalFileNames);
                   } else {
                         var darkimages = this.engine.filesForImageIntegration(darkExptimeGroups[0].files);
                   }
                   var masterdarkid = this.runImageIntegrationBiasDarks(darkimages, this.ppar.win_prefix + "AutoMasterDark_" + groupName, "dark", groupExptime);
                   let win = this.util.findWindow(masterdarkid);
                   this.util.setFITSKeyword(win, "EXPTIME", groupExptime.toString(), "Exposure time for master dark");
                   this.engine.setImagetypKeyword(win, "Master dark");
                   if (this.par.pre_calibrate_darks.val && masterbiasPath != null) {
                         this.util.setFITSKeyword(win, "CALSTAT", "B", "Calibration status: B=bias subtracted");
                   }
                   var masterdarkPath = this.engine.saveMasterWindow(this.global.outputRootDir, masterdarkid);
                   this.engine.guiUpdatePreviewId(masterdarkid);
             } else {
                   // Multiple exposure time groups, create a master dark for each group
                   var masterdarkPath = []; // array of { exptime, path }
                   this.flowchart.flowchartParentBegin("Darks");
                   for (var dg = 0; dg < darkExptimeGroups.length; dg++) {
                         var groupExptime = darkExptimeGroups[dg].exptime;
                         var groupFiles = darkExptimeGroups[dg].files;
                         var groupName = groupExptime + "s";
                         this.flowchart.flowchartChildBegin(groupName);

                         if (groupFiles.length == 1) {
                               // Single file in group, treat as pre-made master dark
                               this.util.addProcessingStep("calibrateEngine use existing master dark for " + groupName + ": " + groupFiles[0]);
                               masterdarkPath.push({ exptime: groupExptime, path: groupFiles[0] });
                         } else {
                               this.util.addProcessingStep("calibrateEngine create master dark for " + groupName + " using " + groupFiles.length + " files");

                               if (this.par.pre_calibrate_darks.val && masterbiasPath != null) {
                                     var darkcalFileNames = this.runCalibrateDarks(groupFiles, masterbiasPath);
                                     var darkimages = this.engine.filesForImageIntegration(darkcalFileNames);
                               } else {
                                     var darkimages = this.engine.filesForImageIntegration(groupFiles);
                               }
                               var masterdarkid = this.runImageIntegrationBiasDarks(darkimages, this.ppar.win_prefix + "AutoMasterDark_" + groupName, "dark", groupExptime);
                               let win = this.util.findWindow(masterdarkid);
                               this.engine.setImagetypKeyword(win, "Master dark");
                               this.util.setFITSKeyword(win, "EXPTIME", groupExptime.toString(), "Exposure time for master dark");
                               if (this.par.pre_calibrate_darks.val && masterbiasPath != null) {
                                     this.util.setFITSKeyword(win, "CALSTAT", "B", "Calibration status: B=bias subtracted");
                               }
                               var groupMasterPath = this.engine.saveMasterWindow(this.global.outputRootDir, masterdarkid);
                               this.engine.guiUpdatePreviewId(masterdarkid);
                               masterdarkPath.push({ exptime: groupExptime, path: groupMasterPath });
                         }

                         this.flowchart.flowchartChildEnd(groupName);
                   }
                   this.flowchart.flowchartParentEnd("Darks");
             }
       } else {
             this.util.addProcessingStep("calibrateEngine no master dark");
             var masterdarkPath = null;
       }

       /*
        * Flat files
        *
        * Generate master flat files for each filter. If we have master flat files option selected,
        * we use the provided master flat files.
        * If we have only one flat file for each filter, we use it as master flat file assuming
        * it is already calibrated.
        * If we have multiple flat files for a filter, we calibrate them with master bias and/or
        * master dark and/or master flat dark if available and then integrate to generate a master
        * flat for the filter.
        * If we have flat darks, we use them for flat calibration.
        * If we do not have flat darks, we calibrate flats using bias.
        * Optionally, if we have darks but no flat darks, we use master darks for flat calibration. We select the
        * master dark with the closest exposure time to the flat frames.
        */
       this.util.addProcessingStepAndStatusInfo("Image calibration, generate master flats");
       var masterflatPath = [];
       this.flowchart.flowchartParentBegin("Flats");
       for (var i = 0; i < filtered_flats.allfilesarr.length; i++) {
             var filterFiles = filtered_flats.allfilesarr[i].files;
             var filterName = filtered_flats.allfilesarr[i].filter;
             this.flowchart.flowchartChildBegin(filterName);
             if (this.par.flat_master_files.val) {
                  // We have an array of master flat files, we match them by resolution
                   this.util.addProcessingStep("calibrateEngine use existing " + filterName + " master flat files");
                   masterflatPath[i] = filterFiles.length == 1 ? filterFiles[0].name : filterFiles.map(function(f) { return f.name; });
             } else if (filterFiles.length == 1) {
                   this.util.addProcessingStep("calibrateEngine use existing " + filterName + " master flat " + filterFiles[0].name);
                   masterflatPath[i] = filterFiles[0].name;
             } else if (filterFiles.length > 0) {
                   // calibrate flats for each filter with master bias and/or master dark and/or dark flat if available
                   this.util.addProcessingStep("calibrateEngine calibrate " + filterName + " flats using " + filterFiles.length + " files, " + filterFiles[0].name);
                   var flatcalimages = this.engine.fileNamesToEnabledPathFromFilearr(filterFiles);
                   console.writeln("flatcalimages[0] " + flatcalimages[0][1]);
                   var selectedMasterDarkForFlat = null;
                   if (this.par.use_darks_on_flat_calibrate.val) {
                        var flatExptime = filterFiles[0].exptime;
                        selectedMasterDarkForFlat = this.selectMasterDarkForExptime(masterdarkPath, flatExptime);
                        if (selectedMasterDarkForFlat != null) {
                              this.util.addProcessingStep("calibrateEngine selected master dark for flat exptime " + flatExptime + "s: " + selectedMasterDarkForFlat);
                        }
                  }
                   var flatcalFileNames = this.runCalibrateFlats(flatcalimages, masterbiasPath, selectedMasterDarkForFlat, masterflatdarkPath ? masterflatdarkPath[i] : null, filterName);
                   console.writeln("flatcalFileNames[0] " + flatcalFileNames[0]);

                   // integrate flats to generate master flat for each filter
                   var flatimages = this.engine.filesForImageIntegration(flatcalFileNames);
                   console.writeln("flatimages[0] " + flatimages[0][1]);
                   let masterflatid = this.runImageIntegrationFlats(flatimages, this.ppar.win_prefix + "AutoMasterFlat_" + filterName, filterName);
                   console.writeln("masterflatid " + masterflatid);
                   this.engine.setImagetypKeyword(this.util.findWindow(masterflatid), "Master flat");
                   this.engine.setFilterKeyword(this.util.findWindow(masterflatid), filterFiles[0].filter);
                   masterflatPath[i] = this.engine.saveMasterWindow(this.global.outputRootDir, masterflatid);
                   this.engine.guiUpdatePreviewId(masterflatid);
             } else {
                   masterflatPath[i] = null;
             }
             this.flowchart.flowchartChildEnd(filterName);
       }
       this.flowchart.flowchartParentEnd("Flats");

       if (this.par.generate_masters_only.val) {
             this.util.addProcessingStep("calibrateEngine, master calibration files generated");
             this.util.runGarbageCollection();
             return [ [], '' ];
       }

       /*
        * Calibrate light files
        *
        * Calibrate light files with master dark and master flat.
        * Optionally, we can use also master bias for calibration.
        * We calibrate light files for each filter separately using the corresponding master flat for the filter
        * and correcponding exposure time for the master dark.
        */
       this.util.addProcessingStepAndStatusInfo("Image calibration, calibrate light images");
       var calibratedLightFileNames = [];
       this.flowchart.flowchartParentBegin("Calibrate lights");
       for (var i = 0; i < filtered_lights.allfilesarr.length; i++) {
             var filterFiles = filtered_lights.allfilesarr[i].files;
             var filterName = filtered_lights.allfilesarr[i].filter;
             this.flowchart.flowchartChildBegin(filterName);
             if (filterFiles.length > 0) {
                   // Sub-group lights by exposure time so each group gets the
                   // correct master dark when multiple exposure times are present.
                   var lightExptimeGroups = this.groupLightsByExposureTime(filterFiles);
                   for (var lg = 0; lg < lightExptimeGroups.length; lg++) {
                         var lgFiles   = lightExptimeGroups[lg].files;
                         var lgExptime = lightExptimeGroups[lg].exptime;

                         // calibrate light frames with master bias, master dark and master flat
                         // optionally master dark can be left out
                         let fileProcessedStatus = this.getFileProcessedStatusCalibrated(this.engine.fileNamesFromFilearr(lgFiles), '_c');
                         if (fileProcessedStatus.unprocessed.length == 0) {
                               var node = this.flowchart.flowchartOperation("ImageCalibration:lights");
                               calibratedLightFileNames = calibratedLightFileNames.concat(fileProcessedStatus.processed);
                               this.engine.engine_end_process(node);
                         } else {
                               this.util.addProcessingStep("calibrateEngine calibrate " + filterName + " lights for " + fileProcessedStatus.unprocessed.length + " files at " + lgExptime + "s");
                               let lightcalimages = this.engine.fileNamesToEnabledPath(fileProcessedStatus.unprocessed);

                               var selectedMasterDark = this.selectMasterDarkForExptime(masterdarkPath, lgExptime);
                               if (selectedMasterDark != null) {
                                    this.util.addProcessingStep("calibrateEngine selected master dark for light exptime " + lgExptime + "s: " + selectedMasterDark);
                               }
                               let lightcalFileNames = this.runCalibrateLights(lightcalimages, masterbiasPath, selectedMasterDark, masterflatPath[i], filterName, lgExptime);

                               calibratedLightFileNames = calibratedLightFileNames.concat(lightcalFileNames, fileProcessedStatus.processed);
                         }
                   }
             }
             this.flowchart.flowchartChildEnd(filterName);
       }
       this.flowchart.flowchartParentEnd("Calibrate lights");

       // We now have calibrated light images
       // We now proceed with cosmetic correction and
       // after that debayering in case of OSC/RAW files

       console.writeln("calibrateEngine, return calibrated images, calibratedLightFileNames[0] " + calibratedLightFileNames[0]);

       this.util.runGarbageCollection();

       return [ calibratedLightFileNames, '_c' ];
}

} // class AutoIntegrateCalibrate

#endif  // AUTOINTEGRATECALIBRATE_JS
