/*
TODO
- GUI for HSO formulas
- apply formulas
- autocontinue for HSO
- runPixelMathMax new image
*/
/*

Script to automate initial steps of image processing in PixInsight.

Script has a GUI interface where some processing options can be selected.

In the end there will be integrated light files and automatically
processed final image. Scipt accepts LRGB, color and narrowband files. 
It is also possible do only partial processing and continue manually.

Clicking button AutoRun on GUI all the following steps listed below are performed.

LRGB files need to have keyword FILTER that has values for Luminance, Red, Green
or Blue channels. A couple of variants are accepted like 'Red' or 'R'.
If keyword FILTER is not found images are assumed to be color images. Also
camera RAW files can be used.

Script creates an AutoIntegrate.log file where details of the processing can be checked.

NOTE! These steps mayh not be updated with recent changes. They do describe the basic
      processing but some details may have changed.

Manual processing
-----------------

It is possible to rerun the script by clicking button AutoContinue with following steps 
if there are manually created images:
- L_HT + RGB_HT
  LRGB image with HistogramTransformation already done, the script starts after step <lHT> and <rgbHT>.
- RGB_HT
  Color (RGB) image with HistogramTransformation already done, the script starts after step <colorHT>.
- Integration_L_BE + Integration_RGB_BE
  LRGB image background extracted, the script starts after step <lABE> and <rgbABE>.
- Integration_RGB_BE
  Color (RGB) image background extracted, the script starts with after step <colorABE>.
- Integration_L_BE + Integration_R_BE + Integration_G_BE + Integration_B_BE
  LRGB image background extracted before image integration, the script starts after step <lABE> and 
   <rgbDBE>. Automatic ABE is then skipped.
- Integration_L + Integration_R + Integration_G + Integration_B + + Integration_H + Integration_S + Integration_O
  (L)RGB or narrowband image with integrated L,R,G,B;H,S,O images the script starts with step <lII>. 

Note that it is possible to run first automatic processing and then manually enhance some 
intermediate files and autocontinue there. 
- Crop integrated images and continue automatic processing using cropped images.
- Run manual DBE.

Generic steps for all files
---------------------------

1. Opens a file dialog. On that select all *.fit (or other) files. LRGB, color, RAW and narrowband
   files can be used.
2. SubframeSelector is run on files to measure and generate SSWEIGHT for
   each file. Output is *_a.xisf files.
3. Files are scanned and the file with highest SSWEIGHT is selected as a
   reference.
4. StarAlign is run on all files and *_a_r.xisf files are
   generated.
5. Optionally there is LocalNormalization on all files but
   that does not seem to produce good results. There must be a bug...

Steps with LRGB files
---------------------

1. ImageIntegration is run on LRGB files. Rejection method is chosen dynamically 
   based on the number of image files, or specified by the user. <lII>
   After this step there are Integration_L, Integration_R, Integration_G and Integration_B images,
   or with narrowband Integration_H, Integration_S and Integration_O.
2. Optionally ABE in run on L image. <lABE>
3. HistogramTransform is run on L image. <lHT>
4. Streched L image is stored as a mask unless user has a predefined mask named range_mask.
5. Noise reduction is run on L image using a mask.
6. *REMOVED* If ABE_before_channel_combination is selected then ABE is run on each color channel (R,G,B). 
   <rgbDBE>
7. If use_linear_fit is selected then LinearFit is run on RGB channels using L, R, G or B as a reference
8. If use_noise_reduction_on_all_channels is selected then noise reduction is done separately 
   for each R,G and B images using a mask.
9. ChannelCombination is run on Red, Green and Blue integrated images to
   create an RGB image. After that there is one L and one RGB image.
10. If color_calibration_before_ABE is selected then color calibration is run on RGB image.
    If use_background_neutralization is selected then BackgroundNeutralization is run before
    color calibration.
11. Optionally AutomaticBackgroundExtraction is run on RGB image. <rgbABE>
12. If color calibration is not yet done the color calibration is run on RGB image. Optionally
    BackgroundNeutralization is run before color calibration
13. HistogramTransform is run on RGB image. <rgbHT>
14. Optionally TGVDenoise is run to reduce color noise.
15. Optionally a slight CurvesTransformation is run on RGB image to increase saturation.
    By default saturation is increased also when the image is still in a linear
    format.
16. LRGBCombination is run to generate final LRGB image.

Steps with color files
----------------------

1. ImageIntegration is run on color *_a_r.xisf files.
   Rejection method is chosen dynamically based on the number of image files.
   After this step there is Integration_RGB image.
2. If color_calibration_before_ABE is selected then color calibration is run on RGB image.
   If use_background_neutralization is selected then BackgroundNeutralization is run before
   color calibration.
3. Optionally ABE in run on RGB image. <colorABE>
4. If color calibration is not yet done the color calibration is run on RGB image. Optionally
   BackgroundNeutralization is run before color calibration
5. HistogramTransform is run on RGB image. <colorHT>
6. A mask is created from an extracted and stretched luminance channel.
7. MultiscaleLinearTransform is run on color RGB image to reduce noise.
   Mask is used to target noise reduction more on the background.
8. Optionally a slight CurvesTransformation is run on RGB image to increase saturation.

Steps with narrowband files
---------------------------

Steps for narrowband files are a bit similar to LRGB files but without L channel.
- There is an option to choose how S, H and O files and mapped to R, G and B channels.
- Color calibration is not run on narrowband images
- Saturation default setting 1 does not increase saturation on narrowband images.
- Linear for can be used for R, G or B channels. In that case script runs linked STF 
  stretch. Default is to use unlinked STF stretch for narrpwband files.

Common final steps for all images
---------------------------------

1. SCNR is run on to reduce green cast.
2. MultiscaleLinearTransform is run to sharpen the image. A mask is used to target
   sharpening more on the light parts of the image.
3. Extra windows are closed or minimized.

Credits and Copyright notices
-----------------------------

Written by Jarmo Ruuth, 2018-2021.

PixInsight scripts that come with the product were a great help.
Web site Light Vortex Astronomy (http://www.lightvortexastronomy.com/)
was a great place to find details and best practises when using PixInsight.

Routines ApplyAutoSTF and applySTF are from PixInsight scripts that are 
distributed with Pixinsight. 

This product is based on software from the PixInsight project, developed
by Pleiades Astrophoto and its contributors (https://pixinsight.com/).

The following copyright notice is for routines ApplyAutoSTF and applySTF:

   Copyright (c) 2003-2020 Pleiades Astrophoto S.L. All Rights Reserved.
   
      Copyright (c) 2003-2020 Pleiades Astrophoto S.L. All Rights Reserved.
   
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

*/

#feature-id   AutoIntegrate

#feature-info Tool for integrating and processing calibrated LRGB or color images

#include <pjsr/ColorSpace.jsh>
#include <pjsr/FrameStyle.jsh>
#include <pjsr/Sizer.jsh>
#include <pjsr/SampleType.jsh>
#include <pjsr/StdButton.jsh>
#include <pjsr/StdIcon.jsh>
#include <pjsr/TextAlign.jsh>
#include <pjsr/NumericControl.jsh>
#include <pjsr/UndoFlag.jsh>
#include <pjsr/Sizer.jsh>
#include <pjsr/SectionBar.jsh>

var close_windows = false;
var use_local_normalization = false;            /* color problems, maybe should be used only for L images */
var same_stf_for_all_images = false;            /* does not work, colors go bad */
var use_linear_fit = 'L';                       /* default */
var use_clipping = 'D1';                        /* default */
var ssweight_set = false;
var use_weight = 'G';                           /* Default: Generic */
var imageintegration_normalization = 0;         /* Default: additive */
var skip_imageintegration_ssweight = false;
var imageintegration_clipping = true;
var use_noise_reduction_on_all_channels = false;
var integrate_only = false;
var channelcombination_only = false;
var skip_subframeselector = false;
var skip_cosmeticcorrection = false;
var linear_increase_saturation = 1;             /* Keep to 1, or check narrowband. */
var non_linear_increase_saturation = 1;         /* Keep to 1, or check narrowband. */
var strict_StarAlign = false;
var keep_integrated_images = false;
var run_HT = true;
var use_ABE_on_L_RGB = false;
var color_calibration_before_ABE = false;
var use_background_neutralization = false;
var use_drizzle = false;
var batch_mode = false;
var use_uwf = false;
var monochrome_image = false;
var synthetic_l_image = false;
var RRGB_image = false;
var synthetic_missing_images = false;
var unique_file_names = false;
var skip_noise_reduction = false;
var skip_color_noise_reduction = false;
var noise_reduction_before_HistogramTransform = true;
var narrowband = false;
var autocontinue_narrowband = false;
var narrowband_palette;
var linear_fit_done = false;
var is_luminance_images = false;    // Do we have luminance files from autocontinue or FITS
var STF_linking = 0;                // 0 = auto, 1 = linked, 2 = unlinked
var Halpha_RGB_mapping = 'R';       // where to map a lone Ha channel
var narrowband_RGB_mapping = 'max'; // how to map narrowband to RGB if we have both

var fix_narrowband_star_color = false;
var run_hue_shift = false;
var run_narrowband_SCNR = false;
var leave_some_green = false;
var skip_star_fix_mask = false;
var skip_max_linear_fit = false;

var processingDate;
var dialogFileNames = null;
var dialogFilePath = null;
var all_files;
var best_ssweight = 0;
var best_image = null;

var L_images;
var R_images;
var G_images;
var B_images;
var H_images;
var S_images;
var O_images;
var C_images;

/* "default" custom mapping, somewhere referred as Hubble mapping. */
var custom_R_mapping = "S";
var custom_G_mapping = "H";
var custom_B_mapping = "O";
var mapping_on_linear_data = false;

var extra_darker_background = false;
var extra_HDRMLT= false;
var extra_LHE = false;
var extra_smaller_stars = false;
var extra_smaller_stars_iterations = 1;
var extra_contrast = false;
var extra_STF = false;
var extra_target_image = null;
var skip_mask_contrast = false;

var processing_steps = "";
var all_windows = [];
var iconPoint;
var logfname;

/* Variable used during processing images.
 */
var alignedFiles;
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
var luminance_id = null;
var red_id = null;
var green_id = null;
var blue_id = null;
var L_id;
var R_id;
var G_id;
var B_id;
var H_id;
var S_id;
var O_id;
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
var L_stf;
var RGB_HT_win;
var range_mask_win;
var final_win;
var start_images = {
      NONE : 0,
      L_R_G_B_BE : 1,
      L_RGB_BE : 2,
      RGB_BE : 3,
      L_RGB_HT : 4,
      RGB_HT : 5,
      RGB_COLOR : 6,
      L_R_G_B : 7,
      FINAL : 8
};

// known window names
var integration_LRGB_windows = [
      "Integration_L",
      "Integration_R",
      "Integration_G",
      "Integration_B",
      "Integration_H",
      "Integration_S",
      "Integration_O"
];

var integration_color_windows = [
      "Integration_RGB"
];

var fixed_windows = [
      "Mapping_L",
      "Mapping_R",
      "Mapping_G",
      "Mapping_B",
      "Integration_L_ABE",
      "Integration_R_ABE",
      "Integration_G_ABE",
      "Integration_B_ABE",
      "Integration_RGB_ABE",
      "Integration_L_ABE_HT",
      "Integration_RGB_ABE_HT",
      "Integration_LRGB_ABE_HT",
      "copy_Integration_RGB_ABE_HT",
      "Integration_L_noABE",
      "Integration_R_noABE",
      "Integration_G_noABE",
      "Integration_B_noABE",
      "Integration_RGB_noABE",
      "Integration_L_noABE_HT",
      "Integration_RGB_noABE_HT",
      "Integration_LRGB_noABE_HT",
      "copy_Integration_RGB_noABE_HT",
      "L_BE_HT",
      "RGB_BE_HT",
      "AutoMask",
      "AutoStarMask",
      "AutoStarFixMask",
      "SubframeSelector",
      "Measurements",
      "Expressions",
      "L_win_mask"
];

/* Final processed window names, depending on input data and options used.
 * These may have Drizzle prefix if that option ise used.
 */
var final_windows = [
      "AutoLRGB",
      "AutoRRGB",
      "AutoRGB",
      "AutoMono"
];

var processingOptions = [];

function RemoveOption(option) 
{
      for (var i = 0; i < processingOptions.length; i++) {
            if (processingOptions[i][0] == option) {
                  processingOptions.splice(i, 1);
                  return;
            }
      }
}

function SetOptionValue(option, val)
{
      RemoveOption(option);

      var newopt = [];
      newopt[0] = option;
      newopt[1] = val;

      processingOptions[processingOptions.length] = newopt;
}

function SetOptionChecked(option, checked)
{
      if (!checked) {
            RemoveOption(option);
      } else {
            SetOptionValue(option, "");
      }
}

function addProcessingStep(txt)
{
      console.noteln("AutoIntegrate " + txt);
      processing_steps = processing_steps + "\n" + txt;
}

function throwFatalError(txt)
{
      addProcessingStep(txt);
      throw new Error(txt);
}

function winIsValid(w)
{
      return w != null;
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

function getWindowList()
{
      var windowList = [];
      var images = ImageWindow.windows;
      if (images == null || images == undefined) {
            return windowList;
      }
      for (var i in images) {
            windowList[windowList.length] = images[i].mainView.id;
      }
      return windowList;
}

function getWindowListReverse()
{
      var windowListReverse = [];
      var windowList = getWindowList();
      for (var i = windowList.length-1; i >= 0; i--) {
            windowListReverse[windowListReverse.length] = windowList[i];
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

function windowCloseif(id)
{
      var w = findWindow(id);
      if (w != null) {
            console.writeln("Close window " + id);
            w.close();
      }
}

function windowShowif(id)
{
      var w = findWindow(id);
      if (w != null) {
            console.writeln("Show window " + id);
            w.show();
      }
}

function windowIconizeif(id)
{
      if (id == null) {
            return;
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
                                    -(w.width / 2) + 5,
                                    -(w.height / 2) + 5);
                  //addProcessingStep("Icons start from position " + iconPoint);
            } else {
                  /* Put next icons in a nice row below the first icon.
                  */
                  iconPoint.moveBy(0, 32);
            }
            w.position = new Point(iconPoint);  // set window position to get correct icon position
            w.iconize();
            w.position = oldpos;                // restore window position
      }
}

function windowRenameKeepif(old_name, new_name, keepif)
{
      var w = ImageWindow.windowById(old_name);
      w.mainView.id = new_name;
      if (!keepif) {
            addScriptWindow(new_name);
      }
      return w.mainView.id;
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

// close one window
function closeOneWindow(id)
{
      var w = findWindow(id);
      if (w != null) {
            w.forceClose();
      }
}

// close all windows from an array
function closeAllWindowsFromArray(arr)
{
      for (var i = 0; i < arr.length; i++) {
            closeOneWindow(arr[i]);
      }
}

// For the final window, we may have more different names with
// both prefix or postfix added
function closeFinalWindowsFromArray(arr)
{
      for (var i = 0; i < arr.length; i++) {
            closeOneWindow(arr[i]);
            closeOneWindow(arr[i]+"_extra");
      }
}

function closeTempWindows()
{
      for (var i = 0; i < integration_LRGB_windows.length; i++) {
            closeOneWindow(integration_LRGB_windows[i] + "_max");
            closeOneWindow(integration_LRGB_windows[i] + "_map");
      }
}

// close all windows created by this script
function closeAllWindows()
{
      closeAllWindowsFromArray(all_windows);
      if (keep_integrated_images) {
            var isLRGB = false;
            for (var i = 0; i < integration_LRGB_windows.length; i++) {
                  if (findWindow(integration_LRGB_windows[i]) != null) {
                        // we have LRGB images
                        closeAllWindowsFromArray(integration_color_windows);
                        isLRGB = true;
                        break;
                  }
            }
            if (!isLRGB) {
                  // we have color image
                  closeAllWindowsFromArray(integration_LRGB_windows);
            }
      } else {
            closeAllWindowsFromArray(integration_LRGB_windows);
            closeAllWindowsFromArray(integration_color_windows);
      }
      closeTempWindows();
      closeAllWindowsFromArray(fixed_windows);
      closeFinalWindowsFromArray(final_windows);
}

function saveWindow(path, id)
{
      if (path == null || id == null) {
            return;
      }
      console.writeln("saveWindow " + path + id + getUniqueFilenamePart() + ".xisf");

      var w = ImageWindow.windowById(id);

      if (w == null) {
            return;
      }

      // Save image. No format options, no warning messages, 
      // no strict mode, no overwrite checks.
      if (!w.saveAs(path + id + getUniqueFilenamePart() + ".xisf", false, false, false, false)) {
            throwFatalError("Failed to save image: " + path + id + ".xisf");
      }
}

function saveMosaicWindow(win, dir, name, bits)
{
      console.writeln("saveMosaicWindow " + name);
      var copy_win = copyWindow(win, name + "_savetmp");
      var save_name;

      // 8 and 16 bite are TIFF, 32 is XISF
      if (bits != 32) {
            var new_postfix = "_" + bits;
            var old_postfix = name.substr(name.len - new_postfix.len);
            if (old_postfix != new_postfix) {
                  save_name = dir + "/" + name + new_postfix + getUniqueFilenamePart() + ".tif";
            } else {
                  // we already have bits added to name
                  save_name = dir + "/" + name + getUniqueFilenamePart() + ".tif";
            }

            if (copy_win.bitsPerSample != bits) {
                  console.writeln("saveMosaicWindow:set bits to " + bits);
                  copy_win.setSampleFormat(bits, false);
            }
      } else {
            save_name = dir + "/" + name + getUniqueFilenamePart() + ".xisf";
      }
      console.writeln("saveMosaicWindow:save name " + name);
      // Save image. No format options, no warning messages, 
      // no strict mode, no overwrite checks.
      if (!copy_win.saveAs(save_name, false, false, false, false)) {
            throwFatalError("Failed to save image: " + outputPath);
      }
      copy_win.forceClose();
}

function saveAllMosaicWindows(bits)
{
      console.writeln("saveAllMosaicWindows");
      var gdd = new GetDirectoryDialog;
      gdd.caption = "Select Save Directory";

      if (gdd.execute()) {
            // Find a windows that has a keyword which tells this is
            // a batch mode result file
            console.writeln("saveAllMosaicWindows:dir " + gdd.directory);
            var images = ImageWindow.windows;
            for (var i in images) {
                  var imageWindow = images[i];
                  var keywords = imageWindow.keywords;
                  for (var j = 0; j != keywords.length; j++) {
                        var keyword = keywords[j].name;
                        var value = keywords[j].strippedValue.trim();
                        if (keyword == "AstroMosaic" && value == "batch") {
                              // we have batch window 
                              saveMosaicWindow(imageWindow, gdd.directory, imageWindow.mainView.id, bits);
                        }
                  }
            }
      }
}

function copyWindow(sourceWindow, name)
{
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

      return targetWindow;
}

function newMaskWindow(sourceWindow, name)
{
      var targetWindow;

      if (sourceWindow.mainView.image.colorSpace != ColorSpace_Gray) {
            /* If we have color files we extrack lightness component and
               use it as a mask.
            */
            addProcessingStep("Create mask by extracting lightness component from color image "+ sourceWindow.mainView.id);
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
            targetWindow = ImageWindow.activeWindow;
            sourceWindow.mainView.endProcess();
            
            windowRenameKeepif(targetWindow.mainView.id, name, true);
      } else {
            /* Default mask is the same as stretched image. */
            addProcessingStep("Create mask from image " + sourceWindow.mainView.id);
            targetWindow = copyWindow(sourceWindow, name);
      }

      targetWindow.show();

      if (!skip_mask_contrast) {
            extraContrast(targetWindow);
      }

      return targetWindow;
}

function openFitFiles()
{
      var filenames;
      var ofd = new OpenFileDialog;

      ofd.multipleSelections = true;
      ofd.caption = "Select Light Frames";
      ofd.filters = [
            ["FITS files", "*.fit *.fits"],
            ["All files", "*.*"]
         ];

      if (!ofd.execute()) {
            return null;
      }

      if (ofd.fileNames.length < 1) {
            return null;
      }
      filenames = ofd.fileNames;
      all_files = filenames;

      return filenames;
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

function filterKeywords(imageWindow, keywordname) 
{
      var oldKeywords = [];
      var keywords = imageWindow.keywords;
      for (var i = 0; i != keywords.length; i++) {
            var keyword = keywords[i];
            if (keyword.name != keywordname) {
                  oldKeywords[oldKeywords.length] = keyword;
            }
      }
      return oldKeywords;
}

function setSSWEIGHTkeyword(imageWindow, SSWEIGHT) 
{
      var oldKeywords = filterKeywords(imageWindow, "SSWEIGHT");
      imageWindow.keywords = oldKeywords.concat([
         new FITSKeyword(
            "SSWEIGHT",
            SSWEIGHT.toFixed(3),
            "Image weight"
         )
      ]);
      ssweight_set = true;
}

function setBatchKeyword(imageWindow) 
{
      var oldKeywords = filterKeywords(imageWindow, "AstroMosaic");
      imageWindow.keywords = oldKeywords.concat([
         new FITSKeyword(
            "AstroMosaic",
            "batch",
            "AstroMosaic batch processed file"
         )
      ]);
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
   
function runCosmeticCorrection(fileNames)
{
      addProcessingStep("runCosmeticCorrection, output *_cc.xisf");
      console.writeln("fileNames[0] " + fileNames[0]);

      var P = new CosmeticCorrection;

      var targets = new Array;
      for (var i = 0; i < fileNames.length; i++) {
            var oneimage = new Array(2);
            oneimage[0] = true;           // enabled
            oneimage[1] = fileNames[i];   // path
            targets[targets.length] = oneimage;
      }
      P.targetFrames = targets;
      P.masterDarkPath = "";
      P.outputDir = "";
      P.outputExtension = ".xisf";
      P.prefix = "";
      P.postfix = "_cc";
      P.overwrite = true;
      P.amount = 1.00;
      P.cfa = false;
      P.useMasterDark = false;
      P.hotDarkCheck = false;
      P.hotDarkLevel = 1.0000000;
      P.coldDarkCheck = false;
      P.coldDarkLevel = 0.0000000;
      P.useAutoDetect = true;
      P.hotAutoCheck = true;
      P.hotAutoValue = 3.0;
      P.coldAutoCheck = true;
      P.coldAutoValue = 3.0;
      P.useDefectList = false;
      P.defects = [ // defectEnabled, defectIsRow, defectAddress, defectIsRange, defectBegin, defectEnd
      ];

      console.writeln("runCosmeticCorrection:executeGlobal");

      P.executeGlobal();

      for (var i = 0; i < fileNames.length; i++) {
            var ext = '.' + fileNames[i].split('.').pop();
            var newFileName = fileNames[i].replace(ext, "_cc.xisf");
            if (newFileName == fileNames[i]) {
                  throwFatalError("Cannot generate new output file name from " + filePath + ", extension " + ext);
            }
            fileNames[i] = newFileName;
      }
      console.writeln("runCosmeticCorrection output[0] " + fileNames[0]);

      return fileNames;
}

function SubframeSelectorMeasure(fileNames)
{
      console.writeln("SubframeSelectorMeasure");
      
      var P = new SubframeSelector;
      P.routine = SubframeSelector.prototype.MeasureSubframes;
      var targets = new Array;
      for (var i = 0; i < fileNames.length; i++) {
            var oneimage = new Array(2);
            oneimage[0] = true;
            oneimage[1] = fileNames[i];
            targets[targets.length] = oneimage;
      }
      P.subframes = targets;
      P.fileCache = true;
      P.subframeScale = 2.1514;
      P.cameraGain = 1.0000;
      P.cameraResolution = SubframeSelector.prototype.Bits16;
      P.siteLocalMidnight = 24;
      P.scaleUnit = SubframeSelector.prototype.ArcSeconds;
      P.dataUnit = SubframeSelector.prototype.Electron;
      P.structureLayers = 4;
      P.noiseLayers = 2;
      P.hotPixelFilterRadius = 1;
      P.applyHotPixelFilter = false;
      P.noiseReductionFilterRadius = 0;
      P.sensitivity = 0.1000;
      P.peakResponse = 0.8000;
      P.maxDistortion = 0.5000;
      P.upperLimit = 1.0000;
      P.backgroundExpansion = 3;
      P.xyStretch = 1.5000;
      P.psfFit = SubframeSelector.prototype.Gaussian;
      P.psfFitCircular = false;
      P.pedestal = 0;
      P.roiX0 = 0;
      P.roiY0 = 0;
      P.roiX1 = 0;
      P.roiY1 = 0;
      P.inputHints = "";
      P.outputHints = "";
      P.outputDirectory = "";
      P.outputExtension = ".xisf";
      P.outputPrefix = "";
      P.outputPostfix = "_a";
      P.outputKeyword = "SSWEIGHT";
      P.overwriteExistingFiles = true;
      P.onError = SubframeSelector.prototype.Continue;
      P.approvalExpression = "";
      P.weightingExpression = "10*(1-(FWHM-FWHMMin)/(FWHMMax-FWHMMin)) +\n" +
      "15*(1-(Eccentricity-EccentricityMin)/(EccentricityMax-EccentricityMin)) +\n" +
      "10*(SNRWeight-SNRWeightMin)/(SNRWeightMax-SNRWeightMin) +\n" +
      "20*(Noise-NoiseMin)/(NoiseMax-NoiseMin) +\n" +
      "50";      
      P.sortProperty = SubframeSelector.prototype.Index;
      P.graphProperty = SubframeSelector.prototype.Eccentricity;
      P.measurements = [ // measurementIndex, measurementEnabled, measurementLocked, measurementPath, measurementWeight, measurementFWHM, measurementEccentricity, measurementSNRWeight, measurementMedian, measurementMedianMeanDev, measurementNoise, measurementNoiseRatio, measurementStars, measurementStarResidual, measurementFWHMMeanDev, measurementEccentricityMeanDev, measurementStarResidualMeanDev
      ];

      console.writeln("SubframeSelectorMeasure:executeGlobal");

      P.executeGlobal();

      console.writeln("SubframeSelectorMeasure:calculate weight");

      /* Calculate weight */
      var indexPath = 3;
      var indexWeight = 4;
      var indexFWHM = 5;
      var indexEccentricity = 6;
      var indexSNRWeight = 7;
      var FWHMMin = findMin(P.measurements, indexFWHM);
      var FWHMMax = findMax(P.measurements, indexFWHM);
      var EccentricityMin = findMin(P.measurements, indexEccentricity);
      var EccentricityMax = findMax(P.measurements, indexEccentricity);
      var SNRWeightMin = findMin(P.measurements, indexSNRWeight);
      var SNRWeightMax = findMax(P.measurements, indexSNRWeight);

      console.writeln("FWHMMin " + FWHMMin + ", EccMin " + EccentricityMin + ", SNRMin " + SNRWeightMin);
      console.writeln("FWHMMax " + FWHMMax + ", EccMax " + EccentricityMax + ", SNRMax " + SNRWeightMax);

      var ssFiles = new Array;

      for (var i = 0; i < P.measurements.length; i++) {
            var FWHM = P.measurements[i][indexFWHM];
            var Eccentricity = P.measurements[i][indexEccentricity];
            var SNRWeight = P.measurements[i][indexSNRWeight];
            var SSWEIGHT;
            /* Defaults below are from script Weighted Batch Preprocessing v1.4.0
             * https://www.tommasorubechi.it/2019/11/15/the-new-weighted-batchpreprocessing/
             */
            if (FWHMMax == FWHMMin || EccentricityMax == EccentricityMin || SNRWeightMax == SNRWeightMin) {
                  // Avoid division by zero
                  SSWEIGHT = SNRWeight;
            } else if (use_weight == 'N') {
                  /* More weight on noise.
                   */
                  SSWEIGHT = (5*(1-(FWHM-FWHMMin)/(FWHMMax-FWHMMin)) + 
                              10*(1-(Eccentricity-EccentricityMin)/(EccentricityMax-EccentricityMin)) + 
                              20*(SNRWeight-SNRWeightMin)/(SNRWeightMax-SNRWeightMin))+
                              65;

            } else if (use_weight == 'S') {
                  /* More weight on stars.
                   */
                  SSWEIGHT = (35*(1-(FWHM-FWHMMin)/(FWHMMax-FWHMMin)) + 
                              35*(1-(Eccentricity-EccentricityMin)/(EccentricityMax-EccentricityMin)) + 
                              20*(SNRWeight-SNRWeightMin)/(SNRWeightMax-SNRWeightMin))+
                              10;

            } else {
                  /* Generic weight.
                   */
                  SSWEIGHT = (20*(1-(FWHM-FWHMMin)/(FWHMMax-FWHMMin)) + 
                              15*(1-(Eccentricity-EccentricityMin)/(EccentricityMax-EccentricityMin)) + 
                              25*(SNRWeight-SNRWeightMin)/(SNRWeightMax-SNRWeightMin))+
                              40;
            }
            P.measurements[i][indexWeight] = SSWEIGHT;
            P.measurements[i][0] = true;
            P.measurements[i][1] = false;
            addProcessingStep("FWHM " + FWHM + ", Ecc " + Eccentricity + ", SNR " + SNRWeight + ", SSWEIGHT " + SSWEIGHT + ", " + P.measurements[i][indexPath]);
            var onefile = new Array(2);
            onefile[0] = P.measurements[i][indexPath];
            onefile[1] = SSWEIGHT;
            ssFiles[ssFiles.length] = onefile;
      }

      return ssFiles;
}

function runSubframeSelector(fileNames)
{
      addProcessingStep("runSubframeSelector");
      console.writeln("input[0] " + fileNames[0]);
      
      var ssWeights = SubframeSelectorMeasure(fileNames);
      // SubframeSelectorOutput(P.measurements); Does not write weight keyword

      var ssFiles = new Array;

      for (var i = 0; i < ssWeights.length; i++) {
            var filePath = ssWeights[i][0];
            if (filePath != null && filePath != "") {
                  var SSWEIGHT = ssWeights[i][1];
                  var ext = '.' + filePath.split('.').pop();
                  var newFilePath = filePath.replace(ext, "_a.xisf");
                  if (newFilePath == filePath) {
                        throwFatalError("Cannot generate new output file name from " + filePath + ", extension " + ext);
                  }
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
                        imageWindow.forceClose();
                        console.writeln(
                           "*** Error: Can't write output image: ", newFilePath
                        );
                        continue;
                  }         
                  imageWindow.forceClose();
                  ssFiles[ssFiles.length] = newFilePath;
            }
      }
      addProcessingStep("runSubframeSelector, "+fileNames.length+" files");
      console.writeln("output[0] " + ssFiles[0]);

      return ssFiles;
}

function findBestSSWEIGHT(fileNames)
{
      var ssweight;
      var newFileNames = [];

      run_HT = true;
      best_ssweight = 0;
      best_image = null;

      /* Loop through files and find image with best SSWEIGHT.
       */
      addProcessingStep("Find best SSWEIGHT");
      var n = 0;
      var first_image = true;
      var best_ssweight_naxis = 0;
      for (var i = 0; i < fileNames.length; i++) {
            var filter;
            var filePath = fileNames[i];
            var ext = '.' + filePath.split('.').pop();
            console.writeln("File " +  filePath + " ext " +  ext);
            if (ext.toUpperCase() == '.FIT' || ext.toUpperCase() == '.XISF') {
                  run_HT = true;
            } else {
                  run_HT = false;
            }
            var F = new FileFormat(ext, true/*toRead*/, false/*toWrite*/);
            if (F.isNull) {
                  throwFatalError("No installed file format can read \'" + ext + "\' files."); // shouldn't happen
            }
            var f = new FileFormatInstance(F);
            if (f.isNull) {
                  throwFatalError("Unable to instantiate file format: " + F.name);
            }
            var info = f.open(filePath, "verbosity 0"); // do not fill the console with useless messages
            if (info.length <= 0) {
                  throwFatalError("Unable to open input file: " + filePath);
            }
            var keywords = [];
            if (F.canStoreKeywords) {
                  keywords = f.keywords;
            }

            f.close();

            n++;

            var skip_this = false;
            var slooh_uwf = false;        // Slooh Chile or T2 UWF scope
            var naxis1 = 0;
            var slooh_chile = false;      // Slooh Chile scope
            
            // First check if we skip image since we do not know
            // the order for keywords
            for (var j = 0; j < keywords.length; j++) {
                  var value = keywords[j].strippedValue.trim();
                  switch (keywords[j].name) {
                        case "TELESCOP":
                              console.writeln("telescop=" +  value);
                              if (value.indexOf("UWF") != -1) {
                                    slooh_uwf = true;
                              } else if (value.indexOf("C1HM") != -1) {
                                    slooh_chile = true;
                              }
                              break;
                        case "NAXIS1":
                              console.writeln("naxis1=" + value);
                              naxis1 = parseInt(value);
                              break;
                        default:
                              break;
                  }
            }
            if (slooh_chile && naxis1 < 1000) {
                  // Slooh Chile UWF sometimes can be identified only by resolution
                  console.writeln("Chile slooh_uwf");
                  slooh_uwf = true;
            }
            if (use_uwf) {
                  skip_this = !slooh_uwf;
            } else {
                  skip_this = slooh_uwf;
            }
            if (!skip_this) {
                  newFileNames[newFileNames.length] = fileNames[i];
                  for (var j = 0; j < keywords.length; j++) {
                        var value = keywords[j].strippedValue.trim();
                        switch (keywords[j].name) {
                              case "SSWEIGHT":
                                    ssweight_set = true;
                                    ssweight = value;
                                    console.writeln("ssweight=" +  ssweight);
                                    if (!first_image && naxis1 > best_ssweight_naxis) {
                                          addProcessingStep("  Files have different resolution, using bigger NAXIS1="+naxis1+" for best SSWEIGHT");
                                    }
                                    if (first_image || 
                                        naxis1 > best_ssweight_naxis ||
                                        (parseFloat(ssweight) > parseFloat(best_ssweight) &&
                                         naxis1 == best_ssweight_naxis))
                                    {
                                          best_ssweight = ssweight;
                                          console.writeln("new best_ssweight=" +  best_ssweight);
                                          best_image = filePath;
                                          best_ssweight_naxis = naxis1;
                                          first_image = false;
                                    }
                                    break;
                              default:
                                    break;
                        }
                  }
            } else {
                  console.writeln("Skip this");
            }
      }
      if (best_image == null) {
            console.writeln("Unable to find image with best SSWEIGHT, using first image");
            best_image = newFileNames[0];
            best_ssweight = 1;
      }
      return [ best_image, newFileNames ];
}

function copy_image_list(target_images, source_images)
{
      console.writeln("copy_image_list");
      for (var i = 0; i < source_images.length; i++) {
            append_image_for_integrate(target_images, source_images[i][1]);
      }
}

function find_best_image(weight_arr, image_arr)
{
      var best_weight = weight_arr[0];
      var best_image = image_arr[0];

      for (i = 1; i < weight_arr.length; i++) {
            if (weight_arr[i] > best_weight) {
                  best_image = image_arr[i];
            }
      }
      return { wght: best_weight, img: best_image };
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
                  return null;
      }
}

function updateFilesInfo(files, filearr, txt)
{
      for (var i = 0; i < filearr.length; i++) {
            if (files.best_image == null || parseFloat(filearr[i].ssweight) >= parseFloat(files.best_ssweight)) {
                  /* Add best images first in the array. */
                  files.best_ssweight = filearr[i].ssweight;
                  console.writeln(txt + " new best_ssweight=" +  parseFloat(files.best_ssweight));
                  files.best_image = filearr[i].name;
                  insert_image_for_integrate(files.images, filearr[i].name);
            } else {
                  append_image_for_integrate(files.images, filearr[i].name);
            }
            files.exptime += filearr[i].exptime;
      }
}

function init_images()
{
      return { images: [], best_image: null, best_ssweight: 0, exptime: 0 };
}

function findLRGBchannels(alignedFiles, filename_postfix)
{
      var rgb = false;

      /* Loop through aligned files and find different channels.
       */
      addProcessingStep("Find L,R,G,B,H,S,O and color channels");

      L_images = init_images();
      R_images = init_images();
      G_images = init_images();
      B_images = init_images();
      H_images = init_images();
      S_images = init_images();
      O_images = init_images();
      C_images = init_images();

      var allfiles = {
            L: [], R: [], G: [], B: [], H: [], O: [], S: [], C: []
      };

      /* Collect all different file types and some information about them.
       */
      var n = 0;
      for (var i = 0; i < alignedFiles.length; i++) {
            var filter = null;
            var ssweight = '0';
            var exptime = 0;
            var filePath = alignedFiles[i];
            
            console.writeln("findLRGBchannels file " +  filePath);
            var ext = ".xisf";
            var F = new FileFormat(ext, true/*toRead*/, false/*toWrite*/);
            if (F.isNull) {
                  throwFatalError("No installed file format can read \'" + ext + "\' files."); // shouldn't happen
            }
            var f = new FileFormatInstance(F);
            if (f.isNull) {
                  throwFatalError("Unable to instantiate file format: " + F.name);
            }
            var info = f.open(filePath, "verbosity 0"); // do not fill the console with useless messages
            if (info.length <= 0) {
                  throwFatalError("Unable to open input file: " + filePath);
            }
            var keywords = [];
            if (F.canStoreKeywords) {
                  keywords = f.keywords;
            }
            f.close();

            n++;
            for (var j = 0; j < keywords.length; j++) {
                  var value = keywords[j].strippedValue.trim();
                  switch (keywords[j].name) {
                        case "FILTER":
                        case "INSFLNAM":
                              console.writeln("filter=" +  value);
                              filter = value;
                              break;
                        case "SSWEIGHT":
                              ssweight = value;
                              console.writeln("ssweight=" +  ssweight);
                              ssweight_set = true;
                              break;
                        case "TELESCOP":
                              console.writeln("telescop=" +  value);
                              break;
                        case "NAXIS1":
                              console.writeln("naxis1=" + value);
                              break;
                        case "EXPTIME":
                        case "EXPOSURE":
                              console.writeln("exptime=" + value);
                              exptime = parseFloat(value);
                              break;
                        default:
                              break;
                  }
            }

            if (filter == null) {
                  // No filter keyword. Try mapping based on file name.
                  filter = filterByFileName(filePath, filename_postfix);
            }
            if (filter == null) {
                  filter = 'Color';
            }
            if (monochrome_image) {
                  console.writeln("Create monochrome image, set filter = Luminance");
                  filter = 'Luminance';
            }
            switch (filter.trim()) {
                  case 'Luminance':
                  case 'Clear':
                  case 'L':
                        allfiles.L[allfiles.L.length] = { name: filePath, ssweight: ssweight, exptime: exptime};
                        break;
                  case 'Red':
                  case 'R':
                        allfiles.R[allfiles.R.length] = { name: filePath, ssweight: ssweight, exptime: exptime};
                        rgb = true;
                        break;
                  case 'Green':
                  case 'G':
                        allfiles.G[allfiles.G.length] = { name: filePath, ssweight: ssweight, exptime: exptime};
                        rgb = true;
                        break;
                  case 'Blue':
                  case 'B':
                        allfiles.B[allfiles.B.length] = { name: filePath, ssweight: ssweight, exptime: exptime};
                        rgb = true;
                        break;
                  case 'SII':
                  case 'S':
                        allfiles.S[allfiles.S.length] = { name: filePath, ssweight: ssweight, exptime: exptime};
                        narrowband = true;
                        break;
                  case 'Halpha':
                  case 'Ha':
                  case 'H':
                        allfiles.H[allfiles.H.length] = { name: filePath, ssweight: ssweight, exptime: exptime};
                        narrowband = true;
                        break;
                  case 'OIII':
                  case 'O':
                        allfiles.O[allfiles.O.length] = { name: filePath, ssweight: ssweight, exptime: exptime};
                        narrowband = true;
                        break;
                  case 'Color':
                  default:
                        allfiles.C[allfiles.C.length] = { name: filePath, ssweight: ssweight, exptime: exptime};
                        break;
            }
      }

      // Check for synthetic images
      if (C_images.images.length == 0) {
            if (synthetic_l_image ||
                  (synthetic_missing_images && L_images.images.length == 0))
            {
                  if (L_images.images.length == 0) {
                        addProcessingStep("No luminance images, synthetic luminance image from all other images");
                  } else {
                        addProcessingStep("Synthetic luminance image from all LRGB images");
                  }
                  allfiles.L = allfiles.L.concat(allfiles.R);
                  allfiles.L = allfiles.L.concat(allfiles.G);
                  allfiles.L = allfiles.L.concat(allfiles.B);
            }
            if (R_images.images.length == 0 && synthetic_missing_images) {
                  addProcessingStep("No red images, synthetic red image from luminance images");
                  allfiles.R = allfiles.R.concat(allfiles.L);
            }
            if (G_images.images.length == 0 && synthetic_missing_images) {
                  addProcessingStep("No green images, synthetic green image from luminance images");
                  allfiles.G = allfiles.G.concat(allfiles.L);
            }
            if (B_images.images.length == 0 && synthetic_missing_images) {
                  addProcessingStep("No blue images, synthetic blue image from luminance images");
                  allfiles.B = allfiles.B.concat(allfiles.L);
            }
            if (RRGB_image) {
                  addProcessingStep("RRGB image, use R as L image");
                  console.writeln("L images " +  L_images.images.length);
                  console.writeln("R images " +  R_images.images.length);
                  allfiles.L = [];
                  allfiles.L = allfiles.L.concat(allfiles.R);
            }
      }

      updateFilesInfo(L_images, allfiles.L, 'L');
      updateFilesInfo(R_images, allfiles.R, 'R');
      updateFilesInfo(G_images, allfiles.G, 'G');
      updateFilesInfo(B_images, allfiles.B, 'B');
      updateFilesInfo(H_images, allfiles.H, 'H');
      updateFilesInfo(S_images, allfiles.S, 'S');
      updateFilesInfo(O_images, allfiles.O, 'O');
      updateFilesInfo(C_images, allfiles.C, 'C');

      if (rgb && narrowband) {
            addProcessingStep("There are both RGB and narrowband data, processing as RGB image");
            narrowband = false;
      }
      if (narrowband) {
            narrowband_palette = custom_R_mapping + custom_G_mapping + custom_B_mapping;
            addProcessingStep("Processing as narrowband image");
      } else {
            narrowband_palette = '';
      }
      if (C_images.images.length > 0) {
            // Color image
            if (L_images.images.length > 0) {
                  throwFatalError("Cannot mix color and luminance filter files");
            }
            if (R_images.images.length > 0) {
                  throwFatalError("Cannot mix color and red filter files");
            }
            if (B_images.images.length > 0) {
                  throwFatalError("Cannot mix color and blue filter files");
            }
            if (G_images.images.length > 0) {
                  throwFatalError("Cannot mix color and green filter files");
            }
      } else {
            if (monochrome_image) {
                  // Monochrome
                  if (L_images.images.length == 0) {
                        throwFatalError("No Luminance images found");
                  }
            } else if (rgb) {
                  // LRGB or RGB
                  if (R_images.images.length == 0) {
                        throwFatalError("No Red images found");
                  }
                  if (B_images.images.length == 0) {
                        throwFatalError("No Blue images found");
                  }
                  if (G_images.images.length == 0) {
                        throwFatalError("No Green images found");
                  }
            }
            if (L_images.images.length > 0) {
                  // Use just RGB channels
                  is_luminance_images = true;
            }
      }
}

function runPixelMathMax(id, maxid)
{
      addProcessingStep("Run PixelMath max(" + id + ", " + maxid + ")");

      var idWin = findWindow(id);

      var P = new PixelMath;
      P.expression = "max("+id+", "+maxid+")";
      P.expression1 = "";
      P.expression2 = "";
      P.expression3 = "";
      P.useSingleExpression = true;
      P.symbols = "";
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
      P.showNewImage = false;
      P.newImageId = id + "_max";
      P.newImageWidth = 0;
      P.newImageHeight = 0;
      P.newImageAlpha = false;
      P.newImageColorSpace = PixelMath.prototype.SameAsTarget;
      P.newImageSampleFormat = PixelMath.prototype.SameAsTarget;

      idWin.mainView.beginProcess(UndoFlag_NoSwapFile);
      P.executeOn(idWin.mainView);
      idWin.mainView.endProcess();

      return P.newImageId;
}

/* Run max() channel mapping using PixelMath. */
function mapMax(id1, id2)
{
      if (id1 == null) {
            console.writeln("Map max, we have only ", id2);
            return id2;
      }
      if (id2 == null) {
            console.writeln("Map max, we have only ", id1);
            return id1;
      }
      console.writeln("Map max(" + id1 + ", " + id2);
      if (!skip_max_linear_fit) {
            runLinearFit(id1, id2);
      }
      var id = runPixelMathMax(id1, id2);
      console.writeln("Map max result " + id);
      return id;
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

function replaceMappingImageNames(mapping, from, to, images)
{
      console.writeln("replaceMappingImageNames in " + mapping + " from " + from + " to " + to);
      mapping = mapping.trim();
      var n = mapping.search(from);
      if (n == -1) {
            // not found
            console.writeln("replaceMappingImageNames not found");
            return mapping;
      }
      if (mapping.length == 1) {
            // only char must be the one we are looking for
            console.writeln("replaceMappingImageNames only one char");
            add_missing_image(images, to);
            return to + "_map";
      }
      // loop until all occurances are replaced
      for (var i = mapping.length; i > 0; i--) {
            console.writeln("replaceMappingImageNames scan " + mapping);
            for (var n = 0; n < mapping.length; n++) {
                  if (mapping.substring(n, n+1) == from) {
                        var replace = true;
                        if (n > 0 && isVariableChar(mapping.substring(n-1, n))) {
                              // nothing to replace
                              console.writeln("replaceMappingImageNames letter before " + from);
                              replace = false;
                        } else if (n < mapping.length-1 && isVariableChar(mapping.substring(n+1, n+2))) {
                              // nothing to replace
                              console.writeln("replaceMappingImageNames letter after " + from);
                              replace = false;
                        }
                        if (replace) {
                              add_missing_image(images, to);
                              mapping = mapping.substring(0, n) + to + "_map" + mapping.substring(n+1);
                              console.writeln("replaceMappingImageNames mapped to " + mapping);
                              break;
                        }
                  }
            }
            if (n == mapping.length) {
                  // all replaced
                  console.writeln("replaceMappingImageNames, all replaced, mapped to " + mapping);
                  return mapping;
            }
      }
      console.writeln("replaceMappingImageNames, too many loop iterations, mapped to " + mapping);
      return mapping;
}

/* Run a custom channel mapping using PixelMath. */
function mapCustomAndReplaceImageNames(targetChannel, images)
{
      switch (targetChannel) {
            case 'R':
                  var mapping = custom_R_mapping;
                  break;
            case 'G':
                  var mapping = custom_G_mapping;
                  break;
            case 'B':
                  var mapping = custom_B_mapping;
                  break;
            default:
                  console.writeln("ERROR: mapCustomAndReplaceImageNames " + targetChannel);
                  return null;
      }
      console.writeln("mapCustomAndReplaceImageNames " + targetChannel + " using " + mapping);
      /* Replace letters with actual image identifiers. */
      mapping = replaceMappingImageNames(mapping, "R", "Integration_R", images);
      mapping = replaceMappingImageNames(mapping, "G", "Integration_G", images);
      mapping = replaceMappingImageNames(mapping, "B", "Integration_B", images);
      mapping = replaceMappingImageNames(mapping, "H", "Integration_H", images);
      mapping = replaceMappingImageNames(mapping, "S", "Integration_S", images);
      mapping = replaceMappingImageNames(mapping, "O", "Integration_O", images);
      console.writeln("mapCustomAndReplaceImageNames:converted mapping " + mapping);

      return mapping;
}

function runPixelMathMapping(newId, mapping_R, mapping_G, mapping_B)
{
      addProcessingStep("Run PixelMath mapping R " + mapping_R + ", G " + mapping_G + ", B " + mapping_B);

      var idWin = findWindow("Integration_H");
      if (idWin == null) {
            findWindow("Integration_S");
      }
      if (idWin == null) {
            findWindow("Integration_O");
      }
      if (idWin == null) {
            console.writeln("ERROR: No reference window found for PixelMath");
      }
      var P = new PixelMath;
      P.expression = mapping_R;
      P.expression1 = mapping_G;
      P.expression2 = mapping_B;
      P.expression3 = "";
      P.useSingleExpression = false;
      P.symbols = "";
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
      P.newImageId = newId;
      P.newImageWidth = 0;
      P.newImageHeight = 0;
      P.newImageAlpha = false;
      P.newImageColorSpace = PixelMath.prototype.RGB;
      P.newImageSampleFormat = PixelMath.prototype.SameAsTarget;

      idWin.mainView.beginProcess(UndoFlag_NoSwapFile);
      P.executeOn(idWin.mainView);
      idWin.mainView.endProcess();

      return newId;
}

/* Do custom mapping of channels to RGB image. We do some the same 
 * stuff here as in CombineRGBimage.
 */
function customMapping()
{
      var RBGmapping = { combined: true, stretched: true};

      addProcessingStep("customMapping");

      /* Get updated mapping strings and collect images
       * used in mapping.
       */
      var images = [];
      var red_mapping = mapCustomAndReplaceImageNames('R', images);
      var green_mapping = mapCustomAndReplaceImageNames('G', images);
      var blue_mapping = mapCustomAndReplaceImageNames('B', images);

      if (mapping_on_linear_data) {
            /* Do linear fit before pixelmath on non-strectched linear images with _map added to name.
             */
            var refid = -1;
            for (var i = 0; i < images.length; i++) {
                  // Try find other that Ha as reference as we do not want the strongest
                  // signal as reference.
                  if (images[i] == "Integration_O") {
                        refid = i;
                  }
                  if (refid == -1 && images[i] == "Integration_S") {
                        refid = i;
                  }
                  /* Make a copy so we do not change the original integrated images. */
                  var copyname = images[i] + "_map";
                  copyWindow(findWindow(images[i]), copyname);
                  images[i] = copyname;
                  if (use_noise_reduction_on_all_channels) {
                        runMultiscaleLinearTransformReduceNoise(images[i], null);
                  }
            }
            if (refid == -1) {
                  // Just pick something
                  refid = 0;
            }
            for (var i = 0; i < images.length; i++) {
                  if (i != refid) {
                        copyWindow(findWindow(images[i]), images[i] + "_before_linear_fit");
                        runLinearFit(images[refid], images[i]);
                        copyWindow(findWindow(images[i]), images[i] + "_after_linear_fit");
                  }
            }
            RBGmapping.stretched = false;
      } else {
            /* Stretch images to non-linear with _map added to name.
             */
            addProcessingStep("customMapping, stretch images");
            for (var i = 0; i < images.length; i++) {
                  /* Make a copy so we do not change the original integrated images. */
                  var copy_win = copyWindow(findWindow(images[i]), images[i] + "_map");
                  if (use_noise_reduction_on_all_channels) {
                        runMultiscaleLinearTransformReduceNoise(copy_win, null);
                  }
                  runHistogramTransform(copy_win, null, false);
            }
            RBGmapping.stretched = true;
      }

      /* Run PixelMath to create a combined RGB image.
       */
      RGB_win_id = runPixelMathMapping("Integration_RGB", red_mapping, green_mapping, blue_mapping);

      RGB_win = findWindow(RGB_win_id);
      RGB_win.show();
      addScriptWindow(RGB_win_id);

      return RBGmapping;
}

function mapLRGBchannels()
{
      var RBGmapping = { combined: false, stretched: false};
      var rgb = R_id != null || G_id != null || B_id != null;;
      narrowband = H_id != null || S_id != null || O_id != null;

      addProcessingStep("Map LRGB channels");

      if (narrowband) {
            // we have some narrowband files, group them to LRGB files
            var mapping;
            if (rgb) {
                  // We have both RGB and SHO, use mapping
                  mapping = narrowband_RGB_mapping;
            } else {
                  // We have no RGB files, just use a direct palette mapping
                  mapping = 'palette';
            }
            if (O_id == null && S_id == null) {
                  // We have only Ha
                  luminance_id = L_id;
                  red_id = R_id;
                  green_id = G_id;
                  blue_id = B_id;
                  if (Halpha_RGB_mapping == 'L') {
                        if (mapping == 'max') {
                              addProcessingStep("Ha but no SII or OIII, map Ha as max(L,Ha)");
                              luminance_id = mapMax(L_id, H_id);
                        }
                  } else if (Halpha_RGB_mapping == 'R') {
                        if (mapping == 'max') {
                              addProcessingStep("Ha but no SII or OIII, map Ha as max(R,Ha)");
                              red_id = mapMax(R_id, H_id);
                        }
                  } else if (Halpha_RGB_mapping == 'LR') {
                        if (mapping == 'max') {
                              addProcessingStep("Ha but no SII or OIII, map Ha as max(L,Ha) and max(R,Ha)");
                              luminance_id = mapMax(L_id, H_id);
                              red_id = mapMax(R_id, H_id);
                        }
                  }
            } else {
                  if (narrowband_palette == 'SHO' && mapping == 'max') {
                        addProcessingStep("Narrowband files, map as max(SHO, RGB)");
                        red_id = mapMax(R_id, S_id);
                        green_id = mapMax(G_id, H_id);
                        blue_id = mapMax(B_id, O_id);
                  } else if (narrowband_palette == 'HOS' && mapping == 'max') {
                        addProcessingStep("Narrowband files, map as max(HOS, RGB)");
                        red_id = mapMax(R_id, H_id);
                        green_id = mapMax(G_id, O_id);
                        blue_id = mapMax(B_id, S_id);
                  } else if (narrowband_palette == 'HOO' && mapping == 'max') {
                        addProcessingStep("Narrowband files, map as max(HOO, RGB)");
                        red_id = mapMax(R_id, H_id);
                        green_id = mapMax(G_id, O_id);
                        blue_id = mapMax(B_id, O_id);
                  } else {
                        addProcessingStep("Narrowband files, custom mapping");
                        RBGmapping = customMapping();
                  }
            }
      } else {
            luminance_id = L_id;
            red_id = R_id;
            green_id = G_id;
            blue_id = B_id;
      }
      return RBGmapping;
}

function insert_image_for_integrate(images, new_image)
{
      images.unshift(new Array(2));
      images[0][0] = true;                // enabled
      images[0][1] = new_image;           // path
}

function append_image_for_integrate(images, new_image)
{
      console.writeln("append_image_for_integrate " + new_image);
      var len = images.length;
      images[len] = new Array(2);
      images[len][0] = true;
      images[len][1] = new_image;
}

/* After SubframeSelector run StarAlignment on *_a.xisf files.
   The output will be *_a_r.xisf files.
*/
function runStarAlignment(imagetable, refImage)
{
      var alignedFiles;

      addProcessingStep("Star alignment on " + imagetable.length + " files, reference image " + refImage);
      console.writeln("input[0] " + imagetable[0]);
      var P = new StarAlignment;
      var targets = new Array;

      for (var i = 0; i < imagetable.length; i++) {
            var oneimage = new Array(3);
            oneimage[0] = true;
            oneimage[1] = true;
            oneimage[2] = imagetable[i];
            targets[targets.length] = oneimage;
      }

      if (strict_StarAlign) {
            P.structureLayers = 5;
      } else {
            P.structureLayers = 6;
      }
      P.noiseLayers = 0;
      P.hotPixelFilterRadius = 1;
      if (strict_StarAlign) {
            P.noiseReductionFilterRadius = 0;
      } else {
            P.noiseReductionFilterRadius = 5;
      }
      if (strict_StarAlign) {
            P.sensitivity = 0.100;
      } else {
            P.sensitivity = 0.010;
      }
      P.peakResponse = 0.80;
      P.maxStarDistortion = 0.500;
      P.upperLimit = 1.000;
      P.invert = false;
      P.distortionModel = "";
      P.undistortedReference = false;
      P.distortionCorrection = false;
      P.distortionMaxIterations = 20;
      P.distortionTolerance = 0.005;
      P.matcherTolerance = 0.0500;
      if (strict_StarAlign) {
            P.ransacTolerance = 2.00;
            P.ransacMaxIterations = 2000;
      } else {
            P.ransacTolerance = 6.00;
            P.ransacMaxIterations = 3000;
      }
      P.ransacMaximizeInliers = 1.00;
      P.ransacMaximizeOverlapping = 1.00;
      P.ransacMaximizeRegularity = 1.00;
      P.ransacMinimizeError = 1.00;
      P.maxStars = 0;
      P.useTriangles = false;
      P.polygonSides = 5;
      P.descriptorsPerStar = 20;
      P.restrictToPreviews = true;
      P.intersection = StarAlignment.prototype.MosaicOnly;
      P.useBrightnessRelations = false;
      P.useScaleDifferences = false;
      P.scaleTolerance = 0.100;
      P.referenceImage = "";
      P.inputHints = "";
      P.outputHints = "";
      P.mode = StarAlignment.prototype.RegisterMatch;
      P.writeKeywords = true;
      P.generateMasks = false;
      if (use_drizzle) {
            P.generateDrizzleData = true; /* Generate .zdrz files. */
      } else {
            P.generateDrizzleData = false;
      }
      P.frameAdaptation = false;
      P.noGUIMessages = true;
      P.useSurfaceSplines = false;
      P.splineSmoothness = 0.25;
      P.pixelInterpolation = StarAlignment.prototype.Auto;
      P.clampingThreshold = 0.30;
      P.outputDirectory = "";
      P.outputExtension = ".xisf";
      P.outputPrefix = "";
      P.outputPostfix = "_r";
      P.maskPostfix = "_m";
      P.outputSampleFormat = StarAlignment.prototype.SameAsTarget;
      P.onError = StarAlignment.prototype.Continue;
      P.useFileThreads = true;
      P.fileThreadOverload = 1.20;
      P.maxFileReadThreads = 1;
      P.maxFileWriteThreads = 1;      

      // Overwrite defaults
      P.referenceImage = refImage;
      P.referenceIsFile = true;
      P.targets = targets;
      P.overwriteExistingFiles = true;


      P.executeGlobal();

      alignedFiles = new Array;

      for (var i = 0; i < P.outputData.length; ++i) {
            var filePath = P.outputData[i][0];
            if (filePath != null && filePath != "") {
                  alignedFiles[alignedFiles.length] = filePath;
            }
      }

      addProcessingStep("runStarAlignment, " + alignedFiles.length + " files");
      console.writeln("output[0] " + alignedFiles[0]);

      return alignedFiles;
}

function runLocalNormalization(imagetable, refImage)
{
      addProcessingStep("Run local normalization using reference image " + refImage);
      var targets = new Array;

      for (var i = 0; i < imagetable.length; i++) {
            var oneimage = new Array(2);
            oneimage[0] = true;
            oneimage[1] = imagetable[i];
            targets[targets.length] = oneimage;
      }
      var P = new LocalNormalization;
      P.scale = 128;
      P.noScale = false;
      P.rejection = true;
      P.backgroundRejectionLimit = 0.050;
      P.referenceRejectionThreshold = 0.500;
      P.targetRejectionThreshold = 0.500;
      P.hotPixelFilterRadius = 2;
      P.noiseReductionFilterRadius = 0;
      P.referencePathOrViewId = refImage;
      P.referenceIsView = false;
      P.targetItems = targets;
      P.inputHints = "";
      P.outputHints = "";
      P.generateNormalizedImages = LocalNormalization.prototype.GenerateNormalizedImages_ViewExecutionOnly;
      P.generateNormalizationData = true;
      P.showBackgroundModels = false;
      P.showRejectionMaps = false;
      P.plotNormalizationFunctions = LocalNormalization.prototype.PlotNormalizationFunctions_Palette3D;
      P.noGUIMessages = false;
      P.outputDirectory = "";
      P.outputExtension = ".xisf";
      P.outputPrefix = "";
      P.outputPostfix = "_n";
      P.overwriteExistingFiles = true;
      P.onError = LocalNormalization.prototype.OnError_Continue;
      P.useFileThreads = true;
      P.fileThreadOverload = 1.00;
      P.maxFileReadThreads = 0;
      P.maxFileWriteThreads = 0;
      P.graphSize = 800;
      P.graphTextSize = 12;
      P.graphTitleSize = 18;
      P.graphTransparent = false;
      P.graphOutputDirectory = "";

      P.executeGlobal();
}

function runLinearFit(refViewId, targetId)
{
      addProcessingStep("Run linear fit on " + targetId + " using " + refViewId + " as reference");
      linear_fit_done = true;
      var targetWin = ImageWindow.windowById(targetId);
      var P = new LinearFit;
      P.referenceViewId = refViewId;
      P.rejectLow = 0.000000;
      P.rejectHigh = 0.920000;

      targetWin.mainView.beginProcess(UndoFlag_NoSwapFile);
      P.executeOn(targetWin.mainView);
      targetWin.mainView.endProcess();
}

function runDrizzleIntegration(images, name)
{
      var drizzleImages = new Array;
      for (var i = 0; i < images.length; i++) {
            drizzleImages[i] = new Array(3);
            drizzleImages[i][0] = images[i][0];                           // enabled
            drizzleImages[i][1] = images[i][1].replace(".xisf", ".xdrz"); // drizzlePath
            drizzleImages[i][2] = "";                                     // localNormalizationDataPath
      }

      var P = new DrizzleIntegration;
      P.inputData = drizzleImages;
      P.inputHints = "";
      P.inputDirectory = "";
      P.scale = 2.00;
      P.dropShrink = 0.90;
      P.kernelFunction = DrizzleIntegration.prototype.Kernel_Square;
      P.kernelGridSize = 16;
      P.originX = 0.50;
      P.originY = 0.50;
      P.enableCFA = false;
      P.cfaPattern = "";
      P.enableRejection = true;
      P.enableImageWeighting = true;
      P.enableSurfaceSplines = true;
      P.enableLocalNormalization = false;
      P.useROI = false;
      P.roiX0 = 0;
      P.roiY0 = 0;
      P.roiX1 = 0;
      P.roiY1 = 0;
      P.closePreviousImages = false;
      P.noGUIMessages = true;
      P.onError = DrizzleIntegration.prototype.Continue;

      P.executeGlobal();

      windowCloseif(P.weightImageId);

      var new_name = windowRename(P.integrationImageId, "Integration_" + name);
      //addScriptWindow(new_name);
      return new_name;
}

function getRejectionAlgorigthm(numimages)
{
      if (numimages < 8) {
            addProcessingStep("  Using Percentile clip for rejection because number of images is " + numimages);
            return ImageIntegration.prototype.PercentileClip;
      }
      if (use_clipping == 'P') {
            addProcessingStep("  Using Percentile clip for rejection");
            return ImageIntegration.prototype.PercentileClip;
      } else if (use_clipping == 'S') {
            addProcessingStep("  Using Sigma clip for rejection");
            return ImageIntegration.prototype.SigmaClip;
      } else if (use_clipping == 'W') {
            addProcessingStep("  Using Winsorised sigma clip for rejection");
            return ImageIntegration.prototype.WinsorizedSigmaClip;
      } else if (use_clipping == 'A') {
            addProcessingStep("  Using Averaged sigma clip for rejection");
            return ImageIntegration.prototype.AveragedSigmaClip;
      } else if (use_clipping == 'L') {
            addProcessingStep("  Using Linear fit clip for rejection");
            return ImageIntegration.prototype.LinearFit;
      } else if (use_clipping == 'D2') {
            /* In theory these should be good choises but sometime give much more uneven
             * highlights than Sigma.
             */
            if (numimages < 8) {
                  addProcessingStep("  Auto2 using percentile clip for rejection");
                  return ImageIntegration.prototype.PercentileClip;
            } else if (numimages <= 10) {
                  addProcessingStep("  Auto2 using Averaged sigma clip for rejection");
                  return ImageIntegration.prototype.AveragedSigmaClip;
            } else if (numimages < 20) {
                  addProcessingStep("  Auto2 using Winsorised sigma clip for rejection");
                  return ImageIntegration.prototype.WinsorizedSigmaClip;
            } else if (numimages < 25 || ImageIntegration.prototype.Rejection_ESD === undefined) {
                  addProcessingStep("  Auto2 using liner fit clip for rejection");
                  return ImageIntegration.prototype.LinearFit;
            } else {
                  addProcessingStep("  Auto2 using ESD clip for rejection");
                  return ImageIntegration.prototype.Rejection_ESD;
            }
      } else {
            /* use_clipping == 'D1' */
            if (numimages < 8) {
                  addProcessingStep("  Auto1 using percentile clip for rejection");
                  return ImageIntegration.prototype.PercentileClip;
            } else {
                  addProcessingStep("  Auto1 using Sigma clip for rejection");
                  return ImageIntegration.prototype.SigmaClip;
            }
      }
}

function runImageIntegration(images, name)
{
      if (images == null || images.length == 0) {
            return null;
      }
      addProcessingStep("Image " + name + " integration on " + images.length + " files");

      if (images.length < 3) {
            for (var i = 0; images.length < 3; i++) {
                  addProcessingStep("  Image integration needs 3 files, have only " + images.length + ", add one existing file");
                  append_image_for_integrate(images, images[i][1]);
            }
      }
      if (use_local_normalization) {
            return runImageIntegrationNormalized(images, name);
      }

      var P = new ImageIntegration;

      P.inputHints = "fits-keywords normalize raw cfa signed-is-physical";
      P.weightMode = ImageIntegration.prototype.NoiseEvaluation;
      P.weightKeyword = "";
      P.weightScale = ImageIntegration.prototype.WeightScale_BWMV;
      P.adaptiveGridSize = 16;
      P.ignoreNoiseKeywords = false;
      P.rejectionNormalization = ImageIntegration.prototype.Scale;
      P.minMaxLow = 1;
      P.minMaxHigh = 1;
      P.pcClipLow = 0.200;
      P.pcClipHigh = 0.100;
      P.sigmaLow = 4.000;
      P.sigmaHigh = 3.000;
      P.winsorizationCutoff = 5.000;
      P.linearFitLow = 5.000;
      P.linearFitHigh = 4.000;
      P.esdOutliersFraction = 0.30;
      P.esdAlpha = 0.05;
      P.esdLowRelaxation = 1.50;
      P.ccdGain = 1.00;
      P.ccdReadNoise = 10.00;
      P.ccdScaleNoise = 0.00;
      P.clipLow = imageintegration_clipping;             // def: true
      P.clipHigh = imageintegration_clipping;            // def: true
      P.rangeClipLow = imageintegration_clipping;        // def: true
      P.rangeLow = 0.000000;
      P.rangeClipHigh = false;
      P.rangeHigh = 0.980000;
      P.mapRangeRejection = true;
      P.reportRangeRejection = false;
      P.largeScaleClipLow = false;
      P.largeScaleClipLowProtectedLayers = 2;
      P.largeScaleClipLowGrowth = 2;
      P.largeScaleClipHigh = false;
      P.largeScaleClipHighProtectedLayers = 2;
      P.largeScaleClipHighGrowth = 2;
      P.generate64BitResult = false;
      P.generateRejectionMaps = true;
      P.generateIntegratedImage = true;
      P.generateDrizzleData = false;
      P.closePreviousImages = false;
      P.bufferSizeMB = 16;
      P.stackSizeMB = 1024;
      P.autoMemorySize = true;
      P.autoMemoryLimit = 0.75;
      P.useROI = false;
      P.roiX0 = 0;
      P.roiY0 = 0;
      P.roiX1 = 0;
      P.roiY1 = 0;
      P.useCache = true;
      P.evaluateNoise = true;
      P.mrsMinDataFraction = 0.010;
      P.subtractPedestals = false;
      P.truncateOnOutOfRange = false;
      P.noGUIMessages = true;
      P.showImages = true;
      P.useFileThreads = true;
      P.fileThreadOverload = 1.00;
      P.useBufferThreads = true;
      P.maxBufferThreads = 8;

      P.combination = ImageIntegration.prototype.Average;
      if (ssweight_set && !skip_imageintegration_ssweight) {
            // Using weightKeyword seem to give better results
            addProcessingStep("  Using SSWEIGHT for ImageIntegration weightMode");
            P.weightMode = ImageIntegration.prototype.KeywordWeight;
            P.weightKeyword = "SSWEIGHT";
      }
      if (imageintegration_normalization == 0) {
            addProcessingStep("  Using AdditiveWithScaling for ImageIntegration normalization");
            P.normalization = ImageIntegration.prototype.AdditiveWithScaling;
      } else if (imageintegration_normalization == 1) {
            addProcessingStep("  Using AdaptiveNormalization for ImageIntegration normalization");
            P.normalization = ImageIntegration.prototype.AdaptiveNormalization;
      } else {
            addProcessingStep("  Using NoNormalization for ImageIntegration normalization");
            P.normalization = ImageIntegration.prototype.NoNormalization;
      }
      P.rejection = getRejectionAlgorigthm(images.length);
      
      P.evaluateNoise = true;
      
      if (use_drizzle) {
            var drizzleImages = new Array;
            for (var i = 0; i < images.length; i++) {
                  drizzleImages[i] = new Array(3);
                  drizzleImages[i][0] = images[i][0];      // enabled
                  drizzleImages[i][1] = images[i][1];      // path
                  drizzleImages[i][2] = images[i][1].replace(".xisf", ".xdrz"); // drizzlePath
            }
            P.generateDrizzleData = true; /* Generate .xdrz data. */
            P.images = drizzleImages;
      } else {
            P.generateDrizzleData = false;
            P.images = images;
      }

      P.executeGlobal();

      windowCloseif(P.highRejectionMapImageId);
      windowCloseif(P.lowRejectionMapImageId);
      windowCloseif(P.slopeMapImageId);

      if (use_drizzle) {
            windowCloseif(P.integrationImageId);
            return runDrizzleIntegration(images, name);
      } else {
            var new_name = windowRename(P.integrationImageId, "Integration_" + name);
            //addScriptWindow(new_name);
            return new_name
      }
}

function runImageIntegrationNormalized(images, name)
{
      addProcessingStep("  Using local normalized data in integrate");
      var norm_images = new Array;
      for (var i = 0; i < images.length; i++) {
            var oneimage = new Array(4);
            oneimage[0] = true;                                   // enabled
            oneimage[1] = images[i][1];                           // path
            if (use_drizzle) {
                  oneimage[2] = images[i][1].replace(".xisf", ".xdrz"); // drizzlePath
            } else {
                  oneimage[2] = "";                                     // drizzlePath
            }
            oneimage[3] = images[i][1].replace(".xisf", ".xnml");    // localNormalizationDataPath
            norm_images[norm_images.length] = oneimage;
      }
      var P = new ImageIntegration;
      P.images = norm_images;
      P.inputHints = "";
      P.combination = ImageIntegration.prototype.Average;
      if (ssweight_set && !skip_imageintegration_ssweight) {
            P.weightMode = ImageIntegration.prototype.KeywordWeight;
            P.weightKeyword = "SSWEIGHT";
      }
      P.weightScale = ImageIntegration.prototype.WeightScale_IKSS;
      P.ignoreNoiseKeywords = false;
      P.normalization = ImageIntegration.prototype.LocalNormalization;
      P.rejection = getRejectionAlgorigthm(images.length);
      P.rejectionNormalization = ImageIntegration.prototype.Scale;
      P.minMaxLow = 1;
      P.minMaxHigh = 1;
      P.pcClipLow = 0.200;
      P.pcClipHigh = 0.100;
      P.sigmaLow = 4.000;
      P.sigmaHigh = 3.000;
      P.linearFitLow = 5.000;
      P.linearFitHigh = 2.500;
      P.ccdGain = 1.00;
      P.ccdReadNoise = 10.00;
      P.ccdScaleNoise = 0.00;
      P.clipLow = true;
      P.clipHigh = true;
      P.rangeClipLow = true;
      P.rangeLow = 0.000000;
      P.rangeClipHigh = true;       /* default: false */
      P.rangeHigh = 0.980000;
      P.mapRangeRejection = true;
      P.reportRangeRejection = false;
      P.largeScaleClipLow = false;
      P.largeScaleClipLowProtectedLayers = 2;
      P.largeScaleClipLowGrowth = 2;
      P.largeScaleClipHigh = false;
      P.largeScaleClipHighProtectedLayers = 2;
      P.largeScaleClipHighGrowth = 2;
      P.generate64BitResult = false;
      P.generateRejectionMaps = true;
      P.generateIntegratedImage = true;
      if (use_drizzle) {
            P.generateDrizzleData = true;
      } else {
            P.generateDrizzleData = false;
      }
      P.closePreviousImages = false;
      P.bufferSizeMB = 16;
      P.stackSizeMB = 1024;
      P.useROI = false;
      P.roiX0 = 0;
      P.roiY0 = 0;
      P.roiX1 = 0;
      P.roiY1 = 0;
      P.useCache = true;
      P.evaluateNoise = true;
      P.mrsMinDataFraction = 0.010;
      P.noGUIMessages = true;
      P.useFileThreads = true;
      P.fileThreadOverload = 1.00;

      P.executeGlobal();

      windowCloseif(P.highRejectionMapImageId);
      windowCloseif(P.lowRejectionMapImageId);

      if (use_drizzle) {
            windowCloseif(P.integrationImageId);
            return runDrizzleIntegration(images, name);
      } else {
            var new_name = windowRename(P.integrationImageId, "Integration_" + name);
            //addScriptWindow(new_name);
            return new_name;
      }
}

/* Do run ABE so just make copy of the source window as
 * is done by AutomaticBackgroundExtractor.
 */
function noABEcopyWin(win)
{
      var noABE_id = win.mainView.id + "_noABE";
      addProcessingStep("No ABE for " + win.mainView.id);
      addScriptWindow(noABE_id);
      copyWindow(win, noABE_id);
      return noABE_id;
}

function runABE(win)
{
      addProcessingStep("ABE from " + win.mainView.id);
      var ABE_id = win.mainView.id + "_ABE";
      var ABE = new AutomaticBackgroundExtractor;

      console.writeln("runABE, target_id " + ABE_id);

      ABE.correctedImageId = ABE_id;

      ABE.tolerance = 1.000;
      ABE.deviatione = 0.800;
      ABE.unbalance = 1.800;
      ABE.minBoxFraction = 0.050;
      ABE.maxBackground = 1.0000;
      ABE.minBackground = 0.0000;
      ABE.useBrightnessLimits = false;
      ABE.polyDegree = 4;
      ABE.boxSize = 5;
      ABE.boxSeparation = 5;
      ABE.modelImageSampleFormat = AutomaticBackgroundExtractor.prototype.f32;
      ABE.abeDownsample = 2.00;
      ABE.writeSampleBoxes = false;
      ABE.justTrySamples = false;
      ABE.targetCorrection = AutomaticBackgroundExtractor.prototype.Subtract;
      ABE.normalize = false;
      ABE.discardModel = false;
      ABE.replaceTarget = false;
      ABE.correctedImageId = "";
      ABE.correctedImageSampleFormat = AutomaticBackgroundExtractor.prototype.SameAsTarget;
      ABE.verboseCoefficients = false;
      ABE.compareModel = false;
      ABE.compareFactor = 10.00;

      win.mainView.beginProcess(UndoFlag_NoSwapFile);

      ABE.executeOn(win.mainView, false);

      win.mainView.endProcess();

      windowCloseif(ABE_id + "_background");

      addScriptWindow(ABE_id);

      return ABE_id;
}

/*
 * Default STF Parameters
 */

// Shadows clipping point in (normalized) MAD units from the median.
#define DEFAULT_AUTOSTRETCH_SCLIP  -2.80
// Target mean background in the [0,1] range.
#define DEFAULT_AUTOSTRETCH_TBGND   0.25
// Apply the same STF to all nominal channels (true), or treat each channel
// separately (false).
#define DEFAULT_AUTOSTRETCH_CLINK   true

/* ApplyAutoSTF routine is from PixInsight scripts.
 *
 */
function ApplyAutoSTF(view, shadowsClipping, targetBackground, rgbLinked)
{
   console.writeln("  Apply AutoSTF on " + view.id);
   var stf = new ScreenTransferFunction;

   var n = view.image.isColor ? 3 : 1;

   var median = view.computeOrFetchProperty("Median");

   var mad = view.computeOrFetchProperty("MAD");
   mad.mul(1.4826); // coherent with a normal distribution

   if (STF_linking == 1) {
      rgbLinked = true;  
   } else if (STF_linking == 2) {
      rgbLinked = false;  
   } else {
         // auto, use default
   }
   console.writeln("  RgbLinked " + rgbLinked);

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
       * Unlinked RGB channnels: Compute automatic stretch functions for
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

   console.writeln("<end><cbr/><br/><b>", view.fullId, "</b>:");
   for (var c = 0; c < n; ++c)
   {
      console.writeln("channel #", c);
      console.writeln(format("c0 = %.6f", stf.STF[c][0]));
      console.writeln(format("m  = %.6f", stf.STF[c][2]));
      console.writeln(format("c1 = %.6f", stf.STF[c][1]));
   }

   view.beginProcess(UndoFlag_NoSwapFile);

   stf.executeOn(view);

   view.endProcess();

   console.writeln("<end><cbr/><br/>");
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

function runHistogramTransform(ABE_win, stf_to_use, iscolor)
{
      if (!run_HT) {
            addProcessingStep("Do not run histogram transform on " + ABE_win.mainView.id);
            return null;
      }
      addProcessingStep("Run histogram transform on " + ABE_win.mainView.id + " based on autostretch");

      if (stf_to_use == null) {
            /* Apply autostretch on image */
            var rgbLinked = true;
            if (narrowband) {
                  if (linear_fit_done) {
                        rgbLinked = true;
                  } else {
                        rgbLinked = false;
                  }
            }
            ApplyAutoSTF(ABE_win.mainView,
                        DEFAULT_AUTOSTRETCH_SCLIP,
                        DEFAULT_AUTOSTRETCH_TBGND,
                        rgbLinked);
            stf_to_use = ABE_win.mainView.stf;
      }

      /* Run histogram transfer function based on autostretch */
      applySTF(ABE_win.mainView, stf_to_use, iscolor);

      /* Undo autostretch */
      console.writeln("  Undo STF on " + ABE_win.mainView.id);
      var stf = new ScreenTransferFunction;

      ABE_win.mainView.beginProcess(UndoFlag_NoSwapFile);

      console.writeln(" Execute autostretch on " + ABE_win.mainView.id);
      stf.executeOn(ABE_win.mainView);

      ABE_win.mainView.endProcess();

      return stf_to_use;
}

function runMultiscaleLinearTransformReduceNoise(imgView, MaskView)
{
      if (skip_noise_reduction) {
            return;
      }

      if (MaskView == null) {
            addProcessingStep("Noise reduction on " + imgView.mainView.id + " with no mask");
      } else {
            addProcessingStep("Noise reduction on " + imgView.mainView.id + " using mask " + MaskView.mainView.id);
      }
      var P = new MultiscaleLinearTransform;
      // Mild noise reedection
      P.layers = [ // enabled, biasEnabled, bias, noiseReductionEnabled, noiseReductionThreshold, noiseReductionAmount, noiseReductionIterations
      [true, true, 0.000, true, 1.000, 0.50, 2],
      [true, true, 0.000, true, 0.500, 0.50, 2],
      [true, true, 0.000, true, 0.500, 0.50, 1],
      [true, true, 0.000, false, 3.000, 1.00, 1]
      ];
      P.transform = MultiscaleLinearTransform.prototype.StarletTransform;
      P.scaleDelta = 0;
      P.scalingFunctionData = [
         0.25,0.5,0.25,
         0.5,1,0.5,
         0.25,0.5,0.25
      ];
      P.scalingFunctionRowFilter = [
         0.5,
         1,
         0.5
      ];
      P.scalingFunctionColFilter = [
         0.5,
         1,
         0.5
      ];
      P.scalingFunctionNoiseSigma = [
         0.8003,0.2729,0.1198,
         0.0578,0.0287,0.0143,
         0.0072,0.0036,0.0019,
         0.001
      ];
      P.scalingFunctionName = "Linear Interpolation (3)";
      P.linearMask = false;
      P.linearMaskAmpFactor = 100;
      P.linearMaskSmoothness = 1.00;
      P.linearMaskInverted = true;
      P.linearMaskPreview = false;
      P.largeScaleFunction = MultiscaleLinearTransform.prototype.NoFunction;
      P.curveBreakPoint = 0.75;
      P.noiseThresholding = false;
      P.noiseThresholdingAmount = 1.00;
      P.noiseThreshold = 3.00;
      P.softThresholding = true;
      P.useMultiresolutionSupport = false;
      P.deringing = false;
      P.deringingDark = 0.1000;
      P.deringingBright = 0.0000;
      P.outputDeringingMaps = false;
      P.lowRange = 0.0000;
      P.highRange = 0.0000;
      P.previewMode = MultiscaleLinearTransform.prototype.Disabled;
      P.previewLayer = 0;
      P.toLuminance = true;
      P.toChrominance = true;
      P.linear = false;

      imgView.mainView.beginProcess(UndoFlag_NoSwapFile);

      if (MaskView != null) {
            /* Remove noise from dark parts of the image. */
            imgView.setMask(MaskView);
            imgView.maskInverted = true;
      }

      P.executeOn(imgView.mainView, false);

      if (MaskView != null) {
            imgView.removeMask();
      }

      imgView.mainView.endProcess();
}

function runColorReduceNoise(imgView)
{
      if (skip_color_noise_reduction) {
            return;
      }
      addProcessingStep("Color noise reduction on " + imgView.mainView.id);

      var P = new TGVDenoise;
      P.rgbkMode = false;
      P.filterEnabledL = false;
      P.filterEnabledC = true;
      P.strengthL = 5.00000000;
      P.strengthC = 7.00000000;
      P.edgeProtectionL = 0.00200000;
      P.edgeProtectionC = 0.00300000;
      P.smoothnessL = 2.00000000;
      P.smoothnessC = 2.00000000;
      P.maxIterationsL = 100;
      P.maxIterationsC = 100;
      P.convergenceEnabledL = false;
      P.convergenceEnabledC = false;
      P.convergenceLimitL = 0.00400000;
      P.convergenceLimitC = 0.00400000;
      P.supportEnabled = true;
      P.supportViewId = "";
      P.supportPreview = false;
      P.supportRemovedWaveletLayers = 0;
      P.supportShadowsClip = 0.00000;
      P.supportHighlightsClip = 1.00000;
      P.supportMidtonesBalance = 0.50000;

      imgView.mainView.beginProcess(UndoFlag_NoSwapFile);

      /* Remove color noise from the whole image. */
      P.executeOn(imgView.mainView, false);

      imgView.mainView.endProcess();
}

function runBackgroundNeutralization(imgView)
{
      addProcessingStep("Background neutralization on " + imgView.id);
      var P = new BackgroundNeutralization;
      P.backgroundReferenceViewId = "";
      P.backgroundLow = 0.0000000;
      P.backgroundHigh = 0.1000000;
      P.useROI = false;
      P.roiX0 = 0;
      P.roiY0 = 0;
      P.roiX1 = 0;
      P.roiY1 = 0;
      P.mode = BackgroundNeutralization.prototype.RescaleAsNeeded;
      P.targetBackground = 0.0010000;

      imgView.beginProcess(UndoFlag_NoSwapFile);

      P.executeOn(imgView, false);

      imgView.endProcess();
}

function runColorCalibration(imgView)
{
      if (narrowband) {
            return;
      }
      addProcessingStep("Color calibration on " + imgView.id);
      var P = new ColorCalibration;
      P.whiteReferenceViewId = "";
      P.whiteLow = 0.0000000;
      P.whiteHigh = 0.9000000;
      P.whiteUseROI = false;
      P.whiteROIX0 = 0;
      P.whiteROIY0 = 0;
      P.whiteROIX1 = 0;
      P.whiteROIY1 = 0;
      P.structureDetection = true;
      P.structureLayers = 5;
      P.noiseLayers = 1;
      P.manualWhiteBalance = false;
      P.manualRedFactor = 1.0000;
      P.manualGreenFactor = 1.0000;
      P.manualBlueFactor = 1.0000;
      P.backgroundReferenceViewId = "";
      P.backgroundLow = 0.0000000;
      P.backgroundHigh = 0.1000000;
      P.backgroundUseROI = false;
      P.backgroundROIX0 = 0;
      P.backgroundROIY0 = 0;
      P.backgroundROIX1 = 0;
      P.backgroundROIY1 = 0;
      P.outputWhiteReferenceMask = false;
      P.outputBackgroundReferenceMask = false;

      imgView.beginProcess(UndoFlag_NoSwapFile);

      P.executeOn(imgView, false);

      imgView.endProcess();
}

function runColorSaturation(imgView, MaskView)
{
      addProcessingStep("Color saturation on " + imgView.mainView.id + " using mask " + MaskView.mainView.id);
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
      P.HSt = ColorSaturation.prototype.AkimaSubsplines;
      P.hueShift = 0.000;

      imgView.mainView.beginProcess(UndoFlag_NoSwapFile);

      /* Saturate only light parts of the image. */
      imgView.setMask(MaskView);
      imgView.maskInverted = false;
      
      P.executeOn(imgView.mainView, false);

      imgView.removeMask();

      imgView.mainView.endProcess();
}

function runCurvesTransformationSaturation(imgView, MaskView)
{
      addProcessingStep("Curves transformation for saturation on " + imgView.mainView.id + " using mask " + MaskView.mainView.id);

      var P = new CurvesTransformation;
      P.R = [ // x, y
            [0.00000, 0.00000],
            [1.00000, 1.00000]
      ];
      P.Rt = CurvesTransformation.prototype.AkimaSubsplines;
      P.G = [ // x, y
            [0.00000, 0.00000],
            [1.00000, 1.00000]
      ];
      P.Gt = CurvesTransformation.prototype.AkimaSubsplines;
      P.B = [ // x, y
            [0.00000, 0.00000],
            [1.00000, 1.00000]
      ];
      P.Bt = CurvesTransformation.prototype.AkimaSubsplines;
      P.K = [ // x, y
            [0.00000, 0.00000],
            [1.00000, 1.00000]
      ];
      P.Kt = CurvesTransformation.prototype.AkimaSubsplines;
      P.A = [ // x, y
            [0.00000, 0.00000],
            [1.00000, 1.00000]
      ];
      P.At = CurvesTransformation.prototype.AkimaSubsplines;
      P.L = [ // x, y
            [0.00000, 0.00000],
            [1.00000, 1.00000]
      ];
      P.Lt = CurvesTransformation.prototype.AkimaSubsplines;
      P.a = [ // x, y
            [0.00000, 0.00000],
            [1.00000, 1.00000]
      ];
      P.at = CurvesTransformation.prototype.AkimaSubsplines;
      P.b = [ // x, y
            [0.00000, 0.00000],
            [1.00000, 1.00000]
      ];
      P.bt = CurvesTransformation.prototype.AkimaSubsplines;
      P.c = [ // x, y
            [0.00000, 0.00000],
            [1.00000, 1.00000]
      ];
      P.ct = CurvesTransformation.prototype.AkimaSubsplines;
      P.H = [ // x, y
            [0.00000, 0.00000],
            [1.00000, 1.00000]
      ];
      P.Ht = CurvesTransformation.prototype.AkimaSubsplines;
      P.S = [ // x, y
            [0.00000, 0.00000],
            [0.68734, 0.83204],
            [1.00000, 1.00000]
      ];
      P.St = CurvesTransformation.prototype.AkimaSubsplines;

      imgView.mainView.beginProcess(UndoFlag_NoSwapFile);

      /* Saturate only light parts of the image. */
      imgView.setMask(MaskView);
      imgView.maskInverted = false;
      
      P.executeOn(imgView.mainView, false);

      imgView.removeMask();

      imgView.mainView.endProcess();
}

function increaseSaturation(imgView, MaskView)
{
      //runColorSaturation(imgView, MaskView);
      runCurvesTransformationSaturation(imgView, MaskView);
}

function runLRGBCombination(RGB_id, L_id)
{
      var targetWin = copyWindow(ImageWindow.windowById(RGB_id), RGB_id.replace("RGB", "LRGB"));
      var RGBimgView = targetWin.mainView;
      addProcessingStep("LRGB combination of " + RGB_id + "and luminance image " + L_id + " into " + RGBimgView.id);
      var P = new LRGBCombination;
      P.channels = [ // enabled, id, k
            [false, "", 1.00000],
            [false, "", 1.00000],
            [false, "", 1.00000],
            [true, L_id, 1.00000]
      ];
      P.mL = 0.500;
      P.mc = 0.500;
      P.clipHighlights = true;
      P.noiseReduction = true;
      P.layersRemoved = 4;
      P.layersProtected = 2;

      RGBimgView.beginProcess(UndoFlag_NoSwapFile);

      P.executeOn(RGBimgView, false);

      RGBimgView.endProcess();

      return RGBimgView.id;
}

function runSCNR(RGBimgView, fixing_stars)
{
      if (!fixing_stars) {
            addProcessingStep("SCNR on " + RGBimgView.id);
      }
      var P = new SCNR;
      if (narrowband && leave_some_green && !fixing_stars) {
            P.amount = 0.50;
            addProcessingStep("Run SCNR using amount " + P.amount + " to leave some green color");
      } else {
            P.amount = 1.00;
      }
      P.protectionMethod = SCNR.prototype.AverageNeutral;
      P.colorToRemove = SCNR.prototype.Green;
      P.preserveLightness = true;

      RGBimgView.beginProcess(UndoFlag_NoSwapFile);

      P.executeOn(RGBimgView, false);

      RGBimgView.endProcess();
}

// Run hue shift on narrowband image to enhance orange.
function narrowbandHueShift(imgView)
{
      addProcessingStep("Hue shift on " + imgView.id);
      
      var P = new CurvesTransformation;
      P.R = [ // x, y
         [0.00000, 0.00000],
         [1.00000, 1.00000]
      ];
      P.Rt = CurvesTransformation.prototype.AkimaSubsplines;
      P.G = [ // x, y
         [0.00000, 0.00000],
         [1.00000, 1.00000]
      ];
      P.Gt = CurvesTransformation.prototype.AkimaSubsplines;
      P.B = [ // x, y
         [0.00000, 0.00000],
         [1.00000, 1.00000]
      ];
      P.Bt = CurvesTransformation.prototype.AkimaSubsplines;
      P.K = [ // x, y
         [0.00000, 0.00000],
         [1.00000, 1.00000]
      ];
      P.Kt = CurvesTransformation.prototype.AkimaSubsplines;
      P.A = [ // x, y
         [0.00000, 0.00000],
         [1.00000, 1.00000]
      ];
      P.At = CurvesTransformation.prototype.AkimaSubsplines;
      P.L = [ // x, y
         [0.00000, 0.00000],
         [1.00000, 1.00000]
      ];
      P.Lt = CurvesTransformation.prototype.AkimaSubsplines;
      P.a = [ // x, y
         [0.00000, 0.00000],
         [1.00000, 1.00000]
      ];
      P.at = CurvesTransformation.prototype.AkimaSubsplines;
      P.b = [ // x, y
         [0.00000, 0.00000],
         [1.00000, 1.00000]
      ];
      P.bt = CurvesTransformation.prototype.AkimaSubsplines;
      P.c = [ // x, y
         [0.00000, 0.00000],
         [1.00000, 1.00000]
      ];
      P.ct = CurvesTransformation.prototype.AkimaSubsplines;
      P.H = [ // x, y
         [0.00000, 0.00000],
         [0.30361, 0.18576],
         [0.47454, 0.47348],
         [1.00000, 1.00000]
      ];
      P.Ht = CurvesTransformation.prototype.AkimaSubsplines;
      P.S = [ // x, y
         [0.00000, 0.00000],
         [1.00000, 1.00000]
      ];
      P.St = CurvesTransformation.prototype.AkimaSubsplines;
      
      imgView.beginProcess(UndoFlag_NoSwapFile);

      P.executeOn(imgView, false);

      imgView.endProcess();
}

function runMultiscaleLinearTransformSharpen(imgView, MaskView)
{
      addProcessingStep("Sharpening on " + imgView.mainView.id + " using mask " + MaskView.mainView.id);

      var P = new MultiscaleLinearTransform;
      P.layers = [ // enabled, biasEnabled, bias, noiseReductionEnabled, noiseReductionThreshold, noiseReductionAmount, noiseReductionIterations
         [true, true, 0.000, false, 3.000, 0.50, 3],
         [true, true, 0.025, false, 2.000, 0.50, 2],
         [true, true, 0.025, false, 1.000, 0.50, 2],
         [true, true, 0.012, false, 0.500, 0.50, 1],
         [true, true, 0.000, false, 3.000, 1.00, 1]
      ];
      P.transform = MultiscaleLinearTransform.prototype.StarletTransform;
      P.scaleDelta = 0;
      P.scalingFunctionData = [
         0.25,0.5,0.25,
         0.5,1,0.5,
         0.25,0.5,0.25
      ];
      P.scalingFunctionRowFilter = [
         0.5,
         1,
         0.5
      ];
      P.scalingFunctionColFilter = [
         0.5,
         1,
         0.5
      ];
      P.scalingFunctionNoiseSigma = [
         0.8003,0.2729,0.1198,
         0.0578,0.0287,0.0143,
         0.0072,0.0036,0.0019,
         0.001
      ];
      P.scalingFunctionName = "Linear Interpolation (3)";
      P.linearMask = false;
      P.linearMaskAmpFactor = 100;
      P.linearMaskSmoothness = 1.00;
      P.linearMaskInverted = true;
      P.linearMaskPreview = false;
      P.largeScaleFunction = MultiscaleLinearTransform.prototype.NoFunction;
      P.curveBreakPoint = 0.75;
      P.noiseThresholding = false;
      P.noiseThresholdingAmount = 1.00;
      P.noiseThreshold = 3.00;
      P.softThresholding = true;
      P.useMultiresolutionSupport = false;
      P.deringing = true;
      P.deringingDark = 0.0100;
      P.deringingBright = 0.0000;
      P.outputDeringingMaps = false;
      P.lowRange = 0.0000;
      P.highRange = 0.0000;
      P.previewMode = MultiscaleLinearTransform.prototype.Disabled;
      P.previewLayer = 0;
      P.toLuminance = true;
      P.toChrominance = false;
      P.linear = false;
      
      imgView.mainView.beginProcess(UndoFlag_NoSwapFile);

      /* Sharpen only light parts of the image. */
      imgView.setMask(MaskView);
      imgView.maskInverted = false;

      P.executeOn(imgView.mainView, false);

      imgView.removeMask();

      imgView.mainView.endProcess();
}

function getUniqueFilenamePart()
{
      if (unique_file_names) {
            return format( "_%04d%02d%02d_%02d%02d%02d",
                        processingDate.getFullYear(), processingDate.getMonth() + 1, processingDate.getDate(),
                        processingDate.getHours(), processingDate.getMinutes(), processingDate.getSeconds());
      } else {
            return "";
      }
}

function writeProcessingSteps(alignedFiles, autocontinue)
{
      var basename;

      if (autocontinue) {
            basename = "AutoContinue";
      } else {
            basename = "AutoIntegrate";
      }
      logfname = basename + getUniqueFilenamePart() + ".log";

      if (dialogFilePath == null) {
            var gdd = new GetDirectoryDialog;
            gdd.caption = "Select Save Directory for " + basename + ".log";
            if (!gdd.execute()) {
                  console.writeln("No path for " + logfname + ', file not written');
                  return;
            }
            dialogFilePath = gdd.directory + '/';
      }
      console.writeln("Write processing steps to " + dialogFilePath + logfname);

      var file = new File();
      file.createForWriting(dialogFilePath + logfname);

      file.write(console.endLog());
      file.outTextLn("======================================");
      if (dialogFileNames != null) {
            file.outTextLn("Dialog files:");
            for (var i = 0; i < dialogFileNames.length; i++) {
                  file.outTextLn(dialogFileNames[i]);
            }
      }
      if (alignedFiles != null) {
            file.outTextLn("Aligned files:");
            for (var i = 0; i < alignedFiles.length; i++) {
                  file.outTextLn(alignedFiles[i]);
            }
      }
      file.outTextLn(processing_steps);
      file.close();
}

/* Create master L, R, G and B images, or a Color image
 *
 * check for preprocessed images
 * get files from dialog
 * by default run cosmetic correction
 * by default run subframe selector
 * run star alignment
 * optionally run local normalization 
 * find files for each L, R, G and B channels
 * run image integration to create L, R, G and B images, or color image
 */
function CreateChannelImages(auto_continue)
{
      addProcessingStep("CreateChannelImages");

      final_win = null;

      /* Check if we have manually done histogram transformation. */
      L_HT_win = findWindow("L_HT");
      RGB_HT_win = findWindow("RGB_HT");

      /* Check if we have manual background extracted files. */
      L_BE_win = findWindow("Integration_L_BE");
      R_BE_win = findWindow("Integration_R_BE");
      G_BE_win = findWindow("Integration_G_BE");
      B_BE_win = findWindow("Integration_B_BE");
      H_BE_win = findWindow("Integration_H_BE");
      S_BE_win = findWindow("Integration_S_BE");
      O_BE_win = findWindow("Integration_O_BE");
      RGB_BE_win = findWindow("Integration_RGB_BE");

      L_id = findWindowId("Integration_L");
      R_id = findWindowId("Integration_R");
      G_id = findWindowId("Integration_G");
      B_id = findWindowId("Integration_B");
      H_id = findWindowId("Integration_H");
      S_id = findWindowId("Integration_S");
      O_id = findWindowId("Integration_O");
      color_id = findWindowId("Integration_RGB");

      if (is_extra_option() || is_narrowband_option()) {
            for (var i = 0; i < final_windows.length; i++) {
                  final_win = findWindow(final_windows[i]);
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

      /* Check if we have manually created mask. */
      range_mask_win = null;

      if (final_win != null) {
            addProcessingStep("Final image " + final_win.mainView.id);
            preprocessed_images = start_images.FINAL;
      } else if (winIsValid(L_HT_win) && winIsValid(RGB_HT_win)) {        /* L,RGB HistogramTransformation */
            addProcessingStep("L,RGB HistogramTransformation");
            preprocessed_images = start_images.L_RGB_HT;
      } else if (winIsValid(RGB_HT_win)) {                         /* RGB (color) HistogramTransformation */
            addProcessingStep("RGB (color) HistogramTransformation " + RGB_HT_win.mainView.id);
            preprocessed_images = start_images.RGB_HT;
      } else if (winIsValid(L_BE_win) && winIsValid(RGB_BE_win)) { /* L,RGB background extracted */
            addProcessingStep("L,RGB background extracted");
            preprocessed_images = start_images.L_RGB_BE;
      } else if (winIsValid(RGB_BE_win)) {                         /* RGB (color) background extracted */
            addProcessingStep("RGB (color) background extracted " + RGB_BE_win.mainView.id);
            preprocessed_images = start_images.RGB_BE;
      } else if ((winIsValid(R_BE_win) && winIsValid(G_BE_win) && winIsValid(B_BE_win)) ||
                 (winIsValid(H_BE_win) && winIsValid(O_BE_win))) {  /* L,R,G,B background extracted */
            addProcessingStep("L,R,G,B background extracted");
            preprocessed_images = start_images.L_R_G_B_BE;
            narrowband = winIsValid(H_BE_win) || winIsValid(O_BE_win);
      } else if (color_id != null) {                              /* RGB (color) integrated image */
            addProcessingStep("RGB (color) integrated image " + color_id);
            preprocessed_images = start_images.RGB_COLOR;
      } else if ((R_id != null && G_id != null && B_id != null) ||
                 (H_id != null && O_id != null)) {                /* L,R,G,B integrated images */
            addProcessingStep("L,R,G,B integrated images");
            narrowband = H_id != null || S_id != null || O_id != null;
            preprocessed_images = start_images.L_R_G_B;
      } else {
            addProcessingStep("No preprocessed images found");
            preprocessed_images = start_images.NONE;
      }

      if (auto_continue) {
          if (preprocessed_images == start_images.NONE) {
            addProcessingStep("No preprocessed images found, processing not started!");
            return false;
          }
      } else {
            if (preprocessed_images != start_images.NONE) {
                  addProcessingStep("There are already preprocessed images, processing not started!");
                  addProcessingStep("Close or rename old images before continuing.");
                  return false;
            }  
      }

      if (preprocessed_images == start_images.FINAL) {
            return true;
      } else if (preprocessed_images != start_images.NONE) {
            addProcessingStep("Using preprocessed images " + preprocessed_images);
            console.writeln("L_BE_win="+L_BE_win);
            console.writeln("RGB_BE_win="+RGB_BE_win);
            console.writeln("L_HT_win="+L_HT_win);
            console.writeln("RGB_HT_win="+RGB_HT_win);
            if (preprocessed_images == start_images.RGB_BE ||
                preprocessed_images == start_images.RGB_HT ||
                preprocessed_images == start_images.RGB_COLOR) 
            {
                  if (narrowband) {
                        addProcessingStep("Processing as narrowband images");
                  } else {
                        /* No L files, assume color. */
                        addProcessingStep("Processing as color images");
                        is_color_files = true;
                  }
            }
            if (preprocessed_images == start_images.RGB_COLOR) {
                  RGB_win = ImageWindow.windowById(color_id);
                  RGB_win_id = color_id;
            }
            /* Check if we have manually created mask. */
            mask_win_id = "range_mask";
            range_mask_win = findWindow(mask_win_id);
      } else {
            /* Open dialog files and run SubframeSelector on them
             * to assigns SSWEIGHT.
             */
            var fileNames;
            if (dialogFileNames == null) {
                  dialogFileNames = openFitFiles();
                  addProcessingStep("Get files from dialog");
            }
            if (dialogFileNames == null) {
                  console.writeln("No files to process");
                  return false;
            }
            fileNames = dialogFileNames;
            var filename_postfix = '';

            /* Get path to current directory. */
            var fname = dialogFileNames[0];
            var filestart = fname.lastIndexOf('\\');
            if (filestart == -1) {
                  filestart = fname.lastIndexOf('/');
            }
            dialogFilePath = fname.substring(0, filestart+1)

            if (!skip_cosmeticcorrection) {
                  /* Run CosmeticCorrection for each file.
                   * Output is *_cc.xisf files.
                   */
                 fileNames = runCosmeticCorrection(fileNames);
                 filename_postfix = filename_postfix + '_cc';
            }

            if (!skip_subframeselector) {
                  /* Run SubframeSelector that assigns SSWEIGHT for each file.
                   * Output is *_a.xisf files.
                   */
                  fileNames = runSubframeSelector(fileNames);
                  filename_postfix = filename_postfix + '_a';
            }

            /* Find file with best SSWEIGHT to be used
            * as a reference image in StarAlign.
            * Also possible file list filtering is done.
            */
            var retarr =  findBestSSWEIGHT(fileNames);
            best_image = retarr[0];
            fileNames = retarr[1];

            /* StarAlign
            */
            alignedFiles = runStarAlignment(fileNames, best_image);
            filename_postfix = filename_postfix + '_r';

            if (use_local_normalization) {
                  /* LocalNormalization
                   */
                  runLocalNormalization(alignedFiles, best_image);
                  filename_postfix = filename_postfix + '_n';
            }

            /* Find files for each L, R, G, B, H, O and S channels, or color files.
             */
            findLRGBchannels(alignedFiles, filename_postfix);

            /* ImageIntegration
            */
            if (C_images.images.length == 0) {
                  /* We have LRGB files. */
                  if (!monochrome_image) {
                        if (is_luminance_images) {
                              addProcessingStep("Processing as LRGB files");
                        } else {
                              addProcessingStep("Processing as RGB files");
                        }
                  } else {
                        addProcessingStep("Processing as monochrome files");
                  }
                  is_color_files = false;

                  if (is_luminance_images) {
                        L_id = runImageIntegration(L_images.images, 'L');
                        luminance_id = L_id;
                  }

                  if (!monochrome_image) {
                        R_id = runImageIntegration(R_images.images, 'R');
                        G_id = runImageIntegration(G_images.images, 'G');
                        B_id = runImageIntegration(B_images.images, 'B');
                        H_id = runImageIntegration(H_images.images, 'H');
                        S_id = runImageIntegration(S_images.images, 'S');
                        O_id = runImageIntegration(O_images.images, 'O');

                        windowShowif(R_id);
                        windowShowif(G_id);
                        windowShowif(B_id);
                        windowShowif(H_id);
                        windowShowif(S_id);
                        windowShowif(O_id);
                  }

            } else {
                  /* We have color files. */
                  addProcessingStep("Processing as color files");
                  is_color_files = true;
                  var color_id = runImageIntegration(C_images.images, 'RGB');
                  RGB_win = ImageWindow.windowById(color_id);
                  RGB_win.show();
                  RGB_win_id = color_id;
            }
      }
      return true;
}

/* Create a mask to be used for LRGB processing. Used for example
 * for noise reduction and sharpening. We use luminance image as
 * mask.
 */
function LRGBCreateMask()
{
      addProcessingStep("LRGBCreateMask");

      if (winIsValid(range_mask_win)) {
            /* We already have a mask. */
            addProcessingStep("Use existing mask " + range_mask_win.mainView.id);
            mask_win = range_mask_win;
      } else {
            var L_win;
            if (preprocessed_images == start_images.L_RGB_HT) {
                  /* We have run HistogramTransformation. */
                  addProcessingStep("Using image " + L_HT_win.mainView.id + " for a mask");
                  L_win = copyWindow(L_HT_win, "L_win_mask");
            } else {
                  if (preprocessed_images == start_images.L_RGB_BE ||
                      preprocessed_images == start_images.L_R_G_B_BE) 
                  {
                        /* We have background extracted from L. */
                        L_win = ImageWindow.windowById(L_BE_win.mainView.id);
                        addProcessingStep("Using image " + L_BE_win.mainView.id + " for a mask");
                  } else {
                        L_win = ImageWindow.windowById(luminance_id);
                        addProcessingStep("Using image " + luminance_id + " for a mask");
                  }
                  L_win = copyWindow(L_win, "L_win_mask");

                  /* Run HistogramTransform based on autostretch because mask should be non-linear. */
                  runHistogramTransform(L_win, null, false);
            }
            /* Create mask.
             */
            mask_win_id = "AutoMask";
            mask_win = newMaskWindow(L_win, mask_win_id);
            windowCloseif("L_win_mask")
      }
}

/* Create mask for color processing. Mask is needed also in non-linear
 * so we do a separate runHistogramTransform here.
 */
function ColorCreateMask(color_id, RBGstretched)
{
      addProcessingStep("ColorCreateMask");

      if (winIsValid(range_mask_win)) {
            /* We already have a mask. */
            addProcessingStep("Use existing mask " + range_mask_win.mainView.id);
            mask_win = range_mask_win;
      } else {
            var color_win;
            color_win = ImageWindow.windowById(color_id);
            addProcessingStep("Using image " + color_id + " for a mask");
            color_win = copyWindow(color_win, "color_win_mask");

            if (!RBGstretched) {
                  /* Run HistogramTransform based on autostretch because mask should be non-linear. */
                  runHistogramTransform(color_win, null, true);
            }

            /* Create mask.
             */
            mask_win_id = "AutoMask";
            mask_win = newMaskWindow(color_win, mask_win_id);
            windowCloseif("color_win_mask")
      }
}

/* Process L image
 *
 * optionally run ABE on L image
 * by default run noise reduction on L image using a mask
 * run histogram transformation on L to make in non-linear
 * by default run noise reduction on L image using a mask
 */
function ProcessLimage()
{
      addProcessingStep("ProcessLimage");

      /* LRGB files */
      console.writeln("BE L");
      if (preprocessed_images == start_images.L_RGB_HT) {
            /* We have run HistogramTransformation. */
            addProcessingStep("Start from image " + L_HT_win.mainView.id);
            L_ABE_HT_win = L_HT_win;
            L_ABE_HT_id = L_HT_win.mainView.id;
      } else {
            if (preprocessed_images == start_images.L_RGB_BE ||
                preprocessed_images == start_images.L_R_G_B_BE) 
            {
                  /* We have background extracted from L. */
                  L_ABE_id = L_BE_win.mainView.id;
                  addProcessingStep("Start from image " + L_ABE_id);
            } else {
                  var L_win = ImageWindow.windowById(luminance_id);

                  /* Optionally run ABE on L
                  */
                  if (use_ABE_on_L_RGB) {
                        L_ABE_id = runABE(L_win);
                  } else {
                        L_ABE_id = noABEcopyWin(L_win);
                  }
            }

            /* Noise reduction for L. */
            runMultiscaleLinearTransformReduceNoise(ImageWindow.windowById(L_ABE_id), mask_win);

            /* On L image run HistogramTransform based on autostretch
            */
            L_ABE_HT_id = L_ABE_id + "_HT";
            L_stf = runHistogramTransform(
                        copyWindow(ImageWindow.windowById(L_ABE_id), L_ABE_HT_id), 
                        null,
                        false);
            if (!same_stf_for_all_images) {
                  L_stf = null;
            }

            L_ABE_HT_win = ImageWindow.windowById(L_ABE_HT_id);
            ImageWindow.windowById(L_ABE_HT_id);      
      }

      /* Noise reduction for L. */
      runMultiscaleLinearTransformReduceNoise(L_ABE_HT_win, mask_win);
}

/* Run linear fit in L, R, G and B images based on options set by user.
 */
function LinearFitLRGBchannels()
{
      addProcessingStep("LinearFitLRGBchannels");

      if (luminance_id == null && use_linear_fit == 'L') {
            // no luminance
            if (narrowband) {
                  addProcessingStep("No Luminance, no linear fit with narrowband");
                  use_linear_fit = 'no';
            } else {
                  addProcessingStep("No Luminance, linear fit using R with RGB");
                  use_linear_fit = 'R';
            }
      }

      /* Check for LinearFit
       */
      if (use_linear_fit == 'R') {
            /* Use R.
             */
            addProcessingStep("Linear fit using R");
            if (luminance_id != null) {
                  runLinearFit(red_id, luminance_id);
            }
            runLinearFit(red_id, green_id);
            runLinearFit(red_id, blue_id);
      } else if (use_linear_fit == 'G') {
            /* Use G.
              */
            addProcessingStep("Linear fit using G");
            if (luminance_id != null) {
                  runLinearFit(green_id, luminance_id);
            }
            runLinearFit(green_id, red_id);
            runLinearFit(green_id, blue_id);
      } else if (use_linear_fit == 'B') {
            /* Use B.
              */
            addProcessingStep("Linear fit using B");
            if (luminance_id != null) {
                  runLinearFit(blue_id, luminance_id);
            }
            runLinearFit(blue_id, red_id);
            runLinearFit(blue_id, green_id);
      } else if (use_linear_fit == 'L' && luminance_id != null) {
            /* Use L.
             */
            addProcessingStep("Linear fit using L");
            runLinearFit(luminance_id, red_id);
            runLinearFit(luminance_id, green_id);
            runLinearFit(luminance_id, blue_id);
      } else {
            addProcessingStep("No linear fit");
      }
}

/* Combine R, G and B images into one RGB image.
 *
 * optionally reduce noise on each separate R, G and B images using a mask
 * run channel combination to create RGB image
 */
function CombineRGBimage()
{
      addProcessingStep("CombineRGBimage");

      if (use_noise_reduction_on_all_channels) {
            runMultiscaleLinearTransformReduceNoise(ImageWindow.windowById(red_id), mask_win);
            runMultiscaleLinearTransformReduceNoise(ImageWindow.windowById(green_id), mask_win);
            runMultiscaleLinearTransformReduceNoise(ImageWindow.windowById(blue_id), mask_win);
      }

      /* ChannelCombination
       */
      console.writeln("ChannelCombination");
      var model_win;
      var cc = new ChannelCombination;
      cc.colorSpace = ChannelCombination.prototype.RGB;
      addProcessingStep("Channel combination using images " + red_id + "," + green_id + "," + blue_id);
      cc.channels = [ // enabled, id
            [true, red_id],
            [true, green_id],
            [true, blue_id]
      ];
      model_win = ImageWindow.windowById(red_id);

      RGB_win = new ImageWindow(
                        model_win.mainView.image.width,     // int width
                        model_win.mainView.image.height,    // int height
                        3,                                  // int numberOfChannels=1
                        32,                                 // int bitsPerSample=32
                        true,                               // bool floatSample=true
                        true,                               // bool color=false
                        "Integration_RGB");                 // const IsoString &id=IsoString()

      RGB_win.mainView.beginProcess(UndoFlag_NoSwapFile);
      cc.executeOn(RGB_win.mainView);
      RGB_win.mainView.endProcess();
      
      RGB_win.show();
      addScriptWindow(RGB_win.mainView.id);
      RGB_win_id = RGB_win.mainView.id;
}

/* Process RGB image
 *
 * optionally run background neutralization on RGB image
 * by default run color calibration on RGB image
 * optionally run ABE on RBG image
 * by default run noise reduction on RGB image using a mask
 * run histogram transformation on RGB image to make in non-linear
 * optionally increase saturation
 */
function ProcessRGBimage(RBGstretched)
{
      addProcessingStep("ProcessRGBimage, RBGstretched is " + RBGstretched);

      var RGB_ABE_HT_id;

      if (preprocessed_images == start_images.L_RGB_HT ||
            preprocessed_images == start_images.RGB_HT) 
      {
            /* We already have run HistogramTransformation. */
            RGB_ABE_HT_id = RGB_HT_win.mainView.id;
            addProcessingStep("Start from image " + RGB_ABE_HT_id);
            if (preprocessed_images == start_images.RGB_HT) {
                  ColorCreateMask(RGB_ABE_HT_id, true);
            }
      } else {
            if (preprocessed_images == start_images.L_RGB_BE ||
                preprocessed_images == start_images.RGB_BE) 
            {
                  /* We already have background extracted. */
                  RGB_ABE_id = RGB_BE_win.mainView.id;
                  addProcessingStep("Start from image " + RGB_ABE_id);
            } else {
                  if (color_calibration_before_ABE) {
                        if (use_background_neutralization) {
                              runBackgroundNeutralization(RGB_win.mainView);
                        }
                        /* Color calibration on RGB
                        */
                        runColorCalibration(RGB_win.mainView);
                  }
                  if (use_ABE_on_L_RGB) {
                        console.writeln("ABE RGB");
                        RGB_ABE_id = runABE(RGB_win);
                  } else {
                        console.writeln("No ABE for RGB");
                        RGB_ABE_id = noABEcopyWin(RGB_win);
                  }
            }

            if (!color_calibration_before_ABE) {
                  if (use_background_neutralization) {
                        runBackgroundNeutralization(ImageWindow.windowById(RGB_ABE_id).mainView);
                  }
                  /* Color calibration on RGB
                  */
                  runColorCalibration(ImageWindow.windowById(RGB_ABE_id).mainView);
            }
            if (is_color_files || !is_luminance_images) {
                  /* Color or narrowband or RGB. */
                  ColorCreateMask(RGB_ABE_id, RBGstretched);
            }
            if (narrowband && linear_increase_saturation > 0) {
                  /* Default 1 means no increase with narrowband. */
                  linear_increase_saturation--;
            }
            if (linear_increase_saturation > 0 && !RBGstretched) {
                  /* Add saturation linear RGB
                  */
                  console.writeln("Add saturation to linear RGB, " + linear_increase_saturation + " steps");
                  for (var i = 0; i < linear_increase_saturation; i++) {
                        increaseSaturation(ImageWindow.windowById(RGB_ABE_id), mask_win);
                  }
            }
      
            if (!is_color_files) {
                  /* Optional noise reduction for RGB
                   */
                  runMultiscaleLinearTransformReduceNoise(
                        ImageWindow.windowById(RGB_ABE_id),
                        mask_win);
            }
            if (!RBGstretched) {
                  /* On RGB image run HistogramTransform based on autostretch
                  */
                  RGB_ABE_HT_id = RGB_ABE_id + "_HT";
                  runHistogramTransform(
                        copyWindow(
                              ImageWindow.windowById(RGB_ABE_id), 
                              RGB_ABE_HT_id), 
                        L_stf,
                        true);
            } else {
                  RGB_ABE_HT_id = RGB_ABE_id;
            }
      }

      if (is_color_files) {
            /* Noise reduction for color RGB
             */
            runMultiscaleLinearTransformReduceNoise(
                  ImageWindow.windowById(RGB_ABE_HT_id),
                  mask_win);
            runColorReduceNoise(ImageWindow.windowById(RGB_ABE_HT_id));
      }

      if (narrowband && non_linear_increase_saturation > 0) {
            /* Default 1 means no increase with narrowband. */
            non_linear_increase_saturation--;
      }
      if (non_linear_increase_saturation > 0) {
            /* Add saturation on RGB
            */
            for (var i = 0; i < non_linear_increase_saturation; i++) {
                  increaseSaturation(ImageWindow.windowById(RGB_ABE_HT_id), mask_win);
            }
      }
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
      if (star_fix_mask_win == null) {
            star_fix_mask_win = findWindow("star_fix_mask");
      }
      if (star_fix_mask_win == null) {
            star_fix_mask_win = findWindow("AutoStarFixMask");
      }
      if (star_fix_mask_win != null) {
            // Use already created start mask
            console.writeln("Use existing star mask " + star_fix_mask_win.mainView.id);
            star_fix_mask_win_id = star_fix_mask_win.mainView.id;
            return;
      }

      var P = new StarMask;
      P.shadowsClipping = 0.00000;
      P.midtonesBalance = 0.50000;
      P.highlightsClipping = 1.00000;
      P.waveletLayers = 8;
      P.structureContours = false;
      P.noiseThreshold = 0.10000;
      P.aggregateStructures = false;
      P.binarizeStructures = false;
      P.largeScaleGrowth = 2;
      P.smallScaleGrowth = 1;
      P.growthCompensation = 2;
      P.smoothness = 8;
      P.invert = false;
      P.truncation = 1.00000;
      P.limit = 1.00000;
      P.mode = StarMask.prototype.StarMask;

      imgView.beginProcess(UndoFlag_NoSwapFile);
      P.executeOn(imgView, false);
      imgView.endProcess();

      star_fix_mask_win = ImageWindow.activeWindow;

      windowRenameKeepif(star_fix_mask_win.mainView.id, "AutoStarFixMask", true);
      star_fix_mask_win_id = star_fix_mask_win.mainView.id;

      addProcessingStep("Created star fix mask " + star_fix_mask_win.mainView.id);
}

/* Do a rough fix on magen stars by inverting the image, applying
 * SCNR to remove the now green cast on stars and then inverting back.
 * If we are not removing all green case we use mask ro protect
 * other areas than stars.
 */
function fixNarrowbandStarColor(targetView)
{
      var use_mask;

      if (skip_star_fix_mask) {
            use_mask = false;
      } else if (!run_narrowband_SCNR || leave_some_green) {
            // If we do not remove all green we use mask protect
            // other than stars.
            use_mask = true;
      } else {
            // We want all green removed, do not use mask on stars either.
            use_mask = false;
      }

      addProcessingStep("Fix narrowband star color");

      if (use_mask) {
            createStarFixMask(targetView.mainView);
      }

      invertImage(targetView.mainView);

      if (use_mask) {
            /* Use mask to change only star colors. */
            addProcessingStep("Using mask " + star_fix_mask_win.mainView.id + " when fixing star colors");
            targetView.setMask(star_fix_mask_win);
            targetView.maskInverted = false;
      }      

      runSCNR(targetView.mainView, true);

      if (use_mask) {
            targetView.removeMask();
      }

      invertImage(targetView.mainView);
}

function extraDarkerBackground(imgView, MaskView)
{
      addProcessingStep("Darker background on " + imgView.mainView.id + " using mask " + MaskView.mainView.id);

      var P = new CurvesTransformation;
      P.R = [ // x, y
         [0.00000, 0.00000],
         [1.00000, 1.00000]
      ];
      P.Rt = CurvesTransformation.prototype.AkimaSubsplines;
      P.G = [ // x, y
         [0.00000, 0.00000],
         [1.00000, 1.00000]
      ];
      P.Gt = CurvesTransformation.prototype.AkimaSubsplines;
      P.B = [ // x, y
         [0.00000, 0.00000],
         [1.00000, 1.00000]
      ];
      P.Bt = CurvesTransformation.prototype.AkimaSubsplines;
      P.K = [ // x, y
         [0.00000, 0.00000],
         [0.53564, 0.46212],
         [1.00000, 1.00000]
      ];
      P.Kt = CurvesTransformation.prototype.AkimaSubsplines;
      P.A = [ // x, y
         [0.00000, 0.00000],
         [1.00000, 1.00000]
      ];
      P.At = CurvesTransformation.prototype.AkimaSubsplines;
      P.L = [ // x, y
         [0.00000, 0.00000],
         [1.00000, 1.00000]
      ];
      P.Lt = CurvesTransformation.prototype.AkimaSubsplines;
      P.a = [ // x, y
         [0.00000, 0.00000],
         [1.00000, 1.00000]
      ];
      P.at = CurvesTransformation.prototype.AkimaSubsplines;
      P.b = [ // x, y
         [0.00000, 0.00000],
         [1.00000, 1.00000]
      ];
      P.bt = CurvesTransformation.prototype.AkimaSubsplines;
      P.c = [ // x, y
         [0.00000, 0.00000],
         [1.00000, 1.00000]
      ];
      P.ct = CurvesTransformation.prototype.AkimaSubsplines;
      P.H = [ // x, y
         [0.00000, 0.00000],
         [1.00000, 1.00000]
      ];
      P.Ht = CurvesTransformation.prototype.AkimaSubsplines;
      P.S = [ // x, y
         [0.00000, 0.00000],
         [1.00000, 1.00000]
      ];
      P.St = CurvesTransformation.prototype.AkimaSubsplines;

      imgView.mainView.beginProcess(UndoFlag_NoSwapFile);

      /* Darken only dark parts (background) of the image. */
      imgView.setMask(MaskView);
      imgView.maskInverted = true;
      
      P.executeOn(imgView.mainView, false);

      imgView.removeMask();

      imgView.mainView.endProcess();
}

function extraHDRMultiscaleTansform(imgView, MaskView)
{
      addProcessingStep("HDRMultiscaleTransform on " + imgView.mainView.id + " using mask " + MaskView.mainView.id);

      var P = new HDRMultiscaleTransform;
      P.numberOfLayers = 6;
      P.numberOfIterations = 1;
      P.invertedIterations = true;
      P.overdrive = 0.000;
      P.medianTransform = true;
      P.scalingFunctionData = [
         0.003906,0.015625,0.023438,0.015625,0.003906,
         0.015625,0.0625,0.09375,0.0625,0.015625,
         0.023438,0.09375,0.140625,0.09375,0.023438,
         0.015625,0.0625,0.09375,0.0625,0.015625,
         0.003906,0.015625,0.023438,0.015625,0.003906
      ];
      P.scalingFunctionRowFilter = [
         0.0625,0.25,
         0.375,0.25,
         0.0625
      ];
      P.scalingFunctionColFilter = [
         0.0625,0.25,
         0.375,0.25,
         0.0625
      ];
      P.scalingFunctionName = "B3 Spline (5)";
      P.deringing = true;
      P.smallScaleDeringing = 0.000;
      P.largeScaleDeringing = 0.250;
      P.outputDeringingMaps = false;
      P.midtonesBalanceMode = HDRMultiscaleTransform.prototype.Automatic;
      P.midtonesBalance = 0.500000;
      P.toLightness = true;
      P.preserveHue = false;
      P.luminanceMask = true;
      
      imgView.mainView.beginProcess(UndoFlag_NoSwapFile);

      /* Transform only light parts of the image. */
      imgView.setMask(MaskView);
      imgView.maskInverted = false;
      
      P.executeOn(imgView.mainView, false);

      imgView.removeMask();

      imgView.mainView.endProcess();
}

function extraLocalHistogramEqualization(imgView, MaskView)
{
      addProcessingStep("LocalHistogramEqualization on " + imgView.mainView.id + " using mask " + MaskView.mainView.id);

      var P = new LocalHistogramEqualization;
      P.radius = 110;
      P.histogramBins = LocalHistogramEqualization.prototype.Bit8;
      P.slopeLimit = 1.3;
      P.amount = 1.000;
      P.circularKernel = true;
      
      imgView.mainView.beginProcess(UndoFlag_NoSwapFile);

      /* Transform only light parts of the image. */
      imgView.setMask(MaskView);
      imgView.maskInverted = false;
      
      P.executeOn(imgView.mainView, false);

      imgView.removeMask();

      imgView.mainView.endProcess();
}

function createStarMask(imgView)
{
      if (star_mask_win == null) {
            star_mask_win = findWindow("star_mask");
      }
      if (star_mask_win == null) {
            star_mask_win = findWindow("AutoStarMask");
      }
      if (star_mask_win != null) {
            // Use already created start mask
            console.writeln("Use existing star mask " + star_mask_win.mainView.id);
            star_mask_win_id = star_mask_win.mainView.id;
            return;
      }

      var P = new StarMask;
      P.shadowsClipping = 0.00000;
      P.midtonesBalance = 0.50000;
      P.highlightsClipping = 1.00000;
      P.waveletLayers = 6;
      P.structureContours = false;
      P.noiseThreshold = 0.10000;
      P.aggregateStructures = false;
      P.binarizeStructures = false;
      P.largeScaleGrowth = 2;
      P.smallScaleGrowth = 1;
      P.growthCompensation = 2;
      P.smoothness = 8;
      P.invert = false;
      P.truncation = 1.00000;
      P.limit = 1.00000;
      P.mode = StarMask.prototype.StarMask;

      imgView.mainView.beginProcess(UndoFlag_NoSwapFile);
      P.executeOn(imgView.mainView, false);
      imgView.mainView.endProcess();

      star_mask_win = ImageWindow.activeWindow;

      windowRenameKeepif(star_mask_win.mainView.id, "AutoStarMask", true);

      addProcessingStep("Created star mask " + star_mask_win.mainView.id);
      star_mask_win_id = star_mask_win.mainView.id;
}

function extraSmallerStars(imgView)
{
      createStarMask(imgView);

      addProcessingStep("Smaller stars on " + imgView.mainView.id + " using mask " + star_mask_win.mainView.id + 
                        " and " + extra_smaller_stars_iterations + " iterations");

      var P = new MorphologicalTransformation;
      P.operator = MorphologicalTransformation.prototype.Selection;
      P.interlacingDistance = 1;
      P.lowThreshold = 0.000000;
      P.highThreshold = 0.000000;
      P.numberOfIterations = extra_smaller_stars_iterations;
      P.amount = 0.70;
      P.selectionPoint = 0.20;
      P.structureName = "";
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
      
      imgView.mainView.beginProcess(UndoFlag_NoSwapFile);

      /* Transform only light parts of the image. */
      imgView.setMask(star_mask_win);
      imgView.maskInverted = false;
      
      P.executeOn(imgView.mainView, false);

      imgView.removeMask();

      imgView.mainView.endProcess();
}

function extraContrast(imgView)
{
      addProcessingStep("Increase contrast on " + imgView.mainView.id);

      var P = new CurvesTransformation;
      P.R = [ // x, y
      [0.00000, 0.00000],
      [1.00000, 1.00000]
      ];
      P.Rt = CurvesTransformation.prototype.AkimaSubsplines;
      P.G = [ // x, y
      [0.00000, 0.00000],
      [1.00000, 1.00000]
      ];
      P.Gt = CurvesTransformation.prototype.AkimaSubsplines;
      P.B = [ // x, y
      [0.00000, 0.00000],
      [1.00000, 1.00000]
      ];
      P.Bt = CurvesTransformation.prototype.AkimaSubsplines;
      P.K = [ // x, y
            [0.00000, 0.00000],
            [0.26884, 0.24432],
            [0.74542, 0.77652],
            [1.00000, 1.00000]
         ];
      P.Kt = CurvesTransformation.prototype.AkimaSubsplines;
      P.A = [ // x, y
      [0.00000, 0.00000],
      [1.00000, 1.00000]
      ];
      P.At = CurvesTransformation.prototype.AkimaSubsplines;
      P.L = [ // x, y
      [0.00000, 0.00000],
      [1.00000, 1.00000]
      ];
      P.Lt = CurvesTransformation.prototype.AkimaSubsplines;
      P.a = [ // x, y
      [0.00000, 0.00000],
      [1.00000, 1.00000]
      ];
      P.at = CurvesTransformation.prototype.AkimaSubsplines;
      P.b = [ // x, y
      [0.00000, 0.00000],
      [1.00000, 1.00000]
      ];
      P.bt = CurvesTransformation.prototype.AkimaSubsplines;
      P.c = [ // x, y
      [0.00000, 0.00000],
      [1.00000, 1.00000]
      ];
      P.ct = CurvesTransformation.prototype.AkimaSubsplines;
      P.H = [ // x, y
      [0.00000, 0.00000],
      [1.00000, 1.00000]
      ];
      P.Ht = CurvesTransformation.prototype.AkimaSubsplines;
      P.S = [ // x, y
      [0.00000, 0.00000],
      [1.00000, 1.00000]
      ];
      P.St = CurvesTransformation.prototype.AkimaSubsplines;

      imgView.mainView.beginProcess(UndoFlag_NoSwapFile);

      P.executeOn(imgView.mainView, false);

      imgView.mainView.endProcess();
}

function extraSTF(win)
{
      runHistogramTransform(win, null, true);
}


function is_extra_option()
{
      return extra_darker_background || 
             extra_HDRMLT || 
             extra_LHE || 
             extra_contrast ||
             extra_STF ||
             extra_smaller_stars;
}

function is_narrowband_option()
{
      return fix_narrowband_star_color ||
             run_hue_shift ||
             run_narrowband_SCNR ||
             leave_some_green;
}

function extraProcessing(id, apply_directly)
{
      var extraWin;
      var need_L_mask = extra_darker_background || 
                        extra_HDRMLT || 
                        extra_LHE;

      if (need_L_mask) {
            // Try find mask window
            if (mask_win == null) {
                  mask_win = findWindow("range_mask");
            }
            if (mask_win == null) {
                  mask_win = findWindow("AutoMask");
            }
            if (mask_win == null) {
                  mask_win_id = "AutoMask";
                  mask_win = newMaskWindow(ImageWindow.windowById(id), mask_win_id);
            }
            console.writeln("Use mask " + mask_win.mainView.id);
      }
      if (apply_directly) {
            extraWin = ImageWindow.windowById(id);
      } else {
            extraWin = copyWindow(ImageWindow.windowById(id), id + "_extra");
      }

      if (narrowband) {
            if (run_hue_shift) {
                  narrowbandHueShift(extraWin.mainView);
            }
            if (run_narrowband_SCNR || leave_some_green) {
                  runSCNR(extraWin.mainView, false);
            }
            if (fix_narrowband_star_color) {
                  fixNarrowbandStarColor(extraWin);
            }
      }
      if (extra_darker_background) {
            extraDarkerBackground(extraWin, mask_win);
      }
      if (extra_HDRMLT) {
            extraHDRMultiscaleTansform(extraWin, mask_win);
      }
      if (extra_LHE) {
            extraLocalHistogramEqualization(extraWin, mask_win);
      }
      if (extra_contrast) {
            extraContrast(extraWin);
      }
      if (extra_STF) {
            extraSTF(extraWin);
      }
      if (extra_smaller_stars) {
            extraSmallerStars(extraWin);
      }
}

function extraProcessingEngine(id)
{
      mask_win = null;
      mask_win_id = null;
      star_mask_win = null;
      star_mask_win_id = null;
      star_fix_mask_win = null;
      star_fix_mask_win_id = null;
      processing_steps = "";

      console.noteln("Start extra processing...");

      console.show(true);
      extraProcessing(extra_target_image, true);
      console.show(false);

      windowIconizeif(mask_win_id);             /* AutoMask or range_mask window */
      windowIconizeif(star_mask_win_id);        /* AutoStarMask or star_mask window */
      windowIconizeif(star_fix_mask_win_id);    /* AutoStarFixMask or star_fix_mask window */

      console.noteln("Processing steps:");
      console.writeln(processing_steps);
      console.writeln("");
      console.noteln("Extra processing completed.");
}

function AutoIntegrateEngine(auto_continue)
{
      if (extra_target_image != "Auto") {
            console.criticalln("Extra processing target image can be used only with Apply button!");
            return;
      }

      var LRGB_ABE_HT_id = null;
      var RGB_ABE_HT_id = null;

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
      R_ABE_id = null;
      G_ABE_id = null;
      B_ABE_id = null;
      RGB_win_id = null;
      start_time = Date.now();
      mask_win = null;
      star_mask_win = null;
      star_fix_mask_win = null;

      console.beginLog();
      console.show(true);

      processingDate = new Date;
      processing_steps = "";
      all_windows = new Array;
      iconPoint = null;
      dialogFilePath = null;
      L_stf = null;
      linear_fit_done = false;
      narrowband = autocontinue_narrowband;
      is_luminance_images = false;

      console.noteln("--------------------------------------");
      if (processingOptions.length > 0) {
            addProcessingStep("Processing options:");
            for (var i = 0; i < processingOptions.length; i++) {
                  addProcessingStep(processingOptions[i][0] + " " + processingOptions[i][1]);
            }
      } else {
            addProcessingStep("Using default processing options");
      }
      console.noteln("--------------------------------------");
      addProcessingStep("Start processing...");

      /* Create images for each L, R, G and B channels, or Color image. */
      if (!CreateChannelImages(auto_continue)) {
            console.criticalln("Failed!");
            console.endLog();
            return;
      }

      /* Now we have L (Gray) and R, G and B images, or just RGB image
       * in case of color files.
       *
       * We keep integrated L and RGB images so it is
       * possible to continue manually if automatic
       * processing is not good enough.
       */

      if (preprocessed_images == start_images.FINAL) {
            // We have a final image, just run run possible extra processing steps
            LRGB_ABE_HT_id = final_win.mainView.id;
      } else if (!integrate_only && preprocessed_images != start_images.FINAL) {
            var processRGB = !is_color_files && 
                             !monochrome_image &&
                             (preprocessed_images == start_images.NONE ||
                              preprocessed_images == start_images.L_R_G_B_BE ||
                              preprocessed_images == start_images.L_R_G_B);
            var RBGmapping = { combined: false, stretched: false};

            if (processRGB) {
                  /* Do possibloe channel mapping. After that we 
                   * have red_id, green_id and blue_id.
                   */
                  RBGmapping = mapLRGBchannels();
                  if (!RBGmapping.combined) {
                        LinearFitLRGBchannels();
                  }
            }

            if (!is_color_files && is_luminance_images) {
                  /* This need to be run early as we create a mask from
                   * L image.
                   */
                  LRGBCreateMask();
                  ProcessLimage();
            }

            if (processRGB && !RBGmapping.combined) {
                  CombineRGBimage();
            }

            if (monochrome_image) {
                  console.writeln("monochrome_image:rename windows")
                  LRGB_ABE_HT_id = windowRename(L_ABE_HT_win.mainView.id, "AutoMono");

            } else if (!channelcombination_only) {

                  RGB_ABE_HT_id = ProcessRGBimage(RBGmapping.stretched);

                  if (is_color_files || !is_luminance_images) {
                        /* Keep RGB_ABE_HT_id separate from LRGB_ABE_HT_id which
                         * will be the final result file.
                          */
                        LRGB_ABE_HT_id = "copy_" + RGB_ABE_HT_id;
                        copyWindow(
                              ImageWindow.windowById(RGB_ABE_HT_id), 
                              LRGB_ABE_HT_id);
                  } else {
                        /* LRGB files. Combine L and RGB images.
                        */
                        LRGB_ABE_HT_id = runLRGBCombination(
                                          RGB_ABE_HT_id,
                                          L_ABE_HT_id);
                  }

                  if (!narrowband) {
                        /* Remove green cast, run SCNR
                        */
                        runSCNR(ImageWindow.windowById(LRGB_ABE_HT_id).mainView, false);
                  }
          
                  /* Optional color noise reduction for RGB.
                   */
                  runColorReduceNoise(ImageWindow.windowById(LRGB_ABE_HT_id));

                  /* Sharpen image, use mask to sharpen mostly the light parts of image.
                  */
                  runMultiscaleLinearTransformSharpen(
                        ImageWindow.windowById(LRGB_ABE_HT_id),
                        mask_win);
          
                  /* Rename some windows. Need to be done before iconize.
                  */
                  if (!is_color_files && is_luminance_images) {
                        /* LRGB files */
                        if (RRGB_image) {
                              LRGB_ABE_HT_id = windowRename(LRGB_ABE_HT_id, "AutoRRGB");
                        } else {
                              LRGB_ABE_HT_id = windowRename(LRGB_ABE_HT_id, "AutoLRGB");
                        }
                  } else {
                        /* Color or narrowband or RGB files */
                        LRGB_ABE_HT_id = windowRename(LRGB_ABE_HT_id, "AutoRGB");
                  }
            }
      }

      if (is_extra_option() || is_narrowband_option()) {
            extraProcessing(LRGB_ABE_HT_id, false);
      }

      saveWindow(dialogFilePath, L_id);                    /* Integration_L */
      saveWindow(dialogFilePath, R_id);                    /* Integration_R */
      saveWindow(dialogFilePath, G_id);                    /* Integration_G */
      saveWindow(dialogFilePath, B_id);                    /* Integration_B */
      saveWindow(dialogFilePath, H_id);                    /* Integration_H */
      saveWindow(dialogFilePath, S_id);                    /* Integraiton_S */
      saveWindow(dialogFilePath, O_id);                    /* Integration_O */
      saveWindow(dialogFilePath, RGB_win_id);              /* Integration_RGB */
      saveWindow(dialogFilePath, LRGB_ABE_HT_id);          /* Final image. */

      /* All done, do cleanup on windows on screen 
       */
      addProcessingStep("Processing completed");

      closeTempWindows();

      windowIconizeif(L_id);                    /* Integration_L */
      windowIconizeif(R_id);                    /* Integration_R */
      windowIconizeif(G_id);                    /* Integraion_G */
      windowIconizeif(B_id);                    /* Integration_B */
      windowIconizeif(H_id);                    /* Integration_H */
      windowIconizeif(S_id);                    /* Integraion_S */
      windowIconizeif(O_id);                    /* Integration_O */
      windowIconizeif(RGB_win_id);              /* Integration_RGB */

      windowIconizeif(L_ABE_id);
      windowIconizeif(R_ABE_id);
      windowIconizeif(G_ABE_id);
      windowIconizeif(B_ABE_id);
      windowIconizeif(RGB_ABE_id);

      windowIconizeif(RGB_ABE_HT_id);
      windowIconizeif(L_ABE_HT_id);
      windowIconizeif(mask_win_id);             /* AutoMask or range_mask window */
      windowIconizeif(star_mask_win_id);        /* AutoStarMask or star_mask window */
      windowIconizeif(star_fix_mask_win_id);    /* AutoStarFixMask or star_fix_mask window */

      if (batch_mode > 0) {
            /* Rename image based on first file directory name. 
             * First check possible device in Windows (like c:)
             */
            var fname = dialogFileNames[0];
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
            addProcessingStep("Batch mode, rename " + LRGB_ABE_HT_id + " to " + fname);
            LRGB_ABE_HT_id = windowRenameKeepif(LRGB_ABE_HT_id, fname, true);
            console.writeln("Batch mode, set batch keyword");
            setBatchKeyword(ImageWindow.windowById(LRGB_ABE_HT_id));
      }

      if (preprocessed_images == start_images.NONE) {
            /* Output some info of files.
            */
            addProcessingStep("* All data files *");
            addProcessingStep(all_files.length + " data files, " + alignedFiles.length + " accepted");
            addProcessingStep("best_ssweight="+best_ssweight);
            addProcessingStep("best_image="+best_image);
            var totalexptime = L_images.exptime + R_images.exptime + G_images.exptime +
                               B_images.exptime + C_images.exptime;
            addProcessingStep("total exptime="+totalexptime);
            
            console.writeln("");

            if (!is_color_files) {
                  /* LRGB files */
                  if (is_luminance_images) {
                        addProcessingStep("* L " + L_images.images.length + " data files *");
                        //console.writeln("L_images.images="+L_images.images);
                        addProcessingStep("L_images.best_ssweight="+L_images.best_ssweight);
                        addProcessingStep("L_images.best_image="+L_images.best_image);
                        addProcessingStep("L exptime="+L_images.exptime);
                  } else {
                        addProcessingStep("* No L files *");
                  }

                  if (!monochrome_image) {
                        addProcessingStep("* R " + R_images.images.length + " data files *");
                        //console.writeln("R_images.images="+R_images.images);
                        addProcessingStep("R_images.best_ssweight="+R_images.best_ssweight);
                        addProcessingStep("R_images.best_image="+R_images.best_image);
                        addProcessingStep("R exptime="+R_images.exptime);

                        addProcessingStep("* G " + G_images.images.length + " data files *");
                        //console.writeln("G_images.images="+G_images.images);
                        addProcessingStep("G_images.best_ssweight="+G_images.best_ssweight);
                        addProcessingStep("G_images.best_image="+G_images.best_image);
                        addProcessingStep("G exptime="+G_images.exptime);

                        addProcessingStep("* B " + B_images.images.length + " data files *");
                        //console.writeln("B_images.images="+B_images.images);
                        addProcessingStep("B_images.best_ssweight="+B_images.best_ssweight);
                        addProcessingStep("B_images.best_image="+B_images.best_image);
                        addProcessingStep("B exptime="+B_images.exptime);
                  }
            } else {
                  /* Color files */
                  addProcessingStep("* Color data files *");
                  //console.writeln("C_images.images="+C_images.images);
                  addProcessingStep("C_images.best_ssweight="+C_images.best_ssweight);
                  addProcessingStep("C_images.best_image="+C_images.best_image);
                  addProcessingStep("Color exptime="+C_images.exptime);
            }
      }
      var end_time = Date.now();
      addProcessingStep("Script completed, time "+(end_time-start_time)/1000+" sec");
      console.noteln("======================================");

      if (preprocessed_images != start_images.FINAL) {
            writeProcessingSteps(alignedFiles, auto_continue);
      }

      console.noteln("Processing steps:");
      console.writeln(processing_steps);
      console.writeln("--------------------------------------");
      if (processingOptions.length > 0) {
            console.writeln("Processing options:");
            for (var i = 0; i < processingOptions.length; i++) {
                  console.writeln(processingOptions[i][0] + " " + processingOptions[i][1]);
            }
      } else {
            addProcessingStep("Default processing options were used");

      }
      console.writeln("--------------------------------------");
      if (preprocessed_images != start_images.FINAL) {
            console.noteln("Console output is written into file " + logfname);
      }
      console.noteln("Processing completed.");
}

function newCheckBox( parent, checkboxText, checkboxState, toolTip )
{
      var widget = new CheckBox( parent );
      widget.text = checkboxText;
      widget.checked = checkboxState;
      if ( typeof toolTip !== 'undefined' && toolTip != null ) { 
            widget.toolTip = toolTip; 
      }

      return widget;
}

function newSectionBar( parent, title, hasCheckBox )
{
      var widget = new SectionBar( parent );
      if ( typeof title !== 'undefined' && title != null ) { 
            widget.setTitle( title ); 
      }
      if ( typeof hasCheckBox !== 'undefined' && hasCheckBox ) { 
            widget.enableCheckBox(); 
      }

      return widget;
}

function newGroupBox( parent, title, toolTip )
{
      var widget = new GroupBox( parent );
      if ( typeof title !== 'undefined' && title != null ) { 
            widget.title = title; 
      }
      if ( typeof toolTip !== 'undefined' && toolTip != null ) { 
            widget.toolTip = toolTip; 
      }

      return widget;
}

function Autorun(that)
{
      var stopped;
      if (batch_mode) {
            stopped = false;
            console.writeln("AutoRun in batch mode");
      } else {
            stopped = true;
            console.writeln("AutoRun");
      }
      do {
            if (dialogFileNames == null) {
                  dialogFileNames = openFitFiles();
                  if (dialogFileNames != null) {
                        that .dialog.files_TreeBox.canUpdate = false;
                        for (var i = 0; i < dialogFileNames.length; i++) {
                              var node = new TreeBoxNode(that.dialog.files_TreeBox);
                              node.setText(0, dialogFileNames[i]);
                        }
                        that.dialog.files_TreeBox.canUpdate = true;
                  }
            }
            if (dialogFileNames != null) {
                  try {
                        AutoIntegrateEngine(false);
                  } 
                  catch(err) {
                        console.criticalln(err);
                        console.criticalln("Processing stopped!");
                        writeProcessingSteps(null, false);
                  }
                  if (batch_mode) {
                        dialogFileNames = null;
                        console.writeln("AutoRun in batch mode");
                        closeAllWindows();
                  }
            } else {
                  stopped = true;
            }
      } while (!stopped);
}

function AutoIntegrateDialog()
{
      /* Version number is here. */
      var helptext = "<p><b>AutoIntegrate v0.74</b> &mdash; " +
                     "Automatic image integration utility.</p>";

      this.__base__ = Dialog;
      this.__base__();

      var labelWidth1 = this.font.width( "Output format hints:" + 'T' );
      this.textEditWidth = 25 * this.font.width( "M" );
      this.numericEditWidth = 6 * this.font.width( "0" );

      var mainHelpTips = 
      "<p>" +
      "<b>Some tips for using AutoIntegrate script</b>" +
      "</p><p>" +
      "Script automates initial steps of image processing in PixInsight. "+ 
      "Most often you get the best results by running the script with default " +
      "settings and then continue processing in Pixinsight." +
      "</p><p>"+
      "Always remember to check you data with Blink tool and rem,ove all bad images." +
      "</p><p>" +
      "Sometimes images need some shadow cleanup with HistogramTransformation tool. "+
      "Depending on the image you can try clipping shadows between %0.01 and %0.1." +
      "</p><p>" +
      "If an image lacks contrast it can be enhanced with the CurvesTransformation tool. "+
      "Changing the curve to a slight S can be helpful. " +
      "CurvesTransformation can also be used to increase saturation." +
      "</p><p>" +
      "If background is not even then tools like AutomaticBackgroundExtractor or " +
      "DynamicBackgroundExtractor can be helpful. Script can run AutomaticBackgroundExtractor "+
      "automatically if needed." +
      "</p><p>" +
      "Further enhancements may include masking, noise reduction, sharpening and making " +
      "stars smaller. Often tools like HDRMulticaleTransform and LocalHistogramEqualization "+
      "can help with details in the image." +
      "</p><p>" +
      "Default options are typically a pretty good start for most images but sometimes "+
      "a few changes are needed for OSC (One Shot Color) files. If there is a strong color cast and/or "+
      "vignetting it is worth trying with Use ABE and Use BackgroudNeutralization options. "+
      "Sometimes also choosing Unlinked in Link RGB channel option helps. "+
      "Examples where these options may be useful are DSRL files and Slooh Canary Three telescope. " +
      "</p><p>" +
      "Batch mode is intended to be used with mosaic images. In Batch mode script " +
      "automatically asks files for the next mosaic panel. All mosaic panels are left open " +
      "and can be saved with Save batch result files buttons." +
      "</p><p>" +
      "For more details see:<br>" +
      "https://ruuth.xyz/AutoIntegrateInfo.html" +
      "</p><p>" +
      "This product is based on software from the PixInsight project, developed " +
      "by Pleiades Astrophoto and its contributors (https://pixinsight.com/)." +
      "</p>";

      /* Info box at the top. */
      this.helpLabel = new Label( this );
      //this.helpLabel.frameStyle = FrameStyle_Box;
      //this.helpLabel.margin = this.logicalPixelsToPhysical( 4 );
      //this.helpLabel.wordWrapping = true;
      this.helpLabel.useRichText = true;
      this.helpLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      this.helpLabel.text = helptext;
      this.helpTips = new ToolButton( this );
      this.helpTips.icon = this.scaledResource( ":/icons/help.png" );
      this.helpTips.setScaledFixedSize( 20, 20 );
      this.helpTips.toolTip = mainHelpTips;

      /* Tree box to show files. */
      this.files_TreeBox = new TreeBox( this );
      this.files_TreeBox.multipleSelection = true;
      this.files_TreeBox.rootDecoration = false;
      this.files_TreeBox.alternateRowColor = true;
      this.files_TreeBox.setScaledMinSize( 300, 100 );
      this.files_TreeBox.numberOfColumns = 1;
      this.files_TreeBox.headerVisible = false;

      for (var i = 0; dialogFileNames != null && i < dialogFileNames.length; i++) {
         var node = new TreeBoxNode( this.files_TreeBox );
         node.setText(0, dialogFileNames[i]);
      }
   
      /* Add files. */
      this.filesAdd_Button = new PushButton( this );
      this.filesAdd_Button.text = "Add";
      this.filesAdd_Button.icon = this.scaledResource( ":/icons/add.png" );
      this.filesAdd_Button.toolTip = "<p>Add image files to the input images list.</p>";
      this.filesAdd_Button.onClick = function()
      {
            var fitFileNames = openFitFiles();
            if (fitFileNames != null) {
                  if (dialogFileNames == null) {
                        dialogFileNames = [];
                  }
                  this.dialog.files_TreeBox.canUpdate = false;
                  for (var i = 0; i < fitFileNames.length; i++) {
                        var node = new TreeBoxNode(this.dialog.files_TreeBox);
                        node.setText(0, fitFileNames[i]);
                        dialogFileNames[dialogFileNames.length] = fitFileNames[i];
                  }
                  this.dialog.files_TreeBox.canUpdate = true;
            }
      };

      /* Clear files. */
      this.filesClear_Button = new PushButton( this );
      this.filesClear_Button.text = "Clear";
      this.filesClear_Button.icon = this.scaledResource( ":/icons/clear.png" );
      this.filesClear_Button.toolTip = "<p>Clear the list of input images.</p>";
      this.filesClear_Button.onClick = function()
      {
         this.dialog.files_TreeBox.clear();
         dialogFileNames = null;
      };
   
      /* Place buttons on dialog. */
      this.filesButtons_Sizer = new HorizontalSizer;
      this.filesButtons_Sizer.spacing = 4;
      this.filesButtons_Sizer.add( this.filesAdd_Button );
      this.filesButtons_Sizer.addStretch();
      this.filesButtons_Sizer.add( this.filesClear_Button );    
      
      this.files_GroupBox = new GroupBox( this );
      this.files_GroupBox.title = "Input Images";
      this.files_GroupBox.sizer = new VerticalSizer;
      this.files_GroupBox.sizer.margin = 6;
      this.files_GroupBox.sizer.spacing = 4;
      this.files_GroupBox.sizer.add( this.files_TreeBox, this.textEditWidth );
      this.files_GroupBox.sizer.add( this.filesButtons_Sizer );     

      /* Paremeters check boxes. */
      this.useLocalNormalizationCheckBox = newCheckBox(this, "Local Normalization", use_local_normalization, 
            "<p>Run local normalization before StarAlign</p>" );
      this.useLocalNormalizationCheckBox.onClick = function(checked) { 
            use_local_normalization = checked; 
            SetOptionChecked("Local Normalization", checked); 
      }

      this.useNoiseReductionOnAllChannelsCheckBox = newCheckBox(this, "Noise reduction also on on R,G,B", use_noise_reduction_on_all_channels, 
            "<p>Run noise also reduction on R,G,B images in addition to L image</p>" );
      this.useNoiseReductionOnAllChannelsCheckBox.onClick = function(checked) { 
            use_noise_reduction_on_all_channels = checked; 
            SetOptionChecked("Noise reduction also on on R,G,B", checked); 
      }

      this.CosmeticCorrectionCheckBox = newCheckBox(this, "No CosmeticCorrection", skip_cosmeticcorrection, 
            "<p>Do not run CosmeticCorrection on image files</p>" );
      this.CosmeticCorrectionCheckBox.onClick = function(checked) { 
            skip_cosmeticcorrection = checked; 
            SetOptionChecked("No CosmeticCorrection", checked); 
      }

      this.SubframeSelectorCheckBox = newCheckBox(this, "No SubframeSelector", skip_subframeselector, 
            "<p>Do not run SubframeSelector to get image weights</p>" );
      this.SubframeSelectorCheckBox.onClick = function(checked) { 
            skip_subframeselector = checked; 
            SetOptionChecked("No SubframeSelector", checked); 
      }

      this.IntegrateOnlyCheckBox = newCheckBox(this, "Integrate only", integrate_only, 
            "<p>Run only image integration to create L,R,G,B or RGB files</p>" );
      this.IntegrateOnlyCheckBox.onClick = function(checked) { 
            integrate_only = checked; 
            SetOptionChecked("Integrate only", checked); 
      }

      this.ChannelCombinationOnlyCheckBox = newCheckBox(this, "ChannelCombination only", channelcombination_only, 
            "<p>Run only channel combination to linear RGB file. No autostretch or color calibration.</p>" );
      this.ChannelCombinationOnlyCheckBox.onClick = function(checked) { 
            channelcombination_only = checked; 
            SetOptionChecked("ChannelCombination only", checked); 
      }

      this.relaxedStartAlignCheckBox = newCheckBox(this, "Strict StarAlign", strict_StarAlign, 
            "<p>Use more strict StarAlign parameters. When set more files may fail to align.</p>" );
      this.relaxedStartAlignCheckBox.onClick = function(checked) { 
            strict_StarAlign = checked; 
            SetOptionChecked("Strict StarAlign", checked); 
      }
      
      this.keepIntegratedImagesCheckBox = newCheckBox(this, "Keep integrated images", keep_integrated_images, 
            "<p>Keep integrated images when closing all windows</p>" );
      this.keepIntegratedImagesCheckBox.onClick = function(checked) { 
            keep_integrated_images = checked; 
            SetOptionChecked("Keep integrated images", checked); 
      }

      this.useABE_L_RGB_CheckBox = newCheckBox(this, "Use ABE", use_ABE_on_L_RGB, 
      "<p>Use AutomaticBackgroundExtractor on L and RGB images separately</p>" );
      this.useABE_L_RGB_CheckBox.onClick = function(checked) { 
            use_ABE_on_L_RGB = checked; 
            SetOptionChecked("Use ABE on L, RGB", checked); 
      }

      this.color_calibration_before_ABE_CheckBox = newCheckBox(this, "Color calibration before ABE", color_calibration_before_ABE, 
      "<p>Run ColorCalibration before AutomaticBackgroundExtractor</p>" );
      this.color_calibration_before_ABE_CheckBox.onClick = function(checked) { 
            color_calibration_before_ABE = checked; 
            SetOptionChecked("Color calibration before ABE", checked); 
      }

      this.use_background_neutralization_CheckBox = newCheckBox(this, "Use BackgroundNeutralization", use_background_neutralization, 
      "<p>Run BackgroundNeutralization before ColorCalibration</p>" );
      this.use_background_neutralization_CheckBox.onClick = function(checked) { 
            use_background_neutralization = checked; 
            SetOptionChecked("Use BackgroundNeutralization", checked); 
      }

      this.batch_mode_CheckBox = newCheckBox(this, "Batch mode", batch_mode, 
      "<p>Run in batch mode, continue until no files are given</p>" );
      this.batch_mode_CheckBox.onClick = function(checked) { 
            batch_mode = checked; 
            SetOptionChecked("Batch mode", checked); 
      }

      this.use_drizzle_CheckBox = newCheckBox(this, "Drizzle", use_drizzle, 
      "<p>Use Drizzle integration</p>" );
      this.use_drizzle_CheckBox.onClick = function(checked) { 
            use_drizzle = checked; 
            SetOptionChecked("Drizzle", checked); 
      }

      this.use_uwf_CheckBox = newCheckBox(this, "UWF", use_uwf, 
      "<p>Use Ultra Wide Field (UWF) images for integration</p>" );
      this.use_uwf_CheckBox.onClick = function(checked) { 
            use_uwf = checked; 
            SetOptionChecked("UWF", checked); 
      }
      
      this.monochrome_image_CheckBox = newCheckBox(this, "Monochrome", monochrome_image, 
      "<p>Create monochrome image</p>" );
      this.monochrome_image_CheckBox.onClick = function(checked) { 
            monochrome_image = checked; 
            SetOptionChecked("Monochrome", checked); 
      }

      this.imageintegration_ssweight_CheckBox = newCheckBox(this, "ImageIntegration do not use weight", skip_imageintegration_ssweight, 
      "<p>Do not use use SSWEIGHT weight keyword during ImageIntegration</p>" );
      this.imageintegration_ssweight_CheckBox.onClick = function(checked) { 
            skip_imageintegration_ssweight = checked; 
            SetOptionChecked("ImageIntegration do not use weight", checked); 
      }

      this.imageintegration_clipping_CheckBox = newCheckBox(this, "No ImageIntegration clipping", !imageintegration_clipping, 
      "<p>Do not use clipping in ImageIntegration</p>" );
      this.imageintegration_clipping_CheckBox.onClick = function(checked) { 
            imageintegration_clipping = !checked; 
            SetOptionChecked("No ImageIntegration clipping", checked); 
      }

      this.RRGB_image_CheckBox = newCheckBox(this, "RRGB image", RRGB_image, 
      "<p>RRGB image using R as Luminance.</p>" );
      this.RRGB_image_CheckBox.onClick = function(checked) { 
            RRGB_image = checked; 
            SetOptionChecked("RRGB image", checked); 
      }

      this.synthetic_l_image_CheckBox = newCheckBox(this, "Synthetic L image", synthetic_l_image, 
      "<p>Create synthetic L image from all LRGB images.</p>" );
      this.synthetic_l_image_CheckBox.onClick = function(checked) { 
            synthetic_l_image = checked; 
            SetOptionChecked("Synthetic L image", checked); 
      }

      this.synthetic_missing_images_CheckBox = newCheckBox(this, "Synthetic missing image", synthetic_missing_images, 
      "<p>Create synthetic image for any missing image.</p>" );
      this.synthetic_missing_images_CheckBox.onClick = function(checked) { 
            synthetic_missing_images = checked; 
            SetOptionChecked("Synthetic missing image", checked); 
      }

      this.unique_file_names_CheckBox = newCheckBox(this, "Use unique file names", unique_file_names, 
      "<p>Use unique file names by adding a timestamp when saving to disk.</p>" );
      this.unique_file_names_CheckBox.onClick = function(checked) { 
            unique_file_names = checked; 
            SetOptionChecked("Use unique file names", checked); 
      }

      this.skip_noise_reduction_CheckBox = newCheckBox(this, "No noise reduction", skip_noise_reduction, 
      "<p>Do not use noise reduction.</p>" );
      this.skip_noise_reduction_CheckBox.onClick = function(checked) { 
            skip_noise_reduction = checked; 
            SetOptionChecked("No noise reduction", checked); 
      }

      this.skip_color_noise_reduction_CheckBox = newCheckBox(this, "No color noise reduction", skip_color_noise_reduction, 
      "<p>Do not use color noise reduction.</p>" );
      this.skip_color_noise_reduction_CheckBox.onClick = function(checked) { 
            skip_color_noise_reduction = checked; 
            SetOptionChecked("No color noise reduction", checked); 
      }

      this.STFLabel = new Label( this );
      this.STFLabel.text = "Link RGB channels";
      this.STFLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      this.STFLabel.toolTip = 
      "<p>" +
      "RGB channel linking in Screen Transfer Function. Using Unlinked can help reduce color cast with OSC images." +
      "</p><p>" +
      "With Auto the default for true RGB images is to use linked channels. For narrowband images the default " +
      "is to use unlinked channels. But if linear fit is done with narrowband images, then linked channels are used." +
      "</p>";
      this.STFComboBox = new ComboBox( this );
      this.STFComboBox.addItem( "Auto" );
      this.STFComboBox.addItem( "Linked" );
      this.STFComboBox.addItem( "Unlinked" );
      this.STFComboBox.onItemSelected = function( itemIndex )
      {
            RemoveOption("Link RGB channels");
            switch (itemIndex) {
                  case 0:
                        SetOptionValue("Link RGB channels", "Auto"); 
                        break;
                  case 1:
                        SetOptionValue("Link RGB channels", "Linked"); 
                        break;
                  case 2:
                        SetOptionValue("Link RGB channels", "Unlinked"); 
                        break;
            }
            STF_linking = itemIndex;
      };
      this.STFSizer = new HorizontalSizer;
      this.STFSizer.spacing = 4;
      this.STFSizer.add( this.STFLabel );
      this.STFSizer.add( this.STFComboBox );
      this.STFSizer.addStretch();

      this.no_mask_contrast_CheckBox = newCheckBox(this, "No extra contrast on mask", skip_mask_contrast, 
      "<p>Do not add extra contrast on automatically created luminance mask.</p>" );
      this.no_mask_contrast_CheckBox.onClick = function(checked) { 
            skip_mask_contrast = checked; 
            SetOptionChecked("No extra contrast on mask", checked); 
      }

      // Image parameters set 1.
      this.imageParamsSet1 = new VerticalSizer;
      this.imageParamsSet1.margin = 6;
      this.imageParamsSet1.spacing = 4;
      this.imageParamsSet1.add( this.CosmeticCorrectionCheckBox );
      this.imageParamsSet1.add( this.SubframeSelectorCheckBox );
      this.imageParamsSet1.add( this.relaxedStartAlignCheckBox);
      this.imageParamsSet1.add( this.imageintegration_ssweight_CheckBox );
      this.imageParamsSet1.add( this.imageintegration_clipping_CheckBox );
      this.imageParamsSet1.add( this.use_background_neutralization_CheckBox );
      this.imageParamsSet1.add( this.useLocalNormalizationCheckBox );
      
      // Image parameters set 2.
      this.imageParamsSet2 = new VerticalSizer;
      this.imageParamsSet2.margin = 6;
      this.imageParamsSet2.spacing = 4;
      this.imageParamsSet2.add( this.skip_noise_reduction_CheckBox );
      this.imageParamsSet2.add( this.skip_color_noise_reduction_CheckBox );
      this.imageParamsSet2.add( this.useNoiseReductionOnAllChannelsCheckBox );
      this.imageParamsSet2.add( this.color_calibration_before_ABE_CheckBox );
      this.imageParamsSet2.add( this.useABE_L_RGB_CheckBox );
      //this.imageParamsSet2.add( this.useABE_final_CheckBox );   Not sure if this useful fo leaving off for now.
      this.imageParamsSet2.add( this.use_drizzle_CheckBox );
      this.imageParamsSet2.add( this.no_mask_contrast_CheckBox );
      this.imageParamsSet2.add( this.STFSizer );

      // Image group parameters.
      this.imageParamsGroupBox = new newGroupBox( this );
      this.imageParamsGroupBox.title = "Image processing parameters";
      this.imageParamsGroupBox.sizer = new HorizontalSizer;
      this.imageParamsGroupBox.sizer.margin = 6;
      this.imageParamsGroupBox.sizer.spacing = 4;
      this.imageParamsGroupBox.sizer.add( this.imageParamsSet1 );
      this.imageParamsGroupBox.sizer.add( this.imageParamsSet2 );
      // Stop columns of buttons moving as dialog expands horizontally.
      //this.imageParamsGroupBox.sizer.addStretch();

      // Saturation selection
      this.linearSaturationLabel = new Label( this );
      this.linearSaturationLabel.text = "Linear saturation increase";
      this.linearSaturationLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      this.linearSaturationSpinBox = new SpinBox( this );
      this.linearSaturationSpinBox.minValue = 0;
      this.linearSaturationSpinBox.maxValue = 5;
      this.linearSaturationSpinBox.value = linear_increase_saturation;
      this.linearSaturationSpinBox.toolTip = "<p>Saturation increase in linear state.</p>";
      this.linearSaturationSpinBox.onValueUpdated = function( value )
      {
            SetOptionValue("Linear saturation increase", value);
            linear_increase_saturation = value;
      };

      this.nonLinearSaturationLabel = new Label( this );
      this.nonLinearSaturationLabel.text = "Non-linear saturation increase";
      this.nonLinearSaturationLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      this.nonLinearSaturationSpinBox = new SpinBox( this );
      this.nonLinearSaturationSpinBox.minValue = 0;
      this.nonLinearSaturationSpinBox.maxValue = 5;
      this.nonLinearSaturationSpinBox.value = non_linear_increase_saturation;
      this.nonLinearSaturationSpinBox.toolTip = "<p>Saturation increase in non-linear state.</p>";
      this.nonLinearSaturationSpinBox.onValueUpdated = function( value )
      {
            SetOptionValue("Non-linear saturation increase", value);
            non_linear_increase_saturation = value;
      };

      this.saturationGroupBox = new newGroupBox( this );
      this.saturationGroupBox.title = "Saturation setting";
      this.saturationGroupBox.sizer = new HorizontalSizer;
      this.saturationGroupBox.sizer.margin = 6;
      this.saturationGroupBox.sizer.spacing = 4;
      this.saturationGroupBox.sizer.add( this.linearSaturationLabel );
      this.saturationGroupBox.sizer.add( this.linearSaturationSpinBox );
      this.saturationGroupBox.sizer.add( this.nonLinearSaturationLabel );
      this.saturationGroupBox.sizer.add( this.nonLinearSaturationSpinBox );
      //this.saturationGroupBox.sizer.addStretch();

      // Other parameters set 1.
      this.otherParamsSet1 = new VerticalSizer;
      this.otherParamsSet1.margin = 6;
      this.otherParamsSet1.spacing = 4;
      this.otherParamsSet1.add( this.IntegrateOnlyCheckBox );
      this.otherParamsSet1.add( this.ChannelCombinationOnlyCheckBox );
      this.otherParamsSet1.add( this.RRGB_image_CheckBox );
      this.otherParamsSet1.add( this.synthetic_l_image_CheckBox );
      this.otherParamsSet1.add( this.synthetic_missing_images_CheckBox );

      // Other parameters set 2.
      this.otherParamsSet2 = new VerticalSizer;
      this.otherParamsSet2.margin = 6;
      this.otherParamsSet2.spacing = 4;
      this.otherParamsSet2.add( this.keepIntegratedImagesCheckBox );
      this.otherParamsSet2.add( this.use_uwf_CheckBox );
      this.otherParamsSet2.add( this.monochrome_image_CheckBox );
      this.otherParamsSet2.add( this.unique_file_names_CheckBox );
      this.otherParamsSet2.add( this.batch_mode_CheckBox );

      // Other Group parameters.
      this.otherParamsGroupBox = new newGroupBox( this );
      this.otherParamsGroupBox.title = "Other parameters";
      this.otherParamsGroupBox.sizer = new HorizontalSizer;
      this.otherParamsGroupBox.sizer.margin = 6;
      this.otherParamsGroupBox.sizer.spacing = 4;
      this.otherParamsGroupBox.sizer.add( this.otherParamsSet1 );
      this.otherParamsGroupBox.sizer.add( this.otherParamsSet2 );
      // Stop columns of buttons moving as dialog expands horizontally.
      //this.otherParamsGroupBox.sizer.addStretch();
      
      // Weight calculations
      this.genericWeightRadioButton = new RadioButton( this );
      this.genericWeightRadioButton.text = "Generic";
      this.genericWeightRadioButton.checked = true;
      this.genericWeightRadioButton.onClick = function(checked) { 
            if (checked) { 
                  use_weight = 'G'; 
                  RemoveOption("Weight"); 
            }
      }

      this.noiseWeightRadioButton = new RadioButton( this );
      this.noiseWeightRadioButton.text = "Noise";
      this.noiseWeightRadioButton.checked = false;
      this.noiseWeightRadioButton.onClick = function(checked) { 
            if (checked) { 
                  use_weight = 'N'; 
                  SetOptionValue("Weight", "Noise"); 
            }
      }
      
      this.starWeightRadioButton = new RadioButton( this );
      this.starWeightRadioButton.text = "Stars";
      this.starWeightRadioButton.checked = false;
      this.starWeightRadioButton.onClick = function(checked) { 
            if (checked) { 
                  use_weight = 'S'; 
                  SetOptionValue("Weight", "Stars"); 
            }
      }

      this.weightHelpTips = new ToolButton( this );
      this.weightHelpTips.icon = this.scaledResource( ":/icons/help.png" );
      this.weightHelpTips.setScaledFixedSize( 20, 20 );
      var weightHelpToolTips =
            "<p>" +
            "Generic - Use both noise and stars for the weight calculation." +
            "</p><p>" +
            "Noise - More weight on image noise." +
            "</p><p>" +
            "Stars - More weight on stars." +
            "</p>";
      this.weightHelpTips.toolTip = weightHelpToolTips;

      this.weightGroupBox = new newGroupBox( this );
      this.weightGroupBox.title = "Image weight calculation settings";
      this.weightGroupBox.sizer = new HorizontalSizer;
      this.weightGroupBox.sizer.margin = 6;
      this.weightGroupBox.sizer.spacing = 4;
      this.weightGroupBox.sizer.add( this.genericWeightRadioButton );
      this.weightGroupBox.sizer.add( this.noiseWeightRadioButton );
      this.weightGroupBox.sizer.add( this.starWeightRadioButton );
      this.weightGroupBox.sizer.add( this.weightHelpTips );
      this.weightGroupBox.toolTip = weightHelpToolTips;
      // Stop columns of buttons moving as dialog expands horizontally.
      //this.weightGroupBox.sizer.addStretch();
      
      // Linear Fit buttons
      this.luminanceRadioButton = new RadioButton( this );
      this.luminanceRadioButton.text = "Luminance";
      this.luminanceRadioButton.checked = true;
      this.luminanceRadioButton.onClick = function(checked) { 
            if (checked) { 
                  use_linear_fit = 'L'; 
                  RemoveOption("Linear fit");
            }
      }

      this.redRadioButton = new RadioButton( this );
      this.redRadioButton.text = "Red";
      this.redRadioButton.checked = false;
      this.redRadioButton.onClick = function(checked) { 
            if (checked) { 
                  use_linear_fit = 'R'; 
                  SetOptionValue("Linear fit", "Red"); 
            }
      }
      
      this.greenRadioButton = new RadioButton( this );
      this.greenRadioButton.text = "Green";
      this.greenRadioButton.checked = false;
      this.greenRadioButton.onClick = function(checked) { 
            if (checked) { 
                  use_linear_fit = 'G'; 
                  SetOptionValue("Linear fit", "Green"); 
            }
      }
      
      this.blueRadioButton = new RadioButton( this );
      this.blueRadioButton.text = "Blue";
      this.blueRadioButton.checked = false;
      this.blueRadioButton.onClick = function(checked) { 
            if (checked) { 
                  use_linear_fit = 'B'; 
                  SetOptionValue("Linear fit", "Blue"); 
            }
      }

      this.noneRadioButton = new RadioButton( this );
      this.noneRadioButton.text = "No linear fit";
      this.noneRadioButton.checked = false;
      this.noneRadioButton.onClick = function(checked) { 
            if (checked) { 
                  use_linear_fit = 'no'; 
                  SetOptionValue("Linear fit", "No linear fit"); 
            }
      }

      this.linearFitGroupBox = new newGroupBox( this );
      this.linearFitGroupBox.title = "Linear fit setting";
      this.linearFitGroupBox.sizer = new HorizontalSizer;
      this.linearFitGroupBox.sizer.margin = 6;
      this.linearFitGroupBox.sizer.spacing = 4;
      this.linearFitGroupBox.sizer.add( this.luminanceRadioButton );
      this.linearFitGroupBox.sizer.add( this.redRadioButton );
      this.linearFitGroupBox.sizer.add( this.greenRadioButton );
      this.linearFitGroupBox.sizer.add( this.blueRadioButton );
      this.linearFitGroupBox.sizer.add( this.noneRadioButton );
      // Stop columns of buttons moving as dialog expands horizontally.
      //this.linearFitGroupBox.sizer.addStretch();

      //
      // Image integration
      //

      // normalization
      this.ImageIntegrationNormalizationLabel = new Label( this );
      this.ImageIntegrationNormalizationLabel.text = "Normalization";
      this.ImageIntegrationNormalizationLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
   
      this.ImageIntegrationNormalizationComboBox = new ComboBox( this );
      this.ImageIntegrationNormalizationComboBox.addItem( "Additive" );
      this.ImageIntegrationNormalizationComboBox.addItem( "Adaptive" );
      this.ImageIntegrationNormalizationComboBox.addItem( "None" );
      this.ImageIntegrationNormalizationComboBox.onItemSelected = function( itemIndex )
      {
            RemoveOption("ImageIntegration Normalization"); 
            switch (itemIndex) {
                  case 0:
                        SetOptionValue("ImageIntegration Normalization", "Additive"); 
                        break;
                  case 1:
                        SetOptionValue("ImageIntegration Normalization", "Adaptive"); 
                        break;
                  case 2:
                        SetOptionValue("ImageIntegration Normalization", "None"); 
                        break;
            }
            imageintegration_normalization = itemIndex;
      };
   
      this.ImageIntegrationNormalizationSizer = new HorizontalSizer;
      this.ImageIntegrationNormalizationSizer.spacing = 4;
      this.ImageIntegrationNormalizationSizer.add( this.ImageIntegrationNormalizationLabel );
      this.ImageIntegrationNormalizationSizer.add( this.ImageIntegrationNormalizationComboBox, 100 );

      // Pixel rejection algorihtm/clipping
      this.ImageIntegrationRejectionLabel = new Label( this );
      this.ImageIntegrationRejectionLabel.text = "Rejection";
      this.ImageIntegrationRejectionLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
   
      this.ImageIntegrationRejectionComboBox = new ComboBox( this );
      this.ImageIntegrationRejectionComboBox.addItem( "Auto1" );
      this.ImageIntegrationRejectionComboBox.addItem( "Auto2" );
      this.ImageIntegrationRejectionComboBox.addItem( "Percentile" );
      this.ImageIntegrationRejectionComboBox.addItem( "Sigma" );
      this.ImageIntegrationRejectionComboBox.addItem( "Winsorised sigma" );
      this.ImageIntegrationRejectionComboBox.addItem( "Averaged sigma" );
      this.ImageIntegrationRejectionComboBox.addItem( "Linear fit" );
      this.ImageIntegrationRejectionComboBox.onItemSelected = function( itemIndex )
      {
            RemoveOption("ImageIntegration Rejection"); 
            switch (itemIndex) {
                  case 0:
                        use_clipping = 'D1';
                        SetOptionValue("ImageIntegration Rejection", "Auto1"); 
                        break;
                  case 1:
                        use_clipping = 'D2';
                        SetOptionValue("ImageIntegration Rejection", "Auto2"); 
                        break;
                  case 2:
                        use_clipping = 'P';
                        SetOptionValue("ImageIntegration Rejection", "Percentile"); 
                        break;
                  case 3:
                        use_clipping = 'S';
                        SetOptionValue("ImageIntegration Rejection", "Sigma"); 
                        break;
                  case 4:
                        use_clipping = 'W';
                        SetOptionValue("ImageIntegration Rejection", "Winsorised sigma"); 
                        break;
                  case 5:
                        use_clipping = 'A';
                        SetOptionValue("ImageIntegration Rejection", "Averaged sigma"); 
                        break;
                  case 6:
                        use_clipping = 'L';
                        SetOptionValue("ImageIntegration Rejection", "Linear fit"); 
                        break;
            }
      };
   
      // Image integration
      this.ImageIntegrationRejectionSizer = new HorizontalSizer;
      this.ImageIntegrationRejectionSizer.spacing = 4;
      this.ImageIntegrationRejectionSizer.add( this.ImageIntegrationRejectionLabel );
      this.ImageIntegrationRejectionSizer.add( this.ImageIntegrationRejectionComboBox, 100 );

      this.ImageIntegrationHelpTips = new ToolButton( this );
      this.ImageIntegrationHelpTips.icon = this.scaledResource( ":/icons/help.png" );
      this.ImageIntegrationHelpTips.setScaledFixedSize( 20, 20 );
      var ImageIntegrationHelpToolTips = 
            "<p>" +
            "Auto1 - Default set 1 uses percentile clipping for less than 8 images " +
            "and sigma clipping otherwise." +
            "</p><p>" +
            "Auto2 - Default set 2 uses percentile clipping for 1-7 images, " +
            "averaged sigma clipping for 8 - 10 images, " +
            "winsorised sigma clipping for 11 - 19 images, " +
            "linear fit clipping for 20 - 24 images, " +
            "ESD clipping for more than 25 images" +
            "</p><p>" +
            "Percentile - Percentile clip" +
            "</p><p>" +
            "Sigma - Sigma clipping" +
            "</p><p>" +
            "Winsorised - Winsorised sigma clipping" +
            "</p><p>" +
            "Averaged - Averaged sigma clipping" +
            "</p><p>" +
            "Linear - Linear fit clipping" +
            "</p>";
      this.ImageIntegrationHelpTips.toolTip = ImageIntegrationHelpToolTips;
      this.clippingGroupBox = new newGroupBox( this );
      this.clippingGroupBox.title = "Image integration pixel rejection";
      this.clippingGroupBox.sizer = new HorizontalSizer;
      this.clippingGroupBox.sizer.margin = 6;
      this.clippingGroupBox.sizer.spacing = 4;
      this.clippingGroupBox.sizer.add( this.ImageIntegrationNormalizationSizer );
      this.clippingGroupBox.sizer.add( this.ImageIntegrationRejectionSizer );
      this.clippingGroupBox.sizer.add( this.ImageIntegrationHelpTips );
      this.clippingGroupBox.toolTip = ImageIntegrationHelpToolTips;
      // Stop columns of buttons moving as dialog expands horizontally.
      //this.clippingGroupBox.sizer.addStretch();

      // Narrowband palette

      var narrowbandToolTip = 
      "<p>" +
      "Color palette used to map SII, Ha and OIII to R, G and B" +
      "</p><p>" +
      "SHO - SII=R, Ha=G, OIII=B  (Hubble)<br>" +
      "HOS - Ha=R, OIII=G, SII=B (CFHT)<br>" +
      "HOO - Ha=R, OIII=G, OIII=B (if there is SII it is ignored)<br>" +
      "</p><p>" +
      "Other palettes can use any combination of channel images." +
      "</p><p>" +
      "Special keywords H, S, O, R, G and B are recognized and replaced " +
      "with corresponding channel image names. Otherwise these formulas " +
      "are passed directly to PixelMath process." +
      "</p>";

      this.narrowbandColorPaletteLabel = new Label( this );
      this.narrowbandColorPaletteLabel.text = "Color palette";
      this.narrowbandColorPaletteLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      this.narrowbandColorPaletteLabel.toolTip = narrowbandToolTip;

      this.narrowbandColorPalette_sizer = new HorizontalSizer;
      this.narrowbandColorPalette_sizer.margin = 6;
      this.narrowbandColorPalette_sizer.spacing = 4;
      this.narrowbandColorPalette_sizer.add( this.narrowbandColorPaletteLabel );

      /* Narrowband mappings. */
      this.narrowbandCustomPalette_ComboBox = new ComboBox( this );
      this.narrowbandCustomPalette_ComboBox.addItem( "SHO" );
      this.narrowbandCustomPalette_ComboBox.addItem( "HOS" );
      this.narrowbandCustomPalette_ComboBox.addItem( "HOO" );
      this.narrowbandCustomPalette_ComboBox.addItem( "Hubble" );
      this.narrowbandCustomPalette_ComboBox.addItem( "Pseudo RGB" );
      this.narrowbandCustomPalette_ComboBox.addItem( "Natural HOO" );
      this.narrowbandCustomPalette_ComboBox.addItem( "3-channel HOO" );
      this.narrowbandCustomPalette_ComboBox.addItem( "Dynamic SHO" );
      this.narrowbandCustomPalette_ComboBox.toolTip = narrowbandToolTip;
      this.narrowbandCustomPalette_ComboBox.onItemSelected = function( itemIndex )
      {
            switch (itemIndex) {
                  case 0:
                        this.dialog.narrowbandCustomPalette_R_ComboBox.editText = "S";
                        this.dialog.narrowbandCustomPalette_G_ComboBox.editText = "H";
                        this.dialog.narrowbandCustomPalette_B_ComboBox.editText = "O";
                        custom_R_mapping = this.dialog.narrowbandCustomPalette_R_ComboBox.editText;
                        custom_G_mapping = this.dialog.narrowbandCustomPalette_G_ComboBox.editText;
                        custom_B_mapping = this.dialog.narrowbandCustomPalette_B_ComboBox.editText;
                        break;
                  case 1:
                        this.dialog.narrowbandCustomPalette_R_ComboBox.editText = "H";
                        this.dialog.narrowbandCustomPalette_G_ComboBox.editText = "O";
                        this.dialog.narrowbandCustomPalette_B_ComboBox.editText = "S";
                        custom_R_mapping = this.dialog.narrowbandCustomPalette_R_ComboBox.editText;
                        custom_G_mapping = this.dialog.narrowbandCustomPalette_G_ComboBox.editText;
                        custom_B_mapping = this.dialog.narrowbandCustomPalette_B_ComboBox.editText;
                        break;
                  case 2:
                        this.dialog.narrowbandCustomPalette_R_ComboBox.editText = "H";
                        this.dialog.narrowbandCustomPalette_G_ComboBox.editText = "O";
                        this.dialog.narrowbandCustomPalette_B_ComboBox.editText = "O";
                        custom_R_mapping = this.dialog.narrowbandCustomPalette_R_ComboBox.editText;
                        custom_G_mapping = this.dialog.narrowbandCustomPalette_G_ComboBox.editText;
                        custom_B_mapping = this.dialog.narrowbandCustomPalette_B_ComboBox.editText;
                        break;
                  case 3:
                        this.dialog.narrowbandCustomPalette_R_ComboBox.editText = "0.6*S + 0.4*H";
                        this.dialog.narrowbandCustomPalette_G_ComboBox.editText = "0.7*H + 0.3*O";
                        this.dialog.narrowbandCustomPalette_B_ComboBox.editText = "O";
                        custom_R_mapping = this.dialog.narrowbandCustomPalette_R_ComboBox.editText;
                        custom_G_mapping = this.dialog.narrowbandCustomPalette_G_ComboBox.editText;
                        custom_B_mapping = this.dialog.narrowbandCustomPalette_B_ComboBox.editText;
                        break;
                  case 4:
                        this.dialog.narrowbandCustomPalette_R_ComboBox.editText = "0.75*H + 0.25*S";
                        this.dialog.narrowbandCustomPalette_G_ComboBox.editText = "0.50*S + 0.50*O";
                        this.dialog.narrowbandCustomPalette_B_ComboBox.editText = "0.30*H + 0.70*O";
                        custom_R_mapping = this.dialog.narrowbandCustomPalette_R_ComboBox.editText;
                        custom_G_mapping = this.dialog.narrowbandCustomPalette_G_ComboBox.editText;
                        custom_B_mapping = this.dialog.narrowbandCustomPalette_B_ComboBox.editText;
                        break;
                  case 5:
                        this.dialog.narrowbandCustomPalette_R_ComboBox.editText = "H";
                        this.dialog.narrowbandCustomPalette_G_ComboBox.editText = "0.8*O+0.2*H";
                        this.dialog.narrowbandCustomPalette_B_ComboBox.editText = "0.85*O + 0.15*H";
                        custom_R_mapping = this.dialog.narrowbandCustomPalette_R_ComboBox.editText;
                        custom_G_mapping = this.dialog.narrowbandCustomPalette_G_ComboBox.editText;
                        custom_B_mapping = this.dialog.narrowbandCustomPalette_B_ComboBox.editText;
                        break;
                  case 6:
                        this.dialog.narrowbandCustomPalette_R_ComboBox.editText = "0.76*H+0.24*S";
                        this.dialog.narrowbandCustomPalette_G_ComboBox.editText = "O";
                        this.dialog.narrowbandCustomPalette_B_ComboBox.editText = "0.85*O + 0.15*H";
                        custom_R_mapping = this.dialog.narrowbandCustomPalette_R_ComboBox.editText;
                        custom_G_mapping = this.dialog.narrowbandCustomPalette_G_ComboBox.editText;
                        custom_B_mapping = this.dialog.narrowbandCustomPalette_B_ComboBox.editText;
                        break;
                  case 7:
                        this.dialog.narrowbandCustomPalette_R_ComboBox.editText = "(O^~O)*S + ~(O^~O)*H";
                        this.dialog.narrowbandCustomPalette_G_ComboBox.editText = "((O*H)^~(O*H))*H + ~((O*H)^~(O*H))*O";
                        this.dialog.narrowbandCustomPalette_B_ComboBox.editText = "O";
                        custom_R_mapping = this.dialog.narrowbandCustomPalette_R_ComboBox.editText;
                        custom_G_mapping = this.dialog.narrowbandCustomPalette_G_ComboBox.editText;
                        custom_B_mapping = this.dialog.narrowbandCustomPalette_B_ComboBox.editText;
                        break;
            }
      };

      /* Create Editable boxes for R, G and B mapping. */
      this.narrowbandCustomPalette_R_Label = new Label( this );
      this.narrowbandCustomPalette_R_Label.text = "R";
      this.narrowbandCustomPalette_R_Label.textAlignment = TextAlign_Right|TextAlign_VertCenter;
      this.narrowbandCustomPalette_R_Label.toolTip = narrowbandToolTip;
      this.narrowbandCustomPalette_R_ComboBox = new ComboBox( this );
      this.narrowbandCustomPalette_R_ComboBox.enabled = true;
      this.narrowbandCustomPalette_R_ComboBox.editEnabled = true;
      this.narrowbandCustomPalette_R_ComboBox.addItem(custom_R_mapping);
      this.narrowbandCustomPalette_R_ComboBox.addItem("0.75*H + 0.25*S");
      this.narrowbandCustomPalette_R_ComboBox.toolTip = narrowbandToolTip;
      this.narrowbandCustomPalette_R_ComboBox.onEditTextUpdated = function() { 
            custom_R_mapping = this.editText.trim(); 
            SetOptionValue("Narrowband R mapping", this.editText); 
      };

      this.narrowbandCustomPalette_G_Label = new Label( this );
      this.narrowbandCustomPalette_G_Label.text = "G";
      this.narrowbandCustomPalette_G_Label.textAlignment = TextAlign_Right|TextAlign_VertCenter;
      this.narrowbandCustomPalette_G_Label.toolTip = narrowbandToolTip;
      this.narrowbandCustomPalette_G_ComboBox = new ComboBox( this );
      this.narrowbandCustomPalette_G_ComboBox.enabled = true;
      this.narrowbandCustomPalette_G_ComboBox.editEnabled = true;
      this.narrowbandCustomPalette_G_ComboBox.addItem(custom_G_mapping);
      this.narrowbandCustomPalette_G_ComboBox.addItem("0.50*S + 0.50*O");
      this.narrowbandCustomPalette_G_ComboBox.toolTip = narrowbandToolTip;
      this.narrowbandCustomPalette_G_ComboBox.onEditTextUpdated = function() { 
            custom_G_mapping = this.editText.trim(); 
            SetOptionValue("Narrowband G mapping", this.editText); 
      };

      this.narrowbandCustomPalette_B_Label = new Label( this );
      this.narrowbandCustomPalette_B_Label.text = "B";
      this.narrowbandCustomPalette_B_Label.textAlignment = TextAlign_Right|TextAlign_VertCenter;
      this.narrowbandCustomPalette_B_Label.toolTip = narrowbandToolTip;
      this.narrowbandCustomPalette_B_ComboBox = new ComboBox( this );
      this.narrowbandCustomPalette_B_ComboBox.enabled = true;
      this.narrowbandCustomPalette_B_ComboBox.editEnabled = true;
      this.narrowbandCustomPalette_B_ComboBox.addItem(custom_B_mapping);
      this.narrowbandCustomPalette_B_ComboBox.addItem("0.30*H + 0.70*O");
      this.narrowbandCustomPalette_B_ComboBox.toolTip = narrowbandToolTip;
      this.narrowbandCustomPalette_B_ComboBox.onEditTextUpdated = function() { 
            custom_B_mapping = this.editText.trim(); 
            SetOptionValue("Narrowband B mapping", this.editText); 
      };

      this.narrowbandCustomPalette_Sizer = new HorizontalSizer;
      this.narrowbandCustomPalette_Sizer.spacing = 4;
      this.narrowbandCustomPalette_Sizer.toolTip = narrowbandToolTip;
      this.narrowbandCustomPalette_Sizer.add( this.narrowbandCustomPalette_ComboBox );
      this.narrowbandCustomPalette_Sizer.add( this.narrowbandCustomPalette_R_Label );
      this.narrowbandCustomPalette_Sizer.add( this.narrowbandCustomPalette_R_ComboBox );
      this.narrowbandCustomPalette_Sizer.add( this.narrowbandCustomPalette_G_Label );
      this.narrowbandCustomPalette_Sizer.add( this.narrowbandCustomPalette_G_ComboBox );
      this.narrowbandCustomPalette_Sizer.add( this.narrowbandCustomPalette_B_Label );
      this.narrowbandCustomPalette_Sizer.add( this.narrowbandCustomPalette_B_ComboBox );
      this.narrowbandCustomPalette_Sizer.addStretch();

      this.mapping_on_linear_data_CheckBox = newCheckBox(this, "Narrowband mapping using linear data", mapping_on_linear_data, 
            "<p>" +
            "Do narrowband mapping using linear data. Linear fit is run on data before combining RBG image using PixelMath. " +
            "Combined RGB image is later stretched to non-linear." + 
            "</p><p>" +
            "By default images are stretched to non-linear before combining with PixelMath." +
            "</p>" );
      this.mapping_on_linear_data_CheckBox.onClick = function(checked) { 
            mapping_on_linear_data = checked; 
            SetOptionChecked("Narrowband mapping using linear data", checked); 
      }

      this.HalphaLabel = new Label( this );
      this.HalphaLabel.text = "Ha to RGB";
      this.HalphaLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      this.HalphaLabel.toolTip = "<p>Where to map H-alpha channel in RGB image.</p>";
      this.HalphaComboBox = new ComboBox( this );
      this.HalphaComboBox.addItem( "R" );
      this.HalphaComboBox.addItem( "L" );
      this.HalphaComboBox.addItem( "L,R" );
      this.HalphaComboBox.onItemSelected = function( itemIndex )
      {
            RemoveOption("Ha to RGB");
            switch (itemIndex) {
                  case 0:
                        SetOptionValue("Ha to RGB", "R"); 
                        Halpha_RGB_mapping = 'R';
                        break;
                  case 1:
                        SetOptionValue("Ha to RGB", "L"); 
                        Halpha_RGB_mapping = 'L';
                        break;
                  case 2:
                        SetOptionValue("Ha to RGB", "L and R"); 
                        Halpha_RGB_mapping = 'LR';
                        break;
            }
      };
      this.HalphaSizer = new HorizontalSizer;
      this.HalphaSizer.spacing = 4;
      this.HalphaSizer.add( this.HalphaLabel );
      this.HalphaSizer.add( this.HalphaComboBox );
      this.HalphaSizer.addStretch();

      this.NbRGBLabel = new Label( this );
      this.NbRGBLabel.text = "RGB mapping";
      this.NbRGBLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      this.NbRGBLabel.toolTip = "<p>How to map narrowband channels in RGB image if both are present. Channels are mapped using the color palette choice " +
                                "except when only Ha is available. Then Ha is mapped as specified in Ha to RGB mapping.</p>" +
                                "<p>- max means that max pixel value of Narrowband or RGB is used. Works only with SHO, HOS and HOO palettes.</p>" +
                                "<p>- custom means that narrowband files are mapped as in narrowband color palette section.</p>";
      this.NbRGBComboBox = new ComboBox( this );
      this.NbRGBComboBox.addItem( "max" );
      this.NbRGBComboBox.addItem( "custom" );
      this.NbRGBComboBox.onItemSelected = function( itemIndex )
      {
            RemoveOption("Narrowband to RGB");
            switch (itemIndex) {
                  case 0:
                        SetOptionValue("Narrowband to RGB", "max(NB,R)"); 
                        narrowband_RGB_mapping = 'max';
                        break;
                  case 1:
                        SetOptionValue("Narrowband to RGB", "custom"); 
                        narrowband_RGB_mapping = 'custom';
                        break;
            }
      };
      this.NbRGBSizer = new HorizontalSizer;
      this.NbRGBSizer.spacing = 4;
      this.NbRGBSizer.add( this.NbRGBLabel );
      this.NbRGBSizer.add( this.NbRGBComboBox );
      this.NbRGBSizer.addStretch();

      this.max_linear_fit_CheckBox = newCheckBox(this, "No linear fit before max()", skip_max_linear_fit, 
      "<p>Do not use linear fit before applying max() on Narrowband to RGB.</p>" );
      this.max_linear_fit_CheckBox.onClick = function(checked) { 
            skip_max_linear_fit = checked; 
            SetOptionChecked("No linear fit before max()", checked); 
      }

      this.NbRGBmapping_sizer1 = new VerticalSizer;
      this.NbRGBmapping_sizer1.margin = 6;
      this.NbRGBmapping_sizer1.spacing = 4;
      this.NbRGBmapping_sizer1.add( this.NbRGBSizer );
      this.NbRGBmapping_sizer1.add( this.max_linear_fit_CheckBox );

      this.NbRGBmapping_sizer2 = new VerticalSizer;
      this.NbRGBmapping_sizer2.margin = 6;
      this.NbRGBmapping_sizer2.spacing = 4;
      this.NbRGBmapping_sizer2.add( this.HalphaSizer );

      this.NbRGBmapping_sizer = new HorizontalSizer;
      this.NbRGBmapping_sizer.add( this.NbRGBmapping_sizer1 );
      this.NbRGBmapping_sizer.add( this.NbRGBmapping_sizer2 );
      this.NbRGBmapping_sizer.addStretch();

      // Button to continue narrowband from existing files
      this.autoContinueNarrowbandButton = new PushButton( this );
      this.autoContinueNarrowbandButton.text = "AutoContinue narrowband";
      this.autoContinueNarrowbandButton.toolTip = 
            "AutoContinue narrowband - Run automatic processing from previously created narrowband images." +
            "<p>" +
            "Image check order is:<br>" +
            "RGB_HT<br>" +
            "Integration_RGB_BE<br>" +
            "Integration_H_BE + Integration_O_BE + Integration_S_BE<br>" +
            "Integration_H + Integration_O + Integration_S<br>" +
            "Final image (for extra processing)" +
            "</p>";
      this.autoContinueNarrowbandButton.onClick = function()
      {
            console.writeln("autoContinue narrowband");
            try {
                  autocontinue_narrowband = true;
                  AutoIntegrateEngine(true);
                  autocontinue_narrowband = false;
            } 
            catch(err) {
                  console.criticalln(err);
                  console.criticalln("Processing stopped!");
                  writeProcessingSteps(null, true);
                  autocontinue_narrowband = false;
            }
      };   

      this.narrowbandAutoContinue_sizer = new HorizontalSizer;
      this.narrowbandAutoContinue_sizer.margin = 6;
      this.narrowbandAutoContinue_sizer.spacing = 4;
      this.narrowbandAutoContinue_sizer.add( this.autoContinueNarrowbandButton );
      this.narrowbandAutoContinue_sizer.addStretch();
      
      this.narrowbandGroupBox = new newGroupBox( this );
      this.narrowbandGroupBox.title = "Narrowband processing";
      this.narrowbandGroupBox.sizer = new VerticalSizer;
      this.narrowbandGroupBox.sizer.margin = 6;
      this.narrowbandGroupBox.sizer.spacing = 4;
      this.narrowbandGroupBox.sizer.add( this.narrowbandColorPalette_sizer );
      this.narrowbandGroupBox.sizer.add( this.narrowbandCustomPalette_Sizer );
      this.narrowbandGroupBox.sizer.add( this.mapping_on_linear_data_CheckBox );
      this.narrowbandGroupBox.sizer.add( this.NbRGBmapping_sizer );
      this.narrowbandGroupBox.sizer.add( this.narrowbandAutoContinue_sizer );

      // Narrowband extra processing
      this.fix_narrowband_star_color_CheckBox = newCheckBox(this, "Fix star colors", fix_narrowband_star_color, 
      "<p>Fix magenta color on stars typically seen with SHO color palette. If all green is not removed from the image then a mask use used to fix only stars. " + 
      "Also run with AutoContinue narrowband and Extra processing.</p>" );
      this.fix_narrowband_star_color_CheckBox.onClick = function(checked) { 
            fix_narrowband_star_color = checked; 
            SetOptionChecked("Fix star colors", checked); 
      }
      this.narrowband_hue_shift_CheckBox = newCheckBox(this, "Hue shift for more orange", run_hue_shift, 
      "<p>Do hue shift to enhance orange color. Useful with SHO color palette. Also run with AutoContinue narrowband and Extra processing.</p>" );
      this.narrowband_hue_shift_CheckBox.onClick = function(checked) { 
            run_hue_shift = checked; 
            SetOptionChecked("Hue shift for more orange", checked); 
      }
      this.narrowband_leave_some_green_CheckBox = newCheckBox(this, "Leave some green", leave_some_green, 
      "<p>Leave some green color on image when running SCNR. Useful with SHO color palette. " +
      "Also run with AutoContinue narrowband and Extra processing.</p>" );
      this.narrowband_leave_some_green_CheckBox.onClick = function(checked) { 
            leave_some_green = checked; 
            SetOptionChecked("Leave some green", checked); 
      }
      this.run_narrowband_SCNR_CheckBox = newCheckBox(this, "Remove green cast", run_narrowband_SCNR, 
      "<p>Run SCNR to remove green cast. Useful with SHO color palette. Also run with AutoContinue narrowband and Extra processing.</p>" );
      this.run_narrowband_SCNR_CheckBox.onClick = function(checked) { 
            run_narrowband_SCNR = checked; 
            SetOptionChecked("Remove green cast", checked); 
      }
      this.no_star_fix_mask_CheckBox = newCheckBox(this, "No mask when fixing star colors", skip_star_fix_mask, 
      "<p>Do not use star mask when fixing star colors</p>" );
      this.no_star_fix_mask_CheckBox.onClick = function(checked) { 
            skip_star_fix_mask = checked; 
            SetOptionChecked("No mask when fixing star colors", checked); 
      }

      this.narrowbandOptions1_sizer = new VerticalSizer;
      this.narrowbandOptions1_sizer.margin = 6;
      this.narrowbandOptions1_sizer.spacing = 4;
      this.narrowbandOptions1_sizer.add( this.narrowband_hue_shift_CheckBox );
      this.narrowbandOptions1_sizer.add( this.run_narrowband_SCNR_CheckBox );
      this.narrowbandOptions1_sizer.add( this.narrowband_leave_some_green_CheckBox );

      this.narrowbandOptions2_sizer = new VerticalSizer;
      this.narrowbandOptions2_sizer.margin = 6;
      this.narrowbandOptions2_sizer.spacing = 4;
      this.narrowbandOptions2_sizer.add( this.fix_narrowband_star_color_CheckBox );
      this.narrowbandOptions2_sizer.add( this.no_star_fix_mask_CheckBox );

      this.narrowbandExtraGroupBox = new newGroupBox( this );
      this.narrowbandExtraGroupBox.title = "Extra processing for narrowband";
      this.narrowbandExtraGroupBox.sizer = new HorizontalSizer;
      this.narrowbandExtraGroupBox.sizer.margin = 6;
      this.narrowbandExtraGroupBox.sizer.spacing = 4;
      this.narrowbandExtraGroupBox.sizer.add( this.narrowbandOptions1_sizer );
      this.narrowbandExtraGroupBox.sizer.add( this.narrowbandOptions2_sizer );
      this.narrowbandExtraGroupBox.toolTip = 
            "<p>" +
            "Extra processing options to be applied on narrowband images. "+
            "They are applied before other extra processing options in the following order:" +
            "</p><p>" +
            "1. Hue shift for more orange<br>" +
            "2. Remove green cast and Leave some green<br>" +
            "3. Fix star colors" +
            "</p>";



      // Extra processing
      this.extraDarkerBackground_CheckBox = newCheckBox(this, "Darker background", extra_darker_background, 
      "<p>Make image background darker.</p>" );
      this.extraDarkerBackground_CheckBox.onClick = function(checked) { 
            extra_darker_background = checked; 
            SetOptionChecked("Darker background", checked); 
      }
      this.extra_HDRMLT_CheckBox = newCheckBox(this, "HDRMultiscaleTansform", extra_HDRMLT, 
      "<p>Run HDRMultiscaleTansform on image.</p>" );
      this.extra_HDRMLT_CheckBox.onClick = function(checked) { 
            extra_HDRMLT = checked; 
            SetOptionChecked("HDRMultiscaleTansform", checked); 
      }
      this.extra_LHE_CheckBox = newCheckBox(this, "LocalHistogramEqualization", extra_LHE, 
      "<p>Run LocalHistogramEqualization on image.</p>" );
      this.extra_LHE_CheckBox.onClick = function(checked) { 
            extra_LHE = checked; 
            SetOptionChecked("LocalHistogramEqualization", checked); 
      }
      this.extra_Contrast_CheckBox = newCheckBox(this, "Add contrast", extra_contrast, 
      "<p>Run LocalHistogramEqualization on image.</p>" );
      this.extra_Contrast_CheckBox.onClick = function(checked) { 
            extra_contrast = checked; 
            SetOptionChecked("Add contrast", checked); 
      }
      this.extra_STF_CheckBox = newCheckBox(this, "Auto STF", extra_STF, 
      "<p>Run automatic ScreenTransferFunction on final image to brighten it.</p>" );
      this.extra_STF_CheckBox.onClick = function(checked) { 
            extra_STF = checked; 
            SetOptionChecked("Run STF", checked); 
      }
      this.extra_SmallerStars_CheckBox = newCheckBox(this, "Smaller stars", extra_smaller_stars, 
      "<p>Make stars smaller on image.</p>" );
      this.extra_SmallerStars_CheckBox.onClick = function(checked) { 
            extra_smaller_stars = checked; 
            SetOptionChecked("Smaller stars", checked); 
      }
      this.IterationsSpinBox = new SpinBox( this );
      this.IterationsSpinBox.minValue = 1;
      this.IterationsSpinBox.maxValue = 10;
      this.IterationsSpinBox.value = extra_smaller_stars_iterations;
      this.IterationsSpinBox.toolTip = "<p>Number of iterations when reducing star sizes.</p>";
      this.IterationsSpinBox.onValueUpdated = function( value )
      {
            extra_smaller_stars_iterations = value;
            SetOptionValue("Smaller stars iterations", value);
      };
      this.IterationsLabel = new Label( this );
      this.IterationsLabel.text = "iterations";
      this.IterationsLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      this.IterationsLabel.toolTip = this.IterationsSpinBox.toolTip;
      this.SmallerStarsSizer = new HorizontalSizer;
      this.SmallerStarsSizer.spacing = 4;
      this.SmallerStarsSizer.add( this.extra_SmallerStars_CheckBox );
      this.SmallerStarsSizer.add( this.IterationsSpinBox );
      this.SmallerStarsSizer.add( this.IterationsLabel );
      this.SmallerStarsSizer.toolTip = this.IterationsSpinBox.toolTip;
      this.SmallerStarsSizer.addStretch();

      this.extraImageLabel = new Label( this );
      this.extraImageLabel.text = "Target image";
      this.extraImageLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      this.extraImageLabel.toolTip = "<p>Target image for extra processing.</p>";
      this.extraImageComboBox = new ComboBox( this );
      var windowList = getWindowListReverse();
      windowList.unshift("Auto");
      for (var i = 0; i < windowList.length; i++) {
            this.extraImageComboBox.addItem( windowList[i] );
      }
      extra_target_image = windowList[0];
      this.extraImageComboBox.onItemSelected = function( itemIndex )
      {
            SetOptionValue("Extra processing target image", windowList[itemIndex]);
            extra_target_image = windowList[itemIndex];
      };
      this.extraApplyButton = new PushButton( this );
      this.extraApplyButton.text = "Apply";
      this.extraApplyButton.toolTip = 
            "Apply extra processing on the selected image.";
      this.extraApplyButton.onClick = function()
      {
            if (!is_extra_option() && !is_narrowband_option()) {
                  console.criticalln("No extra processing option selected!");
            } else if (extra_target_image == null) {
                  console.criticalln("No image!");
            } else if (extra_target_image == "Auto") {
                  console.criticalln("Auto target image cannot be used with Apply button!");
            } else {
                  console.writeln("Apply extra processing directly on " + extra_target_image);
                  try {
                        narrowband = is_narrowband_option();
                        extraProcessingEngine(extra_target_image);
                        narrowband = false;
                  } 
                  catch(err) {
                        console.criticalln(err);
                        console.criticalln("Processing stopped!");
                        narrowband = false;
                  }
            }
      };   

      this.extraImageSizer = new HorizontalSizer;
      this.extraImageSizer.spacing = 4;
      this.extraImageSizer.add( this.extraImageLabel );
      this.extraImageSizer.add( this.extraImageComboBox );
      this.extraImageSizer.add( this.extraApplyButton );
      //this.extraImageSizer.addStretch();

      this.extra1 = new VerticalSizer;
      this.extra1.margin = 6;
      this.extra1.spacing = 4;
      this.extra1.add( this.extraDarkerBackground_CheckBox );
      this.extra1.add( this.extra_HDRMLT_CheckBox );
      this.extra1.add( this.extra_LHE_CheckBox );

      this.extra2 = new VerticalSizer;
      this.extra2.margin = 6;
      this.extra2.spacing = 4;
      this.extra2.add( this.extra_Contrast_CheckBox );
      this.extra2.add( this.extra_STF_CheckBox );
      this.extra2.add( this.SmallerStarsSizer );

      this.extraGroupBoxSizer = new HorizontalSizer;
      this.extraGroupBoxSizer.margin = 6;
      this.extraGroupBoxSizer.spacing = 4;
      this.extraGroupBoxSizer.add( this.extra1 );
      this.extraGroupBoxSizer.add( this.extra2 );

      this.extraGroupBox = new newGroupBox( this );
      this.extraGroupBox.title = "Extra processing";
      this.extraGroupBox.sizer = new VerticalSizer;
      this.extraGroupBox.sizer.margin = 6;
      this.extraGroupBox.sizer.spacing = 4;
      this.extraGroupBox.sizer.add( this.extraGroupBoxSizer );
      this.extraGroupBox.sizer.add( this.extraImageSizer );
      this.extraGroupBox.toolTip = 
            "<p>" +
            "In case of Run or AutoContinue or AutoContinue narrowband " + 
            "extra processing options are always applied to a copy of the final image. " + 
            "A new image is created with _extra added to the name. " + 
            "For example if the final image is AutoLRGB then a new image AutoLRGB_extra is created. " + 
            "AutoContinue or AutoContinue narrowband can be used to apply extra processing after the final image is created. " +
            "</p><p>" +
            "In case of Apply button extra processing is run directly on the selected image. " +
            "</p><p>" +
            "Both extra processing options and narrowband processing options are applied to the image. If some of the " +
            "narrowband options are selected then image is assumed to be narrowband." +
            "</p><p>" +
            "If multiple extra processing options are selected they are executed in the following order" +
            "</p><p>" +
            "1. Darker background<br>" +
            "2. HDRMultiscaleTansform<br>" +
            "3. LocalHistogramEqualization<br>" +
            "4. Add contrast<br>" +
            "5. Smaller stars" +
            "With Smaller stars the number of iterations can be given. More iterations will generate smaller stars." +
            "</p><p>" +
            "If narrowband processing options are selected they are applied before extra processing options." +
            "</p>";

      // Button to run automatic processing
      this.autoRunButton = new PushButton( this );
      this.autoRunButton.text = "AutoRun";
      this.autoRunButton.toolTip = "Run automatic integrate.";
      this.autoRunButton.onClick = function()
      {
            Autorun(this);
      };   

      // Button to continue LRGB from existing files
      this.autoContinueButton = new PushButton( this );
      this.autoContinueButton.text = "AutoContinue";
      this.autoContinueButton.toolTip = 
            "AutoContinue - Run automatic processing from previously created LRGB or Color images." +
            "<p>" +
            "Image check order is:<br>" +
            "L_HT + RGB_HT<br>" +
            "RGB_HT<br>" +
            "Integration_L_BE + Integration_RGB_BE<br>" +
            "Integration_RGB_BE<br>" +
            "Integration_L_BE + Integration_R_BE + Integration_G_BE + Integration_B_BE<br>" +
            "Integration_L + Integration_R + Integration_G + Integration_B<br>" +
            "Final image (for extra processing)" +
            "</p>";
      this.autoContinueButton.onClick = function()
      {
            console.writeln("autoContinue");
            try {
                  autocontinue_narrowband = is_narrowband_option();
                  AutoIntegrateEngine(true);
                  autocontinue_narrowband = false;
            } 
            catch(err) {
                  console.criticalln(err);
                  console.criticalln("Processing stopped!");
                  writeProcessingSteps(null, true);
                  autocontinue_narrowband = false;
            }
      };   

      // Button to close all windows
      this.closeAllButton = new PushButton( this );
      this.closeAllButton.text = "Close all";
      this.closeAllButton.toolTip = "Close all - Close all image windows created by this script";
      this.closeAllButton.onClick = function()
      {
            console.writeln("closeAll");
            closeAllWindows();
      };

      // Group box for AutoRun, AutoContinue and CloseAll
      this.autoButtonSizer = new HorizontalSizer;
      this.autoButtonSizer.add( this.autoRunButton );
      this.autoButtonSizer.addSpacing( 4 );
      this.autoButtonSizer.add( this.autoContinueButton );
      this.autoButtonSizer.addSpacing( 4 );
      this.autoButtonSizer.add( this.closeAllButton );
      this.autoButtonGroupBox = new newGroupBox( this );
      this.autoButtonGroupBox.sizer = new HorizontalSizer;
      this.autoButtonGroupBox.sizer.margin = 6;
      this.autoButtonGroupBox.sizer.spacing = 4;
      this.autoButtonGroupBox.sizer.add( this.autoButtonSizer );
      this.autoButtonGroupBox.setFixedHeight(60);

      // Buttons for mosaic save
      this.mosaicSaveXisfButton = new PushButton( this );
      this.mosaicSaveXisfButton.text = "XISF";
      this.mosaicSaveXisfButton.onClick = function()
      {
            console.writeln("Save XISF");
            saveAllMosaicWindows(32);
      };   
      this.mosaicSave16bitButton = new PushButton( this );
      this.mosaicSave16bitButton.text = "16 bit TIFF";
      this.mosaicSave16bitButton.onClick = function()
      {
            console.writeln("Save 16 bit TIFF");
            saveAllMosaicWindows(16);
      };   
      this.mosaicSave8bitButton = new PushButton( this );
      this.mosaicSave8bitButton.text = "8 bit TIFF";
      this.mosaicSave8bitButton.onClick = function()
      {
            console.writeln("Save 8 bit TIFF");
            saveAllMosaicWindows(8);
      };   
      this.mosaicSaveSizer = new HorizontalSizer;
      this.mosaicSaveSizer.add( this.mosaicSaveXisfButton );
      this.mosaicSaveSizer.addSpacing( 4 );
      this.mosaicSaveSizer.add( this.mosaicSave16bitButton );
      this.mosaicSaveSizer.addSpacing( 4 );
      this.mosaicSaveSizer.add( this.mosaicSave8bitButton );
      this.mosaicSaveGroupBox = new newGroupBox( this );
      this.mosaicSaveGroupBox.title = "Save batch result files";
      this.mosaicSaveGroupBox.sizer = new HorizontalSizer;
      this.mosaicSaveGroupBox.sizer.margin = 6;
      this.mosaicSaveGroupBox.sizer.spacing = 4;
      this.mosaicSaveGroupBox.sizer.add( this.mosaicSaveSizer );
      this.mosaicSaveGroupBox.setFixedHeight(60);

      // OK and Cancel buttons
      this.ok_Button = new PushButton( this );
      this.ok_Button.text = "Run";
      this.ok_Button.icon = this.scaledResource( ":/icons/power.png" );
      this.ok_Button.onClick = function()
      {
         Autorun(this);
      };
   
      this.cancel_Button = new PushButton( this );
      this.cancel_Button.text = "Exit";
      this.cancel_Button.icon = this.scaledResource( ":/icons/close.png" );
      this.cancel_Button.onClick = function()
      {
         this.dialog.cancel();
      };
   
      this.buttons_Sizer = new HorizontalSizer;
      this.buttons_Sizer.spacing = 6;
      this.buttons_Sizer.addStretch();
      this.buttons_Sizer.add( this.ok_Button );
      this.buttons_Sizer.add( this.cancel_Button );
   
      this.helpLabelSizer = new HorizontalSizer;
      this.helpLabelSizer.add( this.helpLabel );
      this.helpLabelSizer.addSpacing( 4 );
      this.helpLabelSizer.add( this.helpTips );
      this.helpLabelGroupBox = new newGroupBox( this );
      this.helpLabelGroupBox.sizer = new HorizontalSizer;
      this.helpLabelGroupBox.sizer.margin = 6;
      this.helpLabelGroupBox.sizer.spacing = 4;
      this.helpLabelGroupBox.sizer.add( this.helpLabelSizer );
      this.helpLabelGroupBox.setFixedHeight(50);
      this.helpLabelGroupBox.toolTip = mainHelpTips;

      this.col1 = new VerticalSizer;
      this.col1.margin = 6;
      this.col1.spacing = 6;
      this.col1.add( this.imageParamsGroupBox );
      this.col1.add( this.otherParamsGroupBox );
      this.col1.add( this.narrowbandGroupBox );
      this.col1.add( this.mosaicSaveGroupBox );

      this.col2 = new VerticalSizer;
      this.col2.margin = 6;
      this.col2.spacing = 6;
      this.col2.add( this.saturationGroupBox );
      this.col2.add( this.weightGroupBox );
      this.col2.add( this.linearFitGroupBox );
      this.col2.add( this.clippingGroupBox );
      this.col2.add( this.narrowbandExtraGroupBox );
      this.col2.add( this.extraGroupBox );
      this.col2.add( this.autoButtonGroupBox );

      this.cols = new HorizontalSizer;
      this.cols.margin = 6;
      this.cols.spacing = 6;
      this.cols.add( this.col1 );
      this.cols.add( this.col2 );

      this.sizer = new VerticalSizer;
      this.sizer.add( this.helpLabelGroupBox );
      this.sizer.add( this.files_GroupBox, 300 );
      this.sizer.margin = 6;
      this.sizer.spacing = 6;
      this.sizer.add( this.cols );
      this.sizer.add( this.buttons_Sizer );

      this.windowTitle = "AutoIntegrate Script";
      this.userResizable = true;
      this.adjustToContents();
      //this.helpLabel.setFixedHeight();
      this.files_GroupBox.setFixedHeight();

      console.show(false);
}

AutoIntegrateDialog.prototype = new Dialog;

function main()
{
      var dialog = new AutoIntegrateDialog();

      dialog.execute();
}

main();
