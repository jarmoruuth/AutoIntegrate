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

NOTE! These steps may not be updated with recent changes. They do describe the basic
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
2. Optionally linear defect detection is run to find column and row defects. Defect information
   is used by the CosmeticCorrection.
3. By default run CosmeticCorrection for each file.
4. SubframeSelector is run on files to measure and generate SSWEIGHT for
   each file. Output is *_a.xisf files.
5. Files are scanned and the file with highest SSWEIGHT is selected as a
   reference.
6. StarAlign is run on all files and *_a_r.xisf files are
   generated.
7. Optionally there is LocalNormalization on all files but
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
6. If ABE_before_channel_combination is selected then ABE is run on each color channel (R,G,B). 
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
- Linear fit for can be used for R, G or B channels. In that case script runs linked STF 
  stretch. Default is to use unlinked STF stretch for narrpwband files.
- PixelMath expression can chosen from a list or edited manually for custom blending.
  Pixelmath expressions can also include RGB channels.

Narrowband to RGB mapping
-------------------------

A special processing is used for narrowband to (L)RGB image mapping. It is used 
to enhance (L)RGB channels with narrowband data. It cannot be used without RGB filters.
This mapping is similar to NBRGBCombination script in Pixinsight or as described in 
Light Vortex Astronomy tutorial Combining LRGB with Narrowband. You can find more 
details on parameters from those sources.

Common final steps for all images
---------------------------------

1. SCNR is run on to reduce green cast.
2. MultiscaleLinearTransform is run to sharpen the image. A mask is used to target
   sharpening more on the light parts of the image.
3. Extra windows are closed or minimized.

Credits and Copyright notices
-----------------------------

PixInsight scripts that come with the product were a great help.
Web site Light Vortex Astronomy (http://www.lightvortexastronomy.com/)
was a great place to find details and best practises when using PixInsight.

Routines ApplyAutoSTF and applySTF are from PixInsight scripts that are 
distributed with Pixinsight. 

Routines for Linear Defect Detection are from PixInsight scripts 
LinearDefectDetection.js and CommonFunctions.jsh that is distributed 
with Pixinsight. 

This product is based on software from the PixInsight project, developed
by Pleiades Astrophoto and its contributors (https://pixinsight.com/).

Copyright (c) 2018-2021 Jarmo Ruuth. All Rights Reserved.

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
#include <pjsr/ImageOp.jsh>

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
var LRGBCombination_lightness = 0.5;
var LRGBCombination_saturation = 0.5;
var strict_StarAlign = false;
var keep_integrated_images = false;
var keep_temporary_images = false;
var run_HT = true;
var ABE_before_channel_combination = false;
var use_ABE_on_L_RGB = false;
var color_calibration_before_ABE = false;
var use_background_neutralization = false;
var use_drizzle = false;
var batch_mode = false;
var batch_narrowband_palette_mode = false;
var use_uwf = false;
var monochrome_image = false;
var synthetic_l_image = false;
var RRGB_image = false;
var synthetic_missing_images = false;
var force_file_name_filter = false;
var unique_file_names = false;
var skip_noise_reduction = false;
var skip_color_noise_reduction = false;
var stronger_noise_reduction = false;
var noise_reduction_before_HistogramTransform = true;
var narrowband = false;
var autocontinue_narrowband = false;
var linear_fit_done = false;
var is_luminance_images = false;    // Do we have luminance files from autocontinue or FITS
var STF_linking = 0;                // 0 = auto, 1 = linked, 2 = unlinked
var image_stretching = 'STF';
var MaskedStretch_targetBackground = 0.125;
var fix_column_defects = false;
var fix_row_defects = false;
var cosmetic_sorrection_hot_sigma = 3;
var cosmetic_sorrection_cold_sigma = 3;

var fix_narrowband_star_color = false;
var run_hue_shift = false;
var run_narrowband_SCNR = false;
var leave_some_green = false;
var skip_star_fix_mask = false;

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
var custom_L_mapping = "L";
var mapping_on_nonlinear_data = false;
var narrowband_linear_fit = "Auto";

var extra_StarNet = false;
var extra_darker_background = false;
var extra_HDRMLT= false;
var extra_LHE = false;
var extra_smaller_stars = false;
var extra_smaller_stars_iterations = 1;
var extra_contrast = false;
var extra_STF = false;
var extra_target_image = null;
var skip_mask_contrast = false;

/* RGBNB mapping. */
var use_RGBNB_Mapping = false;
var use_RGB_image = false;
var L_BoostFactor = 1.2;
var R_BoostFactor = 1.2;
var G_BoostFactor = 1.2;
var B_BoostFactor = 1.2;
var L_mapping = 'H';
var R_mapping = 'H';
var G_mapping = 'O';
var B_mapping = 'O';
//var RGB_bandwidth = 300;
var L_bandwidth = 100;
var R_bandwidth = 100;
var G_bandwidth = 100;
var B_bandwidth = 100;
var H_bandwidth = 7;
var S_bandwidth = 8.5;
var O_bandwidth = 8.5;

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
      "Integration_RGB_ABE_NB",
      "Integration_L_ABE_HT",
      "Integration_RGB_ABE_HT",
      "copy_Integration_RGB_ABE_HT",
      "Integration_RGB_ABE_NB_HT",
      "copy_Integration_RGB_ABE_NB_HT",
      "Integration_LRGB_ABE_HT",
      "copy_Integration_LRGB_ABE_HT",
      "Integration_L_noABE",
      "Integration_R_noABE",
      "Integration_G_noABE",
      "Integration_B_noABE",
      "Integration_RGB_noABE",
      "Integration_RGB_noABE_NB",
      "Integration_L_noABE_HT",
      "Integration_L_noABE_NB",
      "Integration_L_noABE_NB_HT",
      "Integration_RGB_noABE_HT",
      "copy_Integration_RGB_noABE_HT",
      "Integration_RGB_noABE_NB_HT",
      "Integration_LRGB_noABE_HT",
      "copy_Integration_LRGB_noABE_HT",
      "Integration_LRGB_noABE_NB_HT",
      "copy_Integration_LRGB_noABE_NB_HT",
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

var narrowBandPalettes = [
      { name: "SHO", R: "S", G: "H", B: "O", all: true }, 
      { name: "HOS", R: "H", G: "O", B: "S", all: true }, 
      { name: "HSO", R: "H", G: "S", B: "O", all: true }, 
      { name: "HOO", R: "H", G: "O", B: "O", all: true }, 
      { name: "Pseudo RGB", R: "0.75*H + 0.25*S", G: "0.50*S + 0.50*O", B: "0.30*H + 0.70*O", all: true }, 
      { name: "Natural HOO", R: "H", G: "0.8*O+0.2*H", B: "0.85*O + 0.15*H", all: true }, 
      { name: "3-channel HOO", R: "0.76*H+0.24*S", G: "O", B: "0.85*O + 0.15*H", all: true }, 
      { name: "Dynamic SHO", R: "(O^~O)*S + ~(O^~O)*H", G: "((O*H)^~(O*H))*H + ~((O*H)^~(O*H))*O", B: "O", all: true }, 
      { name: "Dynamic HOO", R: "H", G: "((O*H)^~(O*H))*H + ~((O*H)^~(O*H))*O", B: "O", all: true }, 
      { name: "max(RGB,H)", R: "max(R, H)", G: "G", B: "B", all: false }, 
      { name: "max(RGB,HOO)", R: "max(R, H)", G: "max(G, O)", B: "max(B, O)", all: false }, 
      { name: "HOO Helix", R: "H", G: "(0.4*H)+(0.6*O)", B: "O", all: true }, 
      { name: "HSO Mix 1", R: "0.4*H + 0.6*S", G: "0.7*H + 0.3*O", B: "O", all: true }, 
      { name: "HSO Mix 2", R: "0.4*H + 0.6*S", G: "0.4*O + 0.3*H + 0.3*S", B: "O", all: true }, 
      { name: "HSO Mix 3", R: "0.5*H + 0.5*S", G: "0.15*H + 0.85*O", B: "O", all: true }, 
      { name: "RGB", R: "R", G: "G", B: "B", all: false }, 
      { name: "User defined", R: "", G: "", B: "", all: false },
      { name: "All", R: "All", G: "All", B: "All", all: false }
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
      console.noteln("AutoIntegrate: " + txt);
      processing_steps = processing_steps + "\n" + txt;
}

function parseFilePath(p)
{
      var fname = p;
      var filestart = fname.lastIndexOf('\\');
      if (filestart == -1) {
            filestart = fname.lastIndexOf('/');
      }
      return fname.substring(0, filestart+1)
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

function checkWinFilePath(w)
{
      if (dialogFilePath == null) {
            console.writeln("checkWinFilePath id ", w.mainView.id);
            var filePath = w.filePath;
            if (filePath != null) {
                  dialogFilePath = parseFilePath(filePath);
                  console.writeln("checkWinFilePath filePath ", filePath);
            } else {
                  console.writeln("checkWinFilePath null filePath");
            }
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

function getWindowList()
{
      var windowList = [];
      var images = ImageWindow.windows;
      if (images == null || images == undefined) {
            return windowList;
      }
      for (var i in images) {
            try {
                  windowList[windowList.length] = images[i].mainView.id;
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
            if (keep_temporary_images) {
                  w.mainView.id = "tmp_" + w.mainView.id;
                  w.show();
                  console.writeln("Rename window to " + w.mainView.id);
            } else {
                  w.close();
            }
      }
}

function windowShowif(id)
{
      var w = findWindow(id);
      if (w != null) {
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

function forceCloseOneWindow(w)
{
      if (keep_temporary_images) {
            w.mainView.id = "tmp_" + w.mainView.id;
            w.show();
            console.writeln("Rename window to " + w.mainView.id);
      } else {
            w.forceClose();
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
            closeOneWindow(arr[i]+"_extra_starless");
            closeOneWindow(arr[i]+"_extra_stars");
      }
}

function closeTempWindows()
{
      for (var i = 0; i < integration_LRGB_windows.length; i++) {
            closeOneWindow(integration_LRGB_windows[i] + "_max");
            closeOneWindow(integration_LRGB_windows[i] + "_map");
            closeOneWindow(integration_LRGB_windows[i] + "_map_mask");
            closeOneWindow(integration_LRGB_windows[i] + "_map_pm");
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
function closeAllWindows(keep_integrated_imgs)
{
      if (keep_integrated_imgs) {
            var isLRGB = false;
            var integration_windows = integration_LRGB_windows;
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
                  integration_windows = integration_color_windows
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

function saveBatchWindow(win, dir, name, bits)
{
      console.writeln("saveBatchWindow " + name);
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
                  console.writeln("saveBatchWindow:set bits to " + bits);
                  copy_win.setSampleFormat(bits, false);
            }
      } else {
            save_name = dir + "/" + name + getUniqueFilenamePart() + ".xisf";
      }
      console.writeln("saveBatchWindow:save name " + name);
      // Save image. No format options, no warning messages, 
      // no strict mode, no overwrite checks.
      if (!copy_win.saveAs(save_name, false, false, false, false)) {
            throwFatalError("Failed to save image: " + outputPath);
      }
      forceCloseOneWindow(copy_win);
}

function saveAllbatchWindows(bits)
{
      console.writeln("saveAllbatchWindows");
      var gdd = new GetDirectoryDialog;
      gdd.caption = "Select Save Directory";

      if (gdd.execute()) {
            // Find a windows that has a keyword which tells this is
            // a batch mode result file
            console.writeln("saveAllbatchWindows:dir " + gdd.directory);
            var images = ImageWindow.windows;
            for (var i in images) {
                  var imageWindow = images[i];
                  var keywords = imageWindow.keywords;
                  for (var j = 0; j != keywords.length; j++) {
                        var keyword = keywords[j].name;
                        var value = keywords[j].strippedValue.trim();
                        if (keyword == "AstroMosaic" && value == "batch") {
                              // we have batch window 
                              saveBatchWindow(imageWindow, gdd.directory, imageWindow.mainView.id, bits);
                        }
                  }
            }
      }
      console.writeln("All batch windows are saved!");
}

function copyWindow(sourceWindow, name)
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

/* Linear Defect Detection from LinearDefectDetection.js script.

   Copyright (c) 2019 Vicent Peris (OAUV). All Rights Reserved.
*/
function LDDEngine( win, detectColumns, detectPartialLines,
                                layersToRemove, rejectionLimit, imageShift,
                                detectionThreshold, partialLineDetectionThreshold )
{
   console.writeln("LDDEngine");
   let WI = new DefineWindowsAndImages( win, detectPartialLines );

   // Generate the small-scale image by subtracting
   // the large-scale components of the image.
   MultiscaleIsolation( WI.referenceSSImage, null, layersToRemove );

   // Build a list of lines in the image.
   // This can include entire or partial rows or columns.
   if ( layersToRemove < 7 )
      layersToRemove = 7;
   let partialLines;
   if ( detectPartialLines )
      partialLines = new PartialLineDetection( detectColumns, WI.referenceImageCopy,
                                               layersToRemove - 3, imageShift,
                                               partialLineDetectionThreshold );

   let maxPixelPara, maxPixelPerp;
   if ( detectColumns )
   {
      maxPixelPara = WI.referenceImage.height - 1;
      maxPixelPerp = WI.referenceImage.width - 1;
   }
   else
   {
      maxPixelPara = WI.referenceImage.width - 1;
      maxPixelPerp = WI.referenceImage.height - 1;
   }

   let lines;
   if ( detectPartialLines )
      lines = new LineList( true,
                            partialLines.columnOrRow,
                            partialLines.startPixel,
                            partialLines.endPixel,
                            maxPixelPara, maxPixelPerp );
   else
      lines = new LineList( true, [], [], [], maxPixelPara, maxPixelPerp );

   // Calculate the median value of each line in the image.
   // Create a model image with the lines filled
   // by their respective median values.
   console.writeln( "<end><cbr><br>Analyzing " + lines.columnOrRow.length + " lines in the image<br>" );
   let lineValues = new Array;
   for ( let i = 0; i < lines.columnOrRow.length; ++i )
   {
      let lineRect;
      if ( detectColumns )
      {
         lineRect = new Rect( 1, lines.endPixel[i] - lines.startPixel[i] + 1 );
         lineRect.moveTo( lines.columnOrRow[i], lines.startPixel[i] );
      }
      else
      {
         lineRect = new Rect( lines.endPixel[i] - lines.startPixel[i] + 1, 1 );
         lineRect.moveTo( lines.startPixel[i], lines.columnOrRow[i] );
      }

      let lineStatistics = new IterativeStatistics( WI.referenceSSImage, lineRect, rejectionLimit );
      WI.lineModelImage.selectedRect = lineRect;
      WI.lineModelImage.apply( lineStatistics.median );
      lineValues.push( lineStatistics.median );
   }
   WI.referenceSSImage.resetSelections();
   WI.lineModelImage.resetSelections();

   // Build the detection map image
   // and the list of detected line defects.
   this.detectedColumnOrRow = new Array;
   this.detectedStartPixel = new Array;
   this.detectedEndPixel = new Array;
   let lineModelMedian = WI.lineModelImage.median();
   let lineModelMAD = WI.lineModelImage.MAD();
   let lineRect;
   for ( let i = 0; i < lineValues.length; ++i )
   {
      if ( detectColumns )
      {
         lineRect = new Rect( 1, lines.endPixel[i] - lines.startPixel[i] + 1 );
         lineRect.moveTo( lines.columnOrRow[i], lines.startPixel[i] );
      }
      else
      {
         lineRect = new Rect( lines.endPixel[i] - lines.startPixel[i] + 1, 1 );
         lineRect.moveTo( lines.startPixel[i], lines.columnOrRow[i] );
      }

      WI.lineDetectionImage.selectedRect = lineRect;
      let sigma = Math.abs( lineValues[i] - lineModelMedian ) / ( lineModelMAD * 1.4826 );
      WI.lineDetectionImage.apply( parseInt( sigma ) / ( detectionThreshold + 1 ) );
      if ( sigma >= detectionThreshold )
      {
         this.detectedColumnOrRow.push( lines.columnOrRow[i] );
         this.detectedStartPixel.push( lines.startPixel[i] );
         this.detectedEndPixel.push( lines.endPixel[i] );
      }
   }

   // Transfer the resulting images to their respective windows.
   WI.lineDetectionImage.resetSelections();
   WI.lineDetectionImage.truncate( 0, 1 );
   WI.lineModelImage.apply( WI.referenceImage.median(), ImageOp_Add );

   WI.lineModelWindow.mainView.beginProcess();
   WI.lineModelWindow.mainView.image.apply( WI.lineModelImage );
   WI.lineModelWindow.mainView.endProcess();

   WI.lineDetectionWindow.mainView.beginProcess();
   WI.lineDetectionWindow.mainView.image.apply( WI.lineDetectionImage );
   WI.lineDetectionWindow.mainView.endProcess();

   // Free memory space taken by working images.
   WI.referenceImage.free();
   WI.referenceSSImage.free();
   WI.lineModelImage.free();
   WI.lineDetectionImage.free();
   if ( detectPartialLines )
      WI.referenceImageCopy.free();
   closeOneWindow(WI.lineModelWindow.mainView.id);
   closeOneWindow(WI.lineDetectionWindow.mainView.id);
   closeOneWindow("partial_line_detection");
}

// ----------------------------------------------------------------------------

/*
 * Function to subtract the large-scale components from an image using the
 * median wavelet transform.
 */
function MultiscaleIsolation( image, LSImage, layersToRemove )
{
   // Generate the large-scale components image.
   // First we generate the array that defines
   // the states (enabled / disabled) of the scale layers.
   let scales = new Array;
   for ( let i = 0; i < layersToRemove; ++i )
      scales.push( 1 );

   // The scale layers are an array of images.
   // We use the medianWaveletTransform. This algorithm is less prone
   // to show vertical patterns in the large-scale components.
   let multiscaleTransform = new Array;
   multiscaleTransform = image.medianWaveletTransform( layersToRemove-1, 0, scales );
   // We subtract the last layer to the image.
   // Please note that this image has negative pixel values.
   image.apply( multiscaleTransform[layersToRemove-1], ImageOp_Sub );
   // Generate a large-scale component image
   // if the respective input image is not null.
   if ( LSImage != null )
      LSImage.apply( multiscaleTransform[layersToRemove-1] );
   // Remove the multiscale layers from memory.
   for ( let i = 0; i < multiscaleTransform.length; ++i )
      multiscaleTransform[i].free();
}

/*
 * Function to create a list of vertical or horizontal lines in an image. It
 * can combine entire rows or columns and fragmented ones, if an array of
 * partial sections is specified in the input parameters. This list is used to
 * input the selected regions in the IterativeStatistics function.
 */
function LineList( correctEntireImage, partialColumnOrRow, partialStartPixel, partialEndPixel, maxPixelPara, maxPixelPerp )
{
   this.columnOrRow = new Array;
   this.startPixel = new Array;
   this.endPixel = new Array;

   if ( !correctEntireImage )
   {
      this.columnOrRow = partialColumnOrRow;
      this.startPixel = partialStartPixel;
      this.endPixel = partialEndPixel;
   }
   else
   {
      if ( partialColumnOrRow.length == 0 )
         partialColumnOrRow.push( maxPixelPerp + 1 );

      let iPartial = 0;
      for ( let i = 0; i <= maxPixelPerp; ++i )
      {
         if ( iPartial < partialColumnOrRow.length )
         {
            if ( i < partialColumnOrRow[iPartial] && correctEntireImage )
            {
               this.columnOrRow.push( i );
               this.startPixel.push( 0 );
               this.endPixel.push( maxPixelPara );
            }
            else
            {
               // Get the partial column or row.
               this.columnOrRow.push( partialColumnOrRow[iPartial] );
               this.startPixel.push( partialStartPixel[iPartial] );
               this.endPixel.push( partialEndPixel[iPartial] );
               if ( partialStartPixel[iPartial] > 0 )
               {
                  this.columnOrRow.push( partialColumnOrRow[iPartial] );
                  this.startPixel.push( 0 );
                  this.endPixel.push( partialStartPixel[iPartial] - 1 );
               }
               if ( partialEndPixel[iPartial] < maxPixelPara )
               {
                  this.columnOrRow.push( partialColumnOrRow[iPartial] );
                  this.startPixel.push( partialEndPixel[iPartial] + 1 );
                  this.endPixel.push( maxPixelPara );
               }
               // In some cases, there can be more than one section of
               // the same column or row in the partial defect list.
               // In that case, i (which is the current column or row number)
               // shouldn't increase because we are repeating
               // the same column or row.
               i = partialColumnOrRow[iPartial];
               ++iPartial;
            }
         }
         else if ( correctEntireImage )
         {
            this.columnOrRow.push( i );
            this.startPixel.push( 0 );
            this.endPixel.push( maxPixelPara );
         }
      }
   }
}

/*
 * Function to calculate the median and MAD of a selected image area with
 * iterative outlier rejection in the high end of the distribution. Useful to
 * reject bright objects in a background-dominated image, especially if the
 * input image is the output image of MultiscaleIsolation.
 */
function IterativeStatistics( image, rectangle, rejectionLimit )
{
   image.selectedRect = rectangle;
   let formerHighRejectionLimit = 1000;
   // The initial currentHighRejectionLimit value is set to 0.99 because
   // the global rejection sets the rejected pixels to 1. This way, those
   // pixels are already rejected in the first iteration.
   let currentHighRejectionLimit = 0.99;
   let j = 0;
   while ( formerHighRejectionLimit / currentHighRejectionLimit > 1.001 || j < 10 )
   {
      // Construct the statistics object to rectangle statistics.
      // These statistics are updated with the new high rejection limit
      // calculated at the end of the iteration.
      let iterativeRectangleStatistics = new ImageStatistics;
      with ( iterativeRectangleStatistics )
      {
         medianEnabled = true;
         lowRejectionEnabled = false;
         highRejectionEnabled = true;
         rejectionHigh = currentHighRejectionLimit;
      }
      iterativeRectangleStatistics.generate( image );
      this.median = iterativeRectangleStatistics.median;
      this.MAD = iterativeRectangleStatistics.mad;
      formerHighRejectionLimit = currentHighRejectionLimit;
      currentHighRejectionLimit = parseFloat( this.median + ( iterativeRectangleStatistics.mad * 1.4826 * rejectionLimit ) );
      ++j;
   }
   image.resetSelections();
}

/*
 * Function to detect defective partial columns or rows in an image.
 */
function PartialLineDetection( detectColumns, image, layersToRemove, imageShift, threshold )
{
   if ( ( detectColumns ? image.height : image.width ) < imageShift * 4 )
      throw new Error( "imageShift parameter too high for the current image size" );


   // Create a small-scale component image and its image window.
   // SSImage will be the main view of the small-scale component
   // image window because we need to apply a
   // MorphologicalTransformation instance to it.
   this.SSImageWindow = new ImageWindow( image.width,
                                         image.height,
                                         image.numberOfChannels,
                                         32, true, false,
                                         "partial_line_detection" );

   // The initial small-scale component image is the input image.
   this.SSImage = new Image( image.width,
                             image.height,
                             image.numberOfChannels,
                             image.colorSpace,
                             image.bitsPerSample,
                             SampleType_Real );

   this.SSImage.apply( image );

   // Subtract the large-scale components to the image.
   console.noteln( "<end><cbr><br>* Isolating small-scale image components..." );
   console.flush();
   MultiscaleIsolation( this.SSImage, null, layersToRemove );

   // The clipping mask is an image to reject the highlights
   // of the processed small-scale component image. The initial
   // state of this image is the small-scale component image
   // after removing the large-scale components. We simply
   // binarize this image at 5 sigmas above the image median.
   // This way, the bright structures are white and the rest
   // of the image is pure black. We'll use this image
   // at the end of the processing.
   let clippingMask = new Image( image.width,
                                 image.height,
                                 image.numberOfChannels,
                                 image.colorSpace,
                                 image.bitsPerSample,
                                 SampleType_Real );

   clippingMask.apply( this.SSImage );
   clippingMask.binarize( clippingMask.MAD() * 5 );

   // Apply a morphological transformation process
   // to the small-scale component image.
   // The structuring element is a line in the direction
   // of the lines to be detected.
   console.noteln( "<end><cbr><br>* Processing small-scale component image..." );
   console.flush();
   let structure;
   if ( detectColumns )
      structure =
      [[
         0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,
         0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,
         0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,
         0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,
         0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,
         0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,
         0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,
         0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,
         0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,
         0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,
         0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,
         0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,
         0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,
         0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,
         0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,
         0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,
         0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,
         0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,
         0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,
         0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,
         0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,
         0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,
         0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,
         0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,
         0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0
      ]];
   else
      structure =
      [[
         0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
         0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
         0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
         0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
         0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
         0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
         0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
         0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
         0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
         0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
         0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
         0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
         1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
         0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
         0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
         0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
         0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
         0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
         0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
         0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
         0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
         0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
         0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
         0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
         0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
      ]];

   console.writeln( "<end><cbr>Applying morphological median transformation..." );
   console.flush();
   for ( let i = 0; i < 5; ++i )
      this.SSImage.morphologicalTransformation( 4, structure, 0, 0, 1 );

   // Shift a clone of the small-scale component image
   // after the morphological transformation. We then subtract
   // the shifted image from its parent image. In the resulting
   // image, those linear structures with a sudden change
   // of contrast over the column or row will result in a bright
   // line at the origin of the defect. This lets us
   // to detect the defective partial columns or rows.
   let shiftedSSImage = new Image( image.width,
                                   image.height,
                                   image.numberOfChannels,
                                   image.colorSpace,
                                   32, SampleType_Real );

   shiftedSSImage.apply( this.SSImage );
   detectColumns ? shiftedSSImage.shiftBy( 0, -imageShift )
                 : shiftedSSImage.shiftBy( imageShift, 0 );
   this.SSImage.apply( shiftedSSImage, ImageOp_Sub );
   shiftedSSImage.free();

   // Subtract again the large-scale components
   // of this processed small-scale component image.
   // This will give a cleaner result before binarizing.
   console.writeln( "<end><cbr>Isolating small-scale image components..." );
   console.flush();
   MultiscaleIsolation( this.SSImage, null, layersToRemove - 3 );

   // Binarize the image to isolate the partial line detection structures.
   console.writeln( "<end><cbr>Isolating partial line defects..." );
   console.flush();
   let imageMedian = this.SSImage.median();
   let imageMAD = this.SSImage.MAD();
   this.SSImage.binarize( imageMedian + imageMAD*threshold );
   // Now, we subtract the binarized the clipping mask from this processed
   // small-scale component image. This removes the surviving linear structures
   // coming from bright objects in the image.
   this.SSImage.apply( clippingMask, ImageOp_Sub );
   this.SSImage.truncate( 0, 1 );

   // We apply a closure operation with the same structuring element.
   // This process removes short surviving lines coming from
   // the image noise while keeping the long ones
   console.writeln( "<end><cbr>Applying morphological closure transformation..." );
   console.flush();
   this.SSImage.morphologicalTransformation( 2, structure, 0, 0, 1 );

   // Detect the defective partial rows or columns. We select
   // those columns or rows having a minimum number of white pixels.
   // The minimum is half of the image shift and it is calculated
   // by comparing the mean pixel value to the length of the line.
   // Then, we find the maximum position to set the origin of the defect.
   // The maximum position is the start of the white line but the origin
   // of the defect is the end of the white line. To solve this,
   // we first mirror the image.
   console.noteln( "<end><cbr><br>* Detecting partial line defects..." );
   console.flush();
   let maxPixelPerp, maxPixelPara, lineRect;
   if ( detectColumns )
   {
      this.SSImage.mirrorVertical();
      maxPixelPerp = this.SSImage.width - 1;
      maxPixelPara = this.SSImage.height - 1;
      lineRect = new Rect( 1, this.SSImage.height );
   }
   else
   {
      this.SSImage.mirrorHorizontal();
      maxPixelPerp = this.SSImage.height - 1;
      maxPixelPara = this.SSImage.width - 1;
      lineRect = new Rect( this.SSImage.width, 1 );
   }

   this.columnOrRow = new Array;
   this.startPixel = new Array;
   this.endPixel = new Array;
   for ( let i = 0; i <= maxPixelPerp; ++i )
   {
      detectColumns ? lineRect.moveTo( i, 0 )
                    : lineRect.moveTo( 0, i );

      var lineMeanPixelValue = this.SSImage.mean( lineRect );
      // The equation at right sets the minimum length of the line
      // to trigger a defect detection.
      if ( lineMeanPixelValue > ( imageShift / ( ( maxPixelPara + 1 - imageShift * 2 ) * 2 ) ) )
      {
         this.columnOrRow.push( i )
         detectColumns  ? this.startPixel.push( maxPixelPara - parseInt( this.SSImage.maximumPosition( lineRect ).toArray()[1] ) )
                        : this.startPixel.push( maxPixelPara - parseInt( this.SSImage.maximumPosition( lineRect ).toArray()[0] ) );
         this.endPixel.push( maxPixelPara );
      }
   }

   detectColumns ? this.SSImage.mirrorVertical() : this.SSImage.mirrorHorizontal();

   this.SSImageWindow.mainView.beginProcess();
   this.SSImageWindow.mainView.image.apply( this.SSImage );
   this.SSImageWindow.mainView.endProcess();
   this.SSImageWindow.show();
}

/*
 * These are the image windows and images that will be used by the script
 * engine.
 */
function DefineWindowsAndImages( win, detectPartialLines )
{
   // Define the working image windows and images.
   this.referenceImageWindow = win;

   this.referenceImage = new Image( this.referenceImageWindow.mainView.image.width,
                                    this.referenceImageWindow.mainView.image.height,
                                    this.referenceImageWindow.mainView.image.numberOfChannels,
                                    this.referenceImageWindow.mainView.image.colorSpace,
                                    32, SampleType_Real );

   this.referenceImage.apply( this.referenceImageWindow.mainView.image );

   if ( detectPartialLines )
   {
      this.referenceImageCopy = new Image( this.referenceImageWindow.mainView.image.width,
                                           this.referenceImageWindow.mainView.image.height,
                                           this.referenceImageWindow.mainView.image.numberOfChannels,
                                           this.referenceImageWindow.mainView.image.colorSpace,
                                           32, SampleType_Real );

      this.referenceImageCopy.apply( this.referenceImageWindow.mainView.image );
   }

   this.referenceSSImage = new Image( this.referenceImage.width,
                                      this.referenceImage.height,
                                      this.referenceImage.numberOfChannels,
                                      this.referenceImage.colorSpace,
                                      32, SampleType_Real );

   this.referenceSSImage.apply( this.referenceImage );

   this.lineModelWindow = new ImageWindow( this.referenceImage.width,
                                           this.referenceImage.height,
                                           this.referenceImage.numberOfChannels,
                                           32, true, false, "line_model" );

   this.lineModelImage = new Image( this.referenceImage.width,
                                    this.referenceImage.height,
                                    this.referenceImage.numberOfChannels,
                                    this.referenceImage.colorSpace,
                                    32, SampleType_Real );

   this.lineDetectionWindow = new ImageWindow( this.referenceImage.width,
                                               this.referenceImage.height,
                                               this.referenceImage.numberOfChannels,
                                               32, true, false, "line_detection" );

   this.lineDetectionImage = new Image( this.referenceImage.width,
                                        this.referenceImage.height,
                                        this.referenceImage.numberOfChannels,
                                        this.referenceImage.colorSpace,
                                        32, SampleType_Real );
}

/*
 * LDDOutput the list of detected lines to console and text file.
 */
function LDDOutput( detectColumns, detectedLines, threshold, outputDir )
{
   console.writeln( "LDDOutput" );
   var defects = [];
   if ( detectedLines.detectedColumnOrRow.length > 0 )
   {
      console.noteln( "Detected lines" );
      console.noteln(  "--------------" );
      for ( let i = 0; i < detectedLines.detectedColumnOrRow.length; ++i )
      {
         var oneDefect = 
            [ 
                  true,                                     // defectEnabled
                  !detectColumns,                           // defectIsRow
                  detectedLines.detectedColumnOrRow[i],     // defectAddress
                  true,                                     // defectIsRange
                  detectedLines.detectedStartPixel[i],      // defectBegin
                  detectedLines.detectedEndPixel[i]         // defectEnd
            ];
         if (i == 0) {
            console.noteln(  oneDefect );
         }
         defects[defects.length] = oneDefect;
         console.noteln( "detectColumns=" + detectColumns + " " +
                         detectedLines.detectedColumnOrRow[i] + " " +
                         detectedLines.detectedStartPixel[i] + " " +
                         detectedLines.detectedEndPixel[i] );
      }
      console.noteln( "Detected defect lines: " + detectedLines.detectedColumnOrRow.length );
   }
   else
   {
      console.warningln( "No defect was detected. Try lowering the threshold value." );
   }
   return defects;
}

// Group files based on telescope and resolution
function getLDDgroups(fileNames)
{
      console.writeln("getLDDgroups");
      var groups = [];
      for (var i = 0; i < fileNames.length; i++) {
            var keywords = getFileKeywords(fileNames[i]);
            var groupname = "";
            var slooh_uwf = false;        // Slooh Chile or T2 UWF scope
            var naxis1 = 0;
            var slooh_chile = false;      // Slooh Chile scope
            for (var j = 0; j < keywords.length; j++) {
                  var value = keywords[j].strippedValue.trim();
                  switch (keywords[j].name) {
                        case "TELESCOP":
                              console.writeln("telescop=" + value);
                              groupname = groupname + value;
                              if (value.indexOf("UWF") != -1) {
                                    slooh_uwf = true;
                              } else if (value.indexOf("C1HM") != -1) {
                                    slooh_chile = true;
                              }
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
            if (slooh_chile && naxis1 < 1000) {
                  // Slooh Chile UWF sometimes can be identified only by resolution
                  console.writeln("Chile slooh_uwf");
                  slooh_uwf = true;
            }
            if (use_uwf) {
                  if (!slooh_uwf) {
                        continue;
                  }
            } else {
                  if (slooh_uwf) {
                        continue;
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
      var detectedLines = new LDDEngine( LDD_win, detectColumns, detectPartialLines,
                                         layersToRemove, rejectionLimit, imageShift,
                                         detectionThreshold, partialLineDetectionThreshold );
      // Generate output for cosmetic correction
      console.writeln("getDefects, LDDOutput");
      var defects = LDDOutput( detectColumns, detectedLines, detectionThreshold );

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
      // Run image interation as-is to make line defects more visible
      console.writeln("getDefectInfo, runImageIntegration");
      var LDD_id = runImageIntegration(LDD_images.images, "LDD");
      var LDD_win = findWindow(LDD_id);
      var defects = [];

      if (fix_column_defects) {
            console.writeln("getDefectInfo, fix_column_defects");
            var colDefects = getDefects(LDD_win, true);
            defects = defects.concat(colDefects);
      }
      if (fix_row_defects) {
            console.writeln("getDefectInfo, fix_row_defects");
            var rowDefects = getDefects(LDD_win, false);
            defects = defects.concat(rowDefects);
      }

      closeOneWindow(LDD_id);

      return { ccFileNames: fileNames, ccDefects: defects };
}

function runLinearDefectDetection(fileNames)
{
      addProcessingStep("run Linear Defect Detection");
      console.writeln("runLinearDefectDetection, fileNames[0]=" + fileNames[0]);
      var ccInfo = [];

      // Group images by telescope and resolution
      var LDD_groups = getLDDgroups(fileNames);

      if (LDD_groups.length > 4) {
            throwFatalError("too many LDD groups: " + LDD_groups.length);
      }

      // For each group, generate own defect information
      for (var i = 0; i < LDD_groups.length; i++) {
            console.writeln("runLinearDefectDetection, group " + i);
            var ccGroupInfo = getDefectInfo(LDD_groups[i].groupfiles);
            ccInfo[ccInfo.length] = ccGroupInfo;
      }

      return ccInfo;
}

function runCosmeticCorrection(fileNames, defects)
{
      if (defects.length > 0) {
            addProcessingStep("run CosmeticCorrection, output *_cc.xisf, number of line defects to fix is " + defects.length);
      } else {
            addProcessingStep("run CosmeticCorrection, output *_cc.xisf, no line defects to fix");
      }
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
      P.hotAutoValue = cosmetic_sorrection_hot_sigma;
      P.coldAutoCheck = true;
      P.coldAutoValue = cosmetic_sorrection_cold_sigma;
      if (defects.length > 0) {
            P.useDefectList = true;
            P.defects = defects; // defectEnabled, defectIsRow, defectAddress, defectIsRange, defectBegin, defectEnd
      } else {
            P.useDefectList = false;
            P.defects = [];
      }

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
                        forceCloseOneWindow(imageWindow);
                        console.writeln(
                           "*** Error: Can't write output image: ", newFilePath
                        );
                        continue;
                  }         
                  forceCloseOneWindow(imageWindow);
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
      var found_slooh_uwf = false;

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
            var keywords = getFileKeywords(filePath);

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
            if (slooh_uwf) {
                  found_slooh_uwf = true;
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
      if (newFileNames.length == 0) {
            if (found_slooh_uwf) {
                  throwFatalError("No files found for processing. Slooh UWF files found, to process those you need to set Ultra Wide Field check box.");
            } else {
                  throwFatalError("No files found for processing.");
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
                  break;
      }
      return null;
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

function getFileKeywords(filePath)
{
      console.writeln("getFileKeywords " + filePath);
      var keywords = [];

      var ext = '.' + filePath.split('.').pop();
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
      if (F.canStoreKeywords) {
            keywords = f.keywords;
      }
      f.close();

      return keywords;
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
            var keywords = getFileKeywords(filePath);
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

            if (filter == null || force_file_name_filter) {
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
      if (allfiles.C.length == 0) {
            if (synthetic_l_image ||
                  (synthetic_missing_images && allfiles.L.length == 0))
            {
                  if (allfiles.L.length == 0) {
                        addProcessingStep("No luminance images, synthetic luminance image from all other images");
                  } else {
                        addProcessingStep("Synthetic luminance image from all LRGB images");
                  }
                  allfiles.L = allfiles.L.concat(allfiles.R);
                  allfiles.L = allfiles.L.concat(allfiles.G);
                  allfiles.L = allfiles.L.concat(allfiles.B);
            }
            if (allfiles.R.length == 0 && synthetic_missing_images) {
                  addProcessingStep("No red images, synthetic red image from luminance images");
                  allfiles.R = allfiles.R.concat(allfiles.L);
            }
            if (allfiles.G.length == 0 && synthetic_missing_images) {
                  addProcessingStep("No green images, synthetic green image from luminance images");
                  allfiles.G = allfiles.G.concat(allfiles.L);
            }
            if (allfiles.B.length == 0 && synthetic_missing_images) {
                  addProcessingStep("No blue images, synthetic blue image from luminance images");
                  allfiles.B = allfiles.B.concat(allfiles.L);
            }
            if (RRGB_image) {
                  addProcessingStep("RRGB image, use R as L image");
                  console.writeln("L images " +  allfiles.L.length);
                  console.writeln("R images " +  allfiles.R.length);
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

/* Replace tag "from" with real image name "to" with _map added to the end (H -> Integration_H_map) . 
 * Images names listed in the mapping are put into images array without _map added (Integration_H).
 */
function replaceMappingImageNames(mapping, from, to, images)
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
            //console.writeln("replaceMappingImageNames only one char");
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
                              //console.writeln("replaceMappingImageNames letter before " + from);
                              replace = false;
                        } else if (n < mapping.length-1 && isVariableChar(mapping.substring(n+1, n+2))) {
                              // nothing to replace
                              //console.writeln("replaceMappingImageNames letter after " + from);
                              replace = false;
                        }
                        if (replace) {
                              if (findWindow(to) == null) {
                                    throwFatalError("Could not find image window " + to + " that is needed for PixelMath mapping");
                              }
                              add_missing_image(images, to);
                              mapping = mapping.substring(0, n) + to + "_map" + mapping.substring(n+1);
                              //console.writeln("replaceMappingImageNames mapped to " + mapping);
                              break;
                        }
                  }
            }
            if (n == mapping.length) {
                  // all replaced
                  //console.writeln("replaceMappingImageNames, all replaced, mapped to " + mapping);
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
            case 'L':
                  var mapping = custom_L_mapping;
                  break;
            default:
                  console.writeln("ERROR: mapCustomAndReplaceImageNames " + targetChannel);
                  return null;
      }
      console.writeln("mapCustomAndReplaceImageNames " + targetChannel + " using " + mapping);
      /* Replace letters with actual image identifiers. */
      mapping = replaceMappingImageNames(mapping, "L", "Integration_O", images);
      mapping = replaceMappingImageNames(mapping, "R", "Integration_R", images);
      mapping = replaceMappingImageNames(mapping, "G", "Integration_G", images);
      mapping = replaceMappingImageNames(mapping, "B", "Integration_B", images);
      mapping = replaceMappingImageNames(mapping, "H", "Integration_H", images);
      mapping = replaceMappingImageNames(mapping, "S", "Integration_S", images);
      mapping = replaceMappingImageNames(mapping, "O", "Integration_O", images);
      console.writeln("mapCustomAndReplaceImageNames:converted mapping " + mapping);

      return mapping;
}

/* Run single expression PixelMath and optionally create new image. */
function runPixelMathSingleMappingEx(id, mapping, createNewImage)
{
      addProcessingStep("Run PixelMath single mapping " + mapping + " using image " + id);

      var idWin = findWindow(id);
      if (idWin == null) {
            console.writeln("ERROR: No reference window found for PixelMath");
      }

      var P = new PixelMath;
      P.expression = mapping;
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
      P.createNewImage = createNewImage;
      P.showNewImage = false;
      P.newImageId = id + "_pm";
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
      addProcessingStep("Run PixelMath mapping R " + mapping_R + ", G " + mapping_G + ", B " + mapping_B);

      if (idWin == null) {
            idWin = findWindow("Integration_H");
      }
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
      P.showNewImage = true;
      if (newId != null) {
            P.createNewImage = true;
            P.newImageId = newId;
      } else {
            P.createNewImage = false;
            P.newImageId = "";
      }
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
            refimage = "Integration_O_map";
            if (arrayFindImage(images, refimage)) {
                  return(refimage);
            }
            refimage = "Integration_S_map";
            if (arrayFindImage(images, refimage)) {
                  return(refimage);
            }
      } else {
            refimage = "Integration_" + suggestion + "_map";
            if (arrayFindImage(images, refimage)) {
                  return(refimage);
            }
            throwFatalError("Could not find linear fit reference image " + suggestion);
      }
      // Just pick something
      return(images[0]);
}

/* Copy images with _map name so we do not change the original
 * images (Integration_H -> Integration_H_map).
 */
function copyToMapImages(images)
{
      console.writeln("copyToMapImages");
      for (var i = 0; i < images.length; i++) {
            var copyname = images[i] + "_map";
            console.writeln("copyname", copyname);
            copyWindow(findWindow(images[i]), copyname);
            images[i] = copyname;
      }
}

function mapRGBchannel(images, refimage, mapping)
{
      console.writeln("mapRGBchannel");
      // copy files to _map names to avoid changing original files
      copyToMapImages(images);
      refimage = refimage + "_map";
      if (findWindow(refimage) == null) {
            refimage = images[0];
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

function reduceNoiseOnChannelImage(image)
{
      console.writeln("reduceNoiseOnChannelImage " + image);
      /* Create a temporary stretched copy to be used as a mask. */
      var maskname = image + "_mask";
      var image_win = findWindow(image);
      var mask_win = copyWindow(image_win, maskname);
      runHistogramTransform(mask_win, null, false, 'mask');
      runMultiscaleLinearTransformReduceNoise(image_win, mask_win);
      closeOneWindow(maskname);
}

/* Do custom mapping of channels to RGB image. We do some the same 
 * stuff here as in CombineRGBimage.
 */
function customMapping()
{
      var RBGmapping = { combined: true, stretched: true};

      addProcessingStep("Custom mapping");

      /* Get updated mapping strings and collect images
       * used in mapping.
       */
      var R_images = [];
      var G_images = [];
      var B_images = [];

      /* Get a modfied mapping with tags replaced with real image names.
       */
      var red_mapping = mapCustomAndReplaceImageNames('R', R_images);
      var green_mapping = mapCustomAndReplaceImageNames('G', G_images);
      var blue_mapping = mapCustomAndReplaceImageNames('B', B_images);

      if (narrowband) {
            /* For narrowband we have two options:
             *
             * 1. Do PixelMath mapping in linear format.
             *    https://jonrista.com/the-astrophotographers-guide/pixinsights/narrow-band-combinations-with-pixelmath-hoo/
             * 2. We do auto-stretch of images before PixelMath. Stretch is done to make
             *    images roughtly match with each other. In this case we have already stretched image.
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
            copyToMapImages(images);

            if (ABE_before_channel_combination) {
                  // Optionally do ABE on channel images
                  for (var i = 0; i < images.length; i++) {
                        run_ABE_before_channel_combination(images[i]);
                  }
            }

            if (use_noise_reduction_on_all_channels) {
                  // Optionally do noise reduction on linear state
                  for (var i = 0; i < images.length; i++) {
                        reduceNoiseOnChannelImage(images[i]);
                  }
            }
            if (narrowband_linear_fit == "Auto"
                && image_stretching == 'STF') 
            {
                  /* By default we do not do linear fit
                   * if we stretch with STF. If we stretch
                   * with MaskedStretch we use linear
                   * for to balance channels better.
                   * */
                  narrowband_linear_fit = "None";
            }

            if (!mapping_on_nonlinear_data) {
                  /* We run PixelMath using linear images. 
                   */
                  addProcessingStep("Custom mapping, linear narrowband images");
                  RBGmapping.stretched = false;
            } else {
                  /* Stretch images to non-linear before combining with PixelMath.
                   */
                  addProcessingStep("Custom mapping, stretched narrowband images");
                  for (var i = 0; i < images.length; i++) {
                        runHistogramTransform(findWindow(images[i]), null, false, 'RGB');
                  }
                  RBGmapping.stretched = true;
            }
            if (narrowband_linear_fit != "None") {
                  /* Do a linear fit of images before PixelMath. We do this on both cases,
                  * linear and stretched.
                  */
                  var refimage = findLinearFitHSOMapRefimage(images, narrowband_linear_fit);
                  linearFitArray(refimage, images);
            }

            /* Run PixelMath to create a combined RGB image.
             */
            RGB_win_id = runPixelMathRGBMapping("Integration_RGB", null, red_mapping, green_mapping, blue_mapping);

            RGB_win = findWindow(RGB_win_id);
            RGB_win.show();
            addScriptWindow(RGB_win_id);

      } else {
            // We have both RGB and narrowband, do custom mapping on individual channels.
            // Here we just create different combined channels in linear format and
            // then continue as normal RGB processing.
            // If we have multiple images in mappiong we use linmear fit to match
            // them before PixelMath.
            addProcessingStep("RGB and narrowband mapping, create LRGB channel images and continue with RGB workflow");
            if (is_luminance_images) {
                  var L_images = [];
                  var luminance_mapping = mapCustomAndReplaceImageNames('L', L_images);
                  luminance_id = mapRGBchannel(L_images, "Integration_L", luminance_mapping);
            }

            red_id = mapRGBchannel(R_images, "Integration_R", red_mapping);
            green_id = mapRGBchannel(G_images, "Integration_G", green_mapping);
            blue_id = mapRGBchannel(B_images, "Integration_B", blue_mapping);
            
            RBGmapping.combined = false;
            RBGmapping.stretched = false;
      }

      return RBGmapping;
}

/* Map RGB channels. We do PixelMath mapping here if we have narrowband images.
 */
function mapLRGBchannels()
{
      var RBGmapping = { combined: false, stretched: false};

      var rgb = R_id != null || G_id != null || B_id != null;
      narrowband = H_id != null || S_id != null || O_id != null;
      var custom_mapping = narrowband && !use_RGBNB_Mapping;

      if (rgb && narrowband) {
            addProcessingStep("There are both RGB and narrowband data, processing as RGB image");
            narrowband = false;
      }
      if (narrowband) {
            addProcessingStep("Processing as narrowband image");
      }

      addProcessingStep("Map LRGB channels");

      if (custom_mapping) {
            addProcessingStep("Narrowband files, use custom mapping");
            RBGmapping = customMapping();
      } else {
            addProcessingStep("Normal RGB processing");
            luminance_id = L_id;
            red_id = R_id;
            green_id = G_id;
            blue_id = B_id;
      }
      return RBGmapping;
}

// add as a first item, first item should be the best image
function insert_image_for_integrate(images, new_image)
{
      images.unshift(new Array(2));
      images[0][0] = true;                // enabled
      images[0][1] = new_image;           // path
}

// add to the end
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
                  addProcessingStep("  Auto2 using linear fit clip for rejection");
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
      if (name == 'LDD') {
            // Integration for LDDEngine, do not use rejection
            P.rejection = ImageIntegration.prototype.NoRejection;
      } else {
            P.rejection = getRejectionAlgorigthm(images.length);
      }
      
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

// Run ABE and rename windows so that the final result has the same id
function run_ABE_before_channel_combination(id)
{
      var id_win = ImageWindow.windowById(id);

      var ABE_id = runABE(id_win);

      closeOneWindow(id);
      windowRename(ABE_id, id);
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

function runHistogramTransformSTF(ABE_win, stf_to_use, iscolor)
{
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

function runHistogramTransformMaskedStretch(ABE_win)
{
      addProcessingStep("Run histogram transform on " + ABE_win.mainView.id + " using MaskedStretch");

      var P = new MaskedStretch;
      P.targetBackground = MaskedStretch_targetBackground;
      P.numberOfIterations = 100;
      P.clippingFraction = 0.00050000;
      P.backgroundReferenceViewId = "";
      P.backgroundLow = 0.00000000;
      P.backgroundHigh = 0.05000000;
      P.useROI = false;
      P.roiX0 = 0;
      P.roiY0 = 0;
      P.roiX1 = 0;
      P.roiY1 = 0;
      P.maskType = MaskedStretch.prototype.MaskType_Intensity;

      ABE_win.mainView.beginProcess(UndoFlag_NoSwapFile);

      console.writeln("Execute MaskedStretch on " + ABE_win.mainView.id);
      P.executeOn(ABE_win.mainView);

      ABE_win.mainView.endProcess();

      return null;
}

function runHistogramTransform(ABE_win, stf_to_use, iscolor, type)
{
      if (!run_HT) {
            addProcessingStep("Do not run histogram transform on " + ABE_win.mainView.id);
            return null;
      }

      if (image_stretching == 'STF' 
          || type == 'mask'
          || (image_stretching == 'Both' && type == 'L'))
      {
            return runHistogramTransformSTF(ABE_win, stf_to_use, iscolor);

      } else if (image_stretching == 'Masked'
                 || (image_stretching == 'Both' && type == 'RGB'))
      {
            return runHistogramTransformMaskedStretch(ABE_win);

      } else {
            throwFatalError("Bad image_stretching value " + image_stretching + " with type " + type);
            return null;
      }
}

function noiseStrong()
{
      var P = new MultiscaleLinearTransform;
      P.layers = [ // enabled, biasEnabled, bias, noiseReductionEnabled, noiseReductionThreshold, noiseReductionAmount, noiseReductionIterations
      [true, true, 0.000, true, 3.000, 0.50, 3],
      [true, true, 0.000, true, 2.000, 0.50, 2],
      [true, true, 0.000, true, 1.000, 0.50, 2],
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

      return P;
}

function noiseMild()
{
      var P = new MultiscaleLinearTransform;
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

      return P;
}

function runMultiscaleLinearTransformReduceNoise(imgView, MaskView)
{
      if (skip_noise_reduction) {
            return;
      }

      addProcessingStep("Noise reduction on " + imgView.mainView.id + " using mask " + MaskView.mainView.id);

      if (stronger_noise_reduction) {
            var P = noiseStrong();
       } else {
             var P = noiseMild();
       } 

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
            addProcessingStep("No Color calibration for narrowband");
            return;
      }
      try {
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
      } catch(err) {
            console.criticalln("Color calibration failed");
            console.criticalln(err);
            addProcessingStep("Maybe filter files or file format were not recognized correctly");
            throwFatalError("Color calibration failed");
      }
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
      addProcessingStep("LRGB combination of " + RGB_id + " and luminance image " + L_id + " into " + RGBimgView.id);
      var P = new LRGBCombination;
      P.channels = [ // enabled, id, k
            [false, "", 1.00000],
            [false, "", 1.00000],
            [false, "", 1.00000],
            [true, L_id, 1.00000]
      ];
      P.mL = LRGBCombination_lightness;
      P.mc = LRGBCombination_saturation;
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

function ensureDialogFilePath(names)
{
      if (dialogFilePath == null) {
            var gdd = new GetDirectoryDialog;
            gdd.caption = "Select Save Directory for " + names;
            console.noteln(gdd.caption);
            if (!gdd.execute()) {
                  console.writeln("No path for " + names + ', nothing written');
                  return false;
            }
            dialogFilePath = gdd.directory + '/';
            return true;
      } else {
            return true;
      }
}

function writeProcessingSteps(alignedFiles, autocontinue, basename)
{
      if (basename == null) {
            if (autocontinue) {
                  basename = "AutoContinue";
            } else {
                  basename = "AutoIntegrate";
            }
      }
      logfname = basename + getUniqueFilenamePart() + ".log";

      if (!ensureDialogFilePath(basename + ".log")) {
            return;
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

function findProcessedImages()
{
      L_id = findWindowId("Integration_L");
      R_id = findWindowId("Integration_R");
      G_id = findWindowId("Integration_G");
      B_id = findWindowId("Integration_B");
      H_id = findWindowId("Integration_H");
      S_id = findWindowId("Integration_S");
      O_id = findWindowId("Integration_O");
      color_id = findWindowId("Integration_RGB");
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

      findProcessedImages();

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
      } else if (checkAutoCont(L_HT_win) && checkAutoCont(RGB_HT_win)) {        /* L,RGB HistogramTransformation */
            addProcessingStep("L,RGB HistogramTransformation");
            preprocessed_images = start_images.L_RGB_HT;
      } else if (checkAutoCont(RGB_HT_win)) {                         /* RGB (color) HistogramTransformation */
            addProcessingStep("RGB (color) HistogramTransformation " + RGB_HT_win.mainView.id);
            preprocessed_images = start_images.RGB_HT;
      } else if (checkAutoCont(L_BE_win) && checkAutoCont(RGB_BE_win)) { /* L,RGB background extracted */
            addProcessingStep("L,RGB background extracted");
            preprocessed_images = start_images.L_RGB_BE;
      } else if (checkAutoCont(RGB_BE_win)) {                         /* RGB (color) background extracted */
            addProcessingStep("RGB (color) background extracted " + RGB_BE_win.mainView.id);
            preprocessed_images = start_images.RGB_BE;
      } else if ((checkAutoCont(R_BE_win) && checkAutoCont(G_BE_win) && checkAutoCont(B_BE_win)) ||
                 (checkAutoCont(H_BE_win) && checkAutoCont(O_BE_win))) {  /* L,R,G,B background extracted */
            addProcessingStep("L,R,G,B background extracted");
            preprocessed_images = start_images.L_R_G_B_BE;
            narrowband = checkAutoCont(H_BE_win) || checkAutoCont(O_BE_win);
      } else if (color_id != null) {                              /* RGB (color) integrated image */
            addProcessingStep("RGB (color) integrated image " + color_id);
            checkAutoCont(findWindow(color_id));
            preprocessed_images = start_images.RGB_COLOR;
      } else if ((R_id != null && G_id != null && B_id != null) ||
                 (H_id != null && O_id != null)) {                /* L,R,G,B integrated images */
            addProcessingStep("L,R,G,B integrated images");
            checkAutoCont(findWindow(R_id));
            checkAutoCont(findWindow(H_id));
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
            dialogFilePath = parseFilePath(dialogFileNames[0]);

            if (!skip_cosmeticcorrection) {
                  if (fix_column_defects || fix_row_defects) {
                        var ccFileNames = [];
                        var ccInfo = runLinearDefectDetection(fileNames);
                        for (var i = 0; i < ccInfo.length; i++) {
                              addProcessingStep("run CosmeticCorrection for linear defect file group " + i + ", " + ccInfo[i].ccFileNames.length + " files");
                              var cc = runCosmeticCorrection(ccInfo[i].ccFileNames, ccInfo[i].ccDefects);
                              ccFileNames = ccFileNames.concat(cc);
                        }
                        fileNames = ccFileNames;
                  } else {
                        var defects = [];
                        /* Run CosmeticCorrection for each file.
                        * Output is *_cc.xisf files.
                        */
                        fileNames = runCosmeticCorrection(fileNames, defects);
                  }
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
            var retarr = findBestSSWEIGHT(fileNames);
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
                  runHistogramTransform(L_win, null, false, 'mask');
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
                  runHistogramTransform(color_win, null, true, 'mask');
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
function ProcessLimage(RBGmapping)
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
                  if (!RBGmapping.stretched) {
                        /* Optionally run ABE on L
                        */
                        if (use_ABE_on_L_RGB && !ABE_before_channel_combination) {
                              L_ABE_id = runABE(L_win);
                        } else {
                              L_ABE_id = noABEcopyWin(L_win);
                        }
                  }
                  if (use_RGBNB_Mapping) {
                        var mapped_L_ABE_id = RGBNB_Channel_Mapping(L_ABE_id, 'L', L_bandwidth, L_mapping, L_BoostFactor);
                        mapped_L_ABE_id = windowRename(mapped_L_ABE_id, L_ABE_id + "_NB");
                        closeOneWindow(L_ABE_id);
                        L_ABE_id = mapped_L_ABE_id;
                  }
            }

            if (!RBGmapping.combined) {
                  /* Noise reduction for L. */
                  runMultiscaleLinearTransformReduceNoise(ImageWindow.windowById(L_ABE_id), mask_win);
            }

            /* On L image run HistogramTransform based on autostretch
            */
            L_ABE_HT_id = L_ABE_id + "_HT";
            if (!RBGmapping.stretched) {
                  L_stf = runHistogramTransform(
                              copyWindow(ImageWindow.windowById(L_ABE_id), L_ABE_HT_id), 
                              null,
                              false,
                              'L');
                  if (!same_stf_for_all_images) {
                        L_stf = null;
                  }
            } else {
                  copyWindow(ImageWindow.windowById(L_ABE_id), L_ABE_HT_id);
                  same_stf_for_all_images = false;
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

      if (use_noise_reduction_on_all_channels && !narrowband) {
            reduceNoiseOnChannelImage(red_id);
            reduceNoiseOnChannelImage(green_id);
            reduceNoiseOnChannelImage(blue_id);
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

function extractRGBchannel(RGB_id, channel)
{
      addProcessingStep("Extract " + channel + " from " + RGB_id);
      var sourceWindow = findWindow(RGB_id);
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
      console.writeln("RGBNB_Channel_Mapping " + RGB_id);

      if (channel == 'L') {
            var L_win_copy = copyWindow(findWindow(RGB_id), RGB_id + "_RGBNBcopy");
            var channelId = L_win_copy.mainView.id;
      } else {
            var channelId = extractRGBchannel(RGB_id, channel);
      }

      switch (mapping) {
            case 'H':
                  var NB_id = H_id;
                  var NB_bandwidth = H_bandwidth;
                  break;
            case 'S':
                  var NB_id = S_id;
                  var NB_bandwidth = S_bandwidth;
                  break;
            case 'O':
                  var NB_bandwidth = O_bandwidth;
                  var NB_id = O_id;
                  break;
            case '':
                  return channelId;
            default:
                  throwFatalError("Invalid NB mapping " + mapping);
      }
      if (NB_id == null) {
            throwFatalError("Could not find " + mapping + " image for mapping to " + channel);
      }
      if (use_RGB_image) {
            var sourceChannelId = RGB_id;
            channel_bandwidth = R_bandwidth;
      } else {
            var sourceChannelId = channelId;
      }

      addProcessingStep("Run " + channel + " mapping using " + NB_id + ", " + 
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

      closeOneWindow(channelId);
      closeOneWindow(mappedChannelId);
      closeOneWindow(mappedChannelId2);

      return mappedChannelId3;
}

function doRGBNBmapping(RGB_id)
{
      addProcessingStep("Create mapped channel images from " + RGB_id);
      var R_mapped = RGBNB_Channel_Mapping(RGB_id, 'R', R_bandwidth, R_mapping, R_BoostFactor);
      var G_mapped = RGBNB_Channel_Mapping(RGB_id, 'G', G_bandwidth, G_mapping, G_BoostFactor);
      var B_mapped = RGBNB_Channel_Mapping(RGB_id, 'B', B_bandwidth, B_mapping, B_BoostFactor);

      /* Combine RGB image from mapped channel images. */
      addProcessingStep("Combine mapped channel images to an RGB image");
      var RGB_mapped_id = runPixelMathRGBMapping(
                              RGB_id + "_NB", 
                              findWindow(RGB_id),
                              R_mapped,
                              G_mapped,
                              B_mapped);

      closeOneWindow(R_mapped);
      closeOneWindow(G_mapped);
      closeOneWindow(B_mapped);
      closeOneWindow(RGB_id);

      return RGB_mapped_id;
}

function testRGBNBmapping()
{
      console.beginLog();

      addProcessingStep("Test narrowband mapping to RGB");

      findProcessedImages();

      if (color_id == null) {
            throwFatalError("Could not find RGB image");
      }

      var color_win = findWindow(color_id);

      checkWinFilePath(color_win);

      var test_win = copyWindow(color_win, color_id + "_test");

      doRGBNBmapping(test_win.mainView.id);
      
      addProcessingStep("Processing completed");
      writeProcessingSteps(null, true, "AutoRGBNB");

      console.endLog();
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

            if (use_RGBNB_Mapping) {
                  /* Do RGBNB mapping on combined and color calibrated RGB image. */
                  RGB_ABE_id = doRGBNBmapping(RGB_ABE_id);
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
                        true,
                        'RGB');
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

// When starnet is run we do some thins differently
// - We make a copy of the starless image
// - We make a copy of the stars image
// - Operations like HDMT and LHE are run on the starless image
// - Star reduction is done on the stars image
// - In the end starless and stars images are combined together
function extraStarNet(imgView)
{
      addProcessingStep("Run StarNet on " + imgView.mainView.id);

      var P = new StarNet;
      P.stride = StarNet.prototype.Stride_128;
      P.mask = true;

      /* Execute StarNet on image.
       */
      imgView.mainView.beginProcess(UndoFlag_NoSwapFile);

      P.executeOn(imgView.mainView, false);

      imgView.mainView.endProcess();

      /* Get star mask.
       */
      console.writeln("extraStarNet star_mask_win_id " + ImageWindow.activeWindow.mainView.id);
      star_mask_win = ImageWindow.activeWindow;
      star_mask_win_id = star_mask_win.mainView.id;

      /* Make a copy of the stars image.
       */
      console.writeln("extraStarNet copy " + star_mask_win_id + " to " + imgView.mainView.id + "_stars");
      var copywin = copyWindow(star_mask_win, imgView.mainView.id + "_stars");
      saveWindow(dialogFilePath, copywin.mainView.id);
      addProcessingStep("StarNet stars image " + copywin.mainView.id);

      /* Make a copy of the starless image.
       */
      console.writeln("extraStarNet copy " + imgView.mainView.id + " to " + imgView.mainView.id + "_starless");
      var copywin = copyWindow(imgView, imgView.mainView.id + "_starless");
      saveWindow(dialogFilePath, copywin.mainView.id);
      addProcessingStep("StarNet starless image " + copywin.mainView.id);
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
      var targetView = imgView;

      createStarMask(imgView);

      if (extra_StarNet) {
            addProcessingStep("Smaller stars on " + star_mask_win_id + 
                        " using " + extra_smaller_stars_iterations + " iterations");
            targetView = star_mask_win;    
      } else {
            addProcessingStep("Smaller stars on " + imgView.mainView.id + " using mask " + star_mask_win.mainView.id + 
                        " and " + extra_smaller_stars_iterations + " iterations");
      }

      if (extra_smaller_stars_iterations == 0) {
            var P = new MorphologicalTransformation;
            P.operator = MorphologicalTransformation.prototype.Erosion;
            P.interlacingDistance = 1;
            P.lowThreshold = 0.000000;
            P.highThreshold = 0.000000;
            P.numberOfIterations = 1;
            P.amount = 0.30;
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
      } else {
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
      }
      
      targetView.mainView.beginProcess(UndoFlag_NoSwapFile);

      if (!extra_StarNet) {
            /* Transform only light parts of the image. */
            targetView.setMask(star_mask_win);
            targetView.maskInverted = false;
      }
      
      P.executeOn(targetView.mainView, false);

      if (!extra_StarNet) {
            targetView.removeMask();
      }

      targetView.mainView.endProcess();
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
      runHistogramTransform(win, null, true, 'mask');
}


function is_non_starnet_option()
{
      return extra_darker_background || 
             extra_HDRMLT || 
             extra_LHE || 
             extra_contrast ||
             extra_STF ||
             extra_smaller_stars;
}

function is_extra_option()
{
      return extra_StarNet || 
             is_non_starnet_option();
}

function is_narrowband_option()
{
      return fix_narrowband_star_color ||
             run_hue_shift ||
             run_narrowband_SCNR ||
             leave_some_green;
}

function isbatchNarrowbandPaletteMode()
{
      return custom_R_mapping == "All" && custom_G_mapping == "All" && custom_B_mapping == "All";
}

// Rename and save palette batch image
function narrowbandPaletteBatchFinalImage(palette_name, winId, extra)
{
      // rename and save image using palette name
      console.writeln("AutoIntegrateNarrowbandPaletteBatch:rename " + winId + " using " + palette_name);
      var palette_image = palette_name;
      palette_image = palette_image.replace(/ /g,"_");
      palette_image = palette_image.replace(/-/g,"_");
      palette_image = "Auto_" + palette_image;
      if (extra) {
            palette_image = palette_image + "_extra";
      }
      console.writeln("AutoIntegrateNarrowbandPaletteBatch:new name " + palette_image);+
      windowRenameKeepif(winId, palette_image, true);
      // set batch keyword so it easy to save all file e.g. as 16 bit TIFF
      console.writeln("AutoIntegrateNarrowbandPaletteBatch:set batch keyword");
      setBatchKeyword(ImageWindow.windowById(palette_image));
      // save image
      console.writeln("AutoIntegrateNarrowbandPaletteBatch:save image " + palette_image);
      saveWindow(dialogFilePath, palette_image);
      addProcessingStep("Narrowband palette batch final image " + palette_image);
}

// Run through all narrowband palette options
function AutoIntegrateNarrowbandPaletteBatch(auto_continue)
{
      console.writeln("AutoIntegrateNarrowbandPaletteBatch");
      for (var i = 0; i < narrowBandPalettes.length; i++) {
            console.writeln("AutoIntegrateNarrowbandPaletteBatch loop ", i);
            if (narrowBandPalettes[i].all) {
                  if (auto_continue) {
                        ensureDialogFilePath("narrowband batch result files");
                  }
                  custom_R_mapping = narrowBandPalettes[i].R;
                  custom_G_mapping = narrowBandPalettes[i].G;
                  custom_B_mapping = narrowBandPalettes[i].B;
                  addProcessingStep("Narrowband palette " + narrowBandPalettes[i].name + " batch using " + custom_R_mapping + ", " + custom_G_mapping + ", " + custom_B_mapping);

                  var succ = AutoIntegrateEngine(auto_continue);
                  if (!succ) {
                        addProcessingStep("Narrowband palette batch could not process all palettes");
                  }
                  // rename and save the final image
                  narrowbandPaletteBatchFinalImage(narrowBandPalettes[i].name, "AutoRGB", false);
                  if (findWindow("AutoRGB_extra") != null) {
                        narrowbandPaletteBatchFinalImage(narrowBandPalettes[i].name, "AutoRGB_extra", true);
                  }
                  // next runs are always auto_continue
                  console.writeln("AutoIntegrateNarrowbandPaletteBatch:set auto_continue = true");
                  auto_continue = true;
                  // close all but integrated images
                  console.writeln("AutoIntegrateNarrowbandPaletteBatch:close all windows");
                  closeAllWindows(true);
            }
      }
      addProcessingStep("Narrowband palette batch completed");
}

function extraProcessing(id, apply_directly)
{
      var extraWin;
      var need_L_mask = extra_darker_background || 
                        extra_HDRMLT || 
                        extra_LHE;

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
      if (extra_StarNet) {
            extraStarNet(extraWin);
      }
      if (need_L_mask) {
            // Try find mask window
            // If we need to create a mask di it after we
            // have removed the stars
            if (mask_win == null) {
                  mask_win = findWindow("range_mask");
            }
            if (mask_win == null) {
                  mask_win = findWindow("AutoMask");
            }
            if (mask_win == null) {
                  mask_win_id = "AutoMask";
                  mask_win = newMaskWindow(extraWin, mask_win_id);
            }
            console.writeln("Use mask " + mask_win.mainView.id);
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
      if (extra_StarNet) {
             if (is_non_starnet_option() || is_narrowband_option()) {
                  /* Restore stars by combining starless image and stars. */
                  addProcessingStep("Restore stars by combining " + extraWin.mainView.id + " and " + star_mask_win_id);
                  runPixelMathSingleMappingEx(
                        extraWin.mainView.id, 
                        extraWin.mainView.id + " + " + star_mask_win_id,
                        false);
                  // star_mask_win_id was a temp window with maybe smaller stars
                  closeOneWindow(star_mask_win_id);
             } else {
                   // close the working windows as we did not change anything
                  closeOneWindow(extraWin.mainView.id);
                  closeOneWindow(star_mask_win_id);
             }
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
            return false;
      }

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
      R_ABE_id = null;
      G_ABE_id = null;
      B_ABE_id = null;
      RGB_win_id = null;
      start_time = Date.now();
      mask_win = null;
      star_mask_win = null;
      star_fix_mask_win = null;
      ssweight_set = false;

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
            return false;
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
                  /* Do possible channel mapping. After that we 
                   * have red_id, green_id and blue_id.
                   * Or we may have a mapped RGB image.
                   */
                  RBGmapping = mapLRGBchannels();
                  if (!RBGmapping.combined) {
                        if (ABE_before_channel_combination) {
                              run_ABE_before_channel_combination(luminance_id);
                              run_ABE_before_channel_combination(red_id);
                              run_ABE_before_channel_combination(green_id);
                              run_ABE_before_channel_combination(blue_id);
                        }
                        LinearFitLRGBchannels();
                  }
            }

            if (!is_color_files && is_luminance_images) {
                  /* This need to be run early as we create a mask from
                   * L image.
                   */
                  LRGBCreateMask();
                  ProcessLimage(RBGmapping);
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
                        LRGB_Combined = LRGB_ABE_HT_id;
                        copyWindow(
                              ImageWindow.windowById(LRGB_ABE_HT_id), 
                              "copy_" + LRGB_ABE_HT_id);
                        LRGB_ABE_HT_id = "copy_" + LRGB_ABE_HT_id;
                  }

                  if (!narrowband && !use_RGBNB_Mapping) {
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

      ensureDialogFilePath("result files");

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
      windowIconizeif(LRGB_Combined);           /* LRGB Combined image */
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
            // set batch keyword so it easy to save all file e.g. as 16 bit TIFF
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
                        printImageInfo(L_images, "L");
                  }

                  if (!monochrome_image) {
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
      }
      var end_time = Date.now();
      addProcessingStep("Script completed, time "+(end_time-start_time)/1000+" sec");
      console.noteln("======================================");

      if (preprocessed_images != start_images.FINAL) {
            writeProcessingSteps(alignedFiles, auto_continue, null);
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

      return true;
}

function printImageInfo(images, name)
{
      if (images.images.length == 0) {
            return;
      }
      addProcessingStep("* " + name + " " + images.images.length + " data files *");
      addProcessingStep(name + " images best ssweight: "+images.best_ssweight);
      addProcessingStep(name + " images best image: "+images.best_image);
      addProcessingStep(name + " exptime: "+images.exptime);
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
      var stopped = true;
      batch_narrowband_palette_mode = isbatchNarrowbandPaletteMode();
      if (batch_mode) {
            stopped = false;
            console.writeln("AutoRun in batch mode");
      } else if (batch_narrowband_palette_mode) {
            console.writeln("AutoRun in narrowband palette batch mode");
      } else {
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
                        if (batch_narrowband_palette_mode) {
                              AutoIntegrateNarrowbandPaletteBatch(false);
                        } else {
                              AutoIntegrateEngine(false);
                        }
                  } 
                  catch(err) {
                        console.criticalln(err);
                        console.criticalln("Processing stopped!");
                        writeProcessingSteps(null, false, null);
                  }
                  if (batch_mode) {
                        dialogFileNames = null;
                        console.writeln("AutoRun in batch mode");
                        closeAllWindows(keep_integrated_images);
                  }
            } else {
                  stopped = true;
            }
      } while (!stopped);
}

function aiSectionLabel(parent, text)
{
      var lbl = new Label( parent );
      lbl.useRichText = true;
      lbl.text = '<p style="color:SlateBlue"><b>' + text + "</b></p>";

      return lbl;
}

function aiLabel(parent, text, tip)
{
      var lbl = new Label( parent );
      lbl.text = text;
      lbl.textAlignment = TextAlign_Right|TextAlign_VertCenter;
      lbl.toolTip = tip;

      return lbl;
}

function aiNumericEdit(parent, txt, defval, func, tip)
{
      var edt = new NumericEdit( parent );
      edt.label.text = txt;
      edt.real = true;
      edt.edit.setFixedWidth( 6 * parent.font.width( "0" ) );
      edt.onValueUpdated = func;
      edt.setPrecision( 1 );
      edt.setRange(0.1, 999)
      edt.setValue(defval);
      edt.toolTip = tip;
      return edt;
}

function ai_RGBNB_Mapping_ComboBox(parent, channel, defindex, setValueFunc, tip)
{
      var cb = new ComboBox( parent );
      cb.toolTip = tip;
      cb.addItem( "H" );
      cb.addItem( "S" );
      cb.addItem( "O" );
      cb.addItem( "-" );
      cb.currentItem = defindex;
      cb.onItemSelected = function( itemIndex )
      {
            switch (itemIndex) {
                  case 0:
                        RemoveOption("RGBNB mapping " + channel + " using H"); 
                        setValueFunc('H');
                        break;
                  case 1:
                        RemoveOption("RGBNB mapping " + channel + " using S"); 
                        setValueFunc('S');
                        break;
                  case 2:
                        RemoveOption("RGBNB mapping " + channel + " using O"); 
                        setValueFunc('O');
                        break;
                  case 3:
                        RemoveOption("No RGBNB mapping for " + channel); 
                        setValueFunc('');
                        break;
                  }
      };
      return cb;
}

function AutoIntegrateDialog()
{
      this.__base__ = Dialog;
      this.__base__();

      var labelWidth1 = this.font.width( "Output format hints:" + 'T' );
      this.textEditWidth = 25 * this.font.width( "M" );
      this.numericEditWidth = 6 * this.font.width( "0" );

      var mainHelpTips = 
      "<p>" +
      "<b>AutoIntegrate - Automatic image integration utility</b>" +
      "</p><p>" +
      "<b>Some tips for using AutoIntegrate script</b>" +
      "</p><p>" +
      "Script automates initial steps of image processing in PixInsight. "+ 
      "Most often you get the best results by running the script with default " +
      "settings and then continue processing in Pixinsight." +
      "</p><p>"+
      "Always remember to check you data with Blink tool and remove all bad images." +
      "</p><p>" +
      "Sometimes images need some shadow cleanup with HistogramTransformation tool. "+
      "Depending on the image you can try clipping shadows between %0.01 and %0.1. " +
      "If default stretch creates too bright image try moving the histogram to the left " +
      "using HistogramTransformation tool." +
      "</p><p>" +
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
      "vignetting it is worth trying with Use ABE on combined images and Use BackgroudNeutralization options. "+
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
      //this.filesButtons_Sizer.addStretch();
      
      this.files_GroupBox = new GroupBox( this );
      this.files_GroupBox.title = "Input Images";
      this.files_GroupBox.sizer = new VerticalSizer;
      this.files_GroupBox.sizer.margin = 6;
      this.files_GroupBox.sizer.spacing = 4;
      this.files_GroupBox.sizer.add( this.files_TreeBox, this.textEditWidth );
      this.files_GroupBox.sizer.add( this.filesButtons_Sizer );   
      //this.files_GroupBox.sizer.addStretch();

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

      this.FixColumnDefectsCheckBox = newCheckBox(this, "Fix column defects", fix_column_defects, 
            "If checked, fix linear column defects by using linear defect detection algorithm from LinearDefectDetection.js script. " + 
            "Defect information is used by CosmeticCorrection to fix the defects." );
      this.FixColumnDefectsCheckBox.onClick = function(checked) { 
            fix_column_defects = checked; 
            SetOptionChecked("Fix column defects", checked); 
      }

      this.FixRowDefectsCheckBox = newCheckBox(this, "Fix row defects", fix_row_defects, 
            "If checked, fix linear row defects by using linear defect detection algorithm from LinearDefectDetection.js script. " + 
            "Defect information is used by CosmeticCorrection to fix the defects." );
      this.FixRowDefectsCheckBox.onClick = function(checked) { 
            fix_row_defects = checked; 
            SetOptionChecked("Fix linear row defects", checked); 
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

      this.keepTemporaryImagesCheckBox = newCheckBox(this, "Keep temporary images", keep_temporary_images, 
            "<p>Keep temporary images created while processing and do not close them. They will have tmp_ prefix.</p>" );
      this.keepTemporaryImagesCheckBox.onClick = function(checked) { 
            keep_temporary_images = checked; 
            SetOptionChecked("Keep temporary images", checked); 
      }

      this.ABE_before_channel_combination_CheckBox = newCheckBox(this, "Use ABE on channel images", ABE_before_channel_combination, 
      "<p>Use AutomaticBackgroundExtractor on L, R, G and B images separately before channels are combined.</p>" );
      this.ABE_before_channel_combination_CheckBox.onClick = function(checked) { 
            ABE_before_channel_combination = checked; 
            SetOptionChecked("Use ABE on L, R, G, B channels", checked); 
      }

      this.useABE_L_RGB_CheckBox = newCheckBox(this, "Use ABE on combined images", use_ABE_on_L_RGB, 
      "<p>Use AutomaticBackgroundExtractor on L and RGB images. This is the Use ABE option.</p>" );
      this.useABE_L_RGB_CheckBox.onClick = function(checked) { 
            use_ABE_on_L_RGB = checked; 
            SetOptionChecked("Use ABE on L and RGB", checked); 
      }

      this.color_calibration_before_ABE_CheckBox = newCheckBox(this, "Color calibration before ABE", color_calibration_before_ABE, 
      "<p>Run ColorCalibration before AutomaticBackgroundExtractor in run on RGB image</p>" );
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

      this.use_uwf_CheckBox = newCheckBox(this, "Ultra Wide Field", use_uwf, 
      "<p>Use Slooh Ultra Wide Field (UWF) images for integration</p>" );
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

      this.force_file_name_filter_CheckBox = newCheckBox(this, "Use file name for filters", force_file_name_filter, 
      "<p>Use file name for recognizing filters and ignore FILTER keyword.</p>" );
      this.force_file_name_filter_CheckBox.onClick = function(checked) { 
            force_file_name_filter = checked; 
            SetOptionChecked("Use file name for filters", checked); 
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

      this.stronger_noise_reduction_CheckBox = newCheckBox(this, "Stronger noise reduction", stronger_noise_reduction, 
      "<p>Use stronger noise reduction.</p>" );
      this.stronger_noise_reduction_CheckBox.onClick = function(checked) { 
            stronger_noise_reduction = checked; 
            SetOptionChecked("Stronger noise reduction", checked); 
      }

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
      this.imageParamsSet1.add( this.FixColumnDefectsCheckBox );
      this.imageParamsSet1.add( this.FixRowDefectsCheckBox );
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
      this.imageParamsSet2.add( this.stronger_noise_reduction_CheckBox );
      this.imageParamsSet2.add( this.color_calibration_before_ABE_CheckBox );
      this.imageParamsSet2.add( this.ABE_before_channel_combination_CheckBox );
      this.imageParamsSet2.add( this.useABE_L_RGB_CheckBox );
      //this.imageParamsSet2.add( this.useABE_final_CheckBox );   Not sure if this useful fo leaving off for now.
      this.imageParamsSet2.add( this.use_drizzle_CheckBox );
      this.imageParamsSet2.add( this.no_mask_contrast_CheckBox );

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

      // LRGBCombination selection

      this.LRGBCombinationLightnessControl = new NumericControl( this );
      this.LRGBCombinationLightnessControl.label.text = "Lightness";
      this.LRGBCombinationLightnessControl.setRange(0, 1);
      this.LRGBCombinationLightnessControl.setValue(LRGBCombination_lightness);
      this.LRGBCombinationLightnessControl.toolTip = "<p>LRGBCombination lightness setting. Smaller value gives more bright image. Usually should be left to the default value.</p>";
      this.LRGBCombinationLightnessControl.onValueUpdated = function( value )
      {
            SetOptionValue("LRGBCombination lightness", value);
            LRGBCombination_lightness = value;
      };

      this.LRGBCombinationSaturationControl = new NumericControl( this );
      this.LRGBCombinationSaturationControl.label.text = "Saturation";
      this.LRGBCombinationSaturationControl.setRange(0, 1);
      this.LRGBCombinationSaturationControl.setValue(LRGBCombination_saturation);
      this.LRGBCombinationSaturationControl.toolTip = "<p>LRGBCombination saturation setting. Smaller value gives more saturated image. Usually should be left to the default value.</p>";
      this.LRGBCombinationSaturationControl.onValueUpdated = function( value )
      {
            SetOptionValue("LRGBCombination saturation", value);
            LRGBCombination_saturation = value;
      };

      this.LRGBCombinationGroupBoxLabel = aiSectionLabel(this, "LRGBCombination settings");
      this.LRGBCombinationGroupBoxLabel.toolTip = 
            "LRGBCombination settings can be used to fine tune image. For relatively small " +
            "and bright objects like galaxies it may be useful to reduce brightness and increase saturation.";
      this.LRGBCombinationGroupBoxSizer = new VerticalSizer;
      this.LRGBCombinationGroupBoxSizer.margin = 6;
      this.LRGBCombinationGroupBoxSizer.spacing = 4;
      this.LRGBCombinationGroupBoxSizer.add( this.LRGBCombinationLightnessControl );
      this.LRGBCombinationGroupBoxSizer.add( this.LRGBCombinationSaturationControl );
      //this.LRGBCombinationGroupBoxSizer.addStretch();

      // Saturation selection
      this.linearSaturationLabel = new Label( this );
      this.linearSaturationLabel.text = "Linear saturation increase";
      this.linearSaturationLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      this.linearSaturationLabel.toolTip = "<p>Saturation increase in linear state using a mask.</p>";
      this.linearSaturationSpinBox = new SpinBox( this );
      this.linearSaturationSpinBox.minValue = 0;
      this.linearSaturationSpinBox.maxValue = 5;
      this.linearSaturationSpinBox.value = linear_increase_saturation;
      this.linearSaturationSpinBox.toolTip = this.linearSaturationLabel.toolTip;
      this.linearSaturationSpinBox.onValueUpdated = function( value )
      {
            SetOptionValue("Linear saturation increase", value);
            linear_increase_saturation = value;
      };

      this.nonLinearSaturationLabel = new Label( this );
      this.nonLinearSaturationLabel.text = "Non-linear saturation increase";
      this.nonLinearSaturationLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      this.nonLinearSaturationLabel.toolTip = "<p>Saturation increase in non-linear state using a mask.</p>";
      this.nonLinearSaturationSpinBox = new SpinBox( this );
      this.nonLinearSaturationSpinBox.minValue = 0;
      this.nonLinearSaturationSpinBox.maxValue = 5;
      this.nonLinearSaturationSpinBox.value = non_linear_increase_saturation;
      this.nonLinearSaturationSpinBox.toolTip = this.nonLinearSaturationLabel.toolTip;
      this.nonLinearSaturationSpinBox.onValueUpdated = function( value )
      {
            SetOptionValue("Non-linear saturation increase", value);
            non_linear_increase_saturation = value;
      };

      this.saturationGroupBoxLabel = aiSectionLabel(this, "Saturation setting");
      this.saturationGroupBoxSizer = new HorizontalSizer;
      this.saturationGroupBoxSizer.margin = 6;
      this.saturationGroupBoxSizer.spacing = 4;
      this.saturationGroupBoxSizer.add( this.linearSaturationLabel );
      this.saturationGroupBoxSizer.add( this.linearSaturationSpinBox );
      this.saturationGroupBoxSizer.add( this.nonLinearSaturationLabel );
      this.saturationGroupBoxSizer.add( this.nonLinearSaturationSpinBox );
      //this.saturationGroupBoxSizer.addStretch();

      // Other parameters set 1.
      this.otherParamsSet1 = new VerticalSizer;
      this.otherParamsSet1.margin = 6;
      this.otherParamsSet1.spacing = 4;
      this.otherParamsSet1.add( this.IntegrateOnlyCheckBox );
      this.otherParamsSet1.add( this.ChannelCombinationOnlyCheckBox );
      this.otherParamsSet1.add( this.RRGB_image_CheckBox );
      this.otherParamsSet1.add( this.synthetic_l_image_CheckBox );
      this.otherParamsSet1.add( this.synthetic_missing_images_CheckBox );
      this.otherParamsSet1.add( this.force_file_name_filter_CheckBox );

      // Other parameters set 2.
      this.otherParamsSet2 = new VerticalSizer;
      this.otherParamsSet2.margin = 6;
      this.otherParamsSet2.spacing = 4;
      this.otherParamsSet2.add( this.keepIntegratedImagesCheckBox );
      this.otherParamsSet2.add( this.keepTemporaryImagesCheckBox );
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
      var weightHelpToolTips =
            "<p>" +
            "Generic - Use both noise and stars for the weight calculation." +
            "</p><p>" +
            "Noise - More weight on image noise." +
            "</p><p>" +
            "Stars - More weight on stars." +
            "</p>";

      this.weightComboBox = new ComboBox( this );
      this.weightComboBox.toolTip = weightHelpToolTips;
      this.weightComboBox.addItem( "Generic" );
      this.weightComboBox.addItem( "Noise" );
      this.weightComboBox.addItem( "Stars" );
      this.weightComboBox.onItemSelected = function( itemIndex )
      {
            switch (itemIndex) {
                  case 0:
                        RemoveOption("Weight"); 
                        use_weight = 'G'; 
                        break;
                  case 1:
                        SetOptionValue("Weight", "Noise"); 
                        use_weight = 'N'; 
                        break;
                  case 2:
                        SetOptionValue("Weight", "Stars"); 
                        use_weight = 'S'; 
                        break;
            }
      };

      this.weightGroupBoxLabel = aiSectionLabel(this, "Image weight calculation settings");
      this.weightGroupBoxSizer = new HorizontalSizer;
      this.weightGroupBoxSizer.margin = 6;
      this.weightGroupBoxSizer.spacing = 4;
      this.weightGroupBoxSizer.add( this.weightComboBox );
      this.weightGroupBoxSizer.toolTip = weightHelpToolTips;
      // Stop columns of buttons moving as dialog expands horizontally.
      this.weightGroupBoxSizer.addStretch();
      
      // CosmeticCorrection Sigma values
      //
      this.cosmeticCorrectionSigmaGroupBoxLabel = aiSectionLabel(this, "CosmeticCorrection Sigma values");
      
      var cosmeticCorrectionSigmaGroupBoxLabeltoolTip = "Hot Sigma and Cold Sigma values for CosmeticCorrection";

      this.cosmeticCorrectionHotSigmaGroupBoxLabel = aiLabel(this, "Hot Sigma", cosmeticCorrectionSigmaGroupBoxLabeltoolTip);
      this.cosmeticCorrectionHotSigmaSpinBox = new SpinBox( this );
      this.cosmeticCorrectionHotSigmaSpinBox.minValue = 0;
      this.cosmeticCorrectionHotSigmaSpinBox.maxValue = 10;
      this.cosmeticCorrectionHotSigmaSpinBox.value = cosmetic_sorrection_hot_sigma;
      this.cosmeticCorrectionHotSigmaSpinBox.toolTip = cosmeticCorrectionSigmaGroupBoxLabeltoolTip;
      this.cosmeticCorrectionHotSigmaSpinBox.onValueUpdated = function( value )
      {
            SetOptionValue("CosmeticCorrection Hot Sigma", value);
            cosmetic_sorrection_hot_sigma = value;
      };
      this.cosmeticCorrectionColSigmaGroupBoxLabel = aiLabel(this, "Cold Sigma", cosmeticCorrectionSigmaGroupBoxLabeltoolTip);
      this.cosmeticCorrectionColdSigmaSpinBox = new SpinBox( this );
      this.cosmeticCorrectionColdSigmaSpinBox.minValue = 0;
      this.cosmeticCorrectionColdSigmaSpinBox.maxValue = 10;
      this.cosmeticCorrectionColdSigmaSpinBox.value = cosmetic_sorrection_cold_sigma;
      this.cosmeticCorrectionColdSigmaSpinBox.toolTip = cosmeticCorrectionSigmaGroupBoxLabeltoolTip;
      this.cosmeticCorrectionColdSigmaSpinBox.onValueUpdated = function( value )
      {
            SetOptionValue("CosmeticCorrection Cold Sigma", value);
            cosmetic_sorrection_cold_sigma = value;
      };
      this.cosmeticCorrectionSigmaGroupBoxSizer = new HorizontalSizer;
      this.cosmeticCorrectionSigmaGroupBoxSizer.margin = 6;
      this.cosmeticCorrectionSigmaGroupBoxSizer.spacing = 4;
      this.cosmeticCorrectionSigmaGroupBoxSizer.add( this.cosmeticCorrectionHotSigmaGroupBoxLabel );
      this.cosmeticCorrectionSigmaGroupBoxSizer.add( this.cosmeticCorrectionHotSigmaSpinBox );
      this.cosmeticCorrectionSigmaGroupBoxSizer.add( this.cosmeticCorrectionColSigmaGroupBoxLabel );
      this.cosmeticCorrectionSigmaGroupBoxSizer.add( this.cosmeticCorrectionColdSigmaSpinBox );
      this.cosmeticCorrectionSigmaGroupBoxSizer.toolTip = cosmeticCorrectionSigmaGroupBoxLabeltoolTip;
      // Stop columns of buttons moving as dialog expands horizontally.
      this.cosmeticCorrectionSigmaGroupBoxSizer.addStretch();

      this.cosmeticCorrectionGroupBoxSizer = new VerticalSizer;
      //this.cosmeticCorrectionGroupBoxSizer.margin = 6;
      //this.cosmeticCorrectionGroupBoxSizer.spacing = 4;
      this.cosmeticCorrectionGroupBoxSizer.add( this.cosmeticCorrectionSigmaGroupBoxLabel );
      this.cosmeticCorrectionGroupBoxSizer.add( this.cosmeticCorrectionSigmaGroupBoxSizer );
      this.cosmeticCorrectionGroupBoxSizer.toolTip = cosmeticCorrectionSigmaGroupBoxLabeltoolTip;
      // Stop columns of buttons moving as dialog expands horizontally.
      this.cosmeticCorrectionGroupBoxSizer.addStretch();

      // Combined weight and sigma settings
      this.weightSizer = new VerticalSizer;
      //this.weightSizer.margin = 6;
      //this.weightSizer.spacing = 4;
      this.weightSizer.add( this.weightGroupBoxLabel );
      this.weightSizer.add( this.weightGroupBoxSizer );

      this.weightAndSigmaSizer = new HorizontalSizer;
      //this.weightAndSigmaSizer.margin = 6;
      this.weightAndSigmaSizer.spacing = 8;
      this.weightAndSigmaSizer.add( this.weightSizer );
      this.weightAndSigmaSizer.add( this.cosmeticCorrectionGroupBoxSizer );

      // Linear Fit selection

      this.linearFitComboBox = new ComboBox( this );
      this.linearFitComboBox.toolTip = "Choose how to do linear fit of images.";
      this.linearFitComboBox.addItem( "Luminance" );
      this.linearFitComboBox.addItem( "Red" );
      this.linearFitComboBox.addItem( "Green" );
      this.linearFitComboBox.addItem( "Blue" );
      this.linearFitComboBox.addItem( "No linear fit" );
      this.linearFitComboBox.onItemSelected = function( itemIndex )
      {
            switch (itemIndex) {
                  case 0:
                        use_linear_fit = 'L'; 
                        RemoveOption("Linear fit");
                        break;
                  case 1:
                        use_linear_fit = 'R'; 
                        SetOptionValue("Linear fit", "Red"); 
                        break;
                  case 2:
                        use_linear_fit = 'G'; 
                        SetOptionValue("Linear fit", "Green"); 
                        break;
                  case 3:
                        use_linear_fit = 'B'; 
                        SetOptionValue("Linear fit", "Blue"); 
                        break;
                  case 4:
                        use_linear_fit = 'no'; 
                        SetOptionValue("Linear fit", "No linear fit"); 
                        break;
                  }
      };

      this.linearFitGroupBoxLabel = aiSectionLabel(this, "Linear fit setting");
      this.linearFitGroupBoxSizer = new HorizontalSizer;
      this.linearFitGroupBoxSizer.margin = 6;
      this.linearFitGroupBoxSizer.spacing = 4;
      this.linearFitGroupBoxSizer.add( this.linearFitComboBox );
      // Stop columns of buttons moving as dialog expands horizontally.
      this.linearFitGroupBoxSizer.addStretch();

      //
      // Stretching
      //

      this.stretchingComboBox = new ComboBox( this );
      this.stretchingComboBox.toolTip = 
            "Auto STF - Use auto Screen Transfer Function to stretch image to non-linear.\n" +
            "Masked Stretch - Use MaskedStretch to stretch image to non-linear.\n" +
            "Use both - Use auto Screen Transfer Function for luminance and MaskedStretch for RGB to stretch image to non-linear.";
      this.stretchingComboBox.addItem( "Auto STF" );
      this.stretchingComboBox.addItem( "Masked Stretch" );
      this.stretchingComboBox.addItem( "Use both" );
      this.stretchingComboBox.onItemSelected = function( itemIndex )
      {
            switch (itemIndex) {
                  case 0:
                        image_stretching = 'STF'; 
                        SetOptionValue("Stretching", "Auto STF");
                        break;
                  case 1:
                        image_stretching = 'Masked'; 
                        SetOptionValue("Stretching", "Masked Stretch");
                        break;
                  case 2:
                        image_stretching = 'Both'; 
                        SetOptionValue("Stretching", "Auto STF and Masked Stretch");
                        break;
            }
      };

      this.stretchingChoiceSizer = new HorizontalSizer;
      this.stretchingChoiceSizer.margin = 6;
      this.stretchingChoiceSizer.spacing = 4;
      this.stretchingChoiceSizer.add( this.stretchingComboBox );
      this.stretchingChoiceSizer.addStretch();

      this.STFLabel = new Label( this );
      this.STFLabel.text = "Auto STF link RGB channels";
      this.STFLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      this.STFLabel.toolTip = 
      "<p>" +
      "RGB channel linking in Screen Transfer Function. Using Unlinked can help reduce color cast with OSC images." +
      "</p><p>" +
      "With Auto the default for true RGB images is to use linked channels. For narrowband images the default " +
      "is to use unlinked channels. But if linear fit is done with narrowband images, then linked channels are used." +
      "</p>";
      this.STFComboBox = new ComboBox( this );
      this.STFComboBox.toolTip = this.STFLabel.toolTip;
      this.STFComboBox.addItem( "Auto" );
      this.STFComboBox.addItem( "Linked" );
      this.STFComboBox.addItem( "Unlinked" );
      this.STFComboBox.onItemSelected = function( itemIndex )
      {
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
      this.STFSizer.toolTip = this.STFLabel.toolTip;
      this.STFSizer.add( this.STFLabel );
      this.STFSizer.add( this.STFComboBox );

      this.MaskedStretchTargetBackgroundControl = new NumericControl( this );
      this.MaskedStretchTargetBackgroundControl.label.text = "Masked Stretch targetBackground";
      this.MaskedStretchTargetBackgroundControl.setRange(0, 1);
      this.MaskedStretchTargetBackgroundControl.setValue(MaskedStretch_targetBackground);
      this.MaskedStretchTargetBackgroundControl.toolTip = "<p>Masked Stretch targetBackground value. Usually values between 0.1 and 0.2 work best.</p>";
      this.MaskedStretchTargetBackgroundControl.onValueUpdated = function( value )
      {
            SetOptionValue("Masked Stretch targetBackground", value);
            MaskedStretch_targetBackground = value;
      };

      this.StretchingOptionsSizer = new VerticalSizer;
      this.StretchingOptionsSizer.spacing = 4;
      this.StretchingOptionsSizer.margin = 2;
      this.StretchingOptionsSizer.add( this.STFSizer );
      this.StretchingOptionsSizer.add( this.MaskedStretchTargetBackgroundControl );
      //this.StretchingOptionsSizer.addStretch();

      this.StretchingGroupBoxLabel = aiSectionLabel(this, "Image stretching settings");
      this.StretchingGroupBoxLabel.toolTip = "Settings for stretching linear image image to non-linear.";
      this.StretchingGroupBoxSizer = new VerticalSizer;
      this.StretchingGroupBoxSizer.margin = 6;
      this.StretchingGroupBoxSizer.spacing = 4;
      this.StretchingGroupBoxSizer.add( this.stretchingChoiceSizer );
      this.StretchingGroupBoxSizer.add( this.StretchingOptionsSizer );
      // Stop columns of buttons moving as dialog expands horizontally.
      //this.StretchingGroupBoxSizer.addStretch();

      //
      // Image integration
      //
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
      this.ImageIntegrationRejectionLabel.toolTip = ImageIntegrationHelpToolTips;
      this.ImageIntegrationRejectionLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
   
      this.ImageIntegrationRejectionComboBox = new ComboBox( this );
      this.ImageIntegrationRejectionComboBox.toolTip = ImageIntegrationHelpToolTips;
      this.ImageIntegrationRejectionComboBox.addItem( "Auto1" );
      this.ImageIntegrationRejectionComboBox.addItem( "Auto2" );
      this.ImageIntegrationRejectionComboBox.addItem( "Percentile" );
      this.ImageIntegrationRejectionComboBox.addItem( "Sigma" );
      this.ImageIntegrationRejectionComboBox.addItem( "Winsorised sigma" );
      this.ImageIntegrationRejectionComboBox.addItem( "Averaged sigma" );
      this.ImageIntegrationRejectionComboBox.addItem( "Linear fit" );
      this.ImageIntegrationRejectionComboBox.onItemSelected = function( itemIndex )
      {
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

      this.clippingGroupBoxLabel = aiSectionLabel(this, 'Image integration pixel rejection');
      this.clippingGroupBoxSizer = new HorizontalSizer;
      this.clippingGroupBoxSizer.margin = 6;
      this.clippingGroupBoxSizer.spacing = 4;
      this.clippingGroupBoxSizer.add( this.ImageIntegrationNormalizationSizer );
      this.clippingGroupBoxSizer.add( this.ImageIntegrationRejectionSizer );
      this.clippingGroupBoxSizer.toolTip = ImageIntegrationHelpToolTips;
      // Stop columns of buttons moving as dialog expands horizontally.
      //this.clippingGroupBoxSizer.addStretch();

      // Narrowband palette

      var narrowbandAllTip = 
            "Option All runs all narrowband palettes in a batch mode and creates images with names Auto_+palette-name. You can use " +
            "extra options, then also images with name Auto_+palette-name+_extra are created. Images are saved as .xisf files. " +
            "Use Save batch result files buttons to save them all in a different format. " + 
            "To use All option all HSO filters must be available.";

      var narrowbandToolTip = 
      "<p>" +
      "Color palette used to map SII, Ha and OIII to R, G and B" +
      "</p><p>" +
      "There is a list of predefined mapping that can be used, some examples are below." +
      "</p><p>" +
      "SHO - SII=R, Ha=G, OIII=B  (Hubble)<br>" +
      "HOS - Ha=R, OIII=G, SII=B (CFHT)<br>" +
      "HOO - Ha=R, OIII=G, OIII=B (if there is SII it is ignored)" +
      "</p><p>" +
      "Mapping formulas are editable and other palettes can use any combination of channel images." +
      "</p><p>" +
      "Special keywords H, S, O, R, G and B are recognized and replaced " +
      "with corresponding channel image names. Otherwise these formulas " +
      "are passed directly to PixelMath process." +
      "</p><p>" +
      narrowbandAllTip + 
      "</p>";

      this.narrowbandColorPaletteLabel = aiSectionLabel(this, "Color palette");
      this.narrowbandColorPaletteLabel.toolTip = narrowbandToolTip;

      /* Narrowband to RGB mappings. 
       */
      this.narrowbandCustomPalette_ComboBox = new ComboBox( this );
      for (var i = 0; i < narrowBandPalettes.length; i++) {
            this.narrowbandCustomPalette_ComboBox.addItem( narrowBandPalettes[i].name );
      }
      this.narrowbandCustomPalette_ComboBox.toolTip = 
            "<p>" +
            "List of predefined color palettes. You can also edit mapping input boxes to create your own mapping." +
            "</p><p>" +
            "Dynamic palettes, credit https://thecoldestnights.com/2020/06/pixinsight-dynamic-narrowband-combinations-with-pixelmath/" +
            "</p>" +
            narrowbandToolTip;
      this.narrowbandCustomPalette_ComboBox.onItemSelected = function( itemIndex )
      {
            this.dialog.narrowbandCustomPalette_R_ComboBox.editText = narrowBandPalettes[itemIndex].R;
            this.dialog.narrowbandCustomPalette_G_ComboBox.editText = narrowBandPalettes[itemIndex].G;
            this.dialog.narrowbandCustomPalette_B_ComboBox.editText = narrowBandPalettes[itemIndex].B;

            custom_R_mapping = this.dialog.narrowbandCustomPalette_R_ComboBox.editText;
            custom_G_mapping = this.dialog.narrowbandCustomPalette_G_ComboBox.editText;
            custom_B_mapping = this.dialog.narrowbandCustomPalette_B_ComboBox.editText;
      };

      /* Create Editable boxes for R, G and B mapping. 
       */
      this.narrowbandCustomPalette_R_Label = new Label( this );
      this.narrowbandCustomPalette_R_Label.text = "R";
      this.narrowbandCustomPalette_R_Label.textAlignment = TextAlign_Right|TextAlign_VertCenter;
      this.narrowbandCustomPalette_R_Label.toolTip = 
            "<p>" +
            "Mapping for R channel. Use one of the prefined mappings or edit and create your own mapping." +
            "</p>" +
            narrowbandToolTip;
      this.narrowbandCustomPalette_R_ComboBox = new ComboBox( this );
      this.narrowbandCustomPalette_R_ComboBox.enabled = true;
      this.narrowbandCustomPalette_R_ComboBox.editEnabled = true;
      this.narrowbandCustomPalette_R_ComboBox.addItem(custom_R_mapping);
      this.narrowbandCustomPalette_R_ComboBox.addItem("0.75*H + 0.25*S");
      this.narrowbandCustomPalette_R_ComboBox.toolTip = this.narrowbandCustomPalette_R_Label.toolTip;
      this.narrowbandCustomPalette_R_ComboBox.onEditTextUpdated = function() { 
            custom_R_mapping = this.editText.trim(); 
            SetOptionValue("Narrowband R mapping", this.editText); 
      };

      this.narrowbandCustomPalette_G_Label = new Label( this );
      this.narrowbandCustomPalette_G_Label.text = "G";
      this.narrowbandCustomPalette_G_Label.textAlignment = TextAlign_Right|TextAlign_VertCenter;
      this.narrowbandCustomPalette_G_Label.toolTip = 
            "<p>" +
            "Mapping for G channel. Use one of the prefined mappings or edit and create your own mapping." +
            "</p>" +
            narrowbandToolTip;
      this.narrowbandCustomPalette_G_ComboBox = new ComboBox( this );
      this.narrowbandCustomPalette_G_ComboBox.enabled = true;
      this.narrowbandCustomPalette_G_ComboBox.editEnabled = true;
      this.narrowbandCustomPalette_G_ComboBox.addItem(custom_G_mapping);
      this.narrowbandCustomPalette_G_ComboBox.addItem("0.50*S + 0.50*O");
      this.narrowbandCustomPalette_G_ComboBox.toolTip = this.narrowbandCustomPalette_G_Label.toolTip;
      this.narrowbandCustomPalette_G_ComboBox.onEditTextUpdated = function() { 
            custom_G_mapping = this.editText.trim(); 
            SetOptionValue("Narrowband G mapping", this.editText); 
      };

      this.narrowbandCustomPalette_B_Label = new Label( this );
      this.narrowbandCustomPalette_B_Label.text = "B";
      this.narrowbandCustomPalette_B_Label.textAlignment = TextAlign_Right|TextAlign_VertCenter;
      this.narrowbandCustomPalette_B_Label.toolTip = 
            "<p>" +
            "Mapping for B channel. Use one of the prefined mappings or edit and create your own mapping." +
            "</p>" +
            narrowbandToolTip;
      this.narrowbandCustomPalette_B_ComboBox = new ComboBox( this );
      this.narrowbandCustomPalette_B_ComboBox.enabled = true;
      this.narrowbandCustomPalette_B_ComboBox.editEnabled = true;
      this.narrowbandCustomPalette_B_ComboBox.addItem(custom_B_mapping);
      this.narrowbandCustomPalette_B_ComboBox.addItem("0.30*H + 0.70*O");
      this.narrowbandCustomPalette_B_ComboBox.toolTip = this.narrowbandCustomPalette_B_Label.toolTip;
      this.narrowbandCustomPalette_B_ComboBox.onEditTextUpdated = function() { 
            custom_B_mapping = this.editText.trim(); 
            SetOptionValue("Narrowband B mapping", this.editText); 
      };

      this.narrowbandCustomPalette_Sizer = new HorizontalSizer;
      this.narrowbandCustomPalette_Sizer.margin = 6;
      this.narrowbandCustomPalette_Sizer.spacing = 4;
      this.narrowbandCustomPalette_Sizer.toolTip = narrowbandToolTip;
      this.narrowbandCustomPalette_Sizer.add( this.narrowbandCustomPalette_ComboBox );
      this.narrowbandCustomPalette_Sizer.add( this.narrowbandCustomPalette_R_Label );
      this.narrowbandCustomPalette_Sizer.add( this.narrowbandCustomPalette_R_ComboBox );
      this.narrowbandCustomPalette_Sizer.add( this.narrowbandCustomPalette_G_Label );
      this.narrowbandCustomPalette_Sizer.add( this.narrowbandCustomPalette_G_ComboBox );
      this.narrowbandCustomPalette_Sizer.add( this.narrowbandCustomPalette_B_Label );
      this.narrowbandCustomPalette_Sizer.add( this.narrowbandCustomPalette_B_ComboBox );

      this.mapping_on_nonlinear_data_CheckBox = newCheckBox(this, "Narrowband mapping using non-linear data", mapping_on_nonlinear_data, 
            "<p>" +
            "Do narrowband mapping using non-linear data. Before running PixelMath images are stretched to non-linear state. " +
            "</p>" );
      this.mapping_on_nonlinear_data_CheckBox.onClick = function(checked) { 
            mapping_on_nonlinear_data = checked; 
            SetOptionChecked("Narrowband mapping using non-linear data", checked); 
      }

      this.narrowbandLinearFit_Label = new Label( this );
      this.narrowbandLinearFit_Label.text = "Linear fit";
      this.narrowbandLinearFit_Label.textAlignment = TextAlign_Right|TextAlign_VertCenter;
      this.narrowbandLinearFit_Label.toolTip = 
            "<p>" +
            "Linear fit setting before running PixelMath." +
            "</p><p>" +
            "None does not use linear fit.<br>" +
            "Auto uses linear fit and tries to choose a less bright channel, first O and then S.<br>" +
            "Other selections use linear fit with that channel image." +
            "</p>";
      this.narrowbandLinearFit_Label.margin = 6;
      this.narrowbandLinearFit_Label.spacing = 4;
      this.narrowbandLinearFit_ComboBox = new ComboBox( this );
      this.narrowbandLinearFit_ComboBox.addItem( "Auto" );
      this.narrowbandLinearFit_ComboBox.addItem( "H" );
      this.narrowbandLinearFit_ComboBox.addItem( "S" );
      this.narrowbandLinearFit_ComboBox.addItem( "O" );
      this.narrowbandLinearFit_ComboBox.addItem( "None" );
      this.narrowbandLinearFit_ComboBox.toolTip = this.narrowbandLinearFit_Label.toolTip;
      this.narrowbandLinearFit_ComboBox.onItemSelected = function( itemIndex )
      {
            switch (itemIndex) {
                  case 0:
                        narrowband_linear_fit = "Auto";
                        break;
                  case 1:
                        narrowband_linear_fit = "H";
                        break;
                  case 2:
                        narrowband_linear_fit = "S";
                        break;
                  case 3:
                        narrowband_linear_fit = "O";
                        break;
                  case 4:
                        narrowband_linear_fit = "None";
                        break;
            }
            SetOptionValue("Narrowband linear fit", narrowband_linear_fit); 
      };


      this.mapping_on_nonlinear_data_Sizer = new HorizontalSizer;
      this.mapping_on_nonlinear_data_Sizer.margin = 2;
      this.mapping_on_nonlinear_data_Sizer.spacing = 4;
      this.mapping_on_nonlinear_data_Sizer.add( this.mapping_on_nonlinear_data_CheckBox );
      this.mapping_on_nonlinear_data_Sizer.add( this.narrowbandLinearFit_Label );
      this.mapping_on_nonlinear_data_Sizer.add( this.narrowbandLinearFit_ComboBox );

      /* Luminance channel mapping.
       */
      this.narrowbandLuminancePalette_ComboBox = new ComboBox( this );
      this.narrowbandLuminancePalette_ComboBox.addItem( "L" );
      this.narrowbandLuminancePalette_ComboBox.addItem( "max(L, H)" );
      this.narrowbandLuminancePalette_ComboBox.toolTip = "Mapping of Luminance channel with narrowband data, if both are available.";
      this.narrowbandLuminancePalette_ComboBox.onItemSelected = function( itemIndex )
      {
            switch (itemIndex) {
                  case 0:
                        this.dialog.narrowbandCustomPalette_L_ComboBox.editText = "L";
                        break;
                  case 1:
                        this.dialog.narrowbandCustomPalette_L_ComboBox.editText = "max(L, H)";
                        break;
            }
            custom_L_mapping = this.dialog.narrowbandCustomPalette_L_ComboBox.editText;
            SetOptionValue("Narrowband L mapping", this.editText); 
      };

      this.narrowbandCustomPalette_L_Label = new Label( this );
      this.narrowbandCustomPalette_L_Label.text = "L";
      this.narrowbandCustomPalette_L_Label.textAlignment = TextAlign_Right|TextAlign_VertCenter;
      this.narrowbandCustomPalette_L_Label.toolTip = this.narrowbandLuminancePalette_ComboBox.toolTip;
      this.narrowbandCustomPalette_L_ComboBox = new ComboBox( this );
      this.narrowbandCustomPalette_L_ComboBox.enabled = true;
      this.narrowbandCustomPalette_L_ComboBox.editEnabled = true;
      this.narrowbandCustomPalette_L_ComboBox.addItem(custom_L_mapping);
      this.narrowbandCustomPalette_L_ComboBox.addItem("max(L, H)");
      this.narrowbandCustomPalette_L_ComboBox.toolTip = this.narrowbandLuminancePalette_ComboBox.toolTip
      this.narrowbandCustomPalette_L_ComboBox.onEditTextUpdated = function() { 
            custom_L_mapping = this.editText.trim(); 
            SetOptionValue("Narrowband L mapping", this.editText); 
      };

      this.NbLuminanceLabel = new Label( this );
      this.NbLuminanceLabel.text = "Luminance mapping";
      this.NbLuminanceLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      this.NbLuminanceLabel.toolTip = this.narrowbandLuminancePalette_ComboBox.toolTip;
      this.NbLuminanceSizer = new HorizontalSizer;
      this.NbLuminanceSizer.margin = 2;
      this.NbLuminanceSizer.spacing = 4;
      this.NbLuminanceSizer.add( this.NbLuminanceLabel );
      this.NbLuminanceSizer.add( this.narrowbandLuminancePalette_ComboBox );
      this.NbLuminanceSizer.add( this.narrowbandCustomPalette_L_Label );
      this.NbLuminanceSizer.add( this.narrowbandCustomPalette_L_ComboBox );
      this.NbLuminanceSizer.addStretch();

      /* RGBNB mapping.
       */
      var RGBNB_tooltip = 
            "<p>" +
            "A special processing is used for narrowband to (L)RGB image " +
            "mapping. It is used to enhance (L)RGB channels with narrowband data. " + 
            "</p><p>" +
            "This mapping cannot be used without RGB filters. " + 
            "</p><p>" +
            "This mapping is similar to NBRGBCombination script in Pixinsight or " +
            "as described in Light Vortex Astronomy tutorial Combining LRGB with Narrowband. " +
            "You can find more details on parameters from those sources. " +
            "</p><p>" +
            "If narrowband RGB mapping is used then narrowband Color palette is not used." +
            "</p><p>" +
            "With narrowband RGB mapping you can choose:<br>" +
            "- Which narrowband channels mapped (L)RGB channels to enhance those.<br>" +
            "- Boost for (L)RGB channels.<br>" +
            "- Bandwidth for each filter.<br>" +
            "- Test the mapping with a test button" +
            "</p><p>" +
            "If there is no Luminance channel available then selections for L channel are ignored." +
            "</p>";
            
      this.useRGBNBmapping_CheckBox = newCheckBox(this, "Use Narrowband RGB mapping", use_RGBNB_Mapping, RGBNB_tooltip);
      this.useRGBNBmapping_CheckBox.onClick = function(checked) { 
            use_RGBNB_Mapping = checked; 
            SetOptionChecked("Use Narrowband RGB mapping", checked); 
      }
      this.useRGBbandwidth_CheckBox = newCheckBox(this, "Use RGB image", use_RGB_image, 
            "<p>" +
            "Use RGB image for bandwidth mapping instead of separate R, G and B channel images. " +
            "R channel bandwidth is then used for the RGB image." +
            "</p>" );
      this.useRGBbandwidth_CheckBox.onClick = function(checked) { 
            use_RGB_image = checked; 
            SetOptionChecked("Use RGB image", checked); 
      }
      this.useRGBNBmappingSizer = new HorizontalSizer;
      this.useRGBNBmappingSizer.margin = 6;
      this.useRGBNBmappingSizer.spacing = 4;
      this.useRGBNBmappingSizer.add( this.useRGBNBmapping_CheckBox );
      this.useRGBNBmappingSizer.add( this.useRGBbandwidth_CheckBox );

      // Button to test narrowband mapping
      this.testNarrowbandMappingButton = new PushButton( this );
      this.testNarrowbandMappingButton.text = "Test";
      this.testNarrowbandMappingButton.toolTip = 
            "<p>" +
            "Test narrowband RGB mapping. This requires that you have opened:" +
            "</p><p>" +
            "- Integration_RGB file.<br>" +
            "- Those narrowband files Integration_[SHO] that are used in the mapping." +
            "</p><p>" +
            "To get required Integration_RGB and Integration_[SHO] files you can a full workflow first." +
            "</p><p>" +
            "Result image will be in linear mode." +
            "</p>" ;
      this.testNarrowbandMappingButton.onClick = function()
      {
            console.writeln("Test narrowband mapping");
            use_RGBNB_Mapping = true;
            try {
                  testRGBNBmapping();
            } 
            catch(err) {
                  console.criticalln(err);
                  console.criticalln("Processing stopped!");
                  writeProcessingSteps(null, true, "AutoRGBNB");
                  console.endLog();
            }
            use_RGBNB_Mapping = false;
      };   

      // channel mapping
      this.RGBNB_MappingLabel = aiLabel(this, 'Mapping', "Select mapping of narrowband channels to (L)RGB channels.");
      this.RGBNB_MappingLLabel = aiLabel(this, 'L', "Mapping of narrowband channel to L channel. If there is no L channel available then this setting is ignored.");
      this.RGBNB_MappingLValue = ai_RGBNB_Mapping_ComboBox(this, "L", 0, function(value) { L_mapping = value; }, this.RGBNB_MappingLLabel.toolTip);
      this.RGBNB_MappingRLabel = aiLabel(this, 'R', "Mapping of narrowband channel to R channel. If no mapping is selected then channel is left unchanged.");
      this.RGBNB_MappingRValue = ai_RGBNB_Mapping_ComboBox(this, "R", 0, function(value) { R_mapping = value; }, this.RGBNB_MappingRLabel.toolTip);
      this.RGBNB_MappingGLabel = aiLabel(this, 'G', "Mapping of narrowband channel to G channel. If no mapping is selected then channel is left unchanged.");
      this.RGBNB_MappingGValue = ai_RGBNB_Mapping_ComboBox(this, "G", 2, function(value) { G_mapping = value; }, this.RGBNB_MappingGLabel.toolTip);
      this.RGBNB_MappingBLabel = aiLabel(this, 'B', "Mapping of narrowband channel to G channel. If no mapping is selected then channel is left unchanged.");
      this.RGBNB_MappingBValue = ai_RGBNB_Mapping_ComboBox(this, "B", 2, function(value) { B_mapping = value; }, this.RGBNB_MappingBLabel.toolTip);

      this.RGBNB_MappingSizer = new HorizontalSizer;
      this.RGBNB_MappingSizer.margin = 6;
      this.RGBNB_MappingSizer.spacing = 4;
      this.RGBNB_MappingSizer.add( this.RGBNB_MappingLabel );
      this.RGBNB_MappingSizer.add( this.RGBNB_MappingLLabel );
      this.RGBNB_MappingSizer.add( this.RGBNB_MappingLValue );
      this.RGBNB_MappingSizer.add( this.RGBNB_MappingRLabel );
      this.RGBNB_MappingSizer.add( this.RGBNB_MappingRValue );
      this.RGBNB_MappingSizer.add( this.RGBNB_MappingGLabel );
      this.RGBNB_MappingSizer.add( this.RGBNB_MappingGValue );
      this.RGBNB_MappingSizer.add( this.RGBNB_MappingBLabel );
      this.RGBNB_MappingSizer.add( this.RGBNB_MappingBValue );
      this.RGBNB_MappingSizer.addStretch();

      // Boost factor for LRGB
      this.RGBNB_BoostLabel = aiLabel(this, 'Boost', "Select boost, or multiplication factor, for the channels.");
      this.RGBNB_BoostLValue = aiNumericEdit(this, 'L', L_BoostFactor, function(value) { L_BoostFactor = value; }, "Boost, or multiplication factor, for the L channel.");
      this.RGBNB_BoostRValue = aiNumericEdit(this, 'R', R_BoostFactor, function(value) { R_BoostFactor = value; }, "Boost, or multiplication factor, for the R channel.");
      this.RGBNB_BoostGValue = aiNumericEdit(this, 'G', G_BoostFactor, function(value) { G_BoostFactor = value; }, "Boost, or multiplication factor, for the G channel.");
      this.RGBNB_BoostBValue = aiNumericEdit(this, 'B', B_BoostFactor, function(value) { B_BoostFactor = value; }, "Boost, or multiplication factor, for the B channel.");

      this.RGBNB_BoostSizer = new HorizontalSizer;
      this.RGBNB_BoostSizer.margin = 6;
      this.RGBNB_BoostSizer.spacing = 4;
      this.RGBNB_BoostSizer.add( this.RGBNB_BoostLabel );
      this.RGBNB_BoostSizer.add( this.RGBNB_BoostLValue );
      this.RGBNB_BoostSizer.add( this.RGBNB_BoostRValue );
      this.RGBNB_BoostSizer.add( this.RGBNB_BoostGValue );
      this.RGBNB_BoostSizer.add( this.RGBNB_BoostBValue );
      this.RGBNB_BoostSizer.addStretch();

      this.RGBNB_Sizer1 = new HorizontalSizer;
      this.RGBNB_Sizer1.add(this.RGBNB_MappingSizer);
      this.RGBNB_Sizer1.add(this.RGBNB_BoostSizer);
      this.RGBNB_Sizer1.addStretch();

      // Bandwidth for different channels
      this.RGBNB_BandwidthLabel = aiLabel(this, 'Bandwidth', "Select bandwidth (nm) for each filter.");
      //this.RGBNB_BandwidthRGBValue = aiNumericEdit(this, 'RGB', RGB_bandwidth, function(value) { RGB_bandwidth = value; } );
      this.RGBNB_BandwidthLValue = aiNumericEdit(this, 'L', L_bandwidth, function(value) { L_bandwidth = value; }, "Bandwidth (nm) for the L filter.");
      this.RGBNB_BandwidthRValue = aiNumericEdit(this, 'R', R_bandwidth, function(value) { R_bandwidth = value; }, "Bandwidth (nm) for the R filter.");
      this.RGBNB_BandwidthGValue = aiNumericEdit(this, 'G', G_bandwidth, function(value) { G_bandwidth = value; }, "Bandwidth (nm) for the G filter.");
      this.RGBNB_BandwidthBValue = aiNumericEdit(this, 'B', B_bandwidth, function(value) { B_bandwidth = value; }, "Bandwidth (nm) for the B filter.");
      this.RGBNB_BandwidthHValue = aiNumericEdit(this, 'H', H_bandwidth, function(value) { H_bandwidth = value; }, "Bandwidth (nm) for the H filter. Typical values could be 7 nm or 3 nm.");
      this.RGBNB_BandwidthSValue = aiNumericEdit(this, 'S', S_bandwidth, function(value) { S_bandwidth = value; }, "Bandwidth (nm) for the S filter. Typical values could be 8.5 nm or 3 nm.");
      this.RGBNB_BandwidthOValue = aiNumericEdit(this, 'O', O_bandwidth, function(value) { O_bandwidth = value; }, "Bandwidth (nm) for the O filter. Typical values could be 8.5 nm or 3 nm.");

      this.RGBNB_BandwidthSizer = new HorizontalSizer;
      this.RGBNB_BandwidthSizer.margin = 6;
      this.RGBNB_BandwidthSizer.spacing = 4;
      this.RGBNB_BandwidthSizer.add( this.RGBNB_BandwidthLabel );
      //this.RGBNB_BandwidthSizer.add( this.RGBNB_BandwidthRGBValue );
      this.RGBNB_BandwidthSizer.add( this.RGBNB_BandwidthLValue );
      this.RGBNB_BandwidthSizer.add( this.RGBNB_BandwidthRValue );
      this.RGBNB_BandwidthSizer.add( this.RGBNB_BandwidthGValue );
      this.RGBNB_BandwidthSizer.add( this.RGBNB_BandwidthBValue );
      this.RGBNB_BandwidthSizer.add( this.RGBNB_BandwidthHValue );
      this.RGBNB_BandwidthSizer.add( this.RGBNB_BandwidthSValue );
      this.RGBNB_BandwidthSizer.add( this.RGBNB_BandwidthOValue );
      this.RGBNB_BandwidthSizer.add( this.testNarrowbandMappingButton );
      this.RGBNB_BandwidthSizer.addStretch();

      this.RGBNB_Sizer = new VerticalSizer;
      this.RGBNB_Sizer.margin = 6;
      //this.RGBNB_Sizer.spacing = 4;
      this.RGBNB_Sizer.toolTip = RGBNB_tooltip;
      this.RGBNB_Sizer.add(this.useRGBNBmappingSizer);
      this.RGBNB_Sizer.add(this.RGBNB_Sizer1);
      this.RGBNB_Sizer.add(this.RGBNB_BandwidthSizer);
      this.RGBNB_Sizer.addStretch();

      this.narrowbandGroupBox = new newGroupBox( this );
      this.narrowbandGroupBox.title = "Narrowband processing";
      this.narrowbandGroupBox.sizer = new VerticalSizer;
      this.narrowbandGroupBox.sizer.margin = 6;
      this.narrowbandGroupBox.sizer.spacing = 4;
      this.narrowbandGroupBox.sizer.add( this.narrowbandColorPaletteLabel );
      this.narrowbandGroupBox.sizer.add( this.narrowbandCustomPalette_Sizer );
      this.narrowbandGroupBox.sizer.add( this.mapping_on_nonlinear_data_Sizer );
      this.narrowbandGroupBox.sizer.add( this.NbLuminanceSizer );
      //this.narrowbandGroupBox.sizer.add( this.narrowbandAutoContinue_sizer );

      this.narrowbandRGBmappingGroupBox = new newGroupBox( this );
      this.narrowbandRGBmappingGroupBox.title = "Narrowband to RGB mapping";
      this.narrowbandRGBmappingGroupBox.sizer = new VerticalSizer;
      this.narrowbandRGBmappingGroupBox.sizer.margin = 6;
      this.narrowbandRGBmappingGroupBox.sizer.spacing = 4;
      this.narrowbandRGBmappingGroupBox.sizer.add( this.RGBNB_Sizer );
      //this.narrowbandRGBmappingGroupBox.sizer.add( this.narrowbandAutoContinue_sizer );

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

      this.narrowbandExtraLabel = aiSectionLabel(this, "Extra processing for narrowband");
      this.narrowbandExtraLabel.toolTip = 
            "<p>" +
            "Extra processing options to be applied on narrowband images. "+
            "They are applied before other extra processing options in the following order:" +
            "</p><p>" +
            "1. Hue shift for more orange<br>" +
            "2. Remove green cast and Leave some green<br>" +
            "3. Fix star colors" +
            "</p>";
      this.narrowbandExtraOptionsSizer = new HorizontalSizer;
      //this.narrowbandExtraOptionsSizer.margin = 6;
      //this.narrowbandExtraOptionsSizer.spacing = 4;
      this.narrowbandExtraOptionsSizer.add( this.narrowbandOptions1_sizer );
      this.narrowbandExtraOptionsSizer.add( this.narrowbandOptions2_sizer );
      this.narrowbandExtraOptionsSizer.toolTip = this.narrowbandExtraLabel.toolTip;
      this.narrowbandExtraOptionsSizer.addStretch();

      // Extra processing
      this.extraStarNet_CheckBox = newCheckBox(this, "StarNet", extra_StarNet, 
      "<p>Run Starnet on image to generate a starless image and a separate image for the stars. When Starnet is selected, extra processing is " +
      "applied to the starless image.</p>" );
      this.extraStarNet_CheckBox.onClick = function(checked) { 
            extra_StarNet = checked; 
            SetOptionChecked("StarNet", checked); 
      }
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
      this.IterationsSpinBox.minValue = 0;
      this.IterationsSpinBox.maxValue = 10;
      this.IterationsSpinBox.value = extra_smaller_stars_iterations;
      this.IterationsSpinBox.toolTip = "<p>Number of iterations when reducing star sizes. Value zero uses Erosion instead of Morphological Selection</p>";
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
      this.extra1.add( this.extraStarNet_CheckBox );
      this.extra1.add( this.extraDarkerBackground_CheckBox );
      this.extra1.add( this.extra_HDRMLT_CheckBox );
      this.extra1.add( this.extra_LHE_CheckBox );

      this.extra2 = new VerticalSizer;
      this.extra2.margin = 6;
      this.extra2.spacing = 4;
      this.extra2.add( this.extra_Contrast_CheckBox );
      this.extra2.add( this.extra_STF_CheckBox );
      this.extra2.add( this.SmallerStarsSizer );

      this.extraLabel = aiSectionLabel(this, "Generic extra processing");

      this.extraGroupBoxSizer = new HorizontalSizer;
      //this.extraGroupBoxSizer.margin = 6;
      //this.extraGroupBoxSizer.spacing = 4;
      this.extraGroupBoxSizer.add( this.extra1 );
      this.extraGroupBoxSizer.add( this.extra2 );
      this.extraGroupBoxSizer.addStretch();

      this.extraGroupBox = new newGroupBox( this );
      this.extraGroupBox.title = "Extra processing";
      this.extraGroupBox.sizer = new VerticalSizer;
      this.extraGroupBox.sizer.margin = 6;
      this.extraGroupBox.sizer.spacing = 4;
      this.extraGroupBox.sizer.add( this.narrowbandExtraLabel );
      this.extraGroupBox.sizer.add( this.narrowbandExtraOptionsSizer );
      this.extraGroupBox.sizer.add( this.extraLabel );
      this.extraGroupBox.sizer.add( this.extraGroupBoxSizer );
      this.extraGroupBox.sizer.add( this.extraImageSizer );
      this.extraGroupBox.sizer.addStretch();
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
            "1. StarNet<br>" +
            "2. Darker background<br>" +
            "3. HDRMultiscaleTansform<br>" +
            "4. LocalHistogramEqualization<br>" +
            "5. Add contrast<br>" +
            "6. Smaller stars" +
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
            batch_narrowband_palette_mode = isbatchNarrowbandPaletteMode();
            try {
                  autocontinue_narrowband = is_narrowband_option();
                  if (batch_narrowband_palette_mode) {
                        AutoIntegrateNarrowbandPaletteBatch(true);
                  } else {
                        AutoIntegrateEngine(true);
                  }
                  autocontinue_narrowband = false;
            } 
            catch(err) {
                  console.criticalln(err);
                  console.criticalln("Processing stopped!");
                  writeProcessingSteps(null, true, null);
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
            closeAllWindows(keep_integrated_images);
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
      this.autoButtonGroupBox.sizer.addStretch();
      //this.autoButtonGroupBox.setFixedHeight(60);

      // Buttons for mosaic save
      this.mosaicSaveXisfButton = new PushButton( this );
      this.mosaicSaveXisfButton.text = "XISF";
      this.mosaicSaveXisfButton.onClick = function()
      {
            console.writeln("Save XISF");
            saveAllbatchWindows(32);
      };   
      this.mosaicSave16bitButton = new PushButton( this );
      this.mosaicSave16bitButton.text = "16 bit TIFF";
      this.mosaicSave16bitButton.onClick = function()
      {
            console.writeln("Save 16 bit TIFF");
            saveAllbatchWindows(16);
      };   
      this.mosaicSave8bitButton = new PushButton( this );
      this.mosaicSave8bitButton.text = "8 bit TIFF";
      this.mosaicSave8bitButton.onClick = function()
      {
            console.writeln("Save 8 bit TIFF");
            saveAllbatchWindows(8);
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
      this.mosaicSaveGroupBox.sizer.addStretch();
      //this.mosaicSaveGroupBox.setFixedHeight(60);

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
      this.buttons_Sizer.add( this.helpTips );
      this.buttons_Sizer.addStretch();
      this.buttons_Sizer.add( this.ok_Button );
      this.buttons_Sizer.add( this.cancel_Button );
   
      this.ProcessingGroupBox = new newGroupBox( this );
      this.ProcessingGroupBox.title = "Processing settings";
      this.ProcessingGroupBox.sizer = new VerticalSizer;
      this.ProcessingGroupBox.sizer.margin = 6;
      this.ProcessingGroupBox.sizer.spacing = 4;
      //this.ProcessingGroupBox.sizer.add( this.weightGroupBoxLabel );
      //this.ProcessingGroupBox.sizer.add( this.weightGroupBoxSizer );
      this.ProcessingGroupBox.sizer.add( this.weightAndSigmaSizer );
      this.ProcessingGroupBox.sizer.add( this.clippingGroupBoxLabel );
      this.ProcessingGroupBox.sizer.add( this.clippingGroupBoxSizer );
      this.ProcessingGroupBox.sizer.add( this.linearFitGroupBoxLabel );
      this.ProcessingGroupBox.sizer.add( this.linearFitGroupBoxSizer );
      this.ProcessingGroupBox.sizer.add( this.StretchingGroupBoxLabel );
      this.ProcessingGroupBox.sizer.add( this.StretchingGroupBoxSizer );
      this.ProcessingGroupBox.sizer.add( this.LRGBCombinationGroupBoxLabel );
      this.ProcessingGroupBox.sizer.add( this.LRGBCombinationGroupBoxSizer );
      this.ProcessingGroupBox.sizer.add( this.saturationGroupBoxLabel );
      this.ProcessingGroupBox.sizer.add( this.saturationGroupBoxSizer );

      this.col1 = new VerticalSizer;
      this.col1.margin = 6;
      this.col1.spacing = 6;
      this.col1.add( this.imageParamsGroupBox );
      this.col1.add( this.otherParamsGroupBox );
      this.col1.add( this.narrowbandGroupBox );
      this.col1.add( this.narrowbandRGBmappingGroupBox );
      this.col1.add( this.mosaicSaveGroupBox );
      this.col1.addStretch();

      this.col2 = new VerticalSizer;
      this.col2.margin = 6;
      this.col2.spacing = 6;
      this.col2.add( this.ProcessingGroupBox );
      this.col2.add( this.extraGroupBox );
      this.col2.add( this.autoButtonGroupBox );
      this.col2.addStretch();

      this.cols = new HorizontalSizer;
      this.cols.margin = 6;
      this.cols.spacing = 6;
      this.cols.add( this.col1 );
      this.cols.add( this.col2 );
      this.cols.addStretch();

      this.sizer = new VerticalSizer;
      this.sizer.add( this.files_GroupBox, 300 );
      this.sizer.margin = 6;
      this.sizer.spacing = 6;
      this.sizer.add( this.cols );
      this.sizer.add( this.buttons_Sizer );
      this.sizer.addStretch();

      // Version number
      this.windowTitle = "AutoIntegrate v0.92";
      this.userResizable = true;
      //this.adjustToContents();
      //this.files_GroupBox.setFixedHeight();

      console.show(false);
}

AutoIntegrateDialog.prototype = new Dialog;

function main()
{
      var dialog = new AutoIntegrateDialog();

      dialog.execute();
}

main();
