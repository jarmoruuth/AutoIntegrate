/*
      AutoIntegrate Engine.

Processing this.

Interface functions:

      autointegrateProcessingEngine
      extraProcessingEngine
      autointegrateNarrowbandPaletteBatch
      openImageWindowFromFile
      openImageFiles
      getImagetypFiles
      getFilterFiles
      subframeSelectorMeasure
      runHistogramTransformSTFex
      testRGBNBmapping
      writeProcessingSteps
      closeAllWindows
      getProcessDefaultValues
      ensureDialogFilePath

Copyright (c) 2018-2022 Jarmo Ruuth.

Crop to common area code

      Copyright (c) 2022 Jean-Marc Lugrin.

Window name prefix and icon location code

      Copyright (c) 2021 rob pfile.

PreviewControl module

      Copyright (C) 2013, Andres del Pozo

The following copyright notice is for Linear Defect Detection

   Copyright (c) 2019 Vicent Peris (OAUV). All Rights Reserved.

The following copyright notice is for routines ApplyAutoSTF and applySTF:

   Copyright (c) 2003-2020 Pleiades Astrophoto S.L. All Rights Reserved.

The following condition apply for routines ApplyAutoSTF, applySTF and 
Linear Defect Detection:

   Redistribution and use in both source and binary forms, with or without
   modification, is permitted provided that the following conditions are met:
   
   1. All redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
   
   2. All redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.
   
   3. Neither the names "PixInsight" and "Pleiades Astrophoto", nor the names
      of their contributors, may be used to endorse or promote products derived
      from this software without specific prior written permission. For written
      permission, please contact info@pixinsight.com.
  
   4. All products derived from this software, in any form whatsoever, must
      reproduce the following acknowledgment in the end-user documentation
      and/or other materials provided with the product:
  
      "This product is based on software from the PixInsight project, developed
      by Pleiades Astrophoto and its contributors (https://pixinsight.com/)."
   
      Alternatively, if that is where third-party acknowledgments normally
      appear, this acknowledgment must be reproduced in the product itself.
  
   THIS SOFTWARE IS PROVIDED BY PLEIADES ASTROPHOTO AND ITS CONTRIBUTORS
   "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED
   TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
   PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL PLEIADES ASTROPHOTO OR ITS
   CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
   EXEMPLARY OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, BUSINESS
   INTERRUPTION; PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; AND LOSS OF USE,
   DATA OR PROFITS) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
   CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
   ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
   POSSIBILITY OF SUCH DAMAGE.

This product is based on software from the PixInsight project, developed
by Pleiades Astrophoto and its contributors (https://pixinsight.com/).

*/

function AutoIntegrateEngine(global, util)
{

this.__base__ = Object;
this.__base__();

var autointegrateLDD = new AutoIntegrateLDD(util);

var gui;
var par = global.par;
var ppar = global.ppar;
var engine = this;

/* Set optional GUI object to update GUI components.
 */
this.setGUI = function(aigui) {
      gui = aigui;
}

var ssweight_set = false;
var run_HT = true;
var linear_fit_done = false;
var is_luminance_images = false;    // Do we have luminance files from autocontinue or FITS
var autocontinue_prefix = "";          // prefix used to find base files for autocontinue

var crop_truncate_amount = null;       // used when cropping channel images
var crop_lowClipImageName = null;      // integrated image used to calculate crop_truncate_amount
var crop_lowClipImage_changed = false; // changed flag for saving to disk

var L_images;
var R_images;
var G_images;
var B_images;
var H_images;
var S_images;
var O_images;
var C_images;

var autocontinue_processed_channel_images = {
      lrgb_channels: [ 'L', 'R', 'G', 'B' ],
      narrowband_channels: [ 'H', 'S', 'O' ],
      image_ids: [],
      luminance_id: null,
      rbg: false,
      narrowband: false
};

var narrowband;

var logfname;
var alignedFiles;

/* Variable used during processing images.
 */
var mask_win;
var mask_win_id;
var star_mask_win;
var star_mask_win_id;
var star_fix_mask_win;
var star_fix_mask_win_id;
var RGB_win;
var RGB_win_id;
var is_color_files = false;
var preprocessed_images;
var L_ABE_id;
var L_ABE_HT_win;
var L_ABE_HT_id;
var L_HT_win;
var RGB_ABE_id;

var L_start_win;
var RGB_start_win;

var luminance_id = null;      // These are working images and copies of 
var red_id = null;            // original integrated images
var green_id = null;
var blue_id = null;

var luminance_id_cropped = false;

var L_id;                     // Original integrated images
var R_id;                     // We make copies of these images during processing
var G_id;
var B_id;
var H_id;
var S_id;
var O_id;
var RGB_color_id;              // Integrate RGB from OSC/DSLR data

var RGB_stars_win = null;     // linear combined RGB/narrowband/OSC stars
var RGB_stars_HT_win = null;  // stretched/non-linear RGB stars win
var RGB_stars = [];           // linear RGB channel star image ids

var R_ABE_id = null;
var G_ABE_id = null;
var B_ABE_id = null;
var start_time;
var L_BE_win;
var R_BE_win;
var G_BE_win;
var B_BE_win;
var H_BE_win;
var S_BE_win;
var O_BE_win;
var RGB_BE_win;
var L_HT_win;
var RGB_HT_win;
var range_mask_win;
var final_win;

var retval = {
      ERROR : 0,
      SUCCESS : 1,
      INCOMPLETE: 2
};

var channels = {
      L: 0,
      R: 1,
      G: 2,
      B: 3,
      H: 4,
      S: 5,
      O: 6,
      C: 7
};

function guiSetTreeBoxNodeSsweight(node, filename, ssweight, filename_postfix)
{
      if (gui) {
            gui.setTreeBoxSsweight(node, filename, ssweight, filename_postfix);
      }
}

function guiUpdatePreviewWin(imgWin)
{
      if (gui) {
            gui.updatePreviewWin(imgWin);
      }
}

function guiUpdatePreviewId(id)
{
      if (gui) {
            gui.updatePreviewId(id);
      }
}

function guiUpdatePreviewFilename(filename, stf)
{
      if (gui) {
            gui.updatePreviewFilename(filename, stf);
      }
}

function targetTypeSetup()
{
      if (par.target_type_galaxy.val) {
            par.image_stretching.val = 'Masked Stretch';
            console.writeln("Galaxy target using " + par.image_stretching.val);
      } else if (par.target_type_nebula.val) {
            par.image_stretching.val = 'Auto STF';
            console.writeln("Nebula target using " + par.image_stretching.val);
      }
}

function printImageInfo(images, name)
{
      if (images.images.length == 0) {
            return;
      }
      util.addProcessingStep("* " + name + " " + images.images.length + " data files *");
      util.addProcessingStep(name + " images best ssweight: "+images.best_ssweight);
      util.addProcessingStep(name + " images best image: "+images.best_image);
      util.addProcessingStep(name + " exptime: "+images.exptime);
}

function winIsValid(w)
{
      return w != null;
}

function checkWinFilePath(w)
{
      if (w.filePath) {
            global.outputRootDir = util.getOutputDir(w.filePath);
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

// close all windows from an array
function closeAllWindowsFromArray(arr)
{
      for (var i = 0; i < arr.length; i++) {
            util.closeOneWindow(arr[i]+"_stars");
            util.closeOneWindow(arr[i]);
      }
}

// close all windows created by this script
this.closeAllWindows = function(keep_integrated_imgs, force_close)
{
      util.closeTempWindows();

      if (keep_integrated_imgs) {
            var isLRGB = false;
            var integration_windows = global.integration_LRGB_windows;
            if (par.save_processed_channel_images.val ||
                  preprocessed_images == global.start_images.L_R_G_B_PROCESSED) 
            {
                  integration_windows = integration_windows.concat(global.integration_processed_channel_windows);
            }
            for (var i = 0; i < integration_windows.length; i++) {
                  if (util.findWindow(integration_windows[i]) != null) {
                        // we have LRGB images
                        closeAllWindowsFromArray(global.integration_color_windows);
                        isLRGB = true;
                        break;
                  }
            }
            if (!isLRGB) {
                  // we have color image
                  closeAllWindowsFromArray(integration_windows);
                  integration_windows = global.integration_color_windows;
            }
            for (var i = 0; i < global.all_windows.length; i++) {
                  // check that we do not close integration windows
                  if (!util.findFromArray(integration_windows, global.all_windows[i])) {
                        util.closeOneWindow(global.all_windows[i]);
                  }
            }
      } else {
            closeAllWindowsFromArray(global.all_windows);
            closeAllWindowsFromArray(global.integration_LRGB_windows);
            closeAllWindowsFromArray(global.integration_color_windows);
            closeAllWindowsFromArray(global.integration_crop_windows);
            closeAllWindowsFromArray(global.integration_processed_channel_windows);
      }
      closeAllWindowsFromArray(global.fixed_windows);
      closeAllWindowsFromArray(global.calibrate_windows);

      util.closeFinalWindowsFromArray(global.final_windows, force_close);

      util.runGC();
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
      util.copyWindow(util.findWindow(id), save_id);

      global.processed_channel_images[global.processed_channel_images.length] = save_id;

      console.writeln("Save processed channel image " + id + " as " + save_id);

      saveProcessedWindow(global.outputRootDir, save_id);
}

function saveProcessedWindow(path, id, optional_save_id)
{
      if (id == null) {
            return null;
      }
      if (path == "") {
            console.criticalln("No output directory, cannot save image "+ id);
            return null;
      }
      var processedPath = util.combinePath(path, global.AutoProcessedDir);
      util.ensureDir(processedPath);
      return util.saveWindowEx(util.ensurePathEndSlash(processedPath), id, util.getOptionalUniqueFilenamePart(), optional_save_id);
}

function saveMasterWindow(path, id)
{
      if (path == "") {
            util.throwFatalError("No output directory, cannot save image "+ id);
      }
      var masterDir = util.combinePath(path, global.AutoMasterDir);
      util.ensureDir(global.outputRootDir);
      util.ensureDir(masterDir);
      var fname = util.saveWindowEx(util.ensurePathEndSlash(masterDir), id, "");
      if (fname == null) {
            util.throwFatalError("Failed to save work image: " + util.ensurePathEndSlash(masterDir) + id);
      }
      return fname;
}

function boolToInteger(b)
{
      b == true ? 1 : 0;
}

function checkOptions()
{
      var intval = boolToInteger(par.remove_stars_before_stretch.val) + boolToInteger(par.remove_stars_channel.val) + 
                   boolToInteger(par.remove_stars_stretched.val);
      if (intval > 1) {
            util.throwFatalError("Only one remove stars option can be selected.")
      }
      var intval = boolToInteger(par.target_type_galaxy.val) + boolToInteger(par.target_type_nebula.val);
      if (intval > 1) {
            util.throwFatalError("Only one target type option can be selected.")
      }
}

function setMaskChecked(imgWin, maskWin)
{
      try {
            imgWin.setMask(maskWin);
      } catch(err) {
            console.criticalln("setMask failed: " + err);
            console.criticalln("Maybe mask is from different data set, different image size/binning or different crop to common areas setting.");
            util.throwFatalError("Error setting the mask.");
      }
}

function getProcessingOptions()
{
      var options = [];
      for (let x in par) {
            var param = par[x];
            if (param.val != param.def) {
                  options[options.length] = [ param.name, param.val ];
            }
      }
      return options;
}

function extractHSchannels(sourceWindow)
{
      var P = new ChannelExtraction;
      P.colorSpace = ChannelExtraction.prototype.HSI;
      P.channels = [ // enabled, id
            [true,  ""],       // H
            [false, ""],       // S
            [false, ""]        // I
      ];
      P.sampleFormat = ChannelExtraction.prototype.SameAsSource;

      sourceWindow.mainView.beginProcess(UndoFlag_NoSwapFile);
      P.executeOn(sourceWindow.mainView);
      var hueWindow = ImageWindow.activeWindow;
      sourceWindow.mainView.endProcess();

      var P = new ChannelExtraction;
      P.colorSpace = ChannelExtraction.prototype.HSI;
      P.channels = [ // enabled, id
            [false, ""],       // H
            [true,  ""],       // S
            [false, ""]        // I
      ];
      P.sampleFormat = ChannelExtraction.prototype.SameAsSource;

      sourceWindow.mainView.beginProcess(UndoFlag_NoSwapFile);
      P.executeOn(sourceWindow.mainView);
      var saturationWindow = ImageWindow.activeWindow;
      sourceWindow.mainView.endProcess();

      return [ hueWindow , saturationWindow ];
}

function extractIchannel(sourceWindow)
{
      var P = new ChannelExtraction;
      P.colorSpace = ChannelExtraction.prototype.HSI;
      P.channels = [ // enabled, id
            [false, ""],       // H
            [false, ""],       // S
            [true,  ""]        // I
      ];
      P.sampleFormat = ChannelExtraction.prototype.SameAsSource;

      sourceWindow.mainView.beginProcess(UndoFlag_NoSwapFile);
      P.executeOn(sourceWindow.mainView);
      var intensityWindow = ImageWindow.activeWindow;
      sourceWindow.mainView.endProcess();


      return intensityWindow;
}

function extractLchannel(sourceWindow)
{
      var P = new ChannelExtraction;
      P.colorSpace = ChannelExtraction.prototype.CIELab;
      P.channels = [ // enabled, id
            [true, ""],       // L
            [false, ""],      // a
            [false, ""]       // b
      ];
      P.sampleFormat = ChannelExtraction.prototype.SameAsSource;

      sourceWindow.mainView.beginProcess(UndoFlag_NoSwapFile);
      P.executeOn(sourceWindow.mainView);
      var targetWindow = ImageWindow.activeWindow;
      sourceWindow.mainView.endProcess();

      return targetWindow;
}

function addMildBlur(imgWin)
{
      console.writeln("Add slight blur to image " + imgWin.mainView.id);

      var P = new MultiscaleLinearTransform;
      P.layers = [ // enabled, biasEnabled, bias, noiseReductionEnabled, noiseReductionThreshold, noiseReductionAmount, noiseReductionIterations
            [false, true, 0.000, false, 3.000, 1.00, 1],
            [false, true, 0.000, false, 3.000, 1.00, 1],
            [true, true, 0.000, false, 3.000, 1.00, 1],
            [true, true, 0.000, false, 3.000, 1.00, 1],
            [true, true, 0.000, false, 3.000, 1.00, 1]
      ];

      imgWin.mainView.beginProcess(UndoFlag_NoSwapFile);
      P.executeOn(imgWin.mainView);
      imgWin.mainView.endProcess();
}

function findHistogramPeak(win, channel)
{
      var view = win.mainView;
	var histogramMatrix = view.computeOrFetchProperty("Histogram16");
      var maxcnt = parseInt(histogramMatrix.cols / 255);

      var peakValue = 0;
      var peakCol = 0;
      var cnt = 0;
      var colValue = 0;
      for (var col = 0; col < histogramMatrix.cols; col++) {
            if (channel >= 0) {
                  // get peak for a single channel/row
                  colValue = colValue + histogramMatrix.at(channel, col);
            } else {
                  // combine all channels
                  for (var row = 0; row < histogramMatrix.rows; row++) {
                        colValue = colValue + histogramMatrix.at(row, col);
                  }
            }
            if (cnt < maxcnt) {
                  cnt++;
            } else {
                  if (colValue > peakValue) {
                        peakValue = colValue;
                        peakCol = parseInt(col - maxcnt / 2);
                  }
                  cnt = 0;
                  colValue = 0;
            }
      }
      var normalizedPeakCol = peakCol / histogramMatrix.cols;
      console.writeln(channelText(channel) + " histogram peak is at " + normalizedPeakCol + " (value " + peakValue + ", col "+ peakCol + ", maxcol " + histogramMatrix.cols + ")");
      return { peakValue : peakValue, peakCol : peakCol, maxCol : histogramMatrix.cols, normalizedPeakCol :  normalizedPeakCol, maxRows : histogramMatrix.rows };
}

function countPixels(histogramMatrix, row)
{
      var cnt = 0;
      for (var i = 0; i < histogramMatrix.cols; i++) {
            cnt += histogramMatrix.at(row, i);
      }
      // console.writeln("Pixel count for matrix row " + row + " is " + cnt);
      return cnt;
}

function getClipShadowsValue(win, perc, channel)
{
      // Get image histogram
      var view = win.mainView;
	var histogramMatrix = view.computeOrFetchProperty("Histogram16");

      var pixelCount = 0;
      if (channel >= 0) {
            pixelCount += countPixels(histogramMatrix, channel);
      } else {
            // Count pixels for each row
            for (var i = 0; i < histogramMatrix.rows; i++) {
                  pixelCount += countPixels(histogramMatrix, i);
            }
      }
      // console.writeln("Total pixel count for matrix is " + pixelCount);

      var start_col = 0;
      var maxClip = (perc / 100) * pixelCount;
      console.writeln("Clip max " + maxClip + " pixels (" + perc + "%)");

      // Clip shadows
      var clipCount = 0;
      for (var col = start_col; col < histogramMatrix.cols; col++) {
            var colClipCount = 0;
            if (channel >= 0) {
                  colClipCount += histogramMatrix.at(channel, col)
            } else {
                  for (var row = 0; row < histogramMatrix.rows; row++) {
                        colClipCount += histogramMatrix.at(row, col)
                  }
            }
            clipCount += colClipCount;
            if (clipCount > maxClip && col != 0 && colClipCount > 0) {
                  clipCount = clipCount - colClipCount;
                  break;
            }
      }
      var normalizedShadowClipping = col / histogramMatrix.cols;
      console.writeln(channelText(channel) + " normalized shadow clipping value is " + normalizedShadowClipping + ", clip count " + clipCount);

      return { normalizedShadowClipping : normalizedShadowClipping, rows : histogramMatrix.rows, clipCount : clipCount };
}

function clipShadows(win, perc)
{
      console.writeln("Clip " + perc + "% of shadows from image " + win.mainView.id);

      var view = win.mainView;

      var clip = getClipShadowsValue(win, perc);
      var normalizedShadowClipping = clip.normalizedShadowClipping;

      var P = new HistogramTransformation;
      if (clip.rows == 1) {
            P.H = [ // c0, m, c1, r0, r1
                  [0.00000000, 0.50000000, 1.00000000, 0.00000000, 1.00000000],
                  [0.00000000, 0.50000000, 1.00000000, 0.00000000, 1.00000000],
                  [0.00000000, 0.50000000, 1.00000000, 0.00000000, 1.00000000],
                  [normalizedShadowClipping, 0.50000000, 1.00000000, 0.00000000, 1.00000000],  // luminance
                  [0.00000000, 0.50000000, 1.00000000, 0.00000000, 1.00000000]
            ];
      } else {
            P.H = [ // c0, m, c1, r0, r1
                  [normalizedShadowClipping, 0.50000000, 1.00000000, 0.00000000, 1.00000000],   // R
                  [normalizedShadowClipping, 0.50000000, 1.00000000, 0.00000000, 1.00000000],   // G
                  [normalizedShadowClipping, 0.50000000, 1.00000000, 0.00000000, 1.00000000],   // B
                  [0.00000000, 0.50000000, 1.00000000, 0.00000000, 1.00000000],  // luminance
                  [0.00000000, 0.50000000, 1.00000000, 0.00000000, 1.00000000]
            ];
      }
      view.beginProcess(UndoFlag_NoSwapFile);

      P.executeOn(view, false);

      view.endProcess();
}

function channelText(channel)
{
      switch (channel) {
            case 0:
                  return 'Red';
            case 1:
                  return 'Green';
            case 2:
                  return 'Blue';
            default:
                  return 'Luminance';
      }
}

// Find symmetry point as percentage of clipped pixels
function findSymmetryPoint(win, perc, channel)
{
      console.writeln(channelText(channel) + ", findSymmetryPoint at " + perc + "% of shadows from image " + win.mainView.id);

      // Get image histogram
      var view = win.mainView;
	var histogramMatrix = view.computeOrFetchProperty("Histogram16");

      var pixelCount = 0;
      if (channel >= 0) {
            pixelCount += countPixels(histogramMatrix, channel);
      } else {
            // Count pixels for each row
            for (var i = 0; i < histogramMatrix.rows; i++) {
                  pixelCount += countPixels(histogramMatrix, i);
            }
      }

      var maxClip = (perc / 100) * pixelCount;

      // Find symmetry point as percentage of pixels on the left side of the histogram
      var clipCount = 0;
      for (var col = 0; col < histogramMatrix.cols; col++) {
            if (channel >= 0) {
                  clipCount += histogramMatrix.at(channel, col)
            } else {
                  for (var row = 0; row < histogramMatrix.rows; row++) {
                        clipCount += histogramMatrix.at(row, col);
                  }
            }
            if (clipCount > maxClip) {
                  break;
            }
      }
      if (col > 0) {
            col = col - 1;
      }
      var normalizedShadowClipping = col / histogramMatrix.cols;
      console.writeln(channelText(channel) + " symmetry point is " + normalizedShadowClipping);

      return normalizedShadowClipping;
}

function newMaskWindow(sourceWindow, name, allow_duplicate_name)
{
      var targetWindow;

      if (sourceWindow.mainView.image.colorSpace != ColorSpace_Gray) {
            /* If we have color files we extract lightness component and
               use it as a mask.
            */
            util.addProcessingStepAndStatusInfo("Create mask by extracting lightness component from color image " + sourceWindow.mainView.id);

            targetWindow = extractLchannel(sourceWindow);

            if (par.force_new_mask.val) {
                  util.closeOneWindow(name);
            }
      
            util.windowRenameKeepifEx(targetWindow.mainView.id, name, true, allow_duplicate_name);
      } else {
            /* Default mask is the same as stretched image. */
            util.addProcessingStepAndStatusInfo("Create mask from image " + sourceWindow.mainView.id);
            targetWindow = util.copyWindowEx(sourceWindow, name, allow_duplicate_name);
      }

      // addMildBlur(targetWindow); Not sure if this actually helps

      targetWindow.show();

      if (!par.skip_mask_contrast.val) {
            //clipShadows(targetWindow, 1.0);   Not sure if this actually helps
            extraContrast(targetWindow);
      }

      return targetWindow;
}

function maskIsCompatible(imgWin, maskWin)
{
      if (maskWin == null) {
            return null;
      }
      try {
            imgWin.setMask(maskWin);
            imgWin.removeMask();
      } catch(err) {
            maskWin = null;
      }
      return maskWin;
}

function treeboxfilesToFilenames(treeboxfiles)
{
      var filenames = [];
      for (var i = 0; i < treeboxfiles.length; i++) {
            if (treeboxfiles[i][1]) {
                  // checked
                  filenames[filenames.length] = treeboxfiles[i][0];
            }
      }
      return filenames;
}

/* openImageFiles

Function to open image files, or Json file.      

*/
this.openImageFiles = function(filetype, lights_only, json_only)
{
      var ofd = new OpenFileDialog;

      ofd.multipleSelections = true;
      if (json_only) {
            ofd.caption = "Select " + filetype + " File";
      } else {
            ofd.caption = "Select " + filetype + " Images, or Json File";
      }
      var fits_files = "*.fit *.fits *.fts";
      var raw_files = "*.3fr *.ari *.arw *.bay *.braw *.crw *.cr2 *.cr3 *.cap *.data *.dcs *.dcr *.dng " +
                      "*.drf *.eip *.erf *.fff *.gpr *.iiq *.k25 *.kdc *.mdc *.mef *.mos *.mrw *.nef *.nrw *.obm *.orf " +
                      "*.pef *.ptx *.pxn *.r3d *.raf *.raw *.rwl *.rw2 *.rwz *.sr2 *.srf *.srw *.tif *.x3f *.xisf";
      var image_files = fits_files + " " + raw_files;

      if (json_only) {
            ofd.filters = [
                  ["Json files", "*.json"],
                  ["All files", "*.*"]
            ];
      } else if (!par.select_all_files.val) {
            ofd.filters = [
                  ["Image files", image_files],
                  ["Json files", "*.json"],
                  ["All files", "*.*"]
            ];
      } else {
            ofd.filters = [
                  ["All files", "*.*"],
                  ["Json files", "*.json"],
                  ["Image files", image_files]
            ];
      }
      if (!ofd.execute()) {
            return null;
      }

      if (ofd.fileNames.length < 1) {
            return null;
      }
      util.saveLastDir(File.extractDrive(ofd.fileNames[0]) + File.extractDirectory(ofd.fileNames[0]));
      if (json_only) {
            // accept any single file selected
            if (ofd.fileNames.length != 1)  {
                  console.criticalln("Only one Json file can be loaded");
                  return null;
            }
            var is_json_file = true;
      } else {
            var is_json_file = (ofd.fileNames.length == 1 && File.extractExtension(ofd.fileNames[0]) == ".json");
      }
      if (is_json_file) {
            /* Read files from a json file.
             * If lights_only, return a simple file array of light files
             * If not lights_only, return treebox files for each page
             */
            var pagearray = util.readJsonFile(ofd.fileNames[0], lights_only);
            if (lights_only) {
                  if (pagearray[global.pages.LIGHTS] == null) {
                        return null;
                  } else {
                        return treeboxfilesToFilenames(pagearray[global.pages.LIGHTS].files);
                  }
            } else {
                  return pagearray;
            }
      } else if (!lights_only) {
            /* Returns a simple file array as the only array member
             */
            return [ ofd.fileNames ];
      } else {
            // return a simple file array
            return ofd.fileNames;
      }
}

function findMin(arr, idx)
{
      var minval = arr[0][idx];
      for (var i = 1; i < arr.length; i++) {
            if (arr[i][idx] < minval) {
                  minval = arr[i][idx];
            }
      }
      return minval;
}

function findMax(arr, idx)
{
      var maxval = arr[0][idx];
      for (var i = 1; i < arr.length; i++) {
            if (arr[i][idx] > maxval) {
                  maxval = arr[i][idx];
            }
      }
      return maxval;
}

function updateBinningKeywords(imageWindow, binning_size)
{
      var newKeywords = [];
      var keywords = imageWindow.keywords;
      for (var i = 0; i < keywords.length; i++) {
            var keyword = keywords[i];
            if (keyword.name == 'NAXIS1' 
                || keyword.name == 'NAXIS2'
                || keyword.name == 'IMAGEW'
                || keyword.name == 'IMAGEH')
            {
                  var value = keyword.strippedValue.trim();
                  var naxis = parseInt(value);
                  var new_naxis = naxis / binning_size;
                  newKeywords[newKeywords.length] = new FITSKeyword(
                                                            keyword.name,
                                                            new_naxis.toFixed(0),
                                                            "");
            } else {
                  newKeywords[newKeywords.length] = keyword;
            }
      }
      imageWindow.keywords = newKeywords;
}

// Running PixelMath removes all keywords
// We make a copy of selected keywords that are
// put back to PixelMath generated image
function getTargetFITSKeywordsForPixelmath(imageWindow)
{
      var oldKeywords = [];
      var keywords = imageWindow.keywords;
      for (var i = 0; i < keywords.length; i++) {
            var keyword = keywords[i];
            if (keyword.name != 'FILTER'
                && keyword.name != 'COMMENT'
                && keyword.name != 'HISTORY') 
            {
                  oldKeywords[oldKeywords.length] = keyword;
            }
      }
      return oldKeywords;
}

// put keywords to PixelMath generated image
function setTargetFITSKeywordsForPixelmath(imageWindow, keywords)
{
      imageWindow.keywords = keywords;
}

function setSSWEIGHTkeyword(imageWindow, SSWEIGHT) 
{
      var oldKeywords = util.filterKeywords(imageWindow, "SSWEIGHT");
      imageWindow.keywords = oldKeywords.concat([
         new FITSKeyword(
            "SSWEIGHT",
            SSWEIGHT.toFixed(5),
            "Image weight"
         )
      ]);
      ssweight_set = true;
}

function setFinalImageKeyword(imageWindow) 
{
      console.writeln("setFinalImageKeyword to " + imageWindow.mainView.id);
      util.setFITSKeyword(
            imageWindow,
            "AutoIntegrate",
            "finalimage",
            "AutoIntegrate processed final image");
}

function setImagetypKeyword(imageWindow, imagetype) 
{
      util.setFITSKeyword(
            imageWindow,
            "IMAGETYP",
            imagetype,
            "Type of image");
}

function setFilterKeyword(imageWindow, value) 
{
      util.setFITSKeyword(
            imageWindow,
            "FILTER",
            value,
            "Filter used when taking the image");
}

function writeImage(filePath, imageWindow) 
{
      var fileFormat = new FileFormat("XISF", false, true);
      if (fileFormat.isNull) {
            console.writeln("writeImage:FileFormat failed");
            return false;
      }
   
      var fileFormatInstance = new FileFormatInstance(fileFormat);
      if (fileFormatInstance.isNull) {
            console.writeln("writeImage:FileFormatInstance failed");
            return false;
      }
   
      if (!fileFormatInstance.create(filePath, "")) {
            console.writeln("writeImage:fileFormatInstance.create failed");
            return false;
      }
   
      fileFormatInstance.keywords = imageWindow.keywords;
      if (!fileFormatInstance.writeImage(imageWindow.mainView.image)) {
            console.writeln("writeImage:fileFormatInstance.writeImage failed");
            return false;
      }
   
      fileFormatInstance.close();
   
      return true;
}

/* 
 * Image calibration as described in Light Vortex Astronomy.
 */

// Integrate (stack) bias and dark images
function runImageIntegrationBiasDarks(images, name)
{
      console.writeln("runImageIntegrationBiasDarks, images[0] " + images[0][1] + ", name " + name);

      ensureThreeImages(images);

      var P = new ImageIntegration;
      P.images = images; // [ enabled, path, drizzlePath, localNormalizationDataPath ];
      P.rejection = getRejectionAlgorithm(images.length);
      P.weightMode = ImageIntegration.prototype.DontCare;
      P.normalization = ImageIntegration.prototype.NoNormalization;
      P.rangeClipLow = false;
      if (global.pixinsight_version_num < 1080812) {
            P.evaluateNoise = false;
      } else {
            P.evaluateSNR = false;
      }

      P.executeGlobal();

      util.closeOneWindow(P.highRejectionMapImageId);
      util.closeOneWindow(P.lowRejectionMapImageId);
      util.closeOneWindow(P.slopeMapImageId);

      var new_name = util.windowRename(P.integrationImageId, name);

      console.writeln("runImageIntegrationBiasDarks, integrated image " + new_name);

      return new_name;
}

// Generate SuperBias from integrated bias image
function runSuberBias(biasWin)
{
      console.writeln("runSuberBias, bias " + biasWin.mainView.id);

      var P = new Superbias;

      biasWin.mainView.beginProcess(UndoFlag_NoSwapFile);

      P.executeOn(biasWin.mainView, false);

      biasWin.mainView.endProcess();

      var targetWindow = ImageWindow.activeWindow;

      util.windowRenameKeepif(targetWindow.mainView.id, ppar.win_prefix + "AutoMasterSuperBias", true);

      return targetWindow.mainView.id
}

/* Open a file as image window. */
this.openImageWindowFromFile = function(fileName)
{
      var imageWindows = ImageWindow.open(fileName);
      if (imageWindows.length != 1) {
            util.throwFatalError("*** openImageWindowFromFile Error: imageWindows.length: " + imageWindows.length + ", file " + fileName);
      }
      var imageWindow = imageWindows[0];
      if (imageWindow == null) {
            util.throwFatalError("*** openImageWindowFromFile Error: Can't read file: " + fileName);
      }
      return imageWindow;
}

/* Match a master file to images. There can be an array of
 * master files in which case we try find the best match.
 * Images is a list of [enabled, path]
 */
function matchMasterToImages(images, masterPath)
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
      var imageWin = engine.openImageWindowFromFile(images[0][1]);
      console.writeln("matchMasterToImages, images[0][1] " + images[0][1]);
      console.writeln("matchMasterToImages, imageWin.width " + imageWin.mainView.image.width + ", imageWin.height "+ imageWin.mainView.image.height);

      /* Loop through master files and pick the matching one.
       */
      var matchingMaster = null;
      for (var i = 0; i < masterPath.length; i++) {
            var masterWin = engine.openImageWindowFromFile(masterPath[i]);
            console.writeln("matchMasterToImages, check masterPath[ " + i + "] " + masterPath[i]);
            console.writeln("matchMasterToImages, masterWin.width " + masterWin.mainView.image.width + ", masterWin.height " + masterWin.mainView.image.height);
            if (masterWin.mainView.image.width == imageWin.mainView.image.width 
                && masterWin.mainView.image.height == imageWin.mainView.image.height)
            {
                  /* We have a match. */
                  matchingMaster = masterPath[i];
                  console.writeln("matchMasterToImages, found match " + matchingMaster);
            }
            util.forceCloseOneWindow(masterWin);
            if (matchingMaster != null) {
                  break;
            }
      }
      util.forceCloseOneWindow(imageWin);

      if (matchingMaster == null) {
            util.throwFatalError("*** matchMasterToImages Error: Can't find matching master file");
      }

      return matchingMaster;
}

// Run ImageCalibration to darks using master bias image
// Output will be _c.xisf images
function runCalibrateDarks(fileNames, masterbiasPath)
{
      if (masterbiasPath == null) {
            console.noteln("runCalibrateDarks, no master bias");
            return fileNames;
      }

      console.noteln("runCalibrateDarks, images[0] " + fileNames[0][1] + ", master bias " + masterbiasPath);
      console.writeln("runCalibrateDarks, master bias " + masterbiasPath);

      var P = new ImageCalibration;
      P.targetFrames = fileNamesToEnabledPath(fileNames); // [ enabled, path ];
      P.enableCFA = is_color_files && par.debayer_pattern.val != 'None';
      P.cfaPattern = global.debayerPattern_enums[global.debayerPattern_values.indexOf(par.debayer_pattern.val)];
      P.masterBiasEnabled = true;
      P.masterBiasPath = matchMasterToImages(P.targetFrames, masterbiasPath);
      P.masterDarkEnabled = false;
      P.masterFlatEnabled = false;
      P.outputDirectory = global.outputRootDir + global.AutoOutputDir;
      P.overwriteExistingFiles = true;

      P.executeGlobal();

      return fileNamesFromOutputData(P.outputData);
}

// Run ImageCalibration to flats using master bias and master dark images
// Output will be _c.xisf images
function runCalibrateFlats(images, masterbiasPath, masterdarkPath, masterflatdarkPath)
{
      if (masterbiasPath == null && masterdarkPath == null && masterflatdarkPath == null) {
            console.noteln("runCalibrateFlats, no master bias or dark");
            return imagesEnabledPathToFileList(images);
      }

      console.noteln("runCalibrateFlats, images[0] " + images[0][1]);

      var P = new ImageCalibration;
      P.targetFrames = images; // [ // enabled, path ];
      P.enableCFA = is_color_files && par.debayer_pattern.val != 'None';
      P.cfaPattern = global.debayerPattern_enums[global.debayerPattern_values.indexOf(par.debayer_pattern.val)];
      if (masterflatdarkPath != null) {
            console.writeln("runCalibrateFlats, master flat dark " + masterflatdarkPath);
            P.masterBiasEnabled = true;
            P.masterBiasPath = matchMasterToImages(images, masterflatdarkPath);
      } else if (masterbiasPath != null) {
            console.writeln("runCalibrateFlats, master bias " + masterbiasPath);
            P.masterBiasEnabled = true;
            P.masterBiasPath = matchMasterToImages(images, masterbiasPath);
      } else {
            console.writeln("runCalibrateFlats, no master bias or flat dark");
            P.masterBiasEnabled = false;
            P.masterBiasPath = "";
      }
      if (masterdarkPath != null && !par.no_darks_on_flat_calibrate.val && masterflatdarkPath == null) {
            console.writeln("runCalibrateFlats, master dark " + masterdarkPath);
            P.masterDarkEnabled = true;
            P.masterDarkPath = matchMasterToImages(images, masterdarkPath);
      } else {
            console.writeln("runCalibrateFlats, no master dark");
            P.masterDarkEnabled = false;
            P.masterDarkPath = "";
      }
      P.masterFlatEnabled = false;
      P.masterFlatPath = "";
      P.calibrateBias = false;
      if (par.pre_calibrate_darks.val) {
            P.calibrateDark = false;
      } else {
            P.calibrateDark = true;
      }
      P.outputDirectory = global.outputRootDir + global.AutoOutputDir;
      P.overwriteExistingFiles = true;

      P.executeGlobal();

      return fileNamesFromOutputData(P.outputData);
}

// Run image integration on flat frames
// If you have stars in flat frames, set
// P.pcClipLow and P.pcClipHigh to a 
// tiny value like 0.010
function runImageIntegrationFlats(images, name)
{
      console.writeln("runImageIntegrationFlats, images[0] " + images[0][1] + ", name " + name);

      var P = new ImageIntegration;
      P.images = images; // [ enabled, path, drizzlePath, localNormalizationDataPath ];
      P.weightMode = ImageIntegration.prototype.DontCare;
      P.normalization = ImageIntegration.prototype.MultiplicativeWithScaling;
      P.rejection = ImageIntegration.prototype.PercentileClip;
      P.rejectionNormalization = ImageIntegration.prototype.EqualizeFluxes;
      if (par.stars_in_flats.val) {
            P.pcClipLow = 0.010;
            P.pcClipHigh = 0.010;
      } else {
            P.pcClipLow = 0.200;
            P.pcClipHigh = 0.100;
      }
      P.rangeClipLow = false;

      P.executeGlobal();

      util.closeOneWindow(P.highRejectionMapImageId);
      util.closeOneWindow(P.lowRejectionMapImageId);
      util.closeOneWindow(P.slopeMapImageId);

      var new_name = util.windowRename(P.integrationImageId, name);

      console.writeln("runImageIntegrationFlats, integrated image " + new_name);

      return new_name;
}

function runCalibrateLights(images, masterbiasPath, masterdarkPath, masterflatPath)
{
      if (masterbiasPath == null && masterdarkPath == null && masterflatPath == null) {
            console.noteln("runCalibrateLights, no master bias, dark or flat");
            return imagesEnabledPathToFileList(images);
      }

      console.noteln("runCalibrateLights, images[0] " + images[0][1]);

      var P = new ImageCalibration;
      P.targetFrames = images; // [ enabled, path ];
      P.enableCFA = is_color_files && par.debayer_pattern.val != 'None';
      P.cfaPattern = global.debayerPattern_enums[global.debayerPattern_values.indexOf(par.debayer_pattern.val)];
      if (masterbiasPath != null) {
            console.writeln("runCalibrateLights, master bias " + masterbiasPath);
            P.masterBiasEnabled = true;
            P.masterBiasPath = matchMasterToImages(images, masterbiasPath);
      } else {
            console.writeln("runCalibrateLights, no master bias");
            P.masterBiasEnabled = false;
            P.masterBiasPath = "";
      }
      if (masterdarkPath != null) {
            console.writeln("runCalibrateLights, master dark " + masterdarkPath);
            P.masterDarkEnabled = true;
            P.masterDarkPath = matchMasterToImages(images, masterdarkPath);
      } else {
            console.writeln("runCalibrateLights, no master dark");
            P.masterDarkEnabled = false;
            P.masterDarkPath = "";
      }
      if (masterflatPath != null) {
            console.writeln("runCalibrateLights, master flat " + masterflatPath);
            P.masterFlatEnabled = true;
            P.masterFlatPath = masterflatPath;
      } else {
            console.writeln("runCalibrateLights, no master flat");
            P.masterFlatEnabled = false;
            P.masterFlatPath = "";
      }
      if (par.optimize_darks.val) {
            P.calibrateBias = false;
            if (par.pre_calibrate_darks.val) {
                  P.calibrateDark = false;
            } else {
                  P.calibrateDark = true;
            }
            P.calibrateFlat = false;
            P.optimizeDarks = true;

      } else {
            P.masterBiasEnabled = false;
            P.masterBiasPath = "";

            P.calibrateBias = false;
            P.calibrateDark = false;
            P.calibrateFlat = false;
            P.optimizeDarks = false;
      }
      P.outputDirectory = global.outputRootDir + global.AutoCalibratedDir;
      P.overwriteExistingFiles = true;

      P.executeGlobal();

      return fileNamesFromOutputData(P.outputData);
}

function filesForImageIntegration(fileNames)
{
      var images = [];
      for (var i = 0; i < fileNames.length; i++) {
            images[images.length] = [ true, fileNames[i] ]; // [ enabled, path, drizzlePath, localNormalizationDataPath ];
      }
      return images;
}

function fileNamesToEnabledPath(fileNames)
{
      var images = [];
      for (var i = 0; i < fileNames.length; i++) {
            images[images.length] = [ true, fileNames[i] ]; // [ enabled, path ];
      }
      return images;
}

function fileNamesToEnabledPathFromFilearr(filearr)
{
      var images = [];
      for (var i = 0; i < filearr.length; i++) {
            images[images.length] = [ true, filearr[i].name ]; // [ enabled, path ];
      }
      return images;
}

function fileNamesFromFilearr(filearr)
{
      var fileNames = [];
      for (var i = 0; i < filearr.length; i++) {
            fileNames[fileNames.length] = filearr[i].name;
      }
      return fileNames;
}

function imagesEnabledPathToFileList(images)
{
      var fileNames = [];
      for (var i = 0; i < images.length; i++) {
            fileNames[fileNames.length] = images[i][1];
      }
      return fileNames;
}


// Group files based on telescope and resolution
function getLDDgroups(fileNames)
{
      console.writeln("getLDDgroups");
      var groups = [];
      for (var i = 0; i < fileNames.length; i++) {
            var keywords = getFileKeywords(fileNames[i]);
            var groupname = "";
            var naxis1 = 0;
            for (var j = 0; j < keywords.length; j++) {
                  var value = keywords[j].strippedValue.trim();
                  switch (keywords[j].name) {
                        case "TELESCOP":
                              console.writeln("telescop=" + value);
                              groupname = groupname + value;
                              break;
                        case "NAXIS1":
                              console.writeln("naxis1=" + value);
                              groupname = groupname + value;
                              naxis1 = parseInt(value);
                              break;
                        default:
                              break;
                  }
            }
            for (var j = 0; j < groups.length; j++) {
                  if (groups[j].name == groupname) {
                        // found, add to existing group
                        groups[j].groupfiles[groups[j].groupfiles.length] = fileNames[i];
                        break;
                  }
            }
            if (j == groups.length) {
                  // not found, add a new group
                  console.writeln("getLDDgroups, add a new group " + groupname);
                  groups[groups.length] = { name: groupname, groupfiles: [ fileNames[i] ]};
            }
      }
      console.writeln("getLDDgroups found " + groups.length + " groups");
      return groups;
}

// Get row or col defect information
function getDefects(LDD_win, detectColumns)
{
      if (detectColumns) {
            console.writeln("getDefects, column defects");
      } else {
            console.writeln("getDefects, row defects");
      }

      var detectPartialLines = true;
      var layersToRemove = 9;
      var rejectionLimit = 3;
      var detectionThreshold = 5;
      var partialLineDetectionThreshold = 5;
      var imageShift = 50;

      // detect line defects
      var detectedLines = new autointegrateLDD.LDDEngine( LDD_win, detectColumns, detectPartialLines,
                                                          layersToRemove, rejectionLimit, imageShift,
                                                          detectionThreshold, partialLineDetectionThreshold );
      // Generate output for cosmetic correction
      console.writeln("getDefects, LDDOutput");
      var defects = autointegrateLDD.LDDOutput( detectColumns, detectedLines, detectionThreshold );

      return defects;
}

// Run ImageIntegration and then get row/col defects
function getDefectInfo(fileNames)
{
      console.writeln("getDefectInfo, fileNames[0]=" + fileNames[0]);
      var LDD_images = init_images();
      for (var i = 0; i < fileNames.length; i++) {
            append_image_for_integrate(LDD_images.images, fileNames[i]);
      }
      // Run image integration as-is to make line defects more visible
      console.writeln("getDefectInfo, runImageIntegration");
      var LDD_id = runImageIntegration(LDD_images, "LDD");
      var LDD_win = util.findWindow(LDD_id);
      var defects = [];

      if (par.fix_column_defects.val) {
            console.writeln("getDefectInfo, par.fix_column_defects.val");
            var colDefects = getDefects(LDD_win, true);
            defects = defects.concat(colDefects);
      }
      if (par.fix_row_defects.val) {
            console.writeln("getDefectInfo, par.fix_row_defects.val");
            var rowDefects = getDefects(LDD_win, false);
            defects = defects.concat(rowDefects);
      }

      util.closeOneWindow(LDD_id);

      return { ccFileNames: fileNames, ccDefects: defects };
}

function runLinearDefectDetection(fileNames)
{
      util.addProcessingStepAndStatusInfo("Run Linear Defect Detection");
      console.writeln("runLinearDefectDetection, fileNames[0]=" + fileNames[0]);
      var ccInfo = [];

      // Group images by telescope and resolution
      var LDD_groups = getLDDgroups(fileNames);

      if (LDD_groups.length > 4) {
            util.throwFatalError("too many LDD groups: " + LDD_groups.length);
      }

      // For each group, generate own defect information
      for (var i = 0; i < LDD_groups.length; i++) {
            console.writeln("runLinearDefectDetection, group " + i);
            if (par.use_processed_files.val) {
                  for (var j = 0; j < global.LDDDefectInfo.length; j++) {
                        if (global.LDDDefectInfo[j].groupname == LDD_groups[i].groupname) {
                              // found existing defect info
                              console.writeln("Use existing defect info " + global.LDDDefectInfo[j].groupname);
                              break;
                        }
                  }
            }
            if (!par.use_processed_files.val || j == global.LDDDefectInfo.length) {
                  // generate new defect info
                  var ccGroupInfo = getDefectInfo(LDD_groups[i].groupfiles);
                  global.LDDDefectInfo[global.LDDDefectInfo.length] = { groupname: LDD_groups[i].groupname, defects: ccGroupInfo.ccDefects }
            } else {
                  // use existing defect info
                  var ccGroupInfo = { ccFileNames: LDD_groups[i].groupfiles, ccDefects: global.LDDDefectInfo[j].defects };
            }
            ccInfo[ccInfo.length] = ccGroupInfo;
      }

      return ccInfo;
}

function generateNewFileName(fileName, outputdir, postfix, extension)
{
      return util.ensurePathEndSlash(outputdir) + File.extractName(fileName) + postfix + extension;
}

function generateNewFileNames(oldFileNames, outputdir, postfix, extension)
{
      var newFileNames = [];

      console.writeln("generateNewFileNames, old " + oldFileNames[0]);

      for (var i = 0; i < oldFileNames.length; i++) {
            newFileNames[i] = generateNewFileName(oldFileNames[i], outputdir, postfix, extension);
      }

      console.writeln("generateNewFileNames, new " + newFileNames[0]);
      return newFileNames;
}

function isLuminanceFile(filtered_files, filePath)
{
      var Lfiles = filtered_files.allfilesarr[channels.L].files;
      for (var i = 0; i < Lfiles.length; i++) {
            if (Lfiles[i].name == filePath) {
                  return true;
            }
      }
      return false;
}

function getBinningPostfix()
{
      return '_b' + par.binning_resample.val;
}

function runBinningOnLights(fileNames, filtered_files)
{
      var newFileNames = [];
      var outputDir = global.outputRootDir + global.AutoOutputDir;
      var postfix = getBinningPostfix();
      var outputExtension = ".xisf";
 
      util.addStatusInfo("Do " + par.binning_resample.val + "x" + par.binning_resample.val + " binning using IntegerResample on light files");
      util.addProcessingStep("Do " + par.binning_resample.val + "x" + par.binning_resample.val + " binning using IntegerResample on light files, output *" + postfix + ".xisf");
      console.writeln("runBinningOnLights input[0] " + fileNames[0]);

      for (var i = 0; i < fileNames.length; i++) {
            var do_binning = true;
            if (par.binning.val == 1) {
                  // Binning is done only for color channels, check if this is luminance file
                  if (isLuminanceFile(filtered_files, fileNames[i])) {
                        do_binning = false;
                  }
            }
            if (do_binning) {
                  // Open source image window from a file
                  var imageWindows = ImageWindow.open(fileNames[i]);
                  if (imageWindows.length != 1) {
                        util.throwFatalError("*** runBinningOnLights Error: imageWindows.length: " + imageWindows.length);
                  }
                  var imageWindow = imageWindows[0];
                  if (imageWindow == null) {
                        util.throwFatalError("*** runBinningOnLights Error: Can't read file: " + fileNames[i]);
                  }

                  var P = new IntegerResample;
                  P.zoomFactor = -par.binning_resample.val;
                  P.noGUIMessages = true;

                  imageWindow.mainView.beginProcess(UndoFlag_NoSwapFile);

                  P.executeOn(imageWindow.mainView, false);
                  
                  imageWindow.mainView.endProcess();

                  updateBinningKeywords(imageWindow, par.binning_resample.val);
            
                  var filePath = generateNewFileName(fileNames[i], outputDir, postfix, outputExtension);

                  // Save window
                  if (!writeImage(filePath, imageWindow)) {
                        util.throwFatalError("*** runBinningOnLights Error: Can't write output image: " + imageWindow.mainView.id + ", file: " + filePath);
                  }
                  // Close window
                  util.forceCloseOneWindow(imageWindow);   
            } else{
                  // keep the old file name
                  var filePath = fileNames[i];
            }

            newFileNames[newFileNames.length] = filePath;
      }

      console.writeln("runBinningOnLights output[0] " + newFileNames[0]);

      return newFileNames;
}

function runABEOnLights(fileNames)
{
      var newFileNames = [];
      var outputDir = global.outputRootDir + global.AutoOutputDir;
      var postfix = "_ABE";
      var outputExtension = ".xisf";

      util.addProcessingStepAndStatusInfo("Run ABE on on light files");

      console.writeln("runABEOnLights output *" + postfix + ".xisf");
      console.writeln("runABEOnLights input[0] " + fileNames[0]);

      for (var i = 0; i < fileNames.length; i++) {
            // Open source image window from a file
            var imageWindows = ImageWindow.open(fileNames[i]);
            if (imageWindows.length != 1) {
                  util.throwFatalError("*** runABEOnLights Error: imageWindows.length: " + imageWindows.length);
            }
            var imageWindow = imageWindows[0];
            if (imageWindow == null) {
                  util.throwFatalError("*** runABEOnLights Error: Can't read file: " + fileNames[i]);
            }
            
            // Run ABE which creates a new window with _ABE extension
            var new_id = runABEex(imageWindow, false, postfix);
            var new_win = util.findWindow(new_id);
            if (new_win == null) {
                  util.throwFatalError("*** runABEOnLights Error: could not find window: " + new_id);
            }
            
            // Source image window is not needed any more
            util.forceCloseOneWindow(imageWindow);

            var filePath = generateNewFileName(fileNames[i], outputDir, postfix, outputExtension);

            // Save ABE window
            if (!writeImage(filePath, new_win)) {
                  util.throwFatalError("*** runABEOnLights Error: Can't write output image: " + new_id);
            }
            // Close ABE window
            util.forceCloseOneWindow(new_win);

            newFileNames[newFileNames.length] = filePath;
      }

      console.writeln("runABEOnLights output[0] " + newFileNames[0]);

      return newFileNames;
}

function runCosmeticCorrection(fileNames, defects, color_images)
{
      util.addStatusInfo("Run CosmeticCorrection, number of line defects to fix is " + defects.length);
      if (defects.length > 0) {
            util.addProcessingStep("Run CosmeticCorrection, output *_cc.xisf, number of line defects to fix is " + defects.length);
      } else {
            util.addProcessingStep("Run CosmeticCorrection, output *_cc.xisf, no line defects to fix");
      }
      console.writeln("fileNames[0] " + fileNames[0]);

      var P = new CosmeticCorrection;
      P.targetFrames = fileNamesToEnabledPath(fileNames);
      P.overwrite = true;
      if (color_images && par.debayer_pattern.val != 'None') {
            P.cfa = true;
      } else {
            P.cfa = false;
      }
      P.outputDir = global.outputRootDir + global.AutoOutputDir;
      P.useAutoDetect = true;
      P.hotAutoCheck = true;
      P.hotAutoValue = par.cosmetic_correction_hot_sigma.val;
      P.coldAutoCheck = true;
      P.coldAutoValue = par.cosmetic_correction_cold_sigma.val;
      if (defects.length > 0) {
            P.useDefectList = true;
            P.defects = defects; // [ defectEnabled, defectIsRow, defectAddress, defectIsRange, defectBegin, defectEnd ]
      } else {
            P.useDefectList = false;
            P.defects = [];
      }

      console.writeln("runCosmeticCorrection:executeGlobal");

      try {
            P.executeGlobal();
      } catch(err) {
            console.criticalln(err);
            util.throwFatalError("CosmeticCorrection failed, maybe a problem in some of the files or in output directory´" + P.outputDir);
      }

      fileNames = generateNewFileNames(fileNames, P.outputDir, P.postfix, P.outputExtension);
      console.writeln("runCosmeticCorrection output[0] " + fileNames[0]);

      return fileNames;
}

function getStandardDeviationAndMean(array)
{
      const n = array.length;
      const mean = array.reduce((a, b) => a + b) / n;
      const std = Math.sqrt(array.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / n);
      return { mean: mean, std: std };
}

function findOutlierMinMax(measurements, indexvalue)
{
      if (par.outliers_method.val == 'IQR') {
            // Use IQR for filtering
            var values = measurements.concat();
      
            values.sort( function(a, b) {
                  return a[indexvalue] - b[indexvalue];
            });
      
            var q1 = values[Math.floor((values.length / 4))][indexvalue];
            var q3 = values[Math.ceil((values.length * (3 / 4)))][indexvalue];
            var iqr = q3 - q1;
      
            console.writeln("findOutlierMinMax q1 " + q1 + ", q3 " + q3 + ", iqr " + iqr);

            return { maxValue: q3 + iqr * 1.5, 
                     minValue: q1 - iqr * 1.5 };

      } else {
            // Use one or two sigma for filtering
            if (par.outliers_method.val == 'Two sigma') {
                  var sigma_count = 2;
            } else {
                  var sigma_count = 1;
            }
            var number_array = []
            for (var i = 0; i < measurements.length; i++) {
                  number_array[number_array.length] = measurements[i][indexvalue];
            }
            var mean_std = getStandardDeviationAndMean(number_array);

            console.writeln("findOutlierMinMax mean " + mean_std.mean + ", std " + mean_std.std);

            return { maxValue: mean_std.mean + sigma_count * mean_std.std, 
                     minValue: mean_std.mean - sigma_count * mean_std.std };
      }
}

function filterOutliers(measurements, name, index, type, do_filtering, fileindex, filtered_files)
{
      if (measurements.length < 8) {
            console.writeln("filterOutliers requires at last eight images, number of images is " + measurements.length);
            return measurements;
      }

      var minmax = findOutlierMinMax(measurements, index);

      console.writeln(name + " outliers min " + minmax.minValue + ", max " + minmax.maxValue);

      if (!do_filtering) {
            console.writeln("Outliers are not filtered");
            return measurements;
      }

      console.writeln("filterOutliers");

      var newMeasurements = [];
      for (var i = 0; i < measurements.length; i++) {
            if ((type == 'min' || par.outliers_minmax.val) && measurements[i][index] < minmax.minValue) {
                  console.writeln(name + " below limit " + minmax.maxValue + ", ignoring file " + measurements[i][fileindex]);
                  filtered_files[filtered_files.length] = measurements[i];
            } else if ((type == 'max' || par.outliers_minmax.val) && measurements[i][index] > minmax.maxValue) {
                  console.writeln(name + " above limit " + minmax.maxValue + ", ignoring file " + measurements[i][fileindex]);
                  filtered_files[filtered_files.length] = measurements[i];
            } else {
                  newMeasurements[newMeasurements.length] = measurements[i];
            }
      }
      util.addProcessingStep(name + " outliers filtered " + (measurements.length - newMeasurements.length) + " files");
      return newMeasurements;
}

function filterLimit(measurements, name, index, limit_val, fileindex, filtered_files)
{
      if (limit_val == 0) {
            console.writeln("No limit filter");
            return measurements;
      }

      console.writeln("filterLimit "+ limit_val);

      var newMeasurements = [];
      for (var i = 0; i < measurements.length; i++) {
            if (measurements[i][index] < limit_val) {
                  console.writeln(name + " below limit " + limit_val + ", ignoring file " + measurements[i][fileindex]);
                  filtered_files[filtered_files.length] = measurements[i];
            } else {
                  newMeasurements[newMeasurements.length] = measurements[i];
            }
      }
      util.addProcessingStep(name + " limit filtered " + (measurements.length - newMeasurements.length) + " files");
      return newMeasurements;
}

function getScaledValNeg(val, min, max)
{
      if (min == max) {
            return 0.5;
      } else {
            return 1-(val-min)/(max-min);
      }
}

function getScaledValPos(val, min, max)
{
      if (min == max) {
            return 0.5;
      } else {
            return (val-min)/(max-min);
      }
}

// If weight_filtering == true and treebox_filtering == true
//    returns array of [ filename, checked, weight ]
// else
//    returns array of [ filename, weight ]
this.subframeSelectorMeasure = function(fileNames, weight_filtering, treebox_filtering)
{
      console.writeln("subframeSelectorMeasure, input[0] " + fileNames[0]);

      var indexPath = 3;
      var indexWeight = 4;
      var indexFWHM = 5;
      var indexEccentricity = 6;
      var indexPSFSignal = 7;
      var indexPSFPower = 8;
      var indexStars = 14;
      /* Index for indexSNRWeight has changed at some point.
       * I assume it is in old position before version 1.8.8.10.
       */
      if (global.pixinsight_version_num < 1080810) {
            var indexSNRWeight = 7;
      } else {
            var indexSNRWeight = 9;
      }

      var measurements = null;

      if (global.saved_measurements != null) {
            // Find old measurements from global.saved_measurements
            console.writeln("subframeSelectorMeasure, use saved measurements");
            measurements = [];
            for (var i = 0; i < fileNames.length; i++) {
                  var found = false;
                  for (var j = 0; j < global.saved_measurements.length; j++) {
                        if (global.saved_measurements[j][indexPath] == fileNames[i]) {
                              measurements[measurements.length] = global.saved_measurements[j];
                              found = true;
                              break;
                        }
                  }
                  if (!found) {
                        // something went wrong, list are not compatible, generate new ones
                        console.writeln("subframeSelectorMeasure, saved measurements not found for " + fileNames[i]);
                        measurements = null;
                        break;
                  }
            }
      }
      if (measurements == null) {
            // collect new measurements
            console.writeln("subframeSelectorMeasure, collect measurements");
            var P = new SubframeSelector;
            P.nonInteractive = true;
            P.subframes = fileNamesToEnabledPath(fileNames);     // [ subframeEnabled, subframePath ]
            P.noiseLayers = 2;
            P.outputDirectory = global.outputRootDir + global.AutoOutputDir;
            P.overwriteExistingFiles = true;
            P.maxPSFFits = 8000;
            /*
            ** PI 1.8.8-10
            P.measurements = [ 
                  measurementIndex, measurementEnabled, measurementLocked, measurementPath, measurementWeight,                                              0-4
                  measurementFWHM, measurementEccentricity, measurementPSFSignalWeight, measurementPSFPowerWeight, measurementSNRWeight,                    5-9
                  measurementMedian, measurementMedianMeanDev, measurementNoise, measurementNoiseRatio, measurementStars,                                   10-14
                  measurementStarResidual, measurementFWHMMeanDev, measurementEccentricityMeanDev, measurementStarResidualMeanDev, measurementAzimuth,      15-19
                  measurementAltitude                                                                                                                       20
                  *** New in PI 1.8.9-1
                                     measurementPSFFlux, measurementPSFFluxPower, measurementPSFTotalMeanFlux, measurementPSFTotalMeanPowerFlux,            21-24
                  measurementPSFCount, measurementMStar, measurementNStar, measurementPSFSNR, measurementPSFScale,                                          25-29
                  measurementPSFScaleSNR                                                                                                                    30
            ];
           */
            
            P.executeGlobal();
            global.saved_measurements = P.measurements;
            measurements = P.measurements;
      }

      // Close measurements and expressions windows
      util.closeAllWindowsSubstr("SubframeSelector");

      // We filter outliers here so they are not included in the
      // min/max calculations below
      var filtered_files = [];
      measurements = filterOutliers(measurements, "FWHM", indexFWHM, 'max', par.outliers_fwhm.val, indexPath, filtered_files);
      measurements = filterOutliers(measurements, "Eccentricity", indexEccentricity, 'max', par.outliers_ecc.val, indexPath, filtered_files);
      measurements = filterOutliers(measurements, "SNR", indexSNRWeight, 'min', par.outliers_snr.val, indexPath, filtered_files);
      if (global.pixinsight_version_num >= 1080810) {
            measurements = filterOutliers(measurements, "PSF Signal", indexPSFSignal, 'min', par.outliers_psfsignal.val, indexPath, filtered_files);
            measurements = filterOutliers(measurements, "PSF Power", indexPSFPower, 'min', par.outliers_psfpower.val, indexPath, filtered_files);
      }
      measurements = filterOutliers(measurements, "Stars", indexStars, 'min', par.outliers_stars.val, indexPath, filtered_files);

      console.writeln("subframeSelectorMeasure:calculate weight");

      /* Calculate weight */
      var FWHMMin = findMin(measurements, indexFWHM);
      var FWHMMax = findMax(measurements, indexFWHM);
      var EccentricityMin = findMin(measurements, indexEccentricity);
      var EccentricityMax = findMax(measurements, indexEccentricity);
      var SNRWeightMin = findMin(measurements, indexSNRWeight);
      var SNRWeightMax = findMax(measurements, indexSNRWeight);
      if (global.pixinsight_version_num >= 1080810) {
            var PSFSignalMin = findMin(measurements, indexPSFSignal);
            var PSFSignalMax = findMax(measurements, indexPSFSignal);
            var PSFPowerMin = findMin(measurements, indexPSFPower);
            var PSFPowerMax = findMax(measurements, indexPSFPower);
      } else {
            var PSFSignalMin = 0;
            var PSFSignalMax = 0;
            var PSFPowerMin = 0;
            var PSFPowerMax = 0;
      }
      var StarsMin = findMin(measurements, indexStars);
      var StarsMax = findMax(measurements, indexStars);

      console.writeln("FWHMMin " + FWHMMin + ", EccMin " + EccentricityMin + ", SNRMin " + SNRWeightMin + ", PSFSignalMin " + PSFSignalMin + ", PSFPowerMin " + PSFPowerMin + ", StarsMin " + StarsMin);
      console.writeln("FWHMMax " + FWHMMax + ", EccMax " + EccentricityMax + ", SNRMax " + SNRWeightMax + ", PSFSignalMax " + PSFSignalMax + ", PSFPowerMax " + PSFPowerMax + ", StarsMax " + StarsMax);

      for (var i = 0; i < measurements.length; i++) {
            var FWHM = measurements[i][indexFWHM];
            var Eccentricity = measurements[i][indexEccentricity];
            var SNRWeight = measurements[i][indexSNRWeight];
            var SSWEIGHT;
            /* Defaults below for Noise, Stars and Generic options are from script Weighted Batch Preprocessing v1.4.0
             * https://www.tommasorubechi.it/2019/11/15/the-new-weighted-batchpreprocessing/
             */
            switch (par.use_weight.val) {
                  case 'Generic':
                        /* Generic weight.
                         */
                        SSWEIGHT = 20*getScaledValNeg(FWHM, FWHMMin, FWHMMax) + 
                              15*getScaledValNeg(Eccentricity, EccentricityMin, EccentricityMax) + 
                              25*getScaledValPos(SNRWeight, SNRWeightMin, SNRWeightMax) +
                              40;
                        break;
                  case 'Noise':
                        /* More weight on noise.
                         */
                        SSWEIGHT = 5*getScaledValNeg(FWHM, FWHMMin, FWHMMax) + 
                              10*getScaledValNeg(Eccentricity, EccentricityMin, EccentricityMax) + 
                              20*getScaledValPos(SNRWeight, SNRWeightMin, SNRWeightMax) +
                              65;
                        break;
                  case 'Stars':
                        /* More weight on stars.
                         */
                        SSWEIGHT = 35*getScaledValNeg(FWHM, FWHMMin, FWHMMax) + 
                              35*getScaledValNeg(Eccentricity, EccentricityMin, EccentricityMax) + 
                              20*getScaledValPos(SNRWeight, SNRWeightMin, SNRWeightMax) +
                              10;
                        break;
                  case 'PSF Signal':
                        if (global.pixinsight_version_num < 1080810) {
                              util.throwFatalError("Option " + par.use_weight.val + " is not supported in this version of PixInsight");
                        }
                        SSWEIGHT = measurements[i][indexPSFSignal] + 1; // Add one to avoid zero value
                        break;
                  case 'PSF Signal scaled':
                        if (global.pixinsight_version_num < 1080810) {
                              util.throwFatalError("Option " + par.use_weight.val + " is not supported in this version of PixInsight");
                        }
                        SSWEIGHT = 99 * getScaledValPos(measurements[i][indexPSFSignal], PSFSignalMin, PSFSignalMax) + 1;
                        break;
                  case 'FWHM scaled':
                        SSWEIGHT = 99 * getScaledValNeg(measurements[i][indexFWHM], FWHMMin, FWHMMax) + 1;
                        break;
                  case 'Eccentricity scaled':
                        SSWEIGHT = 99 * getScaledValNeg(measurements[i][indexEccentricity], EccentricityMin, EccentricityMax) + 1;
                        break;
                  case 'SNR scaled':
                        SSWEIGHT = 99 * getScaledValPos(measurements[i][indexSNRWeight], SNRWeightMin, SNRWeightMax) + 1;
                        break;
                  case 'Star count':
                        SSWEIGHT = measurements[i][indexStars] + 1;      // Add one to avoid zero value
                        break;
                  default:
                        util.throwFatalError("Invalid option " + par.use_weight.val);
            }
            util.addProcessingStep("SSWEIGHT " + SSWEIGHT + ", FWHM " + FWHM + ", Ecc " + Eccentricity + ", SNR " + SNRWeight + 
                              ", Stars " + measurements[i][indexStars] + ", PSFSignal " + measurements[i][indexPSFSignal] + ", PSFPower " + measurements[i][indexPSFPower] +
                              ", " + measurements[i][indexPath]);
            // set SSWEIGHT to indexWeight column
            measurements[i][indexWeight] = SSWEIGHT;
      }
      console.writeln("SSWEIGHTMin " + findMin(measurements, indexWeight) + " SSWEIGHTMax " + findMax(measurements, indexWeight));
      measurements = filterOutliers(measurements, "SSWEIGHT", indexWeight, 'min', par.outliers_ssweight.val, indexPath, filtered_files);
      measurements = filterLimit(measurements, "SSWEIGHT", indexWeight, par.ssweight_limit.val, indexPath, filtered_files);
      
      var ssFiles = [];
      for (var i = 0; i < measurements.length; i++) {
            ssFiles[ssFiles.length] = [ measurements[i][indexPath], measurements[i][indexWeight] ];
      }

      if (weight_filtering) {
            // sorting for files that are filtered out
            if (global.pixinsight_version_num < 1080810) {
                  var filteredSortIndex = indexFWHM;
            } else {
                  var filteredSortIndex = indexPSFSignal;
            }
            filtered_files.sort( function(a, b) {
                  return b[filteredSortIndex] - a[filteredSortIndex];
            });
            // sorting for measurements files
            measurements.sort( function(a, b) {
                  return b[indexWeight] - a[indexWeight];
            });
            console.writeln("subframeSelectorMeasure, " + filtered_files.length + " discarded files");
            for (var i = 0; i < filtered_files.length; i++) {
                  console.writeln(filtered_files[i][indexPath]);
            }
            console.writeln("subframeSelectorMeasure, " + measurements.length + " accepted files");
            for (var i = 0; i < measurements.length; i++) {
                  console.writeln(measurements[i][indexPath]);
            }
            var treeboxfiles = [];
            // add selected files as checked
            for (var i = 0; i < measurements.length; i++) {
                  treeboxfiles[treeboxfiles.length] =  [ measurements[i][indexPath], true, measurements[i][indexWeight] ];
            }
            // add filtered files as unchecked
            for (var i = 0; i < filtered_files.length; i++) {
                  treeboxfiles[treeboxfiles.length] =  [ filtered_files[i][indexPath], false, 0 ];
            }
            if (treebox_filtering) {
                  return treeboxfiles;
            } else {
                  /* Create AutoWeights.json file sorted by weight. 
                   */
                  if (treeboxfiles.length == 0) {
                        console.noteln("No files, AutoWeights.json not written");
                  } else {
                        // create Json output string
                        let fileInfoList = [];
                        util.addJsonFileInfo(fileInfoList, global.pages.LIGHTS, treeboxfiles, null);
                        let saveInfo = util.initJsonSaveInfo(fileInfoList, false, "");
                        console.writeln("saveInfo " + saveInfo);
                        let saveInfoJson = JSON.stringify(saveInfo, null, 2);
                        console.writeln("saveInfoJson " + saveInfoJson);
                        // save to a file
                        let weightsFile = util.ensure_win_prefix("AutoWeights.json");
                        let outputDir = util.getOutputDir(treeboxfiles[0][0]);
                        let outputFile = outputDir + weightsFile;
                        console.noteln("Write processing steps to " + outputFile);
                        var file = new File();
                        file.createForWriting(outputFile);
                        file.outTextLn(saveInfoJson);
                        file.close();
                  }      
                  return ssFiles;
            }
      } else {
            console.writeln("subframeSelectorMeasure, output[0] " + ssFiles[0][0]);
            return ssFiles;
      }
}

function runSubframeSelector(fileNames)
{
      util.addProcessingStepAndStatusInfo("Run SubframeSelector");
      console.writeln("input[0] " + fileNames[0]);
      
      var ssWeights = engine.subframeSelectorMeasure(fileNames, par.image_weight_testing.val, false);
      // SubframeSelectorOutput(P.measurements); Does not write weight keyword

      var newFileNames = [];

      if (par.image_weight_testing.val) {
            // Do not generate output files
            var postfix = "";
            for (var i = 0; i < ssWeights.length; i++) {
                  var filePath = ssWeights[i][0];
                  if (filePath != null && filePath != "") {
                        newFileNames[newFileNames.length] = filePath;
                  }
            }
      } else {
            /* Basically we could skip writing SSWEIGHT to output files as we have that
            * information in memory. But for some cases like starting from ImageIntegration
            * and printing best files for each channel it is useful to write
            * output files with SSWEIGHT on them.
            */
            var outputDir = global.outputRootDir + global.AutoOutputDir;
            var postfix = "_a";
            var outputExtension = ".xisf";
            for (var i = 0; i < ssWeights.length; i++) {
                  var filePath = ssWeights[i][0];
                  if (filePath != null && filePath != "") {
                        var SSWEIGHT = ssWeights[i][1];
                        var newFilePath = generateNewFileName(filePath, outputDir, postfix, outputExtension);
                        console.writeln("Writing file " + newFilePath + ", SSWEIGHT=" + SSWEIGHT);
                        var imageWindows = ImageWindow.open(filePath);
                        if (imageWindows.length != 1) {
                              console.writeln("*** Error: imageWindows.length: ", imageWindows.length);
                              continue;
                        }
                        var imageWindow = imageWindows[0];
                        if (imageWindow == null) {
                              console.writeln("*** Error: Can't read subframe: ", filePath);
                              continue;
                        }
                        setSSWEIGHTkeyword(imageWindow, SSWEIGHT);
                        if (!writeImage(newFilePath, imageWindow)) {
                              util.forceCloseOneWindow(imageWindow);
                              console.writeln(
                              "*** Error: Can't write output image: ", newFilePath
                              );
                              continue;
                        }         
                        util.forceCloseOneWindow(imageWindow);
                  }
                  newFileNames[newFileNames.length] = newFilePath;
            }
      }
      util.addProcessingStep("runSubframeSelector, input " + fileNames.length + " files, output " + newFileNames.length + " files");
      console.writeln("output[0] " + newFileNames[0]);

      var names_and_weights = { filenames: newFileNames, ssweights: ssWeights, postfix: postfix };
      return names_and_weights;
}

function findBestSSWEIGHT(parent, names_and_weights, filename_postfix)
{
      var ssweight;
      var fileNames = names_and_weights.filenames;
      var newFileNames = [];

      if (names_and_weights.filenames.length < names_and_weights.ssweights.length) {
            // we have inconsistent lengths
            util.throwFatalError("Inconsistent lengths, filenames.length=" + names_and_weights.filenames.length + ", ssweights.length=" + names_and_weights.ssweights.length);
      }

      run_HT = true;
      global.best_ssweight = 0;
      global.best_image = null;

      /* Loop through files and find image with best SSWEIGHT.
       */
      util.addProcessingStepAndStatusInfo("Find best SSWEIGHT");
      var n = 0;
      var first_image = true;
      var best_ssweight_naxis = 0;
      var file_name_text_best_image = null;
      var file_name_text_best_image_ssweight = 0;
      var found_user_selected_best_image = null;
      var found_user_selected_best_image_ssweight = 0;
      for (var i = 0; i < fileNames.length; i++) {
            var filePath = fileNames[i];
            var ext = '.' + filePath.split('.').pop();
            console.writeln("File " +  filePath + " ext " +  ext);
            if (ext.toUpperCase() == '.FIT' || ext.toUpperCase() == '.XISF') {
                  run_HT = true;
            } else {
                  run_HT = false;
            }
            var keywords = getFileKeywords(filePath);

            n++;

            // First get naxis1 since we do not know
            // the order for keywords
            var naxis1 = 0;
            for (var j = 0; j < keywords.length; j++) {
                  var value = keywords[j].strippedValue.trim();
                  switch (keywords[j].name) {
                        case "TELESCOP":
                              console.writeln("telescop=" +  value);
                              break;
                        case "NAXIS1":
                              console.writeln("naxis1=" + value);
                              naxis1 = parseInt(value);
                              break;
                        default:
                              break;
                  }
            }
            var accept_file = true;
            var ssweight_found = false;
            ssweight = 0;
            if (names_and_weights.ssweights.length > i) {
                  // take SSWEIGHT from the calculated array
                  ssweight_found = true;
                  ssweight = names_and_weights.ssweights[i][1];
                  console.writeln("calculated ssweight=" +  ssweight);
            } else {
                  // try to find SSWEIGHT from the file
                  for (var j = 0; j < keywords.length; j++) {
                        var value = keywords[j].strippedValue.trim();
                        switch (keywords[j].name) {
                              case "SSWEIGHT":
                                    ssweight_found = true;
                                    ssweight = parseFloat(value);
                                    console.writeln("file ssweight=" +  ssweight);
                                    break;
                              default:
                                    break;
                        }
                  }
            }
            if (global.user_selected_best_image != null 
                && found_user_selected_best_image == null
                && util.compareReferenceFileNames(global.user_selected_best_image, filePath, filename_postfix))
              {
                    found_user_selected_best_image = filePath;
                    found_user_selected_best_image_ssweight = ssweight;
                    console.writeln("found user selected best image " + global.user_selected_best_image + " as " + filePath);
              }
              if (fileNames[i].indexOf("best_image") != -1) {
                    // User has marked this image as the best
                    file_name_text_best_image = filePath;
                    file_name_text_best_image_ssweight = ssweight;
                    console.writeln("found text 'best_image' from file name " + filePath);
              }
              if (ssweight_found) {
                  ssweight_set = true;
                  if (ssweight < par.ssweight_limit.val) {
                        console.writeln("below ssweight limit " + par.ssweight_limit.val + ", skip image");
                        accept_file = false;
                  } else {
                        if (!first_image && naxis1 > best_ssweight_naxis) {
                              util.addProcessingStep("Files have different resolution, using bigger NAXIS1="+naxis1+" for best SSWEIGHT");
                        }
                        if (first_image || 
                            naxis1 > best_ssweight_naxis ||
                            (ssweight > global.best_ssweight &&
                             naxis1 == best_ssweight_naxis))
                        {
                              /* Set a new best image if
                              - this is the first image
                              - this has a bigger resolution
                              - this has a bigger SSWEIGHT value and is the same resolution
                              */
                              global.best_ssweight = ssweight;
                              console.writeln("new best_ssweight=" +  global.best_ssweight);
                              global.best_image = filePath;
                              best_ssweight_naxis = naxis1;
                              first_image = false;
                        }
                  }
                  if (gui) {
                        guiSetTreeBoxNodeSsweight(parent.treeBox[global.pages.LIGHTS], filePath, ssweight, filename_postfix);
                  }
            }
            if (accept_file) {
                  newFileNames[newFileNames.length] = fileNames[i];
            }
      }
      if (newFileNames.length == 0) {
            util.throwFatalError("No files found for processing.");
      }
      if (found_user_selected_best_image != null || file_name_text_best_image != null) {
            if (found_user_selected_best_image != null) {
                  console.writeln("Using user selected best image " + found_user_selected_best_image + ", ssweight " + found_user_selected_best_image_ssweight);
                  global.best_image = found_user_selected_best_image;
                  global.best_ssweight = found_user_selected_best_image_ssweight;
            } else {
                  console.writeln("Using best image as a file with text best_image " + file_name_text_best_image + ", ssweight " + file_name_text_best_image_ssweight);
                  global.best_image = file_name_text_best_image;
                  global.best_ssweight = file_name_text_best_image_ssweight;
            }
      } else if (global.best_image != null) {
            console.writeln("Using best image " + global.best_image);
      } else {
            console.writeln("Unable to find image with best SSWEIGHT, using first image " + newFileNames[0]);
            global.best_image = newFileNames[0];
            global.best_ssweight = 1.0;
      }
      return [ global.best_image, newFileNames ];
}

function filterByFileName(filePath, filename_postfix)
{
      var splitname = filePath.split('.');
      var basename = splitname[splitname.length - 2];
      var filter = basename.slice(0, basename.length - filename_postfix.length).slice(-2);
      
      console.writeln("filterByFileName:filePath=" + filePath + ", filter=" + filter);
      
      // Create filter based of file name ending.
      switch (filter) {
            case '_L':
                  return 'L';
            case '_R':
                  return 'R';
            case '_G':
                  return 'G';
            case '_B':
                  return 'B';
            case '_S':
                  return 'S';
            case '_H':
                  return 'H';
            case '_O':
                  return 'O';
            default:
                  break;
      }
      return null;
}

// Update files.images info for a channel. Find the best image for a channel
// using either ssweight or user chosen reference image.
// For image integration are ordered so that the best image is first. We also
// record best image separately that use used by local normalization.
function updateFilesInfo(parent, files, filearr, filter, filename_postfix)
{
      console.writeln("updateFilesInfo, " + filearr.length + " " + filter + " files");

      // Check if we have user selected reference image for the channel.
      var refImage = null;
      for (var i = 0; i < global.user_selected_reference_image.length; i++) {
            if (global.user_selected_reference_image[i][1] == filter) {
                  refImage = global.user_selected_reference_image[i][0];
                  console.writeln("User selected reference image " + refImage);
                  break;
            }
      }
      if (refImage != null) {
            // Find refImage from the list. In the files list we have .xisf files that
            // have a postfix like _cc already added to file name. So we try match
            // the base file names. We ignore directory as output files are placed
            // info a different directory.
            for (var i = 0; i < filearr.length; i++) {
                  if (util.compareReferenceFileNames(refImage, filearr[i].name, filename_postfix)) {
                        refImage = filearr[i].name;
                        break;
                  }
            }
            if (i == filearr.length) {
                  util.throwFatalError("User selected reference image " + refImage + " for filter " + filter + " not found from image list, filename_postfix " + filename_postfix);
            }
      }

      // Update files object.
      var automatic_reference_image = null;
      for (var i = 0; i < filearr.length; i++) {
            var found_best_image = false;
            if (refImage != null && filearr[i].name == refImage) {
                  found_best_image = true;
                  console.writeln(filter + " user selected best image, ssweight=" + filearr[i].ssweight);
            } else if (refImage == null && (files.best_image == null || filearr[i].ssweight > files.best_ssweight)) {
                  found_best_image = true;
                  automatic_reference_image = filearr[i].name;
                  console.writeln(filter + " new best_ssweight=" + filearr[i].ssweight);
            }
            if (found_best_image) {
                  /* Add best image first in the array. It is the reference image for
                   * image integration and local normalization.
                   */
                  files.best_ssweight = filearr[i].ssweight;
                  files.best_image = filearr[i].name;
                  insert_image_for_integrate(files.images, filearr[i].name);
            } else {
                  append_image_for_integrate(files.images, filearr[i].name);
            }
            files.exptime += filearr[i].exptime;
      }
      if (automatic_reference_image != null && gui) {
            gui.setReferenceImageInTreeBox(parent, parent.treeBox[global.pages.LIGHTS], automatic_reference_image, filename_postfix, filter);
      }
}

function init_images()
{
      return { images: [], best_image: null, best_ssweight: 0, exptime: 0 };
}

function getFileKeywords(filePath)
{
      console.writeln("getFileKeywords " + filePath);
      var keywords = [];

      var ext = '.' + filePath.split('.').pop();
      var F = new FileFormat(ext, true/*toRead*/, false/*toWrite*/);
      if (F.isNull) {
            util.throwFatalError("No installed file format can read \'" + ext + "\' files."); // shouldn't happen
      }
      var f = new FileFormatInstance(F);
      if (f.isNull) {
            util.throwFatalError("Unable to instantiate file format: " + F.name);
      }
      var info = f.open(filePath, "verbosity 0"); // do not fill the console with useless messages
      if (info.length <= 0) {
            util.throwFatalError("Unable to open input file: " + filePath);
      }
      if (F.canStoreKeywords) {
            keywords = f.keywords;
      }
      f.close();

      return keywords;
}

// Filter files based on filter keyword/file name.
// files array can be either simple file name array
// or treeboxfiles array having [ filename, checked, weight ] members
this.getFilterFiles = function(files, pageIndex, filename_postfix)
{
      var luminance = false;
      var rgb = false;
      var narrowband = false;
      var ssweight_set = false;
      var allfilesarr = [];
      var error_text = "";
      var color_files = false;
      var filterSet = null;
      var imgwidth = 0;
      var imgheigth = 0;
      var minwidth = 0;
      var minheigth = 0;

      var allfiles = {
            L: [], R: [], G: [], B: [], H: [], S: [], O: [], C: []
      };

      switch (pageIndex) {
            case global.pages.LIGHTS:
                  filterSet = global.lightFilterSet;
                  break;
            case global.pages.FLATS:
                  filterSet = global.flatFilterSet;
                  break;
      }

      if (filterSet != null) {
            util.clearFilterFileUsedFlags(filterSet);
      }

      if (par.force_narrowband_mapping.val) {
            narrowband = true;
      }

      /* Collect all different file types and some information about them.
       */
      var n = 0;
      for (var i = 0; i < files.length; i++) {
            var filter = null;
            var ssweight = 0;
            var exptime = 0;
            var obj = files[i];
            var use_treebox_ssweight = false;
            var treebox_best_image = false;
            var treebox_reference_image = false;
            if (Array.isArray(obj)) {
                  // we have treeboxfiles array
                  var filePath = obj[0];
                  var checked = obj[1];
                  if (obj.length > 2) {
                        ssweight = obj[2];
                        use_treebox_ssweight = true;
                  }
                  if (obj.length > 3) {
                        treebox_best_image = obj[3];
                  }
                  if (obj.length > 4) {
                        treebox_reference_image = obj[4];
                  }
            } else {
                  // we have just a file name list
                  var filePath = obj;
                  var checked = true;
            }
            
            console.writeln("getFilterFiles file " +  filePath);

            if (filterSet != null) {
                  filter = util.findFilterForFile(filterSet, filePath, filename_postfix);
            }

            var keywords = getFileKeywords(filePath);
            n++;
            for (var j = 0; j < keywords.length; j++) {
                  var value = keywords[j].strippedValue.trim();
                  switch (keywords[j].name) {
                        case "FILTER":
                        case "INSFLNAM":
                              if (filter != null) {
                                    console.writeln("filter already found, ignored "+ keywords[j].name + "=" +  value);
                              } else if (!par.skip_autodetect_filter.val) {
                                    console.writeln(keywords[j].name + "=" + value);
                                    filter = value;
                              } else {
                                    console.writeln("ignored " + keywords[j].name + "=" +  value);
                              }
                              break;
                        case "SSWEIGHT":
                              if (!use_treebox_ssweight) {
                                    ssweight = parseFloat(value);
                                    console.writeln("SSWEIGHT=" +  ssweight);
                                    ssweight_set = true;
                              }
                              break;
                        case "TELESCOP":
                              console.writeln("TELESCOP=" +  value);
                              if (pageIndex == global.pages.LIGHTS
                                  && par.debayer_pattern.val == 'Auto'
                                  && value.search(/slooh/i) != -1
                                  && value.search(/T3/) != -1) 
                              {
                                    console.writeln("Set debayer pattern from Auto to None");
                                    par.debayer_pattern.val = 'None';
                              }
                              break;
                        case "NAXIS1":
                              console.writeln("NAXIS1=" + value);
                              var imgwidth = parseFloat(value);
                              if (minwidth == 0 || imgwidth < minwidth) {
                                    minwidth = imgwidth;
                              }
                              break;
                        case "NAXIS2":
                              console.writeln("NAXIS2=" + value);
                              var imgheigth = parseFloat(value);
                              if (minheigth == 0 || imgheigth < minheigth) {
                                    minheigth = imgheigth;
                              }
                              break;
                        case "EXPTIME":
                        case "EXPOSURE":
                              console.writeln(keywords[j].name + "=" + value);
                              exptime = parseFloat(value);
                              break;
                        default:
                              break;
                  }
            }

            if (filter != null && filter.trim().substring(0, 1) == 'F') {
                  // Hubble FILTER starts with F, force using file name
                  filter = null;
            }
            if (filter == null || par.force_file_name_filter.val) {
                  // No filter keyword. Try mapping based on file name.
                  filter = filterByFileName(filePath, filename_postfix);
            }
            if (filter == null) {
                  filter = 'Color';
            }
            if (par.monochrome_image.val) {
                  console.writeln("Create monochrome image, set filter = Luminance");
                  filter = 'Luminance';
            }
            // First check with full filter name
            switch (filter.trim().toUpperCase()) {
                  case 'LUMINANCE':
                  case 'LUM':
                  case 'CLEAR':
                  case 'L':
                        filter = 'L';
                        break;
                  case 'RED':
                  case 'R':
                        filter = 'R';
                        break;
                  case 'GREEN':
                  case 'G':
                        filter = 'G';
                        break;
                  case 'BLUE':
                  case 'B':
                        filter = 'B';
                        break;
                  case 'HALPHA':
                  case 'HA':
                  case 'H':
                        filter = 'H';
                        break;
                  case 'SII':
                  case 'S':
                        filter = 'S';
                        break;
                  case 'OIII':
                  case 'O':
                        filter = 'O';
                        break;
                  case 'COLOR':
                  case 'NO FILTER':
                  case 'L_EN':
                  case 'C':
                        filter = 'C';
                        break;
                  default:
                        break;
            }
            // Do final resolve based on first letter in the filter'
            var filter_keyword = filter.trim().substring(0, 1).toUpperCase();
            switch (filter_keyword) {
                  case 'L':
                        if (allfiles.L.length == 0) {
                              console.writeln("Found "+ filter_keyword + " files (" + filePath + ")");
                        }
                        allfiles.L[allfiles.L.length] = { name: filePath, ssweight: ssweight, exptime: exptime, filter: filter, checked: checked,
                                                          best_image: treebox_best_image, reference_image: treebox_reference_image,
                                                          width: imgwidth, heigth: imgheigth };
                        luminance = true;
                        break;
                  case 'R':
                        if (allfiles.R.length == 0) {
                              console.writeln("Found "+ filter_keyword + " files (" + filePath + ")");
                        }
                        allfiles.R[allfiles.R.length] = { name: filePath, ssweight: ssweight, exptime: exptime, filter: filter, checked: checked,
                                                          best_image: treebox_best_image, reference_image: treebox_reference_image,
                                                          width: imgwidth, heigth: imgheigth };
                        rgb = true;
                        break;
                  case 'G':
                        if (allfiles.G.length == 0) {
                              console.writeln("Found "+ filter_keyword + " files (" + filePath + ")");
                        }
                        allfiles.G[allfiles.G.length] = { name: filePath, ssweight: ssweight, exptime: exptime, filter: filter, checked: checked,
                                                          best_image: treebox_best_image, reference_image: treebox_reference_image,
                                                          width: imgwidth, heigth: imgheigth };
                        rgb = true;
                        break;
                  case 'B':
                        if (allfiles.B.length == 0) {
                              console.writeln("Found "+ filter_keyword + " files (" + filePath + ")");
                        }
                        allfiles.B[allfiles.B.length] = { name: filePath, ssweight: ssweight, exptime: exptime, filter: filter, checked: checked,
                                                          best_image: treebox_best_image, reference_image: treebox_reference_image,
                                                          width: imgwidth, heigth: imgheigth };
                        rgb = true;
                        break;
                  case 'H':
                        if (allfiles.H.length == 0) {
                              console.writeln("Found "+ filter_keyword + " files (" + filePath + ")");
                        }
                        allfiles.H[allfiles.H.length] = { name: filePath, ssweight: ssweight, exptime: exptime, filter: filter, checked: checked,
                                                          best_image: treebox_best_image, reference_image: treebox_reference_image,
                                                          width: imgwidth, heigth: imgheigth };
                        narrowband = true;
                        break;
                  case 'S':
                        if (allfiles.S.length == 0) {
                              console.writeln("Found "+ filter_keyword + " files (" + filePath + ")");
                        }
                        allfiles.S[allfiles.S.length] = { name: filePath, ssweight: ssweight, exptime: exptime, filter: filter, checked: checked,
                                                          best_image: treebox_best_image, reference_image: treebox_reference_image,
                                                          width: imgwidth, heigth: imgheigth };
                        narrowband = true;
                        break;
                  case 'O':
                        if (allfiles.O.length == 0) {
                              console.writeln("Found "+ filter_keyword + " files (" + filePath + ")");
                        }
                        allfiles.O[allfiles.O.length] = { name: filePath, ssweight: ssweight, exptime: exptime, filter: filter, checked: checked,
                                                          best_image: treebox_best_image, reference_image: treebox_reference_image,
                                                          width: imgwidth, heigth: imgheigth };
                        narrowband = true;
                        break;
                  case 'C':
                  default:
                        if (allfiles.C.length == 0) {
                              console.writeln("Found "+ filter_keyword + " files (" + filePath + ")");
                        }
                        allfiles.C[allfiles.C.length] = { name: filePath, ssweight: ssweight, exptime: exptime, filter: filter, checked: checked,
                                                          best_image: treebox_best_image, reference_image: treebox_reference_image,
                                                          width: imgwidth, heigth: imgheigth };
                        color_files = true;
                        break;
            }
      }

      allfilesarr[channels.L] = { files: allfiles.L, filter: 'L' };
      allfilesarr[channels.R] = { files: allfiles.R, filter: 'R' };
      allfilesarr[channels.G] = { files: allfiles.G, filter: 'G' };
      allfilesarr[channels.B] = { files: allfiles.B, filter: 'B' };
      allfilesarr[channels.H] = { files: allfiles.H, filter: 'H' };
      allfilesarr[channels.S] = { files: allfiles.S, filter: 'S' };
      allfilesarr[channels.O] = { files: allfiles.O, filter: 'O' };
      allfilesarr[channels.C] = { files: allfiles.C, filter: 'C' };

      if (color_files && (luminance || rgb || narrowband)) {
            error_text = "Error, cannot mix color and monochrome filter files";
      } else if (rgb && (allfiles.R.length == 0 || allfiles.G.length == 0 || allfiles.B.length == 0)) {
            error_text = "Error, with RGB files for all RGB channels must be given";
      }

      return { allfilesarr : allfilesarr,
               rgb : rgb, 
               narrowband : narrowband,
               color_files : color_files,
               ssweight_set : ssweight_set,
               error_text: error_text
             };
}

this.getImagetypFiles = function(files)
{
      var allfiles = [];

      for (var i = 0; i < global.pages.END; i++) {
            allfiles[i] = [];
      }

      /* Collect all different image types types.
       */
      var n = 0;
      for (var i = 0; i < files.length; i++) {
            var imagetyp = null;
            var filePath = files[i];
            
            console.writeln("getImagetypFiles file " +  filePath);
            var keywords = getFileKeywords(filePath);
            n++;
            for (var j = 0; j < keywords.length; j++) {
                  var value = keywords[j].strippedValue.trim();
                  switch (keywords[j].name) {
                        case "IMAGETYP":
                              console.writeln("imagetyp=" +  value);
                              imagetyp = value;
                              break;
                        default:
                              break;
                  }
            }

            if (imagetyp == null) {
                  imagetyp = 'Light Frame';
            }
            switch (imagetyp.trim().toLowerCase()) {
                  case 'bias frame':
                  case 'bias':
                  case 'master bias':
                        allfiles[global.pages.BIAS][allfiles[global.pages.BIAS].length] = filePath;
                        break;
                  case 'dark frame':
                  case 'dark':
                  case 'master dark':
                        allfiles[global.pages.DARKS][allfiles[global.pages.DARKS].length] = filePath;
                        break;
                  case 'flat frame':
                  case 'flat field':
                  case 'flat':
                  case 'master flat':
                        allfiles[global.pages.FLATS][allfiles[global.pages.FLATS].length] = filePath;
                        break;
                  case 'flatdark':
                  case 'flat dark':
                  case 'darkflat':
                  case 'dark flat':
                  case 'master flat dark':
                        allfiles[global.pages.FLAT_DARKS][allfiles[global.pages.FLAT_DARKS].length] = filePath;
                        break;
                  case 'light frame':
                  case 'light':
                  case 'master light':
                  default:
                        allfiles[global.pages.LIGHTS][allfiles[global.pages.LIGHTS].length] = filePath;
                        break;
            }
      }
      return allfiles;
}

function findLRGBchannels(parent, alignedFiles, filename_postfix)
{
      /* Loop through aligned files and find different channels.
       */
      util.addProcessingStepAndStatusInfo("Find L,R,G,B,H,S,O and color channels");

      L_images = init_images();
      R_images = init_images();
      G_images = init_images();
      B_images = init_images();
      H_images = init_images();
      S_images = init_images();
      O_images = init_images();
      C_images = init_images();

      /* Collect all different file types and some information about them.
       */
      var filter_info = engine.getFilterFiles(alignedFiles, global.pages.LIGHTS, filename_postfix);

      var allfilesarr = filter_info.allfilesarr;
      var rgb = filter_info.rgb;
      is_color_files = filter_info.color_files;

      // update global variables
      narrowband = filter_info.narrowband;
      ssweight_set = filter_info.ssweight_set;

      // Check for synthetic images
      if (allfilesarr[channels.C].files.length == 0) {
            if (par.synthetic_l_image.val ||
                  (par.synthetic_missing_images.val && allfilesarr[channels.L].files.length == 0))
            {
                  if (allfilesarr[channels.L].files.length == 0) {
                        util.addProcessingStep("No luminance images, synthetic luminance image from all other images");
                  } else {
                        util.addProcessingStep("Synthetic luminance image from all light images");
                  }
                  allfilesarr[channels.L].files = allfilesarr[channels.L].files.concat(allfilesarr[channels.R].files);
                  allfilesarr[channels.L].files = allfilesarr[channels.L].files.concat(allfilesarr[channels.G].files);
                  allfilesarr[channels.L].files = allfilesarr[channels.L].files.concat(allfilesarr[channels.B].files);
                  allfilesarr[channels.L].files = allfilesarr[channels.L].files.concat(allfilesarr[channels.H].files);
                  allfilesarr[channels.L].files = allfilesarr[channels.L].files.concat(allfilesarr[channels.S].files);
                  allfilesarr[channels.L].files = allfilesarr[channels.L].files.concat(allfilesarr[channels.O].files);
            }
            if (allfilesarr[channels.R].files.length == 0 && par.synthetic_missing_images.val) {
                  util.addProcessingStep("No red images, synthetic red image from luminance images");
                  allfilesarr[channels.R].files = allfilesarr[channels.R].files.concat(allfilesarr[channels.L].files);
            }
            if (allfilesarr[channels.G].files.length == 0 && par.synthetic_missing_images.val) {
                  util.addProcessingStep("No green images, synthetic green image from luminance images");
                  allfilesarr[channels.G].files = allfilesarr[channels.G].files.concat(allfilesarr[channels.L].files);
            }
            if (allfilesarr[channels.B].files.length == 0 && par.synthetic_missing_images.val) {
                  util.addProcessingStep("No blue images, synthetic blue image from luminance images");
                  allfilesarr[channels.B].files = allfilesarr[channels.B].files.concat(allfilesarr[channels.L].files);
            }
            if (par.RRGB_image.val) {
                  util.addProcessingStep("RRGB image, use R as L image");
                  console.writeln("L images " +  allfilesarr[channels.L].files.length);
                  console.writeln("R images " +  allfilesarr[channels.R].files.length);
                  allfilesarr[channels.L].files = [];
                  allfilesarr[channels.L].files = allfilesarr[channels.L].files.concat(allfilesarr[channels.R].files);
            }
      }

      // Update channel files.images array.  We find best image for a channel
      // and order it so that best image is first. Channel images are used
      // for image integration.
      updateFilesInfo(parent, L_images, allfilesarr[channels.L].files, 'L', filename_postfix);
      updateFilesInfo(parent, R_images, allfilesarr[channels.R].files, 'R', filename_postfix);
      updateFilesInfo(parent, G_images, allfilesarr[channels.G].files, 'G', filename_postfix);
      updateFilesInfo(parent, B_images, allfilesarr[channels.B].files, 'B', filename_postfix);
      updateFilesInfo(parent, H_images, allfilesarr[channels.H].files, 'H', filename_postfix);
      updateFilesInfo(parent, S_images, allfilesarr[channels.S].files, 'S', filename_postfix);
      updateFilesInfo(parent, O_images, allfilesarr[channels.O].files, 'O', filename_postfix);
      updateFilesInfo(parent, C_images, allfilesarr[channels.C].files, 'C', filename_postfix);

      if (C_images.images.length > 0) {
            // Color image
            if (L_images.images.length > 0) {
                  util.throwFatalError("Cannot mix color and luminance filter files");
            }
            if (R_images.images.length > 0) {
                  util.throwFatalError("Cannot mix color and red filter files");
            }
            if (B_images.images.length > 0) {
                  util.throwFatalError("Cannot mix color and blue filter files");
            }
            if (G_images.images.length > 0) {
                  util.throwFatalError("Cannot mix color and green filter files");
            }
      } else {
            if (par.monochrome_image.val) {
                  // Monochrome
                  if (L_images.images.length == 0) {
                        util.throwFatalError("No Luminance images found");
                  }
            } else if (rgb) {
                  // LRGB or RGB
                  if (R_images.images.length == 0 && !par.integrate_only.val && !par.image_weight_testing.val) {
                        util.throwFatalError("No Red images found");
                  }
                  if (B_images.images.length == 0 && !par.integrate_only.val && !par.image_weight_testing.val) {
                        util.throwFatalError("No Blue images found");
                  }
                  if (G_images.images.length == 0 && !par.integrate_only.val && !par.image_weight_testing.val) {
                        util.throwFatalError("No Green images found");
                  }
            }
            if (L_images.images.length > 0) {
                  // Use just RGB channels
                  is_luminance_images = true;
            }
      }
}

function isVariableChar(str) {
      return str.length === 1 && str.match(/[a-z0-9_]/i);
}

function add_missing_image(images, to)
{
      for (var i = 0; i < images.length; i++) {
            if (images[i] == to) {
                  break;
            }
      }
      if (i == images.length) {
            // not found, add to list
            images[images.length] = to;
      }
}

function ensureLightImages(ch, check_allfilesarr)
{
      for (var i = 0; i < check_allfilesarr.length; i++) {
            var filterFiles = check_allfilesarr[i].files;
            var filterName = check_allfilesarr[i].filter;
            if (filterName == ch) {
                  if (filterFiles.length == 0) {
                        util.throwFatalError("No " + ch + " images that are needed for PixelMath mapping");
                  }
                  break;
            }
      }
}

/* Replace tag "from" with real image name "to" with _map added to the end (H -> Integration_H_map) . 
 * Images names listed in the mapping are put into images array without _map added (Integration_H).
 */
function replaceMappingImageNames(mapping, from, to, images, check_allfilesarr)
{
      //console.writeln("replaceMappingImageNames in " + mapping + " from " + from + " to " + to);
      mapping = mapping.trim();
      var n = mapping.search(from);
      if (n == -1) {
            // not found
            //console.writeln("replaceMappingImageNames, " + from + " not found");
            return mapping;
      }
      if (mapping.length == 1) {
            // only char must be the one we are looking for
            //console.writeln("replaceMappingImageNames only one char")
            if (check_allfilesarr != null) {
                  ensureLightImages(from, check_allfilesarr);
            } else {
                  if (preprocessed_images == global.start_images.L_R_G_B_PROCESSED) {
                        add_missing_image(images, to + "_processed");
                  } else {
                        add_missing_image(images, to);
                  }
            }
            return to + "_map";
      }
      // loop until all occurrences are replaced
      console.writeln("replaceMappingImageNames scan " + mapping);
      for (var i = mapping.length; i > 0; i--) {
            // console.writeln("replaceMappingImageNames scan " + mapping);
            for (var n = 0; n < mapping.length; n++) {
                  if (mapping.substring(n, n+1) == from) {
                        var replace = true;
                        if (n > 0 && isVariableChar(mapping.substring(n-1, n))) {
                              // nothing to replace
                              //console.writeln("replaceMappingImageNames letter before " + from);
                              replace = false;
                        } else if (n < mapping.length-1 && isVariableChar(mapping.substring(n+1, n+2))) {
                              // nothing to replace
                              //console.writeln("replaceMappingImageNames letter after " + from);
                              replace = false;
                        }
                        if (replace) {
                              if (check_allfilesarr != null) {
                                    ensureLightImages(from, check_allfilesarr);
                              } else {
                                    if (preprocessed_images == global.start_images.L_R_G_B_PROCESSED) {
                                          var to_id = to + "_processed";
                                    } else {
                                          var to_id = to;
                                    }
                                    if (findWindowNoPrefixIf(to_id, global.run_auto_continue) == null) {
                                          util.throwFatalError("Could not find image window " + to_id + " that is needed for PixelMath mapping");
                                    }
                                    add_missing_image(images, to_id);
                              }
                              mapping = mapping.substring(0, n) + to + "_map" + mapping.substring(n+1);
                              //console.writeln("replaceMappingImageNames mapped to " + mapping);
                              break;
                        }
                  }
            }
            if (n == mapping.length) {
                  // all replaced
                  console.writeln("replaceMappingImageNames, mapped to " + mapping);
                  return mapping;
            }
      }
      console.writeln("replaceMappingImageNames, too many loop iterations, mapped to " + mapping);
      return mapping;
}

/* Get custom channel mapping and replace target images with real names.
 * Tag is changed to a real image name with _map added to the end (H -> Integration_H_map) . 
 * Images names listed in the mapping are put into images array without _map added (Integration_H).
 */
function mapCustomAndReplaceImageNames(targetChannel, images, check_allfilesarr)
{
      switch (targetChannel) {
            case 'R':
                  var mapping = par.custom_R_mapping.val;
                  break;
            case 'G':
                  var mapping = par.custom_G_mapping.val;
                  break;
            case 'B':
                  var mapping = par.custom_B_mapping.val;
                  break;
            case 'L':
                  var mapping = par.custom_L_mapping.val;
                  break;
            default:
                  console.writeln("ERROR: mapCustomAndReplaceImageNames " + targetChannel);
                  return null;
      }
      if (check_allfilesarr == null) {
            console.writeln("mapCustomAndReplaceImageNames " + targetChannel + " using " + mapping);
      }
      /* Replace letters with actual image identifiers. */
      mapping = replaceMappingImageNames(mapping, "L", ppar.win_prefix + "Integration_L", images, check_allfilesarr);
      mapping = replaceMappingImageNames(mapping, "R", ppar.win_prefix + "Integration_R", images, check_allfilesarr);
      mapping = replaceMappingImageNames(mapping, "G", ppar.win_prefix + "Integration_G", images, check_allfilesarr);
      mapping = replaceMappingImageNames(mapping, "B", ppar.win_prefix + "Integration_B", images, check_allfilesarr);
      mapping = replaceMappingImageNames(mapping, "H", ppar.win_prefix + "Integration_H", images, check_allfilesarr);
      mapping = replaceMappingImageNames(mapping, "S", ppar.win_prefix + "Integration_S", images, check_allfilesarr);
      mapping = replaceMappingImageNames(mapping, "O", ppar.win_prefix + "Integration_O", images, check_allfilesarr);

      if (check_allfilesarr == null) {
            console.writeln("mapCustomAndReplaceImageNames:converted mapping " + mapping);
      }

      return mapping;
}

/* Run single expression PixelMath and optionally create new image. */
function runPixelMathSingleMappingEx(id, mapping, createNewImage, symbols)
{
      util.addProcessingStepAndStatusInfo("Run PixelMath single mapping");

      var idWin = util.findWindow(id);
      if (idWin == null) {
            console.writeln("ERROR: No reference window found for PixelMath");
      }

      if (createNewImage) {
            var targetFITSKeywords = getTargetFITSKeywordsForPixelmath(idWin);
      }

      var P = new PixelMath;
      P.expression = mapping;
      if (symbols) {
            P.symbols = symbols;
      }
      P.createNewImage = createNewImage;
      P.showNewImage = false;
      P.newImageId = id + "_pm";

      idWin.mainView.beginProcess(UndoFlag_NoSwapFile);
      P.executeOn(idWin.mainView);
      idWin.mainView.endProcess();

      if (createNewImage) {
            setTargetFITSKeywordsForPixelmath(util.findWindow(P.newImageId), targetFITSKeywords);
      }

      return P.newImageId;
}

/* Run single expression PixelMath and create new image. */
function runPixelMathSingleMapping(id, mapping)
{
      return runPixelMathSingleMappingEx(id, mapping, true);
}

/* Run RGB channel combination using PixelMath. 
   If we have newId we create a new image. If newId is null we
   replace target image.
*/
function runPixelMathRGBMapping(newId, idWin, mapping_R, mapping_G, mapping_B)
{
      util.addProcessingStepAndStatusInfo("Run PixelMath RGB mapping");

      var reference_images = [ "Integration_H", "Integration_S", "Integration_O" ];

      for (var i = 0; i < reference_images.length && idWin == null; i++) {
            var refId = reference_images[i];
            if (preprocessed_images == global.start_images.L_R_G_B_PROCESSED) {
                  refId = refId + "_processed";
            } else {
                  refId = refId + "_map";
            }
            idWin = findWindowCheckBaseNameIf(refId, global.run_auto_continue);
      }
      if (idWin == null) {
            console.writeln("ERROR: No reference window found for PixelMath");
      }

      if (newId != null) {
            var targetFITSKeywords = getTargetFITSKeywordsForPixelmath(idWin);
      }

      var P = new PixelMath;
      P.expression = mapping_R;
      P.expression1 = mapping_G;
      P.expression2 = mapping_B;
      P.useSingleExpression = false;
      P.showNewImage = true;
      if (newId != null) {
            P.createNewImage = true;
            P.newImageId = newId;
      } else {
            P.createNewImage = false;
            P.newImageId = "";
      }
      P.newImageColorSpace = PixelMath.prototype.RGB;

      idWin.mainView.beginProcess(UndoFlag_NoSwapFile);
      P.executeOn(idWin.mainView);
      idWin.mainView.endProcess();

      if (newId != null) {
            setTargetFITSKeywordsForPixelmath(util.findWindow(newId), targetFITSKeywords);
      }

      return newId;
}

function linearFitArray(refimage, targetimages)
{
      console.writeln("linearFitArray");
      for (var i = 0; i < targetimages.length; i++) {
            if (targetimages[i] != refimage) {
                  runLinearFit(refimage, targetimages[i]);
            }
      }
}

function arrayFindImage(images, image)
{
      for (var i = 0; i < images.length; i++) {
            if (images[i] == image) {
                  return true;
            }
      }
      return false;
}

function arrayAppendCheckDuplicates(images, appimages)
{
      for (var i = 0; i < appimages.length; i++) {
            if (!arrayFindImage(images, appimages[i])) {
                  images[images.length] = appimages[i];
            }
      }
}

function findLinearFitHSOMapRefimage(images, suggestion)
{
      var refimage;
      console.writeln("findLinearFitHSOMapRefimage");
      if (suggestion == "Auto") {
            refimage = ppar.win_prefix + "Integration_H_map";
            if (arrayFindImage(images, refimage)) {
                  return(refimage);
            }
            refimage = ppar.win_prefix + "Integration_O_map";
            if (arrayFindImage(images, refimage)) {
                  return(refimage);
            }
            refimage = ppar.win_prefix + "Integration_S_map";
            if (arrayFindImage(images, refimage)) {
                  return(refimage);
            }
      } else {
            refimage = ppar.win_prefix + "Integration_" + suggestion + "_map";
            if (arrayFindImage(images, refimage)) {
                  return(refimage);
            }
            util.throwFatalError("Could not find linear fit reference image " + suggestion);
      }
      // Just pick something
      return(images[0]);
}

/* Process channel image for channel specific steps.
 * This is called from:
 *    mapLRGBchannels for normal LRGB images
 *    mapRGBchannel when mixing LRGB and narrowband
 *    customMapping for narrowband images
 */
function processChannelImage(image_id, is_luminance)
{
      console.writeln("processChannelImage " + image_id);
      if (image_id == null) {
            // could be true for luminance
            return;
      }
      if (par.ABE_before_channel_combination.val) {
            // Optionally do ABE on channel images
            run_ABE_before_channel_combination(image_id);
      }

      if (par.remove_stars_channel.val) {
            if (is_luminance) {
                  removeStars(util.findWindow(image_id), true, false, null, null, par.unscreen_stars.val);
            } else {
                  removeStars(util.findWindow(image_id), true, true, RGB_stars, null, par.unscreen_stars.val);
            }
      }
}

/* Copy images with _map name so we do not change the original
 * images (Integration_H -> Integration_H_map).
 */
function copyToMapImages(images)
{
      console.writeln("copyToMapImages");
      for (var i = 0; i < images.length; i++) {
            var copyname = util.ensure_win_prefix(images[i] + "_map");
            if (util.findWindow(copyname) == null) {
                  console.writeln("copy from " + images[i] + " to " + copyname);
                  util.copyWindow(
                        findWindowNoPrefixIf(images[i], global.run_auto_continue), 
                        copyname);
                  // crop
                  CropImageIf(util.findWindow(copyname), crop_truncate_amount);
            } else {
                  console.writeln("map image " + copyname + " already copied");
            }
            images[i] = copyname;
      }
}

function copyOneProcessedToMapImage(id)
{
      if (id == null) {
            return null;
      }

      var copyname = util.ensure_win_prefix(id.replace("_processed", "_map"));

      util.copyWindow(util.findWindow(id), copyname);

      return copyname;
}

function copyProcessedToMapImages(images)
{
      var copied_images = [];
      for (var i = 0; i < images.length; i++) {
            copied_images[i] = copyOneProcessedToMapImage(images[i]);
      }
      return copied_images;
}

function mapRGBchannel(images, refimage, mapping, is_luminance)
{
      console.writeln("mapRGBchannel, refimage " + refimage + ", mapping " + mapping);
      // Copy files to _map names to avoid changing original files.
      // We close these images at the end as next call may want to use the
      // same image names.
      copyToMapImages(images);

      for (var i = 0; i < images.length; i++) {
            processChannelImage(images[i], is_luminance, false);
      }
      refimage = refimage + "_map";
      console.writeln("mapRGBchannel, new refimage " + refimage);
      if (util.findWindow(refimage) == null) {
            refimage = images[0];
            console.writeln("mapRGBchannel, refimage from images[0] " + refimage);
      }
      if (images.length > 1) {
            // run linear fit to match images before PixelMath
            linearFitArray(refimage, images);
      }
      // create combined image
      var target_image = runPixelMathSingleMapping(refimage, mapping);
      // close all copied images as we may want use the same names in the next RGB round
      closeAllWindowsFromArray(images);
      return target_image;
}

function checkNoiseReduction(image, phase)
{
      let noise_reduction = false;

      if (par.skip_noise_reduction.val) {
            console.writeln("checkNoiseReduction, " + image + ", " + phase, ", skip noise_reduction");
            return false;
      }
      switch (image) {
            case 'L':
                  if (par.luminance_noise_reduction_strength.val == 0) {
                        console.writeln("checkNoiseReduction, " + image + ", " + phase, ", luminance_noise_reduction_strength == 0");
                        return false;
                  }
                  switch (phase) {
                        case 'channel':
                              noise_reduction = par.channel_noise_reduction.val;
                              break;
                        case 'linear':
                              noise_reduction = par.combined_image_noise_reduction.val;
                              break;
                        case 'nonlinear':
                              noise_reduction = par.non_linear_noise_reduction.val;
                              break;
                        default:
                              util.throwFatalError("checkNoiseReduction bad phase " + phase + " for " + image + " image");
                  }
                  break;
            case 'RGB':
                  if (par.noise_reduction_strength.val == 0) {
                        console.writeln("checkNoiseReduction, " + image + ", " + phase, ", noise_reduction_strength == 0");
                        return false;
                  }
                  switch (phase) {
                        case 'channel':
                              noise_reduction = par.channel_noise_reduction.val;
                              break;
                        case 'linear':
                              noise_reduction = par.combined_image_noise_reduction.val;
                              break;
                        case 'nonlinear':
                              noise_reduction = par.non_linear_noise_reduction.val;
                              break;
                        default:
                              util.throwFatalError("checkNoiseReduction bad phase " + phase + " for " + image + " image");
                  }
                  break;
            case 'color':
                  if (par.noise_reduction_strength.val == 0) {
                        console.writeln("checkNoiseReduction, " + image + ", " + phase, ", noise_reduction_strength == 0");
                        return false;
                  }
                  switch (phase) {
                        case 'linear':
                              noise_reduction = par.channel_noise_reduction.val || par.combined_image_noise_reduction.val;
                              break;
                        case 'nonlinear':
                              noise_reduction = par.non_linear_noise_reduction.val;
                              break;
                        default:
                              util.throwFatalError("checkNoiseReduction bad phase " + phase + " for " + image + " image");
                  }
                  break;
            default:
                  util.throwFatalError("checkNoiseReduction bad parameters, image " + image + ", phase " + phase);
      }
      console.writeln("checkNoiseReduction, " + image + ", " + phase, ", noise_reduction " + noise_reduction);
      return noise_reduction;
}

function luminanceNoiseReduction(imgWin, maskWin)
{
      if (imgWin == null) {
            return;
      }

      util.addProcessingStepAndStatusInfo("Reduce noise on luminance image " + imgWin.mainView.id);

      if (maskWin == null && !par.use_noisexterminator.val) {
            /* Create a temporary mask. */
            var temp_mask_win = CreateNewTempMaskFromLinearWin(imgWin, false);
            maskWin = temp_mask_win;
      } else {
            var temp_mask_win = null;
      }

      runNoiseReductionEx(imgWin, maskWin, par.luminance_noise_reduction_strength.val, true);
      guiUpdatePreviewWin(imgWin);

      if (temp_mask_win != null) {
            util.forceCloseOneWindow(temp_mask_win);
      }
}

function channelNoiseReduction(image_id)
{
      util.addProcessingStepAndStatusInfo("Reduce noise on channel image " + image_id);

      var image_win = util.findWindow(image_id);

      if (!par.use_noisexterminator.val) {
            /* Create a temporary mask. */
            var temp_mask_win = CreateNewTempMaskFromLinearWin(image_win, false);
      } else {
            var temp_mask_win = null;
      }

      runNoiseReductionEx(image_win, temp_mask_win, par.noise_reduction_strength.val, true);

      guiUpdatePreviewWin(image_win);

      if (temp_mask_win != null) {
            util.forceCloseOneWindow(temp_mask_win);
      }
}

function createNewStarXTerminator(star_mask, linear_data)
{
      try {
            console.writeln("createNewStarXTerminator, linear_data " + linear_data + ", star_mask "+ star_mask);
            var P = new StarXTerminator;
            // P.linear = linear_data;    Not needed in v2.0.0
            P.stars = star_mask;
      } catch(err) {
            console.criticalln("StarXTerminator failed");
            console.criticalln(err);
            util.addProcessingStep("Maybe StarXTerminator is not installed, AI is missing or platform is not supported");
            util.throwFatalError("StarXTerminator failed");
      }
      return P;
}

function createNewStarNet(star_mask)
{
      try {
            var P = new StarNet;
            P.stride = StarNet.prototype.Stride_128;
            P.mask = star_mask;
      } catch(err) {
            console.criticalln("StarNet failed");
            console.criticalln(err);
            util.addProcessingStep("Maybe weight files are missing or platform is not supported");
            util.throwFatalError("StarNet failed");
      }
      return P;
}

function createNewStarNet2(star_mask)
{
      try {
            var P = new StarNet2;
            P.stride = StarNet2.prototype.itemOne;
            P.mask = star_mask;
      } catch(err) {
            console.criticalln("StarNet2 failed");
            console.criticalln(err);
            util.addProcessingStep("Maybe StarNet2 is not installed, weight files are missing or platform is not supported");
            util.throwFatalError("StarNet2 failed");
      }
      return P;
}

function getStarMaskWin(imgWin, name)
{
      if (par.use_starxterminator.val) {
            var win_id = imgWin.mainView.id + "_stars";
            var win = util.findWindow(win_id);
            console.writeln("getStarMaskWin win_id " + win_id);
            if (win == null) {
                  util.throwFatalError("Could not find StarXTerminator stars window " + win_id);
            }
            util.windowRename(win_id, name);
      } else {
            console.writeln("getStarMaskWin win_id " + ImageWindow.activeWindow.mainView.id);
            var win = ImageWindow.activeWindow;
            util.windowRename(win.mainView.id, name);
      }
      console.writeln("getStarMaskWin completed " + name);
      return win;
}

// Remove stars from an image. We save star mask for later processing and combining
// for star image.
function removeStars(imgWin, linear_data, save_stars, save_array, stars_image_name, use_unscreen)
{
      util.addProcessingStepAndStatusInfo("Remove stars");

      if (linear_data && use_unscreen) {
            console.writeln("Not using unscreen for linear data");
      }

      var create_star_mask = save_stars;
      if (save_stars && use_unscreen) {
            var originalwin_copy = util.copyWindow(imgWin, util.ensure_win_prefix(imgWin.mainView.id + "_tmp_original"));
            create_star_mask = false;
      }

      if (par.use_starxterminator.val) {
            util.addProcessingStep("Run StarXTerminator on " + imgWin.mainView.id);
            var P = createNewStarXTerminator(create_star_mask, linear_data);
      } else if (linear_data) {
            util.throwFatalError("StarNet/StarNet2 cannot be used to remove stars while image is still in linear stage.");
      } else if (par.use_starnet2.val) {
            util.addProcessingStep("Run StarNet2 on " + imgWin.mainView.id);
            var P = createNewStarNet2(create_star_mask);
      } else {
            util.addProcessingStep("Run StarNet on " + imgWin.mainView.id);
            var P = createNewStarNet(create_star_mask);
      }

      /* Execute on image.
       */
      imgWin.mainView.beginProcess(UndoFlag_NoSwapFile);

      P.executeOn(imgWin.mainView, false);
      
      imgWin.mainView.endProcess();

      if (par.use_starxterminator.val) {
            console.writeln("StarXTerminator completed");
      }

      guiUpdatePreviewWin(imgWin);

      if (save_stars) {
            if (stars_image_name == null) {
                  stars_image_name = imgWin.mainView.id + "_stars";
            }
            if (use_unscreen) {
                  // Use unscreen method to get stars image as described by Russell Croman
                  console.writeln("removeStars use unscreen to get star image");
                  var id = runPixelMathSingleMappingEx(
                              imgWin.mainView.id,
                              "~((~" + originalwin_copy.mainView.id + ")/(~" + imgWin.mainView.id + "))",
                              true);
                  var star_win = util.findWindow(id);
                  console.writeln("removeStars, rename " + id + " to " + stars_image_name);
                  util.windowRename(id, stars_image_name);
                  util.forceCloseOneWindow(originalwin_copy);
            } else {
                  var star_win = getStarMaskWin(imgWin, stars_image_name);
            }
            if (save_array != null) {
                  save_array[save_array.length] = star_win.mainView.id;
            }
            console.writeln("Removed stars from " + imgWin.mainView.id + " and created stars image " + star_win.mainView.id);
            return star_win;
      } else {
            return null;
      }
}

/* Do custom mapping of channels to RGB image. We do some of the same 
 * stuff here as in CombineRGBimage.
 */
function customMapping(RGBmapping, check_allfilesarr)
{
      if (check_allfilesarr != null) {
            util.addProcessingStep("Check custom mapping");
      } else {
            util.addProcessingStepAndStatusInfo("Custom mapping");
      }

      /* Get updated mapping strings and collect images
       * used in mapping.
       */
      var L_images = [];
      var R_images = [];
      var G_images = [];
      var B_images = [];

      /* Get a modified mapping with tags replaced with real image names.
       */
      if (!narrowband) {
            var luminance_mapping = mapCustomAndReplaceImageNames('L', L_images, check_allfilesarr);
      }
      var red_mapping = mapCustomAndReplaceImageNames('R', R_images, check_allfilesarr);
      var green_mapping = mapCustomAndReplaceImageNames('G', G_images, check_allfilesarr);
      var blue_mapping = mapCustomAndReplaceImageNames('B', B_images, check_allfilesarr);

      if (check_allfilesarr != null) {
            return null;
      }

      if (narrowband) {
            /* For narrowband we have two options:
             *
             * 1. Do PixelMath mapping in linear format.
             *    https://jonrista.com/the-astrophotographers-guide/PixInsights/narrow-band-combinations-with-pixelmath-hoo/
             * 2. We do auto-stretch of images before PixelMath. Stretch is done to make
             *    images roughly match with each other. In this case we have already stretched image.
             *    https://www.lightvortexastronomy.com/tutorial-narrowband-bicolour-palette-combinations.html
             *    https://www.lightvortexastronomy.com/tutorial-narrowband-hubble-palette.html
             * 
             * User can choose in the GUI interface which one to use.
             */
            var images = [];
            arrayAppendCheckDuplicates(images, R_images);
            arrayAppendCheckDuplicates(images, G_images);
            arrayAppendCheckDuplicates(images, B_images);

            /* Make a copy so we do not change the original integrated images.
             * Here we create image with _map added to the end 
             * (Integration_H -> Integration_H_map).
             */
            if (autocontinue_processed_channel_images.image_ids.length > 0) {
                  images = copyProcessedToMapImages(autocontinue_processed_channel_images.image_ids);
            } else {
                  copyToMapImages(images);

                  for (var i = 0; i < images.length; i++) {
                        processChannelImage(images[i], false, false);
                  }

                  var narrowband_linear_fit = par.narrowband_linear_fit.val;
                  if (narrowband_linear_fit == "Auto") {
                        /* By default we do not do linear fit
                         * if we stretch with STF. If we stretch
                         * with MaskedStretch we use linear
                         * fit to balance channels better.
                         */
                        if (par.image_stretching.val == 'Auto STF'
                            || par.image_stretching.val == 'Histogram stretch')
                        {
                              console.writeln("Narrowband linear fit is Auto and stretching is " + par.image_stretching.val + ", do not use linear fit.");
                              narrowband_linear_fit = "None";
                        } else {
                              console.writeln("Narrowband linear fit is Auto and stretching is " + par.image_stretching.val + ", use linear fit.");
                        }
                  }
                  var mapping_on_nonlinear_data = par.mapping_on_nonlinear_data.val;

                  if (narrowband_linear_fit != "None") {
                        /* Do a linear fit of images before PixelMath and before possible
                        * stretching. We do this on both cases, linear and stretched.
                        */
                        var refimage = findLinearFitHSOMapRefimage(images, narrowband_linear_fit);
                        linearFitArray(refimage, images);
                  }
                  if (checkNoiseReduction('RGB', 'channel')) {
                        // Do noise reduction after linear fit.
                        for (var i = 0; i < images.length; i++) {
                              channelNoiseReduction(images[i]);
                        }
                        RGBmapping.channel_noise_reduction = true;
                  }
                  for (var i = 0; i < images.length; i++) {
                        saveProcessedChannelImage(images[i]);
                  }
            }
            if (!mapping_on_nonlinear_data) {
                  /* We run PixelMath using linear images. 
                   */
                  util.addProcessingStep("Custom mapping, linear narrowband images");
            } else {
                  /* Stretch images to non-linear before combining with PixelMath.
                   */
                  util.addProcessingStep("Custom mapping, stretched narrowband images");
                  if (par.remove_stars_before_stretch.val) {
                        util.throwFatalError("Narrowband mapping using non-linear data is not compatible with Remove stars early");
                  }
                  if (!par.skip_sharpening.val && par.use_blurxterminator.val) {
                        /* For now, we support BlurXTerminator only for linear data. For non-linear data
                         * extra processing option can be used.
                         */
                        util.throwFatalError("Narrowband mapping using non-linear data is not compatible with BlurXTerminator");
                  }
                  for (var i = 0; i < images.length; i++) {
                        runHistogramTransform(util.findWindow(images[i]), null, false, 'RGB');
                  }
                  RGBmapping.stretched = true;
            }

            /* Run PixelMath to create a combined RGB image.
             */
            RGB_win_id = runPixelMathRGBMapping(ppar.win_prefix + "Integration_RGB", null, red_mapping, green_mapping, blue_mapping);

            RGBmapping.combined = true;

            RGB_win = util.findWindow(RGB_win_id);
            guiUpdatePreviewWin(RGB_win);

            if (par.remove_stars_stretched.val && RGBmapping.stretched) {
                  RGB_stars_HT_win = removeStars(RGB_win, false, true, null, null, par.unscreen_stars.val);
                  if (!is_luminance_images) {
                        // use starless RGB image as mask
                        ColorEnsureMask(RGB_win_id, true, true);
                  }
            }

            RGB_win.show();
            util.addScriptWindow(RGB_win_id);

      } else {
            // We have both RGB and narrowband, do custom mapping on individual channels.
            // Here we just create different combined channels in linear format and
            // then continue as normal RGB processing.
            // If we have multiple images in mapping we use linear fit to match
            // them before PixelMath.
            util.addProcessingStep("RGB and narrowband mapping, create LRGB channel images and continue with RGB workflow");
            if (autocontinue_processed_channel_images.rgb) {
                  util.throwFatalError("Never should have RGB+Narrowband with mapped images.");
            }
            if (par.custom_L_mapping.val != '') {
                  luminance_id = mapRGBchannel(L_images, ppar.win_prefix + "Integration_L", luminance_mapping, true);
                  guiUpdatePreviewId(luminance_id);
                  is_luminance_images = true;
            }

            red_id = mapRGBchannel(R_images, ppar.win_prefix + "Integration_R", red_mapping, false);
            green_id = mapRGBchannel(G_images, ppar.win_prefix + "Integration_G", green_mapping, false);
            blue_id = mapRGBchannel(B_images, ppar.win_prefix + "Integration_B", blue_mapping, false);
      }

      return RGBmapping;
}

function isCustomMapping(narrowband)
{
      return narrowband && !par.use_RGBNB_Mapping.val;
}

/* Copy id to _map name if id not null. This is done to avoid
 * modifying the original image.
 */
function copyToMapIf(id)
{
      if (id != null) {
            var new_id = util.ensure_win_prefix(id + "_map");
            util.copyWindow(util.findWindow(id), new_id);
            // crop
            CropImageIf(util.findWindow(new_id), crop_truncate_amount);
            return new_id;
      } else {
            return id;
      }
}

/* Copy Integration_RGB_color to Integration_RGB so we do not
 * modify the original image.
 */ 
function mapColorImage()
{
      RGB_win_id = util.ensure_win_prefix("Integration_RGB");
      util.copyWindow(util.findWindow(RGB_color_id), RGB_win_id);
      RGB_win = ImageWindow.windowById(RGB_win_id);
      // crop
      CropImageIf(RGB_win, crop_truncate_amount);
      RGB_win.show();
}

/* Map RGB channels. We do PixelMath mapping here if we have narrowband images.
 */
function mapLRGBchannels(RGBmapping)
{
      var rgb = R_id != null || G_id != null || B_id != null || autocontinue_processed_channel_images.rgb;
      narrowband = H_id != null || S_id != null || O_id != null || 
                   par.force_narrowband_mapping.val || autocontinue_processed_channel_images.narrowband;
      var custom_mapping = isCustomMapping(narrowband);

      if (rgb && narrowband && !par.force_narrowband_mapping.val) {
            util.addProcessingStep("There are both RGB and narrowband data, processing as RGB image");
            narrowband = false;
      }
      if (narrowband) {
            util.addProcessingStep("Processing as narrowband image");
      }

      util.addProcessingStepAndStatusInfo("Map LRGB channels");

      if (custom_mapping) {
            util.addProcessingStep("Narrowband files, use custom mapping");
            RGBmapping = customMapping(RGBmapping, null);

      } else {
            util.addProcessingStep("Normal RGB processing");

            if (autocontinue_processed_channel_images.rgb) {
                  /* Use already mapped images. */
                  console.writeln("Use processed channel images");
                  luminance_id = copyOneProcessedToMapImage(autocontinue_processed_channel_images.luminance_id);
                  red_id = copyOneProcessedToMapImage(autocontinue_processed_channel_images.image_ids[0]);
                  green_id = copyOneProcessedToMapImage(autocontinue_processed_channel_images.image_ids[1]);
                  blue_id = copyOneProcessedToMapImage(autocontinue_processed_channel_images.image_ids[2]);

                  RGBmapping.channel_noise_reduction = true;

            } else {
                  console.writeln("Make a copy of original windows.");
                  if (luminance_id == null) {
                        // We may already have copied L_id so we do it
                        // here only if it is not copied yet.
                        luminance_id = copyToMapIf(L_id);
                  }
                  red_id = copyToMapIf(R_id);
                  green_id = copyToMapIf(G_id);
                  blue_id = copyToMapIf(B_id);

                  processChannelImage(luminance_id, true, false);
                  processChannelImage(red_id, false, false);
                  processChannelImage(green_id, false, false);
                  processChannelImage(blue_id, false, false);
            }
      }
      return RGBmapping;
}

// add as a first item, first item should be the best image
function insert_image_for_integrate(images, new_image)
{
      console.writeln("insert_image_for_integrate " + new_image);
      images.unshift(new Array(2));
      images[0][0] = true;                // enabled
      images[0][1] = new_image;           // path
}

// add to the end
function append_image_for_integrate(images, new_image)
{
      console.writeln("append_image_for_integrate " + new_image);
      var len = images.length;
      images[len] = [];
      images[len][0] = true;
      images[len][1] = new_image;
}

/* After SubframeSelector run StarAlignment on *_a.xisf files.
   The output will be *_a_r.xisf files.
*/
function runStarAlignment(imagetable, refImage)
{
      var alignedFiles;

      util.addProcessingStepAndStatusInfo("Star alignment reference image " + refImage);
      console.writeln("runStarAlignment input[0] " + imagetable[0]);

      var targets = [];

      for (var i = 0; i < imagetable.length; i++) {
            targets[targets.length] = [ true, true, imagetable[i] ];
      }

      var P = new StarAlignment;
      P.sensitivity = par.staralignment_sensitivity.val;                                  // default 0.50
      P.maxStarDistortion = par.staralignment_maxstarsdistortion.val;                     // default 0.6
      P.structureLayers = par.staralignment_structurelayers.val;                          // default 5
      P.noiseReductionFilterRadius = par.staralignment_noisereductionfilterradius.val;    // default 0
      if (par.use_drizzle.val) {
            P.generateDrizzleData = true; /* Generate .xdrz files. */
      } else {
            P.generateDrizzleData = false;
      }
      P.outputDirectory = global.outputRootDir + global.AutoOutputDir;
      P.referenceImage = refImage;
      P.referenceIsFile = true;
      P.targets = targets;
      P.overwriteExistingFiles = true;

      P.executeGlobal();

      alignedFiles = fileNamesFromOutputData(P.outputData);

      util.addProcessingStep("runStarAlignment, " + alignedFiles.length + " files");
      console.writeln("output[0] " + alignedFiles[0]);

      global.star_alignment_image = refImage;

      return alignedFiles;
}

function getWindowSizeFromFilename(filename)
{
      var imageWindows = ImageWindow.open(filename);
      if (imageWindows == null || imageWindows.length != 1) {
            return [0, 0];
      }
      var imageWindow = imageWindows[0];
      if (imageWindow == null) {
            return [0, 0];
      }
      
      var ret = [ imageWindow.mainView.image.width, imageWindow.mainView.image.height ];

      imageWindow.forceClose();

      return ret;
}

function getLocalNormalizationScale(filename, defscale)
{
      var wh = getWindowSizeFromFilename(filename);
      var mindim = Math.min(wh[0], wh[1]);
      if (mindim >= 4 * defscale) {
            // keep default
            return 0;
      }
      // decrease scale
      var scale = defscale;
      while (mindim < 4 * scale) {
            scale = scale / 2;
      }
      console.writeln("getLocalNormalizationScale:filename " + filename + ", scale " + scale + ", defscale " + defscale + ", mindim " + mindim);
      return scale;
}

function runLocalNormalization(imagetable, refImage, filter)
{
      if (imagetable.length == 0) {
            // No new files are needed
            util.addProcessingStep("No files for local normalization for filter " + filter);
            return;
      }

      util.addProcessingStepAndStatusInfo("Local normalization, filter " + filter + ", reference image " + refImage);

      var targets = [];

      for (var i = 0; i < imagetable.length; i++) {
            console.writeln("runLocalNormalization, check for duplicates imagetable["+i+"][1]=" + imagetable[i][1]);
            var add_file = true;
            if (imagetable.length <= 4) {
                  // we may have duplicates, filter them out
                  for (var j = 0; j < targets.length; j++) {
                        if (targets[j][1] == imagetable[i][1]) {
                              console.writeln("runLocalNormalization, remove duplicate " +imagetable[i][1]);
                              add_file = false;
                              break;
                        }
                  }
            }
            // we may have duplicates, filter them out
            for (var j = 0; j < targets.length; j++) {
                  if (targets[j][1] == imagetable[i][1]) {
                        console.writeln("runLocalNormalization, remove duplicate " + imagetable[i][1]);
                        add_file = false;
                        break;
                  }
            }
            if (add_file && par.start_from_imageintegration.val) {
                  // If we are starting from image integration then we
                  // use existing .xnml files.
                  var xnml_file = imagetable[i][1].replace(".xisf", ".xnml");
                  if (File.exists(xnml_file)) {
                        add_file = false;
                  }
            }
            if (add_file) {
                  targets[targets.length] = [ true, imagetable[i][1] ];
                  console.writeln("runLocalNormalization, add targets["+targets.length+"][1]=" + targets[targets.length-1][1]);
            }
      }
      if (targets.length == 0) {
            // No new files are needed
            util.addProcessingStep("Using existing local normalization files");
            return;
      }


      var P = new LocalNormalization;
      var scale = getLocalNormalizationScale(refImage, P.scale);
      if (scale != 0) {
            P.scale = scale;
      }
      P.referencePathOrViewId = refImage;
      if (global.pixinsight_version_num >= 1080900) {
            P.referenceIsView = false;
      }
      P.targetItems = targets;            // [ enabled, image ]
      P.outputDirectory = global.outputRootDir + global.AutoOutputDir;
      P.overwriteExistingFiles = true;

      P.executeGlobal();
}

function runLinearFit(refViewId, targetId)
{
      util.addProcessingStepAndStatusInfo("Run linear fit on " + targetId + " using " + refViewId + " as reference");
      if (refViewId == null || targetId == null) {
            util.throwFatalError("No image for linear fit, maybe some previous step like star alignment failed");
      }
      linear_fit_done = true;
      var targetWin = ImageWindow.windowById(targetId);
      var P = new LinearFit;
      P.referenceViewId = refViewId;

      targetWin.mainView.beginProcess(UndoFlag_NoSwapFile);
      P.executeOn(targetWin.mainView);
      targetWin.mainView.endProcess();
}

function runDrizzleIntegration(images, name, local_normalization)
{
      util.addProcessingStepAndStatusInfo("Run DrizzleIntegration");

      var drizzleImages = [];
      for (var i = 0; i < images.length; i++) {
            drizzleImages[i] = [];
            drizzleImages[i][0] = images[i][0];                                 // enabled
            drizzleImages[i][1] = images[i][1].replace(".xisf", ".xdrz");       // drizzlePath
            if (local_normalization) {
                  drizzleImages[i][2] = images[i][1].replace(".xisf", ".xnml"); // localNormalizationDataPath
            } else {
                  drizzleImages[i][2] = "";                                     // localNormalizationDataPath
            }
      }

      var P = new DrizzleIntegration;
      P.inputData = drizzleImages; // [ enabled, path, localNormalizationDataPath ]
      P.enableLocalNormalization = local_normalization;

      P.executeGlobal();

      util.closeOneWindow(P.weightImageId);

      var new_name = util.windowRename(P.integrationImageId, ppar.win_prefix + "Integration_" + name);
      guiUpdatePreviewId(new_name);
      //util.addScriptWindow(new_name);
      return new_name;
}

function getRejectionAlgorithm(numimages)
{
      if (par.use_clipping.val == 'None') {
            util.addProcessingStep("Using no rejection");
            return ImageIntegration.prototype.NoRejection;
      } else if (par.use_clipping.val == 'Percentile') {
            util.addProcessingStep("Using Percentile clip for rejection");
            return ImageIntegration.prototype.PercentileClip;
      } else if (par.use_clipping.val == 'Sigma') {
            util.addProcessingStep("Using Sigma clip for rejection");
            return ImageIntegration.prototype.SigmaClip;
      } else if (par.use_clipping.val == 'Winsorised sigma') {
            util.addProcessingStep("Using Winsorised sigma clip for rejection");
            return ImageIntegration.prototype.WinsorizedSigmaClip;
      } else if (par.use_clipping.val == 'Averaged sigma') {
            util.addProcessingStep("Using Averaged sigma clip for rejection");
            return ImageIntegration.prototype.AveragedSigmaClip;
      } else if (par.use_clipping.val == 'Linear fit') {
            util.addProcessingStep("Using Linear fit clip for rejection");
            return ImageIntegration.prototype.LinearFit;
      } else if (par.use_clipping.val == 'ESD') {
            util.addProcessingStep("Using ESD clip for rejection");
            return ImageIntegration.prototype.Rejection_ESD;
      } else if (par.use_clipping.val == 'Auto2') {
            /* In theory these should be good choices but sometime give much more uneven
             * highlights than Sigma.
             */
            if (numimages < 8) {
                  util.addProcessingStep("Auto2 using Percentile clip for rejection");
                  return ImageIntegration.prototype.PercentileClip;
            } else if (numimages <= 10) {
                  util.addProcessingStep("Auto2 using Sigma clip for rejection");
                  return ImageIntegration.prototype.SigmaClip;
            } else if (numimages < 20) {
                  util.addProcessingStep("Auto2 using Winsorised sigma clip for rejection");
                  return ImageIntegration.prototype.WinsorizedSigmaClip;
            } else if (numimages < 25 || ImageIntegration.prototype.Rejection_ESD === undefined) {
                  util.addProcessingStep("Auto2 using Linear fit clip for rejection");
                  return ImageIntegration.prototype.LinearFit;
            } else {
                  util.addProcessingStep("Auto2 using ESD clip for rejection");
                  return ImageIntegration.prototype.Rejection_ESD;
            }
      } else {
            /* par.use_clipping.val == 'Auto1' */
            if (numimages < 8) {
                  util.addProcessingStep("Auto1 using Percentile clip for rejection");
                  return ImageIntegration.prototype.PercentileClip;
            } else {
                  util.addProcessingStep("Auto1 using Sigma clip for rejection");
                  return ImageIntegration.prototype.SigmaClip;
            }
      }
}

function ensureThreeImages(images)
{
      if (images.length == 1) {
            // Add existing image twice so we have three images
            append_image_for_integrate(images, images[0][1]);
            append_image_for_integrate(images, images[0][1]);
      } else if (images.length == 2) {
            // Duplicate first images which should be a better one
            append_image_for_integrate(images, images[0][1]);
      }
}

function runImageIntegrationEx(images, name, local_normalization)
{
      var P = new ImageIntegration;

      P.images = images; // [ enabled, path, drizzlePath, localNormalizationDataPath ]
      if (ssweight_set && par.use_imageintegration_ssweight.val) {
            util.addProcessingStep("Using SSWEIGHT for ImageIntegration weightMode");
            P.weightMode = ImageIntegration.prototype.KeywordWeight;
            P.weightKeyword = "SSWEIGHT";
      }
      if (local_normalization) {
            util.addProcessingStep("Using LocalNormalization for ImageIntegration normalization");
            P.normalization = ImageIntegration.prototype.LocalNormalization;
      } else if (par.imageintegration_normalization.val == 'Additive') {
            util.addProcessingStep("Using AdditiveWithScaling for ImageIntegration normalization");
            P.normalization = ImageIntegration.prototype.AdditiveWithScaling;
      } else if (par.imageintegration_normalization.val == 'Adaptive') {
            util.addProcessingStep("Using AdaptiveNormalization for ImageIntegration normalization");
            P.normalization = ImageIntegration.prototype.AdaptiveNormalization;
      } else {
            util.addProcessingStep("Using NoNormalization for ImageIntegration normalization");
            P.normalization = ImageIntegration.prototype.NoNormalization;
      }
      if (name == 'LDD') {
            // Integration for LDDEngine, do not use rejection
            P.rejection = ImageIntegration.prototype.NoRejection;
      } else {
            P.rejection = getRejectionAlgorithm(images.length);
      }
      if (local_normalization) {
            P.rejectionNormalization = ImageIntegration.prototype.LocalRejectionNormalization;
      } else if (0 && par.imageintegration_normalization.val == 'Adaptive') {
            // Using AdaptiveRejectionNormalization seem to abort ImageIntegration with bad data sets
            P.rejectionNormalization = ImageIntegration.prototype.AdaptiveRejectionNormalization;
      } else {
            P.rejectionNormalization = ImageIntegration.prototype.Scale;
      }
      P.clipLow = !par.skip_imageintegration_clipping.val;            // def: true
      P.clipHigh = !par.skip_imageintegration_clipping.val;           // def: true
      P.rangeClipLow = !par.skip_imageintegration_clipping.val;       // def: true
      if (name == 'LDD') {
            P.generateDrizzleData = false;
      } else {
            P.generateDrizzleData = par.use_drizzle.val || par.generate_xdrz.val;
      }
      P.pcClipLow = par.percentile_low.val;
      P.pcClipHigh = par.percentile_high.val;
      P.sigmaLow = par.sigma_low.val;
      P.sigmaHigh = par.sigma_high.val;
      P.winsorizationCutoff = par.winsorised_cutoff.val;
      P.linearFitLow = par.linearfit_low.val;
      P.linearFitHigh = par.linearfit_high.val;
      P.esdOutliersFraction = par.ESD_outliers.val;
      P.esdAlpha = par.ESD_significance.val;
      // P.esdLowRelaxation = par.ESD_lowrelaxation.val; deprecated, use default for old version

      P.executeGlobal();

      util.closeOneWindow(P.highRejectionMapImageId);
      util.closeOneWindow(P.lowRejectionMapImageId);
      util.closeOneWindow(P.slopeMapImageId);

      if (par.use_drizzle.val && name != 'LDD') {
            guiUpdatePreviewId(P.integrationImageId);
            util.closeOneWindow(P.integrationImageId);
            return runDrizzleIntegration(images, name, local_normalization);
      } else {
            var new_name = util.windowRename(P.integrationImageId, ppar.win_prefix + "Integration_" + name);
            console.writeln("runImageIntegrationEx completed, new name " + new_name);
            guiUpdatePreviewId(new_name);
            return new_name
      }
}

function runImageIntegrationNormalized(images, best_image, name)
{
      util.addProcessingStepAndStatusInfo("ImageIntegration with LocalNormalization");

      runLocalNormalization(images, best_image, name);

      console.writeln("Using local normalized data in image integration");
      
      var norm_images = [];
      for (var i = 0; i < images.length; i++) {
            var oneimage = [];
            oneimage[0] = true;                                   // enabled
            oneimage[1] = images[i][1];                           // path
            if (par.use_drizzle.val) {
                  oneimage[2] = images[i][1].replace(".xisf", ".xdrz"); // drizzlePath
            } else {
                  oneimage[2] = "";                                     // drizzlePath
            }
            oneimage[3] = images[i][1].replace(".xisf", ".xnml");    // localNormalizationDataPath
            norm_images[norm_images.length] = oneimage;
      }
      console.writeln("runImageIntegrationNormalized, " + norm_images[0][1] + ", " + norm_images[0][3]);

      return runImageIntegrationEx(norm_images, name, true);
}

function runImageIntegration(channel_images, name)
{
      var images = channel_images.images;
      if (images == null || images.length == 0) {
            return null;
      }
      util.addProcessingStepAndStatusInfo("Image " + name + " integration on " + images.length + " files");

      ensureThreeImages(images);

      if (!par.local_normalization.val || name == 'LDD') {
            if (par.use_drizzle.val) {
                  var drizzleImages = [];
                  for (var i = 0; i < images.length; i++) {
                        drizzleImages[i] = [];
                        drizzleImages[i][0] = images[i][0];      // enabled
                        drizzleImages[i][1] = images[i][1];      // path
                        drizzleImages[i][2] = images[i][1].replace(".xisf", ".xdrz"); // drizzlePath
                  }
                  var integration_images = drizzleImages;
            } else {
                  var integration_images = images;
            }

            var image_id = runImageIntegrationEx(integration_images, name, false);

      } else {
            var image_id = runImageIntegrationNormalized(images, channel_images.best_image, name);
      }
      return image_id;
}

function runImageIntegrationForCrop(images)
{
      console.noteln("ImageIntegration to find area common to all images");

      var P = new ImageIntegration;

      // The commented properties are normally defaults, not set because the defults could
      // be changed by the developper of ImageIntegration and should not impact this process
      // (hopefully).
      P.images = images; // [ enabled, path, drizzlePath, localNormalizationDataPath ]
      // P.inputHints = "fits-keywords normalize raw cfa signed-is-physical"; //Default, maybe shoulsd forcce normalize
      P.combination = ImageIntegration.prototype.Minimum;
      // P.weightMode = ImageIntegration.prototype.PSFSignalWeight;
      // P.weightKeyword = "";
      // P.weightScale = ImageIntegration.prototype.WeightScale_BWMV;
      // P.csvWeights = "";
      // P.adaptiveGridSize = 16;
      // P.adaptiveNoScale = false;
      P.ignoreNoiseKeywords = true; // We do not use noise information anyhow
      P.normalization = ImageIntegration.prototype.NoNormalization; // Gain time, useless for our  need
      P.rejection = ImageIntegration.prototype.NoRejection; // Default, but essential for our needs
      // P.rejectionNormalization = ImageIntegration.prototype.Scale;
      // P.minMaxLow = 1;
      // P.minMaxHigh = 1;
      // P.pcClipLow = 0.200;
      // P.pcClipHigh = 0.100;
      // P.sigmaLow = 4.000;
      // P.sigmaHigh = 3.000;
      // P.winsorizationCutoff = 5.000;
      // P.linearFitLow = 5.000;
      // P.linearFitHigh = 4.000;
      // P.esdOutliersFraction = 0.30;
      // P.esdAlpha = 0.05;
      // P.esdLowRelaxation = 1.00;
      // P.rcrLimit = 0.10;
      // P.ccdGain = 1.00;
      // P.ccdReadNoise = 10.00;
      // P.ccdScaleNoise = 0.00;
      P.clipLow = true;
      P.clipHigh = true;
      P.rangeClipLow = false;  // Save some time especially on short runs.
                              // this could be set to true to use the 'negative' map as an alternate source
                              // for cropping information (currentyl not used)
      P.rangeLow = 0.000000;   // default but ensure it is 0 for correct results in case rangeClipLow is true
      P.rangeClipHigh = false; // default, but ensure we do not clip higgh to avoid creating black dots.
      // P.rangeHigh = 0.980000;
      // P.mapRangeRejection = true;
      // P.reportRangeRejection = false;
      // P.largeScaleClipLow = false;
      // P.largeScaleClipLowProtectedLayers = 2;
      // P.largeScaleClipLowGrowth = 2;
      // P.largeScaleClipHigh = false;
      // P.largeScaleClipHighProtectedLayers = 2;
      // P.largeScaleClipHighGrowth = 2;
      // P.generate64BitResult = false;
      // P.generateRejectionMaps = false;
      // P.generateIntegratedImage = true;
      // P.generateDrizzleData = false;
      P.closePreviousImages = false; // Could be set to true to automatically supress previosu result, but they are removed by the script
      // P.bufferSizeMB = 16; // Performance, left defaults, could be a parameter from an icon
      // P.stackSizeMB = 1024; // Performance, left defaults, could be a parameter from an icon
      // P.autoMemorySize = true; // Performance, left defaults, could be a parameter from an icon
      // P.autoMemoryLimit = 0.75; // Performance, left defaults, could be a parameter from an icon
      // P.useROI = false;
      // P.roiX0 = 0;
      // P.roiY0 = 0;
      // P.roiX1 = 0;
      // P.roiY1 = 0;
      P.useCache = true; // Performance, left defaults, could be a parameter from an icon
                  // Effect of cache seems small (10 %) and may even negatively impact global
                  // performance as we do not calculate noise and may overwrite good cache data.
                  // Need further study
      P.evaluateSNR = false; // We do not use noise for our integration, save time
      // P.noiseEvaluationAlgorithm = ImageIntegration.prototype.NoiseEvaluation_MRS;
      // P.mrsMinDataFraction = 0.010;
      // P.psfStructureLayers = 5;
      // P.psfType = ImageIntegration.prototype.PSFType_Moffat4;
      // P.subtractPedestals = false;
      // P.truncateOnOutOfRange = false;
      P.noGUIMessages = true; // Default, but want to be sure as we are not interractive
      P.showImages = true; // To have the image on the workspace
      // P.useFileThreads = true;
      // P.fileThreadOverload = 1.00;
      // P.useBufferThreads = true;
      // P.maxBufferThreads = 0;


      P.executeGlobal();
      console.noteln("Warnings above about 'Inconsistent Instrument:Filter ...' above are normal, as we integrate all filters together");

      // Depending on integration options, some useless maps may be generated, especially low rejection map,
      // With the current integration parameters, these images are not generated,
      util.closeOneWindow(P.lowRejectionMapImageId);
      util.closeOneWindow(P.highRejectionMapImageId);
      util.closeOneWindow(P.slopeMapImageId);
      // KEEP (P.integrationImageId);

      //console.writeln("Integration for CROP complete, \n", JSON.stringify(P, null, 2));

      //   console.writeln("highRejectionMapImageId ", P.highRejectionMapImageId)
      //   console.writeln("slopeMapImageId ", P.slopeMapImageId) 
      //   console.writeln("integrationImageId ", P.integrationImageId)
      //   console.writeln("lowRejectionMapImageId ", P.lowRejectionMapImageId)

      //console.writeln("Rename '",P.integrationImageId,"' to ",ppar.win_prefix + "LowRejectionMap_ALL")
      var new_name = util.windowRename(P.integrationImageId, ppar.win_prefix + "LowRejectionMap_ALL");

      return new_name
      
}

/* Do run ABE so just make copy of the source window as
 * is done by AutomaticBackgroundExtractor.
 */
function noABEcopyWin(win)
{
      var new_win_id = win.mainView.id;
      var fix_postfix = "_map_pm";
      if (new_win_id.endsWith(fix_postfix)) {
            new_win_id = new_win_id.substring(0, new_win_id.length - fix_postfix.length);
      } else {
            var fix_postfix = "_map";
            if (new_win_id.endsWith(fix_postfix)) {
                  new_win_id = new_win_id.substring(0, new_win_id.length - fix_postfix.length);
            }
      }
      var noABE_id = util.ensure_win_prefix(new_win_id + "_noABE");
      util.addProcessingStep("No ABE for " + win.mainView.id);
      util.addScriptWindow(noABE_id);
      util.copyWindow(win, noABE_id);
      return noABE_id;
}

function runABEex(win, replaceTarget, postfix)
{
      if (replaceTarget) {
            util.addProcessingStepAndStatusInfo("Run ABE on image " + win.mainView.id);
            var ABE_id = win.mainView.id;
      } else {
            var ABE_id = util.ensure_win_prefix(win.mainView.id + postfix);
            util.addProcessingStepAndStatusInfo("Run ABE from image " + win.mainView.id + ", target image " + ABE_id);
      }

      var P = new AutomaticBackgroundExtractor;
      P.correctedImageId = ABE_id;
      P.replaceTarget = replaceTarget;
      P.discardModel = true;
      P.targetCorrection = AutomaticBackgroundExtractor.prototype.Subtract;

      if (global.ai_debug) {
            console.writeln(P.toSource());
      }

      win.mainView.beginProcess(UndoFlag_NoSwapFile);

      P.executeOn(win.mainView, false);

      win.mainView.endProcess();

      util.addScriptWindow(ABE_id);

      return ABE_id;
}

function runABE(win, replaceTarget)
{
      return runABEex(win, replaceTarget, "_ABE");
}

// Run ABE and rename windows so that the final result has the same id
function run_ABE_before_channel_combination(id)
{
      if (id == null) {
            util.throwFatalError("No image for ABE, maybe some previous step like star alignment failed");
      }
      var id_win = ImageWindow.windowById(id);
      runABEex(id_win, true, "");
      return id;
}

/* ApplyAutoSTF routine is from PixInsight scripts.
 *
 */
function ApplyAutoSTF(view, shadowsClipping, targetBackground, rgbLinked, silent)
{
   if (!silent) {
       console.writeln("  Apply AutoSTF on " + view.id);
   }
   var stf = new ScreenTransferFunction;

   var n = view.image.isColor ? 3 : 1;

   var median = view.computeOrFetchProperty("Median");

   var mad = view.computeOrFetchProperty("MAD");
   mad.mul(1.4826); // coherent with a normal distribution

   if (!silent) {
      console.writeln("  RgbLinked " + rgbLinked);
   }

   if (rgbLinked)
   {
      /*
       * Try to find how many channels look as channels of an inverted image.
       * We know a channel has been inverted because the main histogram peak is
       * located over the right-hand half of the histogram. Seems simplistic
       * but this is consistent with astronomical images.
       */
      var invertedChannels = 0;
      for (var c = 0; c < n; ++c)
         if (median.at(c) > 0.5)
            ++invertedChannels;

      if (invertedChannels < n)
      {
         /*
          * Noninverted image
          */
         var c0 = 0, m = 0;
         for (var c = 0; c < n; ++c)
         {
            if (1 + mad.at(c) != 1)
               c0 += median.at(c) + shadowsClipping * mad.at(c);
            m  += median.at(c);
         }
         c0 = Math.range(c0/n, 0.0, 1.0);
         m = Math.mtf(targetBackground, m/n - c0);

         stf.STF = [ // c0, c1, m, r0, r1
                     [c0, 1, m, 0, 1],
                     [c0, 1, m, 0, 1],
                     [c0, 1, m, 0, 1],
                     [0, 1, 0.5, 0, 1] ];
      }
      else
      {
         /*
          * Inverted image
          */
         var c1 = 0, m = 0;
         for (var c = 0; c < n; ++c)
         {
            m  += median.at(c);
            if (1 + mad.at(c) != 1)
               c1 += median.at(c) - shadowsClipping * mad.at(c);
            else
               c1 += 1;
         }
         c1 = Math.range(c1/n, 0.0, 1.0);
         m = Math.mtf(c1 - m/n, targetBackground);

         stf.STF = [ // c0, c1, m, r0, r1
                     [0, c1, m, 0, 1],
                     [0, c1, m, 0, 1],
                     [0, c1, m, 0, 1],
                     [0, 1, 0.5, 0, 1] ];
      }
   }
   else
   {
      /*
       * Unlinked RGB channels: Compute automatic stretch functions for
       * individual RGB channels separately.
       */
      var A = [ // c0, c1, m, r0, r1
               [0, 1, 0.5, 0, 1],
               [0, 1, 0.5, 0, 1],
               [0, 1, 0.5, 0, 1],
               [0, 1, 0.5, 0, 1] ];

      for (var c = 0; c < n; ++c)
      {
         if (median.at(c) < 0.5)
         {
            /*
             * Noninverted channel
             */
            var c0 = (1 + mad.at(c) != 1) ? Math.range(median.at(c) + shadowsClipping * mad.at(c), 0.0, 1.0) : 0.0;
            var m  = Math.mtf(targetBackground, median.at(c) - c0);
            A[c] = [c0, 1, m, 0, 1];
         }
         else
         {
            /*
             * Inverted channel
             */
            var c1 = (1 + mad.at(c) != 1) ? Math.range(median.at(c) - shadowsClipping * mad.at(c), 0.0, 1.0) : 1.0;
            var m  = Math.mtf(c1 - median.at(c), targetBackground);
            A[c] = [0, c1, m, 0, 1];
         }
      }

      stf.STF = A;
   }

   if (!silent) {
      console.writeln("<end><cbr/><br/><b>", view.fullId, "</b>:");
      for (var c = 0; c < n; ++c)
      {
            console.writeln("channel #", c);
            console.writeln(format("c0 = %.6f", stf.STF[c][0]));
            console.writeln(format("m  = %.6f", stf.STF[c][2]));
            console.writeln(format("c1 = %.6f", stf.STF[c][1]));
      }
   }
   view.beginProcess(UndoFlag_NoSwapFile);

   stf.executeOn(view);

   view.endProcess();

   if (!silent) {
      console.writeln("<end><cbr/><br/>");
   }
}

/* applySTF routine is from PixInsight scripts.
 */
function applySTF(imgView, stf, iscolor)
{
      console.writeln("  Apply STF on " + imgView.id);
      var HT = new HistogramTransformation;

      if (iscolor) {
            HT.H = [	// shadows, midtones, highlights, rescale0, rescale1
                        [stf[0][1], stf[0][0], stf[0][2], stf[0][3], stf[0][4]],    // red
                        [stf[1][1], stf[1][0], stf[1][2], stf[1][3], stf[1][4]],    // green
                        [stf[2][1], stf[2][0], stf[2][2], stf[2][3], stf[2][4]],    // blue
                        [ 0, 0.5, 1, 0, 1]
                  ];
      } else {
            HT.H = [
                        [ 0, 0.5, 1, 0, 1],
                        [ 0, 0.5, 1, 0, 1],
                        [ 0, 0.5, 1, 0, 1],
                        [stf[0][1], stf[0][0], stf[0][2], stf[0][3], stf[0][4]]     // luminance
                  ];
      }

      imgView.beginProcess(UndoFlag_NoSwapFile);

      HT.executeOn(imgView, false);

      imgView.endProcess();
}

function getRgbLinked(iscolor)
{
      if (par.STF_linking.val == 'Linked') {
            console.writeln("RGB channels linked selected by user");
            return true;  
      } else if (par.STF_linking.val == 'Unlinked') {
            console.writeln("RGB channels unlinked selected by user");
            return false;  
      } else {
            // auto, use default
            var rgbLinked;
            if (narrowband) {
                  if (linear_fit_done) {
                        console.writeln("Narrowband and linear fit done, use RGB channels linked");
                        rgbLinked = true;
                  } else {
                        console.writeln("Narrowband and no linear fit, use RGB channels unlinked");
                        rgbLinked = false;
                  }
            } else if (iscolor) {
                  console.writeln("Color file, use RGB channels unlinked");
                  rgbLinked = false;
            } else {
                  console.writeln("Use default RGB channels linked");
                  rgbLinked = true;
            }
            return rgbLinked;
      }
}

this.runHistogramTransformSTFex = function(ABE_win, stf_to_use, iscolor, targetBackground, silent)
{
      if (!silent) {
            util.addProcessingStep("Run histogram transform on " + ABE_win.mainView.id + " based on autostretch");
      }

      if (stf_to_use == null) {
            /* Apply autostretch on image */
            var rgbLinked = getRgbLinked(iscolor);
            ApplyAutoSTF(ABE_win.mainView,
                        DEFAULT_AUTOSTRETCH_SCLIP,
                        targetBackground,
                        rgbLinked,
                        silent);
            stf_to_use = ABE_win.mainView.stf;
      }

      /* Run histogram transfer function based on autostretch */
      applySTF(ABE_win.mainView, stf_to_use, iscolor);

      /* Undo autostretch */
      if (!silent) {
            console.writeln("  Undo STF on " + ABE_win.mainView.id);
      }
      var stf = new ScreenTransferFunction;

      ABE_win.mainView.beginProcess(UndoFlag_NoSwapFile);

      if (!silent) {
            console.writeln(" Execute autostretch on " + ABE_win.mainView.id);
      }
      stf.executeOn(ABE_win.mainView);

      ABE_win.mainView.endProcess();

      return stf_to_use;
}

function runHistogramTransformSTF(ABE_win, stf_to_use, iscolor, targetBackground)
{
      return engine.runHistogramTransformSTFex(ABE_win, stf_to_use, iscolor, targetBackground, false);
}

function runHistogramTransformMaskedStretch(ABE_win)
{
      util.addProcessingStepAndStatusInfo("Run histogram transform on " + ABE_win.mainView.id + " using MaskedStretch");

      var P = new MaskedStretch;
      P.targetBackground = par.MaskedStretch_targetBackground.val;

      ABE_win.mainView.beginProcess(UndoFlag_NoSwapFile);

      console.writeln("Execute MaskedStretch on " + ABE_win.mainView.id);
      P.executeOn(ABE_win.mainView);

      ABE_win.mainView.endProcess();
}

function runHistogramTransformArcsinhStretch(ABE_win)
{
      util.addProcessingStepAndStatusInfo("Run histogram transform on " + ABE_win.mainView.id + " using ArcsinhStretch");

      var stretch = Math.pow(par.Arcsinh_stretch_factor.val, 1/par.Arcsinh_iterations.val);

      console.writeln("Execute ArcsinhStretch on " + ABE_win.mainView.id);

      for (var i = 0; i < par.Arcsinh_iterations.val; i++) {

            var P = new ArcsinhStretch;
            P.stretch = stretch;
            P.blackPoint = findSymmetryPoint(ABE_win, par.Arcsinh_black_point.val);
            if (P.blackPoint > 0.20) {
                  P.blackPoint = 0.20;
            }
            P.protectHighlights = false;  // setting to true does not work well

            ABE_win.mainView.beginProcess(UndoFlag_NoSwapFile);

            P.executeOn(ABE_win.mainView);

            ABE_win.mainView.endProcess();

            var peak_val = findHistogramPeak(ABE_win).normalizedPeakCol;
            console.writeln("Iteration " + i + ", stretch " + stretch + ", black point " + P.blackPoint + ", current peak at " + peak_val);
      }
}

function runHistogramTransformHyperbolicIterations(ABE_win, iscolor, use_GHS_process)
{
      if (use_GHS_process) {
            util.addProcessingStepAndStatusInfo("Run histogram transform on " + ABE_win.mainView.id + " using Generalized Hyperbolic Stretching process");
      } else {
            util.addProcessingStepAndStatusInfo("Run histogram transform on " + ABE_win.mainView.id + " using Generalized Hyperbolic Stretching PixelMath formulas");
      }
      console.writeln("Start values D = " + par.Hyperbolic_D.val + ", b = " + par.Hyperbolic_b.val + ", SP = " + par.Hyperbolic_SP.val);

      var res = { 
                  win: ABE_win, 
                  iteration_number: 0, 
                  completed: false, 
                  skipped: 0,
                  Hyperbolic_D_val: par.Hyperbolic_D.val,
                  Hyperbolic_b_val: par.Hyperbolic_b.val,
                  Hyperbolic_SP_val: par.Hyperbolic_SP.val,
                  peak_val: 0
      };

      for (var i = 0; i < par.Hyperbolic_iterations.val; i++) {
            res.iteration_number = i + 1;
            var window_updated = runHistogramTransformHyperbolic(res, iscolor, use_GHS_process);
            if (window_updated) {
                  guiUpdatePreviewWin(res.win);
            }
            if (res.completed) {
                  break;
            }
      }
      return res.win;
}

function stretchHistogramTransformIterationsChannel(ABE_win, channel)
{
      var res = { 
            win: ABE_win, 
            iteration_number: 0, 
            completed: false, 
            skipped: 0,
            clipCount: 0
      };

      for (var i = 0; i < 10; i++) {
            res.iteration_number = i + 1;
            var window_updated = stretchHistogramTransform(res, channel);
            if (window_updated) {
                  guiUpdatePreviewWin(res.win);
            }
            if (res.completed) {
                  break;
            }
      }
      return res.win;
}

function stretchHistogramTransformIterations(ABE_win, iscolor)
{
      if (ABE_win.mainView.image.isColor) {
            var rgbLinked = getRgbLinked(iscolor);
      } else {
            var rgbLinked = true;
      }

      util.addProcessingStepAndStatusInfo("Run histogram stretch on " + ABE_win.mainView.id + " using HistogramTransform iterations");

      if (rgbLinked) {
            console.writeln("Channel: " + channelText(3));
            return stretchHistogramTransformIterationsChannel(ABE_win);
      } else {
            for (var i = 0; i < 3; i++) {
                  console.writeln("Channel: " + channelText(i));
                  ABE_win = stretchHistogramTransformIterationsChannel(ABE_win, i);
            }
            return ABE_win;
      }
}

function printImageStatistics(win, channel)
{
      var view = win.mainView;
      if (channel >= 0) {
            var stat_channel = channel;
      } else {
            var stat_channel = 0;
      }

      console.writeln(channelText(channel) + " Median " + view.computeOrFetchProperty("Median").at(stat_channel) + 
                                             " MAD " + view.computeOrFetchProperty("MAD").at(stat_channel) +
                                             " Mean " + view.computeOrFetchProperty("Mean").at(stat_channel) +
                                             " StdDev " + view.computeOrFetchProperty("StdDev").at(stat_channel));
}

/* Experimenting with stretching, mostly just for fun and to understand
 * some functions and concepts.
 * Works pretty ok on some images with Crop to common area and zero shadow
 * clipping.
 */
function stretchHistogramTransform(res, channel)
{
      if (channel >= 0) {
            var channel_number = channel;
            var median_channel = channel;
      } else {
            var channel_number = 3;
            var median_channel = 0;
      }

      console.writeln("\n****************************************************************");
      console.writeln("*** start iteration " + res.iteration_number + ", " + channelText(channel));

      if (res.iteration_number == 1) {
            printImageStatistics(res.win, channel);
      }

      var target_value = par.histogram_stretch_target.val;
      var use_median = par.histogram_stretch_type.val == 'Median';

      var new_win = util.copyWindowEx(res.win, "temp_stretchHistogramTransform", true);

      var midtones = [ 0.50000000, 0.50000000, 0.50000000, 0.50000000 ];

      if (use_median) {
            // var current_value = findSymmetryPoint(new_win, 50, channel);
            var current_value = new_win.mainView.computeOrFetchProperty("Median").at(median_channel);
            console.writeln(channelText(channel) + " Median " + current_value);
      } else {
            var current_value = findHistogramPeak(new_win, channel).normalizedPeakCol;
      }

      console.writeln("*** current value " + current_value);

      // Iterative method gives maybe a bit better shadows
      if (0 && res.iteration_number == 1) {
            midtones[channel_number] = Math.mtf(target_value, current_value);
      } else {
            var adjust = target_value - current_value;
            midtones[channel_number] = 0.50 - adjust;
      }

      console.writeln("*** midtones "+ midtones[channel_number]);

      /* Separate stretch for shadows and midtones.
       */
      console.writeln("*** HistogramTransformation for midtones, " + channelText(channel));

      if (1) {

            // Using HistogramTransformation
            var P = new HistogramTransformation;
            P.H = [ // c0, c1, m, r0, r1
                  [0.00000000, midtones[0], 1.00000000, 0.00000000, 1.00000000],     // R
                  [0.00000000, midtones[1], 1.00000000, 0.00000000, 1.00000000],     // G
                  [0.00000000, midtones[2], 1.00000000, 0.00000000, 1.00000000],     // B
                  [0.00000000, midtones[3], 1.00000000, 0.00000000, 1.00000000],     // L
                  [0.00000000, 0.50000000, 1.00000000, 0.00000000, 1.00000000]
            ];
            new_win.mainView.beginProcess(UndoFlag_NoSwapFile);
            P.executeOn(new_win.mainView);
            new_win.mainView.endProcess();

      } else {
            // Using PixelMath
            var expression = "(m - 1)*$T/((2*m - 1)*$T - m)";

            var P = new PixelMath;
            if (channel >= 0) {
                  switch (channel) {
                        case 0:
                              P.expression = expression;
                              P.expression1 = "$T";
                              P.expression2 = "$T";
                              P.symbols = "m=" + midtones[0];
                              break;
                        case 1:
                              P.expression = "$T";
                              P.expression1 = expression;
                              P.expression2 = "$T";
                              P.symbols = "m=" + midtones[1];
                              break;
                        case 2:
                              P.expression = "$T";
                              P.expression1 = "$T";
                              P.expression2 = expression;
                              P.symbols = "m=" + midtones[2];
                              break;
                  }
                  P.useSingleExpression = false;
            } else {
                  P.expression = expression;
                  P.symbols = "m=" + midtones[0];
                  P.useSingleExpression = true;
            }
            P.createNewImage = false;
            P.newImageColorSpace = PixelMath.prototype.SameAsTarget;
            P.newImageSampleFormat = PixelMath.prototype.SameAsTarget;
      
            console.writeln("Symbols " + P.symbols);
      
            new_win.mainView.beginProcess(UndoFlag_NoSwapFile);
      
            P.executeOn(new_win.mainView);
      
            new_win.mainView.endProcess();
      }

      if (use_median) {
            // current_value = findSymmetryPoint(new_win, 50, channel);
            current_value = new_win.mainView.computeOrFetchProperty("Median").at(median_channel);
            console.writeln(channelText(channel) + " Median " + current_value);
      } else {
            current_value = findHistogramPeak(new_win, channel).normalizedPeakCol;
      }
      console.writeln("*** after midtones current value " + current_value);

      if (res.iteration_number == 1) {
            console.writeln("*** get shadows clip value");
            var shadows = [ 0.00000000, 0.00000000, 0.00000000, 0.00000000 ];

            var shadows_clip_value = par.histogram_shadow_clip.val;
            var clip = getClipShadowsValue(new_win, shadows_clip_value, channel);
            
            shadows[channel_number] = clip.normalizedShadowClipping;
            console.writeln("*** shadows " + shadows[channel_number]);

            console.writeln("*** HistogramTransformation for shadows, "+ channelText(channel));

            var P = new HistogramTransformation;
            P.H = [ // c0, c1, m, r0, r1
                  [shadows[0], 0.50000000, 1.00000000, 0.00000000, 1.00000000],     // R
                  [shadows[1], 0.50000000, 1.00000000, 0.00000000, 1.00000000],     // G
                  [shadows[2], 0.50000000, 1.00000000, 0.00000000, 1.00000000],     // B
                  [shadows[3], 0.50000000, 1.00000000, 0.00000000, 1.00000000],     // L
                  [0.00000000, 0.50000000, 1.00000000, 0.00000000, 1.00000000]
            ];
            new_win.mainView.beginProcess(UndoFlag_NoSwapFile);
            P.executeOn(new_win.mainView);
            new_win.mainView.endProcess();

            if (use_median) {
                  // current_value = findSymmetryPoint(new_win, 50, channel);
                  current_value = new_win.mainView.computeOrFetchProperty("Median").at(median_channel);
                  console.writeln(channelText(channel) + " Median " + current_value);
            } else {
                  current_value = findHistogramPeak(new_win, channel).normalizedPeakCol;
            }
            console.writeln("*** after shadows current value " + current_value);
      
      } else {
            var clip = null;
      }

      // check where histograms are
      if (new_win.mainView.image.isColor) {
            for (var i = 0; i < 3; i++) {
                  if (use_median) {
                        // findSymmetryPoint(new_win, 50, i);
                        console.writeln(channelText(i) + " Median " + new_win.mainView.computeOrFetchProperty("Median").at(i));
                  } else {
                        findHistogramPeak(new_win, i);
                  }
            } 
      } else {
            if (use_median) {
                  // findSymmetryPoint(new_win, 50);
                  console.writeln(channelText(channel) + " Median " + new_win.mainView.computeOrFetchProperty("Median").at(0));
            } else {
                  findHistogramPeak(new_win);
            }
      }
      var window_updated = false;

      if (current_value > target_value + 0.1 * target_value) {
            // We are past the target value, ignore this iteration
            res.skipped++;
            util.forceCloseOneWindow(new_win);
            if (res.skipped > 3) {
                  console.writeln("*** Stop, we are past the target, skipped " + res.skipped + ", current value " + current_value + ", target value " + target_value);
                  res.completed = true;
            } else {
                  console.writeln("*** Skip, we are past the target, skip this iteration, skipped + " + res.skipped + ", current value " + current_value + ", target value " + target_value);
            }
      } else {
            window_updated = true;
            if (current_value < target_value - 0.1 * target_value) {
                  console.writeln("*** Continue stretch iteration " + res.iteration_number + ", current value " + current_value + ", target value " + target_value);
            } else {
                  // we are close enough, we are done
                  console.writeln("*** Stop, stretch completed, we are close enough, current value " + current_value + ", target value" + target_value);
                  res.completed = true;
                  printImageStatistics(new_win, channel);
            }
            // find new window and copy keywords
            setTargetFITSKeywordsForPixelmath(new_win, getTargetFITSKeywordsForPixelmath(res.win));
            // close old image
            var image_id = res.win.mainView.id;
            util.forceCloseOneWindow(res.win);
            // rename new as old
            util.windowRename(new_win.mainView.id, image_id);
            res.win = new_win;
            if (clip) {
                  res.clipCount += clip.clipCount;
            }
            console.writeln("*** Clipped total of " + res.clipCount + " pixels");
      }

      console.writeln("*** end iteration " + res.iteration_number + ", " + channelText(channel));
      console.writeln("****************************************************************\n");

      return window_updated;
}

function runHistogramTransformHyperbolic(res, iscolor, use_GHS_process)
{
      var iteration_number = res.iteration_number;
      var image_id = res.win.mainView.id;

      console.writeln("--");
      console.writeln("Iteration " + iteration_number);
      console.writeln("Skipped " + res.skipped);

      var iteration_Hyperbolic_D_val = res.Hyperbolic_D_val - (iteration_number - 1) / 2;
      var Hyperbolic_b_val = res.Hyperbolic_b_val;

      if (use_GHS_process) {
            var Hyperbolic_D_val = iteration_Hyperbolic_D_val;
      } else {
            /* expect D to be ln(D+1) as in GeneralizedHyperbolicStretch script. */
            var Hyperbolic_D_val = Math.exp(iteration_Hyperbolic_D_val) - 1.0;
      }

      console.writeln("D " + res.Hyperbolic_D_val + 
                      " b " + res.Hyperbolic_b_val +
                      " iter " + iteration_number +
                      " iter D " + iteration_Hyperbolic_D_val +
                      " iter ln(D+1) " + Hyperbolic_D_val +
                      " skipped " + res.skipped);

      switch (par.Hyperbolic_mode.val) {
            case 1:
                  // User given symmetry point
                  var Hyperbolic_SP_val = findSymmetryPoint(res.win, res.Hyperbolic_SP_val);
                  break;
            case 2:
                  // Use histogram peak as symmetry point
                  var Hyperbolic_SP_val = findHistogramPeak(res.win).normalizedPeakCol;
                  break;
      }

      console.writeln("Adjusted values D = " + Hyperbolic_D_val + ", b = " + Hyperbolic_b_val + ", SP = " + Hyperbolic_SP_val);

      if (Hyperbolic_D_val <= 1) {
            console.writeln("We are done, too low D " + Hyperbolic_D_val);
            res.completed = true;
            return false;
      }
      if (Hyperbolic_b_val < 1) {
            console.writeln("We are done, too low b " + Hyperbolic_b_val);
            res.completed = true;
            return false;
      }

      if (use_GHS_process) {

            try {
                  var new_win = util.copyWindow(res.win, res.win.mainView.id + "_GHStmp");

                  var P = new GeneralizedHyperbolicStretch;
                  P.stretchType = GeneralizedHyperbolicStretch.prototype.ST_GeneralisedHyperbolic;
                  P.stretchChannel = GeneralizedHyperbolicStretch.prototype.SC_RGB;
                  P.inverse = false;
                  P.stretchFactor = Hyperbolic_D_val;
                  P.localIntensity = Hyperbolic_b_val;
                  P.symmetryPoint = Hyperbolic_SP_val;
                  P.highlightProtection = 1.000000;
                  P.shadowProtection = 0.000000;
                  P.blackPoint = 0.000000;
                  P.whitePoint = 1.000000;
                  P.colourBlend = 1.000;
                  P.clipType = GeneralizedHyperbolicStretch.prototype.CT_Clip;
                  P.useRGBWorkingSpace = false;

                  new_win.mainView.beginProcess(UndoFlag_NoSwapFile);

                  P.executeOn(new_win.mainView);

                  new_win.mainView.endProcess();
            } catch(err) {
                  console.criticalln("GeneralizedHyperbolicStretch failed");
                  console.criticalln(err);
                  util.addProcessingStep("Maybe GeneralizedHyperbolicStretch is not installed");
                  util.closeOneWindow(new_win.mainView.id);
                  util.throwFatalError("GeneralizedHyperbolicStretch failed to run");
            }
      
      } else {
            var P = new PixelMath;

            var expression = 
                  "Ds=D*b;\n"+
                  "q0=(1+Ds*SP)^(-1/b);\n"+
                  "q1=2-2*(1+Ds*(1.0-SP))^(-1/b)+(1+Ds*(2-SP-1))^(-1/b);\n"+
                  "iif($T<SP,"+
                        "(1+Ds*(SP-$T))^(-1/b)-q0, "+
                        "iif($T>1.0, "+
                              "2-(2*(1+Ds*(1.0-SP))^(-1/b)+(1+Ds*(2-$T-SP))^(-1/b))-q0, "+
                              "2-(1+Ds*($T-SP))^(-1/b)-q0)) / (q1-q0);\n";
            var symbols = 
                  "D = " + Hyperbolic_D_val + ";\n" +
                  "b = " + Hyperbolic_b_val + ";\n" +
                  "SP = " + Hyperbolic_SP_val + ";\n" +
                  "q0;\n" +
                  "q1;\n" +
                  "Ds;\n";

            P.expression = expression;
            P.expression1 = "";
            P.expression2 = "";
            P.expression3 = "";
            P.symbols = symbols;
            P.useSingleExpression = true;

            P.clearImageCacheAndExit = false;
            P.cacheGeneratedImages = false;
            P.generateOutput = true;
            P.singleThreaded = false;
            P.optimization = true;
            P.use64BitWorkingImage = false;
            P.rescale = false;
            P.rescaleLower = 0;
            P.rescaleUpper = 1;
            P.truncate = true;
            P.truncateLower = 0;
            P.truncateUpper = 1;
            P.createNewImage = true;
            P.showNewImage = true;
            P.newImageId = image_id + "_pm";
            P.newImageWidth = 0;
            P.newImageHeight = 0;
            P.newImageAlpha = false;
            P.newImageColorSpace = PixelMath.prototype.SameAsTarget;
            P.newImageSampleFormat = PixelMath.prototype.SameAsTarget;

            console.writeln("Symbols " + P.symbols);

            res.win.mainView.beginProcess(UndoFlag_NoSwapFile);

            P.executeOn(res.win.mainView);

            res.win.mainView.endProcess();

            var new_win = util.findWindow(P.newImageId);
      }

      // util.copyWindowEx(new_win, image_id+"_iteration_"+iteration_number+"_D_"+parseInt(Hyperbolic_D_val)+"_b_"+parseInt(Hyperbolic_b_val), true);

      var median = findSymmetryPoint(new_win, 50);
      var peak_val = findHistogramPeak(new_win).normalizedPeakCol;
      console.writeln("peak_val " + peak_val + ", median "+ median);

      var window_updated = false;

      if (median >= 0.5) {
            // We are past the median limit value, ignore this iteration and keep old image
            console.writeln("We are past median limit of 0.5, skip this iteration, median=" + median);
            util.closeOneWindow(new_win.mainView.id);
            res.skipped++;
      } else if (peak_val > par.Hyperbolic_target.val + 0.1 * par.Hyperbolic_target.val) {
            // We are past the target value, ignore this iteration and keep old image
            console.writeln("We are past the target, skip this iteration, current=" + peak_val + ", target=" + par.Hyperbolic_target.val);
            util.closeOneWindow(new_win.mainView.id);
            res.skipped++;
      } else if (peak_val < res.peak_val) {
            console.writeln("Histogram peak moved to left from " + res.peak_val + " to " + peak_val + ", skip this iteration");
            util.closeOneWindow(new_win.mainView.id);
            res.skipped++;
      } else {
            // we are close enough, we are done
            console.writeln("Stretch completed, we are close enough, current=" + peak_val + ", target=" + par.Hyperbolic_target.val);
            res.completed = true;
            window_updated = true;
            // find new window and copy keywords
            setTargetFITSKeywordsForPixelmath(new_win, getTargetFITSKeywordsForPixelmath(res.win));
            // close old image
            util.closeOneWindow(image_id);
            // rename new as old
            util.windowRename(new_win.mainView.id, image_id);
            res.win = new_win;
            res.peak_val = peak_val;
      }
      return window_updated;
}

function runHistogramTransform(ABE_win, stf_to_use, iscolor, type)
{
      if (!run_HT) {
            util.addProcessingStep("Do not run histogram transform on " + ABE_win.mainView.id);
            return { win: ABE_win, stf: null };
      }

      if (type == 'stars') {
            var image_stretching = par.stars_stretching.val;
      } else {
            var image_stretching = par.image_stretching.val;
      }
      console.writeln("runHistogramTransform using " + image_stretching);
      var stf = null;
      var targetBackground; // to be compatible with 'use strict';
      //if (image_stretching == 'Auto STF' || type == 'mask') {
      if (image_stretching == 'Auto STF') {
            if (type == 'mask') {
                  targetBackground = DEFAULT_AUTOSTRETCH_TBGND;
            } else {
                  targetBackground = par.STF_targetBackground.val;
            }
            stf = runHistogramTransformSTF(ABE_win, stf_to_use, iscolor, targetBackground);

      } else if (image_stretching == 'Masked Stretch') {
            runHistogramTransformMaskedStretch(ABE_win);

      } else if (image_stretching == 'Arcsinh Stretch') {
            runHistogramTransformArcsinhStretch(ABE_win);

      } else if (image_stretching == 'Hyperbolic formulas not used') {
            ABE_win = runHistogramTransformHyperbolicIterations(ABE_win, iscolor, false);

      } else if (image_stretching == 'Hyperbolic') {
            ABE_win = runHistogramTransformHyperbolicIterations(ABE_win, iscolor, true);

      } else if (image_stretching == 'Histogram stretch') {
            ABE_win = stretchHistogramTransformIterations(ABE_win, iscolor);
            
      } else {
            util.throwFatalError("Bad image stretching value " + image_stretching + " with type " + type);
      }
      if (par.shadow_clip.val) {
            clipShadows(ABE_win, global.shadow_clip_value);
      }
      guiUpdatePreviewWin(ABE_win);
      return { win: ABE_win, stf: stf };
}

function runACDNRReduceNoise(imgWin, maskWin)
{
      if (par.ACDNR_noise_reduction.val == 0.0) {
            return;
      }
      util.addProcessingStepAndStatusInfo("ACDNR noise reduction on " + imgWin.mainView.id + " using mask " + maskWin.mainView.id);

      var P = new ACDNR;
      P.applyToChrominance = false;
      P.sigmaL = par.ACDNR_noise_reduction.val;
      P.amountL = 0.50;

      imgWin.mainView.beginProcess(UndoFlag_NoSwapFile);

      if (maskWin != null) {
            /* Remove noise from dark parts of the image. */
            setMaskChecked(imgWin, maskWin);
            imgWin.maskInverted = true;
      }

      P.executeOn(imgWin.mainView, false);

      if (maskWin != null) {
            imgWin.removeMask();
      }

      imgWin.mainView.endProcess();

      guiUpdatePreviewWin(imgWin);
}

function noiseSuperStrong()
{
      var P = new MultiscaleLinearTransform;
      P.layers = [ // enabled, biasEnabled, bias, noiseReductionEnabled, noiseReductionThreshold, noiseReductionAmount, noiseReductionIterations
            [true, true, 0.000, true, 4.000, 0.70, 3],
            [true, true, 0.000, true, 3.000, 0.60, 3],
            [true, true, 0.000, true, 2.000, 0.60, 2],
            [true, true, 0.000, true, 1.000, 0.50, 1],
            [true, true, 0.000, true, 0.500, 0.50, 1],
            [true, true, 0.000, false, 3.000, 1.00, 1]
      ];

      return P;
}

function noiseStronger()
{
      var P = new MultiscaleLinearTransform;
      P.layers = [ // enabled, biasEnabled, bias, noiseReductionEnabled, noiseReductionThreshold, noiseReductionAmount, noiseReductionIterations
            [true, true, 0.000, true, 5.000, 0.50, 3],
            [true, true, 0.000, true, 3.000, 0.50, 3],
            [true, true, 0.000, true, 2.000, 0.50, 2],
            [true, true, 0.000, true, 1.000, 0.50, 1],
            [true, true, 0.000, true, 0.500, 0.50, 1],
            [true, true, 0.000, false, 3.000, 1.00, 1]
      ];
      
      return P;
}

function noiseStrong()
{
      var P = new MultiscaleLinearTransform;
      P.layers = [ // enabled, biasEnabled, bias, noiseReductionEnabled, noiseReductionThreshold, noiseReductionAmount, noiseReductionIterations
            [true, true, 0.000, true, 4.000, 0.50, 3],
            [true, true, 0.000, true, 2.000, 0.50, 2],
            [true, true, 0.000, true, 1.000, 0.50, 2],
            [true, true, 0.000, true, 0.500, 0.50, 1],
            [true, true, 0.000, false, 3.000, 1.00, 1]
      ];

      return P;
}

function noiseMild()
{
      var P = new MultiscaleLinearTransform;
      P.layers = [ // enabled, biasEnabled, bias, noiseReductionEnabled, noiseReductionThreshold, noiseReductionAmount, noiseReductionIterations
            [true, true, 0.000, true, 3.000, 0.50, 3],
            [true, true, 0.000, true, 1.000, 0.50, 1],
            [true, true, 0.000, true, 0.500, 0.50, 1],
            [true, true, 0.000, false, 3.000, 1.00, 1]
      ];

      return P;
}

function noiseVeryMild()
{
      var P = new MultiscaleLinearTransform;
      P.layers = [ // enabled, biasEnabled, bias, noiseReductionEnabled, noiseReductionThreshold, noiseReductionAmount, noiseReductionIterations
            [true, true, 0.000, true, 1.000, 0.50, 2],
            [true, true, 0.000, true, 0.500, 0.50, 2],
            [true, true, 0.000, true, 0.500, 0.50, 1],
            [true, true, 0.000, false, 3.000, 1.00, 1]
      ];

      return P;
}

function noiseSuperMild()
{
      var P = new MultiscaleLinearTransform;
      P.layers = [ // enabled, biasEnabled, bias, noiseReductionEnabled, noiseReductionThreshold, noiseReductionAmount, noiseReductionIterations
            [true, true, 0.000, true, 1.000, 0.50, 1],
            [true, true, 0.000, true, 0.500, 0.50, 1],
            [true, true, 0.000, true, 0.500, 0.50, 1],
            [true, true, 0.000, false, 3.000, 1.00, 1]
      ];

      return P;
}

function runMultiscaleLinearTransformReduceNoise(imgWin, maskWin, strength)
{
      if (strength == 0) {
            return;
      }

      console.writeln("runMultiscaleLinearTransformReduceNoise on " + imgWin.mainView.id + " using mask " + maskWin.mainView.id + ", strength " + strength);

      switch (strength) {
            case 1:
                  var P = noiseSuperMild();
                  break;
            case 2:
                  var P = noiseVeryMild();
                  break;
            case 3:
                  var P = noiseMild();
                  break;
            case 4:
                  var P = noiseStrong();
                  break;
            case 5:
                  var P = noiseStronger();
                  break;
            case 6:
                  var P = noiseSuperStrong();
                  break;
            default:
                  util.throwFatalError("Bad noise reduction value " + strength);
      } 

      imgWin.mainView.beginProcess(UndoFlag_NoSwapFile);

      if (maskWin != null) {
            /* Remove noise from dark parts of the image. */
            setMaskChecked(imgWin, maskWin);
            imgWin.maskInverted = true;
      }

      P.executeOn(imgWin.mainView, false);

      if (maskWin != null) {
            imgWin.removeMask();
      }

      imgWin.mainView.endProcess();
}

function runBlurXTerminator(imgWin)
{
      console.writeln("BlurXTerminator on " + imgWin.mainView.id + ", sharpen stars " + par.bxt_sharpen_stars.val + 
                      ", adjust star halos " + par.bxt_adjust_halo.val + ", sharpen nonstellar " + par.bxt_sharpen_nonstellar.val);

      try {
            var P = new BlurXTerminator;
            P.correct_only = false;
            P.correct_first = false;
            P.nonstellar_then_stellar = false;
            P.sharpen_stars = par.bxt_sharpen_stars.val;
            P.adjust_halos = par.bxt_adjust_halo.val;
            P.nonstellar_psf_diameter = 0.00;
            P.auto_nonstellar_psf = true;
            P.sharpen_nonstellar = par.bxt_sharpen_nonstellar.val;
      } catch(err) {
            console.criticalln("BlurXTerminator failed");
            console.criticalln(err);
            console.criticalln("Maybe BlurXTerminator is not installed, AI is missing or platform is not supported");
            util.throwFatalError("BlurXTerminator failed");
      }

      /* Execute on image.
       */
      imgWin.mainView.beginProcess(UndoFlag_NoSwapFile);

      P.executeOn(imgWin.mainView, false);
      
      imgWin.mainView.endProcess();
}

function runNoiseXTerminator(imgWin, strength, linear)
{
      switch (strength) {
            case 1:
                  var denoise = 0.60;
                  var detail = 0.10;
                  break;
            case 2:
                  var denoise = 0.70;
                  var detail = 0.15;
                  break;
            case 3:
                  var denoise = 0.80;
                  var detail = 0.15;
                  break;
            case 4:
                  var denoise = 0.90;
                  var detail = 0.15;
                  break;
            case 5:
                  var denoise = 0.90;
                  var detail = 0.20;
                  break;
            case 6:
                  var denoise = 0.95;
                  var detail = 0.20;
                  break;
            default:
                  util.throwFatalError("Bad noise reduction value " + strength);
      }

      console.writeln("Run NoiseXTerminator using denoise " + denoise + " and detail " + detail);

      try {
            var P = new NoiseXTerminator;
            P.denoise = denoise;
            P.detail = detail;
            P.linear = linear;
      } catch(err) {
            console.criticalln("NoiseXTerminator failed");
            console.criticalln(err);
            console.criticalln("Maybe NoiseXTerminator is not installed, AI is missing or platform is not supported");
            util.throwFatalError("NoiseXTerminator failed");
      }

      console.writeln("runNoiseXTerminator on " + imgWin.mainView.id + " using denoise " + denoise + ", detail " + detail, ", linear " + linear);

      /* Execute on image.
       */
      imgWin.mainView.beginProcess(UndoFlag_NoSwapFile);

      P.executeOn(imgWin.mainView, false);
      
      imgWin.mainView.endProcess();
}

function runNoiseReductionEx(imgWin, maskWin, strength, linear)
{
      if (strength == 0) {
            return;
      }
      if (par.use_noisexterminator.val) {
            runNoiseXTerminator(imgWin, strength, linear);
      } else {
            runMultiscaleLinearTransformReduceNoise(imgWin, maskWin, strength);
      }
}

function runNoiseReduction(imgWin, maskWin, linear)
{
      if (par.use_noisexterminator.val) {
            util.addProcessingStepAndStatusInfo("Noise reduction using NoiseXTerminator on " + imgWin.mainView.id);
      } else {
            util.addProcessingStepAndStatusInfo("Noise reduction on " + imgWin.mainView.id + " using mask " + maskWin.mainView.id);
      }
      runNoiseReductionEx(imgWin, maskWin, par.noise_reduction_strength.val, linear);
}

function runColorReduceNoise(imgWin)
{
      util.addProcessingStepAndStatusInfo("Color noise reduction on " + imgWin.mainView.id);

      var P = new TGVDenoise;
      P.rgbkMode = false;
      P.filterEnabledL = false;
      P.filterEnabledC = true;
      P.supportEnabled = true;

      imgWin.mainView.beginProcess(UndoFlag_NoSwapFile);

      /* Remove color noise from the whole image. */
      P.executeOn(imgWin.mainView, false);

      imgWin.mainView.endProcess();

      guiUpdatePreviewWin(imgWin);
}

function starReduceNoise(imgWin)
{
      util.addProcessingStepAndStatusInfo("Star noise reduction on " + imgWin.mainView.id);

      var P = new TGVDenoise;
      P.rgbkMode = false;
      P.filterEnabledL = true;
      P.filterEnabledC = true;
      P.strengthL = 3.10000000;
      P.strengthC = 8.50000000;
      P.edgeProtectionL = 0.00310000;
      P.edgeProtectionC = 0.00570000;
      P.smoothnessL = 2.00000000;
      P.smoothnessC = 6.20000000;
      P.maxIterationsL = 15;
      P.maxIterationsC = 100;
      P.convergenceEnabledL = false;
      P.convergenceEnabledC = false;
      P.convergenceLimitL = 0.00400000;
      P.convergenceLimitC = 0.00400000;
      P.supportEnabled = false;
      P.supportViewId = "";
      P.supportPreview = false;
      P.supportRemovedWaveletLayers = 0;
      P.supportShadowsClip = 0.00000;
      P.supportHighlightsClip = 1.00000;
      P.supportMidtonesBalance = 0.50000;

      imgWin.mainView.beginProcess(UndoFlag_NoSwapFile);

      P.executeOn(imgWin.mainView, false);

      imgWin.mainView.endProcess();
}

function runBackgroundNeutralization(imgView)
{
      util.addProcessingStepAndStatusInfo("Background neutralization on " + imgView.id);

      var P = new BackgroundNeutralization;

      imgView.beginProcess(UndoFlag_NoSwapFile);

      P.executeOn(imgView, false);

      imgView.endProcess();

      guiUpdatePreviewId(imgView.id);
}

function runColorCalibration(imgView)
{
      if (narrowband) {
            util.addProcessingStep("No color calibration for narrowband");
            return;
      }
      if (par.skip_color_calibration.val) {
            util.addProcessingStep("No color calibration was selected");
            return;
      }
      try {
            util.addProcessingStepAndStatusInfo("Color calibration on " + imgView.id);

            var P = new ColorCalibration;

            imgView.beginProcess(UndoFlag_NoSwapFile);

            P.executeOn(imgView, false);

            imgView.endProcess();
            guiUpdatePreviewId(imgView.id);
      } catch(err) {
            console.criticalln("Color calibration failed");
            console.criticalln(err);
            util.addProcessingStep("Maybe filter files or file format were not recognized correctly");
            util.throwFatalError("Color calibration failed");
      }
}

// This function is not used but kept here for possible future use.
function runColorSaturation(imgWin, maskWin)
{
      util.addProcessingStepAndStatusInfo("Color saturation on " + imgWin.mainView.id + " using mask " + maskWin.mainView.id);
      var P = new ColorSaturation;
      P.HS = [ // x, y
            [0.00000, 0.43636],
            [0.12661, -0.10909],
            [0.27390, -0.63636],
            [0.42377, -0.74545],
            [0.52196, -0.32727],
            [0.63566, 0.56364],
            [0.76744, 1.29091],
            [1.00000, 0.76364]
      ];

      imgWin.mainView.beginProcess(UndoFlag_NoSwapFile);

      /* Saturate only light parts of the image. */
      setMaskChecked(imgWin, maskWin);
      imgWin.maskInverted = false;
      
      P.executeOn(imgWin.mainView, false);

      imgWin.removeMask();

      imgWin.mainView.endProcess();

      guiUpdatePreviewWin(imgWin);
}

function runCurvesTransformationSaturation(imgWin, maskWin)
{
      if (maskWin == null) {
            util.addProcessingStepAndStatusInfo("Curves transformation for saturation on " + imgWin.mainView.id);
      } else {
            util.addProcessingStepAndStatusInfo("Curves transformation for saturation on " + imgWin.mainView.id + " using mask " + maskWin.mainView.id);
      }

      var P = new CurvesTransformation;
      P.S = [ // x, y
            [0.00000, 0.00000],
            [0.68734, 0.83204],
            [1.00000, 1.00000]
      ];

      imgWin.mainView.beginProcess(UndoFlag_NoSwapFile);

      if (maskWin != null) {
            /* Saturate only light parts of the image. */
            setMaskChecked(imgWin, maskWin);
            imgWin.maskInverted = false;
      }
      
      P.executeOn(imgWin.mainView, false);

      if (maskWin != null) {
            imgWin.removeMask();
      }

      imgWin.mainView.endProcess();

      guiUpdatePreviewWin(imgWin);
}

function increaseSaturation(imgWin, maskWin)
{
      //runColorSaturation(imgWin, maskWin);
      runCurvesTransformationSaturation(imgWin, maskWin);
}

function runLRGBCombination(RGB_id, L_id)
{
      var targetWin = util.copyWindow(
                        ImageWindow.windowById(RGB_id), 
                        util.ensure_win_prefix(RGB_id.replace("RGB", "LRGB")));
      var RGBimgView = targetWin.mainView;
      util.addProcessingStepAndStatusInfo("LRGB combination of " + RGB_id + " and luminance image " + L_id + " into " + RGBimgView.id);
      var P = new LRGBCombination;
      P.channels = [ // enabled, id, k
            [false, "", 1.00000],
            [false, "", 1.00000],
            [false, "", 1.00000],
            [true, L_id, 1.00000]
      ];
      P.mL = par.LRGBCombination_lightness.val;
      P.mc = par.LRGBCombination_saturation.val;
      P.noiseReduction = true;

      RGBimgView.beginProcess(UndoFlag_NoSwapFile);

      P.executeOn(RGBimgView, false);

      RGBimgView.endProcess();

      guiUpdatePreviewId(RGBimgView.id);

      return RGBimgView.id;
}

function runSCNR(RGBimgView, fixing_stars)
{
      if (!fixing_stars) {
            util.addProcessingStepAndStatusInfo("SCNR on " + RGBimgView.id);
      }
      var P = new SCNR;
      if (narrowband && par.leave_some_green.val && !fixing_stars) {
            P.amount = 0.50;
            util.addProcessingStep("Run SCNR using amount " + P.amount + " to leave some green color");
      } else {
            P.amount = 1.00;
      }

      RGBimgView.beginProcess(UndoFlag_NoSwapFile);

      P.executeOn(RGBimgView, false);

      RGBimgView.endProcess();

      guiUpdatePreviewId(RGBimgView.id);
}

// Run hue shift on narrowband image to enhance orange.
function narrowbandOrangeHueShift(imgView)
{
      util.addProcessingStepAndStatusInfo("Hue shift on " + imgView.id);
      
      var P = new CurvesTransformation;
      P.H = [ // x, y
         [0.00000, 0.00000],
         [0.30361, 0.18576],
         [0.47454, 0.47348],
         [1.00000, 1.00000]
      ];
      
      imgView.beginProcess(UndoFlag_NoSwapFile);

      P.executeOn(imgView, false);

      imgView.endProcess();

      guiUpdatePreviewId(imgView.id);
}

function runMultiscaleLinearTransformSharpen(imgWin, maskWin)
{
      if (maskWin != null) {
            util.addProcessingStepAndStatusInfo("Sharpening on " + imgWin.mainView.id + " using mask " + maskWin.mainView.id);
      } else {
            util.addProcessingStepAndStatusInfo("Sharpening on " + imgWin.mainView.id);
      }

      var P = new MultiscaleLinearTransform;
      P.layers = [ // enabled, biasEnabled, bias, noiseReductionEnabled, noiseReductionThreshold, noiseReductionAmount, noiseReductionIterations
            [true, true, 0.000, false, 3.000, 1.00, 1],
            [true, true, 0.025, false, 3.000, 1.00, 1],
            [true, true, 0.075, false, 3.000, 1.00, 1],
            [true, true, 0.000, false, 3.000, 1.00, 1],
            [true, true, 0.000, false, 3.000, 1.00, 1]
      ];
      P.deringing = true;
      P.deringingDark = 0.0100;     // old value -> 1.24: 0.0100
      
      imgWin.mainView.beginProcess(UndoFlag_NoSwapFile);

      if (maskWin != null) {
            /* Sharpen only light parts of the image. */
            setMaskChecked(imgWin, maskWin);
            imgWin.maskInverted = false;
      }

      P.executeOn(imgWin.mainView, false);

      if (maskWin != null) {
            imgWin.removeMask();
      }

      imgWin.mainView.endProcess();

      guiUpdatePreviewWin(imgWin);
}

this.writeProcessingSteps = function(alignedFiles, autocontinue, basename)
{
      if (basename == null) {
            if (autocontinue) {
                  basename = "AutoContinue";
            } else {
                  basename = "AutoIntegrate";
            }
      }
      logfname = basename + util.getOptionalUniqueFilenamePart() + ".log";
      if (par.win_prefix_to_log_files.val) {
            logfname = util.ensure_win_prefix(logfname);
      }

      if (!global.write_processing_log_file) {
            console.writeln(basename + " log file not written.");
            return;
      }

      var dialogRet = util.ensureDialogFilePath(basename + ".log");
      if (dialogRet == 0) {
            // Canceled, do not save
            return;
      }

      if (dialogRet == 1) {
            // User gave explicit directory
            var processedPath = global.outputRootDir;
      } else {
            // Use defaults
            var processedPath = util.combinePath(global.outputRootDir, global.AutoProcessedDir);
      }
      processedPath = util.ensurePathEndSlash(processedPath);

      global.run_results.processing_steps_file = processedPath + logfname;

      console.writeln("Write processing steps to " + global.run_results.processing_steps_file);


      var file = new File();
      file.createForWriting(global.run_results.processing_steps_file);

      file.write(console.endLog());
      file.outTextLn("======================================");
      if (global.lightFileNames != null) {
            file.outTextLn("Dialog files:");
            for (var i = 0; i < global.lightFileNames.length; i++) {
                  file.outTextLn(global.lightFileNames[i]);
            }
      }
      if (alignedFiles != null) {
            file.outTextLn("Aligned files:");
            for (var i = 0; i < alignedFiles.length; i++) {
                  file.outTextLn(alignedFiles[i]);
            }
      }
      file.outTextLn(global.processing_steps);
      file.close();
}

// Find window and optionally search without a prefix
function findWindowCheckBaseNameIf(id, check_base_name)
{
      var win = util.findWindow(util.ensure_win_prefix(id));
      if (win == null && check_base_name && ppar.win_prefix != "") {
            // Try to find without prefix so we can autocontinue
            // from default run but will have new output
            // file names.
            win = util.findWindow(id);
      }
      return win;
}

// Find window id and optionally search without a prefix
function findWindowIdCheckBaseNameIf(name, check_base_name)
{
      var id = util.findWindowId(util.ensure_win_prefix(name));
      if (id == null && check_base_name && ppar.win_prefix != "") {
            // Try to find without prefix so we can autocontinue
            // from default run but will have new output
            // file names.
            id = util.findWindowId(name);
            autocontinue_prefix = "";
      } else {
            autocontinue_prefix = ppar.win_prefix;
      }
      if (id) {
            console.writeln("findWindowIdCheckBaseNameIf: found " + id);
      }
      return id;
}

// Find window with a prefix. If not found and check_base is true
// then try without prefix
function findWindowNoPrefixIf(id, check_base)
{
      var win = util.findWindow(id);
      if (win == null && check_base && ppar.win_prefix != '' && id.startsWith(ppar.win_prefix)) {
            // Try without prefix
            var win = util.findWindow(id.substring(ppar.win_prefix.length));
      }
      return win;
}

function findProcessedChannelImages(check_base_name)
{
      autocontinue_processed_channel_images.luminance_id = null;
      autocontinue_processed_channel_images.rgb = false;
      autocontinue_processed_channel_images.narrowband = false;
      autocontinue_processed_channel_images.image_ids = [];

      if (!par.save_processed_channel_images) {
            return;
      }

      for (var i = 0; i < autocontinue_processed_channel_images.lrgb_channels.length; i++) {
            var id = findWindowIdCheckBaseNameIf("Integration_" + autocontinue_processed_channel_images.lrgb_channels[i] + "_processed", check_base_name);
            if (id) {
                  if (i == 0) {
                        autocontinue_processed_channel_images.luminance_id = id;
                  } else {
                        autocontinue_processed_channel_images.rgb = true;
                        autocontinue_processed_channel_images.image_ids[autocontinue_processed_channel_images.image_ids.length] = id;
                  }
            }
      }
      if (autocontinue_processed_channel_images.rgb && autocontinue_processed_channel_images.image_ids.length < 3) {
            util.throwFatalError("Not all RGB processed channel images found");
      }
      for (var i = 0; i < autocontinue_processed_channel_images.narrowband_channels.length; i++) {
            var id = findWindowIdCheckBaseNameIf("Integration_" + autocontinue_processed_channel_images.narrowband_channels[i] + "_processed", check_base_name);
            if (id) {
                  autocontinue_processed_channel_images.narrowband = true;
                  autocontinue_processed_channel_images.image_ids[autocontinue_processed_channel_images.image_ids.length] = id;
            }
      }
}

function findChannelImages(check_base_name)
{
      findProcessedChannelImages(check_base_name);

      L_id = findWindowIdCheckBaseNameIf("Integration_L", check_base_name);
      R_id = findWindowIdCheckBaseNameIf("Integration_R", check_base_name);
      G_id = findWindowIdCheckBaseNameIf("Integration_G", check_base_name);
      B_id = findWindowIdCheckBaseNameIf("Integration_B", check_base_name);
      H_id = findWindowIdCheckBaseNameIf("Integration_H", check_base_name);
      S_id = findWindowIdCheckBaseNameIf("Integration_S", check_base_name);
      O_id = findWindowIdCheckBaseNameIf("Integration_O", check_base_name);
      RGB_color_id = findWindowIdCheckBaseNameIf("Integration_RGB_color", check_base_name);
      if (RGB_color_id == null) {
            // Try with old name
            RGB_color_id = findWindowIdCheckBaseNameIf("Integration_RGBcolor", check_base_name);
      }
}

function fileNamesFromOutputData(outputFileData)
{
      var newFileNames = [];
      for (var i = 0; i < outputFileData.length; i++) {
            var filePath = outputFileData[i][0];
            if (filePath != null && filePath != "") {
                  newFileNames[newFileNames.length] = filePath;
            }
      }
      return newFileNames;
}

function debayerImages(fileNames)
{
      var succ = true;

      util.addStatusInfo("Debayer " + fileNames.length + " images");
      util.addProcessingStep("debayerImages, fileNames[0] " + fileNames[0]);

      var P = new Debayer;
      P.cfaPattern = global.debayerPattern_enums[global.debayerPattern_values.indexOf(par.debayer_pattern.val)];
      P.targetItems = fileNamesToEnabledPath(fileNames);
      P.outputDirectory = global.outputRootDir + global.AutoOutputDir;
      P.overwriteExistingFiles = true;

      try {
            succ = P.executeGlobal();
      } catch(err) {
            succ = false;
            console.criticalln(err);
      }

      if (!succ) {
            console.criticalln("Debayer failed");
            util.addProcessingStep("Error, maybe debayer pattern was not correctly selected");
            util.throwFatalError("Debayer failed");
      }

      return fileNamesFromOutputData(P.outputFileData);
}

function bandingEngineForImages(fileNames)
{
      util.addStatusInfo("Banding reduction for " + fileNames.length + " images");
      util.addProcessingStep("bandingEngineForImages, fileNames[0] " + fileNames[0]);

      var newFileNames = [];
      var outputDir = global.outputRootDir + global.AutoOutputDir;
      var outputExtension = ".xisf";

      var bandingEngine = new AutoIntegrateBandingEngine();

      bandingEngine.setAmount(par.banding_reduction_amount.val);
      bandingEngine.setHighlightProtect(par.banding_reduction_protect_highlights.val);

      for (var i = 0; i < fileNames.length; i++) {
            console.writeln("bandingEngineForImages, "+ fileNames[i]);
            var imageWindows = ImageWindow.open(fileNames[i]);
            if (imageWindows.length != 1) {
                  util.throwFatalError("*** bandingEngineForImages Error: imageWindows.length: " + imageWindows.length);
            }
            var imageWindow = imageWindows[0];
            if (imageWindow == null) {
                  util.throwFatalError("*** bandingEngineForImages Error: Can't read file: " + fileNames[i]);
            }

            bandingEngine.setTargetImage(imageWindow.mainView.image);
            bandingEngine.doit(imageWindow.mainView);

            var filePath = generateNewFileName(fileNames[i], outputDir, "_cb", outputExtension);

            if (!writeImage(filePath, imageWindow)) {
                  util.throwFatalError("*** bandingEngineForImages Error: Can't write output image: " + filePath);
            }
            newFileNames[newFileNames.length] = filePath;
            util.forceCloseOneWindow(imageWindow);
      }

      return newFileNames;
}

// Extract channels from color/OSC/DSLR files. As a result
// we get a new file list with channel files.
function extractChannels(fileNames)
{
      var newFileNames = [];
      var outputDir = global.outputRootDir + global.AutoOutputDir;
      var outputExtension = ".xisf";
      if (par.extract_channel_mapping.val == 'LRGB') {
            var channel_map = "RGB";
      } else {
            var channel_map = par.extract_channel_mapping.val;
      }

      util.addStatusInfo("Extract channels, " + par.extract_channel_mapping.val);
      util.addProcessingStep("extractChannels, " + par.extract_channel_mapping.val + ", fileNames[0] " + fileNames[0]);
      
      for (var i = 0; i < fileNames.length; i++) {
            // Open source image window from a file
            var imageWindows = ImageWindow.open(fileNames[i]);
            if (imageWindows.length != 1) {
                  util.throwFatalError("*** extractChannels Error: imageWindows.length: " + imageWindows.length);
            }
            var imageWindow = imageWindows[0];
            if (imageWindow == null) {
                  util.throwFatalError("*** extractChannels Error: Can't read file: " + fileNames[i]);
            }

            // Extract channels and save each channel to a separate file.
            if (par.extract_channel_mapping.val == 'LRGB') {
                  var targetWindow = extractLchannel(imageWindow);
                  var filePath = generateNewFileName(fileNames[i], outputDir, "_L", outputExtension);
                  util.setFITSKeyword(targetWindow, "FILTER", "L", "AutoIntegrate extracted channel")
                  // Save window
                  if (!writeImage(filePath, targetWindow)) {
                        util.throwFatalError("*** extractChannels Error: Can't write output image: " + filePath);
                  }
                  newFileNames[newFileNames.length] = filePath;
                  util.forceCloseOneWindow(targetWindow);
            }

            var rId = extractRGBchannel(imageWindow.mainView.id, 'R');
            var rWin = util.findWindow(rId);
            var filePath = generateNewFileName(fileNames[i], outputDir, "_" + channel_map[0], outputExtension);
            util.setFITSKeyword(rWin, "FILTER", channel_map[0], "AutoIntegrate extracted channel")
            if (!writeImage(filePath, rWin)) {
                  util.throwFatalError("*** extractChannels Error: Can't write output image: " + filePath);
            }
            newFileNames[newFileNames.length] = filePath;
            util.forceCloseOneWindow(rWin);

            var gId = extractRGBchannel(imageWindow.mainView.id, 'G');
            var gWin = util.findWindow(gId);
            var filePath = generateNewFileName(fileNames[i], outputDir, "_" + channel_map[1], outputExtension);
            util.setFITSKeyword(gWin, "FILTER", channel_map[1], "AutoIntegrate extracted channel")
            if (!writeImage(filePath, gWin)) {
                  util.throwFatalError("*** extractChannels Error: Can't write output image: " + filePath);
            }
            newFileNames[newFileNames.length] = filePath;
            util.forceCloseOneWindow(gWin);

            var bId = extractRGBchannel(imageWindow.mainView.id, 'B');
            var bWin = util.findWindow(bId);
            var filePath = generateNewFileName(fileNames[i], outputDir, "_" + channel_map[2], outputExtension);
            util.setFITSKeyword(bWin, "FILTER", channel_map[2], "AutoIntegrate extracted channel")
            if (!writeImage(filePath, bWin)) {
                  util.throwFatalError("*** extractChannels Error: Can't write output image: " + filePath);
            }
            newFileNames[newFileNames.length] = filePath;
            util.forceCloseOneWindow(bWin);

            // Close window
            util.forceCloseOneWindow(imageWindow);
      }
      return newFileNames;
}

function findStartWindowCheckBaseNameIf(id, check_base_name)
{
      var win = findWindowCheckBaseNameIf(id, check_base_name);
      if (win) {
            console.writeln("findStartWindowCheckBaseNameIf: found " + win.mainView.id);
      }
      return win;
}

function findStartImages(auto_continue, check_base_name)
{
      /* Check if we have manually done histogram transformation. */
      L_HT_win = findStartWindowCheckBaseNameIf("L_HT", check_base_name);
      RGB_HT_win = findStartWindowCheckBaseNameIf("RGB_HT", check_base_name);

      /* Check if we have manual background extracted files. */
      L_BE_win = findStartWindowCheckBaseNameIf("Integration_L_DBE", check_base_name);
      R_BE_win = findStartWindowCheckBaseNameIf("Integration_R_DBE", check_base_name);
      G_BE_win = findStartWindowCheckBaseNameIf("Integration_G_DBE", check_base_name);
      B_BE_win = findStartWindowCheckBaseNameIf("Integration_B_DBE", check_base_name);
      H_BE_win = findStartWindowCheckBaseNameIf("Integration_H_DBE", check_base_name);
      S_BE_win = findStartWindowCheckBaseNameIf("Integration_S_DBE", check_base_name);
      O_BE_win = findStartWindowCheckBaseNameIf("Integration_O_DBE", check_base_name);
      RGB_BE_win = findStartWindowCheckBaseNameIf("Integration_RGB_DBE", check_base_name);

      /* Check for base images. We cannot use original image name because they are generated
       * during the processing and would be overwritten or processing would fail.
       */
      L_start_win = findStartWindowCheckBaseNameIf("Integration_L_start", check_base_name);
      RGB_start_win = findStartWindowCheckBaseNameIf("Integration_RGB_start", check_base_name);
      if (RGB_start_win == null) {
            RGB_start_win = findStartWindowCheckBaseNameIf("Integration_RGB_narrowband", check_base_name);
      }

      findChannelImages(check_base_name);

      if (util.is_extra_option() || util.is_narrowband_option()) {
            for (var i = 0; i < global.final_windows.length; i++) {
                  final_win = findWindowNoPrefixIf(global.final_windows[i], check_base_name);
                  if (final_win != null) {
                        break;
                  }
            }
      }
      if (L_BE_win != null || L_HT_win != null || L_id != null) {
            is_luminance_images = true;
      } else {
            is_luminance_images = false;
      }

      var preview_id = null;

      if (final_win != null) {
            util.addProcessingStep("Final image " + final_win.mainView.id);
            preview_id = final_win.mainView.id;
            preprocessed_images = global.start_images.FINAL;
      } else if (checkAutoCont(L_HT_win) && checkAutoCont(RGB_HT_win)) {      /* L,RGB HistogramTransformation */
            util.addProcessingStep("L,RGB HistogramTransformation");
            preview_id = L_HT_win.mainView.id;
            preprocessed_images = global.start_images.L_RGB_HT;
      } else if (checkAutoCont(RGB_HT_win)) {                                 /* RGB (color) HistogramTransformation */
            util.addProcessingStep("RGB (color) HistogramTransformation " + RGB_HT_win.mainView.id);
            preview_id = RGB_HT_win.mainView.id;
            preprocessed_images = global.start_images.RGB_HT;
      } else if (checkAutoCont(L_BE_win) && checkAutoCont(RGB_BE_win)) {      /* L,RGB background extracted */
            util.addProcessingStep("L,RGB background extracted");
            preview_id = L_BE_win.mainView.id;
            preprocessed_images = global.start_images.L_RGB_BE;
      } else if (checkAutoCont(RGB_BE_win)) {                                 /* RGB (color) background extracted */
            util.addProcessingStep("RGB (color) background extracted " + RGB_BE_win.mainView.id);
            preview_id = RGB_BE_win.mainView.id;
            preprocessed_images = global.start_images.RGB_BE;
      } else if ((checkAutoCont(R_BE_win) && checkAutoCont(G_BE_win) && checkAutoCont(B_BE_win)) ||
                  (checkAutoCont(H_BE_win) && checkAutoCont(O_BE_win))) {     /* L,R,G,B background extracted */
            util.addProcessingStep("L,R,G,B background extracted");
            preview_id = checkAutoCont(R_BE_win) ? R_BE_win.mainView.id : H_BE_win.mainView.id;
            preprocessed_images = global.start_images.L_R_G_B_BE;
            narrowband = checkAutoCont(H_BE_win) || checkAutoCont(O_BE_win);
      } else if (RGB_color_id != null 
                  && H_id == null && O_id == null && L_id == null) {          /* RGB (color) integrated image */
            util.addProcessingStep("RGB (color) integrated image " + RGB_color_id);
            preview_id = RGB_color_id;
            var check_name = ppar.win_prefix + "Integration_RGB_ABE";
            if (auto_continue && util.findWindow(check_name)) {
                  util.throwFatalError("Cannot start AutoContinue, processed image " + check_name + " already exists. " +
                                    "Close previously processed images or use a different window prefix.")
            }
            var check_name = ppar.win_prefix + "Integration_RGB_noABE";
            if (auto_continue && util.findWindow(check_name)) {
                  util.throwFatalError("Cannot start AutoContinue, processed image " + check_name + " already exists. " +
                                    "Close previously processed images or use a different window prefix.")
            }
            checkAutoCont(util.findWindow(RGB_color_id));
            preprocessed_images = global.start_images.RGB_COLOR;
      } else if (autocontinue_processed_channel_images.image_ids.length > 0) {                           /* L,R,G,B,H,S,O map images */
            util.addProcessingStep("L,R,G,B processed channel images");
            preview_id = autocontinue_processed_channel_images.image_ids[0];
            var check_name = ppar.win_prefix + "Integration_RGB";
            if (auto_continue && util.findWindow(check_name)) {
                  util.throwFatalError("Cannot start AutoContinue, processed image " + check_name + " already exists. " +
                                    "Close previously processed images or use a different window prefix.")
            }
            checkAutoCont(util.findWindow(autocontinue_processed_channel_images.image_ids[0]));
            narrowband = autocontinue_processed_channel_images.narrowband;
            preprocessed_images = global.start_images.L_R_G_B_PROCESSED;
            if (autocontinue_processed_channel_images.luminance_id != null) {
                  is_luminance_images = true;
            }
            // Clear possible narrowband images because we use already processed and mapped images
            H_id = null; 
            S_id = null; 
            O_id != null;
      } else if ((R_id != null && G_id != null && B_id != null) ||
                  (H_id != null && O_id != null)) {                           /* L,R,G,B integrated images */
            util.addProcessingStep("L,R,G,B integrated images");
            preview_id = R_id != null ? R_id : H_id;
            var check_name = ppar.win_prefix + "Integration_RGB";
            if (auto_continue && util.findWindow(check_name)) {
                  util.throwFatalError("Cannot start AutoContinue, processed image " + check_name + " already exists. " +
                                    "Close previously processed images or use a different window prefix.")
            }
            checkAutoCont(util.findWindow(R_id));
            checkAutoCont(util.findWindow(H_id));
            narrowband = H_id != null || S_id != null || O_id != null;
            preprocessed_images = global.start_images.L_R_G_B;
      } else if (checkAutoCont(L_start_win) && checkAutoCont(RGB_start_win)) {      /* L and RGB images */
            util.addProcessingStep("L and RGB images " + L_start_win.mainView.id + " and " + RGB_start_win.mainView.id);
            preview_id = L_start_win.mainView.id;
            is_luminance_images = true;
            preprocessed_images = global.start_images.L_RGB;
      } else if (checkAutoCont(RGB_start_win)) {                                    /* RGB image */
            util.addProcessingStep("RGB image " + RGB_start_win.mainView.id);
            preview_id = RGB_start_win.mainView.id;
            if (RGB_start_win.mainView.id.indexOf("narrowband") != -1) {
                  narrowband = true;
            }
            preprocessed_images = global.start_images.RGB;
      } else {
            console.writeln("No start image");
            preprocessed_images = global.start_images.NONE;
      }
      if (preview_id != null && auto_continue) {
            guiUpdatePreviewId(preview_id);
      }
      return preprocessed_images;
}

function getFileProcessedStatusEx(fileNames, postfix, outputDir)
{
      if (!par.use_processed_files.val) {
            return { processed: [], unprocessed: fileNames };
      }
      var processed = [];
      var unprocessed = [];
      for (var i = 0; i < fileNames.length; i++) {
            var outputExtension = ".xisf";
            var processedName = generateNewFileName(fileNames[i], outputDir, postfix, outputExtension);
            if (File.exists(processedName)) {
                  console.writeln("getFileProcessedStatus, found processed file " + processedName);
                  processed.push(processedName);
            } else {
                  console.writeln("getFileProcessedStatus, could not find processed file " + processedName);
                  unprocessed.push(fileNames[i]);
            }
      }
      console.writeln("Found " + processed.length + "/" + fileNames.length + " files already processed.");
      return { processed: processed, unprocessed: unprocessed };
}

function getFileProcessedStatus(fileNames, postfix)
{
      return getFileProcessedStatusEx(fileNames, postfix, global.outputRootDir + global.AutoOutputDir);
}

function getFileProcessedStatusCalibrated(fileNames, postfix)
{
      return getFileProcessedStatusEx(fileNames, postfix, global.outputRootDir + global.AutoCalibratedDir);
}

function preprocessedName(pi)
{
      switch (pi) {
            case global.start_images.NONE:
                  return "None";
            case global.start_images.L_R_G_B_BE:
                  return "Background extracted channel images";
            case global.start_images.L_RGB_BE:
                  return "Background extracted L and RGB images";
            case global.start_images.RGB_BE:
                  return "Background extracted RGB image";
            case global.start_images.L_RGB_HT:
                  return "Stretched L and RGB images";
            case global.start_images.RGB_HT:
                  return "Stretched RGB image";
            case global.start_images.RGB_COLOR:
                  return "Integrated RGB image";
            case global.start_images.L_R_G_B_PROCESSED:
                  return "Processed channel images";
            case global.start_images.L_R_G_B:
                  return "Integrated channel images";
            case global.start_images.RGB:
                  return "RGB image";
            case global.start_images.L_RGB:
                  return "L and RGB image";
            case global.start_images.FINAL:
                  return "Final image";
            case global.start_images.CALIBRATE_ONLY:
                  return "Calibrate only";
            default:
                  return "Unknown " + pi;
      }
}

/* Create master L, R, G and B images, or a Color image
 *
 * check for preprocessed images
 * get files from dialog
 * if we have bias, dark or flat files, run  image calibration
 * by default run cosmetic correction
 * for color files do debayering
 * by default run subframe selector
 * run star alignment
 * optionally run local normalization 
 * find files for each L, R, G and B channels
 * run image integration to create L, R, G and B images, or color image
 * 
 * Return values:
 *    retval.ERROR      - error
 *    retval.SUCCESS    - success
 *    retval.INCOMPLETE - stopped because of an option
 */
function CreateChannelImages(parent, auto_continue)
{
      util.addProcessingStepAndStatusInfo("Create channel images");

      final_win = null;
      global.write_processing_log_file = false;  // do not write the log file if we fail very early

      if (auto_continue) {
            console.writeln("AutoContinue, find start images with prefix");
            preprocessed_images = findStartImages(true, false);
            if (preprocessed_images == global.start_images.NONE && ppar.win_prefix != "") {
                  console.writeln("AutoContinue, find start images without prefix");
                  preprocessed_images = findStartImages(true, true);
            }
      } else {
            // find old images with prefix
            preprocessed_images = findStartImages(false, false);
      }

      if (auto_continue) {
          if (preprocessed_images == global.start_images.NONE) {
            util.addProcessingStep("No preprocessed images found, processing not started!");
            return retval.ERROR;
          }
      } else {
            if (preprocessed_images != global.start_images.NONE) {
                  util.addProcessingStep("There are already preprocessed images, processing not started!");
                  util.addProcessingStep("Close or rename old images before continuing.");
                  return retval.ERROR;
            }  
      }

      /* Check if we have manually created mask. */
      range_mask_win = null;

      global.write_processing_log_file = true;

      if (preprocessed_images == global.start_images.FINAL) {
            return true;
      } else if (preprocessed_images != global.start_images.NONE) {
            util.addProcessingStep("Using preprocessed images: " + preprocessedName(preprocessed_images));
            console.writeln("L_BE_win="+L_BE_win);
            console.writeln("RGB_BE_win="+RGB_BE_win);
            console.writeln("L_HT_win="+L_HT_win);
            console.writeln("RGB_HT_win="+RGB_HT_win);
            if (preprocessed_images == global.start_images.RGB_BE ||
                preprocessed_images == global.start_images.RGB_HT ||
                preprocessed_images == global.start_images.RGB_COLOR) 
            {
                  if (narrowband) {
                        util.addProcessingStep("Processing as narrowband images");
                  } else {
                        /* No L files, assume color. */
                        util.addProcessingStep("Processing as color images");
                  }
                  is_color_files = true;
            }
            if (par.force_new_mask.val) {
                  util.closeOneWindow(ppar.win_prefix + "AutoMask");
                  mask_win_id = null;
                  range_mask_win = null;
            } else {
                  /* Check if we already have a mask. It can be from previous run or manually created. */
                  mask_win_id = ppar.win_prefix + "AutoMask";
                  range_mask_win = util.findWindow(mask_win_id);
            }
      } else {
            /* Open dialog files and run SubframeSelector on them
             * to assigns SSWEIGHT.
             */
            var fileNames;
            if (global.lightFileNames == null) {
                  global.lightFileNames = engine.openImageFiles("Light", true, false);
                  util.addProcessingStep("Get files from dialog");
            }
            if (global.lightFileNames == null) {
                  global.write_processing_log_file = false;
                  console.writeln("No files to process");
                  return retval.ERROR;
            }

            guiUpdatePreviewFilename(global.lightFileNames[0]);

            // We keep track of extensions added to the file names
            // If we need to original file names we can substract
            // added extensions.
            var filename_postfix = '';

            if (global.outputRootDir == "" || util.pathIsRelative(global.outputRootDir)) {
                  /* Get path to current directory. */
                  global.outputRootDir = util.parseNewOutputDir(global.lightFileNames[0], global.outputRootDir);
                  console.writeln("CreateChannelImages, set global.outputRootDir ", global.outputRootDir);
            }

            util.ensureDir(global.outputRootDir);
            util.ensureDir(util.combinePath(global.outputRootDir, global.AutoOutputDir));
            util.ensureDir(util.combinePath(global.outputRootDir, global.AutoProcessedDir));

            var filtered_lights = engine.getFilterFiles(global.lightFileNames, global.pages.LIGHTS, '');
            if (isCustomMapping(filtered_lights.narrowband)
                && !par.image_weight_testing.val
                && !par.debayer_only.val
                && !par.binning_only.val
                && !par.extract_channels_only.val
                && !par.integrate_only.val
                && !par.calibrate_only.val)
            {
                  // Do a check round in custom mapping to verify that all needed
                  // channels have files.
                  // We exit with fatal error if some files are missing
                  global.write_processing_log_file = false;
                  customMapping(null, filtered_lights.allfilesarr);
                  global.write_processing_log_file = true;
            }

            if (par.extract_channels_only.val && par.extract_channel_mapping.val == 'None') {
                  util.throwFatalError("Extract channels only is selected but Extract channels option is " + par.extract_channel_mapping.val);
            }

            // Run image calibration if we have calibration frames
            var calibrateInfo = calibrateEngine(filtered_lights);
            global.lightFileNames = calibrateInfo[0];
            filename_postfix = filename_postfix + calibrateInfo[1];
            guiUpdatePreviewFilename(global.lightFileNames[0]);

            if (par.calibrate_only.val) {
                  return(retval.INCOMPLETE);
            }

            if (filename_postfix != '') {
                  // We did run calibration, filter again with calibrated lights
                  var filtered_files = engine.getFilterFiles(global.lightFileNames, global.pages.LIGHTS, filename_postfix);
            } else {
                  // Calibration was not run
                  var filtered_files = filtered_lights;
            }
            if (filtered_files.allfilesarr[channels.C].files.length == 0) {
                  is_color_files = false;
            } else {
                  is_color_files = true;
            }

            fileNames = global.lightFileNames;

            if (par.start_from_imageintegration.val 
                || par.image_weight_testing.val
                || par.cropinfo_only.val) 
            {
                  var skip_early_steps = true;
            } else {
                  var skip_early_steps = false;
            }

            if (par.binning.val > 0 && !skip_early_steps) {
                  if (is_color_files) {
                        util.addProcessingStep("No binning for color files");
                  } else {
                        var fileProcessedStatus = getFileProcessedStatus(fileNames, getBinningPostfix());
                        if (fileProcessedStatus.unprocessed.length == 0) {
                              fileNames = fileProcessedStatus.processed;
                        } else {
                              let processedFileNames = runBinningOnLights(fileProcessedStatus.unprocessed, filtered_files);
                              fileNames = processedFileNames.concat(fileProcessedStatus.processed);
                        }
                        filename_postfix = filename_postfix + getBinningPostfix();
                        guiUpdatePreviewFilename(fileNames[0]);
                  }
            } else if (par.binning_only.val) {
                  util.throwFatalError("Binning only set but no binning done, binning " + par.binning.val + " binning resample factor " + par.binning_resample.val);
            }
            if (par.binning_only.val) {
                  console.writeln("Binning only, stop");
                  return retval.INCOMPLETE;
            }
            if (!par.skip_cosmeticcorrection.val && !skip_early_steps) {
                  if (par.fix_column_defects.val || par.fix_row_defects.val) {
                        var ccFileNames = [];
                        var ccInfo = runLinearDefectDetection(fileNames);
                        for (var i = 0; i < ccInfo.length; i++) {
                              var fileProcessedStatus = getFileProcessedStatus(ccInfo[i].ccFileNames, '_cc');
                              if (fileProcessedStatus.unprocessed.length == 0) {
                                    ccFileNames = ccFileNames.concat(fileProcessedStatus.processed);
                              } else {
                                    util.addProcessingStep("run CosmeticCorrection for linear defect file group " + i + ", " + fileProcessedStatus.unprocessed.length + " files");
                                    let processedFileNames = runCosmeticCorrection(fileProcessedStatus.unprocessed, ccInfo[i].ccDefects, is_color_files);
                                    ccFileNames = ccFileNames.concat(processedFileNames, fileProcessedStatus.processed);
                              }
                        }
                        fileNames = ccFileNames;
                        guiUpdatePreviewFilename(fileNames[0]);
                  } else {
                        var defects = [];
                        /* Run CosmeticCorrection for each file.
                        * Output is *_cc.xisf files.
                        */
                        var fileProcessedStatus = getFileProcessedStatus(fileNames, '_cc');
                        if (fileProcessedStatus.unprocessed.length == 0) {
                              fileNames = fileProcessedStatus.processed;
                        } else {
                              let processedFileNames = runCosmeticCorrection(fileProcessedStatus.unprocessed, defects, is_color_files);
                              fileNames = processedFileNames.concat(fileProcessedStatus.processed);
                        }
                        guiUpdatePreviewFilename(fileNames[0]);
                  }
                  filename_postfix = filename_postfix + '_cc';
            }

            if (is_color_files && par.debayer_pattern.val != 'None' && !skip_early_steps) {
                  /* After cosmetic correction we need to debayer
                   * OSC/RAW images
                   */
                  var fileProcessedStatus = getFileProcessedStatus(fileNames, '_d');
                  if (fileProcessedStatus.unprocessed.length == 0) {
                        fileNames = fileProcessedStatus.processed;
                  } else {
                        let processedFileNames = debayerImages(fileProcessedStatus.unprocessed);
                        fileNames = processedFileNames.concat(fileProcessedStatus.processed);
                  }
                  filename_postfix = filename_postfix + '_d';
                  guiUpdatePreviewFilename(fileNames[0]);
            }

            if (par.banding_reduction.val) {
                  var fileProcessedStatus = getFileProcessedStatus(fileNames, '_cb');
                  if (fileProcessedStatus.unprocessed.length == 0) {
                        fileNames = fileProcessedStatus.processed;
                  } else {
                        let processedFileNames = bandingEngineForImages(fileProcessedStatus.unprocessed);
                        fileNames = processedFileNames.concat(fileProcessedStatus.processed);
                  }
                  filename_postfix = filename_postfix + '_cb';
                  guiUpdatePreviewFilename(fileNames[0]);
            }

            if (is_color_files && par.debayer_only.val) {
                  return retval.INCOMPLETE;
            }

            if (par.extract_channel_mapping.val != 'None' && is_color_files && !skip_early_steps) {
                  // Extract channels from color/OSC/DSLR files. As a result
                  // we get a new file list with channel files.
                  fileNames = extractChannels(fileNames);
                  guiUpdatePreviewFilename(fileNames[0]);

                  // We extracted channels, filter again with extracted channels
                  console.writeln("Filter again with extracted channels")
                  filename_postfix = '';
                  is_color_files = false;
                  filtered_files = engine.getFilterFiles(fileNames, global.pages.LIGHTS, filename_postfix);
                  console.writeln("Continue with mono processing")
            }
            if (par.extract_channels_only.val) {
                  return retval.INCOMPLETE;
            }
            if (par.ABE_on_lights.val && !skip_early_steps) {
                  var fileProcessedStatus = getFileProcessedStatus(fileNames, '_ABE');
                  if (fileProcessedStatus.unprocessed.length == 0) {
                        fileNames = fileProcessedStatus.processed;
                  } else {
                        let processedFileNames = runABEOnLights(fileProcessedStatus.unprocessed);
                        fileNames = processedFileNames.concat(fileProcessedStatus.processed);
                  }
                  filename_postfix = filename_postfix + '_ABE';
                  guiUpdatePreviewFilename(fileNames[0]);
            }

            if (!par.skip_subframeselector.val 
                && !par.start_from_imageintegration.val
                && !par.cropinfo_only.val) 
            {
                  /* Run SubframeSelector that assigns SSWEIGHT for each file.
                   * Output is *_a.xisf files.
                   */
                  if (par.image_weight_testing.val) {
                        var names_and_weights = runSubframeSelector(fileNames);
                  } else {
                        var fileProcessedStatus = getFileProcessedStatus(fileNames, '_a');
                        if (fileProcessedStatus.unprocessed.length == 0) {
                              var names_and_weights = { filenames: fileProcessedStatus.processed, ssweights: [], postfix: '_a' };
                        } else {
                              var names_and_weights = runSubframeSelector(fileProcessedStatus.unprocessed);
                              if (names_and_weights.postfix != '_a') {
                                    util.throwFatalError("Incorrect postfix " + names_and_weights.postfix + " returned from runSubframeSelector");
                              }
                              names_and_weights.filenames = names_and_weights.filenames.concat(fileProcessedStatus.processed);
                        }
                  }
                  filename_postfix = filename_postfix + names_and_weights.postfix;
            } else {
                  var names_and_weights = { filenames: fileNames, ssweights: [], postfix: '' };
            }

            /* Find file with best SSWEIGHT to be used
             * as a reference image in StarAlign.
             * Also possible file list filtering is done.
             */
            var retarr = findBestSSWEIGHT(parent, names_and_weights, filename_postfix);
            if (par.use_processed_files.val && global.star_alignment_image != null) {
                  console.writeln("Switching best image to already used star alignment image " + global.star_alignment_image);
                  global.best_image = global.star_alignment_image;
            } else {
                  global.best_image = retarr[0];
            }
            fileNames = retarr[1];

            if (gui) {
                  gui.setBestImageInTreeBox(parent, parent.treeBox[global.pages.LIGHTS], global.best_image, filename_postfix);
            }

            if (par.image_weight_testing.val) {
                  return retval.INCOMPLETE;
            }

            /* StarAlign
            */
            if (!par.start_from_imageintegration.val
                && !par.cropinfo_only.val) 
            {
                  var fileProcessedStatus = getFileProcessedStatus(fileNames, '_r');
                  if (fileProcessedStatus.unprocessed.length == 0) {
                        alignedFiles = fileProcessedStatus.processed;
                  } else {
                        let processedFileNames = runStarAlignment(fileProcessedStatus.unprocessed, global.best_image);
                        alignedFiles = processedFileNames.concat(fileProcessedStatus.processed);
                  }
                  filename_postfix = filename_postfix + '_r';
                  guiUpdatePreviewFilename(alignedFiles[0]);
            } else {
                  alignedFiles = fileNames;
            }

            /* Find files for each L, R, G, B, H, O and S channels, or color files.
             */
            findLRGBchannels(parent, alignedFiles, filename_postfix);

            if (par.start_from_imageintegration.val || par.cropinfo_only.val) {
                  /* We start from *_r.xisf files that are normally in AutoOutput
                   * subdirectory. So in the global.outputRootDir we replace AutoOutput
                   * with . (dot). In normal setup this will put output files
                   * to a correct AutoProcessed subdirectory.
                   */
                  console.writeln("Option start_from_imageintegration or cropinfo_only selected, fix output directory");
                  console.writeln("Current global.outputRootDir " + global.outputRootDir);

                  global.outputRootDir = global.outputRootDir.replace("AutoOutput", ".");

                  console.writeln("Fixes global.outputRootDir " + global.outputRootDir);
            }
            if (par.cropinfo_only.val) {
                  return retval.INCOMPLETE;
            }
            /* ImageIntegration
            */
            if (C_images.images.length == 0) {
                  /* We have LRGB files. */
                  if (!par.monochrome_image.val) {
                        if (is_luminance_images) {
                              util.addProcessingStepAndStatusInfo("Processing as LRGB files");
                        } else {
                              util.addProcessingStepAndStatusInfo("Processing as RGB files");
                        }
                  } else {
                        util.addProcessingStepAndStatusInfo("Processing as monochrome files");
                  }
                  is_color_files = false;

                  if (is_luminance_images) {
                        L_id = runImageIntegration(L_images, 'L');
                        // Make a copy of the luminance image so we do not
                        // change the original image. Original image may be
                        // needed in AutoContinue.
                        luminance_id = copyToMapIf(L_id);
                  }

                  if (!par.monochrome_image.val) {
                        R_id = runImageIntegration(R_images, 'R');
                        G_id = runImageIntegration(G_images, 'G');
                        B_id = runImageIntegration(B_images, 'B');
                        H_id = runImageIntegration(H_images, 'H');
                        S_id = runImageIntegration(S_images, 'S');
                        O_id = runImageIntegration(O_images, 'O');

                        util.windowShowif(R_id);
                        util.windowShowif(G_id);
                        util.windowShowif(B_id);
                        util.windowShowif(H_id);
                        util.windowShowif(S_id);
                        util.windowShowif(O_id);
                  }

            } else {
                  /* We have color files. */
                  util.addProcessingStepAndStatusInfo("Processing as color files");
                  RGB_color_id = runImageIntegration(C_images, 'RGB_color');
            }
      }
      return retval.SUCCESS;
}

/* Create  a mask from linear image. This function
 * used to create temporary masks.
 */
function CreateNewTempMaskFromLinearWin(imgWin, is_color)
{
      console.writeln("CreateNewTempMaskFromLinearWin from " + imgWin.mainView.id);

      var winCopy = util.copyWindowEx(imgWin, imgWin.mainView.id + "_tmp", true);

      /* Run HistogramTransform based on auto stretch because mask should be non-linear. */
      winCopy = runHistogramTransform(winCopy, null, is_color, 'mask').win;

      /* Create mask.
       */
      var maskWin = newMaskWindow(winCopy, imgWin.mainView.id + "_mask", true);

      util.forceCloseOneWindow(winCopy);

      return maskWin;
}

/* Ensure we have a mask to be used for LRGB processing. Used for example
 * for noise reduction and sharpening. We use luminance image as
 * mask.
 */
function LRGBEnsureMaskEx(L_id_for_mask, stretched)
{
      util.addProcessingStepAndStatusInfo("LRGB ensure mask");

      if (L_id_for_mask != null) {
            if (range_mask_win != null) {
                  console.writeln("Close old mask " + mask_win_id);
            }
            range_mask_win = null;
            util.closeOneWindow(mask_win_id);
      }
      if (winIsValid(range_mask_win)) {
            /* We already have a mask. */
            util.addProcessingStep("Use existing mask " + range_mask_win.mainView.id);
            mask_win = range_mask_win;
      } else {
            var L_win;
            if (L_id_for_mask != null) {
                  util.addProcessingStep("Using image " + L_id_for_mask + " for a mask");
                  L_win = util.copyWindowEx(ImageWindow.windowById(L_id_for_mask), ppar.win_prefix + "L_win_mask", true);
                  if (!stretched) {
                        L_win = runHistogramTransform(L_win, null, false, 'mask').win;
                  }
            } else if (preprocessed_images == global.start_images.L_RGB_HT) {
                  /* We have run HistogramTransformation. */
                  util.addProcessingStep("Using image " + L_HT_win.mainView.id + " for a mask");
                  L_win = util.copyWindow(L_HT_win, ppar.win_prefix + "L_win_mask");
            } else {
                  if (preprocessed_images == global.start_images.L_RGB_BE ||
                             preprocessed_images == global.start_images.L_R_G_B_BE) 
                  {
                        /* We have background extracted from L. */
                        util.addProcessingStep("Using image " + L_BE_win.mainView.id + " for a mask");
                        L_win = ImageWindow.windowById(L_BE_win.mainView.id);
                  } else {
                        if (preprocessed_images == global.start_images.L_RGB) {
                              util.addProcessingStep("Using image " + L_start_win.mainView.id + " for a mask");
                              L_win = L_start_win;
                        } else if (luminance_id) {
                              util.addProcessingStep("Using image " + luminance_id + " for a mask");
                              L_win = ImageWindow.windowById(luminance_id);
                        } else {
                              util.throwFatalError("No luminance image id for a mask");
                        }
                  }
                  L_win = util.copyWindowEx(L_win, ppar.win_prefix + "L_win_mask", true);

                  /* Run HistogramTransform based on auto stretch because mask should be non-linear. */
                  L_win = runHistogramTransform(L_win, null, false, 'mask').win;
            }
            /* Create mask.
             */
            mask_win_id = ppar.win_prefix + "AutoMask";
            mask_win = newMaskWindow(L_win, mask_win_id, false);
            util.closeOneWindow(L_win.mainView.id);
      }
}

function LRGBEnsureMask(L_id_for_mask)
{
      LRGBEnsureMaskEx(L_id_for_mask, false);
}

/* Ensure we have mask for color processing. Mask is needed also in non-linear
 * so we do a separate runHistogramTransform here.
 */
function ColorEnsureMask(color_img_id, RGBstretched, force_new_mask)
{
      util.addProcessingStepAndStatusInfo("Color ensure mask");

      if (force_new_mask) {
            range_mask_win = null;
            util.closeOneWindow(mask_win_id);
      }

      if (winIsValid(range_mask_win)) {
            /* We already have a mask. */
            util.addProcessingStep("Use existing mask " + range_mask_win.mainView.id);
            mask_win = range_mask_win;
      } else {
            var color_win = ImageWindow.windowById(color_img_id);
            util.addProcessingStep("Using image " + color_img_id + " for a mask");
            var color_win_copy = util.copyWindowEx(color_win, "color_win_mask", true);

            if (!RGBstretched) {
                  /* Run HistogramTransform based on autostretch because mask should be non-linear. */
                  color_win_copy = runHistogramTransform(color_win_copy, null, true, 'mask').win;
            }

            /* Create mask.
             */
            mask_win_id = ppar.win_prefix + "AutoMask";
            mask_win = newMaskWindow(color_win_copy, mask_win_id, false);
            util.closeOneWindow(color_win_copy.mainView.id);
      }
      console.writeln("ColorEnsureMask done");
}

/* Process L image
 *
 * optionally run ABE on L image
 * by default run noise reduction on L image using a mask
 * run histogram transformation on L to make in non-linear
 * by default run noise reduction on L image using a mask
 */
function ProcessLimage(RGBmapping)
{
      util.addProcessingStepAndStatusInfo("Process L image");

      /* LRGB files */
      if (preprocessed_images == global.start_images.L_RGB_HT) {
            /* We have run HistogramTransformation. */
            util.addProcessingStep("Start from image " + L_HT_win.mainView.id);
            L_ABE_HT_win = L_HT_win;
            L_ABE_HT_id = L_HT_win.mainView.id;
      } else {
            if (preprocessed_images == global.start_images.L_R_G_B_PROCESSED) {
                  console.writeln("Use processed channel image for L");
                  if (autocontinue_processed_channel_images.luminance_id == null) {
                        util.throwFatalError("Missing processed luminance channel image");
                  }
                  if (luminance_id == null) {
                        luminance_id = copyOneProcessedToMapImage(autocontinue_processed_channel_images.luminance_id);
                  }
                  var L_win = ImageWindow.windowById(luminance_id);
                  L_ABE_id = noABEcopyWin(L_win);
            } else if (preprocessed_images == global.start_images.L_RGB_BE ||
                       preprocessed_images == global.start_images.L_R_G_B_BE) 
            {
                  /* We have background extracted from L. */
                  util.addProcessingStep("Start from image " + L_ABE_id);
                  L_ABE_id = L_BE_win.mainView.id;
            } else {
                  if (preprocessed_images == global.start_images.L_RGB) {
                        util.addProcessingStep("Start from image " + L_start_win.mainView.id);
                        var L_win = util.copyWindow(L_start_win, "Integration_L");
                  } else {
                        var L_win = ImageWindow.windowById(luminance_id);
                  }
                  if (!RGBmapping.stretched) {
                        /* Optionally run ABE on L
                        */
                        if (par.ABE_before_channel_combination.val) {
                              // ABE already done
                              L_ABE_id = noABEcopyWin(L_win);
                        } else if (par.use_ABE_on_L_RGB.val) {
                              // run ABE
                              L_ABE_id = runABE(L_win, false);
                        } else {
                              // no ABE
                              L_ABE_id = noABEcopyWin(L_win);
                        }
                  }
                  if (par.use_RGBNB_Mapping.val) {
                        var mapped_L_ABE_id = RGBNB_Channel_Mapping(L_ABE_id, 'L', par.L_bandwidth.val, par.L_mapping.val, par.L_BoostFactor.val);
                        mapped_L_ABE_id = util.windowRename(mapped_L_ABE_id, L_ABE_id + "_NB");
                        util.closeOneWindow(L_ABE_id);
                        L_ABE_id = mapped_L_ABE_id;
                  }
            }

            if (preprocessed_images != global.start_images.L_R_G_B_PROCESSED) {
                  if (!RGBmapping.combined && !RGBmapping.channel_noise_reduction) {
                        if (checkNoiseReduction('L', 'channel')) {
                              /* Noise reduction for L. */
                              luminanceNoiseReduction(ImageWindow.windowById(L_ABE_id), mask_win);
                        }
                  }
                  if (L_ABE_id && luminance_id) {
                        saveProcessedChannelImage(L_ABE_id, luminance_id);
                  }
            }
            /* On L image run HistogramTransform to stretch image to non-linear
            */
            L_ABE_HT_id = util.ensure_win_prefix(L_ABE_id + "_HT");
            if (!RGBmapping.stretched) {
                  if (!par.skip_sharpening.val && par.use_blurxterminator.val) {
                        runBlurXTerminator(ImageWindow.windowById(L_ABE_id));
                  }
                  if (par.remove_stars_before_stretch.val) {
                        removeStars(
                              ImageWindow.windowById(L_ABE_id), 
                              true,
                              false,
                              null,
                              null,
                              par.unscreen_stars.val);
                        // use starless L image as mask
                        LRGBEnsureMask(L_ABE_id);
                  }
                  if (checkNoiseReduction('L', 'linear')) {
                        luminanceNoiseReduction(ImageWindow.windowById(L_ABE_id), mask_win);
                  }
                  runHistogramTransform(
                              util.copyWindow(ImageWindow.windowById(L_ABE_id), L_ABE_HT_id), 
                              null,
                              false,
                              'L');
                  if (par.remove_stars_stretched.val) {
                        removeStars(
                              ImageWindow.windowById(L_ABE_HT_id), 
                              false,
                              false,
                              null,
                              null,
                              par.unscreen_stars.val);
                        // use starless L image as mask
                        LRGBEnsureMaskEx(L_ABE_HT_id, true);
                  }
            } else {
                  if (checkNoiseReduction('L', 'linear')) {
                        luminanceNoiseReduction(ImageWindow.windowById(L_ABE_id), mask_win);
                  }
                  util.copyWindow(ImageWindow.windowById(L_ABE_id), L_ABE_HT_id);
            }

            L_ABE_HT_win = ImageWindow.windowById(L_ABE_HT_id);
      }
      if (checkNoiseReduction('L', 'nonlinear')) {
            runNoiseReduction(L_ABE_HT_win, mask_win, false);
      }
}

/* Run linear fit in L, R, G and B images based on options set by user.
 */
function LinearFitLRGBchannels()
{
      util.addProcessingStepAndStatusInfo("Linear fit LRGB channels");

      var use_linear_fit = par.use_linear_fit.val;

      if (luminance_id == null && use_linear_fit == 'Luminance') {
            // no luminance
            if (narrowband) {
                  util.addProcessingStep("No Luminance, no linear fit with narrowband");
                  use_linear_fit = 'No linear fit';
            } else {
                  util.addProcessingStep("No Luminance, linear fit using R with RGB");
                  use_linear_fit = 'Red';
            }
      }

      /* Check for LinearFit
       */
      if (use_linear_fit == 'Red') {
            /* Use R.
             */
            util.addProcessingStep("Linear fit using R");
            if (luminance_id != null) {
                  runLinearFit(red_id, luminance_id);
            }
            runLinearFit(red_id, green_id);
            runLinearFit(red_id, blue_id);
      } else if (use_linear_fit == 'Green') {
            /* Use G.
              */
            util.addProcessingStep("Linear fit using G");
            if (luminance_id != null) {
                  runLinearFit(green_id, luminance_id);
            }
            runLinearFit(green_id, red_id);
            runLinearFit(green_id, blue_id);
      } else if (use_linear_fit == 'Blue') {
            /* Use B.
              */
            util.addProcessingStep("Linear fit using B");
            if (luminance_id != null) {
                  runLinearFit(blue_id, luminance_id);
            }
            runLinearFit(blue_id, red_id);
            runLinearFit(blue_id, green_id);
      } else if (use_linear_fit == 'Luminance' && luminance_id != null) {
            /* Use L.
             */
            util.addProcessingStep("Linear fit using L");
            runLinearFit(luminance_id, red_id);
            runLinearFit(luminance_id, green_id);
            runLinearFit(luminance_id, blue_id);
      } else {
            util.addProcessingStep("No linear fit");
      }
}

/* Combine R, G and B images into one RGB image.
 *
 * optionally reduce noise on each separate R, G and B images using a mask
 * run channel combination to create RGB image
 */
function CombineRGBimageEx(target_name, images)
{
      util.addProcessingStepAndStatusInfo("Combine RGB image");

      if (autocontinue_processed_channel_images.image_ids.length == 0) {
            if (checkNoiseReduction('RGB', 'channel') && !narrowband) {
                  util.addProcessingStep("Noise reduction on channel images");
                  for (var i = 0; i < images.length; i++) {
                        channelNoiseReduction(images[i]);
                  }
            }
            for (var i = 0; i < images.length; i++) {
                  saveProcessedChannelImage(images[i]);
            }
      }
      /* ChannelCombination
       */
      util.addProcessingStep("Channel combination using images " + images[0] + "," + images[1] + "," + images[2]);

      var P = new ChannelCombination;
      P.colorSpace = ChannelCombination.prototype.RGB;
      P.channels = [ // enabled, id
            [true, images[0]],
            [true, images[1]],
            [true, images[2]]
      ];

      var model_win = ImageWindow.windowById(images[0]);
      var rgb_name = util.ensure_win_prefix(target_name);

      console.writeln("CombineRGBimageEx, rgb_name " + rgb_name + ", model_win " + images[0]);

      var win = new ImageWindow(
                        model_win.mainView.image.width,     // int width
                        model_win.mainView.image.height,    // int height
                        3,                                  // int numberOfChannels=1
                        32,                                 // int bitsPerSample=32
                        true,                               // bool floatSample=true
                        true,                               // bool color=false
                        rgb_name);                          // const IsoString &id=IsoString()

      if (win.mainView.id != rgb_name) {
            util.fatalWindowNameFailed("Failed to create window with name " + rgb_name + ", window name is " + win.mainView.id);
      }
                  
      win.mainView.beginProcess(UndoFlag_NoSwapFile);
      P.executeOn(win.mainView);
      win.mainView.endProcess();

      guiUpdatePreviewWin(win);

      return win;
}

/* Combine stars from channel images stored into RGB_stars.
 * we use three first images in the array. In case of less than
 * three images the last image is copied to make three images.
 */
function combineRGBStars(RGB_stars)
{
      while (RGB_stars.length < 3) {
            RGB_stars[RGB_stars.length] = RGB_stars[RGB_stars.length-1];
      }
      return CombineRGBimageEx("Integration_RGB_stars", RGB_stars);
}

/* Combine RGB image from global red_id, green_id and blue_id images
 * Image is set into global variables RGB_win and RGB_win_id.
 */
function CombineRGBimage()
{
      RGB_win = CombineRGBimageEx("Integration_RGB", [red_id, green_id, blue_id]);

      RGB_win_id = RGB_win.mainView.id;
      util.addScriptWindow(RGB_win_id);
      RGB_win.show();

      return RGB_win;
}

function extractRGBchannel(RGB_id, channel)
{
      util.addProcessingStepAndStatusInfo("Extract " + channel + " from " + RGB_id);
      var sourceWindow = util.findWindow(RGB_id);
      var P = new ChannelExtraction;
      P.colorSpace = ChannelExtraction.prototype.RGB;
      P.sampleFormat = ChannelExtraction.prototype.SameAsSource;
      switch (channel) {
            case 'R':
                  P.channels = [ // enabled, id
                        [true, ""],       // R
                        [false, ""],      // G
                        [false, ""]       // B
                  ];
                  break;
            case 'G':
                  P.channels = [ // enabled, id
                        [false, ""],      // R
                        [true, ""],       // G
                        [false, ""]       // B
                  ];
                  break;
            case 'B':
                  P.channels = [ // enabled, id
                        [false, ""],      // R
                        [false, ""],      // G
                        [true, ""]        // B
                  ];
                  break;
      }

      sourceWindow.mainView.beginProcess(UndoFlag_NoSwapFile);
      P.executeOn(sourceWindow.mainView);
      var targetWindow = ImageWindow.activeWindow;
      sourceWindow.mainView.endProcess();

      return targetWindow.mainView.id;
}

function RGBNB_Channel_Mapping(RGB_id, channel, channel_bandwidth, mapping, BoostFactor)
{
      console.writeln("RGBNB channel mapping " + RGB_id);

      if (channel == 'L') {
            var L_win_copy = util.copyWindow(util.findWindow(RGB_id), util.ensure_win_prefix(RGB_id + "_RGBNBcopy"));
            var channelId = L_win_copy.mainView.id;
      } else {
            var channelId = extractRGBchannel(RGB_id, channel);
      }

      switch (mapping) {
            case 'H':
                  var NB_id = H_id;
                  var NB_bandwidth = par.H_bandwidth.val;
                  break;
            case 'S':
                  var NB_id = S_id;
                  var NB_bandwidth = par.S_bandwidth.val;
                  break;
            case 'O':
                  var NB_bandwidth = par.O_bandwidth.val;
                  var NB_id = O_id;
                  break;
            case '':
                  return channelId;
            default:
                  util.throwFatalError("Invalid NB mapping " + mapping);
      }
      if (NB_id == null) {
            util.throwFatalError("Could not find " + mapping + " image for mapping to " + channel);
      }
      if (par.use_RGB_image.val) {
            var sourceChannelId = RGB_id;
            channel_bandwidth = par.R_bandwidth.val;
      } else {
            var sourceChannelId = channelId;
      }

      util.addProcessingStepAndStatusInfo("Run " + channel + " mapping using " + NB_id + ", " + 
                        channel + " bandwidth " + channel_bandwidth + ", " + 
                        mapping + " bandwidth " + NB_bandwidth + 
                        " and boost factor " + BoostFactor);
      console.writeln("RGBNB_Channel_Mapping, runPixelMathSingleMapping " + sourceChannelId);
      var mappedChannelId = runPixelMathSingleMapping(
                              channelId,
                              "((" + NB_id + " * " + channel_bandwidth + ") - " + 
                              "("+ sourceChannelId + " * " + NB_bandwidth + "))" +
                              " / (" + channel_bandwidth + " - " +  NB_bandwidth + ")");
      
      console.writeln("RGBNB_Channel_Mapping, runPixelMathSingleMapping " + mappedChannelId);
      var mappedChannelId2 = runPixelMathSingleMapping(
                              mappedChannelId,
                              channelId + " + ((" + mappedChannelId + " - Med(" + mappedChannelId + ")) * " + 
                              BoostFactor + ")");
      
      runLinearFit(mappedChannelId2, mappedChannelId);

      console.writeln("RGBNB_Channel_Mapping, runPixelMathSingleMapping " + mappedChannelId2);
      var mappedChannelId3 = runPixelMathSingleMapping(
                                    mappedChannelId2,
                                    "max(" + mappedChannelId + ", " + mappedChannelId2 + ")");

      util.closeOneWindow(channelId);
      util.closeOneWindow(mappedChannelId);
      util.closeOneWindow(mappedChannelId2);

      return mappedChannelId3;
}

function doRGBNBmapping(RGB_id)
{
      util.addProcessingStepAndStatusInfo("Create mapped channel images from " + RGB_id);
      var R_mapped = RGBNB_Channel_Mapping(RGB_id, 'R', par.R_bandwidth.val, par.R_mapping.val, par.R_BoostFactor.val);
      var G_mapped = RGBNB_Channel_Mapping(RGB_id, 'G', par.G_bandwidth.val, par.G_mapping.val, par.G_BoostFactor.val);
      var B_mapped = RGBNB_Channel_Mapping(RGB_id, 'B', par.B_bandwidth.val, par.B_mapping.val, par.B_BoostFactor.val);

      /* Combine RGB image from mapped channel images. */
      util.addProcessingStep("Combine mapped channel images to an RGB image");
      var RGB_mapped_id = runPixelMathRGBMapping(
                              RGB_id + "_NB", 
                              util.findWindow(RGB_id),
                              R_mapped,
                              G_mapped,
                              B_mapped);

      util.closeOneWindow(R_mapped);
      util.closeOneWindow(G_mapped);
      util.closeOneWindow(B_mapped);
      util.closeOneWindow(RGB_id);

      return RGB_mapped_id;
}

this.testRGBNBmapping = function()
{
      console.beginLog();

      util.addProcessingStep("Test narrowband mapping to RGB");

      findChannelImages(false);

      if (RGB_color_id == null) {
            util.throwFatalError("Could not find RGB image");
      }

      var color_win = util.findWindow(RGB_color_id);

      checkWinFilePath(color_win);

      var test_win = util.copyWindow(color_win, util.ensure_win_prefix(RGB_color_id + "_test"));

      doRGBNBmapping(test_win.mainView.id);
      
      util.addProcessingStep("Processing completed");
      engine.writeProcessingSteps(null, true, ppar.win_prefix + "AutoRGBNB");

      console.endLog();
}

/* Process RGB image
 *
 * optionally run background neutralization on RGB image
 * by default run color calibration on RGB image
 * optionally run ABE on RGB image
 * by default run noise reduction on RGB image using a mask
 * run histogram transformation on RGB image to make in non-linear
 * optionally increase saturation
 */
function ProcessRGBimage(RGBmapping)
{
      util.addProcessingStepAndStatusInfo("Process RGB image, RGB stretched is " + RGBmapping.stretched);

      var RGB_ABE_HT_id;

      if (preprocessed_images == global.start_images.L_RGB_HT ||
            preprocessed_images == global.start_images.RGB_HT) 
      {
            /* We already have run HistogramTransformation. */
            RGB_ABE_HT_id = RGB_HT_win.mainView.id;
            util.addProcessingStep("Start from image " + RGB_ABE_HT_id);
            if (preprocessed_images == global.start_images.RGB_HT) {
                  ColorEnsureMask(RGB_ABE_HT_id, true, false);
            }
            RGBmapping.stretched = true;
      } else {
            if (preprocessed_images == global.start_images.L_RGB_BE ||
                preprocessed_images == global.start_images.RGB_BE) 
            {
                  /* We already have background extracted. */
                  RGB_ABE_id = RGB_BE_win.mainView.id;
                  util.addProcessingStep("Start from image " + RGB_ABE_id);
            } else {
                  if (preprocessed_images == global.start_images.RGB ||
                        preprocessed_images == global.start_images.L_RGB) 
                  {
                        RGB_win = util.copyWindow(RGB_start_win, "Integration_RGB");
                  }
                  if (par.color_calibration_before_ABE.val) {
                        if (par.use_background_neutralization.val) {
                              runBackgroundNeutralization(RGB_win.mainView);
                        }
                        /* Color calibration on RGB
                        */
                        runColorCalibration(RGB_win.mainView);
                  }
                  if (par.use_ABE_on_L_RGB.val) {
                        console.writeln("ABE RGB");
                        RGB_ABE_id = runABE(RGB_win, false);
                  } else {
                        console.writeln("No ABE for RGB");
                        RGB_ABE_id = noABEcopyWin(RGB_win);
                  }
            }

            if (!par.color_calibration_before_ABE.val) {
                  if (par.use_background_neutralization.val) {
                        runBackgroundNeutralization(ImageWindow.windowById(RGB_ABE_id).mainView);
                  }
                  /* Color calibration on RGB
                  */
                  runColorCalibration(ImageWindow.windowById(RGB_ABE_id).mainView);
            }

            if (par.use_RGBNB_Mapping.val) {
                  /* Do RGBNB mapping on combined and color calibrated RGB image. */
                  RGB_ABE_id = doRGBNBmapping(RGB_ABE_id);
            }

            if (is_color_files || !is_luminance_images) {
                  /* Color or narrowband or RGB. */
                  ColorEnsureMask(RGB_ABE_id, RGBmapping.stretched, false);
            }
            if (narrowband && par.linear_increase_saturation.val > 0) {
                  /* Default 1 means no increase with narrowband. */
                  var linear_increase_saturation = par.linear_increase_saturation.val - 1;
            } else {
                  var linear_increase_saturation = par.linear_increase_saturation.val;
            }
            if (linear_increase_saturation > 0 && !RGBmapping.stretched) {
                  /* Add saturation linear RGB
                  */
                  console.writeln("Add saturation to linear RGB, " + linear_increase_saturation + " steps");
                  for (var i = 0; i < linear_increase_saturation; i++) {
                        increaseSaturation(ImageWindow.windowById(RGB_ABE_id), mask_win);
                  }
            }

            if (!RGBmapping.stretched) {
                  if (par.remove_stars_before_stretch.val) {
                        RGB_stars_win = removeStars(util.findWindow(RGB_ABE_id), true, true, null, null, par.unscreen_stars.val);
                        util.windowRename(RGB_stars_win.mainView.id, ppar.win_prefix + "Integration_RGB_stars");
                        if (!is_luminance_images) {
                              // use starless RGB image as mask
                              ColorEnsureMask(RGB_ABE_id, false, true);
                        }
                  }
                  if (!par.skip_sharpening.val && par.use_blurxterminator.val) {
                        runBlurXTerminator(ImageWindow.windowById(RGB_ABE_id));
                  }
                  /* Check noise reduction only after BlurXTerminator. */
                  if (checkNoiseReduction(is_color_files ? 'color' : 'RGB', 'linear')) {
                        runNoiseReduction(ImageWindow.windowById(RGB_ABE_id), mask_win, !RGBmapping.stretched);
                  }

                  /* On RGB image run HistogramTransform to stretch image to non-linear
                  */
                  RGB_ABE_HT_id = util.ensure_win_prefix(RGB_ABE_id + "_HT");
                  var stf = runHistogramTransform(
                              util.copyWindow(
                                    ImageWindow.windowById(RGB_ABE_id), 
                                    RGB_ABE_HT_id), 
                              null,
                              true,
                              'RGB');
                  RGBmapping.stretched = true;

                  if (par.remove_stars_stretched.val) {
                        RGB_stars_HT_win = removeStars(util.findWindow(RGB_ABE_HT_id), false, true, null, null, par.unscreen_stars.val);
                        if (!is_luminance_images) {
                              // use starless RGB image as mask
                              ColorEnsureMask(RGB_ABE_HT_id, true, true);
                        }
                  }
            } else {
                  /* Image is not really linear any more but anyway check for noise reduction. */
                  if (checkNoiseReduction(is_color_files ? 'color' : 'RGB', 'linear')) {
                        runNoiseReduction(ImageWindow.windowById(RGB_ABE_id), mask_win, !RGBmapping.stretched);
                  }
                  RGB_ABE_HT_id = RGB_ABE_id;
                 
            }
      }
      /* If we have non-stretched stars image stretch it.
       */
      if (RGB_stars_win != null)  {
            let stars_id = RGB_ABE_HT_id + "_stars";
            runHistogramTransform(
                  util.copyWindow(RGB_stars_win, stars_id), 
                  stf,
                  true,
                  'stars');
            RGB_stars_HT_win = util.findWindow(stars_id);
      } else if (RGB_stars_HT_win != null)  {
            RGB_stars_HT_win.mainView.id =  RGB_ABE_HT_id + "_stars";
      }

      if (narrowband && par.non_linear_increase_saturation.val > 0) {
            /* Default 1 means no increase with narrowband. */
            var non_linear_increase_saturation = par.non_linear_increase_saturation.val - 1;
      } else {
            var non_linear_increase_saturation = par.non_linear_increase_saturation.val;
      }
      if (non_linear_increase_saturation > 0) {
            /* Add saturation on RGB
            */
            for (var i = 0; i < non_linear_increase_saturation; i++) {
                  increaseSaturation(ImageWindow.windowById(RGB_ABE_HT_id), mask_win);
            }
      }
      console.writeln("ProcessRGBimage done");
      return RGB_ABE_HT_id;
}

function invertImage(targetView)
{
      console.writeln("invertImage");
      var P = new Invert;

      targetView.beginProcess(UndoFlag_NoSwapFile);
      P.executeOn(targetView, true);
      targetView.endProcess();
}

// Mask used when fixing star colors in narrowband images.
function createStarFixMask(imgView)
{
      if (!par.extra_force_new_mask.val) {
            if (star_fix_mask_win == null) {
                  star_fix_mask_win = util.findWindow(ppar.win_prefix + "star_fix_mask");
            }
            if (star_fix_mask_win == null) {
                  star_fix_mask_win = util.findWindow(ppar.win_prefix + "AutoStarFixMask");
            }
            if (star_fix_mask_win != null) {
                  // Use already created start mask
                  console.writeln("Use existing star mask " + star_fix_mask_win.mainView.id);
                  star_fix_mask_win_id = star_fix_mask_win.mainView.id;
                  return;
            }
      }
      util.closeOneWindow("AutoStarFixMask");

      var P = new StarMask;
      P.waveletLayers = 8;
      P.smoothness = 8;

      imgView.beginProcess(UndoFlag_NoSwapFile);
      P.executeOn(imgView, false);
      imgView.endProcess();

      star_fix_mask_win = ImageWindow.activeWindow;

      util.windowRenameKeepif(star_fix_mask_win.mainView.id, ppar.win_prefix + "AutoStarFixMask", true);
      star_fix_mask_win_id = star_fix_mask_win.mainView.id;

      util.addProcessingStep("Created star fix mask " + star_fix_mask_win.mainView.id);
}

function removeMagentaColor(targetWin)
{
      util.addProcessingStepAndStatusInfo("Remove magenta color");

      invertImage(targetWin.mainView);
      runSCNR(targetWin.mainView, true);
      invertImage(targetWin.mainView);

      guiUpdatePreviewWin(targetWin);
}

/* Do a rough fix on magenta stars by inverting the image, applying
 * SCNR to remove the now green cast on stars and then inverting back.
 * If we are not removing all green case we use mask to protect
 * other areas than stars.
 */
function fixNarrowbandStarColor(targetWin)
{
      var use_mask;

      if (par.skip_star_fix_mask.val) {
            use_mask = false;
      } else if (!par.run_narrowband_SCNR.val || par.leave_some_green.val) {
            // If we do not remove all green we use mask protect
            // other than stars.
            use_mask = true;
      } else {
            // We want all green removed, do not use mask on stars either.
            use_mask = false;
      }

      util.addProcessingStepAndStatusInfo("Fix narrowband star color");

      if (use_mask) {
            createStarFixMask(targetWin.mainView);
      }

      invertImage(targetWin.mainView);

      if (use_mask) {
            /* Use mask to change only star colors. */
            util.addProcessingStep("Using mask " + star_fix_mask_win.mainView.id + " when fixing star colors");
            setMaskChecked(targetWin, star_fix_mask_win);
            targetWin.maskInverted = false;
      }      

      runSCNR(targetWin.mainView, true);

      if (use_mask) {
            targetWin.removeMask();
      }

      invertImage(targetWin.mainView);

      guiUpdatePreviewWin(targetWin);
}

// When start removal is run we do some things differently
// - We make a copy of the starless image
// - We make a copy of the stars image
// - Operations like HDMT and LHE are run on the starless image
// - Star reduction is done on the stars image
// - Optionally in the end starless and stars images are combined together
function extraRemoveStars(parent, imgWin, apply_directly)
{
      /* Close old star mask. If needed we create a new one from
       * the stars image.
       */
      util.closeOneWindow(util.ensure_win_prefix("AutoStarMask"));

      let stars_win = removeStars(imgWin, false, true, null, util.ensure_win_prefix(imgWin.mainView.id + "_stars_tmp"), par.extra_unscreen_stars.val);
      let stars_win_id = util.ensure_win_prefix(imgWin.mainView.id + "_stars");
      if (stars_win.mainView.id != stars_win_id) {
            console.writeln("extraRemoveStars, rename " + stars_win.mainView.id + " to " + stars_win_id);
            stars_win.mainView.id = stars_win_id;
      }
      stars_win.show();

      var FITSkeywords = getTargetFITSKeywordsForPixelmath(imgWin);
      setTargetFITSKeywordsForPixelmath(stars_win, FITSkeywords);

      util.ensureDir(global.outputRootDir);

      setFinalImageKeyword(stars_win);
      util.addProcessingStep("Stars image " + stars_win_id);

      if (par.extra_combine_stars.val || apply_directly) {
            /* Make a copy of the starless image.
            */
            console.writeln("extraRemoveStars copy " + imgWin.mainView.id + " to " + imgWin.mainView.id + "_starless");
            var copywin = util.copyWindow(imgWin, util.ensure_win_prefix(imgWin.mainView.id + "_starless"));
      } else {
            /* We do not combine images so just rename old image.
             */
            var copywin = imgWin;
            copywin.mainView.id = util.ensure_win_prefix(copywin.mainView.id + "_starless");

      }
      setFinalImageKeyword(copywin);
      util.addProcessingStep("Starless image " + copywin.mainView.id);
      copywin.show();

      guiUpdatePreviewWin(copywin);

      if (gui) {
            gui.update_extra_target_image_window_list(parent, null);
      }

      // return possibly new starless image for further processing
      return { starless_win: copywin, stars_id: stars_win_id };
}

function extraDarkerBackground(imgWin, maskWin)
{
      util.addProcessingStepAndStatusInfo("Extra darker background on " + imgWin.mainView.id + " using mask " + maskWin.mainView.id);

      var P = new CurvesTransformation;
      P.K = [ // x, y
         [0.00000, 0.00000],
         [0.53564, 0.46212],
         [1.00000, 1.00000]
      ];

      imgWin.mainView.beginProcess(UndoFlag_NoSwapFile);

      /* Darken only dark parts (background) of the image. */
      setMaskChecked(imgWin, maskWin);
      imgWin.maskInverted = true;
      
      P.executeOn(imgWin.mainView, false);

      imgWin.removeMask();

      imgWin.mainView.endProcess();

      guiUpdatePreviewWin(imgWin);
}

function extraHDRMultiscaleTransform(imgWin, maskWin)
{
      util.addProcessingStepAndStatusInfo("HDRMultiscaleTransform on " + imgWin.mainView.id + " using mask " + maskWin.mainView.id);

      var failed = false;
      var hsChannels = null;
      var iChannel = null;

      try {
            var P = new HDRMultiscaleTransform;
            P.numberOfLayers = par.extra_HDRMLT_layers.val;
            P.medianTransform = true;
            P.deringing = false;
            P.toLightness = true;
            P.luminanceMask = true;
            if (par.extra_HDRMLT_color.val == 'Preserve hue') {
                  P.preserveHue = true;
            } else {
                  P.preserveHue = false;
            }

            if (par.extra_HDRMLT_color.val == 'Color corrected') {
                  hsChannels = extractHSchannels(imgWin);
            }

            imgWin.mainView.beginProcess(UndoFlag_NoSwapFile);

            /* Transform only light parts of the image. */
            setMaskChecked(imgWin, maskWin);
            imgWin.maskInverted = false;
            
            P.executeOn(imgWin.mainView, false);

            imgWin.removeMask();

            imgWin.mainView.endProcess();

            if (par.extra_HDRMLT_color.val == 'Color corrected') {
                  iChannel = extractIchannel(imgWin);

                  var P = new ChannelCombination;
                  P.colorSpace = ChannelCombination.prototype.HSI;
                  P.channels = [ // enabled, id
                        [true, hsChannels[0].mainView.id],
                        [true, hsChannels[1].mainView.id],
                        [true, iChannel.mainView.id]
                  ];

                  var win = imgWin;

                  win.mainView.beginProcess(UndoFlag_NoSwapFile);
                  P.executeOn(win.mainView);
                  win.mainView.endProcess();
            }
            guiUpdatePreviewWin(imgWin);
      } catch (err) {
            failed = true;
            console.criticalln(err);
      }
      if (hsChannels != null) {
            util.forceCloseOneWindow(hsChannels[0]);
            util.forceCloseOneWindow(hsChannels[1]);
      }
      if (iChannel != null) {
            util.forceCloseOneWindow(iChannel);
      }
      if (failed) {
            util.throwFatalError("HDRMultiscaleTransform failed");
      }
}

function extraLocalHistogramEqualization(imgWin, maskWin)
{
      util.addProcessingStepAndStatusInfo("LocalHistogramEqualization on " + imgWin.mainView.id + " using mask " + maskWin.mainView.id);

      var P = new LocalHistogramEqualization;
      P.radius = par.extra_LHE_kernelradius.val;
      P.slopeLimit = 1.3;
      P.amount = 1.000;
      
      imgWin.mainView.beginProcess(UndoFlag_NoSwapFile);

      /* Transform only light parts of the image. */
      setMaskChecked(imgWin, maskWin);
      imgWin.maskInverted = false;
      
      P.executeOn(imgWin.mainView, false);

      imgWin.removeMask();

      imgWin.mainView.endProcess();

      guiUpdatePreviewWin(imgWin);
}

function extraExponentialTransformation(imgWin, maskWin)
{
      util.addProcessingStepAndStatusInfo("ExponentialTransformation on " + imgWin.mainView.id + " using mask " + maskWin.mainView.id);

      var P = new ExponentialTransformation;
      P.functionType = ExponentialTransformation.prototype.PIP;
      P.order = par.extra_ET_order.val;
      P.sigma = 0.00;
      P.useLightnessMask = true;
      
      imgWin.mainView.beginProcess(UndoFlag_NoSwapFile);

      /* Transform only light parts of the image. */
      setMaskChecked(imgWin, maskWin);
      imgWin.maskInverted = false;
      
      P.executeOn(imgWin.mainView, false);

      imgWin.removeMask();

      imgWin.mainView.endProcess();

      guiUpdatePreviewWin(imgWin);
}

function createNewStarMaskWin(imgWin)
{
      var P = new StarMask;
      P.midtonesBalance = 0.80000;        // default: 0.50000
      P.waveletLayers = 5;                // default: 5
      P.largeScaleGrowth = 1;             //  default: 2
      P.smoothness = 8;                   // default: 16

      imgWin.mainView.beginProcess(UndoFlag_NoSwapFile);
      P.executeOn(imgWin.mainView, false);
      imgWin.mainView.endProcess();

      return ImageWindow.activeWindow;
}

function createStarMaskIf(imgWin)
{
      if (!par.extra_force_new_mask.val) {
            star_mask_win = maskIsCompatible(imgWin, star_mask_win);
            if (star_mask_win == null) {
                  star_mask_win = maskIsCompatible(imgWin, util.findWindow(ppar.win_prefix + "star_mask"));
            }
            if (star_mask_win == null) {
                  star_mask_win = maskIsCompatible(imgWin, util.findWindow(ppar.win_prefix + "AutoStarMask"));
            }
            if (star_mask_win != null) {
                  // Use already created start mask
                  console.writeln("Use existing star mask " + star_mask_win.mainView.id);
                  star_mask_win_id = star_mask_win.mainView.id;
                  return;
            }
      }
      util.closeOneWindow("AutoStarMask");

      star_mask_win = createNewStarMaskWin(imgWin);

      util.windowRenameKeepif(star_mask_win.mainView.id, "AutoStarMask", true);

      util.addProcessingStep("Created star mask " + star_mask_win.mainView.id);
      star_mask_win_id = star_mask_win.mainView.id;
}

/* Star Reduction using PixelMath, by Bill Blanshan
 */
function smallerStarsBillsPixelmathMethod(combined_id, starless_id)
{
      util.addProcessingStepAndStatusInfo("Reduce stars using " + par.extra_combine_stars_reduce.val + " method");

      switch (par.extra_combine_stars_reduce.val) {
            case 'Transfer':
                  /* 1. Transfer Method - V2
                   */
                  var expression = 
                  "S=" + par.extra_combine_stars_reduce_S.val + ";\n" + // To reduce stars size more, lower S value
                  "Img1=" + starless_id + ";\n" +                       // Starless image name
                  "\n" +                                                // equations
                  "f1= ~((~mtf(~S,$T)/~mtf(~S,Img1))*~Img1);\n" +       // Transfer method 
                  "\n" +
                  "max(Img1,f1)";
                  var symbols = "S,Img1,f1";
                  break;

            case 'Halo':
                  /* 2. Halo Method - V2
                   */
                  var expression = 
                  "S=" + par.extra_combine_stars_reduce_S.val + ";\n" + // To reduce stars size more, lower S value
                  "Img1=" + starless_id + ";\n" +                       // Starless image name
                  "f2= ((~(~$T/~Img1)-~(~mtf(~S,$T)/~mtf(~S,Img1)))*~Img1);\n" +
                  "f3= (~(~$T/~Img1)-~(~mtf(~S,$T)/~mtf(~S,Img1)));\n" +
                  "max(Img1,$T-mean(f2,f3))";
                  var symbols = "S,B,Img1,f2,f3";
                  break;

            case 'Star':
                  /* 3. Star Method - V2
                  */
                  var expression = 
                  "Img1=" + starless_id + ";\n" +                       // Starless image name
                  "I=1;\n" +                                            // number of iterations, between 1-3
                  "M=" + par.extra_combine_stars_reduce_M.val + ";\n" + // Method mode; 1=Strong; 2=Moderate; 3=Soft reductions
                  "\n" +                                                // equations:
                  "E1= $T*~(~(Img1/$T)*~$T);\n" +                       // iteration-1
                  "E2= max(E1,($T*E1)+(E1*~E1));\n" +
                  "\n" +
                  "E3= E1*~(~(Img1/E1)*~E1);\n" +                       // iteration-2
                  "E4= max(E3,($T*E3)+(E3*~E3));\n" +
                  "\n" +
                  "E5= E3*~(~(Img1/E3)*~E3);\n" +                       // iteration-3
                  "E6= max(E5,($T*E5)+(E5*~E5));\n" +
                  "\n" +
                  "E7= iif(I==1,E1,iif(I==2,E3,E5));\n" +               // Strong reduction mode
                  "E8= iif(I==1,E2,iif(I==2,E4,E6));\n" +               // Moderate reduction mode
                  "\n" +
                  "E9= mean(\n" +
                  "$T-($T-iif(I==1,E2,iif(I==2,E4,E6))),\n" + 
                  "$T*~($T-iif(I==1,E2,iif(I==2,E4,E6))));\n" +         //soft reduction mode
                  "\n" +
                  "max(Img1,iif(M==1,E7,iif(M==2,E8,E9)))";
                  var symbols = "I,M,Img1,E1,E2,E3,E4,E5,E6,E7,E8,E9,E10";
                  break;

            default:
                  util.throwFatalError("Invalid star reduce mode " + par.extra_combine_stars_reduce.val);
                  break;
      }

      runPixelMathSingleMappingEx(combined_id, expression, false, symbols);
}

function extraSmallerStars(imgWin, is_star_image)
{
      var use_mask = true;
      var targetWin = imgWin;

      if (use_mask) {
            createStarMaskIf(imgWin);
      }

      if (is_star_image) {
            util.addProcessingStepAndStatusInfo("Smaller stars on stars image " + imgWin.mainView.id + 
                        " using " + par.extra_smaller_stars_iterations.val + " iterations");
      } else {
            util.addProcessingStepAndStatusInfo("Smaller stars on " + imgWin.mainView.id + " using mask " + star_mask_win.mainView.id + 
                        " and " + par.extra_smaller_stars_iterations.val + " iterations");
      }

      if (par.extra_smaller_stars_iterations.val == 0) {
            var P = new MorphologicalTransformation;
            P.operator = MorphologicalTransformation.prototype.Erosion;
            P.amount = 0.30;
            P.selectionPoint = 0.20;
            P.structureSize = 5;
            P.structureWayTable = [ // mask
               [[
                  0x00,0x01,0x01,0x01,0x00,
                  0x01,0x01,0x01,0x01,0x01,
                  0x01,0x01,0x01,0x01,0x01,
                  0x01,0x01,0x01,0x01,0x01,
                  0x00,0x01,0x01,0x01,0x00
               ]]
            ];
      } else {
            var P = new MorphologicalTransformation;
            P.operator = MorphologicalTransformation.prototype.Selection;
            P.numberOfIterations = par.extra_smaller_stars_iterations.val;
            P.amount = 0.70;
            P.selectionPoint = 0.20;
            P.structureSize = 5;
            P.structureWayTable = [ // mask
                  [[
                        0x00,0x01,0x01,0x01,0x00,
                        0x01,0x01,0x01,0x01,0x01,
                        0x01,0x01,0x01,0x01,0x01,
                        0x01,0x01,0x01,0x01,0x01,
                        0x00,0x01,0x01,0x01,0x00
                  ]]
            ];
      }
      
      targetWin.mainView.beginProcess(UndoFlag_NoSwapFile);

      if (use_mask) {
            /* Use a star mask to target operation only on 
             * selected stars. Star mask leaves out biggest stars.
             */
            setMaskChecked(targetWin, star_mask_win);
            targetWin.maskInverted = false;
      }
      
      P.executeOn(targetWin.mainView, false);

      if (use_mask) {
            targetWin.removeMask();
      }

      targetWin.mainView.endProcess();

      guiUpdatePreviewWin(targetWin);
}

function extraContrast(imgWin)
{
      util.addProcessingStepAndStatusInfo("Increase contrast on " + imgWin.mainView.id);

      var P = new CurvesTransformation;
      P.K = [ // x, y
            [0.00000, 0.00000],
            [0.26884, 0.24432],
            [0.74542, 0.77652],
            [1.00000, 1.00000]
         ];

      imgWin.mainView.beginProcess(UndoFlag_NoSwapFile);

      P.executeOn(imgWin.mainView, false);

      imgWin.mainView.endProcess();

      guiUpdatePreviewWin(imgWin);
}

function extraStretch(win)
{
      util.addProcessingStepAndStatusInfo("Extra stretch on " + win.mainView.id);

      win = runHistogramTransform(win, null, win.mainView.image.isColor, 'RGB').win;
      return win;
}

function extraShadowClipping(win, perc)
{
      util.addProcessingStepAndStatusInfo("Extra shadow clipping of " + perc + "% on " + win.mainView.id);

      clipShadows(win, perc);

      guiUpdatePreviewWin(win);
}

function extraSmoothBackground(win, val)
{
      util.addProcessingStepAndStatusInfo("Extra background smoothing with value " + val);

      var mapping = "iif($T<" + val + "," + val + "-(" + val + "-$T)/2,$T)";

      runPixelMathSingleMappingEx(win.mainView.id, mapping, false, null);

      guiUpdatePreviewWin(win);
}

function extraNoiseReduction(win, mask_win)
{
      if (par.extra_noise_reduction_strength.val == 0) {
            return;
      }
      util.addProcessingStepAndStatusInfo("Extra noise reduction on " + win.mainView.id);

      runNoiseReductionEx(
            win, 
            mask_win, 
            par.extra_noise_reduction_strength.val,
            false);

      guiUpdatePreviewWin(win);
}

function extraACDNR(extraWin, mask_win)
{
      util.addProcessingStepAndStatusInfo("Extra ACDNR");
      if (par.ACDNR_noise_reduction.val == 0.0) {
            util.addProcessingStep("Extra ACDNR noise reduction not done, StdDev value is zero");
            return;
      }

      runACDNRReduceNoise(extraWin, mask_win);

      guiUpdatePreviewWin(extraWin);
}

function extraColorNoise(extraWin)
{
      runColorReduceNoise(extraWin);
}

function extraUnsharpMask(extraWin, mask_win)
{
      util.addProcessingStepAndStatusInfo("Extra UnsharpMask on " + extraWin.mainView.id + " using StdDev " + par.extra_unsharpmask_stddev.val);

      var P = new UnsharpMask;
      P.sigma = par.extra_unsharpmask_stddev.val;
      P.amount = 0.80;
      P.useLuminance = true;

      if (mask_win != null) {
            /* Sharpen only light parts of the image. */
            setMaskChecked(extraWin, mask_win);
            extraWin.maskInverted = false;
      }

      extraWin.mainView.beginProcess(UndoFlag_NoSwapFile);
      P.executeOn(extraWin.mainView, false);
      extraWin.mainView.endProcess();

      if (mask_win != null) {
            extraWin.removeMask();
      }

      guiUpdatePreviewWin(extraWin);
}

function extraSharpen(extraWin, mask_win)
{
      if (par.use_blurxterminator.val) {
            util.addProcessingStepAndStatusInfo("Extra sharpening on " + extraWin.mainView.id + " using BlurXTerminator");
            runBlurXTerminator(extraWin);
      } else {
            util.addProcessingStepAndStatusInfo("Extra sharpening on " + extraWin.mainView.id + " using " + par.extra_sharpen_iterations.val + " iterations");
            for (var i = 0; i < par.extra_sharpen_iterations.val; i++) {
                  runMultiscaleLinearTransformSharpen(extraWin, mask_win);
            }
      }
      guiUpdatePreviewWin(extraWin);
}

function extraSaturation(extraWin, mask_win)
{
      util.addProcessingStepAndStatusInfo("Extra saturation on " + extraWin.mainView.id + " using " + par.extra_saturation_iterations.val + " iterations");

      for (var i = 0; i < par.extra_saturation_iterations.val; i++) {
            increaseSaturation(extraWin, mask_win);
      }
      guiUpdatePreviewWin(extraWin);
}

function extraABE(extraWin)
{
      util.addProcessingStepAndStatusInfo("Extra ABE");
      runABE(extraWin, true);
      guiUpdatePreviewWin(extraWin);
}

function extraSHOHueShift(imgWin)
{
      // Hue 1
      var P = new CurvesTransformation;
      P.ct = CurvesTransformation.prototype.AkimaSubsplines;
      P.H = [ // x, y
      [0.00000, 0.00000],
      [0.42857, 0.53600],
      [1.00000, 1.00000]
      ];

      imgWin.mainView.beginProcess(UndoFlag_NoSwapFile);
      P.executeOn(imgWin.mainView, false);
      imgWin.mainView.endProcess();

      // Hue 2
      var P = new CurvesTransformation;
      P.ct = CurvesTransformation.prototype.AkimaSubsplines;
      P.H = [ // x, y
      [0.00000, 0.00000],
      [0.25944, 0.17200],
      [0.49754, 0.50600],
      [0.77176, 0.68400],
      [1.00000, 1.00000]
      ];

      imgWin.mainView.beginProcess(UndoFlag_NoSwapFile);
      P.executeOn(imgWin.mainView, false);
      imgWin.mainView.endProcess();

      // Hue 3
      var P = new CurvesTransformation;
      P.H = [ // x, y
      [0.00000, 0.00000],
      [0.21511, 0.16400],
      [0.41872, 0.42000],
      [0.46962, 0.46800],
      [0.65353, 0.64400],
      [1.00000, 1.00000]
      ];

      imgWin.mainView.beginProcess(UndoFlag_NoSwapFile);
      P.executeOn(imgWin.mainView, false);
      imgWin.mainView.endProcess();
      guiUpdatePreviewWin(imgWin);
}

// Rename and save palette batch image
function narrowbandPaletteBatchFinalImage(palette_name, winId, extra)
{
      // rename and save image using palette name
      console.writeln("narrowbandPaletteBatchFinalImage:rename " + winId + " using " + palette_name);
      var palette_image = util.mapBadChars(palette_name);
      palette_image = "Auto_" + palette_image;
      if (extra) {
            palette_image = palette_image + "_extra";
      }
      console.writeln("narrowbandPaletteBatchFinalImage:new name " + palette_image);+
      util.windowRenameKeepif(winId, palette_image, true);
      // set final image keyword so it easy to save all file e.g. as 16 bit TIFF
      console.writeln("narrowbandPaletteBatchFinalImage:set final image keyword");
      setFinalImageKeyword(ImageWindow.windowById(palette_image));
      // save image
      console.writeln("narrowbandPaletteBatchFinalImage:save image " + palette_image);
      saveProcessedWindow(global.outputRootDir, palette_image);
      util.addProcessingStep("Narrowband palette batch final image " + palette_image);
}

// Run through all narrowband palette options
this.autointegrateNarrowbandPaletteBatch = function(parent, auto_continue)
{
      console.writeln("autointegrateNarrowbandPaletteBatch");
      for (var i = 0; i < global.narrowBandPalettes.length; i++) {
            console.writeln("autointegrateNarrowbandPaletteBatch loop ", i);
            if (global.narrowBandPalettes[i].all) {
                  if (auto_continue) {
                        util.ensureDialogFilePath("narrowband batch result files");
                  }
                  par.custom_R_mapping.val = global.narrowBandPalettes[i].R;
                  par.custom_G_mapping.val = global.narrowBandPalettes[i].G;
                  par.custom_B_mapping.val = global.narrowBandPalettes[i].B;
                  util.addProcessingStepAndStatusInfo("Narrowband palette " + global.narrowBandPalettes[i].name + " batch using " + par.custom_R_mapping.val + ", " + par.custom_G_mapping.val + ", " + par.custom_B_mapping.val);

                  var succ = engine.autointegrateProcessingEngine(parent, auto_continue, util.is_narrowband_option());
                  if (!succ) {
                        util.addProcessingStep("Narrowband palette batch could not process all palettes");
                  }
                  // rename and save the final image
                  narrowbandPaletteBatchFinalImage(global.narrowBandPalettes[i].name, ppar.win_prefix + "AutoRGB", false);
                  if (util.findWindow(ppar.win_prefix + "AutoRGB_extra") != null) {
                        narrowbandPaletteBatchFinalImage(global.narrowBandPalettes[i].name, ppar.win_prefix + "AutoRGB_extra", true);
                  }
                  // next runs are always auto_continue
                  console.writeln("autointegrateNarrowbandPaletteBatch:set auto_continue = true");
                  auto_continue = true;
                  // close all but integrated images
                  console.writeln("autointegrateNarrowbandPaletteBatch:close all windowsm keep integrated images");
                  engine.closeAllWindows(true, true);
            }
      }
      util.addProcessingStep("Narrowband palette batch completed");
}

function findStarImageIdEx(starless_id, stars_id, use_re)
{
      if (stars_id != starless_id) {
            console.writeln("findStarImageId try " + stars_id)
            if (use_re) {
                  var w = util.findWindowRe(stars_id);
            } else {
                  var w = util.findWindow(stars_id);
            }
            if (w != null) {
                  return w.mainView.id;
            }
      }
      return null;
}

function findStarImageId(starless_id, original_id)
{
      console.noteln("Try to find stars image for starless image " + starless_id)
      var stars_id = findStarImageIdEx(starless_id, starless_id.replace("starless", "stars"), false);
      if (stars_id != null) {
            return stars_id;
      }
      stars_id = findStarImageIdEx(starless_id, starless_id + "_stars", false);
      if (stars_id != null) {
            return stars_id;
      }
      stars_id = findStarImageIdEx(starless_id, starless_id.replace(/starless_edit[1-9]*/g, "stars"), false);
      if (stars_id != null) {
            return stars_id;
      }
      stars_id = findStarImageIdEx(starless_id, starless_id.replace(/starless$/g, "stars"), false);
      if (stars_id != null) {
            return stars_id;
      }
      stars_id = findStarImageIdEx(starless_id, starless_id.replace(/starless.*/g, "stars"), false);
      if (stars_id != null) {
            return stars_id;
      }
      const find_id = starless_id.replace(/starless.*/g, "stars");
      if (find_id != starless_id) {
            const re = new RegExp(find_id + ".*");
            stars_id = findStarImageIdEx(starless_id, re, true);
            if (stars_id != null) {
                  return stars_id;
            }
      }
      return null;
}

function combineStarsAndStarless(stars_combine, starless_id, stars_id)
{
      var createNewImage = true;

      /* Restore stars by combining starless image and stars. */
      util.addProcessingStepAndStatusInfo("Combining starless and star images using " + stars_combine);
      if (stars_id == null) {
            stars_id = findStarImageId(starless_id);
      }
      if (stars_id == null) {
            util.throwFatalError("Could not find starless image for star image " + starless_id);
      }
      util.addProcessingStepAndStatusInfo("Combining " + starless_id + " and " + stars_id + " using " + stars_combine);
      switch (stars_combine) {
            case 'Screen':
                  var new_id = runPixelMathSingleMappingEx(
                                    starless_id, 
                                    "combine(" + starless_id + ", " + stars_id + ", op_screen())",
                                    createNewImage);
                  break;
            case 'Lighten':
                  var new_id = runPixelMathSingleMappingEx(
                                    starless_id, 
                                    "max(" + starless_id + ", " + stars_id + ")",
                                    createNewImage);
                  break;
            case 'Add':
            default:
                  var new_id = runPixelMathSingleMappingEx(
                                    starless_id, 
                                    starless_id + " + " + stars_id,
                                    createNewImage);
                  break;
      }

      if (par.extra_combine_stars_reduce.val != 'None') {
            smallerStarsBillsPixelmathMethod(new_id, starless_id);
      }

      return new_id;
}

function extraProcessing(parent, id, apply_directly)
{
      console.noteln("Extra processing");

      var extra_id = id;
      var extra_stars_id = null;
      var extra_starless_id = null;
      var need_L_mask = par.extra_darker_background.val || 
                        par.extra_ET.val || 
                        par.extra_HDRMLT.val || 
                        par.extra_LHE.val ||
                        (par.extra_noise_reduction.val && !par.use_noisexterminator.val) ||
                        par.extra_ACDNR.val ||
                        par.extra_sharpen.val ||
                        par.extra_unsharpmask.val ||
                        par.extra_saturation.val;

      var extraWin = ImageWindow.windowById(id);

      extra_stars_id = null;

      checkWinFilePath(extraWin);
      util.ensureDir(global.outputRootDir);
      util.ensureDir(util.combinePath(global.outputRootDir, global.AutoOutputDir));
      util.ensureDir(util.combinePath(global.outputRootDir, global.AutoProcessedDir));

      if (!apply_directly) {
            extra_id = util.ensure_win_prefix(id + "_extra");
            extraWin = util.copyWindow(extraWin, extra_id);
      }

      if (par.extra_stretch.val) {
            extraWin = extraStretch(extraWin);
      }
      if (narrowband) {
            if (par.run_orange_hue_shift.val) {
                  narrowbandOrangeHueShift(extraWin.mainView);
            }
            if (par.run_hue_shift.val) {
                  extraSHOHueShift(extraWin);
            }
            if (par.run_narrowband_SCNR.val || par.leave_some_green.val) {
                  runSCNR(extraWin.mainView, false);
            }
            if (par.remove_magenta_color.val) {
                  removeMagentaColor(extraWin);
            }
            if (par.fix_narrowband_star_color.val) {
                  fixNarrowbandStarColor(extraWin);
            }
      }
      if (par.extra_remove_stars.val) {
            let res = extraRemoveStars(parent, extraWin, apply_directly);
            extraWin = res.starless_win;
            extra_starless_id = extraWin.mainView.id;
            extra_stars_id = res.stars_id;
            console.writeln("extra_starless_id " + extra_starless_id + ", extra_stars_id " + extra_stars_id);
      }
      if (par.extra_ABE.val) {
            extraABE(extraWin);
      }
      if (need_L_mask) {
            // Try find mask window
            // If we need to create a mask do it after we
            // have removed the stars
            if (par.extra_force_new_mask.val) {
                  mask_win = null;
            } else {
                  mask_win = maskIsCompatible(extraWin, mask_win);
                  if (mask_win == null) {
                        mask_win = maskIsCompatible(extraWin, util.findWindow(ppar.win_prefix +"AutoMask"));
                  }
            }
            if (mask_win == null) {
                  mask_win_id = ppar.win_prefix + "AutoMask";
                  util.closeOneWindow(mask_win_id);
                  mask_win = newMaskWindow(extraWin, mask_win_id, false);
            }
            console.writeln("Use mask " + mask_win.mainView.id);
      }
      if (par.extra_darker_background.val) {
            extraDarkerBackground(extraWin, mask_win);
      }
      if (par.extra_ET.val) {
            extraExponentialTransformation(extraWin, mask_win);
      }
      if (par.extra_HDRMLT.val) {
            extraHDRMultiscaleTransform(extraWin, mask_win);
      }
      if (par.extra_LHE.val) {
            extraLocalHistogramEqualization(extraWin, mask_win);
      }
      if (par.extra_contrast.val) {
            for (var i = 0; i < par.extra_contrast_iterations.val; i++) {
                  extraContrast(extraWin);
            }
      }
      if (par.extra_noise_reduction.val) {
            extraNoiseReduction(extraWin, mask_win);
      }
      if (par.extra_ACDNR.val) {
            extraACDNR(extraWin, mask_win);
      }
      if (par.extra_color_noise.val) {
            extraColorNoise(extraWin);
      }
      if (par.extra_unsharpmask.val) {
            extraUnsharpMask(extraWin, mask_win);
      }
      if (par.extra_sharpen.val) {
            extraSharpen(extraWin, mask_win);
      }
      if (par.extra_saturation.val) {
            extraSaturation(extraWin, mask_win);
      }
      if (par.extra_smaller_stars.val) {
            if (par.extra_remove_stars.val) {
                  extraSmallerStars(ImageWindow.windowById(extra_stars_id), true);
            } else {
                  extraSmallerStars(extraWin, false);
            }
      }
      if (par.extra_shadowclipping.val) {
            extraShadowClipping(extraWin, par.extra_shadowclippingperc.val);
      }
      if (par.extra_smoothbackground.val) {
            extraSmoothBackground(extraWin, par.extra_smoothbackgroundval.val);
      }
      if (par.extra_star_noise_reduction.val) {
            if (par.extra_remove_stars.val) {
                  starReduceNoise(ImageWindow.windowById(extra_stars_id));
            } else {
                  starReduceNoise(extraWin);
            }
      }
      if (par.extra_combine_stars.val) {
            /* Restore stars by combining starless image and stars. */
            var new_image_id = combineStarsAndStarless(
                                    par.extra_combine_stars_mode.val,
                                    extraWin.mainView.id, // starless
                                    extra_stars_id);
            // Close original window that was created before stars were removed
            util.closeOneWindow(extra_id);
            // restore original final image name
            var new_name = extra_id;
            console.writeln("Rename " + new_image_id + " as " + new_name);
            util.windowRename(new_image_id, new_name);
            extraWin = ImageWindow.windowById(new_name);
            extraWin.show();
      }
      extra_id = extraWin.mainView.id;
      if (apply_directly) {
            var final_win = ImageWindow.windowById(extraWin.mainView.id);
            guiUpdatePreviewWin(final_win);
            setFinalImageKeyword(final_win);
      } else {
            var final_win = ImageWindow.windowById(extra_id);
            guiUpdatePreviewWin(final_win);
            setFinalImageKeyword(final_win);
            saveProcessedWindow(global.outputRootDir, extra_id); /* Extra window */
            if (par.extra_remove_stars.val) {
                  saveProcessedWindow(global.outputRootDir, extra_starless_id);      /* Extra starless window */
                  saveProcessedWindow(global.outputRootDir, extra_stars_id);         /* Extra stars window */
            }
      }
}

/* Map background extracted channel images to start images.
 */
function mapBEchannels()
{
      if (L_BE_win != null) {
            L_id = L_BE_win.mainView.id;
      }
      if (R_BE_win != null) {
            R_id = R_BE_win.mainView.id;
      }
      if (G_BE_win != null) {
            G_id = G_BE_win.mainView.id;
      }
      if (B_BE_win != null) {
            B_id = B_BE_win.mainView.id;
      }
      if (H_BE_win != null) {
            H_id = H_BE_win.mainView.id;
      }
      if (S_BE_win != null) {
            S_id = S_BE_win.mainView.id;
      }
      if (O_BE_win != null) {
            O_id = O_BE_win.mainView.id;
      }
      if (RGB_BE_win != null) {
            RGB_color_id = RGB_BE_win.mainView.id;
      }
}

// Support functions of automatic crop
function make_full_image_list()
{
      let All_images = init_images();
      if (L_images.images.length > 0) {
            All_images.images = All_images.images.concat(L_images.images)
      }
      if (R_images.images.length > 0) {
            All_images.images = All_images.images.concat(R_images.images);
      }
      if (G_images.images.length > 0) {
            All_images.images = All_images.images.concat(G_images.images);
      }
      if (B_images.images.length > 0) {
            All_images.images = All_images.images.concat(B_images.images);
      }
      if (H_images.images.length > 0) {
            All_images.images = All_images.images.concat(H_images.images);
      }
      if (S_images.images.length > 0) {
            All_images.images = All_images.images.concat(S_images.images);
      }
      if (O_images.images.length > 0) {
            All_images.images = All_images.images.concat(O_images.images);
      }
      if (C_images.images.length > 0) {
            All_images.images = All_images.images.concat(C_images.images);
      }
      return All_images;
}

// Find borders starting from a mid point and going up/down
function find_up_down(image,col)
{
      let row_mid = image.height / 2;
      let row_up = 0;
      for (let row=row_mid; row>=0; row--) {
            let p = image.sample(col, row);
            if (p==0) {
                  row_up = row+1;
                  break;
            }
      }
      let row_down = image.height-1;
      for (let row=row_mid; row<image.height; row++) {
            let p = image.sample(col, row);
            if (p==0) {
                  row_down = row-1;
                  break;
            }
      }
      if (global.ai_debug) console.writeln("DEBUG find_up_down: at col ", col," extent up=", row_up, ", down=", row_down);
      return [row_up, row_down];
}

// Find borders starting from a mid point and going left/right
function find_left_right(image,row)
{
      let col_mid = image.width / 2;
      let col_left = 0;
      for (let col=col_mid; col>=0; col--) {
            let p = image.sample(col, row);
            if (p==0) {
                  col_left = col+1;
                  break;
            }
      }
      let col_right = image.width-1;
      for (let col=col_mid; col<image.width; col++) {
            let p= image.sample(col, row);
            if (p==0) {
                  col_right = col-1;
                  break;
            }
      }
      if (global.ai_debug) console.writeln("DEBUG find_left_right: at row ", row," extent left=", col_left, ", right=", col_right);
      return [col_left, col_right];
}

function findMaximalBoundingBox(lowClipImage)
{
      let col_mid = lowClipImage.width / 2;
      let row_mid = lowClipImage.height / 2;
      let p = lowClipImage.sample(col_mid, row_mid);
      if (p == 0.0) {
            // TODO - should return an error message and use the uncropped lowClipImage
            // Could look if other points around are ok in case of accidental dark middle point
            // Could also accept a % of rejection
            util.throwFatalError("Middle pixel not black in integration of lowest value for Crop, possibly not enough overlap")
      }

      // Find extent of black area at mid points (the black points nearest to the border)
      let [top,bottom] = find_up_down(lowClipImage,col_mid);
      let [left,right] = find_left_right(lowClipImage,row_mid);

      if (global.ai_debug)
      {
            console.writeln("DEBUG findMaximalBoundingBox top=",top,",bottom=",bottom,",left=",left,",right=",right);
      }

      return [top,bottom,left,right];
}

// Find the bounding box of the area without rejected image, starting from the
// middle point.

/* 
 * Assumptions:
 * It is assumed that the valid area obeys the following assumptions:
 * - The valid area is the area where all images are contributing (integrated value >0)
 *   (if needed remove badly aligned images before processing using Blink)
 * - The point at the center of the image is always valid (otherwise the process fails).
 * - The valid area is contiguous and no line from the center of the image to any valid point
 *   crosses an invalid area (a pretty reasonable assumption for any usable image),
 *   but CosmeticCorrection may have to be applied in some case.
 * - The valid area will be rectangular and parallel to the borders of the image.
 * With these assumptions there is generally not a single possible rectangular area
 * (think of an image inside a circle of valie points), the algorithm assumes that the valid area is 
 * "reasonable", that is a few percent smaller than the full image. In extreme cases
 * the selected area will work but may not be optimal. This should not be the case
 * for any common image.
 * 
 * Algorithm: 
 * Because the center point must be included, the maximum border are at the last
 * valid point going up/down and left/right from the center point. This defines
 * the initial top,bottom,left and right.
 * These top,bottom,left and right lines will be moved inwards as needed to ensure that
 * the four corners are valid point.
 * There is a loop that:
 * - Find the points at the intersection of top,bottom,left and right.
 * - Check if the points are valid
 * - Move the two adjacent lines of top,bottom,left or right inwards if the point is
 *   invalid and redo a test.
 * Each point is tested and moved in turn while they are invalid. When the four points 
 * are valid, then the smallest top,bottom,left and right are considered valid.
 * Because we are limited by both the intersection of the center lines and the valid 
 * corners, the algorithm works for border that are oblique lines, concave lines or convex
 * lines.
 * A final pass is done on each side to handle possible wiggles (pretty irregular borders
 * with some invalid points inside the bounding box). Each border is reduced until
 * the full border is valid.  This handles small irregularities (up to 100 pixels)
 * that are contiguous to a border.
 * NOTE: The previous algorithm used the rejection map, this may be more reliable but creates
 * more intermediate images, is slower in some cases and result in an inconvenient crop reference image.
*/
function findBounding_box(lowClipImageWindow)
{
      let image = lowClipImageWindow.mainView.image;

      console.noteln("Finding valid bounding box for image ", lowClipImageWindow.mainView.id, 
            " (", image.width, "x" , image.height + ")");

      let [top_row,bottom_row,left_col,right_col] = findMaximalBoundingBox(image);

      // Initialize the points at the maximum possible extend of the image,
      // typically some or all will be invalid (not black).
           
      // Find the first valid point moving inwards
     
      let left_top_valid = false;
      let right_top_valid = false;
      let left_bottom_valid = false;
      let right_bottom_valid = false;

      let left_top = new Point(left_col,top_row);
      let right_top = new Point(right_col,top_row);
      let left_bottom = new Point(left_col, bottom_row);
      let right_bottom = new Point(right_col,bottom_row);

      left_top_valid = image.sample(left_top)>0;
      right_top_valid =  image.sample(right_top)>0;
      left_bottom_valid =  image.sample(left_bottom)>0;
      right_bottom_valid =  image.sample(right_bottom)>0;

      let corner = 0;
      let all_valid = true;
      for (;;)
      {  
            switch (corner) {

                  case (0):
                        {
                              // If not yet valid, check if the current point is valid
                              if (!left_top_valid) {
                                    left_top = new Point(left_col,top_row);
                                    left_top_valid = image.sample(left_top)>0; 
                                    // if invalid move the corner inwards
                                    if (!left_top_valid)
                                    {
                                          all_valid= false;
                                          left_col = left_col+1;
                                          top_row = top_row+1;
                                    }
                              }
                        }

                  case (1):
                        {
                              // If not yet valid, check if the current point is valid
                              if (!right_bottom_valid) {
                                    right_bottom = new Point(right_col,bottom_row);
                                    right_bottom_valid = image.sample(right_bottom)>0; 
                                    // if invalid move the corner inwards
                                    if (!right_bottom_valid)
                                    {
                                          all_valid= false;
                                          right_col = right_col-1;
                                          bottom_row = bottom_row-1;
                                    }
                              }
                        }

                  case (2):
                        {
                              // If not yet valid, check if the current point is valid
                              //
                              if (!left_bottom_valid) {
                                    left_bottom = new Point(left_col,bottom_row);
                                    left_bottom_valid = image.sample(left_bottom)>0; 
                                    // if invalid move the corner inwards
                                    if (!left_bottom_valid)
                                    {
                                          all_valid= false;
                                          left_col = left_col+1;
                                          bottom_row = bottom_row-1;
                                    }
                              }
                        }

                  case (3):
                        {
                              // If not yet valid, check if the current point is valid
                              //
                              if (!right_top_valid) {
                                    right_top = new Point(right_col,top_row);
                                    right_top_valid = image.sample(right_top)>0; 
                                    // if invalid move the corner inwards
                                    if (!right_top_valid)
                                    {
                                          all_valid= false;
                                          right_col = right_col-1;
                                          top_row = top_row+1;
                                    }
                              }
                        }
             } // switch

            corner ++;
            // Check end of cycle
            if (corner>3) {
                  if (all_valid) {
                        break;
                  }
                  corner = 0;
                  all_valid = true;
            }

      } // for

      // Show the valid points for global.ai_debug - NOTE: The borders may be smaller as once a point is found as valid, it is not
      // recalculated.
      if (global.ai_debug) console.writeln("DEBUG findBounding_box - valid points LT=",left_top,",RT=",right_top,",LB=",left_bottom,",RB=",right_bottom)

      // Check that the whiole line at the border is valid, in case the border is wiggly
      let [original_left_col, original_right_col, original_top_row, original_bottom_row] = [left_col, right_col, top_row, bottom_row];

      let number_cycle = 0;
      let any_border_inwards = false;
      for (;;) {
            // Ensure that we terminate in case of unreasonable borders
            number_cycle += 1;
            if (number_cycle>100) 
            {
                  util.throwFatalError("Borders too wiggly for crop after ", number_cycle, " cycles"); 
            }

            let all_valid = true;
            let non_valid_count_limit = 1;

            // Check if left most column is entirely valid
            let left_col_valid = true;
            let non_valid_count = 0;
            for (let i=top_row; i<=bottom_row; i++)
            {
                  left_col_valid = left_col_valid && image.sample(left_col,i)>0;
                  if (left_col_valid) {
                        non_valid_count = 0;
                  } else if (non_valid_count > non_valid_count_limit) {
                        left_col_valid = false;
                        break;
                  } else {
                        non_valid_count++;
                        left_col_valid = true;
                  }
            }
            if (! left_col_valid) 
            {
                  left_col = left_col + 1;
                  any_border_inwards = true;
                  all_valid = false;
            }

            // Check if right most column is entirely valid
            let right_col_valid = true;
            non_valid_count = 0;
            for (let i=top_row; i<=bottom_row; i++)
            {
                  right_col_valid = right_col_valid && image.sample(right_col,i)>0;
                  if (right_col_valid) {
                        non_valid_count = 0;
                  } else if (non_valid_count > non_valid_count_limit) {
                        right_col_valid = false;
                        break;
                  } else {
                        non_valid_count++;
                        right_col_valid = true;
                  }
            }
            if (! right_col_valid) 
            {
                  right_col = right_col -1;
                  any_border_inwards = true;
                  all_valid = false;
            }

            // Check if top most column is entirely valid
            let top_row_valid = true;
            non_valid_count = 0;
            for (let i=left_col; i<=right_col; i++)
            {
                  top_row_valid = top_row_valid && image.sample(i,top_row)>0;
                  if (top_row_valid) {
                        non_valid_count = 0;
                  } else if (non_valid_count > non_valid_count_limit) {
                        top_row_valid = false;
                        break;
                  } else {
                        non_valid_count++;
                        top_row_valid = true;
                  }
            }
            if (! top_row_valid) 
            {
                  top_row = top_row + 1;
                  any_border_inwards = true;
                  all_valid = false;
            }
            
            // Check if bottom most column is entirely valid
            let bottom_row_valid = true;
            non_valid_count = 0;
            for (let i=left_col; i<=right_col; i++)
            {
                  bottom_row_valid = bottom_row_valid && image.sample(i,bottom_row)>0;
                  if (bottom_row_valid) {
                        non_valid_count = 0;
                  } else if (non_valid_count > non_valid_count_limit) {
                        bottom_row_valid = false;
                        break;
                  } else {
                        non_valid_count++;
                        bottom_row_valid = true;
                  }
            }
            if (! bottom_row_valid) 
            {
                  bottom_row = bottom_row -1;
                  any_border_inwards = true;
                  all_valid = false;
            }
            
            if (all_valid) {
                  break;
            }
      }
      
      if (any_border_inwards)
      {
            console.noteln("Borders reduced due to wiggles, ", number_cycle, " cycles of border reduction.");
            if (original_left_col != left_col) {
                  console.noteln("Left column moved from ", original_left_col, " to ", left_col);
            }
            if (original_right_col != right_col) {
                  console.noteln("Right column moved from ", original_right_col, " to ", right_col);
            }
            if (original_top_row != top_row) {
                  console.noteln("Top row moved from ", original_top_row, " to ", top_row);
            }
            if (original_bottom_row != bottom_row) {
                  console.noteln("Bottom row moved from ", original_bottom_row, " to ", bottom_row);
            }
      } else {
            console.noteln("Borders validated, no wiggle found");
      }
 
      // Log the area of interest
      let nmb_cols = right_col-left_col;
      let nmb_rows = bottom_row - top_row;

      console.noteln("Bounding box for crop: rows ", top_row ," to ", bottom_row, ", columns ", 
            left_col, " to  ",right_col, ",  area=", nmb_cols,"x",nmb_rows);
      return [left_col, right_col, top_row, bottom_row];
}

// We negate the crop amount here to match the requirement of the process Crop
function CreateCrop(left,top,right,bottom)
{
      var P = new Crop;
      P.leftMargin = -left;
      P.topMargin = -top;
      P.rightMargin = -right;
      P.bottomMargin = -bottom;
      P.mode = Crop.prototype.AbsolutePixels;
      // Irrelevant
      P.xResolution = 72.000;
      P.yResolution = 72.000;
      P.metric = false;
      P.forceResolution = false;
      // Irrelevant
      P.red = 0.000000;
      P.green = 0.000000;
      P.blue = 0.000000;
      P.alpha = 1.000000;
      P.noGUIMessages = true;
      return P;
}


// Crop an image if it exists
function CropImageIf(window, truncate_amount)
{
      if (window == null) { 
            return false;
      }
      if (truncate_amount == null) {
            return false;
      }

      let [left_truncate,top_truncate,right_truncate,bottom_truncate] = truncate_amount;
      console.writeln("Truncate image ", window.mainView.id, " by: top ", top_truncate, ", bottom, ", 
            bottom_truncate, ", left ", left_truncate, ", right ",right_truncate);
      
      let crop = CreateCrop(left_truncate,top_truncate,right_truncate,bottom_truncate);

      window.mainView.beginProcess(UndoFlag_NoSwapFile);  
      crop.executeOn(window.mainView, false);  
      window.mainView.endProcess();

      if (par.save_cropped_images.val) {
            var win_id = window.mainView.id;
            if (win_id.endsWith("_map")) {
                  var crop_id = win_id.replace(/_map$/, "_crop");
            } else {
                  var crop_id = win_id + "_crop";
            }
            console.writeln("Save cropped image " + win_id + " as " + crop_id);
            saveProcessedWindow(global.outputRootDir, win_id, crop_id);
      }

      return true;
}

function calculate_crop_amount(window_id, crop_auto_continue)
{
      let lowClipImageWindow = util.findWindow(window_id);
      if (lowClipImageWindow == null) {
            return null;
      }

      if (crop_auto_continue && !par.cropinfo_only.val) {
            let preview = lowClipImageWindow.previewById("crop");
            if (preview.isNull) {
                  util.throwFatalError("Error: crop preview not found from " + lowClipImageWindow.mainView.id);
            }
            var rect = lowClipImageWindow.previewRect(preview);
            var bounding_box = [ rect.x0, rect.x1, rect.y0, rect.y1 ];
            console.writeln("Using crop preview bounding box " + JSON.stringify(bounding_box));
      } else {
            var bounding_box = findBounding_box(lowClipImageWindow);
            console.writeln("Calculated crop preview bounding box " + JSON.stringify(bounding_box));
      }
      let [left_col, right_col, top_row, bottom_row] = bounding_box;
      
      if (!crop_auto_continue) {
            // Preview for information to the user only
            // with auto continue we assume that the preview is already there
            lowClipImageWindow.createPreview( left_col, top_row, right_col, bottom_row, "crop" );
      }
      
      // Calculate how much to truncate as used for the Crop process (except Crop want it negative)
      let full_image = lowClipImageWindow.mainView.image
      let top_truncate = top_row;
      let bottom_truncate = full_image.height - bottom_row;
      let left_truncate = left_col;
      let right_truncate = full_image.width - right_col;
      let truncate_amount = [left_truncate,top_truncate,right_truncate,bottom_truncate];
      console.noteln("Will truncate images by: top ", top_truncate, ", bottom, ", 
            bottom_truncate, ", left ", left_truncate, ", right ",right_truncate);
      
      
      // Calculate a percentage of truncation along axis and area for information purpose
      let x_truncate = left_truncate+right_truncate;
      let y_truncate = top_truncate+bottom_truncate;
      let x_truncate_percent = 100*(x_truncate/full_image.width);
      let y_truncate_percent = 100*(y_truncate/full_image.height);
      let new_area = (right_col-left_col+1) * (bottom_row-top_row+1);
      let full_area = full_image.width*full_image.height;
      let area_truncate_percent = 100*((full_area-new_area) / full_area);
      console.noteln("Truncate percentages: width by ",x_truncate_percent.toFixed(1),"%, height by ", y_truncate_percent.toFixed(1), 
            "%, area by ",area_truncate_percent.toFixed(1), "%");

      return truncate_amount;
}

// Find the crop area and crop all channel images
function cropChannelImages()
{
      util.addProcessingStepAndStatusInfo("Cropping all channel images to fully integrated area");

      // Make integration low
      let all_images = make_full_image_list();
      console.noteln("Finding common area for ",all_images.images.length, " images (all channels) ")
      let images = all_images.images;
      if (images == null || images.length == 0) {
            return;
      }
      //console.writeln("all: " + JSON.stringify(images, null, 2));

      let lowClipImageName = runImageIntegrationForCrop(images);

      // Autostretch for the convenience of the user
      ApplyAutoSTF(
            util.findWindow(lowClipImageName).mainView, 
            DEFAULT_AUTOSTRETCH_SCLIP,
            DEFAULT_AUTOSTRETCH_TBGND,
            false,
            false);

      crop_truncate_amount = calculate_crop_amount(lowClipImageName, false);
      if (crop_truncate_amount == null) {
            util.throwFatalError("cropChannelImages failed to find image " + lowClipImageName);
      }

      crop_lowClipImageName = lowClipImageName;       // save the name for saving to disk
      crop_lowClipImage_changed = true;

      /* Luminance image may have been copied earlier in CreateChannelImages()
       * so we try to crop it here.
       */
      if (CropImageIf(util.findWindow(luminance_id), crop_truncate_amount)) {
            luminance_id_cropped = true;
      }

      console.noteln("Generated data for cropping");
}

function cropChannelImagesAutoContinue()
{
      if (preprocessed_images != global.start_images.RGB_COLOR
          && preprocessed_images != global.start_images.L_R_G_B)
      {
            console.writeln("Crop ignored in AutoContinue, only integrated channel images can be cropped.") ;
            return;
      }
      util.addProcessingStepAndStatusInfo("Cropping all channel images to fully integrated area in AutoContinue");
      let lowClipImageName = autocontinue_prefix + "LowRejectionMap_ALL";
      crop_lowClipImageName = lowClipImageName;       // save the name for minimizing
      crop_truncate_amount = calculate_crop_amount(lowClipImageName, true);
      if (crop_truncate_amount == null) {
            util.throwFatalError("cropChannelImagesAutoContinue failed to find image " + lowClipImageName);
      }
}

/***************************************************************************
 * 
 *    calibrateEngine
 * 
 * Calibration engine to run image calibration 
 * if bias, dark and/or flat files are selected.
 */
 function calibrateEngine(filtered_lights)
 {
       if (global.biasFileNames == null) {
             global.biasFileNames = [];
       }
       if (global.flatdarkFileNames == null) {
             global.flatdarkFileNames = [];
       }
       if (global.flatFileNames == null) {
             global.flatFileNames = [];
       }
       if (global.darkFileNames == null) {
             global.darkFileNames = [];
       }
       if (global.biasFileNames.length == 0
           && global.flatdarkFileNames.length == 0
           && global.flatFileNames.length == 0
           && global.darkFileNames.length == 0)
       {
             // do not calibrate
             util.addProcessingStep("calibrateEngine, no bias, flat or dark files");
             return [ global.lightFileNames , '' ];
       }
 
       util.addProcessingStepAndStatusInfo("Image calibration");
 
       util.ensureDir(global.outputRootDir);
       util.ensureDir(util.combinePath(global.outputRootDir, global.AutoMasterDir));
       util.ensureDir(util.combinePath(global.outputRootDir, global.AutoOutputDir));
       util.ensureDir(util.combinePath(global.outputRootDir, global.AutoCalibratedDir));
 
       // Collect filter files
       var filtered_flats = engine.getFilterFiles(global.flatFileNames, global.pages.FLATS, '');
 
       is_color_files = filtered_flats.color_files;
 
       if (global.flatFileNames.length > 0 && global.lightFileNames.length > 0) {
             // we have flats and lights
             // check that filtered files match
             for (var i = 0; i < filtered_flats.allfilesarr.length; i++) {
                   var is_flats = filtered_flats.allfilesarr[i].files.length > 0;
                   var is_lights = filtered_lights.allfilesarr[i].files.length > 0;
                   if (is_flats != is_lights) {
                         // lights and flats do not match on filters
                         util.throwFatalError("Filters on light and flat images do not match.");
                   }
             }
       }
 
       if (par.bias_master_files.val) {
             util.addProcessingStep("calibrateEngine use existing master bias files " + global.biasFileNames);
             var masterbiasPath = global.biasFileNames;
       } else if (global.biasFileNames.length == 1) {
             util.addProcessingStep("calibrateEngine use existing master bias " + global.biasFileNames[0]);
             var masterbiasPath = global.biasFileNames[0];
       } else if (global.biasFileNames.length > 0) {
             util.addProcessingStep("calibrateEngine generate master bias using " + global.biasFileNames.length + " files");
             // integrate bias images
             var biasimages = filesForImageIntegration(global.biasFileNames);
             var masterbiasid = runImageIntegrationBiasDarks(biasimages, ppar.win_prefix + "AutoMasterBias");
 
             // save master bias
             setImagetypKeyword(util.findWindow(masterbiasid), "Master bias");
             var masterbiasPath = saveMasterWindow(global.outputRootDir, masterbiasid);
 
             // optionally generate superbias
             if (par.create_superbias.val) {
                   var masterbiaswin = util.findWindow(masterbiasid);
                   var mastersuperbiasid = runSuberBias(masterbiaswin);
                   setImagetypKeyword(util.findWindow(mastersuperbiasid), "Master bias");
                   var masterbiasPath = saveMasterWindow(global.outputRootDir, mastersuperbiasid);
                   guiUpdatePreviewId(mastersuperbiasid);
             } else {
                   guiUpdatePreviewId(masterbiasid);
             }
       } else {
             util.addProcessingStep("calibrateEngine no master bias");
             var masterbiasPath = null;
       }
 
       if (par.flat_dark_master_files.val) {
             util.addProcessingStep("calibrateEngine use existing master flat dark files " + global.flatdarkFileNames);
             var masterflatdarkPath = global.darkFileNames;
       } else if (global.flatdarkFileNames.length == 1) {
             util.addProcessingStep("calibrateEngine use existing master flat dark " + global.flatdarkFileNames[0]);
             var masterflatdarkPath = global.flatdarkFileNames[0];
       } else if (global.flatdarkFileNames.length > 0) {
             util.addProcessingStep("calibrateEngine generate master flat dark using " + global.flatdarkFileNames.length + " files");
             // integrate flat dark images
             var flatdarkimages = filesForImageIntegration(global.flatdarkFileNames);
             var masterflatdarkid = runImageIntegrationBiasDarks(flatdarkimages, ppar.win_prefix + "AutoMasterFlatDark");
             setImagetypKeyword(util.findWindow(masterflatdarkid), "Master flat dark");
             var masterflatdarkPath = saveMasterWindow(global.outputRootDir, masterflatdarkid);
             guiUpdatePreviewId(masterflatdarkid);
       } else {
             util.addProcessingStep("calibrateEngine no master flat dark");
             var masterflatdarkPath = null;
       }
 
       if (par.dark_master_files.val) {
             util.addProcessingStep("calibrateEngine use existing master dark files " + global.darkFileNames);
             var masterdarkPath = global.darkFileNames;
       } else if (global.darkFileNames.length == 1) {
             util.addProcessingStep("calibrateEngine use existing master dark " + global.darkFileNames[0]);
             var masterdarkPath = global.darkFileNames[0];
       } else if (global.darkFileNames.length > 0) {
             util.addProcessingStep("calibrateEngine generate master dark using " + global.darkFileNames.length + " files");
             if (par.pre_calibrate_darks.val && masterbiasPath != null) {
                   // calibrate dark frames with bias
                   var darkcalFileNames = runCalibrateDarks(global.darkFileNames, masterbiasPath);
                   var darkimages = filesForImageIntegration(darkcalFileNames);
             } else {
                   var darkimages = filesForImageIntegration(global.darkFileNames);
             }
             // generate master dark file
             var masterdarkid = runImageIntegrationBiasDarks(darkimages, ppar.win_prefix + "AutoMasterDark");
             setImagetypKeyword(util.findWindow(masterdarkid), "Master dark");
             var masterdarkPath = saveMasterWindow(global.outputRootDir, masterdarkid);
             guiUpdatePreviewId(masterdarkid);
       } else {
             util.addProcessingStep("calibrateEngine no master dark");
             var masterdarkPath = null;
       }
 
       // generate master flat for each filter
       util.addProcessingStepAndStatusInfo("Image calibration, generate master flats");
       var masterflatPath = [];
       for (var i = 0; i < filtered_flats.allfilesarr.length; i++) {
             var filterFiles = filtered_flats.allfilesarr[i].files;
             var filterName = filtered_flats.allfilesarr[i].filter;
             if (filterFiles.length == 1) {
                   util.addProcessingStep("calibrateEngine use existing " + filterName + " master flat " + filterFiles[0].name);
                   masterflatPath[i] = filterFiles[0].name;
             } else if (filterFiles.length > 0) {
                   // calibrate flats for each filter with master bias and master dark
                   util.addProcessingStep("calibrateEngine calibrate " + filterName + " flats using " + filterFiles.length + " files, " + filterFiles[0].name);
                   var flatcalimages = fileNamesToEnabledPathFromFilearr(filterFiles);
                   console.writeln("flatcalimages[0] " + flatcalimages[0][1]);
                   var flatcalFileNames = runCalibrateFlats(flatcalimages, masterbiasPath, masterdarkPath, masterflatdarkPath);
                   console.writeln("flatcalFileNames[0] " + flatcalFileNames[0]);
 
                   // integrate flats to generate master flat for each filter
                   var flatimages = filesForImageIntegration(flatcalFileNames);
                   console.writeln("flatimages[0] " + flatimages[0][1]);
                   let masterflatid = runImageIntegrationFlats(flatimages, ppar.win_prefix + "AutoMasterFlat_" + filterName);
                   console.writeln("masterflatid " + masterflatid);
                   setImagetypKeyword(util.findWindow(masterflatid), "Master flat");
                   setFilterKeyword(util.findWindow(masterflatid), filterFiles[0].filter);
                   masterflatPath[i] = saveMasterWindow(global.outputRootDir, masterflatid);
                   guiUpdatePreviewId(masterflatid);
             } else {
                   masterflatPath[i] = null;
             }
       }
 
       util.addProcessingStepAndStatusInfo("Image calibration, calibrate light images");
       var calibratedLightFileNames = [];
       for (var i = 0; i < filtered_lights.allfilesarr.length; i++) {
             var filterFiles = filtered_lights.allfilesarr[i].files;
             var filterName = filtered_lights.allfilesarr[i].filter;
             if (filterFiles.length > 0) {
                   // calibrate light frames with master bias, master dark and master flat
                   // optionally master dark can be left out
                   let fileProcessedStatus = getFileProcessedStatusCalibrated(fileNamesFromFilearr(filterFiles), '_c');
                   if (fileProcessedStatus.unprocessed.length == 0) {
                         calibratedLightFileNames = calibratedLightFileNames.concat(fileProcessedStatus.processed);
                   } else {
                         util.addProcessingStep("calibrateEngine calibrate " + filterName + " lights for " + fileProcessedStatus.unprocessed.length + " files");
                         let lightcalimages = fileNamesToEnabledPath(fileProcessedStatus.unprocessed);
 
                         let lightcalFileNames = runCalibrateLights(lightcalimages, masterbiasPath, masterdarkPath, masterflatPath[i]);
 
                         calibratedLightFileNames = calibratedLightFileNames.concat(lightcalFileNames, fileProcessedStatus.processed);
                   }
             }
       }
 
       // We now have calibrated light images
       // We now proceed with cosmetic correction and
       // after that debayering in case of OSC/RAW files
 
       console.writeln("calibrateEngine, return calibrated images, calibratedLightFileNames[0] " + calibratedLightFileNames[0]);
 
       util.runGC();
 
       return [ calibratedLightFileNames, '_c' ];
}
 
/***************************************************************************
 * 
 *    extraProcessingEngine
 * 
 */
 this.extraProcessingEngine = function(parent, extra_target_image, extra_narrowband)
 {
       engineInit();

       global.is_processing = true;

       narrowband = extra_narrowband;

       mask_win = null;
       mask_win_id = null;
       star_mask_win = null;
       star_mask_win_id = null;
       star_fix_mask_win = null;
       star_fix_mask_win_id = null;
       global.processing_steps = "";
 
       console.noteln("Start extra processing...");
       guiUpdatePreviewId(extra_target_image);
       if (gui) {
            gui.switchtoPreviewTab();
       }
 
       extraProcessing(parent, extra_target_image, true);
 
       util.windowIconizeAndKeywordif(mask_win_id);             /* AutoMask window */
       util.windowIconizeAndKeywordif(star_mask_win_id);        /* AutoStarMask or star_mask window */
       util.windowIconizeAndKeywordif(star_fix_mask_win_id);    /* AutoStarFixMask or star_fix_mask window */
 
       console.noteln("Processing steps:");
       console.writeln(global.processing_steps);
       console.writeln("");
       console.noteln("Extra processing completed.");

       global.is_processing = false;
 
       util.runGC();
}

function engineInit()
{
      util.init_pixinsight_version();
      if (global.AutoOutputDir == null) {
            util.setDefaultDirs();
      }
}
 
/***************************************************************************
 * 
 *    autointegrateProcessingEngine
 * 
 * Main processing function for AutoIntegrate.
 * 
 * Parameters:
 * 
 *          parent
 *                parent dialog, or null
 * 
 *          auto_continue
 *                if true run autocontinue
 * 
 *          autocontinue_narrowband
 *                if true run autocontinue in narrowband mode
 * 
 * Globals used:
 * 
 *          global.lightFileNames
 *                Array if light file names
 * 
 *          global.biasFileNames
 *                Optional array if bias file names for calibrate.
 * 
 *          global.darkFileNames
 *                Optional array if dark file names for calibrate.
 * 
 *          global.flatFileNames
 *                Optional array if flat file names for calibrate.
 * 
 *          global.flatdarkFileNames
 *                Optional array if flat dark file names for calibrate.
 * 
 *          global.par.*
 *                Processing parameters.
 * 
 */
this.autointegrateProcessingEngine = function(parent, auto_continue, autocontinue_narrowband)
{
       if (global.extra_target_image != "Auto" && global.extra_target_image != null) {
             console.criticalln("Extra processing target image can be used only with Apply button!");
             return false;
       }
 
       util.runGC();
 
       global.is_processing = true;
 
       var LRGB_ABE_HT_id = null;
       var RGB_ABE_HT_id = null;
       var LRGB_Combined = null;
 
       is_color_files = false;
       luminance_id = null;
       red_id = null;
       green_id = null;
       blue_id = null;
       L_id = null;
       R_id = null;
       G_id = null;
       B_id = null;
       H_id = null;
       S_id = null;
       O_id = null;
       RGB_color_id = null;
       R_ABE_id = null;
       G_ABE_id = null;
       B_ABE_id = null;
       RGB_win_id = null;
       start_time = Date.now();
       mask_win = null;
       star_mask_win = null;
       star_fix_mask_win = null;
       ssweight_set = false;
       crop_truncate_amount = null;
       crop_lowClipImageName = null;
       crop_lowClipImage_changed = false;
       autocontinue_prefix = "";
 
       RGB_stars_win = null;
       RGB_stars_HT_win = null;
       RGB_stars = [];
 
       global.processed_channel_images = [];
 
       luminance_id_cropped = false;
       var luminance_crop_id = null;
 
       console.beginLog();
       console.show();

       engineInit();
 
       global.processingDate = new Date;
       global.processing_steps = "";
       global.all_windows = [];
       global.iconPoint = null;
       linear_fit_done = false;
       narrowband = autocontinue_narrowband;
       is_luminance_images = false;
       var stars_id = null;
 
       if (gui) {
            gui.switchtoPreviewTab();
       }
 
       console.noteln("--------------------------------------");
       util.addProcessingStep("PixInsight version " + global.pixinsight_version_str);
       util.addProcessingStep(global.autointegrate_version);
       var processingOptions = getProcessingOptions();
       if (processingOptions.length > 0) {
             util.addProcessingStep("Processing options:");
             for (var i = 0; i < processingOptions.length; i++) {
                   util.addProcessingStep(processingOptions[i][0] + " " + processingOptions[i][1]);
             }
       } else {
             util.addProcessingStep("Using default processing options");
       }
       if (global.user_selected_best_image != null) {
             util.addProcessingStep("User selected best image: " + global.user_selected_best_image);
       }
       for (var i = 0; i < global.user_selected_reference_image.length; i++) {
             util.addProcessingStep("User selected reference image for filter " + global.user_selected_reference_image[i][1] + 
             " : " + global.user_selected_reference_image[i][0]);
       }
       console.noteln("--------------------------------------");
       util.addProcessingStepAndStatusInfo("Start processing...");
 
       if (gui) {
            gui.close_undo_images(parent);
       }
 
       targetTypeSetup();
       checkOptions();
 
       /* Create images for each L, R, G and B channels, or Color image. */
       let create_channel_images_ret = CreateChannelImages(parent, auto_continue);
       if (create_channel_images_ret == retval.ERROR) {
             console.criticalln("Failed!");
             console.endLog();
             global.is_processing = false;
             return false;
       }
 
       if (create_channel_images_ret == retval.SUCCESS || 
           (par.cropinfo_only.val && create_channel_images_ret == retval.INCOMPLETE)) 
       {
             /* If requested, we crop all channel support images (the *_map images)
              * to an area covered by all source images.
              */ 
             if (! auto_continue) {
                   if (par.crop_to_common_area.val || par.cropinfo_only.val) {
                         cropChannelImages();
                   } else {
                         console.warningln("Images are not cropped to common area, borders may be of lower quality");
                   }
             } else  {
                   if (par.crop_to_common_area.val || par.cropinfo_only.val) {
                         cropChannelImagesAutoContinue();
                   } else {
                         console.writeln("Crop ignored in AutoContinue, use images as is (possibly already cropped)") ;
                   }
             }
       }
 
       /* Now we have L (Gray) and R, G and B images, or just RGB image
        * in case of color files.
        *
        * We keep integrated L and RGB images so it is
        * possible to continue manually if automatic
        * processing is not good enough.
        */
 
       var do_extra_processing = false;
       if (par.calibrate_only.val) {
             preprocessed_images = global.start_images.CALIBRATE_ONLY;
       } else if (preprocessed_images == global.start_images.FINAL) {
             // We have a final image, just run run possible extra processing steps
             do_extra_processing = true;
             LRGB_ABE_HT_id = final_win.mainView.id;
             guiUpdatePreviewId(LRGB_ABE_HT_id);
       } else if (!par.image_weight_testing.val 
                  && !par.debayer_only.val 
                  && !par.binning_only.val
                  && !par.extract_channels_only.val
                  && !par.integrate_only.val 
                  && !par.cropinfo_only.val 
                  && preprocessed_images != global.start_images.FINAL) 
       {
             do_extra_processing = true;
             /* processRGB flag means we have channel images from LRGBHSO */
             var processRGB = !is_color_files && 
                              !par.monochrome_image.val &&
                              (preprocessed_images == global.start_images.NONE ||
                               preprocessed_images == global.start_images.L_R_G_B_BE ||
                               preprocessed_images == global.start_images.L_R_G_B_PROCESSED ||
                               preprocessed_images == global.start_images.L_R_G_B);
             var RGBmapping = { combined: false, stretched: false, channel_noise_reduction: false };
 
             util.runGC();
 
             if (preprocessed_images == global.start_images.L_R_G_B_BE) {
                   mapBEchannels();
             }
             if (processRGB) {
                   /* Do possible channel mapping. After that we 
                    * have red_id, green_id and blue_id.
                    * We may also have luminance_id.
                    * We may have a mapped RGB image in case of
                    * narrowband/custom mapping where RGB is created in
                    * mapLRGBchannels -> customMapping.
                    */
                   mapLRGBchannels(RGBmapping);
                   if (!RGBmapping.combined && preprocessed_images != global.start_images.L_R_G_B_PROCESSED) {
                         // We have not yet combined the RGB image
                         LinearFitLRGBchannels();
                   }
             } else if (is_color_files) {
                   mapColorImage();
             }
 
             if (!is_color_files && is_luminance_images) {
                   /* Process and stretch L image from linear to non-linear.
                    * This need to be run early as we create a mask from
                    * L image.
                    */
                   LRGBEnsureMask(null);
                   ProcessLimage(RGBmapping);
             }
 
             if (processRGB && !RGBmapping.combined) {
                   CombineRGBimage(RGB_ABE_HT_id);
                   RGBmapping.combined = true;
             }
             if (RGB_stars.length > 0) {
                   RGB_stars_win = combineRGBStars(RGB_stars);
             }
 
             if (par.monochrome_image.val) {
                   console.writeln("monochrome image, rename windows")
                   LRGB_ABE_HT_id = util.windowRename(L_ABE_HT_win.mainView.id, ppar.win_prefix + "AutoMono");
                   guiUpdatePreviewId(LRGB_ABE_HT_id);
 
             } else if (!par.channelcombination_only.val) {
 
                   /* Process and stretch RGB image from linear to non-linear.
                    */
                   RGB_ABE_HT_id = ProcessRGBimage(RGBmapping);
 
                   if (checkNoiseReduction('RGB', 'nonlinear')) {
                         runNoiseReduction(ImageWindow.windowById(RGB_ABE_HT_id), mask_win, false);
                   }
       
                   if (is_color_files || !is_luminance_images) {
                         /* Keep RGB_ABE_HT_id separate from LRGB_ABE_HT_id which
                          * will be the final result file.
                          */
                         LRGB_ABE_HT_id = "copy_" + RGB_ABE_HT_id;
                         util.copyWindow(
                               ImageWindow.windowById(RGB_ABE_HT_id), 
                               LRGB_ABE_HT_id);
                   } else {
                         /* LRGB files. Combine L and RGB images.
                         */
                         LRGB_ABE_HT_id = runLRGBCombination(
                                           RGB_ABE_HT_id,
                                           L_ABE_HT_id);
                         LRGB_Combined = LRGB_ABE_HT_id;
                         util.copyWindow(
                               ImageWindow.windowById(LRGB_ABE_HT_id), 
                               "copy_" + LRGB_ABE_HT_id);
                         LRGB_ABE_HT_id = "copy_" + LRGB_ABE_HT_id;
                   }
                   if (RGB_stars_HT_win != null) {
                         stars_id = RGB_stars_HT_win.mainView.id;
                   }
             
                   /* Optional ACDNR noise reduction for RGB. Used mostly to reduce black
                    * spots left from previous noise reduction.
                    */
                   runACDNRReduceNoise(ImageWindow.windowById(LRGB_ABE_HT_id), mask_win);
 
                   /* Optional color noise reduction for RGB.
                    */
                   if (par.use_color_noise_reduction.val) {
                         runColorReduceNoise(ImageWindow.windowById(LRGB_ABE_HT_id));
                   }
 
                   if (stars_id != null && !par.skip_star_noise_reduction.val) {
                         starReduceNoise(ImageWindow.windowById(stars_id));
                   }
 
                   if (!narrowband && !par.use_RGBNB_Mapping.val && !par.skip_SCNR.val) {
                         /* Remove green cast, run SCNR
                          */
                         runSCNR(ImageWindow.windowById(LRGB_ABE_HT_id).mainView, false);
                         if (stars_id != null) {
                               runSCNR(ImageWindow.windowById(stars_id).mainView, false);
                         }
                   }
           
                   /* Sharpen image, use mask to sharpen mostly the light parts of image.
                   */
                   if (par.skip_sharpening.val) {
                         console.writeln("No sharpening on " + LRGB_ABE_HT_id);
                   } else if (par.use_blurxterminator.val) {
                        /* We have already applied BlurXTerminator on linear image. */
                  } else {
                         runMultiscaleLinearTransformSharpen(
                               ImageWindow.windowById(LRGB_ABE_HT_id),
                               mask_win);
                         if (stars_id != null) {
                               runMultiscaleLinearTransformSharpen(
                                     ImageWindow.windowById(stars_id),
                                     null);
                         }
                   }
 
                   /* Color calibration on RGB
                    */
                   runColorCalibration(ImageWindow.windowById(LRGB_ABE_HT_id).mainView);
                   if (stars_id != null) {
                         runColorCalibration(ImageWindow.windowById(stars_id).mainView);
                   }
 
                   /* Rename some windows. Need to be done before iconize.
                   */
                   if (!is_color_files && is_luminance_images) {
                         /* LRGB files */
                         if (par.RRGB_image.val) {
                               LRGB_ABE_HT_id = util.windowRename(LRGB_ABE_HT_id, ppar.win_prefix + "AutoRRGB");
                         } else {
                               LRGB_ABE_HT_id = util.windowRename(LRGB_ABE_HT_id, ppar.win_prefix + "AutoLRGB");
                         }
                   } else {
                         /* Color or narrowband or RGB files */
                         LRGB_ABE_HT_id = util.windowRename(LRGB_ABE_HT_id, ppar.win_prefix + "AutoRGB");
                   }
                   guiUpdatePreviewId(LRGB_ABE_HT_id);
             }
             if (stars_id != null) {
                   console.writeln("Stars image is " + stars_id);
                   setFinalImageKeyword(ImageWindow.windowById(stars_id));
                   stars_id = util.windowRename(stars_id, LRGB_ABE_HT_id + "_stars");
       
                   var starless_id = LRGB_ABE_HT_id + "_starless";
                   console.writeln("Rename " + LRGB_ABE_HT_id + " as " + starless_id);
                   util.windowRename(LRGB_ABE_HT_id, starless_id);
                   var new_image = combineStarsAndStarless(
                                     par.stars_combine.val,
                                     starless_id, 
                                     stars_id);
                   // restore original final image name
                   console.writeln("Rename " + new_image + " as " + LRGB_ABE_HT_id);
                   util.windowRename(new_image, LRGB_ABE_HT_id);
                   ImageWindow.windowById(LRGB_ABE_HT_id).show();
       
                   setFinalImageKeyword(ImageWindow.windowById(starless_id));
       
                   saveProcessedWindow(global.outputRootDir, stars_id);
                   saveProcessedWindow(global.outputRootDir, starless_id);
             }
       }
 
       console.writeln("Basic processing completed");
 
       if (do_extra_processing && (util.is_extra_option() || util.is_narrowband_option())) {
             extraProcessing(parent, LRGB_ABE_HT_id, false);
       }
 
       util.ensureDialogFilePath("processed files");
 
       if (crop_lowClipImage_changed) {
             saveProcessedWindow(global.outputRootDir, crop_lowClipImageName);  /* LowRejectionMap_ALL */
       }
       if (preprocessed_images < global.start_images.L_R_G_B_BE) {
             // We have generated integrated images, save them
             console.writeln("Save processed windows");
             saveProcessedWindow(global.outputRootDir, L_id);                    /* Integration_L */
             saveProcessedWindow(global.outputRootDir, R_id);                    /* Integration_R */
             saveProcessedWindow(global.outputRootDir, G_id);                    /* Integration_G */
             saveProcessedWindow(global.outputRootDir, B_id);                    /* Integration_B */
             saveProcessedWindow(global.outputRootDir, H_id);                    /* Integration_H */
             saveProcessedWindow(global.outputRootDir, S_id);                    /* Integration_S */
             saveProcessedWindow(global.outputRootDir, O_id);                    /* Integration_O */
             saveProcessedWindow(global.outputRootDir, RGB_color_id);            /* Integration_RGB_color */
             if (luminance_id_cropped) {
                   console.writeln("luminance_id="+ luminance_id );
                   let L_win_crop = util.copyWindow(util.findWindow(luminance_id), util.ensure_win_prefix("Integration_L_crop"));
                   luminance_crop_id = L_win_crop.mainView.id;
                   saveProcessedWindow(global.outputRootDir, luminance_crop_id); /* Integration_L_crop */
             }
       }
       if (preprocessed_images <= global.start_images.L_R_G_B_BE) {
             // We have generated RGB image, save it
             console.writeln("Save generated RGB image");
             saveProcessedWindow(global.outputRootDir, RGB_win_id);              /* Integration_RGB */
       }
       if (preprocessed_images < global.start_images.FINAL && LRGB_ABE_HT_id != null) {
             console.writeln("Save final image");
             // set final image keyword so it easy to save all file e.g. as 16 bit TIFF
             setFinalImageKeyword(ImageWindow.windowById(LRGB_ABE_HT_id));
             // We have generated final image, save it
             global.run_results.final_image_file = saveProcessedWindow(global.outputRootDir, LRGB_ABE_HT_id);  /* Final image. */
       }
 
       /* All done, do cleanup on windows on screen 
        */
       util.addProcessingStepAndStatusInfo("Processing completed");
 
       util.closeTempWindows();
       if (!par.calibrate_only.val) {
             closeAllWindowsFromArray(global.calibrate_windows);
       }
 
       util.windowIconizeAndKeywordif(L_id);                    /* Integration_L */
       util.windowIconizeAndKeywordif(R_id);                    /* Integration_R */
       util.windowIconizeAndKeywordif(G_id);                    /* Integration_G */
       util.windowIconizeAndKeywordif(B_id);                    /* Integration_B */
       util.windowIconizeAndKeywordif(H_id);                    /* Integration_H */
       util.windowIconizeAndKeywordif(S_id);                    /* Integration_S */
       util.windowIconizeAndKeywordif(O_id);                    /* Integration_O */
       util.windowIconizeAndKeywordif(RGB_color_id);             /* Integration_RGB_color */
       if (crop_lowClipImageName != null) {
             util.windowIconizeif(crop_lowClipImageName);       /* LowRejectionMap_ALL */
       }
       util.windowIconizeAndKeywordif(RGB_win_id);              /* Integration_RGB */
       util.windowIconizeAndKeywordif(luminance_crop_id);       /* Integration_L_crop */
 
       if (RGB_stars_win != null) {
             util.windowIconizeAndKeywordif(RGB_stars_win.mainView.id); /* Integration_RGB_stars (linear) */
       }
       if (RGB_stars_HT_win != null) {
             setFinalImageKeyword(ImageWindow.windowById(RGB_stars_HT_win.mainView.id));   /* Integration_RGB_stars (non-linear) */
       }
 
       for (var i = 0; i < global.processed_channel_images.length; i++) {
             util.windowIconizeAndKeywordif(global.processed_channel_images[i]);
       }
 
       util.windowIconizeAndKeywordif(L_ABE_id);
       util.windowIconizeAndKeywordif(R_ABE_id);
       util.windowIconizeAndKeywordif(G_ABE_id);
       util.windowIconizeAndKeywordif(B_ABE_id);
       util.windowIconizeAndKeywordif(RGB_ABE_id);
 
       closeAllWindowsFromArray(RGB_stars);
 
       util.windowIconizeAndKeywordif(RGB_ABE_HT_id);
       util.windowIconizeAndKeywordif(L_ABE_HT_id);
       util.windowIconizeAndKeywordif(LRGB_Combined);           /* LRGB Combined image */
       util.windowIconizeAndKeywordif(mask_win_id);             /* AutoMask window */
       util.windowIconizeAndKeywordif(star_mask_win_id);        /* AutoStarMask or star_mask window */
       util.windowIconizeAndKeywordif(star_fix_mask_win_id);    /* AutoStarFixMask or star_fix_mask window */
 
       if (par.batch_mode.val) {
             /* Rename image based on first file directory name. 
              * First check possible device in Windows (like c:)
              */
             var fname = global.lightFileNames[0];
             console.writeln("Batch mode, get directory from file " + fname);
             var ss = fname.split(':');
             if (ss.length > 1) {
                   fname = ss[ss.length-1];
             }
             /* Then check Windows path separator \ */
             ss = fname.split('\\');
             if (ss.length > 1) {
                   fname = ss[ss.length-2];
             }
             /* Then check Unix path separator / */
             ss = fname.split('/');
             if (ss.length > 1) {
                   fname = ss[ss.length-2];
             }
             if (!isNaN(Number(fname.substring(0, 1)))) {
                   // We have number which is not valid
                   fname = 'P' + fname;
             }
             util.addProcessingStep("Batch mode, rename " + LRGB_ABE_HT_id + " to " + fname);
             LRGB_ABE_HT_id = util.windowRenameKeepifEx(LRGB_ABE_HT_id, fname, true, true);
             saveProcessedWindow(global.outputRootDir, LRGB_ABE_HT_id);          /* Final renamed batch image. */
       }
 
       if (preprocessed_images == global.start_images.NONE 
           && !par.image_weight_testing.val
           && !par.calibrate_only.val
           && !par.binning_only.val
           && !par.debayer_only.val
           && !par.extract_channels_only.val)
       {
             /* Output some info of files.
             */
             util.addProcessingStep("* All data files *");
             util.addProcessingStep(alignedFiles.length + " files accepted");
             util.addProcessingStep("best_ssweight="+global.best_ssweight);
             util.addProcessingStep("best_image="+global.best_image);
             var totalexptime = L_images.exptime + R_images.exptime + G_images.exptime +
                                B_images.exptime + C_images.exptime;
             util.addProcessingStep("total exptime="+totalexptime);
             
             console.writeln("");
 
             if (!is_color_files) {
                   /* LRGB files */
                   if (is_luminance_images) {
                         printImageInfo(L_images, "L");
                   }
 
                   if (!par.monochrome_image.val) {
                         printImageInfo(R_images, "R");
                         printImageInfo(G_images, "G");
                         printImageInfo(B_images, "B");
                         printImageInfo(H_images, "H");
                         printImageInfo(S_images, "S");
                         printImageInfo(O_images, "O");
                   }
             } else {
                   /* Color files */
                   printImageInfo(C_images, "Color");
             }
             var full_run = true;
       } else {
             var full_run = false;
       }
       var end_time = Date.now();
       util.addProcessingStepAndStatusInfo("Script completed, time "+(end_time-start_time)/1000+" sec");
       console.noteln("======================================");
 
       if (preprocessed_images != global.start_images.FINAL
           && par.autosave_setup.val 
           && !auto_continue 
           && !global.ai_get_process_defaults
           && full_run
           && create_channel_images_ret == retval.SUCCESS)
       {
             let json_file = "AutosaveSetup.json";
             if (par.win_prefix_to_log_files.val) {
                   json_file = util.ensure_win_prefix(json_file);
             }
             util.saveJsonFileEx(parent, true, json_file);
       }
       if (preprocessed_images != global.start_images.FINAL || global.ai_get_process_defaults) {
             engine.writeProcessingSteps(alignedFiles, auto_continue, null);
       }
 
       console.noteln("Processing steps:");
       console.writeln(global.processing_steps);
       console.writeln("--------------------------------------");
       var processingOptions = getProcessingOptions();
       if (processingOptions.length > 0) {
             console.writeln("Processing options:");
             for (var i = 0; i < processingOptions.length; i++) {
                   console.writeln(processingOptions[i][0] + " " + processingOptions[i][1]);
             }
       } else {
             util.addProcessingStep("Default processing options were used");
 
       }
       console.writeln("--------------------------------------");
       if (preprocessed_images != global.start_images.FINAL) {
             console.noteln("Console output is written into file " + logfname);
       }

       console.writeln("Run GC");
       util.runGC();
 
       console.noteln("Processing completed.");
       global.is_processing = false;
 
       return true;
}
 
function printProcessDefaultValues(name, obj)
{
      console.writeln(name);
      console.writeln(obj.toSource());
}

this.getProcessDefaultValues = function()
{
      console.beginLog();

      global.write_processing_log_file = true;
      console.writeln("PixInsight process default values");
      console.writeln("PixInsight version " + global.pixinsight_version_str);

      printProcessDefaultValues("new ChannelExtraction", new ChannelExtraction);
      printProcessDefaultValues("new ImageIntegration", new ImageIntegration);
      printProcessDefaultValues("new Superbias", new Superbias);
      printProcessDefaultValues("new ImageCalibration", new ImageCalibration);
      printProcessDefaultValues("new IntegerResample", new IntegerResample);
      printProcessDefaultValues("new CosmeticCorrection", new CosmeticCorrection);
      printProcessDefaultValues("new SubframeSelector", new SubframeSelector);
      printProcessDefaultValues("new PixelMath", new PixelMath);
      if (par.use_starxterminator.val) {
            printProcessDefaultValues("new StarXTerminator", new StarXTerminator);
      }
      if (par.use_noisexterminator.val) {
            printProcessDefaultValues("new NoiseXTerminator", new NoiseXTerminator);
      }
      if (par.use_starnet2.val) {
            printProcessDefaultValues("new StarNet2", new StarNet2);
      }
      printProcessDefaultValues("new StarNet", new StarNet);
      printProcessDefaultValues("new StarAlignment", new StarAlignment);
      printProcessDefaultValues("new LocalNormalization", new LocalNormalization);
      printProcessDefaultValues("new LinearFit", new LinearFit);
      printProcessDefaultValues("new DrizzleIntegration", new DrizzleIntegration);
      printProcessDefaultValues("new AutomaticBackgroundExtractor", new AutomaticBackgroundExtractor);
      printProcessDefaultValues("new ScreenTransferFunction", new ScreenTransferFunction);
      printProcessDefaultValues("new HistogramTransformation", new HistogramTransformation);
      printProcessDefaultValues("new MaskedStretch", new MaskedStretch);
      printProcessDefaultValues("new ACDNR", new ACDNR);
      printProcessDefaultValues("new MultiscaleLinearTransform", new MultiscaleLinearTransform);
      printProcessDefaultValues("new TGVDenoise", new TGVDenoise);
      printProcessDefaultValues("new BackgroundNeutralization", new BackgroundNeutralization);
      printProcessDefaultValues("new ColorCalibration", new ColorCalibration);
      printProcessDefaultValues("new ColorSaturation", new ColorSaturation);
      printProcessDefaultValues("new CurvesTransformation", new CurvesTransformation);
      printProcessDefaultValues("new LRGBCombination", new LRGBCombination);
      printProcessDefaultValues("new SCNR", new SCNR);
      printProcessDefaultValues("new Debayer", new Debayer);
      printProcessDefaultValues("new ChannelCombination", new ChannelCombination);
      printProcessDefaultValues("new ChannelExtraction", new ChannelExtraction);
      printProcessDefaultValues("new Invert", new Invert);
      printProcessDefaultValues("new StarMask", new StarMask);
      printProcessDefaultValues("new HDRMultiscaleTransform", new HDRMultiscaleTransform);
      printProcessDefaultValues("new LocalHistogramEqualization", new LocalHistogramEqualization);
      printProcessDefaultValues("new MorphologicalTransformation", new MorphologicalTransformation);

      engine.writeProcessingSteps(null, false, "AutoProcessDefaults_" + global.pixinsight_version_str);
}

}  /* AutoIntegrateEngine*/

AutoIntegrateEngine.prototype = new Object;
