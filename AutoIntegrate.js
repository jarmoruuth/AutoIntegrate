/*

Script to automate initial steps of image processing in PixInsight.

For information check the page https://ruuth.xyz/AutoIntegrateInfo.html

Script has a GUI interface where some processing options can be selected.

In the end there will be integrated light files and automatically
processed final image. Script accepts LRGB, color and narrowband files. 
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
- Integration_L_DBE + Integration_RGB_DBE
  LRGB image background extracted, the script starts after step <lABE> and <rgbABE>.
- Integration_RGB_DBE
  Color (RGB) image background extracted, the script starts with after step <colorABE>.
- Integration_L_DBE + Integration_R_DBE + Integration_G_DBE + Integration_B_DBE
  LRGB image background extracted before image integration, the script starts after step <lABE> and 
   <rgbDBE>. Automatic ABE is then skipped.
- Integration_L + Integration_R + Integration_G + Integration_B + + Integration_H + Integration_S + Integration_O
  (L)RGB or narrowband image with integrated L,R,G,B;H,S,O images the script starts with step <lII>. 

Note that it is possible to run first automatic processing and then manually enhance some 
intermediate files and autocontinue there. 
- Crop integrated images and continue automatic processing using cropped images.
- Run manual DBE.

Calibration steps
-----------------

Calibration can run two basic workflows, one with bias files and one
with flat dark files. There are some option to make small changes
on those,

1. In each file page in GUI, select light, bias, dark, flat and/or flat dark frames. 
   If only light are selected the calibration is skipped. Also bias, dark, flat or 
   flat dark files may be not selected, so any one of those can be left out. Script 
   tries to automatically detect different filters, or OSC/RAW files.
2. If bias files are present, those are integrated into master bias. Optionally a superbias
   file is created.
3. If dark files are present, those are optionally calibrated using master bias and then integrated 
   into master dark.
4. If flat dark files are present, those are integrated  into master flat dark.
5. If flat files are present, those are calibrated using master bias and master dark, or master
   flat dark, and then integrated into master flat.
6. Light files are then calibrated using master bias, master dark and master flat.

Generic steps for all files
---------------------------

1. If light files not already selects, script opens a file dialog. On that select 
   all *.fit (or other) files. LRGB, color, RAW and narrowband files can be used.
2. Optionally linear defect detection is run to find column and row defects. Defect information
   is used by the CosmeticCorrection.
3. By default run CosmeticCorrection for each file.
4. OSC/RAW files are debayered.
5. SubframeSelector is run on files to measure and generate SSWEIGHT for
   each file. Output is *_a.xisf files.
6. Files are scanned and the file with highest SSWEIGHT is selected as a
   reference.
7. StarAlign is run on all files and *_a_r.xisf files are
   generated.
8. Optionally there is LocalNormalization on all files.

Steps with LRGB files
---------------------

1. ImageIntegration is run on LRGB files. Rejection method is chosen dynamically 
   based on the number of image files, or specified by the user. <lII>
   After this step there are Integration_L, Integration_R, Integration_G and Integration_B images,
   or with narrowband Integration_H, Integration_S and Integration_O.
2. Optionally the Integration images and corresponding support images are cropped to the area
   contributed to by all images.
3. Optionally ABE in run on L image. <lABE>
4. HistogramTransform is run on L image. <lHT>
5. Stretched L image is stored as a mask unless user has a predefined mask named AutoMask.
6. Noise reduction is run on L image using a mask.
7. If ABE_before_channel_combination is selected then ABE is run on each color channel (R,G,B). 
   <rgbDBE>
8. By default LinearFit is run on RGB channels using L, R, G or B as a reference
9. If Channel noise reduction is non-zero then noise reduction is done separately 
   for each R,G and B images using a mask.
10. ChannelCombination is run on Red, Green and Blue integrated images to
   create an RGB image. After that there is one L and one RGB image.
11. If color_calibration_before_ABE is selected then color calibration is run on RGB image.
    If use_background_neutralization is selected then BackgroundNeutralization is run before
    color calibration.
12. Optionally AutomaticBackgroundExtraction is run on RGB image. <rgbABE>
13. If color calibration is not yet done the color calibration is run on RGB image. Optionally
    BackgroundNeutralization is run before color calibration
14. HistogramTransform is run on RGB image. <rgbHT>
15. Optionally TGVDenoise is run to reduce color noise.
16. Optionally a slight CurvesTransformation is run on RGB image to increase saturation.
    By default saturation is increased also when the image is still in a linear
    format.
17. LRGBCombination is run to generate final LRGB image.

Steps with color files
----------------------

1. ImageIntegration is run on color *_a_r.xisf files.
   Rejection method is chosen dynamically based on the number of image files.
   After this step there is Integration_RGBcolor image.
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
  stretch. Default is to use unlinked STF stretch for narrowband files.
- PixelMath expression can chosen from a list or edited manually for custom blending.
  PixelMath expressions can also include RGB channels.

Narrowband to RGB mapping
-------------------------

A special processing is used for narrowband to (L)RGB image mapping. It is used 
to enhance (L)RGB channels with narrowband data. It cannot be used without RGB filters.
This mapping is similar to NBRGBCombination script in PixInsight or as described in 
Light Vortex Astronomy tutorial Combining LRGB with Narrowband. You can find more 
details on parameters from those sources.

Common final steps for all images
---------------------------------

1. SCNR is run on to reduce green cast.
2. MultiscaleLinearTransform is run to sharpen the image. A mask is used to target
   sharpening more on the light parts of the image.
3. Extra windows are closed or minimized.

Notes to self:
- Start mask when set will target operation on stars.
- Luminance mask when set will target operations on light parts of the image.
- Mask from RangeSelection is opposite to luminance mask. So user must invert 
  range_mask and rename it as AutoMask.


Credits and Copyright notices
-----------------------------

PixInsight scripts that come with the product were a great help.
Web site Light Vortex Astronomy (http://www.lightvortexastronomy.com/)
was a great place to find details and best practices when using PixInsight.
For calibration another useful link is a PixInsight forum post
"For beginners: Guide to PI's ImageCalibration":
https://pixinsight.com/forum/index.php?threads/for-beginners-guide-to-pis-imagecalibration.11547/

Routines ApplyAutoSTF and applySTF are from PixInsight scripts that are 
distributed with PixInsight. 

Routines for Linear Defect Detection are from PixInsight scripts 
LinearDefectDetection.js and CommonFunctions.jsh that is distributed 
with PixInsight. 

This product is based on software from the PixInsight project, developed
by Pleiades Astrophoto and its contributors (https://pixinsight.com/).

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

*/

#ifndef TEST_AUTO_INTEGRATE
"use strict;"
#endif

#feature-id   AutoIntegrate : Batch Processing > AutoIntegrate

#feature-info A script for running basic image processing workflow

#define SETTINGSKEY "AutoIntegrate"

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
#include <pjsr/DataType.jsh>
#include <pjsr/StdButton.jsh>
#include <pjsr/StdIcon.jsh>
#include <pjsr/StdCursor.jsh>

// temporary debugging
#ifndef TEST_AUTO_INTEGRATE
// The variables defined here should have a default of 'false' and must be defined
// by the testing scripts including this script. This allow changing the ai_debug
// in the test scripts without modifying the main script
var ai_debug = false;                  // temp setting for debugging
var ai_get_process_defaults = false;   // temp setting to print process defaults
var ai_use_persistent_module_settings = true;  // read some defaults from persistent module settings
#endif

/*
 * Wrapper function to hide global variables and function to avoid name collisions.
 */
function AutoIntegrate() {

this.__base__ = Object;
this.__base__();

/* Following variables are AUTOMATICALLY PROCESSED so do not change format.
 */
var autointegrate_version = "AutoIntegrate v1.52 test11";                                       // Version, also updated into updates.xri
var autointegrate_info = "Use already processed files, histogram stretch, star reduction.";     // For updates.xri

var pixinsight_version_str;   // PixInsight version string, e.g. 1.8.8.10
var pixinsight_version_num;   // PixInsight version number, e.h. 1080810

// GUI variables
var infoLabel;
var imageInfoLabel;
var windowPrefixHelpTips;     // For updating tooTip
var closeAllPrefixButton;     // For updating toolTip
var windowPrefixComboBox = null; // For updating prefix name list
var outputDirEdit;            // For updating output root directory
var tabPreviewControl = null;        // For updating preview window
var tabPreviewInfoLabel = null;      // For updating preview info text
var tabStatusInfoLabel = null;       // For update processing status
var sidePreviewControl = null;       // For updating preview window
var sidePreviewInfoLabel = null;     // For updating preview info text
var sideStatusInfoLabel = null;      // For update processing status
var mainTabBox = null                // For switching to preview tab

var do_not_read_settings = false;   // do not read Settings from persistent module settings
var do_not_write_settings = false;  // do not write Settings to persistent module settings
var use_preview = true;
var use_tab_preview = true;
var use_side_preview = true;
var def_side_preview_visible = false;
var is_some_preview = false;
var is_processing = false;
var preview_size_changed = false;
var preview_keep_zoom = false;

var current_selected_file_name = null;
var current_selected_file_filter = null;

var undo_images = [];
var undo_images_pos = -1;

var LDDDefectInfo = [];             // { groupname: name,  defects: defects }

/*
      Parameters that can be adjusted in the GUI
      These can be saved to persistent module settings or 
      process icon and later restored.
      Note that there is another parameter set ppar which are
      saved only to persistent module settings.
      For reset, we need to keep track of GUI element where
      these values are used. Fields where values are stored
      are: .currentItem, .checked, .editText, .setValue, .value
*/
this.par = {
      // Image processing parameters
      local_normalization: { val: false, def: false, name : "Local normalization", type : 'B' },
      fix_column_defects: { val: false, def: false, name : "Fix column defects", type : 'B' },
      fix_row_defects: { val: false, def: false, name : "Fix row defects", type : 'B' },
      skip_cosmeticcorrection: { val: false, def: false, name : "Cosmetic correction", type : 'B' },
      skip_subframeselector: { val: false, def: false, name : "SubframeSelector", type : 'B' },
      strict_StarAlign: { val: false, def: false, name : "Strict StarAlign", type : 'B' },
      staralignment_sensitivity: { val: 0.5, def: 0.5, name : "StarAlignment sensitivity", type : 'R' },
      staralignment_maxstarsdistortion: { val: 0.6, def: 0.6, name : "StarAlignment distortion", type : 'R' },
      staralignment_structurelayers: { val: 5, def: 5, name : "StarAlignment layers", type : 'I' },
      staralignment_noisereductionfilterradius: { val: 0, def: 0, name : "StarAlignment noise reduction", type : 'I' },
      binning: { val: 0, def: 0, name : "Binning", type : 'I' },
      binning_resample: { val: 2, def: 2, name : "Binning resample factor", type : 'I' },
      ABE_before_channel_combination: { val: false, def: false, name : "ABE before channel combination", type : 'B' },
      ABE_on_lights: { val: false, def: false, name : "ABE on light images", type : 'B' },
      use_ABE_on_L_RGB: { val: false, def: false, name : "Use ABE on L, RGB", type : 'B' },
      skip_color_calibration: { val: false, def: false, name : "No color calibration", type : 'B' },
      color_calibration_before_ABE: { val: false, def: false, name : "Color calibration before ABE", type : 'B' },
      use_background_neutralization: { val: false, def: false, name : "Background neutralization", type : 'B' },
      use_imageintegration_ssweight: { val: false, def: false, name : "ImageIntegration use SSWEIGHT", type : 'B' },
      skip_noise_reduction: { val: false, def: false, name : "No noise reduction", type : 'B' },
      skip_star_noise_reduction: { val: false, def: false, name : "No star noise reduction", type : 'B' },
      non_linear_noise_reduction: { val: false, def: false, name : "Non-linear noise reduction", type : 'B' },
      skip_mask_contrast: { val: false, def: false, name : "No mask contrast", type : 'B' },
      skip_sharpening: { val: false, def: false, name : "No sharpening", type : 'B' },
      skip_SCNR: { val: false, def: false, name : "No SCNR", type : 'B' },
      shadow_clip: { val: false, def: false, name : "Shadow clip", type : 'B' },
      force_new_mask: { val: false, def: false, name : "Force new mask", type : 'B' },
      crop_to_common_area: { val: false, def: false, name : "Crop to common area", type : 'B' },

      // Other parameters
      calibrate_only: { val: false, def: false, name : "Calibrate only", type : 'B' },
      image_weight_testing: { val: false, def: false, name : "Image weight testing", type : 'B' },
      debayer_only: { val: false, def: false, name : "Debayer only", type : 'B' },
      binning_only: { val: false, def: false, name : "Binning only", type : 'B' },
      extract_channels_only: { val: false, def: false, name : "Extract channels only", type : 'B' },
      integrate_only: { val: false, def: false, name : "Integrate only", type : 'B' },
      channelcombination_only: { val: false, def: false, name : "ChannelCombination only", type : 'B' },
      cropinfo_only: { val: false, def: false, name : "Crop info only", type : 'B' },
      RRGB_image: { val: false, def: false, name : "RRGB", type : 'B' },
      batch_mode: { val: false, def: false, name : "Batch mode", type : 'B' },
      skip_autodetect_filter: { val: false, def: false, name : "Do not autodetect FILTER keyword", type : 'B' },
      skip_autodetect_imagetyp: { val: false, def: false, name : "Do not autodetect IMAGETYP keyword", type : 'B' },
      select_all_files: { val: false, def: false, name : "Select all files", type : 'B' },
      save_all_files: { val: false, def: false, name : "Save all files", type : 'B' },
      no_subdirs: { val: false, def: false, name : "No subdirectories", type : 'B' },
      use_drizzle: { val: false, def: false, name : "Drizzle", type : 'B' },
      keep_integrated_images: { val: false, def: false, name : "Keep integrated images", type : 'B' },
      keep_temporary_images: { val: false, def: false, name : "Keep temporary images", type : 'B' },
      monochrome_image: { val: false, def: false, name : "Monochrome", type : 'B' },
      skip_imageintegration_clipping: { val: false, def: false, name : "No ImageIntegration clipping", type : 'B' },
      synthetic_l_image: { val: false, def: false, name : "Synthetic L", type : 'B' },
      synthetic_missing_images: { val: false, def: false, name : "Synthetic missing image", type : 'B' },
      force_file_name_filter: { val: false, def: false, name : "Use file name for filters", type : 'B' },
      unique_file_names: { val: false, def: false, name : "Unique file names", type : 'B' },
      use_starxterminator: { val: false, def: false, name : "Use StarXTerminator", type : 'B' },
      use_noisexterminator: { val: false, def: false, name : "Use NoiseXTerminator", type : 'B' },
      use_starnet2: { val: false, def: false, name : "Use StarNet2", type : 'B' },
      win_prefix_to_log_files: { val: false, def: false, name : "Add window prefix to log files", type : 'B' },
      start_from_imageintegration: { val: false, def: false, name : "Start from ImageIntegration", type : 'B' },
      generate_xdrz: { val: false, def: false, name : "Generate .xdrz files", type : 'B' },
      autosave_setup: { val: false, def: false, name: "Autosave setup", type: 'B' },
      use_processed_files: { val: false, def: false, name: "Use processed files", type: 'B' },

      // Narrowband processing
      custom_R_mapping: { val: 'S', def: 'S', name : "Narrowband R mapping", type : 'S' },
      custom_G_mapping: { val: 'H', def: 'H', name : "Narrowband G mapping", type : 'S' },
      custom_B_mapping: { val: 'O', def: 'O', name : "Narrowband B mapping", type : 'S' },
      custom_L_mapping: { val: '', def: '', name : "Narrowband L mapping", type : 'S' },
      narrowband_linear_fit: { val: 'Auto', def: 'Auto', name : "Narrowband linear fit", type : 'S' },
      mapping_on_nonlinear_data: { val: false, def: false, name : "Narrowband mapping on non-linear data", type : 'B' },
      force_narrowband_mapping: { val: false, def: false, name : "Force narrowband mapping", type : 'B' },
      remove_stars_before_stretch: { val: false, def: false, name : "Remove stars early", type : 'B' },
      remove_stars_channel: { val: false, def: false, name : "Remove stars channel", type : 'B' },
      remove_stars_stretched: { val: false, def: false, name : "Remove stars stretched", type : 'B' },
      unscreen_stars: { val: false, def: false, name : "Unscreen stars", type : 'B' },

      // Narrowband to RGB mapping
      use_RGBNB_Mapping: { val: false, def: false, name : "Narrowband RGB mapping", type : 'B' },
      use_RGB_image: { val: false, def: false, name : "Narrowband RGB mapping use RGB", type : 'B' },
      L_mapping: { val: '',  def: '',  name : "Narrowband RGB mapping for L", type : 'S' },
      R_mapping: { val: 'H', def: 'H', name : "Narrowband RGB mapping for R", type : 'S' },
      G_mapping: { val: 'O', def: 'O', name : "Narrowband RGB mapping for G", type : 'S' },
      B_mapping: { val: 'O', def: 'O', name : "Narrowband RGB mapping for B", type : 'S' },
      L_BoostFactor: { val: 1.2, def: 1.2, name : "Narrowband RGB mapping L boost factor", type : 'R' },
      R_BoostFactor: { val: 1.2, def: 1.2, name : "Narrowband RGB mapping R boost factor", type : 'R' },
      G_BoostFactor: { val: 1.2, def: 1.2, name : "Narrowband RGB mapping G boost factor", type : 'R' },
      B_BoostFactor: { val: 1.2, def: 1.2, name : "Narrowband RGB mapping B boost factor", type : 'R' },
      L_bandwidth: { val: 100, def: 100, name : "Narrowband RGB mapping L bandwidth", type : 'R' },
      R_bandwidth: { val: 100, def: 100, name : "Narrowband RGB mapping R bandwidth", type : 'R' },
      G_bandwidth: { val: 100, def: 100, name : "Narrowband RGB mapping G bandwidth", type : 'R' },
      B_bandwidth: { val: 100, def: 100, name : "Narrowband RGB mapping B bandwidth", type : 'R' },
      H_bandwidth: { val: 3, def: 3, name : "Narrowband RGB mapping H bandwidth", type : 'R' },
      S_bandwidth: { val: 3, def: 3, name : "Narrowband RGB mapping S bandwidth", type : 'R' },
      O_bandwidth: { val: 3, def: 3, name : "Narrowband RGB mapping O bandwidth", type : 'R' },

      // Processing settings
      noise_reduction_strength: { val: 3, def: 3, name : "Noise reduction strength", type : 'I' },
      luminance_noise_reduction_strength: { val: 3, def: 3, name : "Noise reduction strength on luminance image", type : 'I' },
      combined_image_noise_reduction: { val: false, def: false, name : "Do noise reduction on combined image", type : 'B' },
      use_color_noise_reduction: { val: false, def: false, name : "Color noise reduction", type : 'B' },
      ACDNR_noise_reduction: { val: 1.0, def: 1.0, name : "ACDNR noise reduction", type : 'R' },
      use_weight: { val: 'PSF Signal', def: 'PSF Signal', name : "Weight calculation", type : 'S' },
      ssweight_limit: { val: 0, def: 0, name : "SSWEIGHT limit", type : 'I' },
      outliers_ssweight: { val: false, def: false, name : "Outliers SSWEIGHT", type : 'B' },
      outliers_fwhm: { val: false, def: false, name : "Outliers FWHM", type : 'B' },
      outliers_ecc: { val: false, def: false, name : "Outliers eccentricity", type : 'B' },
      outliers_snr: { val: false, def: false, name : "Outliers SNR", type : 'B' },
      outliers_psfsignal: { val: false, def: false, name : "Outliers PSF Signal", type : 'B' },
      outliers_psfpower: { val: false, def: false, name : "Outliers PSF Power", type : 'B' },
      outliers_stars: { val: false, def: false, name : "Outliers Stars", type : 'B' },
      outliers_method: { val: 'Two sigma', def: 'Two sigma', name : "Outlier method", type : 'S' },
      outliers_minmax: { val: false, def: false, name : "Outlier min max", type : 'B' },
      use_linear_fit: { val: 'Luminance', def: 'Luminance', name : "Linear fit", type : 'S' },
      image_stretching: { val: 'Auto STF', def: 'Auto STF', name : "Image stretching", type : 'S' },
      stars_stretching: { val: 'Arcsinh Stretch', def: 'Arcsinh Stretch', name : "Stars stretching", type : 'S' },
      stars_combine: { val: 'Screen', def: 'Screen', name : "Stars combine", type : 'S' },
      STF_linking: { val: 'Auto', def: 'Auto', name : "RGB channel linking", type : 'S' },
      imageintegration_normalization: { val: 'Additive', def: 'Additive', name : "ImageIntegration Normalization", type : 'S' },
      use_clipping: { val: 'Auto2', def: 'Auto2', name : "ImageIntegration rejection", type : 'S' },

      target_type_galaxy: { val: false, def: false, name : "Target type galaxy", type : 'B' },
      target_type_nebula: { val: false, def: false, name : "Target type nebula", type : 'B' },

      percentile_low: { val: 0.2, def: 0.2, name : "Percentile low", type : 'R' },
      percentile_high: { val: 0.1, def: 0.1, name : "Percentile high", type : 'R' },
      sigma_low: { val: 4.0, def: 4.0, name : "Sigma low", type : 'R' },
      sigma_high: { val: 3.0, def: 3.0, name : "Sigma high", type : 'R' },
      winsorised_cutoff: { val: 5.0, def: 5.0, name : "Winsorised cutoff", type : 'R' },
      linearfit_low: { val: 5.0, def: 5.0, name : "Linear fit low", type : 'R' },
      linearfit_high: { val: 4.0, def: 4.0, name : "Linear fit high", type : 'R' },
      ESD_outliers: { val: 0.3, def: 0.3, name : "ESD outliers", type : 'R' },
      ESD_significance: { val: 0.05, def: 0.05, name : "ESD significance", type : 'R' },
      // ESD_lowrelaxation: { val: 1.50, def: 1.50, name : "ESD low relaxation", type : 'R' }, deprecated, use default for old version

      cosmetic_correction_hot_sigma: { val: 3, def: 3, name : "CosmeticCorrection hot sigma", type : 'I' },
      cosmetic_correction_cold_sigma: { val: 3, def: 3, name : "CosmeticCorrection cold sigma", type : 'I' },
      STF_targetBackground: { val: 0.25, def: 0.25, name : "STF targetBackground", type : 'R' },    
      MaskedStretch_targetBackground: { val: 0.125, def: 0.125, name : "Masked Stretch targetBackground", type : 'R' },    
      Arcsinh_stretch_factor: { val: 50, def: 50, name : "Arcsinh Stretch Factor", type : 'R' },    
      Arcsinh_black_point: { val: 0.01, def: 0.01, name : "Arcsinh Stretch black point", type : 'I' }, 
      Arcsinh_iterations: { val: 3, def: 3, name : "Arcsinh Stretch iterations", type : 'I' }, 
      LRGBCombination_lightness: { val: 0.5, def: 0.5, name : "LRGBCombination lightness", type : 'R' },    
      LRGBCombination_saturation: { val: 0.5, def: 0.5, name : "LRGBCombination saturation", type : 'R' },    
      linear_increase_saturation: { val: 1, def: 1, name : "Linear saturation increase", type : 'I' },    
      non_linear_increase_saturation: { val: 1, def: 1, name : "Non-linear saturation increase", type : 'I' },    
      Hyperbolic_D: { val: 5, def: 5, name : "Hyperbolic Stretch D value", type : 'I' },
      Hyperbolic_b: { val: 8, def: 8, name : "Hyperbolic Stretch b value", type : 'I' }, 
      Hyperbolic_SP: { val: 10, def: 10, name : "Hyperbolic Stretch symmetry point value", type : 'I' }, 
      Hyperbolic_target: { val: 0.25, def: 0.25, name : "Hyperbolic Stretch target", type : 'I' }, 
      Hyperbolic_iterations: { val: 10, def: 10, name : "Hyperbolic Stretch iterations", type : 'I' }, 
      Hyperbolic_mode: { val: 1, def: 1, name : "Hyperbolic Stretch mode", type : 'I' }, 
      histogram_shadow_clip: { val: 0.00, def: 0.00, name : "Histogram shadow clip", type : 'I' }, 
      histogram_stretch_type: { val: 'Median', def: 'Median', name : "Histogram stretch type", type : 'S' }, 
      histogram_stretch_target: { val: 0.25, def: 0.25, name : "Histogram stretch target", type : 'I' }, 

      // Extra processing for narrowband
      run_orange_hue_shift: { val: false, def: false, name : "Extra narrowband more orange", type : 'B' },
      run_hue_shift: { val: false, def: false, name : "Extra narrowband hue shift", type : 'B' },
      leave_some_green: { val: false, def: false, name : "Extra narrowband leave some green", type : 'B' },
      run_narrowband_SCNR: { val: false, def: false, name : "Extra narrowband remove green", type : 'B' },
      fix_narrowband_star_color: { val: false, def: false, name : "Extra narrowband fix star colors", type : 'B' },
      skip_star_fix_mask: { val: false, def: false, name : "Extra narrowband no star mask", type : 'B' },

      // Generic Extra processing
      extra_remove_stars: { val: false, def: false, name : "Extra remove stars", type : 'B' },
      extra_unscreen_stars: { val: false, def: false, name : "Extra unscreen stars", type : 'B' },
      extra_combine_stars: { val: false, def: false, name : "Extra combine starless and stars", type : 'B' },
      extra_combine_stars_mode: { val: 'Screen', def: 'Screen', name : "Extra remove stars combine", type : 'S' },
      extra_combine_stars_reduce: { val: 'None', def: 'None', name : "Extra combine stars reduce", type : 'S' },
      extra_combine_stars_reduce_S: { val: 0.15, def: 0.15, name : "Extra combine stars reduce S", type : 'R' },
      extra_combine_stars_reduce_M: { val: 1, def: 1, name : "Extra combine stars reduce M", type : 'R' },
      extra_ABE: { val: false, def: false, name : "Extra ABE", type : 'B' },
      extra_darker_background: { val: false, def: false, name : "Extra Darker background", type : 'B' },
      extra_ET: { val: false, def: false, name : "Extra ExponentialTransformation", type : 'B' },
      extra_ET_order: { val: 1.0, def: 1.0, name : "Extra ExponentialTransformation Order", type : 'I' },
      extra_HDRMLT: { val: false, def: false, name : "Extra HDRMLT", type : 'B' },
      extra_HDRMLT_layers: { val: 6, def: 6, name : "Extra HDRMLT layers", type : 'I' },
      extra_HDRMLT_color: { val: 'None', def: 'None', name : "Extra HDRMLT hue", type : 'S' },
      extra_LHE: { val: false, def: false, name : "Extra LHE", type : 'B' },
      extra_LHE_kernelradius: { val: 110, def: 110, name : "Extra LHE kernel radius", type : 'I' },
      extra_contrast: { val: false, def: false, name : "Extra contrast", type : 'B' },
      extra_contrast_iterations: { val: 1, def: 1, name : "Extra contrast iterations", type : 'I' },
      extra_stretch: { val: false, def: false, name : "Extra stretch", type : 'B' },
      extra_shadowclipping: { val: false, def: false, name : "Extra shadow clipping", type : 'B' },
      extra_shadowclippingperc: { val: 0.01, def: 0.01, name : "Extra shadow clipping percentage", type : 'R' },
      extra_force_new_mask: { val: false, def: false, name : "Extra force new mask", type : 'B' },
            
      extra_noise_reduction: { val: false, def: false, name : "Extra noise reduction", type : 'B' },
      extra_noise_reduction_strength: { val: 3, def: 3, name : "Extra noise reduction strength", type : 'I' },
      extra_ACDNR: { val: false, def: false, name : "Extra ACDNR noise reduction", type : 'B' },
      extra_color_noise: { val: false, def: false, name : "Extra color noise reduction", type : 'B' },
      extra_star_noise_reduction: { val: false, def: false, name : "Extra star noise reduction", type : 'B' },
      extra_sharpen: { val: false, def: false, name : "Extra sharpen", type : 'B' },
      extra_sharpen_iterations: { val: 1, def: 1, name : "Extra sharpen iterations", type : 'I' },
      extra_unsharpmask: { val: false, def: false, name : "Extra unsharpmask", type : 'B' },
      extra_unsharpmask_stddev: { val: 4, def: 4, name : "Extra unsharpmask stddev", type : 'I' },
      extra_smaller_stars: { val: false, def: false, name : "Extra smaller stars", type : 'B' },
      extra_smaller_stars_iterations: { val: 1, def: 1, name : "Extra smaller stars iterations", type : 'I' },
      extra_apply_no_copy_image: { val: false, def: false, name : "Apply no copy image", type : 'B' },

      // Calibration settings
      debayerPattern: { val: "Auto", def: "Auto", name : "Debayer", type : 'S' },
      extract_channel_mapping: { val: "None", def: "None", name : "Extract channel mapping", type : 'S' },
      create_superbias: { val: true, def: true, name : "Superbias", type : 'B' },
      bias_master_files: { val: false, def: false, name : "Bias master files", type : 'B' },
      pre_calibrate_darks: { val: false, def: false, name : "Pre-calibrate darks", type : 'B' },
      optimize_darks: { val: true, def: true, name : "Optimize darks", type : 'B' },
      dark_master_files: { val: false, def: false, name : "Dark master files", type : 'B' },
      flat_dark_master_files: { val: false, def: false, name : "Flat dark master files", type : 'B' },
      stars_in_flats: { val: false, def: false, name : "Stars in flats", type : 'B' },
      no_darks_on_flat_calibrate: { val: false, def: false, name : "Do not use darks on flats", type : 'B' },
      lights_add_manually: { val: false, def: false, name : "Add lights manually", type : 'B' },
      flats_add_manually: { val: false, def: false, name : "Add flats manually", type : 'B' },
      skip_blink: { val: false, def: false, name : "No blink", type : 'B' },

      // Old persistent settings, moved to generic settings
      start_with_empty_window_prefix: { val: false, def: false, name: "startWithEmptyPrefixName", type: 'B' }, // Do we always start with empty prefix
      use_manual_icon_column: { val: false, def: false, name: "manualIconColumn", type: 'B' }                  // Allow manual control of icon column
};

var par = this.par;

/*
      Parameters that are persistent and are saved to only Settings and
      restored only from Settings at the start.
      Note that there is another parameter set par which are saved to 
      process icon.
*/
this.ppar = {
      win_prefix: '',         // Current active window name prefix
      prefixArray: [],        // Array of prefix names and icon count, 
                              // every array element is [icon-column, prefix-name, icon-count]
      userColumnCount: -1,    // User set column position, if -1 use automatic column position
      lastDir: '',            // Last save or load dir, used as a default when dir is unknown
      use_preview: true,      // Show image preview on dialog preview window
      side_preview_visible: def_side_preview_visible,   // Show image preview on the side of the dialog too
      preview_width: 400,     // Preview width
      preview_height: 400,    // preview height
      default_preview_size: true, // do we have default preview size
      use_single_column: false // show all options in a single column
};

var ppar = this.ppar;

var run_results = {
      processing_steps_file: '',    // file where processing steps were written
      final_image_file: '',         // final image file
      fatal_error: ''               // if non-empty, fatal error during processing
};

var debayerPattern_values = [ "Auto", "RGGB", "BGGR", "GBRG", 
                              "GRBG", "GRGB", "GBGR", "RGBG", 
                              "BGRG", "None" ];
var debayerPattern_enums = [ Debayer.prototype.Auto, Debayer.prototype.RGGB, Debayer.prototype.BGGR, Debayer.prototype.GBRG,
                             Debayer.prototype.GRBG, Debayer.prototype.GRGB, Debayer.prototype.GBGR, Debayer.prototype.RGBG,
                             Debayer.prototype.BGRG, Debayer.prototype.Auto ];
var extract_channel_mapping_values = [ "None", "LRGB", "HSO", "HOS" ];
var RGBNB_mapping_values = [ 'H', 'S', 'O', '' ];
var use_weight_values = [ 'Generic', 'Noise', 'Stars', 'PSF Signal', 'PSF Signal scaled', 'FWHM scaled', 'Eccentricity scaled', 'SNR scaled', 'Star count' ];
var outliers_methods = [ 'Two sigma', 'One sigma', 'IQR' ];
var use_linear_fit_values = [ 'Luminance', 'Red', 'Green', 'Blue', 'No linear fit' ];
var image_stretching_values = [ 'Auto STF', 'Masked Stretch', 'Arcsinh Stretch', 'Hyperbolic', 'Histogram stretch' ];
var use_clipping_values = [ 'Auto1', 'Auto2', 'Percentile', 'Sigma', 'Averaged sigma', 'Winsorised sigma', 'Linear fit', 'ESD', 'None' ]; 
var narrowband_linear_fit_values = [ 'Auto', 'H', 'S', 'O', 'None' ];
var STF_linking_values = [ 'Auto', 'Linked', 'Unlinked' ];
var imageintegration_normalization_values = [ 'Additive', 'Adaptive', 'None' ];
var noise_reduction_strength_values = [ '0', '1', '2', '3', '4', '5', '6'];
var column_count_values = [ 'Auto', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
                            '11', '12', '13', '14', '15', '16', '17', '18', '19', '20' ];
var binning_values = [ 'None', 'Color', 'L and color'];
var starless_and_stars_combine_values = [ 'Add', 'Screen', 'Lighten' ];
var star_reduce_methods = [ 'None', 'Transfer', 'Halo', 'Star' ];
var extra_HDRMLT_color_values = [ 'None', 'Preserve hue', 'Color corrected' ];
var histogram_stretch_type_values = [ 'Median', 'Peak' ];

var monochrome_text = "Monochrome: ";

var blink_window = null;
var blink_zoom = false;
var blink_zoom_x = 0;
var blink_zoom_y = 0;
var saved_measurements = null;

var same_stf_for_all_images = false;            /* does not work, colors go bad */
var ssweight_set = false;
var run_HT = true;
var batch_narrowband_palette_mode = false;
var narrowband = false;
var autocontinue_narrowband = false;
var linear_fit_done = false;
var is_luminance_images = false;    // Do we have luminance files from autocontinue or FITS
var run_auto_continue = false;
var use_force_close = true;
var write_processing_log_file = true;  // if we fail very early we set this to false
var autocontinue_prefix = "";          // prefix used to find base files for autocontinue
var shadow_clip_value = 0.01;

var crop_truncate_amount = null;       // used when cropping channel images
var crop_lowClipImageName = null;      // integrated image used to calculate crop_truncate_amount
var crop_lowClipImage_changed = false; // changed flag for saving to disk

var processingDate;
var outputRootDir = "";
var lightFileNames = null;
var darkFileNames = null;
var biasFileNames = null;
var flatdarkFileNames = null;
var flatFileNames = null;
var best_ssweight = 0;
var best_image = null;
var user_selected_best_image = null;
var user_selected_reference_image = [];
var star_alignment_image = null;

var L_images;
var R_images;
var G_images;
var B_images;
var H_images;
var S_images;
var O_images;
var C_images;

var extra_target_image = null;
var extra_target_image_window_list = null;

var processing_steps = "";
var all_windows = [];
var iconPoint;
var iconStartRow = 0;   // Starting row for icons, AutoContinue start from non-zero position
var logfname;

var filterSectionbars = [];
var filterSectionbarcontrols = [];
var lightFilterSet = null;
var flatFilterSet = null;
    
// These are initialized by setDefaultDirs
var AutoOutputDir = null;
var AutoCalibratedDir = null;
var AutoMasterDir = null;
var AutoProcessedDir = null;

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
var RGBcolor_id;              // Integrate RGB from OSC/DSLR data

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
      FINAL : 8,
      CALIBRATE_ONLY : 9
};

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

var pages = {
      LIGHTS : 0,
      BIAS : 1,
      DARKS : 2,
      FLATS : 3,
      FLAT_DARKS : 4,
      END : 5
};

var columnCount = 0;          // A column position
var haveIconized = 0;

// known window names
var integration_LRGB_windows = [
      "Integration_L",  // must be first
      "Integration_R",
      "Integration_G",
      "Integration_B",
      "Integration_H",
      "Integration_S",
      "Integration_O",
      "Integration_RGBcolor",
      "LowRejectionMap_ALL"
];

var integration_color_windows = [
      "Integration_RGBcolor"
];

var fixed_windows = [
      "Mapping_L",
      "Mapping_R",
      "Mapping_G",
      "Mapping_B",
      "Integration_RGB",
      "Integration_L_crop",
      "Integration_L_ABE",
      "Integration_R_ABE",
      "Integration_G_ABE",
      "Integration_B_ABE",
      "Integration_RGB_ABE",
      "Integration_L_BE",
      "Integration_R_BE",
      "Integration_G_BE",
      "Integration_B_BE",
      "Integration_RGB_BE",
      "Integration_RGB_ABE_NB",
      "Integration_L_ABE_HT",
      "Integration_RGB_ABE_HT",
      "Integration_L_BE_HT",
      "Integration_RGB_BE_HT",
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
      "L_win_mask",
      "Integration_L_map_ABE",
      "Integration_L_map_ABE_HT",
      "Integration_L_map_pm_ABE",
      "Integration_L_map_pm_noABE",
      "Integration_L_map_pm_ABE_HT",
      "Integration_L_map_pm_noABE_HT"
];

var calibrate_windows = [
      "AutoMasterBias",
      "AutoMasterSuperBias",
      "AutoMasterFlatDark",
      "AutoMasterDark",
      "AutoMasterFlat_L",
      "AutoMasterFlat_R",
      "AutoMasterFlat_G",
      "AutoMasterFlat_B",
      "AutoMasterFlat_H",
      "AutoMasterFlat_S",
      "AutoMasterFlat_O",
      "AutoMasterFlat_C"
];

/* Final processed window names, depending on input data and options used.
 * These may have Drizzle prefix if that option is used.
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
      { name: "OHS", R: "O", G: "H", B: "S", all: true }, 
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
      { name: "HSO Mix 4", R: "0.5*H + 0.5*S", G: "0.5*H + 0.5*O", B: "O", all: true }, 
      { name: "L-eXtreme SHO", R: "H", G: "0.5*H+0.5*max(S,O)", B: "max(S,O)", all: false }, 
      { name: "RGB", R: "R", G: "G", B: "B", all: false }, 
      { name: "User defined", R: "", G: "", B: "", all: false },
      { name: "All", R: "All", G: "All", B: "All", all: false }
];

function runGC()
{
      gc(false);        // run soft gc
}

function checkEvents()
{
      processEvents();  // process events to keep GUI responsible
      runGC();
}

function previewControlCleanup(control)
{
      control.zoomIn_Button.onMousePress = null;
      control.zoomOut_Button.onMousePress = null;
      control.zoom11_Button.onMousePress = null;
      control.zoomFit_Button.onMousePress = null;
      control.scrollbox.onHorizontalScrollPosUpdated = null;
      control.scrollbox.onVerticalScrollPosUpdated = null;
      control.forceRedraw = null;
      control.scrollbox.viewport.onMouseWheel = null;
      control.scrollbox.viewport.onMousePress = null;
      control.scrollbox.viewport.onMouseMove = null;
      control.scrollbox.viewport.onMouseRelease = null;
      control.scrollbox.viewport.onResize = null;
      control.scrollbox.viewport.onPaint = null;
}

function previewCleanup(previewObj)
{
      previewControlCleanup(previewObj.control);
      previewObj.control = null;
      previewObj.infolabel = null;
      previewObj.statuslabel = null;
}

function exitCleanup(dialog)
{
      console.writeln("exitCleanup");
      if (use_preview && use_tab_preview) {
            previewCleanup(dialog.tabPreviewObj);
            dialog.tabPreviewObj = null;
      }
      if (use_preview && use_side_preview) {
            previewCleanup(dialog.sidePreviewObj);
            dialog.sidePreviewObj = null;
      }
      processEvents(false, 10 );
      gc();
}

// Create a table of known prefix names for toolTip
// Also update window prefix combo box list
function setWindowPrefixHelpTip(default_prefix)
{
      var prefix_list = "<table><tr><th>Col</th><th>Name</th><th>Icon count</th></tr>";
      for (var i = 0; i < ppar.prefixArray.length; i++) {
            if (ppar.prefixArray[i] != null && ppar.prefixArray[i][1] != '-') {
                  prefix_list = prefix_list + "<tr><td>" + (ppar.prefixArray[i][0] + 1) + '</td><td>' + ppar.prefixArray[i][1] + '</td><td>' + ppar.prefixArray[i][2] + '</td></tr>';
            }
      }
      prefix_list = prefix_list + "</table>";
      windowPrefixHelpTips.toolTip = "<p>Current Window Prefixes:</p><p> " + prefix_list + "</p>";
      closeAllPrefixButton.toolTip = "<p>Close all windows that are created by this script using <b>all known prefixes</b> (which can be empty prefix).</p>" +
                                     "<p>Prefixes used to close windows are default empty prefix, prefix in the Window Prefix box and all saved window prefixes. " +
                                     "All saved prefix information is cleared after this operation.</p>" +
                                     "<p>To close windows with current prefix use Close all button.</p>" +
                                     windowPrefixHelpTips.toolTip;

      windowPrefixComboBox.clear();
      var pa = get_win_prefix_combobox_array(default_prefix);
      addArrayToComboBox(windowPrefixComboBox, pa);
      windowPrefixComboBox.editText = validateWindowPrefix(ppar.win_prefix);
      windowPrefixComboBox.currentItem = pa.indexOf(validateWindowPrefix(ppar.win_prefix));
}

function fix_win_prefix_array()
{
      var new_prefix_array = [];

      for (var i = 0; i < ppar.prefixArray.length; i++) {
            if (ppar.prefixArray[i] == null) {
                  continue;
            } else if (!Array.isArray(ppar.prefixArray[i])) {
                  // bug fix, mark as free
                  continue;
            } else if (ppar.prefixArray[i][1] != '-') {
                  new_prefix_array[new_prefix_array.length] = ppar.prefixArray[i];
            }
      }
      ppar.prefixArray = new_prefix_array;
}

function get_win_prefix_combobox_array(default_prefix)
{
      default_prefix = validateWindowPrefix(default_prefix);
      var name_array = [default_prefix];

      for (var i = 0; i < ppar.prefixArray.length; i++) {
            if (ppar.prefixArray[i] != null && ppar.prefixArray[i][1] != '-') {
                  var add_name = validateWindowPrefix(ppar.prefixArray[i][1]);
                  if (add_name != default_prefix) {
                        name_array[name_array.length] = add_name;
                  }
            }
      }
      return name_array;
}

function ensure_win_prefix(id)
{
      if (ppar.win_prefix != "" && !id.startsWith(ppar.win_prefix)) {
            return ppar.win_prefix + id;
      } else {
            return id;
      }
}

// Find a prefix from the prefix array. Returns -1 if not
// found.
function findPrefixIndex(prefix)
{
      for (var i = 0; i < ppar.prefixArray.length; i++) {
            if (ppar.prefixArray[i][1] == prefix) {
                  return i;
            }
      }
      return -1;
}

// Find a new free column position for a prefix. Prefix name '-'
// is used to mark a free position.
function findNewPrefixIndex(find_free_column)
{
      if (find_free_column) {
            /* First mark all reserved column positions. */
            var reserved_columns = [];
            for (var i = 0; i < ppar.prefixArray.length; i++) {
                  if (ppar.prefixArray[i][1] != '-') {
                        reserved_columns[ppar.prefixArray[i][0]] = true;
                  }
            }
            /* Then find first unused column position. */
            for (var i = 0; i < reserved_columns.length; i++) {
                  if (reserved_columns[i] != true) {
                        break;
                  }
            }
            var index = ppar.prefixArray.length;
            ppar.prefixArray[index] = [i, '-', 0];
            return index;
      } else {
            // Just return a new slot at the end of the array
            var index = ppar.prefixArray.length;
            ppar.prefixArray[index] = [0, '-', 0];
            return index;
      }
}

// Save persistent settings
function savePersistentSettings(from_exit)
{
      if (do_not_write_settings) {
            console.noteln("Do not save interface settings to persistent module settings.");
      } else {
            console.noteln("Save persistent settings");
            Settings.write (SETTINGSKEY + "/prefixName", DataType_String, ppar.win_prefix);
            Settings.write (SETTINGSKEY + "/prefixArray", DataType_String, JSON.stringify(ppar.prefixArray));
            if (par.use_manual_icon_column.val) {
                  Settings.write (SETTINGSKEY + "/columnCount", DataType_Int32, ppar.userColumnCount);
            }
            Settings.write (SETTINGSKEY + "/usePreview", DataType_Boolean, ppar.use_preview);
            Settings.write (SETTINGSKEY + "/sidePreviewVisible", DataType_Boolean, ppar.side_preview_visible);
            Settings.write (SETTINGSKEY + "/defaultPreviewSize", DataType_Boolean, ppar.default_preview_size);
            Settings.write (SETTINGSKEY + "/previewWidth", DataType_Int32, ppar.preview_width);
            Settings.write (SETTINGSKEY + "/previewHeight", DataType_Int32, ppar.preview_height);
            Settings.write (SETTINGSKEY + "/useSingleColumn", DataType_Boolean, ppar.use_single_column);
      }
      if (!from_exit) {
            setWindowPrefixHelpTip(ppar.win_prefix);
      }
}

function readPersistentSettings()
{
      if (do_not_read_settings) {
            console.writeln("Use default settings, do not read session settings from persistent module settings");
            return;
      }
      // Read prefix info. We use new setting names to avoid conflict with
      // older columnCount/winPrefix names
      console.noteln("Read window prefix settings");
      var tempSetting = Settings.read(SETTINGSKEY + "/prefixName", DataType_String);
      if (Settings.lastReadOK) {
            console.writeln("AutoIntegrate: Restored prefixName '" + tempSetting + "' from settings.");
            ppar.win_prefix = tempSetting;
      }
      if (par.start_with_empty_window_prefix.val) {
            ppar.win_prefix = '';
      }
      var tempSetting  = Settings.read(SETTINGSKEY + "/prefixArray", DataType_String);
      if (Settings.lastReadOK) {
            console.writeln("AutoIntegrate: Restored prefixArray '" + tempSetting + "' from settings.");
            ppar.prefixArray = JSON.parse(tempSetting);
            if (ppar.prefixArray.length > 0 && ppar.prefixArray[0].length == 2) {
                  // We have old format prefix array without column position
                  // Add column position as the first array element
                  console.writeln("AutoIntegrate:converting old format prefix array " + JSON.stringify(ppar.prefixArray));
                  for (var i = 0; i < ppar.prefixArray.length; i++) {
                        if (ppar.prefixArray[i] == null) {
                              ppar.prefixArray[i] = [0, '-', 0];
                        } else if (ppar.prefixArray[i][0] == '-') {
                              // add zero column position
                              ppar.prefixArray[i].unshift(0);
                        } else {
                              // Used slot, add i as column position
                              ppar.prefixArray[i].unshift(i);
                        }
                  }
            }
            fix_win_prefix_array();
      }
      var tempSetting = Settings.read(SETTINGSKEY + "/columnCount", DataType_Int32);
      if (Settings.lastReadOK) {
            console.writeln("AutoIntegrate: Restored columnCount '" + tempSetting + "' from settings.");
            ppar.userColumnCount = tempSetting;
      }
      if (!par.use_manual_icon_column.val) {
            ppar.userColumnCount = -1;
      }
      var tempSetting = Settings.read(SETTINGSKEY + "/lastDir", DataType_String);
      if (Settings.lastReadOK) {
            console.writeln("AutoIntegrate: Restored lastDir '" + tempSetting + "' from settings.");
            ppar.lastDir = tempSetting;
      }
      var tempSetting = Settings.read(SETTINGSKEY + "/usePreview", DataType_Boolean);
      if (Settings.lastReadOK) {
            console.writeln("AutoIntegrate: Restored usePreview '" + tempSetting + "' from settings.");
            ppar.use_preview = tempSetting;
            use_preview = tempSetting;
      }
      var tempSetting = Settings.read(SETTINGSKEY + "/sidePreviewVisible", DataType_Boolean);
      if (Settings.lastReadOK) {
            console.writeln("AutoIntegrate: Restored sidePreviewVisible '" + tempSetting + "' from settings.");
            ppar.side_preview_visible = tempSetting;
      }
      var tempSetting = Settings.read(SETTINGSKEY + "/defaultPreviewSize", DataType_Boolean);
      if (Settings.lastReadOK) {
            console.writeln("AutoIntegrate: Restored defaultPreviewSize '" + tempSetting + "' from settings.");
            ppar.default_preview_size = tempSetting;
      }
      var tempSetting = Settings.read(SETTINGSKEY + "/previewWidth", DataType_Int32);
      if (Settings.lastReadOK) {
            console.writeln("AutoIntegrate: Restored previewWidth '" + tempSetting + "' from settings.");
            ppar.preview_width = tempSetting;
      }
      var tempSetting = Settings.read(SETTINGSKEY + "/previewHeight", DataType_Int32);
      if (Settings.lastReadOK) {
            console.writeln("AutoIntegrate: Restored previewHeight '" + tempSetting + "' from settings.");
            ppar.preview_height = tempSetting;
      }
      var tempSetting = Settings.read(SETTINGSKEY + "/useSingleColumn", DataType_Boolean);
      if (Settings.lastReadOK) {
            console.writeln("AutoIntegrate: Restored useSingleColumn '" + tempSetting + "' from settings.");
            ppar.use_single_column = tempSetting;
      }
}

function fixWindowArray(arr, prev_prefix, cur_prefix)
{
    if (prev_prefix != "") {
        // in this situation we've fixed up the array at least once, but the user changed the prefix
        // in the UI and so the old prefix must be removed from the array before prepending the new one.

        for (var i = 0; i < arr.length; i++) {
            // console.writeln(" AINew fixWindowArray: removing prefix " + prev_prefix + " from "  + arr[i]);
            arr[i] = arr[i].substring(arr[i].indexOf(prev_prefix.toString()) + prev_prefix.length);
            // console.writeln(" AINew remaining is " + arr[i]);
        }
    }

    // add the window prefix to the array.

    for (var i = 0; i < arr.length; i++) {
        // console.writeln(" AINew fixWindowArray: prepending prefix " + cur_prefix + " to " + arr[i]);
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
function fixAllWindowArrays(new_prefix)
{
      var old_prefix = getWindowPrefix("Integration_L", integration_LRGB_windows[0]);
      if (old_prefix == new_prefix) {
            // no change
            // console.writeln("fixAllWindowArrays no change in prefix '" + new_prefix + "'");
            return;
      }
      // console.writeln("fixAllWindowArrays set new prefix '" + new_prefix + "'");
      fixWindowArray(integration_LRGB_windows, old_prefix, new_prefix);
      fixWindowArray(integration_color_windows, old_prefix, new_prefix);
      fixWindowArray(fixed_windows, old_prefix, new_prefix);
      fixWindowArray(calibrate_windows, old_prefix, new_prefix);
      fixWindowArray(final_windows, old_prefix, new_prefix);
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

function setMaskChecked(imgWin, maskWin)
{
      try {
            imgWin.setMask(maskWin);
      } catch(err) {
            console.criticalln("setMask failed: " + err);
            console.criticalln("Maybe mask is from different data set, different image size/binning or different crop to common areas setting.");
            throwFatalError("Error setting the mask.");
      }
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

function addProcessingStep(txt)
{
      console.noteln("AutoIntegrate: " + txt);
      processing_steps = processing_steps + "\n" + txt;
}

function addStatusInfo(txt)
{
      console.noteln("------------------------");
      updateStatusInfoLabel(txt);
      checkEvents();
}

function addProcessingStepAndStatusInfo(txt)
{
      addProcessingStep(txt);
      updateStatusInfoLabel(txt);
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

function checkWinFilePath(w)
{
      outputRootDir = getOutputDir(w.filePath);
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
      closeAllWindowsFromArray(fixed_windows);
      closeAllWindowsFromArray(calibrate_windows);

      use_force_close = force_close;

      closeFinalWindowsFromArray(final_windows);

      use_force_close = true;

      runGC();
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

function saveWindowEx(path, id, optional_unique_part)
{
      if (path == null || id == null) {
            return null;
      }
      var fname = path + id + optional_unique_part + ".xisf";
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
            addProcessingStepAndStatusInfo("Create mask by extracting lightness component from color image " + sourceWindow.mainView.id);

            targetWindow = extractLchannel(sourceWindow);
            
            windowRenameKeepifEx(targetWindow.mainView.id, name, true, allow_duplicate_name);
      } else {
            /* Default mask is the same as stretched image. */
            addProcessingStepAndStatusInfo("Create mask from image " + sourceWindow.mainView.id);
            targetWindow = copyWindowEx(sourceWindow, name, allow_duplicate_name);
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

function openImageFiles(filetype, lights_only, json_only)
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
      saveLastDir(File.extractDrive(ofd.fileNames[0]) + File.extractDirectory(ofd.fileNames[0]));
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
            var pagearray = readJsonFile(ofd.fileNames[0], lights_only);
            if (lights_only) {
                  if (pagearray[pages.LIGHTS] == null) {
                        return null;
                  } else {
                        return treeboxfilesToFilenames(pagearray[pages.LIGHTS].files);
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

function filterKeywords(imageWindow, keywordname) 
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
      var oldKeywords = filterKeywords(imageWindow, "SSWEIGHT");
      imageWindow.keywords = oldKeywords.concat([
         new FITSKeyword(
            "SSWEIGHT",
            SSWEIGHT.toFixed(5),
            "Image weight"
         )
      ]);
      ssweight_set = true;
}

function setFITSKeyword(imageWindow, name, value, comment) 
{
      var oldKeywords = filterKeywords(imageWindow, name);
      imageWindow.keywords = oldKeywords.concat([
         new FITSKeyword(
            name,
            value,
            comment
         )
      ]);
}

function setFITSKeywordNoOverwrite(imageWindow, name, value, comment) 
{
      if (findKeywords(imageWindow, name)) {
            console.writeln("keyword already set");
            return;
      }
      setFITSKeyword(imageWindow, name, value, comment);
}

function setFinalImageKeyword(imageWindow) 
{
      console.writeln("setFinalImageKeyword to " + imageWindow.mainView.id);
      setFITSKeyword(
            imageWindow,
            "AutoIntegrate",
            "finalimage",
            "AutoIntegrate processed final image");
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

function setImagetypKeyword(imageWindow, imagetype) 
{
      setFITSKeyword(
            imageWindow,
            "IMAGETYP",
            imagetype,
            "Type of image");
}

function setFilterKeyword(imageWindow, value) 
{
      setFITSKeyword(
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
      if (pixinsight_version_num < 1080812) {
            P.evaluateNoise = false;
      } else {
            P.evaluateSNR = false;
      }

      P.executeGlobal();

      closeOneWindow(P.highRejectionMapImageId);
      closeOneWindow(P.lowRejectionMapImageId);
      closeOneWindow(P.slopeMapImageId);

      var new_name = windowRename(P.integrationImageId, name);

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

      windowRenameKeepif(targetWindow.mainView.id, ppar.win_prefix + "AutoMasterSuperBias", true);

      return targetWindow.mainView.id
}

/* Open a file as image window. */
function openImageWindowFromFile(fileName)
{
      var imageWindows = ImageWindow.open(fileName);
      if (imageWindows.length != 1) {
            throwFatalError("*** openImageWindowFromFile Error: imageWindows.length: " + imageWindows.length + ", file " + fileName);
      }
      var imageWindow = imageWindows[0];
      if (imageWindow == null) {
            throwFatalError("*** openImageWindowFromFile Error: Can't read file: " + fileName);
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
      var imageWin = openImageWindowFromFile(images[0][1]);
      console.writeln("matchMasterToImages, images[0][1] " + images[0][1]);
      console.writeln("matchMasterToImages, imageWin.width " + imageWin.mainView.image.width + ", imageWin.height "+ imageWin.mainView.image.height);

      /* Loop through master files and pick the matching one.
       */
      var matchingMaster = null;
      for (var i = 0; i < masterPath.length; i++) {
            var masterWin = openImageWindowFromFile(masterPath[i]);
            console.writeln("matchMasterToImages, check masterPath[ " + i + "] " + masterPath[i]);
            console.writeln("matchMasterToImages, masterWin.width " + masterWin.mainView.image.width + ", masterWin.height " + masterWin.mainView.image.height);
            if (masterWin.mainView.image.width == imageWin.mainView.image.width 
                && masterWin.mainView.image.height == imageWin.mainView.image.height)
            {
                  /* We have a match. */
                  matchingMaster = masterPath[i];
                  console.writeln("matchMasterToImages, found match " + matchingMaster);
            }
            forceCloseOneWindow(masterWin);
            if (matchingMaster != null) {
                  break;
            }
      }
      forceCloseOneWindow(imageWin);

      if (matchingMaster == null) {
            throwFatalError("*** matchMasterToImages Error: Can't find matching master file");
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

      console.noteln("runCalibrateDarks, images[0] " + images[0][1] + ", master bias " + masterbiasPath);
      console.writeln("runCalibrateDarks, master bias " + masterbiasPath);

      var P = new ImageCalibration;
      P.targetFrames = fileNamesToEnabledPath(fileNames); // [ enabled, path ];
      P.enableCFA = is_color_files && par.debayerPattern.val != 'None';
      P.cfaPattern = debayerPattern_enums[debayerPattern_values.indexOf(par.debayerPattern.val)];
      P.masterBiasEnabled = true;
      P.masterBiasPath = matchMasterToImages(P.targetFrames, masterbiasPath);
      P.masterDarkEnabled = false;
      P.masterFlatEnabled = false;
      P.outputDirectory = outputRootDir + AutoOutputDir;
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
      P.enableCFA = is_color_files && par.debayerPattern.val != 'None';
      P.cfaPattern = debayerPattern_enums[debayerPattern_values.indexOf(par.debayerPattern.val)];
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
      P.outputDirectory = outputRootDir + AutoOutputDir;
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

      closeOneWindow(P.highRejectionMapImageId);
      closeOneWindow(P.lowRejectionMapImageId);
      closeOneWindow(P.slopeMapImageId);

      var new_name = windowRename(P.integrationImageId, name);

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
      P.enableCFA = is_color_files && par.debayerPattern.val != 'None';
      P.cfaPattern = debayerPattern_enums[debayerPattern_values.indexOf(par.debayerPattern.val)];
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
      P.outputDirectory = outputRootDir + AutoCalibratedDir;
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


/***************************************************************************
 * 
 *    calibrateEngine
 * 
 * Calibration engine to run image calibration 
 * if bias, dark and/or flat files are selected.
 */
function calibrateEngine(filtered_lights)
{
      if (biasFileNames == null) {
            biasFileNames = [];
      }
      if (flatdarkFileNames == null) {
            flatdarkFileNames = [];
      }
      if (flatFileNames == null) {
            flatFileNames = [];
      }
      if (darkFileNames == null) {
            darkFileNames = [];
      }
      if (biasFileNames.length == 0
          && flatdarkFileNames.length == 0
          && flatFileNames.length == 0
          && darkFileNames.length == 0)
      {
            // do not calibrate
            addProcessingStep("calibrateEngine, no bias, flat or dark files");
            return [ lightFileNames , '' ];
      }

      addProcessingStepAndStatusInfo("Image calibration");

      ensureDir(outputRootDir);
      ensureDir(combinePath(outputRootDir, AutoMasterDir));
      ensureDir(combinePath(outputRootDir, AutoOutputDir));
      ensureDir(combinePath(outputRootDir, AutoCalibratedDir));

      // Collect filter files
      var filtered_flats = getFilterFiles(flatFileNames, pages.FLATS, '');

      is_color_files = filtered_flats.color_files;

      if (flatFileNames.length > 0 && lightFileNames.length > 0) {
            // we have flats and lights
            // check that filtered files match
            for (var i = 0; i < filtered_flats.allfilesarr.length; i++) {
                  var is_flats = filtered_flats.allfilesarr[i].files.length > 0;
                  var is_lights = filtered_lights.allfilesarr[i].files.length > 0;
                  if (is_flats != is_lights) {
                        // lights and flats do not match on filters
                        throwFatalError("Filters on light and flat images do not match.");
                  }
            }
      }

      if (par.bias_master_files.val) {
            addProcessingStep("calibrateEngine use existing master bias files " + biasFileNames);
            var masterbiasPath = biasFileNames;
      } else if (biasFileNames.length == 1) {
            addProcessingStep("calibrateEngine use existing master bias " + biasFileNames[0]);
            var masterbiasPath = biasFileNames[0];
      } else if (biasFileNames.length > 0) {
            addProcessingStep("calibrateEngine generate master bias using " + biasFileNames.length + " files");
            // integrate bias images
            var biasimages = filesForImageIntegration(biasFileNames);
            var masterbiasid = runImageIntegrationBiasDarks(biasimages, ppar.win_prefix + "AutoMasterBias");

            // save master bias
            setImagetypKeyword(findWindow(masterbiasid), "Master bias");
            var masterbiasPath = saveMasterWindow(outputRootDir, masterbiasid);

            // optionally generate superbias
            if (par.create_superbias.val) {
                  var masterbiaswin = findWindow(masterbiasid);
                  var mastersuperbiasid = runSuberBias(masterbiaswin);
                  setImagetypKeyword(findWindow(mastersuperbiasid), "Master bias");
                  var masterbiasPath = saveMasterWindow(outputRootDir, mastersuperbiasid);
                  updatePreviewId(mastersuperbiasid);
            } else {
                  updatePreviewId(masterbiasid);
            }
      } else {
            addProcessingStep("calibrateEngine no master bias");
            var masterbiasPath = null;
      }

      if (par.flat_dark_master_files.val) {
            addProcessingStep("calibrateEngine use existing master flat dark files " + flatdarkFileNames);
            var masterflatdarkPath = darkFileNames;
      } else if (flatdarkFileNames.length == 1) {
            addProcessingStep("calibrateEngine use existing master flat dark " + flatdarkFileNames[0]);
            var masterflatdarkPath = flatdarkFileNames[0];
      } else if (flatdarkFileNames.length > 0) {
            addProcessingStep("calibrateEngine generate master flat dark using " + flatdarkFileNames.length + " files");
            // integrate flat dark images
            var flatdarkimages = filesForImageIntegration(flatdarkFileNames);
            var masterflatdarkid = runImageIntegrationBiasDarks(flatdarkimages, ppar.win_prefix + "AutoMasterFlatDark");
            setImagetypKeyword(findWindow(masterflatdarkid), "Master flat dark");
            var masterflatdarkPath = saveMasterWindow(outputRootDir, masterflatdarkid);
            updatePreviewId(masterflatdarkid);
      } else {
            addProcessingStep("calibrateEngine no master flat dark");
            var masterflatdarkPath = null;
      }

      if (par.dark_master_files.val) {
            addProcessingStep("calibrateEngine use existing master dark files " + darkFileNames);
            var masterdarkPath = darkFileNames;
      } else if (darkFileNames.length == 1) {
            addProcessingStep("calibrateEngine use existing master dark " + darkFileNames[0]);
            var masterdarkPath = darkFileNames[0];
      } else if (darkFileNames.length > 0) {
            addProcessingStep("calibrateEngine generate master dark using " + darkFileNames.length + " files");
            if (par.pre_calibrate_darks.val && masterbiasPath != null) {
                  // calibrate dark frames with bias
                  var darkcalFileNames = runCalibrateDarks(darkFileNames, masterbiasPath);
                  var darkimages = filesForImageIntegration(darkcalFileNames);
            } else {
                  var darkimages = filesForImageIntegration(darkFileNames);
            }
            // generate master dark file
            var masterdarkid = runImageIntegrationBiasDarks(darkimages, ppar.win_prefix + "AutoMasterDark");
            setImagetypKeyword(findWindow(masterdarkid), "Master dark");
            var masterdarkPath = saveMasterWindow(outputRootDir, masterdarkid);
            updatePreviewId(masterdarkid);
      } else {
            addProcessingStep("calibrateEngine no master dark");
            var masterdarkPath = null;
      }

      // generate master flat for each filter
      addProcessingStepAndStatusInfo("Image calibration, generate master flats");
      var masterflatPath = [];
      for (var i = 0; i < filtered_flats.allfilesarr.length; i++) {
            var filterFiles = filtered_flats.allfilesarr[i].files;
            var filterName = filtered_flats.allfilesarr[i].filter;
            if (filterFiles.length == 1) {
                  addProcessingStep("calibrateEngine use existing " + filterName + " master flat " + filterFiles[0].name);
                  masterflatPath[i] = filterFiles[0].name;
            } else if (filterFiles.length > 0) {
                  // calibrate flats for each filter with master bias and master dark
                  addProcessingStep("calibrateEngine calibrate " + filterName + " flats using " + filterFiles.length + " files, " + filterFiles[0].name);
                  var flatcalimages = fileNamesToEnabledPathFromFilearr(filterFiles);
                  console.writeln("flatcalimages[0] " + flatcalimages[0][1]);
                  var flatcalFileNames = runCalibrateFlats(flatcalimages, masterbiasPath, masterdarkPath, masterflatdarkPath);
                  console.writeln("flatcalFileNames[0] " + flatcalFileNames[0]);

                  // integrate flats to generate master flat for each filter
                  var flatimages = filesForImageIntegration(flatcalFileNames);
                  console.writeln("flatimages[0] " + flatimages[0][1]);
                  let masterflatid = runImageIntegrationFlats(flatimages, ppar.win_prefix + "AutoMasterFlat_" + filterName);
                  console.writeln("masterflatid " + masterflatid);
                  setImagetypKeyword(findWindow(masterflatid), "Master flat");
                  setFilterKeyword(findWindow(masterflatid), filterFiles[0].filter);
                  masterflatPath[i] = saveMasterWindow(outputRootDir, masterflatid);
                  updatePreviewId(masterflatid);
            } else {
                  masterflatPath[i] = null;
            }
      }

      addProcessingStepAndStatusInfo("Image calibration, calibrate light images");
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
                        addProcessingStep("calibrateEngine calibrate " + filterName + " lights for " + fileProcessedStatus.unprocessed.length + " files");
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

      runGC();

      return [ calibratedLightFileNames, '_c' ];
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
 * partial sections is specified in the input par. This list is used to
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
      let irs =  iterativeRectangleStatistics 
      {
         irs.medianEnabled = true;
         irs.lowRejectionEnabled = false;
         irs.highRejectionEnabled = true;
         irs.rejectionHigh = currentHighRejectionLimit;
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
      // Run image integration as-is to make line defects more visible
      console.writeln("getDefectInfo, runImageIntegration");
      var LDD_id = runImageIntegration(LDD_images, "LDD");
      var LDD_win = findWindow(LDD_id);
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

      closeOneWindow(LDD_id);

      return { ccFileNames: fileNames, ccDefects: defects };
}

function runLinearDefectDetection(fileNames)
{
      addProcessingStepAndStatusInfo("Run Linear Defect Detection");
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
            if (par.use_processed_files.val) {
                  for (var j = 0; j < LDDDefectInfo.length; j++) {
                        if (LDDDefectInfo[j].groupname == LDD_groups[i].groupname) {
                              // found existing defect info
                              console.writeln("Use existing defect info " + LDDDefectInfo[j].groupname);
                              break;
                        }
                  }
            }
            if (!par.use_processed_files.val || j == LDDDefectInfo.length) {
                  // generate new defect info
                  var ccGroupInfo = getDefectInfo(LDD_groups[i].groupfiles);
                  LDDDefectInfo[LDDDefectInfo.length] = { groupname: LDD_groups[i].groupname, defects: ccGroupInfo.ccDefects }
            } else {
                  // use existing defect info
                  var ccGroupInfo = { ccFileNames: LDD_groups[i].groupfiles, ccDefects: LDDDefectInfo[j].defects };
            }
            ccInfo[ccInfo.length] = ccGroupInfo;
      }

      return ccInfo;
}

function generateNewFileName(fileName, outputdir, postfix, extension)
{
      return ensurePathEndSlash(outputdir) + File.extractName(fileName) + postfix + extension;
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
      var outputDir = outputRootDir + AutoOutputDir;
      var postfix = getBinningPostfix();
      var outputExtension = ".xisf";
 
      addStatusInfo("Do " + par.binning_resample.val + "x" + par.binning_resample.val + " binning using IntegerResample on light files");
      addProcessingStep("Do " + par.binning_resample.val + "x" + par.binning_resample.val + " binning using IntegerResample on light files, output *" + postfix + ".xisf");
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
                        throwFatalError("*** runBinningOnLights Error: imageWindows.length: " + imageWindows.length);
                  }
                  var imageWindow = imageWindows[0];
                  if (imageWindow == null) {
                        throwFatalError("*** runBinningOnLights Error: Can't read file: " + fileNames[i]);
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
                        throwFatalError("*** runBinningOnLights Error: Can't write output image: " + imageWindow.mainView.id + ", file: " + filePath);
                  }
                  // Close window
                  forceCloseOneWindow(imageWindow);   
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
      var outputDir = outputRootDir + AutoOutputDir;
      var postfix = "_ABE";
      var outputExtension = ".xisf";

      addProcessingStepAndStatusInfo("Run ABE on on light files");

      console.writeln("runABEOnLights output *" + postfix + ".xisf");
      console.writeln("runABEOnLights input[0] " + fileNames[0]);

      for (var i = 0; i < fileNames.length; i++) {
            // Open source image window from a file
            var imageWindows = ImageWindow.open(fileNames[i]);
            if (imageWindows.length != 1) {
                  throwFatalError("*** runABEOnLights Error: imageWindows.length: " + imageWindows.length);
            }
            var imageWindow = imageWindows[0];
            if (imageWindow == null) {
                  throwFatalError("*** runABEOnLights Error: Can't read file: " + fileNames[i]);
            }
            
            // Run ABE which creates a new window with _ABE extension
            var new_id = runABEex(imageWindow, false, postfix);
            var new_win = findWindow(new_id);
            if (new_win == null) {
                  throwFatalError("*** runABEOnLights Error: could not find window: " + new_id);
            }
            
            // Source image window is not needed any more
            forceCloseOneWindow(imageWindow);

            var filePath = generateNewFileName(fileNames[i], outputDir, postfix, outputExtension);

            // Save ABE window
            if (!writeImage(filePath, new_win)) {
                  throwFatalError("*** runABEOnLights Error: Can't write output image: " + new_id);
            }
            // Close ABE window
            forceCloseOneWindow(new_win);

            newFileNames[newFileNames.length] = filePath;
      }

      console.writeln("runABEOnLights output[0] " + newFileNames[0]);

      return newFileNames;
}

function runCosmeticCorrection(fileNames, defects, color_images)
{
      addStatusInfo("Run CosmeticCorrection, number of line defects to fix is " + defects.length);
      if (defects.length > 0) {
            addProcessingStep("Run CosmeticCorrection, output *_cc.xisf, number of line defects to fix is " + defects.length);
      } else {
            addProcessingStep("Run CosmeticCorrection, output *_cc.xisf, no line defects to fix");
      }
      console.writeln("fileNames[0] " + fileNames[0]);

      var P = new CosmeticCorrection;
      P.targetFrames = fileNamesToEnabledPath(fileNames);
      P.overwrite = true;
      if (color_images && par.debayerPattern.val != 'None') {
            P.cfa = true;
      } else {
            P.cfa = false;
      }
      P.outputDir = outputRootDir + AutoOutputDir;
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

      P.executeGlobal();
      
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
      addProcessingStep(name + " outliers filtered " + (measurements.length - newMeasurements.length) + " files");
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
      addProcessingStep(name + " limit filtered " + (measurements.length - newMeasurements.length) + " files");
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
function SubframeSelectorMeasure(fileNames, weight_filtering, treebox_filtering)
{
      console.writeln("SubframeSelectorMeasure, input[0] " + fileNames[0]);

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
      if (pixinsight_version_num < 1080810) {
            var indexSNRWeight = 7;
      } else {
            var indexSNRWeight = 9;
      }

      var measurements = null;

      if (saved_measurements != null) {
            // Find old measurements from saved_measurements
            console.writeln("SubframeSelectorMeasure, use saved measurements");
            measurements = [];
            for (var i = 0; i < fileNames.length; i++) {
                  var found = false;
                  for (var j = 0; j < saved_measurements.length; j++) {
                        if (saved_measurements[j][indexPath] == fileNames[i]) {
                              measurements[measurements.length] = saved_measurements[j];
                              found = true;
                              break;
                        }
                  }
                  if (!found) {
                        // something went wrong, list are not compatible, generate new ones
                        console.writeln("SubframeSelectorMeasure, saved measurements not found for " + fileNames[i]);
                        measurements = null;
                        break;
                  }
            }
      }
      if (measurements == null) {
            // collect new measurements
            console.writeln("SubframeSelectorMeasure, collect measurements");
            var P = new SubframeSelector;
            P.nonInteractive = true;
            P.subframes = fileNamesToEnabledPath(fileNames);     // [ subframeEnabled, subframePath ]
            P.noiseLayers = 2;
            P.outputDirectory = outputRootDir + AutoOutputDir;
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
            saved_measurements = P.measurements;
            measurements = P.measurements;
      }

      // Close measurements and expressions windows
      closeAllWindowsSubstr("SubframeSelector");

      // We filter outliers here so they are not included in the
      // min/max calculations below
      var filtered_files = [];
      measurements = filterOutliers(measurements, "FWHM", indexFWHM, 'max', par.outliers_fwhm.val, indexPath, filtered_files);
      measurements = filterOutliers(measurements, "Eccentricity", indexEccentricity, 'max', par.outliers_ecc.val, indexPath, filtered_files);
      measurements = filterOutliers(measurements, "SNR", indexSNRWeight, 'min', par.outliers_snr.val, indexPath, filtered_files);
      if (pixinsight_version_num >= 1080810) {
            measurements = filterOutliers(measurements, "PSF Signal", indexPSFSignal, 'min', par.outliers_psfsignal.val, indexPath, filtered_files);
            measurements = filterOutliers(measurements, "PSF Power", indexPSFPower, 'min', par.outliers_psfpower.val, indexPath, filtered_files);
      }
      measurements = filterOutliers(measurements, "Stars", indexStars, 'min', par.outliers_stars.val, indexPath, filtered_files);

      console.writeln("SubframeSelectorMeasure:calculate weight");

      /* Calculate weight */
      var FWHMMin = findMin(measurements, indexFWHM);
      var FWHMMax = findMax(measurements, indexFWHM);
      var EccentricityMin = findMin(measurements, indexEccentricity);
      var EccentricityMax = findMax(measurements, indexEccentricity);
      var SNRWeightMin = findMin(measurements, indexSNRWeight);
      var SNRWeightMax = findMax(measurements, indexSNRWeight);
      if (pixinsight_version_num >= 1080810) {
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
                        if (pixinsight_version_num < 1080810) {
                              throwFatalError("Option " + par.use_weight.val + " is not supported in this version of PixInsight");
                        }
                        SSWEIGHT = measurements[i][indexPSFSignal] + 1; // Add one to avoid zero value
                        break;
                  case 'PSF Signal scaled':
                        if (pixinsight_version_num < 1080810) {
                              throwFatalError("Option " + par.use_weight.val + " is not supported in this version of PixInsight");
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
                        throwFatalError("Invalid option " + par.use_weight.val);
            }
            addProcessingStep("SSWEIGHT " + SSWEIGHT + ", FWHM " + FWHM + ", Ecc " + Eccentricity + ", SNR " + SNRWeight + 
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
            if (pixinsight_version_num < 1080810) {
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
            console.writeln("SubframeSelectorMeasure, " + filtered_files.length + " discarded files");
            for (var i = 0; i < filtered_files.length; i++) {
                  console.writeln(filtered_files[i][indexPath]);
            }
            console.writeln("SubframeSelectorMeasure, " + measurements.length + " accepted files");
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
                        addJsonFileInfo(fileInfoList, pages.LIGHTS, treeboxfiles, null);
                        let saveInfo = initJsonSaveInfo(fileInfoList, false, "");
                        console.writeln("saveInfo " + saveInfo);
                        let saveInfoJson = JSON.stringify(saveInfo, null, 2);
                        console.writeln("saveInfoJson " + saveInfoJson);
                        // save to a file
                        let weightsFile = ensure_win_prefix("AutoWeights.json");
                        let outputDir = getOutputDir(treeboxfiles[0][0]);
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
            console.writeln("SubframeSelectorMeasure, output[0] " + ssFiles[0][0]);
            return ssFiles;
      }
}

function runSubframeSelector(fileNames)
{
      addProcessingStepAndStatusInfo("Run SubframeSelector");
      console.writeln("input[0] " + fileNames[0]);
      
      var ssWeights = SubframeSelectorMeasure(fileNames, par.image_weight_testing.val, false);
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
            var outputDir = outputRootDir + AutoOutputDir;
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
                              forceCloseOneWindow(imageWindow);
                              console.writeln(
                              "*** Error: Can't write output image: ", newFilePath
                              );
                              continue;
                        }         
                        forceCloseOneWindow(imageWindow);
                  }
                  newFileNames[newFileNames.length] = newFilePath;
            }
      }
      addProcessingStep("runSubframeSelector, input " + fileNames.length + " files, output " + newFileNames.length + " files");
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
            throwFatalError("Inconsistent lengths, filenames.length=" + names_and_weights.filenames.length + ", ssweights.length=" + names_and_weights.ssweights.length);
      }

      run_HT = true;
      best_ssweight = 0;
      best_image = null;

      /* Loop through files and find image with best SSWEIGHT.
       */
      addProcessingStepAndStatusInfo("Find best SSWEIGHT");
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
            if (user_selected_best_image != null 
                && found_user_selected_best_image == null
                && compareReferenceFileNames(user_selected_best_image, filePath, filename_postfix))
              {
                    found_user_selected_best_image = filePath;
                    found_user_selected_best_image_ssweight = ssweight;
                    console.writeln("found user selected best image " + user_selected_best_image + " as " + filePath);
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
                              addProcessingStep("Files have different resolution, using bigger NAXIS1="+naxis1+" for best SSWEIGHT");
                        }
                        if (first_image || 
                            naxis1 > best_ssweight_naxis ||
                            (ssweight > best_ssweight &&
                             naxis1 == best_ssweight_naxis))
                        {
                              /* Set a new best image if
                              - this is the first image
                              - this has a bigger resolution
                              - this has a bigger SSWEIGHT value and is the same resolution
                              */
                              best_ssweight = ssweight;
                              console.writeln("new best_ssweight=" +  best_ssweight);
                              best_image = filePath;
                              best_ssweight_naxis = naxis1;
                              first_image = false;
                        }
                  }
                  setTreeBoxNodeSsweight(parent.treeBox[pages.LIGHTS], filePath, ssweight, filename_postfix);
            }
            if (accept_file) {
                  newFileNames[newFileNames.length] = fileNames[i];
            }
      }
      if (newFileNames.length == 0) {
            throwFatalError("No files found for processing.");
      }
      if (found_user_selected_best_image != null || file_name_text_best_image != null) {
            if (found_user_selected_best_image != null) {
                  console.writeln("Using user selected best image " + found_user_selected_best_image + ", ssweight " + found_user_selected_best_image_ssweight);
                  best_image = found_user_selected_best_image;
                  best_ssweight = found_user_selected_best_image_ssweight;
            } else {
                  console.writeln("Using best image as a file with text best_image " + file_name_text_best_image + ", ssweight " + file_name_text_best_image_ssweight);
                  best_image = file_name_text_best_image;
                  best_ssweight = file_name_text_best_image_ssweight;
            }
      } else if (best_image != null) {
            console.writeln("Using best image " + best_image);
      } else {
            console.writeln("Unable to find image with best SSWEIGHT, using first image " + newFileNames[0]);
            best_image = newFileNames[0];
            best_ssweight = 1.0;
      }
      return [ best_image, newFileNames ];
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
      for (var i = 0; i < user_selected_reference_image.length; i++) {
            if (user_selected_reference_image[i][1] == filter) {
                  refImage = user_selected_reference_image[i][0];
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
                  if (compareReferenceFileNames(refImage, filearr[i].name, filename_postfix)) {
                        refImage = filearr[i].name;
                        break;
                  }
            }
            if (i == filearr.length) {
                  throwFatalError("User selected reference image " + refImage + " for filter " + filter + " not found from image list, filename_postfix " + filename_postfix);
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
      if (automatic_reference_image != null) {
            setReferenceImageInTreeBox(parent, parent.treeBox[pages.LIGHTS], automatic_reference_image, filename_postfix, filter);
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

// Filter files based on filter keyword/file name.
// files array can be either simple file name array
// or treeboxfiles array having [ filename, checked, weight ] members
function getFilterFiles(files, pageIndex, filename_postfix)
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
            case pages.LIGHTS:
                  filterSet = lightFilterSet;
                  break;
            case pages.FLATS:
                  filterSet = flatFilterSet;
                  break;
      }

      if (filterSet != null) {
            clearFilterFileUsedFlags(filterSet);
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
                  filter = findFilterForFile(filterSet, filePath, filename_postfix);
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
                              if (pageIndex == pages.LIGHTS
                                  && par.debayerPattern.val == 'Auto'
                                  && value.search(/slooh/i) != -1
                                  && value.search(/T3/) != -1) 
                              {
                                    console.writeln("Set debayer pattern from Auto to None");
                                    par.debayerPattern.val = 'None';
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

function getImagetypFiles(files)
{
      var allfiles = [];

      for (var i = 0; i < pages.END; i++) {
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
                        allfiles[pages.BIAS][allfiles[pages.BIAS].length] = filePath;
                        break;
                  case 'dark frame':
                  case 'dark':
                  case 'master dark':
                        allfiles[pages.DARKS][allfiles[pages.DARKS].length] = filePath;
                        break;
                  case 'flat frame':
                  case 'flat field':
                  case 'flat':
                  case 'master flat':
                        allfiles[pages.FLATS][allfiles[pages.FLATS].length] = filePath;
                        break;
                  case 'flatdark':
                  case 'flat dark':
                  case 'darkflat':
                  case 'dark flat':
                  case 'master flat dark':
                        allfiles[pages.FLAT_DARKS][allfiles[pages.FLAT_DARKS].length] = filePath;
                        break;
                  case 'light frame':
                  case 'light':
                  case 'master light':
                  default:
                        allfiles[pages.LIGHTS][allfiles[pages.LIGHTS].length] = filePath;
                        break;
            }
      }
      return allfiles;
}

function findLRGBchannels(parent, alignedFiles, filename_postfix)
{
      /* Loop through aligned files and find different channels.
       */
      addProcessingStepAndStatusInfo("Find L,R,G,B,H,S,O and color channels");

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
      var filter_info = getFilterFiles(alignedFiles, pages.LIGHTS, filename_postfix);

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
                        addProcessingStep("No luminance images, synthetic luminance image from all other images");
                  } else {
                        addProcessingStep("Synthetic luminance image from all light images");
                  }
                  allfilesarr[channels.L].files = allfilesarr[channels.L].files.concat(allfilesarr[channels.R].files);
                  allfilesarr[channels.L].files = allfilesarr[channels.L].files.concat(allfilesarr[channels.G].files);
                  allfilesarr[channels.L].files = allfilesarr[channels.L].files.concat(allfilesarr[channels.B].files);
                  allfilesarr[channels.L].files = allfilesarr[channels.L].files.concat(allfilesarr[channels.H].files);
                  allfilesarr[channels.L].files = allfilesarr[channels.L].files.concat(allfilesarr[channels.S].files);
                  allfilesarr[channels.L].files = allfilesarr[channels.L].files.concat(allfilesarr[channels.O].files);
            }
            if (allfilesarr[channels.R].files.length == 0 && par.synthetic_missing_images.val) {
                  addProcessingStep("No red images, synthetic red image from luminance images");
                  allfilesarr[channels.R].files = allfilesarr[channels.R].files.concat(allfilesarr[channels.L].files);
            }
            if (allfilesarr[channels.G].files.length == 0 && par.synthetic_missing_images.val) {
                  addProcessingStep("No green images, synthetic green image from luminance images");
                  allfilesarr[channels.G].files = allfilesarr[channels.G].files.concat(allfilesarr[channels.L].files);
            }
            if (allfilesarr[channels.B].files.length == 0 && par.synthetic_missing_images.val) {
                  addProcessingStep("No blue images, synthetic blue image from luminance images");
                  allfilesarr[channels.B].files = allfilesarr[channels.B].files.concat(allfilesarr[channels.L].files);
            }
            if (par.RRGB_image.val) {
                  addProcessingStep("RRGB image, use R as L image");
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
            if (par.monochrome_image.val) {
                  // Monochrome
                  if (L_images.images.length == 0) {
                        throwFatalError("No Luminance images found");
                  }
            } else if (rgb) {
                  // LRGB or RGB
                  if (R_images.images.length == 0 && !par.integrate_only.val && !par.image_weight_testing.val) {
                        throwFatalError("No Red images found");
                  }
                  if (B_images.images.length == 0 && !par.integrate_only.val && !par.image_weight_testing.val) {
                        throwFatalError("No Blue images found");
                  }
                  if (G_images.images.length == 0 && !par.integrate_only.val && !par.image_weight_testing.val) {
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

function ensureLightImages(ch, check_allfilesarr)
{
      for (var i = 0; i < check_allfilesarr.length; i++) {
            var filterFiles = check_allfilesarr[i].files;
            var filterName = check_allfilesarr[i].filter;
            if (filterName == ch) {
                  if (filterFiles.length == 0) {
                        throwFatalError("No " + ch + " images that are needed for PixelMath mapping");
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
                  add_missing_image(images, to);
            }
            return to + "_map";
      }
      // loop until all occurrences are replaced
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
                              if (check_allfilesarr != null) {
                                    ensureLightImages(from, check_allfilesarr);
                              } else {
                                    if (findWindowNoPrefixIf(to, run_auto_continue) == null) {
                                          throwFatalError("Could not find image window " + to + " that is needed for PixelMath mapping");
                                    }
                                    add_missing_image(images, to);
                              }
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
      addProcessingStepAndStatusInfo("Run PixelMath single mapping");

      var idWin = findWindow(id);
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
            setTargetFITSKeywordsForPixelmath(findWindow(P.newImageId), targetFITSKeywords);
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
      addProcessingStepAndStatusInfo("Run PixelMath RGB mapping");

      if (idWin == null) {
            idWin = findWindowCheckBaseNameIf("Integration_H", run_auto_continue);
      }
      if (idWin == null) {
            idWin = findWindowCheckBaseNameIf("Integration_S", run_auto_continue);
      }
      if (idWin == null) {
            idWin = findWindowCheckBaseNameIf("Integration_O", run_auto_continue);
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
            setTargetFITSKeywordsForPixelmath(findWindow(newId), targetFITSKeywords);
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
            throwFatalError("Could not find linear fit reference image " + suggestion);
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
                  removeStars(findWindow(image_id), true, false, null, null, par.unscreen_stars.val);
            } else {
                  removeStars(findWindow(image_id), true, true, RGB_stars, null, par.unscreen_stars.val);
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
            var copyname = ensure_win_prefix(images[i] + "_map");
            if (findWindow(copyname) == null) {
                  console.writeln("copy from " + images[i] + " to " + copyname);
                  copyWindow(
                        findWindowNoPrefixIf(images[i], run_auto_continue), 
                        copyname);
                  // crop
                  CropImageIf(findWindow(copyname), crop_truncate_amount);
            } else {
                  console.writeln("map image " + copyname + " already copied");
            }
            images[i] = copyname;
      }
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
      if (findWindow(refimage) == null) {
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

function luminanceNoiseReduction(imgWin, maskWin)
{
      if (par.skip_noise_reduction.val 
          || par.luminance_noise_reduction_strength.val == 0
          || par.non_linear_noise_reduction.val
          || imgWin == null) 
      {
            return;
      }

      addProcessingStepAndStatusInfo("Reduce noise on luminance image " + imgWin.mainView.id);

      if (maskWin == null && !par.use_noisexterminator.val) {
            /* Create a temporary mask. */
            var temp_mask_win = CreateNewTempMaskFromLinearWin(imgWin, false);
            maskWin = temp_mask_win;
      } else {
            var temp_mask_win = null;
      }

      runNoiseReductionEx(imgWin, maskWin, par.luminance_noise_reduction_strength.val, true);
      updatePreviewWin(imgWin);

      if (temp_mask_win != null) {
            forceCloseOneWindow(temp_mask_win);
      }
}

function channelNoiseReduction(image_id)
{
      if (par.skip_noise_reduction.val 
          || par.noise_reduction_strength.val == 0
          || par.non_linear_noise_reduction.val) 
      {
            return;
      }
      addProcessingStepAndStatusInfo("Reduce noise on channel image " + image_id);

      var image_win = findWindow(image_id);

      if (!par.use_noisexterminator.val) {
            /* Create a temporary mask. */
            var temp_mask_win = CreateNewTempMaskFromLinearWin(image_win, false);
      } else {
            var temp_mask_win = null;
      }

      runNoiseReductionEx(image_win, temp_mask_win, par.noise_reduction_strength.val, true);

      updatePreviewWin(image_win);

      if (temp_mask_win != null) {
            forceCloseOneWindow(temp_mask_win);
      }
}

function createNewStarXTerminator(star_mask, linear_data)
{
      try {
            console.writeln("createNewStarXTerminator, linear_data " + linear_data + ", star_mask "+ star_mask);
            var P = new StarXTerminator;
            P.linear = linear_data;
            P.stars = star_mask;
      } catch(err) {
            console.criticalln("StarXTerminator failed");
            console.criticalln(err);
            addProcessingStep("Maybe StarXTerminator is not installed, AI is missing or platform is not supported");
            throwFatalError("StarXTerminator failed");
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
            addProcessingStep("Maybe weight files are missing or platform is not supported");
            throwFatalError("StarNet failed");
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
            addProcessingStep("Maybe StarNet2 is not installed, weight files are missing or platform is not supported");
            throwFatalError("StarNet2 failed");
      }
      return P;
}

function getStarMaskWin(imgWin, name)
{
      if (par.use_starxterminator.val) {
            var win_id = imgWin.mainView.id + "_stars";
            var win = findWindow(win_id);
            console.writeln("getStarMaskWin win_id " + win_id);
            if (win == null) {
                  throwFatalError("Could not find StarXTerminator stars window " + win_id);
            }
            windowRename(win_id, name);
      } else {
            console.writeln("getStarMaskWin win_id " + ImageWindow.activeWindow.mainView.id);
            var win = ImageWindow.activeWindow;
            windowRename(win.mainView.id, name);
      }
      console.writeln("getStarMaskWin completed " + name);
      return win;
}

// Remove stars from an image. We save star mask for later processing and combining
// for star image.
function removeStars(imgWin, linear_data, save_stars, save_array, stars_image_name, use_unscreen)
{
      addProcessingStepAndStatusInfo("Remove stars");

      var create_star_mask = save_stars;
      if (save_stars && use_unscreen) {
            var originalwin_copy = copyWindow(imgWin, ensure_win_prefix(imgWin.mainView.id + "_tmp_original"));
            create_star_mask = false;
      }

      if (par.use_starxterminator.val) {
            addProcessingStep("Run StarXTerminator on " + imgWin.mainView.id);
            var P = createNewStarXTerminator(create_star_mask, linear_data);
      } else if (linear_data) {
            throwFatalError("StarNet/StarNet2 cannot be used to remove stars while image is still in linear stage.");
      } else if (par.use_starnet2.val) {
            addProcessingStep("Run StarNet2 on " + imgWin.mainView.id);
            var P = createNewStarNet2(create_star_mask);
      } else {
            addProcessingStep("Run StarNet on " + imgWin.mainView.id);
            var P = createNewStarNet(create_star_mask);
      }

      /* Execute on image.
       */
      imgWin.mainView.beginProcess(UndoFlag_NoSwapFile);

      P.executeOn(imgWin.mainView, false);
      
      imgWin.mainView.endProcess();

      updatePreviewWin(imgWin);

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
                  var star_win = findWindow(id);
                  console.writeln("removeStars, rename " + id + " to " + stars_image_name);
                  windowRename(id, stars_image_name);
                  forceCloseOneWindow(originalwin_copy);
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
            addProcessingStep("Check custom mapping");
      } else {
            addProcessingStepAndStatusInfo("Custom mapping");
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
            copyToMapImages(images);

            for (var i = 0; i < images.length; i++) {
                  processChannelImage(images[i], false, false);
            }

            var narrowband_linear_fit = par.narrowband_linear_fit.val;
            if (narrowband_linear_fit == "Auto"
                && par.image_stretching.val == 'Auto STF') 
            {
                  /* By default we do not do linear fit
                   * if we stretch with STF. If we stretch
                   * with MaskedStretch we use linear
                   * fit to balance channels better.
                   * */
                  narrowband_linear_fit = "None";
            }
            var mapping_on_nonlinear_data = par.mapping_on_nonlinear_data.val;

            if (narrowband_linear_fit != "None") {
                  /* Do a linear fit of images before PixelMath and before possible
                   * stretching. We do this on both cases, linear and stretched.
                   */
                  var refimage = findLinearFitHSOMapRefimage(images, narrowband_linear_fit);
                  linearFitArray(refimage, images);
            }
            if (par.noise_reduction_strength.val > 0 && !par.combined_image_noise_reduction.val) {
                  // Do noise reduction after linear fit.
                  for (var i = 0; i < images.length; i++) {
                        channelNoiseReduction(images[i]);
                  }
                  RGBmapping.channel_noise_reduction = true;
            }
            if (!mapping_on_nonlinear_data) {
                  /* We run PixelMath using linear images. 
                   */
                  addProcessingStep("Custom mapping, linear narrowband images");
            } else {
                  /* Stretch images to non-linear before combining with PixelMath.
                   */
                  addProcessingStep("Custom mapping, stretched narrowband images");
                  if (par.remove_stars_before_stretch.val) {
                        throwFatalError("Narrowband mapping using non-linear data is not compatible with Remove stars early");
                  }
                  for (var i = 0; i < images.length; i++) {
                        runHistogramTransform(findWindow(images[i]), null, false, 'RGB');
                  }
                  RGBmapping.stretched = true;
            }

            /* Run PixelMath to create a combined RGB image.
             */
            RGB_win_id = runPixelMathRGBMapping(ppar.win_prefix + "Integration_RGB", null, red_mapping, green_mapping, blue_mapping);

            RGBmapping.combined = true;

            RGB_win = findWindow(RGB_win_id);
            updatePreviewWin(RGB_win);

            if (par.remove_stars_stretched.val && RGBmapping.stretched) {
                  RGB_stars_HT_win = removeStars(RGB_win, false, true, null, null, par.unscreen_stars.val);
                  if (!is_luminance_images) {
                        // use starless RGB image as mask
                        ColorEnsureMask(RGB_win_id, true, true);
                  }
            }

            RGB_win.show();
            addScriptWindow(RGB_win_id);

      } else {
            // We have both RGB and narrowband, do custom mapping on individual channels.
            // Here we just create different combined channels in linear format and
            // then continue as normal RGB processing.
            // If we have multiple images in mapping we use linear fit to match
            // them before PixelMath.
            addProcessingStep("RGB and narrowband mapping, create LRGB channel images and continue with RGB workflow");
            if (par.custom_L_mapping.val != '') {
                  luminance_id = mapRGBchannel(L_images, ppar.win_prefix + "Integration_L", luminance_mapping, true);
                  updatePreviewId(luminance_id);
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
            var new_id = ensure_win_prefix(id + "_map");
            copyWindow(findWindow(id), new_id);
            // crop
            CropImageIf(findWindow(new_id), crop_truncate_amount);
            return new_id;
      } else {
            return id;
      }
}

/* Copy Integration_RGBcolor to Integration_RGB so we do not
 * modify the original image.
 */ 
function mapColorImage()
{
      RGB_win_id = ensure_win_prefix("Integration_RGB");
      copyWindow(findWindow(RGBcolor_id), RGB_win_id);
      RGB_win = ImageWindow.windowById(RGB_win_id);
      // crop
      CropImageIf(RGB_win, crop_truncate_amount);
      RGB_win.show();
}

/* Map RGB channels. We do PixelMath mapping here if we have narrowband images.
 */
function mapLRGBchannels(RGBmapping)
{
      var rgb = R_id != null || G_id != null || B_id != null;
      narrowband = H_id != null || S_id != null || O_id != null || par.force_narrowband_mapping.val;
      var custom_mapping = isCustomMapping(narrowband);

      if (rgb && narrowband && !par.force_narrowband_mapping.val) {
            addProcessingStep("There are both RGB and narrowband data, processing as RGB image");
            narrowband = false;
      }
      if (narrowband) {
            addProcessingStep("Processing as narrowband image");
      }

      addProcessingStepAndStatusInfo("Map LRGB channels");

      if (custom_mapping) {
            addProcessingStep("Narrowband files, use custom mapping");
            RGBmapping = customMapping(RGBmapping, null);

      } else {
            addProcessingStep("Normal RGB processing");

            /* Make a copy of original windows. */
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

      addProcessingStepAndStatusInfo("Star alignment reference image " + refImage);
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
      P.outputDirectory = outputRootDir + AutoOutputDir;
      P.referenceImage = refImage;
      P.referenceIsFile = true;
      P.targets = targets;
      P.overwriteExistingFiles = true;

      P.executeGlobal();

      alignedFiles = fileNamesFromOutputData(P.outputData);

      addProcessingStep("runStarAlignment, " + alignedFiles.length + " files");
      console.writeln("output[0] " + alignedFiles[0]);

      star_alignment_image = refImage;

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
            addProcessingStep("No files for local normalization for filter " + filter);
            return;
      }

      addProcessingStepAndStatusInfo("Local normalization, filter " + filter + ", reference image " + refImage);

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
            addProcessingStep("Using existing local normalization files");
            return;
      }


      var P = new LocalNormalization;
      var scale = getLocalNormalizationScale(refImage, P.scale);
      if (scale != 0) {
            P.scale = scale;
      }
      P.referencePathOrViewId = refImage;
      if (pixinsight_version_num >= 1080900) {
            P.referenceIsView = false;
      }
      P.targetItems = targets;            // [ enabled, image ]
      P.outputDirectory = outputRootDir + AutoOutputDir;
      P.overwriteExistingFiles = true;

      P.executeGlobal();
}

function runLinearFit(refViewId, targetId)
{
      addProcessingStepAndStatusInfo("Run linear fit on " + targetId + " using " + refViewId + " as reference");
      if (refViewId == null || targetId == null) {
            throwFatalError("No image for linear fit, maybe some previous step like star alignment failed");
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
      addProcessingStepAndStatusInfo("Run DrizzleIntegration");

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

      closeOneWindow(P.weightImageId);

      var new_name = windowRename(P.integrationImageId, ppar.win_prefix + "Integration_" + name);
      updatePreviewId(new_name);
      //addScriptWindow(new_name);
      return new_name;
}

function getRejectionAlgorithm(numimages)
{
      if (par.use_clipping.val == 'None') {
            addProcessingStep("Using no rejection");
            return ImageIntegration.prototype.NoRejection;
      } else if (par.use_clipping.val == 'Percentile') {
            addProcessingStep("Using Percentile clip for rejection");
            return ImageIntegration.prototype.PercentileClip;
      } else if (par.use_clipping.val == 'Sigma') {
            addProcessingStep("Using Sigma clip for rejection");
            return ImageIntegration.prototype.SigmaClip;
      } else if (par.use_clipping.val == 'Winsorised sigma') {
            addProcessingStep("Using Winsorised sigma clip for rejection");
            return ImageIntegration.prototype.WinsorizedSigmaClip;
      } else if (par.use_clipping.val == 'Averaged sigma') {
            addProcessingStep("Using Averaged sigma clip for rejection");
            return ImageIntegration.prototype.AveragedSigmaClip;
      } else if (par.use_clipping.val == 'Linear fit') {
            addProcessingStep("Using Linear fit clip for rejection");
            return ImageIntegration.prototype.LinearFit;
      } else if (par.use_clipping.val == 'ESD') {
            addProcessingStep("Using ESD clip for rejection");
            return ImageIntegration.prototype.Rejection_ESD;
      } else if (par.use_clipping.val == 'Auto2') {
            /* In theory these should be good choices but sometime give much more uneven
             * highlights than Sigma.
             */
            if (numimages < 8) {
                  addProcessingStep("Auto2 using Percentile clip for rejection");
                  return ImageIntegration.prototype.PercentileClip;
            } else if (numimages <= 10) {
                  addProcessingStep("Auto2 using Sigma clip for rejection");
                  return ImageIntegration.prototype.SigmaClip;
            } else if (numimages < 20) {
                  addProcessingStep("Auto2 using Winsorised sigma clip for rejection");
                  return ImageIntegration.prototype.WinsorizedSigmaClip;
            } else if (numimages < 25 || ImageIntegration.prototype.Rejection_ESD === undefined) {
                  addProcessingStep("Auto2 using Linear fit clip for rejection");
                  return ImageIntegration.prototype.LinearFit;
            } else {
                  addProcessingStep("Auto2 using ESD clip for rejection");
                  return ImageIntegration.prototype.Rejection_ESD;
            }
      } else {
            /* par.use_clipping.val == 'Auto1' */
            if (numimages < 8) {
                  addProcessingStep("Auto1 using Percentile clip for rejection");
                  return ImageIntegration.prototype.PercentileClip;
            } else {
                  addProcessingStep("Auto1 using Sigma clip for rejection");
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
            addProcessingStep("Using SSWEIGHT for ImageIntegration weightMode");
            P.weightMode = ImageIntegration.prototype.KeywordWeight;
            P.weightKeyword = "SSWEIGHT";
      }
      if (local_normalization) {
            addProcessingStep("Using LocalNormalization for ImageIntegration normalization");
            P.normalization = ImageIntegration.prototype.LocalNormalization;
      } else if (par.imageintegration_normalization.val == 'Additive') {
            addProcessingStep("Using AdditiveWithScaling for ImageIntegration normalization");
            P.normalization = ImageIntegration.prototype.AdditiveWithScaling;
      } else if (par.imageintegration_normalization.val == 'Adaptive') {
            addProcessingStep("Using AdaptiveNormalization for ImageIntegration normalization");
            P.normalization = ImageIntegration.prototype.AdaptiveNormalization;
      } else {
            addProcessingStep("Using NoNormalization for ImageIntegration normalization");
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

      closeOneWindow(P.highRejectionMapImageId);
      closeOneWindow(P.lowRejectionMapImageId);
      closeOneWindow(P.slopeMapImageId);

      if (par.use_drizzle.val && name != 'LDD') {
            updatePreviewId(P.integrationImageId);
            closeOneWindow(P.integrationImageId);
            return runDrizzleIntegration(images, name, local_normalization);
      } else {
            var new_name = windowRename(P.integrationImageId, ppar.win_prefix + "Integration_" + name);
            console.writeln("runImageIntegrationEx completed, new name " + new_name);
            updatePreviewId(new_name);
            return new_name
      }
}

function runImageIntegrationNormalized(images, best_image, name)
{
      addProcessingStepAndStatusInfo("ImageIntegration with LocalNormalization");

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
      addProcessingStepAndStatusInfo("Image " + name + " integration on " + images.length + " files");

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
      closeOneWindow(P.lowRejectionMapImageId);
      closeOneWindow(P.highRejectionMapImageId);
      closeOneWindow(P.slopeMapImageId);
      // KEEP (P.integrationImageId);

      //console.writeln("Integration for CROP complete, \n", JSON.stringify(P, null, 2));

      //   console.writeln("highRejectionMapImageId ", P.highRejectionMapImageId)
      //   console.writeln("slopeMapImageId ", P.slopeMapImageId) 
      //   console.writeln("integrationImageId ", P.integrationImageId)
      //   console.writeln("lowRejectionMapImageId ", P.lowRejectionMapImageId)

      //console.writeln("Rename '",P.integrationImageId,"' to ",ppar.win_prefix + "LowRejectionMap_ALL")
      var new_name = windowRename(P.integrationImageId, ppar.win_prefix + "LowRejectionMap_ALL");

      return new_name
      
}

/* Do run ABE so just make copy of the source window as
 * is done by AutomaticBackgroundExtractor.
 */
function noABEcopyWin(win)
{
      var new_win_id = win.mainView.id;
      var fix_postfix = "_map";
      if (new_win_id.endsWith(fix_postfix)) {
            new_win_id = new_win_id.substring(0, new_win_id.length - fix_postfix.length);
      }
      var noABE_id = ensure_win_prefix(new_win_id + "_noABE");
      addProcessingStep("No ABE for " + win.mainView.id);
      addScriptWindow(noABE_id);
      copyWindow(win, noABE_id);
      return noABE_id;
}

function runABEex(win, replaceTarget, postfix)
{
      if (replaceTarget) {
            addProcessingStepAndStatusInfo("Run ABE on image " + win.mainView.id);
            var ABE_id = win.mainView.id;
      } else {
            var ABE_id = ensure_win_prefix(win.mainView.id + postfix);
            addProcessingStepAndStatusInfo("Run ABE from image " + win.mainView.id + ", target image " + ABE_id);
      }

      var P = new AutomaticBackgroundExtractor;
      P.correctedImageId = ABE_id;
      P.replaceTarget = replaceTarget;
      P.discardModel = true;
      P.targetCorrection = AutomaticBackgroundExtractor.prototype.Subtract;

      if (ai_debug) {
            console.writeln(P.toSource());
      }

      win.mainView.beginProcess(UndoFlag_NoSwapFile);

      P.executeOn(win.mainView, false);

      win.mainView.endProcess();

      addScriptWindow(ABE_id);

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
            throwFatalError("No image for ABE, maybe some previous step like star alignment failed");
      }
      var id_win = ImageWindow.windowById(id);
      runABEex(id_win, true, "");
      return id;
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
            return true;  
      } else if (par.STF_linking.val == 'Unlinked') {
            return false;  
      } else {
            // auto, use default
            var rgbLinked = true;
            if (narrowband) {
                  if (linear_fit_done) {
                        rgbLinked = true;
                  } else {
                        rgbLinked = false;
                  }
            } else if (iscolor) {
                  rgbLinked = false;
            }
            return rgbLinked;
      }
}

function runHistogramTransformSTFex(ABE_win, stf_to_use, iscolor, targetBackground, silent)
{
      if (!silent) {
            addProcessingStep("Run histogram transform on " + ABE_win.mainView.id + " based on autostretch");
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
      return runHistogramTransformSTFex(ABE_win, stf_to_use, iscolor, targetBackground, false);
}

function runHistogramTransformMaskedStretch(ABE_win)
{
      addProcessingStepAndStatusInfo("Run histogram transform on " + ABE_win.mainView.id + " using MaskedStretch");

      var P = new MaskedStretch;
      P.targetBackground = par.MaskedStretch_targetBackground.val;

      ABE_win.mainView.beginProcess(UndoFlag_NoSwapFile);

      console.writeln("Execute MaskedStretch on " + ABE_win.mainView.id);
      P.executeOn(ABE_win.mainView);

      ABE_win.mainView.endProcess();
}

function runHistogramTransformArcsinhStretch(ABE_win)
{
      addProcessingStepAndStatusInfo("Run histogram transform on " + ABE_win.mainView.id + " using ArcsinhStretch");

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

function runHistogramTransformHyperbolicIterations(ABE_win, iscolor)
{
      addProcessingStepAndStatusInfo("Run histogram transform on " + ABE_win.mainView.id + " using Generalized Hyperbolic Stretching");
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
            var window_updated = runHistogramTransformHyperbolic(res, iscolor);
            if (window_updated) {
                  updatePreviewWin(res.win);
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
                  updatePreviewWin(res.win);
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

      addProcessingStepAndStatusInfo("Run histogram stretch on " + ABE_win.mainView.id + " using HistogramTransform iterations");

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

function forceNewHistogram(target_win)
{
      try {
            if (!target_win.mainView.deleteProperty("Histogram16")) {
                  console.writeln("Failed to delete property Histogram16");
            }
      } catch(err) {
            console.writeln("Failed to delete property Histogram16 : " + err);
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

      var new_win = copyWindowEx(res.win, "temp_stretchHistogramTransform", true);

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
            forceCloseOneWindow(new_win);
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
            forceCloseOneWindow(res.win);
            // rename new as old
            windowRename(new_win.mainView.id, image_id);
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

function runHistogramTransformHyperbolic(res, iscolor)
{
      var iteration_number = res.iteration_number;
      var image_id = res.win.mainView.id;

      console.writeln("--");
      console.writeln("Iteration " + iteration_number);
      console.writeln("Skipped " + res.skipped);

      var iteration_Hyperbolic_D_val = res.Hyperbolic_D_val - (iteration_number - 1) / 2;
      var Hyperbolic_b_val = res.Hyperbolic_b_val;

      /* expect D to be ln(D+1) as in GeneralizedHyperbolicStretch script. */
      var Hyperbolic_D_val = Math.exp(iteration_Hyperbolic_D_val) - 1.0;

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

      var new_win = findWindow(P.newImageId);

      // copyWindowEx(new_win, image_id+"_iteration_"+iteration_number+"_D_"+parseInt(Hyperbolic_D_val)+"_b_"+parseInt(Hyperbolic_b_val), true);

      var median = findSymmetryPoint(new_win, 50);
      var peak_val = findHistogramPeak(new_win).normalizedPeakCol;
      console.writeln("peak_val " + peak_val + ", median "+ median);

      var window_updated = false;

      if (median >= 0.5) {
            // We are past the median limit value, ignore this iteration and keep old image
            console.writeln("We are past median limit of 0.5, skip this iteration, median=" + median);
            closeOneWindow(P.newImageId);
            res.skipped++;
      } else if (peak_val > par.Hyperbolic_target.val + 0.1 * par.Hyperbolic_target.val) {
            // We are past the target value, ignore this iteration and keep old image
            console.writeln("We are past the target, skip this iteration, current=" + peak_val + ", target=" + par.Hyperbolic_target.val);
            closeOneWindow(P.newImageId);
            res.skipped++;
      } else if (peak_val < res.peak_val) {
            console.writeln("Histogram peak moved to left from " + res.peak_val + " to " + peak_val + ", skip this iteration");
            closeOneWindow(P.newImageId);
            res.skipped++;
      } else {
            // we are close enough, we are done
            console.writeln("Stretch completed, we are close enough, current=" + peak_val + ", target=" + par.Hyperbolic_target.val);
            res.completed = true;
            window_updated = true;
            // find new window and copy keywords
            setTargetFITSKeywordsForPixelmath(new_win, getTargetFITSKeywordsForPixelmath(res.win));
            // close old image
            closeOneWindow(image_id);
            // rename new as old
            windowRename(P.newImageId, image_id);
            res.win = new_win;
            res.peak_val = peak_val;
      }
      return window_updated;
}

function runHistogramTransform(ABE_win, stf_to_use, iscolor, type)
{
      if (!run_HT) {
            addProcessingStep("Do not run histogram transform on " + ABE_win.mainView.id);
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

      } else if (image_stretching == 'Hyperbolic') {
            ABE_win = runHistogramTransformHyperbolicIterations(ABE_win, iscolor);
            
      } else if (image_stretching == 'Histogram stretch') {
            ABE_win = stretchHistogramTransformIterations(ABE_win, iscolor);
            
      } else {
            throwFatalError("Bad image stretching value " + image_stretching + " with type " + type);
      }
      if (par.shadow_clip.val) {
            clipShadows(ABE_win, shadow_clip_value);
      }
      updatePreviewWin(ABE_win);
      return { win: ABE_win, stf: stf };
}

function runACDNRReduceNoise(imgWin, maskWin)
{
      if (par.ACDNR_noise_reduction.val == 0.0) {
            return;
      }
      addProcessingStepAndStatusInfo("ACDNR noise reduction on " + imgWin.mainView.id + " using mask " + maskWin.mainView.id);

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

      updatePreviewWin(imgWin);
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
                  throwFatalError("Bad noise reduction value " + strength);
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
                  throwFatalError("Bad noise reduction value " + strength);
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
            throwFatalError("NoiseXTerminator failed");
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
      if (par.skip_noise_reduction.val || par.noise_reduction_strength.val == 0) {
            return;
      }

      if (par.use_noisexterminator.val) {
            addProcessingStepAndStatusInfo("Noise reduction using NoiseXTerminator on " + imgWin.mainView.id);
      } else {
            addProcessingStepAndStatusInfo("Noise reduction on " + imgWin.mainView.id + " using mask " + maskWin.mainView.id);
      }
      runNoiseReductionEx(imgWin, maskWin, par.noise_reduction_strength.val, linear);
}

function runColorReduceNoise(imgWin)
{
      addProcessingStepAndStatusInfo("Color noise reduction on " + imgWin.mainView.id);

      var P = new TGVDenoise;
      P.rgbkMode = false;
      P.filterEnabledL = false;
      P.filterEnabledC = true;
      P.supportEnabled = true;

      imgWin.mainView.beginProcess(UndoFlag_NoSwapFile);

      /* Remove color noise from the whole image. */
      P.executeOn(imgWin.mainView, false);

      imgWin.mainView.endProcess();

      updatePreviewWin(imgWin);
}

function starReduceNoise(imgWin)
{
      addProcessingStepAndStatusInfo("Star noise reduction on " + imgWin.mainView.id);

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
      addProcessingStepAndStatusInfo("Background neutralization on " + imgView.id);

      var P = new BackgroundNeutralization;

      imgView.beginProcess(UndoFlag_NoSwapFile);

      P.executeOn(imgView, false);

      imgView.endProcess();

      updatePreviewId(imgView.id);
}

function runColorCalibration(imgView)
{
      if (narrowband) {
            addProcessingStep("No color calibration for narrowband");
            return;
      }
      if (par.skip_color_calibration.val) {
            addProcessingStep("No color calibration was selected");
            return;
      }
      try {
            addProcessingStepAndStatusInfo("Color calibration on " + imgView.id);

            var P = new ColorCalibration;

            imgView.beginProcess(UndoFlag_NoSwapFile);

            P.executeOn(imgView, false);

            imgView.endProcess();
            updatePreviewId(imgView.id);
      } catch(err) {
            console.criticalln("Color calibration failed");
            console.criticalln(err);
            addProcessingStep("Maybe filter files or file format were not recognized correctly");
            throwFatalError("Color calibration failed");
      }
}

function runColorSaturation(imgWin, maskWin)
{
      addProcessingStepAndStatusInfo("Color saturation on " + imgWin.mainView.id + " using mask " + maskWin.mainView.id);
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

      updatePreviewWin(imgWin);
}

function runCurvesTransformationSaturation(imgWin, maskWin)
{
      addProcessingStepAndStatusInfo("Curves transformation for saturation on " + imgWin.mainView.id + " using mask " + maskWin.mainView.id);

      var P = new CurvesTransformation;
      P.S = [ // x, y
            [0.00000, 0.00000],
            [0.68734, 0.83204],
            [1.00000, 1.00000]
      ];

      imgWin.mainView.beginProcess(UndoFlag_NoSwapFile);

      /* Saturate only light parts of the image. */
      setMaskChecked(imgWin, maskWin);
      imgWin.maskInverted = false;
      
      P.executeOn(imgWin.mainView, false);

      imgWin.removeMask();

      imgWin.mainView.endProcess();

      updatePreviewWin(imgWin);
}

function increaseSaturation(imgWin, maskWin)
{
      //runColorSaturation(imgWin, maskWin);
      runCurvesTransformationSaturation(imgWin, maskWin);
}

function runLRGBCombination(RGB_id, L_id)
{
      var targetWin = copyWindow(
                        ImageWindow.windowById(RGB_id), 
                        ensure_win_prefix(RGB_id.replace("RGB", "LRGB")));
      var RGBimgView = targetWin.mainView;
      addProcessingStepAndStatusInfo("LRGB combination of " + RGB_id + " and luminance image " + L_id + " into " + RGBimgView.id);
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

      updatePreviewId(RGBimgView.id);

      return RGBimgView.id;
}

function runSCNR(RGBimgView, fixing_stars)
{
      if (!fixing_stars) {
            addProcessingStepAndStatusInfo("SCNR on " + RGBimgView.id);
      }
      var P = new SCNR;
      if (narrowband && par.leave_some_green.val && !fixing_stars) {
            P.amount = 0.50;
            addProcessingStep("Run SCNR using amount " + P.amount + " to leave some green color");
      } else {
            P.amount = 1.00;
      }

      RGBimgView.beginProcess(UndoFlag_NoSwapFile);

      P.executeOn(RGBimgView, false);

      RGBimgView.endProcess();

      updatePreviewId(RGBimgView.id);
}

// Run hue shift on narrowband image to enhance orange.
function narrowbandOrangeHueShift(imgView)
{
      addProcessingStepAndStatusInfo("Hue shift on " + imgView.id);
      
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

      updatePreviewId(imgView.id);
}

function runMultiscaleLinearTransformSharpen(imgWin, maskWin)
{
      if (maskWin != null) {
            addProcessingStepAndStatusInfo("Sharpening on " + imgWin.mainView.id + " using mask " + maskWin.mainView.id);
      } else {
            addProcessingStepAndStatusInfo("Sharpening on " + imgWin.mainView.id);
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

      updatePreviewWin(imgWin);
}

function getOptionalUniqueFilenamePart()
{
      if (par.unique_file_names.val) {
            return format( "_%04d%02d%02d_%02d%02d%02d",
                        processingDate.getFullYear(), processingDate.getMonth() + 1, processingDate.getDate(),
                        processingDate.getHours(), processingDate.getMinutes(), processingDate.getSeconds());
      } else {
            return "";
      }
}

function ensureDialogFilePath(names)
{
      if (outputRootDir == "") {
            var gdd = new GetDirectoryDialog;
            gdd.caption = "Select Save Directory for " + names;
            gdd.initialPath = ppar.lastDir;
            console.noteln(gdd.caption);
            if (!gdd.execute()) {
                  console.writeln("No path for " + names + ', nothing written');
                  return 0;
            }
            saveLastDir(gdd.directory);
            outputRootDir = gdd.directory;
            if (outputRootDir != "") {
                  outputRootDir = ensurePathEndSlash(outputRootDir);
            }
            console.writeln("ensureDialogFilePath, set outputRootDir ", outputRootDir);
            return 1;
      } else {
            return 2;
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
      logfname = basename + getOptionalUniqueFilenamePart() + ".log";
      if (par.win_prefix_to_log_files.val) {
            logfname = ppar.win_prefix + logfname;
      }

      if (!write_processing_log_file) {
            console.writeln(basename + " log file not written.");
            return;
      }

      var dialogRet = ensureDialogFilePath(basename + ".log");
      if (dialogRet == 0) {
            // Canceled, do not save
            return;
      }

      if (dialogRet == 1) {
            // User gave explicit directory
            var processedPath = outputRootDir;
      } else {
            // Use defaults
            var processedPath = combinePath(outputRootDir, AutoProcessedDir);
      }
      processedPath = ensurePathEndSlash(processedPath);

      run_results.processing_steps_file = processedPath + logfname;

      console.writeln("Write processing steps to " + run_results.processing_steps_file);


      var file = new File();
      file.createForWriting(run_results.processing_steps_file);

      file.write(console.endLog());
      file.outTextLn("======================================");
      if (lightFileNames != null) {
            file.outTextLn("Dialog files:");
            for (var i = 0; i < lightFileNames.length; i++) {
                  file.outTextLn(lightFileNames[i]);
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

// Find window and optionally search without a prefix
function findWindowCheckBaseNameIf(id, check_base_name)
{
      var win = findWindow(ppar.win_prefix + id);
      if (win == null && check_base_name && ppar.win_prefix != "") {
            // Try to find without prefix so we can autocontinue
            // from default run but will have new output
            // file names.
            win = findWindow(id);
      }
      return win;
}

// Find window id and optionally search without a prefix
function findWindowIdCheckBaseNameIf(name, check_base_name)
{
      var id = findWindowId(ppar.win_prefix + name);
      if (id == null && check_base_name && ppar.win_prefix != "") {
            // Try to find without prefix so we can autocontinue
            // from default run but will have new output
            // file names.
            id = findWindowId(name);
            autocontinue_prefix = "";
      } else {
            autocontinue_prefix = ppar.win_prefix;
      }
      return id;
}

// Find window with a prefix. If not found and check_base is true
// then try without prefix
function findWindowNoPrefixIf(id, check_base)
{
      var win = findWindow(id);
      if (win == null && check_base && ppar.win_prefix != '' && id.startsWith(ppar.win_prefix)) {
            // Try without prefix
            var win = findWindow(id.substring(ppar.win_prefix.length));
      }
      return win;
}

function findProcessedImages(check_base_name)
{
      L_id = findWindowIdCheckBaseNameIf("Integration_L", check_base_name);
      R_id = findWindowIdCheckBaseNameIf("Integration_R", check_base_name);
      G_id = findWindowIdCheckBaseNameIf("Integration_G", check_base_name);
      B_id = findWindowIdCheckBaseNameIf("Integration_B", check_base_name);
      H_id = findWindowIdCheckBaseNameIf("Integration_H", check_base_name);
      S_id = findWindowIdCheckBaseNameIf("Integration_S", check_base_name);
      O_id = findWindowIdCheckBaseNameIf("Integration_O", check_base_name);
      RGBcolor_id = findWindowIdCheckBaseNameIf("Integration_RGBcolor", check_base_name);
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

      addStatusInfo("Debayer " + fileNames.length + " images");
      addProcessingStep("debayerImages, fileNames[0] " + fileNames[0]);

      var P = new Debayer;
      P.cfaPattern = debayerPattern_enums[debayerPattern_values.indexOf(par.debayerPattern.val)];
      P.targetItems = fileNamesToEnabledPath(fileNames);
      P.outputDirectory = outputRootDir + AutoOutputDir;
      P.overwriteExistingFiles = true;

      try {
            succ = P.executeGlobal();
      } catch(err) {
            succ = false;
            console.criticalln(err);
      }

      if (!succ) {
            console.criticalln("Debayer failed");
            addProcessingStep("Error, maybe debayer pattern was not correctly selected");
            throwFatalError("Debayer failed");
      }

      return fileNamesFromOutputData(P.outputFileData);
}

// Extract channels from color/OSC/DSLR files. As a result
// we get a new file list with channel files.
function extractChannels(fileNames)
{
      var newFileNames = [];
      var outputDir = outputRootDir + AutoOutputDir;
      var postfix;
      var outputExtension = ".xisf";
      if (par.extract_channel_mapping.val == 'LRGB') {
            var channel_map = "RGB";
      } else {
            var channel_map = par.extract_channel_mapping.val;
      }

      addStatusInfo("Extract channels, " + par.extract_channel_mapping.val);
      addProcessingStep("extractChannels, " + par.extract_channel_mapping.val + ", fileNames[0] " + fileNames[0]);
      
      for (var i = 0; i < fileNames.length; i++) {
            // Open source image window from a file
            var imageWindows = ImageWindow.open(fileNames[i]);
            if (imageWindows.length != 1) {
                  throwFatalError("*** extractChannels Error: imageWindows.length: " + imageWindows.length);
            }
            var imageWindow = imageWindows[0];
            if (imageWindow == null) {
                  throwFatalError("*** extractChannels Error: Can't read file: " + fileNames[i]);
            }

            // Extract channels and save each channel to a separate file.
            if (par.extract_channel_mapping.val == 'LRGB') {
                  var targetWindow = extractLchannel(imageWindow);
                  var filePath = generateNewFileName(fileNames[i], outputDir, "_L", outputExtension);
                  setFITSKeyword(targetWindow, "FILTER", "L", "AutoIntegrate extracted channel")
                  // Save window
                  if (!writeImage(filePath, targetWindow)) {
                        throwFatalError("*** extractChannels Error: Can't write output image: " + filePath);
                  }
                  newFileNames[newFileNames.length] = filePath;
                  forceCloseOneWindow(targetWindow);
            }

            var rId = extractRGBchannel(imageWindow.mainView.id, 'R');
            var rWin = findWindow(rId);
            var filePath = generateNewFileName(fileNames[i], outputDir, "_" + channel_map[0], outputExtension);
            setFITSKeyword(rWin, "FILTER", channel_map[0], "AutoIntegrate extracted channel")
            if (!writeImage(filePath, rWin)) {
                  throwFatalError("*** extractChannels Error: Can't write output image: " + filePath);
            }
            newFileNames[newFileNames.length] = filePath;
            forceCloseOneWindow(rWin);

            var gId = extractRGBchannel(imageWindow.mainView.id, 'G');
            var gWin = findWindow(gId);
            var filePath = generateNewFileName(fileNames[i], outputDir, "_" + channel_map[1], outputExtension);
            setFITSKeyword(gWin, "FILTER", channel_map[1], "AutoIntegrate extracted channel")
            if (!writeImage(filePath, gWin)) {
                  throwFatalError("*** extractChannels Error: Can't write output image: " + filePath);
            }
            newFileNames[newFileNames.length] = filePath;
            forceCloseOneWindow(gWin);

            var bId = extractRGBchannel(imageWindow.mainView.id, 'B');
            var bWin = findWindow(bId);
            var filePath = generateNewFileName(fileNames[i], outputDir, "_" + channel_map[2], outputExtension);
            setFITSKeyword(bWin, "FILTER", channel_map[2], "AutoIntegrate extracted channel")
            if (!writeImage(filePath, bWin)) {
                  throwFatalError("*** extractChannels Error: Can't write output image: " + filePath);
            }
            newFileNames[newFileNames.length] = filePath;
            forceCloseOneWindow(bWin);

            // Close window
            forceCloseOneWindow(imageWindow);
      }
      return newFileNames;
}

function findStartImages(auto_continue, check_base_name)
{
      /* Check if we have manually done histogram transformation. */
      L_HT_win = findWindowCheckBaseNameIf("L_HT", check_base_name);
      RGB_HT_win = findWindowCheckBaseNameIf("RGB_HT", check_base_name);

      /* Check if we have manual background extracted files. */
      L_BE_win = findWindowCheckBaseNameIf("Integration_L_DBE", check_base_name);
      R_BE_win = findWindowCheckBaseNameIf("Integration_R_DBE", check_base_name);
      G_BE_win = findWindowCheckBaseNameIf("Integration_G_DBE", check_base_name);
      B_BE_win = findWindowCheckBaseNameIf("Integration_B_DBE", check_base_name);
      H_BE_win = findWindowCheckBaseNameIf("Integration_H_DBE", check_base_name);
      S_BE_win = findWindowCheckBaseNameIf("Integration_S_DBE", check_base_name);
      O_BE_win = findWindowCheckBaseNameIf("Integration_O_DBE", check_base_name);
      RGB_BE_win = findWindowCheckBaseNameIf("Integration_RGB_DBE", check_base_name);

      findProcessedImages(check_base_name);

      if (is_extra_option() || is_narrowband_option()) {
            for (var i = 0; i < final_windows.length; i++) {
                  final_win = findWindowNoPrefixIf(final_windows[i], check_base_name);
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
            addProcessingStep("Final image " + final_win.mainView.id);
            preview_id = final_win.mainView.id;
            preprocessed_images = start_images.FINAL;
      } else if (checkAutoCont(L_HT_win) && checkAutoCont(RGB_HT_win)) {      /* L,RGB HistogramTransformation */
            addProcessingStep("L,RGB HistogramTransformation");
            preview_id = L_HT_win.mainView.id;
            preprocessed_images = start_images.L_RGB_HT;
      } else if (checkAutoCont(RGB_HT_win)) {                                 /* RGB (color) HistogramTransformation */
            addProcessingStep("RGB (color) HistogramTransformation " + RGB_HT_win.mainView.id);
            preview_id = RGB_HT_win.mainView.id;
            preprocessed_images = start_images.RGB_HT;
      } else if (checkAutoCont(L_BE_win) && checkAutoCont(RGB_BE_win)) {      /* L,RGB background extracted */
            addProcessingStep("L,RGB background extracted");
            preview_id = L_BE_win.mainView.id;
            preprocessed_images = start_images.L_RGB_BE;
      } else if (checkAutoCont(RGB_BE_win)) {                                 /* RGB (color) background extracted */
            addProcessingStep("RGB (color) background extracted " + RGB_BE_win.mainView.id);
            preview_id = RGB_BE_win.mainView.id;
            preprocessed_images = start_images.RGB_BE;
      } else if ((checkAutoCont(R_BE_win) && checkAutoCont(G_BE_win) && checkAutoCont(B_BE_win)) ||
                  (checkAutoCont(H_BE_win) && checkAutoCont(O_BE_win))) {     /* L,R,G,B background extracted */
            addProcessingStep("L,R,G,B background extracted");
            preview_id = checkAutoCont(R_BE_win) ? R_BE_win.mainView.id : H_BE_win.mainView.id;
            preprocessed_images = start_images.L_R_G_B_BE;
            narrowband = checkAutoCont(H_BE_win) || checkAutoCont(O_BE_win);
      } else if (RGBcolor_id != null 
                  && H_id == null && O_id == null && L_id == null) {          /* RGB (color) integrated image */
            addProcessingStep("RGB (color) integrated image " + RGBcolor_id);
            preview_id = RGBcolor_id;
            var check_name = ppar.win_prefix + "Integration_RGB_ABE";
            if (auto_continue && findWindow(check_name)) {
                  throwFatalError("Cannot start AutoContinue, processed image " + check_name + " already exists. " +
                                    "Close previously processed images or use a different window prefix.")
            }
            var check_name = ppar.win_prefix + "Integration_RGB_noABE";
            if (auto_continue && findWindow(check_name)) {
                  throwFatalError("Cannot start AutoContinue, processed image " + check_name + " already exists. " +
                                    "Close previously processed images or use a different window prefix.")
            }
            checkAutoCont(findWindow(RGBcolor_id));
            preprocessed_images = start_images.RGB_COLOR;
      } else if ((R_id != null && G_id != null && B_id != null) ||
                  (H_id != null && O_id != null)) {                           /* L,R,G,B integrated images */
            addProcessingStep("L,R,G,B integrated images");
            preview_id = R_id != null ? R_id : H_id;
            var check_name = ppar.win_prefix + "Integration_RGB";
            if (auto_continue && findWindow(check_name)) {
                  throwFatalError("Cannot start AutoContinue, processed image " + check_name + " already exists. " +
                                    "Close previously processed images or use a different window prefix.")
            }
            checkAutoCont(findWindow(R_id));
            checkAutoCont(findWindow(H_id));
            narrowband = H_id != null || S_id != null || O_id != null;
            preprocessed_images = start_images.L_R_G_B;
      } else {
            preprocessed_images = start_images.NONE;
      }
      if (preview_id != null && auto_continue) {
            updatePreviewId(preview_id);
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
      return getFileProcessedStatusEx(fileNames, postfix, outputRootDir + AutoOutputDir);
}

function getFileProcessedStatusCalibrated(fileNames, postfix)
{
      return getFileProcessedStatusEx(fileNames, postfix, outputRootDir + AutoCalibratedDir);
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
      addProcessingStepAndStatusInfo("Create channel images");

      final_win = null;
      write_processing_log_file = false;  // do not write the log file if we fail very early

      if (auto_continue) {
            console.writeln("AutoContinue, find start images with prefix");
            preprocessed_images = findStartImages(true, false);
            if (preprocessed_images == start_images.NONE && ppar.win_prefix != "") {
                  console.writeln("AutoContinue, find start images without prefix");
                  preprocessed_images = findStartImages(true, true);
            }
      } else {
            // find old images with prefix
            preprocessed_images = findStartImages(false, false);
      }

      if (auto_continue) {
          if (preprocessed_images == start_images.NONE) {
            addProcessingStep("No preprocessed images found, processing not started!");
            return retval.ERROR;
          }
      } else {
            if (preprocessed_images != start_images.NONE) {
                  addProcessingStep("There are already preprocessed images, processing not started!");
                  addProcessingStep("Close or rename old images before continuing.");
                  return retval.ERROR;
            }  
      }

      /* Check if we have manually created mask. */
      range_mask_win = null;

      write_processing_log_file = true;

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
            if (par.force_new_mask.val) {
                  closeOneWindow(ppar.win_prefix + "AutoMask");
                  mask_win_id = null;
                  range_mask_win = null;
            } else {
                  /* Check if we already have a mask. It can be from previous run or manually created. */
                  mask_win_id = ppar.win_prefix + "AutoMask";
                  range_mask_win = findWindow(mask_win_id);
            }
      } else {
            /* Open dialog files and run SubframeSelector on them
             * to assigns SSWEIGHT.
             */
            var fileNames;
            if (lightFileNames == null) {
                  lightFileNames = openImageFiles("Light", true, false);
                  addProcessingStep("Get files from dialog");
            }
            if (lightFileNames == null) {
                  write_processing_log_file = false;
                  console.writeln("No files to process");
                  return retval.ERROR;
            }

            updatePreviewFilename(lightFileNames[0]);

            // We keep track of extensions added to the file names
            // If we need to original file names we can substract
            // added extensions.
            var filename_postfix = '';

            if (outputRootDir == "" || pathIsRelative(outputRootDir)) {
                  /* Get path to current directory. */
                  outputRootDir = parseNewOutputDir(lightFileNames[0], outputRootDir);
                  console.writeln("CreateChannelImages, set outputRootDir ", outputRootDir);
            }

            ensureDir(outputRootDir);
            ensureDir(combinePath(outputRootDir, AutoOutputDir));
            ensureDir(combinePath(outputRootDir, AutoProcessedDir));

            var filtered_lights = getFilterFiles(lightFileNames, pages.LIGHTS, '');
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
                  write_processing_log_file = false;
                  customMapping(null, filtered_lights.allfilesarr);
                  write_processing_log_file = true;
            }

            if (par.extract_channels_only.val && par.extract_channel_mapping.val == 'None') {
                  throwFatalError("Extract channels only is selected but Extract channels option is " + par.extract_channel_mapping.val);
            }

            // Run image calibration if we have calibration frames
            var calibrateInfo = calibrateEngine(filtered_lights);
            lightFileNames = calibrateInfo[0];
            filename_postfix = filename_postfix + calibrateInfo[1];
            updatePreviewFilename(lightFileNames[0]);

            if (par.calibrate_only.val) {
                  return(retval.INCOMPLETE);
            }

            if (filename_postfix != '') {
                  // We did run calibration, filter again with calibrated lights
                  var filtered_files = getFilterFiles(lightFileNames, pages.LIGHTS, filename_postfix);
            } else {
                  // Calibration was not run
                  var filtered_files = filtered_lights;
            }
            if (filtered_files.allfilesarr[channels.C].files.length == 0) {
                  is_color_files = false;
            } else {
                  is_color_files = true;
            }

            fileNames = lightFileNames;

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
                        addProcessingStep("No binning for color files");
                  } else {
                        var fileProcessedStatus = getFileProcessedStatus(fileNames, getBinningPostfix());
                        if (fileProcessedStatus.unprocessed.length == 0) {
                              fileNames = fileProcessedStatus.processed;
                        } else {
                              let processedFileNames = runBinningOnLights(fileProcessedStatus.unprocessed, filtered_files);
                              fileNames = processedFileNames.concat(fileProcessedStatus.processed);
                        }
                        filename_postfix = filename_postfix + getBinningPostfix();
                        updatePreviewFilename(fileNames[0]);
                  }
            } else if (par.binning_only.val) {
                  throwFatalError("Binning only set but no binning done, binning " + par.binning.val + " binning resample factor " + par.binning_resample.val);
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
                                    addProcessingStep("run CosmeticCorrection for linear defect file group " + i + ", " + fileProcessedStatus.unprocessed.length + " files");
                                    let processedFileNames = runCosmeticCorrection(fileProcessedStatus.unprocessed, ccInfo[i].ccDefects, is_color_files);
                                    ccFileNames = ccFileNames.concat(processedFileNames, fileProcessedStatus.processed);
                              }
                        }
                        fileNames = ccFileNames;
                        updatePreviewFilename(fileNames[0]);
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
                        updatePreviewFilename(fileNames[0]);
                  }
                  filename_postfix = filename_postfix + '_cc';
            }

            if (is_color_files && par.debayerPattern.val != 'None' && !skip_early_steps) {
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
                  updatePreviewFilename(fileNames[0]);
            }

            if (is_color_files && par.debayer_only.val) {
                  return retval.INCOMPLETE;
            }

            if (par.extract_channel_mapping.val != 'None' && is_color_files && !skip_early_steps) {
                  // Extract channels from color/OSC/DSLR files. As a result
                  // we get a new file list with channel files.
                  fileNames = extractChannels(fileNames);
                  updatePreviewFilename(fileNames[0]);

                  // We extracted channels, filter again with extracted channels
                  console.writeln("Filter again with extracted channels")
                  filename_postfix = '';
                  is_color_files = false;
                  filtered_files = getFilterFiles(fileNames, pages.LIGHTS, filename_postfix);
                  console.writeln("Continue with mono processing")
            }
            if (par.extract_channels_only.val) {
                  if (par.extract_channel_mapping.val == 'None') {

                  }
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
                  updatePreviewFilename(fileNames[0]);
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
                                    throwFatalError("Incorrect postfix " + names_and_weights.postfix + " returned from runSubframeSelector");
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
            if (par.use_processed_files.val && star_alignment_image != null) {
                  console.writeln("Switching best image to already used star alignment image " + star_alignment_image);
                  best_image = star_alignment_image;
            } else {
                  best_image = retarr[0];
            }
            fileNames = retarr[1];

            setBestImageInTreeBox(parent, parent.treeBox[pages.LIGHTS], best_image, filename_postfix);

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
                        let processedFileNames = runStarAlignment(fileProcessedStatus.unprocessed, best_image);
                        alignedFiles = processedFileNames.concat(fileProcessedStatus.processed);
                  }
                  filename_postfix = filename_postfix + '_r';
                  updatePreviewFilename(alignedFiles[0]);
            } else {
                  alignedFiles = fileNames;
            }

            /* Find files for each L, R, G, B, H, O and S channels, or color files.
             */
            findLRGBchannels(parent, alignedFiles, filename_postfix);

            if (par.start_from_imageintegration.val || par.cropinfo_only.val) {
                  /* We start from *_r.xisf files that are normally in AutoOutput
                   * subdirectory. So in the outputRootDir we replace AutoOutput
                   * with . (dot). In normal setup this will put output files
                   * to a correct AutoProcessed subdirectory.
                   */
                  console.writeln("Option start_from_imageintegration or cropinfo_only selected, fix output directory");
                  console.writeln("Current outputRootDir " + outputRootDir);

                  outputRootDir = outputRootDir.replace("AutoOutput", ".");

                  console.writeln("Fixes outputRootDir " + outputRootDir);
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
                              addProcessingStepAndStatusInfo("Processing as LRGB files");
                        } else {
                              addProcessingStepAndStatusInfo("Processing as RGB files");
                        }
                  } else {
                        addProcessingStepAndStatusInfo("Processing as monochrome files");
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

                        windowShowif(R_id);
                        windowShowif(G_id);
                        windowShowif(B_id);
                        windowShowif(H_id);
                        windowShowif(S_id);
                        windowShowif(O_id);
                  }

            } else {
                  /* We have color files. */
                  addProcessingStepAndStatusInfo("Processing as color files");
                  RGBcolor_id = runImageIntegration(C_images, 'RGBcolor');
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

      var winCopy = copyWindowEx(imgWin, imgWin.mainView.id + "_tmp", true);

      /* Run HistogramTransform based on auto stretch because mask should be non-linear. */
      winCopy = runHistogramTransform(winCopy, null, is_color, 'mask').win;

      /* Create mask.
       */
      var maskWin = newMaskWindow(winCopy, imgWin.mainView.id + "_mask", true);

      forceCloseOneWindow(winCopy);

      return maskWin;
}

/* Ensure we have a mask to be used for LRGB processing. Used for example
 * for noise reduction and sharpening. We use luminance image as
 * mask.
 */
function LRGBEnsureMaskEx(L_id, stretched)
{
      addProcessingStepAndStatusInfo("LRGB ensure mask");

      if (L_id != null) {
            if (range_mask_win != null) {
                  console.writeln("Close old mask " + mask_win_id);
            }
            range_mask_win = null;
            closeOneWindow(mask_win_id);
      }
      if (winIsValid(range_mask_win)) {
            /* We already have a mask. */
            addProcessingStep("Use existing mask " + range_mask_win.mainView.id);
            mask_win = range_mask_win;
      } else {
            var L_win;
            if (L_id != null) {
                  addProcessingStep("Using image " + L_id + " for a mask");
                  L_win = copyWindowEx(ImageWindow.windowById(L_id), ppar.win_prefix + "L_win_mask", true);
                  if (!stretched) {
                        L_win = runHistogramTransform(L_win, null, false, 'mask').win;
                  }
            } else if (preprocessed_images == start_images.L_RGB_HT) {
                  /* We have run HistogramTransformation. */
                  addProcessingStep("Using image " + L_HT_win.mainView.id + " for a mask");
                  L_win = copyWindow(L_HT_win, ppar.win_prefix + "L_win_mask");
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
                  L_win = copyWindowEx(L_win, ppar.win_prefix + "L_win_mask", true);

                  /* Run HistogramTransform based on auto stretch because mask should be non-linear. */
                  L_win = runHistogramTransform(L_win, null, false, 'mask').win;
            }
            /* Create mask.
             */
            mask_win_id = ppar.win_prefix + "AutoMask";
            mask_win = newMaskWindow(L_win, mask_win_id, false);
            closeOneWindow(L_win.mainView.id);
      }
}

function LRGBEnsureMask(L_id)
{
      LRGBEnsureMaskEx(L_id, false);
}

/* Ensure we have mask for color processing. Mask is needed also in non-linear
 * so we do a separate runHistogramTransform here.
 */
function ColorEnsureMask(color_img_id, RGBstretched, force_new_mask)
{
      addProcessingStepAndStatusInfo("Color ensure mask");

      if (force_new_mask) {
            range_mask_win = null;
            closeOneWindow(mask_win_id);
      }

      if (winIsValid(range_mask_win)) {
            /* We already have a mask. */
            addProcessingStep("Use existing mask " + range_mask_win.mainView.id);
            mask_win = range_mask_win;
      } else {
            var color_win = ImageWindow.windowById(color_img_id);
            addProcessingStep("Using image " + color_img_id + " for a mask");
            var color_win_copy = copyWindowEx(color_win, "color_win_mask", true);

            if (!RGBstretched) {
                  /* Run HistogramTransform based on autostretch because mask should be non-linear. */
                  color_win_copy = runHistogramTransform(color_win_copy, null, true, 'mask').win;
            }

            /* Create mask.
             */
            mask_win_id = ppar.win_prefix + "AutoMask";
            mask_win = newMaskWindow(color_win_copy, mask_win_id, false);
            closeOneWindow(color_win_copy.mainView.id);
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
      addProcessingStepAndStatusInfo("Process L image");

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
                        mapped_L_ABE_id = windowRename(mapped_L_ABE_id, L_ABE_id + "_NB");
                        closeOneWindow(L_ABE_id);
                        L_ABE_id = mapped_L_ABE_id;
                  }
            }

            if (!RGBmapping.combined && !RGBmapping.channel_noise_reduction) {
                  /* Noise reduction for L. */
                  luminanceNoiseReduction(ImageWindow.windowById(L_ABE_id), mask_win);
            }

            /* On L image run HistogramTransform  to stretch image to non-linear
            */
            L_ABE_HT_id = ensure_win_prefix(L_ABE_id + "_HT");
            if (!RGBmapping.stretched) {
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
                  var res = runHistogramTransform(
                              copyWindow(ImageWindow.windowById(L_ABE_id), L_ABE_HT_id), 
                              null,
                              false,
                              'L');
                  L_stf = res.stf;
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
                  if (!same_stf_for_all_images) {
                        L_stf = null;
                  }
            } else {
                  copyWindow(ImageWindow.windowById(L_ABE_id), L_ABE_HT_id);
                  same_stf_for_all_images = false;
                  L_stf = null;
            }

            L_ABE_HT_win = ImageWindow.windowById(L_ABE_HT_id);
      }
      if (par.non_linear_noise_reduction.val) {
            runNoiseReduction(L_ABE_HT_win, mask_win, false);
      }
}

/* Run linear fit in L, R, G and B images based on options set by user.
 */
function LinearFitLRGBchannels()
{
      addProcessingStepAndStatusInfo("Linear fit LRGB channels");

      var use_linear_fit = par.use_linear_fit.val;

      if (luminance_id == null && use_linear_fit == 'Luminance') {
            // no luminance
            if (narrowband) {
                  addProcessingStep("No Luminance, no linear fit with narrowband");
                  use_linear_fit = 'No linear fit';
            } else {
                  addProcessingStep("No Luminance, linear fit using R with RGB");
                  use_linear_fit = 'Red';
            }
      }

      /* Check for LinearFit
       */
      if (use_linear_fit == 'Red') {
            /* Use R.
             */
            addProcessingStep("Linear fit using R");
            if (luminance_id != null) {
                  runLinearFit(red_id, luminance_id);
            }
            runLinearFit(red_id, green_id);
            runLinearFit(red_id, blue_id);
      } else if (use_linear_fit == 'Green') {
            /* Use G.
              */
            addProcessingStep("Linear fit using G");
            if (luminance_id != null) {
                  runLinearFit(green_id, luminance_id);
            }
            runLinearFit(green_id, red_id);
            runLinearFit(green_id, blue_id);
      } else if (use_linear_fit == 'Blue') {
            /* Use B.
              */
            addProcessingStep("Linear fit using B");
            if (luminance_id != null) {
                  runLinearFit(blue_id, luminance_id);
            }
            runLinearFit(blue_id, red_id);
            runLinearFit(blue_id, green_id);
      } else if (use_linear_fit == 'Luminance' && luminance_id != null) {
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
function CombineRGBimageEx(target_name, images)
{
      addProcessingStepAndStatusInfo("Combine RGB image");

      if (par.noise_reduction_strength.val > 0 && !narrowband && !par.combined_image_noise_reduction.val) {
            addProcessingStep("Noise reduction on channel images");
            for (var i = 0; i < images.length; i++) {
                  channelNoiseReduction(images[i]);
            }
      }

      /* ChannelCombination
       */
      addProcessingStep("Channel combination using images " + images[0] + "," + images[1] + "," + images[2]);

      var P = new ChannelCombination;
      P.colorSpace = ChannelCombination.prototype.RGB;
      P.channels = [ // enabled, id
            [true, images[0]],
            [true, images[1]],
            [true, images[2]]
      ];

      var model_win = ImageWindow.windowById(images[0]);
      var rgb_name = ppar.win_prefix + target_name;

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
            fatalWindowNameFailed("Failed to create window with name " + rgb_name + ", window name is " + win.mainView.id);
      }
                  
      win.mainView.beginProcess(UndoFlag_NoSwapFile);
      P.executeOn(win.mainView);
      win.mainView.endProcess();

      updatePreviewWin(win);

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
      addScriptWindow(RGB_win_id);
      RGB_win.show();

      return RGB_win;
}

function extractRGBchannel(RGB_id, channel)
{
      addProcessingStepAndStatusInfo("Extract " + channel + " from " + RGB_id);
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
      console.writeln("RGBNB channel mapping " + RGB_id);

      if (channel == 'L') {
            var L_win_copy = copyWindow(findWindow(RGB_id), ensure_win_prefix(RGB_id + "_RGBNBcopy"));
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
                  throwFatalError("Invalid NB mapping " + mapping);
      }
      if (NB_id == null) {
            throwFatalError("Could not find " + mapping + " image for mapping to " + channel);
      }
      if (par.use_RGB_image.val) {
            var sourceChannelId = RGB_id;
            channel_bandwidth = par.R_bandwidth.val;
      } else {
            var sourceChannelId = channelId;
      }

      addProcessingStepAndStatusInfo("Run " + channel + " mapping using " + NB_id + ", " + 
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
      addProcessingStepAndStatusInfo("Create mapped channel images from " + RGB_id);
      var R_mapped = RGBNB_Channel_Mapping(RGB_id, 'R', par.R_bandwidth.val, par.R_mapping.val, par.R_BoostFactor.val);
      var G_mapped = RGBNB_Channel_Mapping(RGB_id, 'G', par.G_bandwidth.val, par.G_mapping.val, par.G_BoostFactor.val);
      var B_mapped = RGBNB_Channel_Mapping(RGB_id, 'B', par.B_bandwidth.val, par.B_mapping.val, par.B_BoostFactor.val);

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

      findProcessedImages(false);

      if (RGBcolor_id == null) {
            throwFatalError("Could not find RGB image");
      }

      var color_win = findWindow(RGBcolor_id);

      checkWinFilePath(color_win);

      var test_win = copyWindow(color_win, ensure_win_prefix(RGBcolor_id + "_test"));

      doRGBNBmapping(test_win.mainView.id);
      
      addProcessingStep("Processing completed");
      writeProcessingSteps(null, true, ppar.win_prefix + "AutoRGBNB");

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
      addProcessingStepAndStatusInfo("Process RGB image, RGB stretched is " + RGBmapping.stretched);

      var RGB_ABE_HT_id;

      if (preprocessed_images == start_images.L_RGB_HT ||
            preprocessed_images == start_images.RGB_HT) 
      {
            /* We already have run HistogramTransformation. */
            RGB_ABE_HT_id = RGB_HT_win.mainView.id;
            addProcessingStep("Start from image " + RGB_ABE_HT_id);
            if (preprocessed_images == start_images.RGB_HT) {
                  ColorEnsureMask(RGB_ABE_HT_id, true, false);
            }
            RGBmapping.stretched = true;
      } else {
            if (preprocessed_images == start_images.L_RGB_BE ||
                preprocessed_images == start_images.RGB_BE) 
            {
                  /* We already have background extracted. */
                  RGB_ABE_id = RGB_BE_win.mainView.id;
                  addProcessingStep("Start from image " + RGB_ABE_id);
            } else {
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

            if ((is_color_files || par.combined_image_noise_reduction.val)
                && !par.non_linear_noise_reduction.val) 
            {
                  /* Optional noise reduction for RGB
                   */
                  runNoiseReduction(
                        ImageWindow.windowById(RGB_ABE_id),
                        mask_win,
                        !RGBmapping.stretched);
            }
            if (!RGBmapping.stretched) {
                  if (par.remove_stars_before_stretch.val) {
                        RGB_stars_win = removeStars(findWindow(RGB_ABE_id), true, true, null, null, par.unscreen_stars.val);
                        windowRename(RGB_stars_win.mainView.id, ppar.win_prefix + "Integration_RGB_stars");
                        if (!is_luminance_images) {
                              // use starless RGB image as mask
                              ColorEnsureMask(RGB_ABE_id, false, true);
                        }
                  }
                  /* On RGB image run HistogramTransform to stretch image to non-linear
                  */
                  RGB_ABE_HT_id = ensure_win_prefix(RGB_ABE_id + "_HT");
                  var stf = runHistogramTransform(
                              copyWindow(
                                    ImageWindow.windowById(RGB_ABE_id), 
                                    RGB_ABE_HT_id), 
                              L_stf,
                              true,
                              'RGB');
                  RGBmapping.stretched = true;

                  if (par.remove_stars_stretched.val) {
                        RGB_stars_HT_win = removeStars(findWindow(RGB_ABE_HT_id), false, true, null, null, par.unscreen_stars.val);
                        if (!is_luminance_images) {
                              // use starless RGB image as mask
                              ColorEnsureMask(RGB_ABE_HT_id, true, true);
                        }
                  }
            } else {
                  RGB_ABE_HT_id = RGB_ABE_id;
            }
      }
      /* If we have non-stretched stars image stretch it.
       */
      if (RGB_stars_win != null)  {
            let stars_id = RGB_ABE_HT_id + "_stars";
            runHistogramTransform(
                  copyWindow(RGB_stars_win, stars_id), 
                  L_stf == null ? stf : L_stf,
                  true,
                  'stars');
            RGB_stars_HT_win = findWindow(stars_id);
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
      if (star_fix_mask_win == null) {
            star_fix_mask_win = findWindow(ppar.win_prefix + "star_fix_mask");
      }
      if (star_fix_mask_win == null) {
            star_fix_mask_win = findWindow(ppar.win_prefix + "AutoStarFixMask");
      }
      if (star_fix_mask_win != null) {
            // Use already created start mask
            console.writeln("Use existing star mask " + star_fix_mask_win.mainView.id);
            star_fix_mask_win_id = star_fix_mask_win.mainView.id;
            return;
      }

      var P = new StarMask;
      P.waveletLayers = 8;
      P.smoothness = 8;

      imgView.beginProcess(UndoFlag_NoSwapFile);
      P.executeOn(imgView, false);
      imgView.endProcess();

      star_fix_mask_win = ImageWindow.activeWindow;

      windowRenameKeepif(star_fix_mask_win.mainView.id, ppar.win_prefix + "AutoStarFixMask", true);
      star_fix_mask_win_id = star_fix_mask_win.mainView.id;

      addProcessingStep("Created star fix mask " + star_fix_mask_win.mainView.id);
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

      addProcessingStepAndStatusInfo("Fix narrowband star color");

      if (use_mask) {
            createStarFixMask(targetWin.mainView);
      }

      invertImage(targetWin.mainView);

      if (use_mask) {
            /* Use mask to change only star colors. */
            addProcessingStep("Using mask " + star_fix_mask_win.mainView.id + " when fixing star colors");
            setMaskChecked(targetWin, star_fix_mask_win);
            targetWin.maskInverted = false;
      }      

      runSCNR(targetWin.mainView, true);

      if (use_mask) {
            targetWin.removeMask();
      }

      invertImage(targetWin.mainView);

      updatePreviewWin(targetWin);
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
      closeOneWindow(ensure_win_prefix("AutoStarMask"));

      let stars_win = removeStars(imgWin, false, true, null, ensure_win_prefix(imgWin.mainView.id + "_stars_tmp"), par.extra_unscreen_stars.val);
      let stars_win_id = ensure_win_prefix(imgWin.mainView.id + "_stars");
      if (stars_win.mainView.id != stars_win_id) {
            console.writeln("extraRemoveStars, rename " + stars_win.mainView.id + " to " + stars_win_id);
            stars_win.mainView.id = stars_win_id;
      }
      stars_win.show();

      var FITSkeywords = getTargetFITSKeywordsForPixelmath(imgWin);
      setTargetFITSKeywordsForPixelmath(stars_win, FITSkeywords);

      ensureDir(outputRootDir);

      setFinalImageKeyword(stars_win);
      addProcessingStep("Stars image " + stars_win_id);

      if (par.extra_combine_stars.val || apply_directly) {
            /* Make a copy of the starless image.
            */
            console.writeln("extraRemoveStars copy " + imgWin.mainView.id + " to " + imgWin.mainView.id + "_starless");
            var copywin = copyWindow(imgWin, ensure_win_prefix(imgWin.mainView.id + "_starless"));
      } else {
            /* We do not combine images so just rename old image.
             */
            var copywin = imgWin;
            copywin.mainView.id = ensure_win_prefix(copywin.mainView.id + "_starless");

      }
      setFinalImageKeyword(copywin);
      addProcessingStep("Starless image " + copywin.mainView.id);
      copywin.show();

      updatePreviewWin(copywin);

      update_extra_target_image_window_list(parent, null);

      // return possibly new starless image for further processing
      return { starless_win: copywin, stars_id: stars_win_id };
}

function extraDarkerBackground(imgWin, maskWin)
{
      addProcessingStepAndStatusInfo("Extra darker background on " + imgWin.mainView.id + " using mask " + maskWin.mainView.id);

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

      updatePreviewWin(imgWin);
}

function extraHDRMultiscaleTransform(imgWin, maskWin)
{
      addProcessingStepAndStatusInfo("HDRMultiscaleTransform on " + imgWin.mainView.id + " using mask " + maskWin.mainView.id);

      var failed = false;
      var hsChannels = null;
      var iChannel = null;

      try {
            var P = new HDRMultiscaleTransform;
            P.numberOfLayers = par.extra_HDRMLT_layers.val;
            P.medianTransform = true;
            P.deringing = true;
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
            updatePreviewWin(imgWin);
      } catch (err) {
            failed = true;
            console.criticalln(err);
      }
      if (hsChannels != null) {
            forceCloseOneWindow(hsChannels[0]);
            forceCloseOneWindow(hsChannels[1]);
      }
      if (iChannel != null) {
            forceCloseOneWindow(iChannel);
      }
      if (failed) {
            throwFatalError("HDRMultiscaleTransform failed");
      }
}

function extraLocalHistogramEqualization(imgWin, maskWin)
{
      addProcessingStepAndStatusInfo("LocalHistogramEqualization on " + imgWin.mainView.id + " using mask " + maskWin.mainView.id);

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

      updatePreviewWin(imgWin);
}

function extraExponentialTransformation(imgWin, maskWin)
{
      addProcessingStepAndStatusInfo("ExponentialTransformation on " + imgWin.mainView.id + " using mask " + maskWin.mainView.id);

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

      updatePreviewWin(imgWin);
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
                  star_mask_win = maskIsCompatible(imgWin, findWindow(ppar.win_prefix + "star_mask"));
            }
            if (star_mask_win == null) {
                  star_mask_win = maskIsCompatible(imgWin, findWindow(ppar.win_prefix + "AutoStarMask"));
            }
            if (star_mask_win != null) {
                  // Use already created start mask
                  console.writeln("Use existing star mask " + star_mask_win.mainView.id);
                  star_mask_win_id = star_mask_win.mainView.id;
                  return;
            }
      }
      closeOneWindow("AutoStarMask");

      star_mask_win = createNewStarMaskWin(imgWin);

      windowRenameKeepif(star_mask_win.mainView.id, "AutoStarMask", true);

      addProcessingStep("Created star mask " + star_mask_win.mainView.id);
      star_mask_win_id = star_mask_win.mainView.id;
}

/* Star Reduction using PixelMath, by Bill Blanshan
 */
function smallerStarsBillsPixelmathMethod(combined_id, starless_id)
{
      addProcessingStepAndStatusInfo("Reduce stars using " + par.extra_combine_stars_reduce.val + " method");

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
                  throwFatalError("Invalid star reduce mode " + par.extra_combine_stars_reduce.val);
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
            addProcessingStepAndStatusInfo("Smaller stars on stars image " + imgWin.mainView.id + 
                        " using " + par.extra_smaller_stars_iterations.val + " iterations");
      } else {
            addProcessingStepAndStatusInfo("Smaller stars on " + imgWin.mainView.id + " using mask " + star_mask_win.mainView.id + 
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

      updatePreviewWin(targetWin);
}

function extraContrast(imgWin)
{
      addProcessingStepAndStatusInfo("Increase contrast on " + imgWin.mainView.id);

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

      updatePreviewWin(imgWin);
}

function extraStretch(win)
{
      addProcessingStepAndStatusInfo("Extra stretch on " + win.mainView.id);

      win = runHistogramTransform(win, null, win.mainView.image.isColor, 'RGB').win;
      return win;
}

function extraShadowClipping(win, perc)
{
      addProcessingStepAndStatusInfo("Extra shadow clipping of " + perc + "% on " + win.mainView.id);

      clipShadows(win, perc);

      updatePreviewWin(win);
}

function extraNoiseReduction(win, mask_win)
{
      if (par.extra_noise_reduction_strength.val == 0) {
            return;
      }
      addProcessingStepAndStatusInfo("Extra noise reduction on " + win.mainView.id);

      runNoiseReductionEx(
            win, 
            mask_win, 
            par.extra_noise_reduction_strength.val,
            false);

      updatePreviewWin(win);
}

function extraACDNR(extraWin, mask_win)
{
      addProcessingStepAndStatusInfo("Extra ACDNR");
      if (par.ACDNR_noise_reduction.val == 0.0) {
            addProcessingStep("Extra ACDNR noise reduction not done, StdDev value is zero");
            return;
      }

      runACDNRReduceNoise(extraWin, mask_win);

      updatePreviewWin(extraWin);
}

function extraColorNoise(extraWin)
{
      runColorReduceNoise(extraWin);
}

function extraUnsharpMask(extraWin, mask_win)
{
      addProcessingStepAndStatusInfo("Extra UnsharpMask on " + extraWin.mainView.id + " using StdDev " + par.extra_unsharpmask_stddev.val);

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

      updatePreviewWin(extraWin);
}

function extraSharpen(extraWin, mask_win)
{
      addProcessingStepAndStatusInfo("Extra sharpening on " + extraWin.mainView.id + " using " + par.extra_sharpen_iterations.val + " iterations");

      for (var i = 0; i < par.extra_sharpen_iterations.val; i++) {
            runMultiscaleLinearTransformSharpen(extraWin, mask_win);
      }
      updatePreviewWin(extraWin);
}

function extraABE(extraWin)
{
      addProcessingStepAndStatusInfo("Extra ABE");
      runABE(extraWin, true);
      updatePreviewWin(extraWin);
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
      updatePreviewWin(imgWin);
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
             par.extra_noise_reduction.val ||
             par.extra_ACDNR.val ||
             par.extra_color_noise.val ||
             par.extra_sharpen.val ||
             par.extra_unsharpmask.val ||
             par.extra_smaller_stars.val;
}

function is_extra_option()
{
      return par.extra_remove_stars.val || 
             par.extra_combine_stars.val ||
             is_non_starless_option();
}

function is_narrowband_option()
{
      return par.fix_narrowband_star_color.val ||
             par.run_orange_hue_shift.val ||
             par.run_hue_shift.val ||
             par.run_narrowband_SCNR.val ||
             par.leave_some_green.val;
}

function isbatchNarrowbandPaletteMode()
{
      return par.custom_R_mapping.val == "All" && par.custom_G_mapping.val == "All" && par.custom_B_mapping.val == "All";
}

// Rename and save palette batch image
function narrowbandPaletteBatchFinalImage(palette_name, winId, extra)
{
      // rename and save image using palette name
      console.writeln("AutoIntegrateNarrowbandPaletteBatch:rename " + winId + " using " + palette_name);
      var palette_image = mapBadChars(palette_name);
      palette_image = "Auto_" + palette_image;
      if (extra) {
            palette_image = palette_image + "_extra";
      }
      console.writeln("AutoIntegrateNarrowbandPaletteBatch:new name " + palette_image);+
      windowRenameKeepif(winId, palette_image, true);
      // set final image keyword so it easy to save all file e.g. as 16 bit TIFF
      console.writeln("AutoIntegrateNarrowbandPaletteBatch:set final image keyword");
      setFinalImageKeyword(ImageWindow.windowById(palette_image));
      // save image
      console.writeln("AutoIntegrateNarrowbandPaletteBatch:save image " + palette_image);
      saveProcessedWindow(outputRootDir, palette_image);
      addProcessingStep("Narrowband palette batch final image " + palette_image);
}

// Run through all narrowband palette options
function AutoIntegrateNarrowbandPaletteBatch(parent, auto_continue)
{
      console.writeln("AutoIntegrateNarrowbandPaletteBatch");
      for (var i = 0; i < narrowBandPalettes.length; i++) {
            console.writeln("AutoIntegrateNarrowbandPaletteBatch loop ", i);
            if (narrowBandPalettes[i].all) {
                  if (auto_continue) {
                        ensureDialogFilePath("narrowband batch result files");
                  }
                  par.custom_R_mapping.val = narrowBandPalettes[i].R;
                  par.custom_G_mapping.val = narrowBandPalettes[i].G;
                  par.custom_B_mapping.val = narrowBandPalettes[i].B;
                  addProcessingStepAndStatusInfo("Narrowband palette " + narrowBandPalettes[i].name + " batch using " + par.custom_R_mapping.val + ", " + par.custom_G_mapping.val + ", " + par.custom_B_mapping.val);

                  var succ = AutoIntegrateEngine(parent, auto_continue);
                  if (!succ) {
                        addProcessingStep("Narrowband palette batch could not process all palettes");
                  }
                  // rename and save the final image
                  narrowbandPaletteBatchFinalImage(narrowBandPalettes[i].name, ppar.win_prefix + "AutoRGB", false);
                  if (findWindow(ppar.win_prefix + "AutoRGB_extra") != null) {
                        narrowbandPaletteBatchFinalImage(narrowBandPalettes[i].name, ppar.win_prefix + "AutoRGB_extra", true);
                  }
                  // next runs are always auto_continue
                  console.writeln("AutoIntegrateNarrowbandPaletteBatch:set auto_continue = true");
                  auto_continue = true;
                  // close all but integrated images
                  console.writeln("AutoIntegrateNarrowbandPaletteBatch:close all windows");
                  closeAllWindows(true, true);
            }
      }
      addProcessingStep("Narrowband palette batch completed");
}

function findStarImageIdEx(starless_id, stars_id)
{
      if (stars_id != starless_id) {
            console.writeln("findStarImageId try " + stars_id)
            var w = findWindow(stars_id);
            if (w != null) {
                  return stars_id;
            }
      }
      return null;
}

function findStarImageId(starless_id, original_id)
{
      console.noteln("Try to find stars image for starless image " + starless_id)
      var stars_id = findStarImageIdEx(starless_id, starless_id.replace("starless", "stars"));
      if (stars_id != null) {
            return stars_id;
      }
      stars_id = findStarImageIdEx(starless_id, starless_id + "_stars");
      if (stars_id != null) {
            return stars_id;
      }
      stars_id = findStarImageIdEx(starless_id, starless_id.replace(/starless_edit[1-9]*/g, "stars"));
      if (stars_id != null) {
            return stars_id;
      }
      stars_id = findStarImageIdEx(starless_id, starless_id.replace(/starless$/g, "stars"));
      if (stars_id != null) {
            return stars_id;
      }
      stars_id = findStarImageIdEx(starless_id, starless_id.replace(/starless.*/g, "stars"));
      if (stars_id != null) {
            return stars_id;
      }
      return null;
}

function combineStarsAndStarless(stars_combine, starless_id, stars_id)
{
      var createNewImage = true;

      /* Restore stars by combining starless image and stars. */
      addProcessingStepAndStatusInfo("Combining starless and star images using " + stars_combine);
      if (stars_id == null) {
            stars_id = findStarImageId(starless_id);
      }
      if (stars_id == null) {
            throwFatalError("Could not find starless image for star image " + starless_id);
      }
      addProcessingStepAndStatusInfo("Combining " + starless_id + " and " + stars_id + " using " + stars_combine);
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
                        par.extra_unsharpmask.val;

      var extraWin = ImageWindow.windowById(id);

      extra_stars_id = null;

      checkWinFilePath(extraWin);
      ensureDir(outputRootDir);
      ensureDir(combinePath(outputRootDir, AutoOutputDir));
      ensureDir(combinePath(outputRootDir, AutoProcessedDir));

      if (!apply_directly) {
            extra_id = ensure_win_prefix(id + "_extra");
            extraWin = copyWindow(extraWin, extra_id);
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
                        mask_win = maskIsCompatible(extraWin, findWindow(ppar.win_prefix +"AutoMask"));
                  }
            }
            if (mask_win == null) {
                  mask_win_id = ppar.win_prefix + "AutoMask";
                  closeOneWindow(mask_win_id);
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
            closeOneWindow(extra_id);
            // restore original final image name
            var new_name = extra_id;
            console.writeln("Rename " + new_image_id + " as " + new_name);
            windowRename(new_image_id, new_name);
            extraWin = ImageWindow.windowById(new_name);
            extraWin.show();
      }
      extra_id = extraWin.mainView.id;
      if (apply_directly) {
            var final_win = ImageWindow.windowById(extraWin.mainView.id);
            updatePreviewWin(final_win);
            setFinalImageKeyword(final_win);
      } else {
            var final_win = ImageWindow.windowById(extra_id);
            updatePreviewWin(final_win);
            setFinalImageKeyword(final_win);
            saveProcessedWindow(outputRootDir, extra_id); /* Extra window */
            if (par.extra_remove_stars.val) {
                  saveProcessedWindow(outputRootDir, extra_starless_id);      /* Extra starless window */
                  saveProcessedWindow(outputRootDir, extra_stars_id);         /* Extra stars window */
            }
      }
}

function update_extra_target_image_window_list(parent, current_item)
{
      if (current_item == null) {
            // use item from dialog
            current_item = extra_target_image_window_list[parent.extraImageComboBox.currentItem];
      }

      extra_target_image_window_list = getWindowListReverse();
      extra_target_image_window_list.unshift("Auto");

      parent.extraImageComboBox.clear();
      for (var i = 0; i < extra_target_image_window_list.length; i++) {
            parent.extraImageComboBox.addItem( extra_target_image_window_list[i] );
      }

      // update dialog
      if (current_item)  {
            parent.extraImageComboBox.currentItem = extra_target_image_window_list.indexOf(current_item);
            parent.extraImageComboBox.setItemText(parent.extraImageComboBox.currentItem, extra_target_image_window_list[parent.extraImageComboBox.currentItem]);
      }
}

function update_undo_buttons(parent)
{
      parent.extraUndoButton.enabled = undo_images.length > 0 && undo_images_pos > 0;
      parent.extraRedoButton.enabled = undo_images.length > 0 && undo_images_pos < undo_images.length - 1;
}

function copy_undo_edit_image(id)
{
      var copy_id = id + "_edit";
      var copy_win = copyWindowEx(ImageWindow.windowById(id), copy_id, true);
      console.writeln("Copy image " + copy_win.mainView.id);
      return copy_win.mainView.id;
}

function create_undo_image(id)
{
      var undo_id = id + "_undo_tmp";
      var undo_win = copyWindowEx(ImageWindow.windowById(id), undo_id, true);
      console.writeln("Create undo image " + undo_win.mainView.id);
      return undo_win.mainView.id;
}

function remove_undo_image(id)
{
      console.writeln("Remove undo image " + id);
      closeOneWindow(id);
}

function add_undo_image(parent, original_id, undo_id)
{
      console.writeln("add_undo_image");
      while (undo_images.length > undo_images_pos + 1) {
            var removed = undo_images.pop();
            console.writeln("Remove undo image " + removed);
            closeOneWindow(removed);
      }
      undo_images_pos++;
      console.writeln("undo_images_pos " + undo_images_pos);
      var new_undo_id = original_id + "_undo" + undo_images_pos;
      windowRenameKeepifEx(undo_id, new_undo_id, false, true);
      console.writeln("Add undo image " + new_undo_id);
      undo_images[undo_images_pos] = new_undo_id;
      update_undo_buttons(parent);
}

function apply_undo(parent)
{
      console.writeln("apply_undo");
      if (extra_target_image == null || extra_target_image == "Auto") {
            console.criticalln("No target image!");
            return;
      }
      if (undo_images_pos <= 0) {
            console.noteln("Nothing to undo");
            return;
      }
      console.noteln("Apply undo on image " + extra_target_image);
      var target_win = ImageWindow.windowById(extra_target_image);
      if (target_win == null) {
            console.criticalln("Failed to find target image " + extra_target_image);
            return;
      }
      var source_win = ImageWindow.windowById(undo_images[undo_images_pos - 1]);
      if (source_win == null) {
            console.criticalln("Failed to find undo image " + undo_images[undo_images_pos - 1]);
            return;
      }
      target_win.mainView.beginProcess(UndoFlag_NoSwapFile);
      target_win.mainView.image.assign( source_win.mainView.image );
      target_win.mainView.endProcess();

      forceNewHistogram(target_win);
      
      updatePreviewIdReset(extra_target_image, true);
      
      undo_images_pos--;
      console.writeln("undo_images_pos " + undo_images_pos);
      update_undo_buttons(parent);
}

function apply_redo(parent)
{
      console.writeln("apply_redo");
      if (extra_target_image == null || extra_target_image == "Auto") {
            console.criticalln("No target image!");
            return;
      }
      if (undo_images_pos >= undo_images.length - 1) {
            console.noteln("Nothing to redo");
            return;
      }
      console.noteln("Apply redo on image " + extra_target_image);
      var target_win = ImageWindow.windowById(extra_target_image);
      if (target_win == null) {
            console.criticalln("Failed to find target image " + extra_target_image);
            return;
      }
      var source_win = ImageWindow.windowById(undo_images[undo_images_pos + 1]);
      if (source_win == null) {
            console.criticalln("Failed to find redo image " + undo_images[undo_images_pos + 1]);
            return;
      }
      target_win.mainView.beginProcess(UndoFlag_NoSwapFile);
      target_win.mainView.image.assign( source_win.mainView.image );
      target_win.mainView.endProcess();
      updatePreviewIdReset(extra_target_image, true);
      undo_images_pos++;
      console.writeln("undo_images_pos " + undo_images_pos);
      update_undo_buttons(parent);
}

function save_as_undo(parent)
{
      console.writeln("save_as_undo");
      if (extra_target_image == null || extra_target_image == "Auto" || undo_images.length == 0) {
            console.criticalln("No target image!");
            return;
      }

      let saveFileDialog = new SaveFileDialog();
      saveFileDialog.caption = "Save As";
      if (outputRootDir == "") {
            var path = ppar.lastDir;
      } else {
            var path = outputRootDir;
      }
      if (path != "") {
            path = ensurePathEndSlash(path);
      }

      saveFileDialog.initialPath = path + extra_target_image + ".xisf";
      if (!saveFileDialog.execute()) {
            console.noteln("Image " + extra_target_image + " not saved");
            return;
      }
      var copy_id = File.extractName(saveFileDialog.fileName);
      var save_win = ImageWindow.windowById(extra_target_image);
      // Save image. No format options, no warning messages, 
      // no strict mode, no overwrite checks.
      var filename = saveFileDialog.fileName;
      if (File.extractExtension(filename) == "") {
            filename = filename + ".xisf";
      }
      console.noteln("Save " + extra_target_image + " as " + filename);
      if (!save_win.saveAs(filename, false, false, false, false)) {
            throwFatalError("Failed to save image: " + filename);
      }
      update_undo_buttons(parent);
      if (copy_id != extra_target_image) {
            // Rename old image
            save_win.mainView.id = copy_id;
            // Update preview name
            updatePreviewTxt(copy_id);
            // Update target list
            update_extra_target_image_window_list(parent, copy_id);
      }
}

function close_undo_images(parent)
{
      if (undo_images.length > 0) {
            console.writeln("Close undo images");
            for (var i = 0; i < undo_images.length; i++) {
                  closeOneWindow(undo_images[i]);
            }
            undo_images = [];
            undo_images_pos = -1;
            update_undo_buttons(parent);
      }
}

/***************************************************************************
 * 
 *    extraProcessingEngine
 * 
 */
function extraProcessingEngine(parent)
{
      is_processing = true;
      mask_win = null;
      mask_win_id = null;
      star_mask_win = null;
      star_mask_win_id = null;
      star_fix_mask_win = null;
      star_fix_mask_win_id = null;
      processing_steps = "";

      console.noteln("Start extra processing...");
      updatePreviewId(extra_target_image);
      if (use_preview && !ppar.side_preview_visible && mainTabBox != null) {
            mainTabBox.currentPageIndex = 1;
      }

      extraProcessing(parent, extra_target_image, true);

      windowIconizeAndKeywordif(mask_win_id);             /* AutoMask window */
      windowIconizeAndKeywordif(star_mask_win_id);        /* AutoStarMask or star_mask window */
      windowIconizeAndKeywordif(star_fix_mask_win_id);    /* AutoStarFixMask or star_fix_mask window */

      console.noteln("Processing steps:");
      console.writeln(processing_steps);
      console.writeln("");
      console.noteln("Extra processing completed.");
      is_processing = false;

      runGC();
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
            RGBcolor_id = RGB_BE_win.mainView.id;
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
      if (ai_debug) console.writeln("DEBUG find_up_down: at col ", col," extent up=", row_up, ", down=", row_down);
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
      if (ai_debug) console.writeln("DEBUG find_left_right: at row ", row," extent left=", col_left, ", right=", col_right);
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
            throwFatalError("Middle pixel not black in integration of lowest value for Crop, possibly not enough overlap")
      }

      // Find extent of black area at mid points (the black points nearest to the border)
      let [top,bottom] = find_up_down(lowClipImage,col_mid);
      let [left,right] = find_left_right(lowClipImage,row_mid);

      if (ai_debug)
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

      // Show the valid points for ai_debug - NOTE: The borders may be smaller as once a point is found as valid, it is not
      // recalculated.
      if (ai_debug) console.writeln("DEBUG findBounding_box - valid points LT=",left_top,",RT=",right_top,",LB=",left_bottom,",RB=",right_bottom)

      // Check that the whiole line at the border is valid, in case the border is wiggly
      let [original_left_col, original_right_col, original_top_row, original_bottom_row] = [left_col, right_col, top_row, bottom_row];

      let number_cycle = 0;
      let any_border_inwards = false;
      for (;;) {
            // Ensure that we terminate in case of unreasonable borders
            number_cycle += 1;
            if (number_cycle>100) 
            {
                  throwFatalError("Borders too wiggly for crop after ", number_cycle, " cycles"); 
            }

            let all_valid = true;

            // Check if left most column is entirely valid
            let left_col_valid = true;
            for (let i=top_row; i<=bottom_row; i++)
            {
                  left_col_valid = left_col_valid && image.sample(left_col,i)>0;
                  if (!left_col_valid) {
                        break;
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
            for (let i=top_row; i<=bottom_row; i++)
            {
                  right_col_valid = right_col_valid && image.sample(right_col,i)>0;
                  if (!right_col_valid) {
                        break;
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
            for (let i=left_col; i<=right_col; i++)
            {
                  top_row_valid = top_row_valid && image.sample(i,top_row)>0;
                  if (!top_row_valid) {
                        break;
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
            for (let i=left_col; i<=right_col; i++)
            {
                  bottom_row_valid = bottom_row_valid && image.sample(i,bottom_row)>0;
                  if (!bottom_row_valid) {
                        break;
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

      return true;
}

function calculate_crop_amount(window_id, crop_auto_continue)
{
      let lowClipImageWindow = findWindow(window_id);
      if (lowClipImageWindow == null) {
            return null;
      }

      if (crop_auto_continue) {
            let preview = lowClipImageWindow.previewById("crop");
            if (preview.isNull) {
                  throwFatalError("Error: crop preview not found from " + lowClipImageWindow.mainView.id);
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

// Find the crop area and cop all channel images
function cropChannelImages()
{
      addProcessingStepAndStatusInfo("Cropping all channel images to fully integrated area");

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
            findWindow(lowClipImageName).mainView, 
            DEFAULT_AUTOSTRETCH_SCLIP,
            DEFAULT_AUTOSTRETCH_TBGND,
            false,
            false);

      crop_truncate_amount = calculate_crop_amount(lowClipImageName, false);
      if (crop_truncate_amount == null) {
            throwFatalError("cropChannelImages failed to find image " + lowClipImageName);
      }

      crop_lowClipImageName = lowClipImageName;       // save the name for saving to disk
      crop_lowClipImage_changed = true;

      /* Luminance image may have been copied earlier in CreateChannelImages()
       * so we try to crop it here.
       */
      if (CropImageIf(findWindow(luminance_id), crop_truncate_amount)) {
            luminance_id_cropped = true;
      }

      console.noteln("Generated data for cropping");
}

function cropChannelImagesAutoContinue()
{
      if (preprocessed_images != start_images.RGB_COLOR
          && preprocessed_images != start_images.L_R_G_B)
      {
            console.writeln("Crop ignored in AutoContinue, only integrated channel images can be cropped.") ;
            return;
      }
      addProcessingStepAndStatusInfo("Cropping all channel images to fully integrated area in AutoContinue");
      let lowClipImageName = autocontinue_prefix + "LowRejectionMap_ALL";
      crop_lowClipImageName = lowClipImageName;       // save the name for minimizing
      crop_truncate_amount = calculate_crop_amount(lowClipImageName, true);
      if (crop_truncate_amount == null) {
            throwFatalError("cropChannelImagesAutoContinue failed to find image " + lowClipImageName);
      }
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
            throwFatalError("Only one remove stars option can be selected.")
      }
      var intval = boolToInteger(par.target_type_galaxy.val) + boolToInteger(par.target_type_nebula.val);
      if (intval > 1) {
            throwFatalError("Only one target type option can be selected.")
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

/***************************************************************************
 * 
 *    AutoIntegrateEngine
 * 
 */
function AutoIntegrateEngine(parent, auto_continue)
{
      if (extra_target_image != "Auto") {
            console.criticalln("Extra processing target image can be used only with Apply button!");
            return false;
      }

      runGC();

      is_processing = true;

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
      RGBcolor_id = null;
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

      luminance_id_cropped = false;
      var luminance_crop_id = null;

      console.beginLog();
      console.show();

      processingDate = new Date;
      processing_steps = "";
      all_windows = [];
      iconPoint = null;
      L_stf = null;
      linear_fit_done = false;
      narrowband = autocontinue_narrowband;
      is_luminance_images = false;
      var stars_id = null;

      if (use_preview && !ppar.side_preview_visible && mainTabBox != null) {
            mainTabBox.currentPageIndex = 1;
      }

      console.noteln("--------------------------------------");
      addProcessingStep("PixInsight version " + pixinsight_version_str);
      addProcessingStep(autointegrate_version);
      var processingOptions = getProcessingOptions();
      if (processingOptions.length > 0) {
            addProcessingStep("Processing options:");
            for (var i = 0; i < processingOptions.length; i++) {
                  addProcessingStep(processingOptions[i][0] + " " + processingOptions[i][1]);
            }
      } else {
            addProcessingStep("Using default processing options");
      }
      if (user_selected_best_image != null) {
            addProcessingStep("User selected best image: " + user_selected_best_image);
      }
      for (var i = 0; i < user_selected_reference_image.length; i++) {
            addProcessingStep("User selected reference image for filter " + user_selected_reference_image[i][1] + 
            " : " + user_selected_reference_image[i][0]);
      }
      console.noteln("--------------------------------------");
      addProcessingStepAndStatusInfo("Start processing...");

      close_undo_images(parent);

      targetTypeSetup();
      checkOptions();

      /* Create images for each L, R, G and B channels, or Color image. */
      let create_channel_images_ret = CreateChannelImages(parent, auto_continue);
      if (create_channel_images_ret == retval.ERROR) {
            console.criticalln("Failed!");
            console.endLog();
            is_processing = false;
            return false;
      }

      if (create_channel_images_ret == retval.SUCCESS || 
          (par.cropinfo_only.val && create_channel_images_ret == retval.INCOMPLETE)) 
      {
            /* If requested, we crop all channel images and channel support images (the *_map images)
             * to an area covered by all source images.
             */ 
            if (! auto_continue) {
                  if (par.crop_to_common_area.val || par.cropinfo_only.val) {
                        cropChannelImages();
                  } else {
                        console.warningln("Images are not cropped to common area, borders may be of lower quality");
                  }
            } else  {
                  if (par.crop_to_common_area.val) {
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
            preprocessed_images = start_images.CALIBRATE_ONLY;
      } else if (preprocessed_images == start_images.FINAL) {
            // We have a final image, just run run possible extra processing steps
            do_extra_processing = true;
            LRGB_ABE_HT_id = final_win.mainView.id;
            updatePreviewId(LRGB_ABE_HT_id);
      } else if (!par.image_weight_testing.val 
                 && !par.debayer_only.val 
                 && !par.binning_only.val
                 && !par.extract_channels_only.val
                 && !par.integrate_only.val 
                 && !par.cropinfo_only.val 
                 && preprocessed_images != start_images.FINAL) 
      {
            do_extra_processing = true;
            /* processRGB flag means we have channel images from LRGBHSO */
            var processRGB = !is_color_files && 
                             !par.monochrome_image.val &&
                             (preprocessed_images == start_images.NONE ||
                              preprocessed_images == start_images.L_R_G_B_BE ||
                              preprocessed_images == start_images.L_R_G_B);
            var RGBmapping = { combined: false, stretched: false, channel_noise_reduction: false };

            runGC();

            if (preprocessed_images == start_images.L_R_G_B_BE) {
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
                  if (!RGBmapping.combined) {
                        // We have not yet combined the RGB image
                        LinearFitLRGBchannels();
                  }
            } else if (is_color_files) {
                  mapColorImage();
            }

            if (!is_color_files && is_luminance_images) {
                  /* This need to be run early as we create a mask from
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
                  LRGB_ABE_HT_id = windowRename(L_ABE_HT_win.mainView.id, ppar.win_prefix + "AutoMono");
                  updatePreviewId(LRGB_ABE_HT_id);

            } else if (!par.channelcombination_only.val) {

                  RGB_ABE_HT_id = ProcessRGBimage(RGBmapping);

                  if (par.non_linear_noise_reduction.val) {
                        runNoiseReduction(ImageWindow.windowById(RGB_ABE_HT_id), mask_win, false);
                  }
      
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
                              LRGB_ABE_HT_id = windowRename(LRGB_ABE_HT_id, ppar.win_prefix + "AutoRRGB");
                        } else {
                              LRGB_ABE_HT_id = windowRename(LRGB_ABE_HT_id, ppar.win_prefix + "AutoLRGB");
                        }
                  } else {
                        /* Color or narrowband or RGB files */
                        LRGB_ABE_HT_id = windowRename(LRGB_ABE_HT_id, ppar.win_prefix + "AutoRGB");
                  }
                  updatePreviewId(LRGB_ABE_HT_id);
            }
            if (stars_id != null) {
                  console.writeln("Stars image is " + stars_id);
                  setFinalImageKeyword(ImageWindow.windowById(stars_id));
                  stars_id = windowRename(stars_id, LRGB_ABE_HT_id + "_stars");
      
                  var starless_id = LRGB_ABE_HT_id + "_starless";
                  console.writeln("Rename " + LRGB_ABE_HT_id + " as " + starless_id);
                  windowRename(LRGB_ABE_HT_id, starless_id);
                  var new_image = combineStarsAndStarless(
                                    par.stars_combine.val,
                                    starless_id, 
                                    stars_id);
                  // restore original final image name
                  console.writeln("Rename " + new_image + " as " + LRGB_ABE_HT_id);
                  windowRename(new_image, LRGB_ABE_HT_id);
                  ImageWindow.windowById(LRGB_ABE_HT_id).show();
      
                  setFinalImageKeyword(ImageWindow.windowById(starless_id));
      
                  saveProcessedWindow(outputRootDir, stars_id);
                  saveProcessedWindow(outputRootDir, starless_id);
            }
      }

      console.writeln("Basic processing completed");

      if (do_extra_processing && (is_extra_option() || is_narrowband_option())) {
            extraProcessing(parent, LRGB_ABE_HT_id, false);
      }

      ensureDialogFilePath("processed files");

      if (crop_lowClipImage_changed) {
            saveProcessedWindow(outputRootDir, crop_lowClipImageName);  /* LowRejectionMap_ALL */
      }
      if (preprocessed_images < start_images.L_R_G_B_BE) {
            // We have generated integrated images, save them
            console.writeln("Save processed windows");
            saveProcessedWindow(outputRootDir, L_id);                    /* Integration_L */
            saveProcessedWindow(outputRootDir, R_id);                    /* Integration_R */
            saveProcessedWindow(outputRootDir, G_id);                    /* Integration_G */
            saveProcessedWindow(outputRootDir, B_id);                    /* Integration_B */
            saveProcessedWindow(outputRootDir, H_id);                    /* Integration_H */
            saveProcessedWindow(outputRootDir, S_id);                    /* Integration_S */
            saveProcessedWindow(outputRootDir, O_id);                    /* Integration_O */
            saveProcessedWindow(outputRootDir, RGBcolor_id);             /* Integration_RGBcolor */
            if (luminance_id_cropped) {
                  console.writeln("luminance_id="+ luminance_id );
                  let L_win_crop = copyWindow(findWindow(luminance_id), ensure_win_prefix("Integration_L_crop"));
                  luminance_crop_id = L_win_crop.mainView.id;
                  saveProcessedWindow(outputRootDir, luminance_crop_id); /* Integration_L_crop */
            }
      }
      if (preprocessed_images <= start_images.L_R_G_B_BE) {
            // We have generated RGB image, save it
            console.writeln("Save generated RGB image");
            saveProcessedWindow(outputRootDir, RGB_win_id);              /* Integration_RGB */
      }
      if (preprocessed_images < start_images.FINAL && LRGB_ABE_HT_id != null) {
            console.writeln("Save final image");
            // set final image keyword so it easy to save all file e.g. as 16 bit TIFF
            setFinalImageKeyword(ImageWindow.windowById(LRGB_ABE_HT_id));
            // We have generated final image, save it
            run_results.final_image_file = saveProcessedWindow(outputRootDir, LRGB_ABE_HT_id);  /* Final image. */
      }

      /* All done, do cleanup on windows on screen 
       */
      addProcessingStepAndStatusInfo("Processing completed");

      closeTempWindows();
      if (!par.calibrate_only.val) {
            closeAllWindowsFromArray(calibrate_windows);
      }

      windowIconizeAndKeywordif(L_id);                    /* Integration_L */
      windowIconizeAndKeywordif(R_id);                    /* Integration_R */
      windowIconizeAndKeywordif(G_id);                    /* Integration_G */
      windowIconizeAndKeywordif(B_id);                    /* Integration_B */
      windowIconizeAndKeywordif(H_id);                    /* Integration_H */
      windowIconizeAndKeywordif(S_id);                    /* Integration_S */
      windowIconizeAndKeywordif(O_id);                    /* Integration_O */
      windowIconizeAndKeywordif(RGBcolor_id);             /* Integration_RGBcolor */
      if (crop_lowClipImageName != null) {
            windowIconizeif(crop_lowClipImageName);       /* LowRejectionMap_ALL */
      }
      windowIconizeAndKeywordif(RGB_win_id);              /* Integration_RGB */
      windowIconizeAndKeywordif(luminance_crop_id);       /* Integration_L_crop */

      if (RGB_stars_win != null) {
            windowIconizeAndKeywordif(RGB_stars_win.mainView.id); /* Integration_RGB_stars (linear) */
      }
      if (RGB_stars_HT_win != null) {
            setFinalImageKeyword(ImageWindow.windowById(RGB_stars_HT_win.mainView.id));   /* Integration_RGB_stars (non-linear) */
      }

      windowIconizeAndKeywordif(L_ABE_id);
      windowIconizeAndKeywordif(R_ABE_id);
      windowIconizeAndKeywordif(G_ABE_id);
      windowIconizeAndKeywordif(B_ABE_id);
      windowIconizeAndKeywordif(RGB_ABE_id);

      closeAllWindowsFromArray(RGB_stars);

      windowIconizeAndKeywordif(RGB_ABE_HT_id);
      windowIconizeAndKeywordif(L_ABE_HT_id);
      windowIconizeAndKeywordif(LRGB_Combined);           /* LRGB Combined image */
      windowIconizeAndKeywordif(mask_win_id);             /* AutoMask window */
      windowIconizeAndKeywordif(star_mask_win_id);        /* AutoStarMask or star_mask window */
      windowIconizeAndKeywordif(star_fix_mask_win_id);    /* AutoStarFixMask or star_fix_mask window */

      if (par.batch_mode.val) {
            /* Rename image based on first file directory name. 
             * First check possible device in Windows (like c:)
             */
            var fname = lightFileNames[0];
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
            LRGB_ABE_HT_id = windowRenameKeepifEx(LRGB_ABE_HT_id, fname, true, true);
            saveProcessedWindow(outputRootDir, LRGB_ABE_HT_id);          /* Final renamed batch image. */
      }

      if (preprocessed_images == start_images.NONE 
          && !par.image_weight_testing.val
          && !par.calibrate_only.val
          && !par.binning_only.val
          && !par.debayer_only.val
          && !par.extract_channels_only.val)
      {
            /* Output some info of files.
            */
            addProcessingStep("* All data files *");
            addProcessingStep(alignedFiles.length + " files accepted");
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
      addProcessingStepAndStatusInfo("Script completed, time "+(end_time-start_time)/1000+" sec");
      console.noteln("======================================");

      if (preprocessed_images != start_images.FINAL
          && par.autosave_setup.val 
          && !auto_continue 
          && !ai_get_process_defaults
          && full_run
          && create_channel_images_ret == retval.SUCCESS)
      {
            let json_file = "AutosaveSetup.json";
            if (par.win_prefix_to_log_files.val) {
                  json_file = ppar.win_prefix + json_file;
            }
            saveJsonFileEx(parent, true, json_file);
      }
      if (preprocessed_images != start_images.FINAL || ai_get_process_defaults) {
            writeProcessingSteps(alignedFiles, auto_continue, null);
      }

      console.noteln("Processing steps:");
      console.writeln(processing_steps);
      console.writeln("--------------------------------------");
      var processingOptions = getProcessingOptions();
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
      is_processing = false;

      runGC();

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

function printProcessDefaultValues(name, obj)
{
      console.writeln(name);
      console.writeln(obj.toSource());
}

function getProcessDefaultValues()
{
      console.beginLog();

      write_processing_log_file = true;
      console.writeln("PixInsight process default values");
      console.writeln("PixInsight version " + pixinsight_version_str);

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

      writeProcessingSteps(null, false, "AutoProcessDefaults_" + pixinsight_version_str);
}

/***************************************************************************
 * 
 *    Dialog functions are below this point
 * 
 */
 function newCheckBoxEx( parent, checkboxText, param, toolTip, onClick )
 {
       var cb = new CheckBox( parent );
       cb.text = checkboxText;
       cb.aiParam = param;
       cb.checked = cb.aiParam.val;
       if (onClick != null) {
             cb.onClick = onClick;
       } else {
             cb.onClick = function(checked) { 
                  cb.aiParam.val = checked;
             }
       }
       if ( typeof toolTip !== 'undefined' && toolTip != null ) { 
             cb.toolTip = toolTip; 
       }
 
       cb.aiParam.reset = function() {
             cb.checked = cb.aiParam.val;
       };
 
       return cb;
 }
 
 function newCheckBox( parent, checkboxText, param, toolTip )
 {
       return newCheckBoxEx(parent, checkboxText, param, toolTip, null);
 }
 function newGenericCheckBox( parent, checkboxText, param, val, toolTip, onClick )
 {
       var cb = new CheckBox( parent );
       cb.aiParam = param;
       cb.text = checkboxText;
       cb.checked = val;
       cb.onClick = onClick;
       cb.toolTip = toolTip; 
 
       return cb;
 }
 
function newGroupBox( parent, title, toolTip )
{
      var gb = new GroupBox( parent );
      if ( typeof title !== 'undefined' && title != null ) { 
            gb.title = title; 
      }
      if ( typeof toolTip !== 'undefined' && toolTip != null ) { 
            gb.toolTip = toolTip; 
      }

      return gb;
}

function Autorun(parent)
{
      var stopped = true;
      var savedOutputRootDir = outputRootDir;
      batch_narrowband_palette_mode = isbatchNarrowbandPaletteMode();
      if (par.batch_mode.val) {
            stopped = false;
            console.writeln("AutoRun in batch mode");
      } else if (batch_narrowband_palette_mode) {
            console.writeln("AutoRun in narrowband palette batch mode");
      } else {
            console.writeln("AutoRun");
      }
      do {
            if (lightFileNames == null) {
                  lightFileNames = openImageFiles("Light", true, false);
                  if (lightFileNames != null) {
                        parent.dialog.treeBox[pages.LIGHTS].clear();
                        addFilesToTreeBox(parent.dialog, pages.LIGHTS, lightFileNames);
                        updateInfoLabel(parent.dialog);
                  }
            }
            if (lightFileNames != null) {
                  try {
                        if (batch_narrowband_palette_mode) {
                              AutoIntegrateNarrowbandPaletteBatch(parent.dialog, false);
                        } else {
                              AutoIntegrateEngine(parent.dialog, false);
                        }
                        update_extra_target_image_window_list(parent.dialog, null);
                  } 
                  catch(err) {
                        console.criticalln(err);
                        console.criticalln("Processing stopped!");
                        writeProcessingSteps(null, false, null);
                  }
                  if (par.batch_mode.val) {
                        outputRootDir = savedOutputRootDir;
                        lightFileNames = null;
                        console.writeln("AutoRun in batch mode");
                        closeAllWindows(par.keep_integrated_images.val, true);
                  }
            } else {
                  stopped = true;
            }
      } while (!stopped);
      outputRootDir = savedOutputRootDir;
}

function newSectionLabel(parent, text)
{
      var lbl = new Label( parent );
      lbl.useRichText = true;
      lbl.text = '<p style="color:SlateBlue"><b>' + text + "</b></p>";

      return lbl;
}

function newLabel(parent, text, tip)
{
      var lbl = new Label( parent );
      lbl.text = text;
      lbl.textAlignment = TextAlign_Right|TextAlign_VertCenter;
      lbl.toolTip = tip;

      return lbl;
}

function newNumericEditPrecision(parent, txt, param, min, max, tooltip, precision)
{
      var edt = new NumericEdit( parent );
      edt.label.text = txt;
      edt.real = true;
      edt.edit.setFixedWidth( 6 * parent.font.width( "0" ) );
      edt.aiParam = param;
      edt.onValueUpdated = function(value) { 
            edt.aiParam.val = value; 
      };
      edt.setPrecision( precision );
      edt.setRange(min, max);
      edt.setValue(edt.aiParam.val);
      edt.toolTip = tooltip;
      edt.aiParam.reset = function() {
            edt.setValue(edt.aiParam.val);
      };
      return edt;
}

function newNumericEdit(parent, txt, param, min, max, tooltip)
{
      return newNumericEditPrecision(parent, txt, param, min, max, tooltip, 2)
}

function newRGBNBNumericEdit(parent, txt, param, tooltip)
{
      return newNumericEdit(parent, txt, param, 0.1, 999, tooltip);
}

function newNumericControl(parent, txt, param, min, max, tooltip)
{
      var edt = new NumericControl( parent );
      edt.label.text = txt;
      edt.setRange(min, max);
      edt.setPrecision(3);
      edt.aiParam = param;
      edt.setValue(edt.aiParam.val);
      edt.onValueUpdated = function(value) { 
            edt.aiParam.val = value; 
      };
      edt.toolTip = tooltip;
      edt.aiParam.reset = function() {
            edt.setValue(edt.aiParam.val);
      };
      return edt;
}

function newSpinBox(parent, param, min, max, tooltip)
{
      var edt = new SpinBox( parent );
      edt.minValue = min;
      edt.maxValue = max;
      edt.aiParam = param;
      edt.value = edt.aiParam.val;
      edt.toolTip = tooltip;
      edt.onValueUpdated = function( value )
      {
            edt.aiParam.val = value;
      };

      edt.aiParam.reset = function() {
            edt.value = edt.aiParam.val;
      };

      return edt;
}

function newGenericSpinBox(parent, param, val, min, max, tooltip, onValueUpdated)
{
      var edt = new SpinBox( parent );
      edt.minValue = min;
      edt.maxValue = max;
      edt.aiParam = param;
      edt.value = val;
      edt.toolTip = tooltip;
      edt.onValueUpdated = onValueUpdated;

      return edt;
}

function addArrayToComboBox(cb, arr)
{
      for (var i = 0; i < arr.length; i++) {
            cb.addItem( arr[i] );
      }
}

function newComboBox(parent, param, valarray, tooltip)
{
      var cb = new ComboBox( parent );
      cb.toolTip = tooltip;
      addArrayToComboBox(cb, valarray);
      cb.aiParam = param;
      cb.aiValarray = valarray;
      cb.currentItem = valarray.indexOf(cb.aiParam.val);
      cb.onItemSelected = function( itemIndex ) {
            cb.aiParam.val = cb.aiValarray[itemIndex];
      };

      cb.aiParam.reset = function() {
            cb.currentItem = cb.aiValarray.indexOf(cb.aiParam.val);
      }
      
      return cb;
}

function newComboBoxIndex(parent, param, valarray, tooltip)
{
      var cb = new ComboBox( parent );
      cb.toolTip = tooltip;
      cb.aiParam = param;
      cb.aiValarray = valarray;
      addArrayToComboBox(cb, cb.aiValarray);
      cb.currentItem = cb.aiParam.val;
      cb.onItemSelected = function( itemIndex ) {
            cb.aiParam.val = itemIndex;
      };

      cb.aiParam.reset = function() {
            cb.currentItem = cb.aiParam.val;
      }
      
      return cb;
}

function newComboBoxStrvalsToInt(parent, param, valarray, tooltip)
{
      var cb = new ComboBox( parent );
      cb.toolTip = tooltip;
      cb.aiParam = param;
      cb.aiValarray = valarray;
      addArrayToComboBox(cb, cb.aiValarray);
      cb.currentItem = valarray.indexOf(cb.aiParam.val.toString());
      cb.onItemSelected = function( itemIndex ) {
            cb.aiParam.val = parseInt(cb.aiValarray[itemIndex]);
      };

      cb.aiParam.reset = function() {
            cb.currentItem = cb.aiValarray.indexOf(cb.aiParam.val.toString());
      }
      
      return cb;
}

function newComboBoxpalette(parent, param, valarray, tooltip)
{
      var cb = new ComboBox( parent );
      cb.enabled = true;
      cb.editEnabled = true;
      cb.aiParam = param;
      cb.aiValarray = valarray;
      addArrayToComboBox(cb, cb.aiValarray);
      cb.toolTip = tooltip;
      cb.onEditTextUpdated = function() { 
            cb.aiParam.val = cb.editText.trim(); 
      };
      cb.aiParam.reset = function() {
            cb.editText = cb.aiParam.val;
      }
      return cb;
}

function filesOptionsSizer(parent, name, toolTip)
{
      var label = newSectionLabel(parent, name);
      parent.rootingArr.push(label);
      label.toolTip = toolTip;
      var labelempty = new Label( parent );
      labelempty.text = " ";
      parent.rootingArr.push(labelempty);

      var sizer = new VerticalSizer;
      sizer.margin = 6;
      sizer.spacing = 4;

      sizer.add( label );
      sizer.add( labelempty );

      return sizer;
}

function showOrHideFilterSectionBar(pageIndex)
{
      switch (pageIndex) {
            case pages.LIGHTS:
                  var show = par.lights_add_manually.val || par.skip_autodetect_filter.val;
                  break;
            case pages.FLATS:
                  var show = par.flats_add_manually.val || par.skip_autodetect_filter.val;
                  break;
            default:
                  throwFatalError("showOrHideFilterSectionBar bad pageIndex " + pageIndex);
      }
      if (show) {
            filterSectionbars[pageIndex].show();
            filterSectionbarcontrols[pageIndex].visible = true;
      } else {
            filterSectionbars[pageIndex].hide();
            filterSectionbarcontrols[pageIndex].visible = false;
      }
}

function lightsOptions(parent)
{
      var sizer = filesOptionsSizer(parent, "Add light images", parent.filesToolTip[pages.LIGHTS]);

      var debayerLabel = new Label( parent );
      parent.rootingArr.push(debayerLabel);
      debayerLabel.text = "Debayer";
      debayerLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      debayerLabel.toolTip = "<p>Select bayer pattern for debayering color/OSC/RAW/DSLR files.</p>" +
                      "<p>Auto option tries to recognize debayer pattern from image metadata.</p>" +
                      "<p>If images are already debayered choose none which does not do debayering.</p>";

      var debayerCombobox = newComboBox(parent, par.debayerPattern, debayerPattern_values, debayerLabel.toolTip);
      parent.rootingArr.push(debayerCombobox);

      var extractChannelsLabel = new Label( parent );
      parent.rootingArr.push(extractChannelsLabel);
      extractChannelsLabel.text = "Extract channels";
      extractChannelsLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      extractChannelsLabel.toolTip = 
            "<p>Extract channels from color/OSC/RAW/DSLR files.</p>" +
            "<p>Channel extraction is done right after debayering. After channels are extracted " + 
            "processing continues as mono processing with separate filter files.</p>" +
            "<p>Option LRGB extract lightness channels as L and color channels as separate R, G and B files.</p>" +
            "<p>Option HOS extract channels as RGB=HOS and option HSO extract channels RGB=HSO. " + 
            "Resulting channels can then be mixed as needed using PixMath expressions in color " + 
            "palette section.</p>" +
            "<p>Channel files have a channel name (_L, _R, etc.) at the end of the file name. Script " + 
            "can then automatically recognize files as filter files.</p>"
            ;

      var extractChannelsCombobox = newComboBox(parent, par.extract_channel_mapping, extract_channel_mapping_values, extractChannelsLabel.toolTip);
      parent.rootingArr.push(extractChannelsCombobox);

      var add_manually_checkbox = newCheckBox(parent, "Add manually", par.lights_add_manually, 
            "<p>Add light files manually by selecting files for each filter.</p>" );
      parent.rootingArr.push(add_manually_checkbox);
      add_manually_checkbox.onClick = function(checked) { 
            add_manually_checkbox.aiParam.val = checked; 
            showOrHideFilterSectionBar(pages.LIGHTS);
      }

      var monochrome_image_CheckBox = newCheckBoxEx(parent, "Force monochrome", par.monochrome_image, 
            "<p>Force create of a monochrome image. All images are treated as Luminance files and stacked together. " + 
            "Quite a few processing steps are skipped with this option.</p>",
            function(checked) { 
                  monochrome_image_CheckBox.aiParam.val = checked;
                  updateSectionsInTreeBox(parent.treeBox[pages.LIGHTS]);
      });
      parent.rootingArr.push(monochrome_image_CheckBox);

      sizer.add(debayerLabel);
      sizer.add(debayerCombobox);
      sizer.add(extractChannelsLabel);
      sizer.add(extractChannelsCombobox);
      sizer.add(monochrome_image_CheckBox);
      sizer.add(add_manually_checkbox);
      sizer.addStretch();

      return sizer;
}

function biasOptions(parent)
{
      var sizer = filesOptionsSizer(parent, "Add bias images", parent.filesToolTip[pages.BIAS]);

      var checkbox = newCheckBox(parent, "SuperBias", par.create_superbias, 
            "<p>Create SuperBias from bias files.</p>" );
      var checkbox2 = newCheckBox(parent, "Master files", par.bias_master_files, 
            "<p>Files are master files.</p>" );

      sizer.add(checkbox);
      sizer.add(checkbox2);
      sizer.addStretch();

      return sizer;
}

function darksOptions(parent)
{
      var sizer = filesOptionsSizer(parent, "Add dark images", parent.filesToolTip[pages.DARKS]);

      var checkbox = newCheckBox(parent, "Pre-calibrate", par.pre_calibrate_darks, 
            "<p>If checked darks are pre-calibrated with bias and not during ImageCalibration. " + 
            "Normally this is not recommended and it is better to calibrate darks during " + 
            "ImageCalibration.</p>" );
      var checkbox2 = newCheckBox(parent, "Optimize", par.optimize_darks, 
            "<p>If checked darks are optimized when calibrating lights." + 
            "</p><p>" +
            "Normally using optimize flag should not cause any problems. " +
            "With cameras without temperature control it can greatly improve the results. " +
            'With cameras that have "amplifier glow" dark optimization may give worse results. ' +
            "</p><p>" +
            "When Optimize is not checked bias frames are ignored and dark and flat file optimize " + 
            "and calibrate flags are disabled in light file calibration. " +
            "</p>" );
      var checkbox3 = newCheckBox(parent, "Master files", par.dark_master_files, 
            "<p>Files are master files.</p>" );

      sizer.add(checkbox);
      sizer.add(checkbox2);
      sizer.add(checkbox3);
      sizer.addStretch();

      return sizer;
}

function flatsOptions(parent)
{
      var sizer = filesOptionsSizer(parent, "Add flat images", parent.filesToolTip[pages.FLATS]);

      var checkboxStars = newCheckBox(parent, "Stars in flats", par.stars_in_flats, 
            "<p>If you have stars in your flats then checking this option will lower percentile " + 
            "clip values and should help remove the stars.</p>" );
      parent.rootingArr.push(checkboxStars);
      var checkboxDarks = newCheckBox(parent, "Do not use darks", par.no_darks_on_flat_calibrate, 
            "<p>For some sensors darks should not be used to calibrate flats.  " + 
            "An example of such sensor is most CMOS sensors.</p>"  +
            "<p>If flat darks are selected then darks are not used " + 
            "to calibrate flats.</p>");
      parent.rootingArr.push(checkboxDarks);
      var checkboxManual = newCheckBox(parent, "Add manually", par.flats_add_manually, 
            "<p>Add flat files manually by selecting files for each filter.</p>" );
      parent.rootingArr.push(checkboxManual);
      checkboxManual.onClick = function(checked) {
            checkboxManual.aiParam.val = checked;
            showOrHideFilterSectionBar(pages.FLATS);
      }

      sizer.add(checkboxStars);
      sizer.add(checkboxDarks);
      sizer.add(checkboxManual);
      sizer.addStretch();

      return sizer;
}

function flatdarksOptions(parent)
{
      var sizer = filesOptionsSizer(parent, "Add flat dark images", parent.filesToolTip[pages.FLAT_DARKS]);

      var checkbox = newCheckBox(parent, "Master files", par.flat_dark_master_files, 
            "<p>Files are master files.</p>" );
      parent.rootingArr.push(checkbox);

      sizer.add(checkbox);
      sizer.addStretch();
      
      return sizer;
}

function updatePreviewImageBmp(updPreviewControl, bmp)
{
      if (updPreviewControl == null) {
            return;
      }
      if ((is_some_preview && !is_processing) || preview_keep_zoom) {
            updPreviewControl.UpdateImage(bmp);
      } else {
            updPreviewControl.SetImage(bmp);
      }
}

function updatePreviewTxt(txt)
{
      txt = "<b>Preview</b> " + txt;
      if (tabPreviewInfoLabel != null) {
            tabPreviewInfoLabel.text = txt;
      }
      if (sidePreviewInfoLabel != null) {
            sidePreviewInfoLabel.text = txt;
      }
}

function updatePreviewWinTxt(imgWin, txt)
{
      if (use_preview && imgWin != null) {
            if (preview_size_changed) {
                  if (tabPreviewControl != null) {
                        tabPreviewControl.setSize(ppar.preview_width, ppar.preview_height);
                  }
                  if (sidePreviewControl != null) {
                        sidePreviewControl.setSize(ppar.preview_width, ppar.preview_height);
                  }
                  preview_size_changed = false;
            }
            var bmp = getWindowBitmap(imgWin);
            updatePreviewImageBmp(tabPreviewControl, bmp);
            updatePreviewImageBmp(sidePreviewControl, bmp);
            updatePreviewTxt(txt);
            console.noteln("Preview updated");
            is_some_preview = true;
            current_selected_file_name = null; // reset file name, it is set by caller if needed
      }
}

function updatePreviewWin(imgWin)
{
      updatePreviewWinTxt(imgWin, imgWin.mainView.id);
}

function updatePreviewFilename(filename, stf)
{
      if (!use_preview) {
            return;
      }
      var imageWindows = ImageWindow.open(filename);
      if (imageWindows == null || imageWindows.length != 1) {
            return;
      }
      var imageWindow = imageWindows[0];
      if (imageWindow == null) {
            return;
      }

      if (stf) {
            runHistogramTransformSTFex(imageWindow, null, imageWindow.mainView.image.isColor, DEFAULT_AUTOSTRETCH_TBGND, false);
      }

      updatePreviewWinTxt(imageWindow, File.extractName(filename) + File.extractExtension(filename));

      imageWindow.forceClose();
}

function updatePreviewId(id)
{
      if (use_preview) {
            updatePreviewWinTxt(ImageWindow.windowById(id), id);
      }
}

function updatePreviewIdReset(id, keep_zoom)
{
      if (use_preview) {
            preview_keep_zoom = keep_zoom;
            updatePreviewWinTxt(ImageWindow.windowById(id), id);
            is_some_preview = false;
            is_processing = false;
      }
}

function updatePreviewNoImageInControl(control)
{
      var bitmap = new Bitmap(ppar.preview_width - ppar.preview_width/10, ppar.preview_height - ppar.preview_height/10);
      bitmap.fill(0xff808080);

      var graphics = new Graphics(bitmap);
      graphics.transparentBackground = true;

      graphics.pen = new Pen(0xff000000, 4);
      graphics.font.bold = true;
      var txt = autointegrate_version;
      var txtLen = graphics.font.width(txt);
      graphics.drawText(bitmap.width / 2 - txtLen / 2, bitmap.height / 2, txt);

      graphics.end();
      
      var startupWindow = new ImageWindow(
                                    bitmap.width,
                                    bitmap.height,
                                    1,
                                    32,
                                    true,
                                    false,
                                    "AutoIntegrate_startup_preview");

      startupWindow.mainView.beginProcess(UndoFlag_NoSwapFile);
      startupWindow.mainView.image.blend(bitmap);
      startupWindow.mainView.endProcess();

      control.UpdateImage(getWindowBitmap(startupWindow));

      startupWindow.forceClose();
}

function updatePreviewNoImage()
{
      if (use_preview) {
            updatePreviewNoImageInControl(tabPreviewControl);
            updatePreviewNoImageInControl(sidePreviewControl);
            updatePreviewTxt("No preview");
      }
}

function updateOutputDirEdit(path)
{
      outputRootDir = ensurePathEndSlash(path);
      console.writeln("updateOutputDirEdit, set outputRootDir ", outputRootDir);
      outputDirEdit.text = outputRootDir;
}

function getOutputDirEdit()
{
      return outputDirEdit.text;
}

function addOutputDir(parent)
{
      var lbl = new Label( parent );
      parent.rootingArr.push(lbl);
      lbl.text = "Output directory";
      lbl.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      lbl.toolTip = "<p>Give output root directory.</p>" +
                    "<p>If no directory is given then the path to the " + 
                    "first light file is used as the output root directory.</p>" +
                    "<p>If a relative path is given then it will be appended " + 
                    "to the first light file path.</p>" +
                    "<p>If output directory is given with AutoContinue then output " + 
                    "goes to that directory and not into directory subtree.</p>" +
                    "<p>If directory does not exist it is created.</p>";
      outputDirEdit = new Edit( parent );
      outputDirEdit.text = outputRootDir;
      outputDirEdit.toolTip = lbl.toolTip;
      outputDirEdit.onEditCompleted = function() {
            outputRootDir = ensurePathEndSlash(outputDirEdit.text.trim());
            console.writeln("addOutputDir, set outputRootDir ", outputRootDir);
      };

      var dirbutton = new ToolButton( parent );
      dirbutton.icon = parent.scaledResource( ":/icons/select-file.png" );
      dirbutton.toolTip = "<p>Select output root directory.</p>";
      dirbutton.onClick = function() {
            var gdd = new GetDirectoryDialog;
            if (outputRootDir == "") {
                  gdd.initialPath = ppar.lastDir;
            } else {
                  gdd.initialPath = outputRootDir;
            }
            gdd.caption = "Select Output Directory";
            if (gdd.execute()) {
                  updateOutputDirEdit(gdd.directory);
            }
      };
      
      var outputdir_Sizer = new HorizontalSizer;
      outputdir_Sizer.spacing = 4;
      outputdir_Sizer.add( lbl );
      outputdir_Sizer.add( outputDirEdit );
      outputdir_Sizer.add( dirbutton );

      return outputdir_Sizer;
}

function validateWindowPrefix(p)
{
      p = p.replace(/[^A-Za-z0-9]/gi,'_');
      //p = p.replace(/_+$/,'');
      if (p.match(/^\d/)) {
            // if user tries to start prefix with a digit, prepend an underscore
            p = "_" + p;
      }
      return p;
}

// Update window prefix before using it.
// Moved from windowPrefixComboBox.onEditTextUpdated
// is that function is called for every character.
function updateWindowPrefix()
{
      ppar.win_prefix = validateWindowPrefix(ppar.win_prefix);
      if (windowPrefixComboBox != null) {
            windowPrefixComboBox.editText = ppar.win_prefix;
      }
      if (ppar.win_prefix != "" && !ppar.win_prefix.endsWith("_")) {
            ppar.win_prefix = ppar.win_prefix + "_";
      }
      console.writeln("updateWindowPrefix, set winPrefix '" + ppar.win_prefix + "'");
      fixAllWindowArrays(ppar.win_prefix);
}

function addWinPrefix(parent)
{
      var lbl = new Label( parent );
      parent.rootingArr.push(lbl);
      lbl.text = "Window Prefix";
      lbl.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      lbl.toolTip = "<p>Give window prefix identifier.</p>" +
                    "<p>If specified, all AutoIntegrate windows will be " +
                    "prepended with the prefix and an underscore.</p>" +
                    "<p>This makes all generated window names unique " +
                    "for the current run and allows you run multiple times " +
                    "without closing or manually renaming all the windows from previous runs, " +
                    "as long as you change the prefix before each run." +
                    "<p>The window prefix will be saved across script invocations " +
                    "for convenience with the AutoContinue function.</p>";
      
      windowPrefixComboBox = new ComboBox( parent );
      windowPrefixComboBox.enabled = true;
      windowPrefixComboBox.editEnabled = true;
      windowPrefixComboBox.minItemCharWidth = 10;
      windowPrefixComboBox.toolTip = lbl.toolTip;
      var pa = get_win_prefix_combobox_array(ppar.win_prefix);
      addArrayToComboBox(windowPrefixComboBox, pa);
      windowPrefixComboBox.editText = ppar.win_prefix;
      windowPrefixComboBox.onEditTextUpdated = function() {
            // This function is called for every character edit so actions
            // are moved to function updateWindowPrefix
            ppar.win_prefix = validateWindowPrefix(windowPrefixComboBox.editText.trim());
            windowPrefixComboBox.editText = ppar.win_prefix;
      };

      /*
      var edt = new Edit( parent );
      edt.text = ppar.win_prefix;
      edt.toolTip = lbl.toolTip;
      edt.onEditCompleted = function() {
            ppar.win_prefix = edt.text.trim();
            if (ppar.win_prefix != last_win_prefix) {
                  ppar.win_prefix = ppar.win_prefix.replace(/[^A-Za-z0-9]/gi,'_');
                  ppar.win_prefix = ppar.win_prefix.replace(/_+$/,'');
                  if (ppar.win_prefix.match(/^\d/)) {
                        // if user tries to start prefix with a digit, prepend an underscore
                        ppar.win_prefix = "_" + ppar.win_prefix;
                  }
                  if (ppar.win_prefix != "") {
                        ppar.win_prefix = ppar.win_prefix + "_";
                  }
                  fixAllWindowArrays(ppar.win_prefix);
                  last_win_prefix = ppar.win_prefix;
                  edt.text = ppar.win_prefix;

            }

            console.writeln("addWinPrefix, set winPrefix ", ppar.win_prefix);
      };
      */

      // Add help button to show known prefixes. Maybe this should be in
      // label and edit box toolTips.
      windowPrefixHelpTips = new ToolButton( parent );
      windowPrefixHelpTips.icon = parent.scaledResource( ":/icons/help.png" );
      windowPrefixHelpTips.setScaledFixedSize( 20, 20 );
      windowPrefixHelpTips.toolTip = "Current Window Prefixes:";

      var winprefix_Sizer = new HorizontalSizer;
      winprefix_Sizer.spacing = 4;
      winprefix_Sizer.add( lbl );
      winprefix_Sizer.add( windowPrefixComboBox );
      winprefix_Sizer.add( windowPrefixHelpTips );

      return winprefix_Sizer;
}

/* Read saved Json file info.
 */ 
function readJsonFile(fname, lights_only)
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
            updateWindowPrefix();
            console.writeln("Restored window prefix " + ppar.win_prefix);
      }

      let saveDir = File.extractDrive(fname) + File.extractDirectory(fname);

      if (saveInfo.output_dir != null && saveInfo.output_dir != undefined) {
            var outputDir = saveInfo.output_dir.replace("$(setupDir)", saveDir);
            outputDir = saveInfo.output_dir.replace("$(saveDir)", saveDir);   // for compatibility
            updateOutputDirEdit(outputDir);
            console.writeln("Restored output directory " + outputDir);
      }

      saveInfoMakeFullPaths(saveInfo, saveDir);

      if (saveInfo.best_image != null && saveInfo.best_image != undefined) {
            console.writeln("Restored best image " + saveInfo.best_image);
            user_selected_best_image = saveInfo.best_image;
      }
      if (saveInfo.reference_image != null && saveInfo.reference_image != undefined) {
            console.writeln("Restored reference images " + saveInfo.reference_image);
            user_selected_reference_image = saveInfo.reference_image;
      }
      if (saveInfo.star_alignment_image != null && saveInfo.star_alignment_image != undefined) {
            console.writeln("Restored star alignment image " + saveInfo.star_alignment_image);
            star_alignment_image = saveInfo.star_alignment_image;
      }
      if (saveInfo.defectInfo != null && saveInfo.defectInfo != undefined) {
            console.writeln("Restored defect info");
            LDDDefectInfo = saveInfo.defectInfo;
      }

      var pagearray = [];
      for (var i = 0; i < pages.END; i++) {
            pagearray[i] = null;
      }
      var fileInfoList = saveInfo.fileinfo;
      var found_files = false;
      for (var i = 0; i < fileInfoList.length; i++) {
            var saveInfo = fileInfoList[i];
            console.writeln("readJsonFile " + saveInfo.pagename);
            if (lights_only && saveInfo.pageindex != pages.LIGHTS) {
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
                        case pages.LIGHTS:
                              console.writeln("readJsonFile, set manual filters for lights");
                              lightFilterSet = filterSet;
                              break;
                        case pages.FLATS:
                              console.writeln("readJsonFile, set manual filters for flats");
                              flatFilterSet = filterSet;
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

function addJsonFileInfo(fileInfoList, pageIndex, treeboxfiles, filterset)
{
      var name = "";
      switch (pageIndex) {
            case pages.LIGHTS:
                  name = "Lights";
                  break;
            case pages.BIAS:
                  name = "Bias";
                  break;
            case pages.DARKS:
                  name = "Darks";
                  break;
            case pages.FLATS:
                  name = "Flats";
                  break;
            case pages.FLAT_DARKS:
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

function getSettingsFromJson(settings)
{

      if (settings == null || settings == undefined) {
            console.noteln("getSettingsFromJson: empty settings");
            return;
      }

      console.noteln("Restore " + settings.length + " settings");

      for (var i = 0; i < settings.length; i++) {
            for (let x in par) {
                  var param = par[x];
                  if (param.name == settings[i][0]) {
                        param.val = settings[i][1];
                        if (param.reset != undefined) {
                              param.reset();
                        }
                        console.writeln("getSettingsFromJson, set " + param.name + "=" + param.val);
                  }
            }
      }
}

function initJsonSaveInfo(fileInfoList, save_settings, saveDir)
{
      if (save_settings) {
            var changed_settings = getChangedSettingsAsJson();
            var saveInfo = { version: 3, fileinfo: fileInfoList, settings: changed_settings };
            if (ppar.win_prefix != '') {
                  saveInfo.window_prefix = ppar.win_prefix;
            }
            let outputDirEditPath = getOutputDirEdit();
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
            if (user_selected_best_image != null) {
                  saveInfo.best_image = user_selected_best_image;
            }
            if (user_selected_reference_image.length > 0) {
                  // Need to make a copy so we do not update the original array
                  saveInfo.reference_image = copy_user_selected_reference_image_array();
            }
            if (star_alignment_image != null) {
                  saveInfo.star_alignment_image = star_alignment_image;
            }
            if (LDDDefectInfo.length > 0) {
                  saveInfo.defectInfo = LDDDefectInfo;
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
            throwFatalError("saveInfoMakeRelativePaths, empty saveDir");
      }
      saveDir = ensurePathEndSlash(saveDir);
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
            throwFatalError("saveInfoMakeFullPaths, empty saveDir");
      }
      saveDir = ensurePathEndSlash(saveDir);
      console.writeln("saveInfoMakeFullPaths, saveDir " + saveDir);
      var fileInfoList = saveInfo.fileinfo;
      for (var i = 0; i < fileInfoList.length; i++) {
            for (var j = 0; j < fileInfoList[i].files.length; j++) {
                  var fname = fileInfoList[i].files[j][0];
                  if (pathIsRelative(fname)) {
                        fileInfoList[i].files[j][0] = saveDir + fname;
                  }
            }
      }
      if (saveInfo.best_image != null && saveInfo.best_image != undefined) {
            if (pathIsRelative(saveInfo.best_image)) {
                  saveInfo.best_image = saveDir + saveInfo.best_image;
            }
      }
      if (saveInfo.reference_image != null && saveInfo.reference_image != undefined) {
            for (var i = 0; i < saveInfo.reference_image.length; i++) {
                  if (pathIsRelative(saveInfo.reference_image[i][0])) {
                        saveInfo.reference_image[i][0] = saveDir + saveInfo.reference_image[i][0];
                  }
            }
      }
      if (saveInfo.star_alignment_image != null && saveInfo.star_alignment_image != undefined) {
            if (pathIsRelative(saveInfo.star_alignment_image)) {
                  saveInfo.star_alignment_image = saveDir + saveInfo.star_alignment_image;
            }
      }
      return saveInfo;
}

/* Save file info to a file.
 */
function saveJsonFileEx(parent, save_settings, autosave_json_filename)
{
      console.writeln("saveJsonFile");

      let fileInfoList = [];

      for (let pageIndex = 0; pageIndex < parent.treeBox.length; pageIndex++) {
            let treeBox = parent.treeBox[pageIndex];
            let treeboxfiles = [];
            let filterSet = null;
            let name = "";
            switch (pageIndex) {
                  case pages.LIGHTS:
                        name = "Lights";
                        filterSet = lightFilterSet;
                        break;
                  case pages.BIAS:
                        name = "Bias";
                        break;
                  case pages.DARKS:
                        name = "Darks";
                        break;
                  case pages.FLATS:
                        name = "Flats";
                        filterSet = flatFilterSet;
                        break;
                  case pages.FLAT_DARKS:
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

            getTreeBoxNodeFiles(treeBox, treeboxfiles);

            console.writeln("Found " + treeboxfiles.length + " files");

            if (treeboxfiles.length == 0) {
                  // no files
                  continue;
            }

            if (filterSet != null) {
                  clearFilterFileUsedFlags(filterSet);
            }
            addJsonFileInfo(fileInfoList, pageIndex, treeboxfiles, filterSet);
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
                  var outputDir = ensurePathEndSlash(getOutputDir(fileInfoList[0].files[0][0]));
            } else {
                  var outputDir = ensurePathEndSlash(getOutputDir(""));
                  if (outputDir == "") {
                        outputDir = ensurePathEndSlash(ppar.lastDir);
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
            let dialogRet = ensureDialogFilePath(autosave_json_filename);
            if (dialogRet == 0) {
                  // Canceled, do not save
                  return;
            }
            let json_path;
            if (dialogRet == 1) {
                  // User gave explicit directory
                  json_path = outputRootDir;
            } else {
                  // Not saving to AutoProcessed directory
                  //json_path = combinePath(outputRootDir, AutoProcessedDir); 
                  
                  // Saving to lights directory, or user given output directory
                  // This way we get relative paths to file so it is easy to move around
                  // or even share with lights files.
                  json_path = outputRootDir;
            }
            var saveDir = ensurePathEndSlash(json_path);
            var json_path_and_filename = saveDir + autosave_json_filename;
      }
      saveLastDir(saveDir);
      try {
            let saveInfo = initJsonSaveInfo(fileInfoList, save_settings, saveDir);
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

function saveJsonFile(parent, save_settings)
{
      saveJsonFileEx(parent, save_settings, null);
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

function filenamesToTreeboxfiles(treeboxfiles, filenames, checked)
{
      for (var i = 0; i < filenames.length; i++) {
            treeboxfiles[treeboxfiles.length] =  [ filenames[i], checked, 0 ];
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

function compareReferenceFileNames(reference_name, processed_name, filename_postfix)
{
      let reference_basename = getReferenceBasename(reference_name, filename_postfix);
      let processed_basename = getReferenceBasename(processed_name, filename_postfix);
      return reference_basename == processed_basename;
}

function updateTreeBoxNodeToolTip(node)
{
      var toolTip = "<p>" + node.filename + "</p><p>exptime: " + node.exptime;
      if (node.ssweight > 0) {
            toolTip = toolTip + "<br>ssweight: " + node.ssweight;
      }
      if (node.best_image) {
            toolTip = toolTip + "<br>Reference image for star align";
      }
      if (node.reference_image) {
            toolTip = toolTip + "<br>Reference image for image integration and local normalization";
      }
      var toolTip = toolTip + "</p>";

      node.setToolTip(0, toolTip);
}

function updateTreeBoxNodeFromFlags(parent, node)
{
      if (node.best_image && node.reference_image) {
            //console.writeln("updateTreeBoxNodeFromFlags, both best image and reference image");
            node.setIcon(0, parent.scaledResource(":/icons/item-ok.png"));
            node.checked = true;
            updateTreeBoxNodeToolTip(node);
      } else if (node.best_image) {
            //console.writeln("updateTreeBoxNodeFromFlags, best image");
            node.setIcon(0, parent.scaledResource(":/icons/ok-button.png"));
            node.checked = true;
            updateTreeBoxNodeToolTip(node);
      } else if (node.reference_image) {
            //console.writeln("updateTreeBoxNodeFromFlags, reference image");
            node.setIcon(0, parent.scaledResource(":/icons/item.png"));
            node.checked = true;
            updateTreeBoxNodeToolTip(node);
      } else {
            //console.writeln("updateTreeBoxNodeFromFlags, normal image");
            node.setIcon(0, parent.scaledResource(""));
            updateTreeBoxNodeToolTip(node);
      }
}

function setBestImageInTreeBoxNode(parent, node, best_image, filename_postfix)
{
      if (node.numberOfChildren == 0) {
            // We compare only file name as path and extension can be different when we
            // set values at run time.
            if (best_image != null && compareReferenceFileNames(best_image, node.filename, filename_postfix)) {
                  //console.writeln("setBestImageInTreeBoxNode found best image");
                  node.best_image = true;
                  updateTreeBoxNodeFromFlags(parent, node);
                  user_selected_best_image = node.filename;
            } else if (node.best_image) {
                  node.best_image = false;
                  updateTreeBoxNodeFromFlags(parent, node);
            }
            return;
      } else {
            for (var i = 0; i < node.numberOfChildren; i++) {
                  setBestImageInTreeBoxNode(parent, node.child(i), best_image, filename_postfix);
            }
      }
}

function setBestImageInTreeBox(parent, node, best_image, filename_postfix)
{
      //console.writeln("setBestImageInTreeBox " + best_image);
      if (node.numberOfChildren == 0) {
            return;
      } else {
            setBestImageInTreeBoxNode(parent, node, best_image, filename_postfix);
      }
}

// Set user selected reference image to the array of reference images by filter.
// If filter already has reference image update the old one.
function set_user_selected_reference_image(reference_image, filter)
{
      for (var i = 0; i < user_selected_reference_image.length; i++) {
            if (user_selected_reference_image[i][1] == filter) {
                  console.writeln("set_user_selected_reference_image, update filter " + filter + " to image " + reference_image);
                  user_selected_reference_image[i][0] = reference_image;
                  break;
            }
      }
      if (i == user_selected_reference_image.length) {
            // not found, add new
            console.writeln("set_user_selected_reference_image, add filter " + filter + " and image " + reference_image);
            user_selected_reference_image[user_selected_reference_image.length] = [ reference_image, filter ];
      }
}

function copy_user_selected_reference_image_array()
{
      var copyarr = [];

      for (var i = 0; i < user_selected_reference_image.length; i++) {
            var elem = [];
            for (var j = 0; j < user_selected_reference_image[i].length; j++) {
                  elem[elem.length] = user_selected_reference_image[i][j];
            }
            copyarr[copyarr.length] = elem;
      }
      return copyarr;
}

function setReferenceImageInTreeBoxNode(parent, node, reference_image, filename_postfix, filter)
{
      if (node.numberOfChildren == 0 && (filter == null || node.filter == filter)) {
            // We compare only file name as path and extension can be different when we
            // set values at run time.
            if (reference_image != null && compareReferenceFileNames(reference_image, node.filename, filename_postfix)) {
                  //console.writeln("setReferenceImageInTreeBoxNode found reference image");
                  node.reference_image = true;
                  updateTreeBoxNodeFromFlags(parent, node);
                  set_user_selected_reference_image(node.filename, filter);
            } else if (node.reference_image) {
                  //console.writeln("setReferenceImageInTreeBoxNode clear old reference image " + node.filename);
                  node.reference_image = false;
                  updateTreeBoxNodeFromFlags(parent, node);
            }
            return;
      } else {
            for (var i = 0; i < node.numberOfChildren; i++) {
                  setReferenceImageInTreeBoxNode(parent, node.child(i), reference_image, filename_postfix, filter);
            }
      }
}

function setReferenceImageInTreeBox(parent, node, reference_image, filename_postfix, filter)
{
      //console.writeln("setReferenceImageInTreeBox " + reference_image + " for filter " + filter);
      if (node.numberOfChildren == 0) {
            return;
      } else {
            setReferenceImageInTreeBoxNode(parent, node, reference_image, filename_postfix, filter);
      }
}

// 1. Find image with biggest ssweight in treebox and update it in 
//    user_selected_best_image.
// 2. For each filter find image with biggest ssweight in treebox and 
//    update it in user_selected_reference_image.
function findBestImageFromTreeBoxFiles(treebox)
{
      if (treebox.numberOfChildren == 0) {
            console.writeln("findBestImageFromTreeBoxFiles, no files");
            return false;
      }
      addStatusInfo("Finding...");

      var checked_files = [];
      getTreeBoxNodeFileNamesCheckedIf(treebox, checked_files, true);

      // get array of [ filename, weight ]
      var ssWeights = SubframeSelectorMeasure(checked_files, false, false);

      // create treeboxfiles array of [ filename, checked, weight ]
      var treeboxfiles = [];
      for (var i = 0; i < ssWeights.length; i++) {
            treeboxfiles[treeboxfiles.length] = [ ssWeights[i][0], true, ssWeights[i][1] ];
      }

      // group files by filter
      var filteredFiles = getFilterFiles(treeboxfiles, pages.LIGHTS, '');

      // go through all filters
      var globalBestSSWEIGHTvalue = 0;
      var globalBestSSWEIGHTfile = null;
      for (var i = 0; i < filteredFiles.allfilesarr.length; i++) {
            var files = filteredFiles.allfilesarr[i].files;
            if (files.length == 0) {
                  continue;
            }
            var filter = filteredFiles.allfilesarr[i].filter;
            var bestSSWEIGHTvalue = 0;
            var bestSSWEIGHTindex = -1;
            for (var j = 0; j < files.length; j++) {
                  var filePath = files[j].name;
                  var SSWEIGHT = files[j].ssweight;
                  if (SSWEIGHT > bestSSWEIGHTvalue) {
                        bestSSWEIGHTvalue = SSWEIGHT;
                        bestSSWEIGHTindex = j;
                        console.writeln("Filter " + filter + ", " + filePath + ", SSWEIGHT=" + SSWEIGHT + ", new best value");
                  } else {
                        console.writeln("Filter " + filter + ", " + filePath + ", SSWEIGHT=" + SSWEIGHT);
                  }
                  setTreeBoxNodeSsweight(treebox, filePath, SSWEIGHT, "");
            }
            if (bestSSWEIGHTindex == -1) {
                  console.noteln("findBestImageFromTreeBoxFiles, no SSWEIGHT for filter " + filter);
            } else {
                  console.noteln("Filter " + filter + ", " + files[bestSSWEIGHTindex].name + ", best SSWEIGHT=" + bestSSWEIGHTvalue);
                  set_user_selected_reference_image(files[bestSSWEIGHTindex].name, filter);

                  if (bestSSWEIGHTvalue > globalBestSSWEIGHTvalue) {
                        globalBestSSWEIGHTvalue = bestSSWEIGHTvalue;
                        globalBestSSWEIGHTfile = files[bestSSWEIGHTindex].name;
                        console.writeln("All files, " + globalBestSSWEIGHTfile + ", SSWEIGHT=" + globalBestSSWEIGHTvalue + ", new best value");
                  }
            }
      }
      if (globalBestSSWEIGHTfile != null) {
            console.noteln("All files, " + globalBestSSWEIGHTfile + ", best SSWEIGHT=" + globalBestSSWEIGHTvalue);
            user_selected_best_image = globalBestSSWEIGHTfile;
      }
      addStatusInfo("Done.");
      return true;
}

function updateSectionsInTreeBoxNode(node)
{
      if (node.numberOfChildren == 0) {
            return;
      } else {
            if (typeof node.text === "function") {
                  var txt = node.text(0);
                  var is_monochrome_txt = txt.search(monochrome_text) != -1;
                  if (par.monochrome_image.val) {
                        if (!is_monochrome_txt) {
                              node.setText(0, monochrome_text + txt);
                        }
                  } else {
                        if (is_monochrome_txt) {
                              node.setText(0, txt.replace(monochrome_text, ""));
                        }
                  }
            }
            for (var i = 0; i < node.numberOfChildren; i++) {
                  updateSectionsInTreeBoxNode(node.child(i));
            }
      }
}

function updateSectionsInTreeBox(node)
{
      if (node.numberOfChildren == 0) {
            return;
      } else {
            updateSectionsInTreeBoxNode(node);
      }
}

function getTreeBoxNodeFileCount(node)
{
      if (node.numberOfChildren == 0) {
            return 1;
      } else {
            var cnt = 0;
            for (var i = 0; i < node.numberOfChildren; i++) {
                  cnt = cnt + getTreeBoxNodeFileCount(node.child(i));
            }
            return cnt;
      }
}

function getTreeBoxFileCount(node)
{
      if (node.numberOfChildren == 0) {
            return 0;
      } else {
            return getTreeBoxNodeFileCount(node);
      }
}

function checkAllTreeBoxNodeFiles(node)
{
      if (node.numberOfChildren == 0) {
            node.checked = true;
      } else {
            for (var i = 0; i < node.numberOfChildren; i++) {
                  checkAllTreeBoxNodeFiles(node.child(i));
            }
      }
}
function checkAllTreeBoxFiles(node)
{
      if (node.numberOfChildren == 0) {
            return 0;
      } else {
            return checkAllTreeBoxNodeFiles(node);
      }
}

function setTreeBoxNodeSsweight(node, filename, ssweight, filename_postfix)
{
      if (node.numberOfChildren == 0) {
            if (compareReferenceFileNames(filename, node.filename, filename_postfix)) {
                  node.ssweight = ssweight;
                  updateTreeBoxNodeToolTip(node);
                  return true;
            }
      } else {
            for (var i = 0; i < node.numberOfChildren; i++) {
                  if (setTreeBoxNodeSsweight(node.child(i), filename, ssweight, filename_postfix)) {
                        return true;
                  }
            }
      }
      return false;
}

function getTreeBoxNodeFileNamesCheckedIf(node, filenames, checked)
{
      if (node.numberOfChildren == 0) {
            if (node.checked == checked) {
                  filenames[filenames.length] = node.filename;
            }
      } else {
            for (var i = 0; i < node.numberOfChildren; i++) {
                  getTreeBoxNodeFileNamesCheckedIf(node.child(i), filenames, checked);
            }
      }
}

function getTreeBoxNodeFiles(node, treeboxfiles)
{
      if (node.numberOfChildren == 0) {
            if (node.lightsnode) {
                  treeboxfiles[treeboxfiles.length] = [ node.filename, node.checked, node.ssweight, node.best_image, node.reference_image ];
            } else {
                  treeboxfiles[treeboxfiles.length] = [ node.filename, node.checked ];
            }
      } else {
            for (var i = 0; i < node.numberOfChildren; i++) {
                  getTreeBoxNodeFiles(node.child(i), treeboxfiles);
            }
      }
}

function getTreeBoxNodeCheckedFileNames(node, filenames)
{
      if (node.numberOfChildren == 0) {
            if (node.checked) {
                  filenames[filenames.length] = node.filename;
            }
      } else {
            for (var i = 0; i < node.numberOfChildren; i++) {
                  getTreeBoxNodeCheckedFileNames(node.child(i), filenames);
            }
      }
}

function findFileFromTreeBox(node, filename)
{
      if (node.numberOfChildren == 0) {
            if (node.filename == filename) {
                  return true;
            }
      } else {
            for (var i = 0; i < node.numberOfChildren; i++) {
                  if (findFileFromTreeBox(node.child(i), filename)) {
                        return true;
                  }
            }
      }
      return false;
}

function setExpandedTreeBoxNode(node, expanded)
{
      if (node.numberOfChildren > 0) {
            for (var i = 0; i < node.numberOfChildren; i++) {
                  if (node.collapsable) {
                        node.expanded = expanded;
                  }
                  setExpandedTreeBoxNode(node.child(i), expanded);
            }
      }
}

function filterTreeBoxFiles(parent, pageIndex)
{
      console.show();
      var treebox = parent.treeBox[pageIndex];
      if (treebox.numberOfChildren == 0) {
            console.writeln("filterTreeBoxFiles, no files");
            return;
      }

      addStatusInfo("Filtering...");

      console.writeln("filterTreeBoxFiles " + pageIndex);

      var checked_files = [];
      var unchecked_files = [];

      getTreeBoxNodeFileNamesCheckedIf(treebox, checked_files, true);
      getTreeBoxNodeFileNamesCheckedIf(treebox, unchecked_files, false);

      // get treeboxfiles which is array of [ filename, checked, weight ]
      // sorted by weight
      var treeboxfiles = SubframeSelectorMeasure(checked_files, true, true);

      // add old unchecked files
      filenamesToTreeboxfiles(treeboxfiles, unchecked_files, false);

      console.writeln("filterTreeBoxFiles " + treeboxfiles.length + " files");

      // remove old files
      parent.treeBox[pageIndex].clear();

      // add new filtered file list
      addFilesToTreeBox(parent, pageIndex, treeboxfiles);

      console.writeln("filterTreeBoxFiles, addFilesToTreeBox done");

      var checked_count = 0;
      for (var i = 0; i < treeboxfiles.length; i++) {
            if (treeboxfiles[i][1]) {
                  checked_count++;
            }
      }

      console.noteln("AutoIntegrate filtering completed, " + checked_count + " checked, " + (treeboxfiles.length - checked_count) + " unchecked");
      updateStatusInfoLabel("Filtering completed");
}

function getFilesFromTreebox(parent)
{
      for (var pageIndex = 0; pageIndex < parent.treeBox.length; pageIndex++) {
            var treeBox = parent.treeBox[pageIndex];
            if (treeBox.numberOfChildren == 0) {
                  var filenames = null;
            } else {
                  var filenames = [];
                  getTreeBoxNodeCheckedFileNames(treeBox, filenames);
            }

            switch (pageIndex) {
                  case pages.LIGHTS:
                        lightFileNames = filenames;
                        break;
                  case pages.BIAS:
                        biasFileNames = filenames;
                        break;
                  case pages.DARKS:
                        darkFileNames = filenames;
                        break;
                  case pages.FLATS:
                        flatFileNames = filenames;
                        break;
                  case pages.FLAT_DARKS:
                        flatdarkFileNames = filenames;
                        break;
                  default:
                        throwFatalError("getFilesFromTreebox bad pageIndex " + pageIndex);
            }
      }
}

function getNewTreeBoxFiles(parent, pageIndex, imageFileNames)
{
      console.writeln("getNewTreeBoxFiles " + pageIndex);

      var treeBox = parent.treeBox[pageIndex];
      var treeboxfiles = [];

      if (treeBox.numberOfChildren > 0) {
            getTreeBoxNodeFiles(treeBox, treeboxfiles);
      }

      for (var i = 0; i < imageFileNames.length; i++) {
            var obj = imageFileNames[i];
            if (Array.isArray(obj)) {
                  // we have treeboxfiles array
                  treeboxfiles[treeboxfiles.length] = obj;
            } else {
                  // we have file name list
                  treeboxfiles[treeboxfiles.length] = [ obj, true, 0 ];
            }
      }
      return treeboxfiles;
}

// in newImageFileNames we have file name list or
// treeboxfiles which is array of [ filename, checked, weight ]
function addFilteredFilesToTreeBox(parent, pageIndex, newImageFileNames)
{
      console.writeln("addFilteredFilesToTreeBox " + pageIndex);

      // ensure we have treeboxfiles which is array of [ filename, checked, weight, best_image, reference_image ]
      var treeboxfiles = getNewTreeBoxFiles(parent, pageIndex, newImageFileNames);

      var filteredFiles = getFilterFiles(treeboxfiles, pageIndex, '');
      var files_TreeBox = parent.treeBox[pageIndex];
      files_TreeBox.clear();

      var rootnode = new TreeBoxNode(files_TreeBox);
      rootnode.expanded = true;
      if (filteredFiles.error_text != "") {
            rootnode.useRichText = true;
            var errortxt = "Files grouped by filter: " + filteredFiles.error_text;
            var font = rootnode.font( 0 );
            font.bold = true
            rootnode.setFont( 0, font );
            rootnode.setText( 0, errortxt);
      } else {
            rootnode.setText( 0, "Files grouped by filter" );
      }
      rootnode.nodeData_type = "FrameGroup";
      rootnode.collapsable = false;

      files_TreeBox.canUpdate = false;

      console.writeln("addFilteredFilesToTreeBox " + filteredFiles.allfilesarr.length + " files");

      var preview_file_name = null;
      var preview_file_filter = null;
      var filename_best_image = null;

      for (var i = 0; i < filteredFiles.allfilesarr.length; i++) {

            var filterFiles = filteredFiles.allfilesarr[i].files;
            var filterName = filteredFiles.allfilesarr[i].filter;

            if (filterFiles.length > 0) {
                  console.writeln("addFilteredFilesToTreeBox filterName " + filterName + ", " + filterFiles.length + " files");

                  var filternode = new TreeBoxNode(rootnode);
                  filternode.expanded = true;
                  filternode.setText( 0, filterName +  ' (' + filterFiles[0].filter + ') ' + filterFiles.length + ' files');
                  filternode.nodeData_type = "FrameGroup";
                  filternode.collapsable = true;

                  for (var j = 0; j < filterFiles.length; j++) {
                        if (findFileFromTreeBox(files_TreeBox, filterFiles[j].name)) {
                              console.writeln("Skipping duplicate file " + filterFiles[j].name);
                              continue;
                        }
                        var node = new TreeBoxNode(filternode);
                        var txt = File.extractName(filterFiles[j].name) + File.extractExtension(filterFiles[j].name);
                        if (pageIndex == pages.LIGHTS && par.monochrome_image.val) {
                              node.setText(0, monochrome_text + txt);
                        } else {
                              node.setText(0, txt);
                        }
                        node.filename = filterFiles[j].name;
                        node.nodeData_type = "";
                        node.checkable = true;
                        node.checked = filterFiles[j].checked;
                        node.collapsable = false;
                        node.ssweight = filterFiles[j].ssweight;
                        node.exptime = filterFiles[j].exptime;
                        node.filter = filterFiles[j].filter;
                        node.best_image = filterFiles[j].best_image;
                        node.reference_image = filterFiles[j].reference_image;
                        if (pageIndex == pages.LIGHTS) {
                              node.lightsnode = true;
                        } else {
                              node.lightsnode = false;
                        }
                        updateTreeBoxNodeToolTip(node);
                        if (pageIndex == pages.LIGHTS && filterFiles[j].name.indexOf("best_image") != -1) {
                              filename_best_image = filterFiles[j].name;
                        }
                        if (use_preview && preview_file_name == null) {
                              if (!is_some_preview || pageIndex == pages.LIGHTS) {
                                    preview_file_name = node.filename;
                                    preview_file_filter = node.filter;
                              }
                        }
                  }
            }
      }
      files_TreeBox.canUpdate = true;

      if (pageIndex == pages.LIGHTS) {
            if (user_selected_best_image != null) {
                  setBestImageInTreeBox(parent, parent.treeBox[pages.LIGHTS], user_selected_best_image, "");
            } else if (filename_best_image != null) {
                  setBestImageInTreeBox(parent, parent.treeBox[pages.LIGHTS], filename_best_image, "");
            }
            for (var i = 0; i < user_selected_reference_image.length; i++)  {
                  setReferenceImageInTreeBox(
                        parent, 
                        parent.treeBox[pages.LIGHTS], 
                        user_selected_reference_image[i][0],
                        "",
                        user_selected_reference_image[i][1]);
            }
      }

      if (preview_file_name != null) {
            updatePreviewFilename(preview_file_name, true);
            current_selected_file_name = preview_file_name;
            current_selected_file_filter = preview_file_filter;
            updateStatusInfoLabel("");
      }
}

function addUnfilteredFilesToTreeBox(parent, pageIndex, newImageFileNames)
{
      console.writeln("addUnfilteredFilesToTreeBox " + pageIndex);

      var files_TreeBox = parent.treeBox[pageIndex];
      files_TreeBox.clear();

      var treeboxfiles = getNewTreeBoxFiles(parent, pageIndex, newImageFileNames);

      files_TreeBox.canUpdate = false;
      for (var i = 0; i < treeboxfiles.length; i++) {
            if (findFileFromTreeBox(files_TreeBox, treeboxfiles[i][0])) {
                  console.writeln("Skipping duplicate file " + treeboxfiles[i][0]);
                  continue;
            }
            var node = new TreeBoxNode(files_TreeBox);
            node.setText(0, File.extractName(treeboxfiles[i][0]) + File.extractExtension(treeboxfiles[i][0]));
            node.setToolTip(0, treeboxfiles[i][0]);
            node.filename = treeboxfiles[i][0];
            node.nodeData_type = "";
            node.checkable = true;
            node.checked = treeboxfiles[i][1];
            node.collapsable = false;
            node.filter = '';
            node.best_image = false;
            node.reference_image = false;
}
      files_TreeBox.canUpdate = true;
}

function addFilesToTreeBox(parent, pageIndex, imageFileNames)
{
      switch (pageIndex) {
            case pages.LIGHTS:
            case pages.FLATS:
                  addFilteredFilesToTreeBox(parent, pageIndex, imageFileNames);
                  break;
            case pages.BIAS:
            case pages.DARKS:
            case pages.FLAT_DARKS:
                  addUnfilteredFilesToTreeBox(parent, pageIndex, imageFileNames);
                  break;
            default:
                  throwFatalError("addFilesToTreeBox bad pageIndex " + pageIndex);
      }
}

function loadJsonFile(parent)
{
      console.writeln("loadJsonFile");
      var pagearray = openImageFiles("Json", false, true);
      if (pagearray == null) {
            return;
      }
      // page array of treebox files names
      for (var i = 0; i < pagearray.length; i++) {
            if (pagearray[i] != null) {
                  addFilesToTreeBox(parent, i, pagearray[i]);
            }
      }
      updateInfoLabel(parent);
}

function addOneFilesButton(parent, filetype, pageIndex, toolTip)
{
      var filesAdd_Button = new PushButton( parent );
      parent.rootingArr.push(filesAdd_Button);
      filesAdd_Button.text = filetype;
      filesAdd_Button.icon = parent.scaledResource( ":/icons/add.png" );
      filesAdd_Button.toolTip = toolTip;
      filesAdd_Button.onClick = function()
      {
            var pagearray = openImageFiles(filetype, false, false);
            if (pagearray == null) {
                  return;
            }
            if (pagearray.length == 1) {
                  // simple list of file names
                  var imageFileNames = pagearray[0];
                  if (pageIndex == pages.LIGHTS && !par.skip_autodetect_imagetyp.val) {
                        var imagetypes = getImagetypFiles(imageFileNames);
                        for (var i = 0; i < pages.END; i++) {
                              if (imagetypes[i].length > 0) {
                                    addFilesToTreeBox(parent, i, imagetypes[i]);
                              }
                        }
                  } else {
                        addFilesToTreeBox(parent, pageIndex, imageFileNames);
                  }
            } else {
                  // page array of treebox files names
                  for (var i = 0; i < pagearray.length; i++) {
                        if (pagearray[i] != null) {
                              addFilesToTreeBox(parent, i, pagearray[i]);
                        }
                  }
            }
            updateInfoLabel(parent);
            parent.tabBox.currentPageIndex = pageIndex;
      };
      return filesAdd_Button;
}

function addTargetType(parent)
{
      var lbl = new Label( parent );
      parent.rootingArr.push(lbl);
      lbl.text = "Target type";
      lbl.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      lbl.toolTip = "<p>Give target type.</p>" +
                    "<p>If target type is given then image stretching settings are selected automatically.</p>" +
                    "<p>If no target type is given then current settings are used. They should work reasonably fine in many cases.</p>";
      var galaxyCheckBox = newCheckBox(parent, "Galaxy", par.target_type_galaxy, "<p>Target is galaxy. Works well when target is a lot brighter than the background.</p>" );
      var nebulaCheckBox = newCheckBox(parent, "Nebula", par.target_type_nebula, "<p>Target is nebula. Works well when target fills the whole image or is not much brighter than the background.</p>" );
      
      var outputdir_Sizer = new HorizontalSizer;
      outputdir_Sizer.spacing = 4;
      outputdir_Sizer.add( lbl );
      outputdir_Sizer.add( galaxyCheckBox );
      outputdir_Sizer.add( nebulaCheckBox );

      return outputdir_Sizer;
}


function addFilesButtons(parent)
{
      var addLightsButton = addOneFilesButton(parent, "Lights", pages.LIGHTS, parent.filesToolTip[pages.LIGHTS]);
      var addBiasButton = addOneFilesButton(parent, "Bias", pages.BIAS, parent.filesToolTip[pages.BIAS]);
      var addDarksButton = addOneFilesButton(parent, "Darks", pages.DARKS, parent.filesToolTip[pages.DARKS]);
      var addFlatsButton = addOneFilesButton(parent, "Flats", pages.FLATS, parent.filesToolTip[pages.FLATS]);
      var addFlatDarksButton = addOneFilesButton(parent, "Flat Darks", pages.FLAT_DARKS, parent.filesToolTip[pages.FLAT_DARKS]);

      var target_type_sizer = addTargetType(parent);

      var winprefix_sizer = addWinPrefix(parent);
      var outputdir_sizer = addOutputDir(parent);

      var filesButtons_Sizer = new HorizontalSizer;
      parent.rootingArr.push(filesButtons_Sizer);
      filesButtons_Sizer.spacing = 4;
      filesButtons_Sizer.add( addLightsButton );
      filesButtons_Sizer.add( addBiasButton );
      filesButtons_Sizer.add( addDarksButton );
      filesButtons_Sizer.add( addFlatsButton );
      filesButtons_Sizer.add( addFlatDarksButton );
      filesButtons_Sizer.addSpacing( 12 );
      filesButtons_Sizer.add( target_type_sizer );
      filesButtons_Sizer.addStretch();
      filesButtons_Sizer.addSpacing( 12 );
      filesButtons_Sizer.add( winprefix_sizer );
      filesButtons_Sizer.add( outputdir_sizer );
      return filesButtons_Sizer;
}

function addOneFileManualFilterButton(parent, filetype, pageIndex)
{
      var filesAdd_Button = new PushButton( parent );
      parent.rootingArr.push(filesAdd_Button);
      filesAdd_Button.text = filetype;
      filesAdd_Button.icon = parent.scaledResource( ":/icons/add.png" );
      if (filetype == 'C') {
            filesAdd_Button.toolTip = "Add color/OSC/DSLR files";
      } else {
            filesAdd_Button.toolTip = "Add " + filetype + " files";
      }
      filesAdd_Button.onClick = function() {
            var imageFileNames = openImageFiles(filetype, true, false);
            if (imageFileNames != null) {
                  var filterSet;
                  switch (pageIndex) {
                        case pages.LIGHTS:
                              if (lightFilterSet == null) {
                                    lightFilterSet = initFilterSets();
                              }
                              filterSet = findFilterSet(lightFilterSet, filetype);
                              break;
                        case pages.FLATS:
                              if (flatFilterSet == null) {
                                    flatFilterSet = initFilterSets();
                              }
                              filterSet = findFilterSet(flatFilterSet, filetype);
                              break;
                        default:
                              throwFatalError("addOneFileManualFilterButton bad pageIndex " + pageIndex);
                  }
                  console.writeln("addOneFileManualFilterButton add " + filetype + " files");
                  for (var i = 0; i < imageFileNames.length; i++) {
                        addFilterSetFile(filterSet, imageFileNames[i], filetype);
                  }
                  addFilesToTreeBox(parent, pageIndex, imageFileNames);
                  updateInfoLabel(parent);
            }
      };
      return filesAdd_Button;
}

function addFileFilterButtons(parent, pageIndex)
{
      var buttonsControl = new Control(parent);
      buttonsControl.sizer = new HorizontalSizer;
      buttonsControl.sizer.add(addOneFileManualFilterButton(parent, 'L', pageIndex));
      buttonsControl.sizer.add(addOneFileManualFilterButton(parent, 'R', pageIndex));
      buttonsControl.sizer.add(addOneFileManualFilterButton(parent, 'G', pageIndex));
      buttonsControl.sizer.add(addOneFileManualFilterButton(parent, 'B', pageIndex));
      buttonsControl.sizer.add(addOneFileManualFilterButton(parent, 'H', pageIndex));
      buttonsControl.sizer.add(addOneFileManualFilterButton(parent, 'S', pageIndex));
      buttonsControl.sizer.add(addOneFileManualFilterButton(parent, 'O', pageIndex));
      buttonsControl.sizer.add(addOneFileManualFilterButton(parent, 'C', pageIndex));
      buttonsControl.visible = false;
      return buttonsControl;
}

function addFileFilterButtonSectionBar(parent, pageIndex)
{
      var control = addFileFilterButtons(parent, pageIndex);

      var sb = new SectionBar(parent, "Add filter files manually");
      parent.rootingArr.push(sb);
      sb.setSection(control);
      sb.hide();
      sb.toolTip = "Select manually files for each filter. Useful if filters are not recognized automatically.";
      sb.onToggleSection = function(bar, beginToggle){
            parent.adjustToContents();
      };

      filterSectionbars[pageIndex] = sb;
      filterSectionbarcontrols[pageIndex] = control;

      var gb = new Control( parent );
      parent.rootingArr.push(gb);
      gb.sizer = new VerticalSizer;
      gb.sizer.add( sb );
      gb.sizer.add( control );

      return gb;
}

function blink_x(imageWindow, x)
{
      var overflow = false;
      var imageWidth = imageWindow.mainView.image.width;
      var viewportWidth = imageWindow.visibleViewportRect.width;
      var viewportWidth = imageWindow.width;
      var point_x = (imageWidth / 2) - (viewportWidth / 2) + (viewportWidth / 2) * (blink_zoom_x + x);
      if (point_x < 0) {
            point_x = 0;
            overflow = true;
      } else if (point_x > imageWidth) {
            point_x = imageWidth;
            overflow = true;
      }
      return { x: point_x, overflow: overflow, imageWidth: imageWidth, viewportWidth: viewportWidth};
}

function blink_y(imageWindow, y)
{
      var overflow = false;
      var imageHeight = imageWindow.mainView.image.height;
      var viewportHeight = imageWindow.visibleViewportRect.height;
      var viewportHeight = imageWindow.height;
      var point_y = (imageHeight) / 2 - (viewportHeight / 2) + (viewportHeight / 2) * (blink_zoom_y + y);
      if (point_y < 0) {
            point_y = 0;
            overflow = true;
      } else if (point_y > imageHeight) {
            point_y = imageHeight;
            overflow = true;
      }
      return { y: point_y, overflow: overflow, imageHeight: imageHeight, viewportHeight: viewportHeight};
}

function inside_image(imageWindow, x, y)
{
      var new_x = blink_x(imageWindow, x);
      if (new_x.overflow) {
            return false;
      }
      var new_y = blink_y(imageWindow, y);
      if (new_y.overflow) {
            return false;
      }
      return true;
}

function blinkWindowZoomedUpdate(imageWindow, x, y)
{
      console.writeln("blinkWindowZoomedUpdate, x=" + x + ", y=" + y);

      if (inside_image(imageWindow, 0, 0) || inside_image(imageWindow, x, y)) {
            // old or new position is inside image, update position
            blink_zoom_x = blink_zoom_x + x;
            blink_zoom_y = blink_zoom_y + y;
            console.writeln("blinkWindowZoomedUpdate, new blink_zoom_x=" + blink_zoom_x + ", blink_zoom_y=" + blink_zoom_y);
      } else {
            console.writeln("blinkWindowZoomedUpdate, use old blink_zoom_x=" + blink_zoom_x + ", blink_zoom_y=" + blink_zoom_y);
      }

      var point_x = blink_x(imageWindow, 0);
      var point_y = blink_y(imageWindow, 0);

      console.writeln("blinkWindowZoomedUpdate, image.width=" + point_x.imageWidth + ", image.height=" + point_y.imageHeight);
      console.writeln("blinkWindowZoomedUpdate, viewportWidth=" + point_x.viewportWidth + ", viewportHeight=" + point_y.viewportHeight);

      console.writeln("blinkWindowZoomedUpdate, point_x=" + point_x.x + ", point_y=" + point_y.y);
      
      var center = new Point(point_x.x, point_y.y);
      
      imageWindow.zoomFactor = 1;
      imageWindow.viewportPosition = center;
}

function filesTreeBox(parent, optionsSizer, pageIndex)
{
      parent.treeBoxRootingArr[pageIndex] = [];

      /* Tree box to show files. */
      var files_TreeBox = new TreeBox( parent );
      parent.rootingArr.push(files_TreeBox);
      files_TreeBox.multipleSelection = true;
      files_TreeBox.rootDecoration = false;
      files_TreeBox.alternateRowColor = true;
      // files_TreeBox.setScaledMinSize( 300, 150 );
      files_TreeBox.setScaledMinSize( 150, 150 );
      files_TreeBox.numberOfColumns = 1;
      files_TreeBox.headerVisible = false;
      files_TreeBox.onCurrentNodeUpdated = () =>
      {
            if (par.skip_blink.val) {
                  return;
            }
            try {
                  if (files_TreeBox.currentNode != null && files_TreeBox.currentNode.nodeData_type == "") {
                        // Show preview or "blink" window. 
                        // Note: Files are added by routine addFilteredFilesToTreeBox
                        if (!use_preview) {
                              console.hide();
                        } else {
                              updatePreviewTxt("Processing...");
                        }
                        var imageWindows = ImageWindow.open(files_TreeBox.currentNode.filename);
                        if (imageWindows == null || imageWindows.length != 1) {
                              return;
                        }
                        var imageWindow = imageWindows[0];
                        if (!use_preview) {
                              if (blink_window != null) {
                                    imageWindow.position = blink_window.position;
                              } else {
                                    imageWindow.position = new Point(0, 0);
                              }
                        }
                        if (files_TreeBox.currentNode.hasOwnProperty("ssweight")) {
                              if (files_TreeBox.currentNode.ssweight == 0) {
                                    var ssweighttxt = "";
                              } else {
                                    var ssweighttxt = " ssweight: " + files_TreeBox.currentNode.ssweight.toFixed(5);
                              }
                        } else {
                              var ssweighttxt = "";
                        }
                        if (files_TreeBox.currentNode.hasOwnProperty("exptime")) {
                              var exptimetxt = " exptime: " + files_TreeBox.currentNode.exptime;
                        } else {
                              var exptimetxt = "";
                        }
                        var imageInfoTxt = "Size: " + imageWindow.mainView.image.width + "x" + imageWindow.mainView.image.height +
                                             ssweighttxt + exptimetxt;
                        runHistogramTransformSTFex(imageWindow, null, imageWindow.mainView.image.isColor, DEFAULT_AUTOSTRETCH_TBGND, true);
                        if (!use_preview) {
                              updateImageInfoLabel(imageInfoTxt);
                              if (blink_zoom) {
                                    blinkWindowZoomedUpdate(imageWindow, 0, 0);
                              }
                              imageWindow.show();
                              if (blink_window != null) {
                                    blink_window.forceClose();
                              }
                              blink_window = imageWindow;
                        } else {
                              updatePreviewWin(imageWindow);
                              updateStatusInfoLabel(imageInfoTxt);
                              imageWindow.forceClose();
                              if (use_preview && !ppar.side_preview_visible && mainTabBox != null) {
                                    mainTabBox.currentPageIndex = 1;
                              }
                        }
                        current_selected_file_name = files_TreeBox.currentNode.filename;
                        current_selected_file_filter = files_TreeBox.currentNode.filter;
                  }
            } catch(err) {
                  console.show();
                  console.criticalln(err);
            }
      }
      parent.treeBox[pageIndex] = files_TreeBox;

      var filesControl = new Control(parent);
      parent.rootingArr.push(filesControl);
      filesControl.sizer = new VerticalSizer;
      filesControl.sizer.add(files_TreeBox);
      filesControl.sizer.addSpacing( 4 );
      let obj = newPageButtonsSizer(parent);
      parent.rootingArr.push(obj);
      filesControl.sizer.add(obj);
      if (pageIndex == pages.LIGHTS || pageIndex == pages.FLATS) {
            let obj = addFileFilterButtonSectionBar(parent, pageIndex);
            parent.rootingArr.push(obj);
            filesControl.sizer.add(obj);
      }

      var files_GroupBox = new GroupBox( parent );
      files_GroupBox.sizer = new HorizontalSizer;
      files_GroupBox.sizer.spacing = 4;
      files_GroupBox.sizer.add( filesControl, parent.textEditWidth );
      files_GroupBox.sizer.add( optionsSizer );

      return files_GroupBox;
}

function appendInfoTxt(txt, cnt, type)
{
      if (cnt == 0) {
            return txt;
      }
      var newtxt = cnt + " " + type + " files";
      if (txt == "") {
            return newtxt;
      } else {
            return txt + ", " + newtxt;
      }
}

function updateInfoLabel(parent)
{
      saved_measurements = null;    // files changed, we need to make new measurements

      var txt = "";
      txt = appendInfoTxt(txt, getTreeBoxFileCount(parent.treeBox[pages.LIGHTS]), "light");
      txt = appendInfoTxt(txt, getTreeBoxFileCount(parent.treeBox[pages.BIAS]), "bias");
      txt = appendInfoTxt(txt, getTreeBoxFileCount(parent.treeBox[pages.DARKS]), "dark");
      txt = appendInfoTxt(txt, getTreeBoxFileCount(parent.treeBox[pages.FLATS]), "flat");
      txt = appendInfoTxt(txt, getTreeBoxFileCount(parent.treeBox[pages.FLAT_DARKS]), "flat dark");

      console.writeln(txt);

      infoLabel.text = txt;
}

function updateStatusInfoLabel(txt)
{
      if (txt.length > 100) {
            txt = txt.substring(0, 100);
      }
      if (tabStatusInfoLabel != null) {
            tabStatusInfoLabel.text = txt;
      }
      if (use_preview && sideStatusInfoLabel != null) {
            sideStatusInfoLabel.text = txt;
      }
}

function updateImageInfoLabel(txt)
{
      console.writeln(txt);

      imageInfoLabel.text = txt;
}

function mapBadChars(str)
{
      str = str.replace(/ /g,"_");
      str = str.replace(/-/g,"_");
      str = str.replace(/,/g,"_");
      return str;
}

// Write default parameters to process icon
function saveParametersToProcessIcon()
{
      console.writeln("saveParametersToProcessIcon");
      for (let x in par) {
            var param = par[x];
            if (param.val != param.def) {
                  var name = mapBadChars(param.name);
                  console.writeln(name + "=" + param.val);
                  Parameters.set(name, param.val);
            }
      }
}

// Read default parameters from process icon
function readParametersFromProcessIcon() 
{
      if (do_not_read_settings) {
            console.writeln("Use default settings, do not read parameter values from process icon");
            return;
      }
      console.writeln("readParametersFromProcessIcon");
      for (let x in par) {
            var param = par[x];
            var name = mapBadChars(param.name);
            if (Parameters.has(name)) {
                  switch (param.type) {
                        case 'S':
                              param.val = Parameters.getString(name);
                              console.writeln(name + "=" + param.val);
                              break;
                        case 'B':
                              param.val = Parameters.getBoolean(name);
                              console.writeln(name + "=" + param.val);
                              break;
                        case 'I':
                              param.val = Parameters.getInteger(name);
                              console.writeln(name + "=" + param.val);
                              break;
                        case 'R':
                              param.val = Parameters.getReal(name);
                              console.writeln(name + "=" + param.val);
                              break;
                        default:
                              throwFatalError("Unknown type '" + param.type + '" for parameter ' + name);
                              break;
                  }
            }
      }
}

function setParameterDefaults()
{
      console.writeln("setParameterDefaults");
      for (let x in par) {
            var param = par[x];
            param.val = param.def;
            if (param.reset != undefined) {
                  param.reset();
            }
      }
}

// Save default parameters to persistent module settings
function saveParametersToPersistentModuleSettings()
{
      if (do_not_write_settings) {
            console.writeln("Do not save parameter values persistent module settings");
            return;
      }
      console.writeln("saveParametersToPersistentModuleSettings");
      for (let x in par) {
            var param = par[x];
            var name = SETTINGSKEY + '/' + mapBadChars(param.name);
            if (param.val != param.def) {
                  // not a default value, save setting
                  console.writeln("AutoIntegrate: save to settings " + name + "=" + param.val);
                  switch (param.type) {
                        case 'S':
                              Settings.write(name, DataType_String, param.val);
                              break;
                        case 'B':
                              Settings.write(name, DataType_Boolean, param.val);
                              break;
                        case 'I':
                              Settings.write(name, DataType_Int32, param.val);
                              break;
                        case 'R':
                              Settings.write(name, DataType_Real32, param.val);
                              break;
                        default:
                              throwFatalError("Unknown type '" + param.type + '" for parameter ' + name);
                              break;
                  }
            } else {
                  // default value, remove possible setting
                  Settings.remove(name);
            }
      }
}

// Read default parameters from persistent module settings
function ReadParametersFromPersistentModuleSettings()
{
      if (do_not_read_settings) {
            console.writeln("Use default settings, do not read parameter values from persistent module settings");
            return;
      }
      if (!ai_use_persistent_module_settings) {
            console.writeln("skip ReadParametersFromPersistentModuleSettings");
            return;
      }
      console.writeln("ReadParametersFromPersistentModuleSettings");
      for (let x in par) {
            var param = par[x];
            var name = SETTINGSKEY + '/' + mapBadChars(param.name);
            switch (param.type) {
                  case 'S':
                        var tempSetting = Settings.read(name, DataType_String);
                        break;
                  case 'B':
                        var tempSetting = Settings.read(name, DataType_Boolean);
                        break;
                  case 'I':
                        var tempSetting = Settings.read(name, DataType_Int32);
                        break;
                  case 'R':
                        var tempSetting = Settings.read(name, DataType_Real32);
                        break;
                  default:
                        throwFatalError("Unknown type '" + param.type + '" for parameter ' + name);
                        break;
            }
            if (Settings.lastReadOK) {
                  console.writeln("AutoIntegrate: read from settings " + name + "=" + tempSetting);
                  param.val = tempSetting;
            }
      }
}

function newPushorToolButton(parent, icon, txt, tooltip, action, toolbutton)
{
      if (toolbutton) {
            var button = new ToolButton( parent );
      } else {
            var button = new PushButton( parent );
            button.text = txt;
      }
      button.onClick = action;
      button.icon = parent.scaledResource( icon );
      button.toolTip = tooltip;

      return button;
}

function newRunButton(parent, toolbutton)
{
      var run_action = function()
      {
            exitFromDialog();
            if (ai_get_process_defaults) {
                  getProcessDefaultValues();
                  return;
            }     
            updateWindowPrefix();
            getFilesFromTreebox(parent.dialog);
            haveIconized = 0;
            var index = findPrefixIndex(ppar.win_prefix);
            if (index == -1) {
                  index = findNewPrefixIndex(ppar.userColumnCount == -1);
            }
            if (ppar.userColumnCount == -1) {
                  columnCount = ppar.prefixArray[index][0];
                  console.writeln('Using auto icon column ' + columnCount);
            } else {
                  columnCount = ppar.userColumnCount;
                  console.writeln('Using user icon column ' + columnCount);
            }
            iconStartRow = 0;
            write_processing_log_file = true;
            Autorun(parent);
            if (haveIconized) {
                  // We have iconized something so update prefix array
                  ppar.prefixArray[index] = [ columnCount, ppar.win_prefix, haveIconized ];
                  fix_win_prefix_array();
                  if (ppar.userColumnCount != -1 && par.use_manual_icon_column.val) {
                        ppar.userColumnCount = columnCount + 1;
                        parent.dialog.columnCountControlComboBox.currentItem = ppar.userColumnCount + 1;
                  }
                  savePersistentSettings(false);
            }
      };
      return newPushorToolButton(
                  parent,
                  ":/icons/power.png",
                  "Run",
                  "Run the script.",
                  run_action,
                  toolbutton
      );
}

function newExitButton(parent, toolbutton)
{
      var exit_action = function()
      {
            console.noteln("AutoIntegrate exiting");
            // save settings at the end
            savePersistentSettings(true);
            exitFromDialog();
            close_undo_images(parent.dialog);
            exitCleanup(parent.dialog);
            console.noteln("Close dialog");
            parent.dialog.cancel();
      };

      return newPushorToolButton(
                  parent,
                  ":/icons/close.png",
                  "Exit",
                  "<p>Exit the script and save interface settings.</p>" + 
                  "<p>Note that closing the script from top right corner close icon does not save interface settings.</p>",
                  exit_action,
                  toolbutton
      );
}

function newAutoContinueButton(parent, toolbutton)
{
      var autocontinue_action = function()
      {
            exitFromDialog();
            console.writeln("autoContinue");

            // Do not create subdirectory structure with AutoContinue

            clearDefaultDirs();
            getFilesFromTreebox(parent.dialog);
            batch_narrowband_palette_mode = isbatchNarrowbandPaletteMode();
            haveIconized = 0;
            write_processing_log_file = true;
            try {
                  updateWindowPrefix();
                  autocontinue_narrowband = is_narrowband_option();
                  run_auto_continue = true;
                  if (batch_narrowband_palette_mode) {
                        AutoIntegrateNarrowbandPaletteBatch(parent.dialog, true);
                  } else {
                        var index = findPrefixIndex(ppar.win_prefix);
                        if (index == -1) {
                              iconStartRow = 0;
                              index = findNewPrefixIndex(ppar.userColumnCount == -1);
                        } else {
                              // With AutoContinue start icons below current
                              // icons.
                              iconStartRow = ppar.prefixArray[index][2];
                        }
                        if (ppar.userColumnCount == -1) {
                              columnCount = ppar.prefixArray[index][0];
                              console.writeln('Using auto icon column ' + columnCount);
                        } else {
                              columnCount = ppar.userColumnCount;
                              iconStartRow = 11;
                              console.writeln('Using user icon column ' + columnCount);
                        }
                        AutoIntegrateEngine(parent.dialog, true);
                  }
                  autocontinue_narrowband = false;
                  run_auto_continue = false;
                  setDefaultDirs();
                  update_extra_target_image_window_list(parent.dialog, null);
                  if (haveIconized && !batch_narrowband_palette_mode) {
                        // We have iconized something so update prefix array
                        ppar.prefixArray[index] = [ columnCount, ppar.win_prefix, Math.max(haveIconized, iconStartRow) ];
                        fix_win_prefix_array();
                        //parent.columnCountControlComboBox.currentItem = columnCount + 1;
                        savePersistentSettings(false);
                  }
            }
            catch(err) {
                  console.criticalln(err);
                  console.criticalln("Processing stopped!");
                  writeProcessingSteps(null, true, null);
                  autocontinue_narrowband = false;
                  run_auto_continue = false;
                  setDefaultDirs();
                  fix_win_prefix_array();
            }
      };

      return newPushorToolButton(
            parent,
            ":/icons/goto-next.png",
            "AutoContinue",
            "AutoContinue - Run automatic processing from previously created LRGB, narrowband or Color images." +
            "<p>" +
            "Image check order is:<br>" +
            "1. AutoLRGB, AutoRGB, AutoRRGB or AutoMono - Final image for extra processing" +
            "2. L_HT + RGB_HT - Manually stretched L and RGB images<br>" +
            "3. RGB_HT - Manually stretched RGB image<br>" +
            "4. Integration_L_DBE + Integration_RGB_DBE - Background extracted L and RGB images<br>" +
            "5. Integration_RGB_DBE - Background extracted RGB image<br>" +
            "6. Integration_L_DBE + Integration_R_DBE + Integration_G_DBE + Integration_B_DBE -  Background extracted channel images<br>" +
            "7. Integration_H_DBE + Integration_S_DBE + Integration_O_DBE -  Background extracted channel images<br>" +
            "8. Integration_RGBcolor - Integrated Color image<br>" +
            "9. Integration_H + Integration_S + Integration_O - Integrated channel images<br>" +
            "10. Integration_L + Integration_R + Integration_G + Integration_B - Integrated channel images<br>" +
            "</p>" +
            "<p>" +
            "Not all images must be present, for example L image can be missing.<br>" +
            "RGB = Combined image, can be RGB or HSO.<br>" +
            "HT = Histogram Transformation, image is manually stretched to non-liner state.<br>" +
            "DBE = Background Extracted, for example manual DBE is run on image.<br>" +
            "Integration = Individual light images are integrated into one image.<br>" +
            "</p>",
            autocontinue_action,
            toolbutton
      );
}

function newAdjustToContentButton(parent)
{
      var button = new ToolButton(parent);
      button.icon = new Bitmap( ":/toolbar/preview-reset.png" );
      button.toolTip = "Adjust script window to content.";
      button.onMousePress = function()
      {
            parent.adjustToContents();
      };
      return button;
}

function blinkArrowButton(parent, icon, x, y)
{
      var blinkArrowButton = new ToolButton( parent );
      parent.rootingArr.push(blinkArrowButton);
      blinkArrowButton.icon = parent.scaledResource(icon);
      blinkArrowButton.toolTip = "Blink window move zoomed area";
      blinkArrowButton.setScaledFixedSize( 20, 20 );
      blinkArrowButton.onClick = function()
      {
            if (par.skip_blink.val) {
                  return;
            }
            if (blink_window != null && blink_zoom) {
                  console.writeln("blinkArrowButton");
                  blinkWindowZoomedUpdate(blink_window, x, y);
            }
      };
      return blinkArrowButton;
}

function newPageButtonsSizer(parent)
{
      if (!use_preview) {
            // Blink
            var blinkLabel = new Label( parent );
            parent.rootingArr.push(blinkLabel);
            blinkLabel.text = "Blink";
            blinkLabel.toolTip = "<p>Blink zoom control.</p><p>You can blink images by clicking them in the image list.</p>";
            blinkLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;

            var blinkFitButton = new ToolButton( parent );
            parent.rootingArr.push(blinkFitButton);
            blinkFitButton.icon = parent.scaledResource(":/toolbar/view-zoom-optimal-fit.png");
            blinkFitButton.toolTip = "Blink window zoom to optimal fit";
            blinkFitButton.setScaledFixedSize( 20, 20 );
            blinkFitButton.onClick = function()
            {
                  if (par.skip_blink.val) {
                        return;
                  }
                  if (blink_window != null) {
                        blink_window.zoomToOptimalFit();
                        blink_zoom = false;
                  }
            };
            var blinkZoomButton = new ToolButton( parent );
            parent.rootingArr.push(blinkZoomButton);
            blinkZoomButton.icon = parent.scaledResource(":/icons/zoom-1-1.png");
            blinkZoomButton.toolTip = "Blink window zoom to 1:1";
            blinkZoomButton.setScaledFixedSize( 20, 20 );
            blinkZoomButton.onClick = function()
            {
                  if (par.skip_blink.val) {
                        return;
                  }
                  if (blink_window != null) {
                        blink_zoom = true;
                        blink_zoom_x = 0;
                        blink_zoom_y = 0;
                        blinkWindowZoomedUpdate(blink_window, 0, 0);
                  }
            };
            var blinkLeft = blinkArrowButton(parent, ":/icons/arrow-left.png", -1, 0);
            var blinkRight = blinkArrowButton(parent, ":/icons/arrow-right.png", 1, 0);
            var blinkUp = blinkArrowButton(parent, ":/icons/arrow-up.png", 0, -1);
            var blinkDown = blinkArrowButton(parent, ":/icons/arrow-down.png", 0, 1);
      }
      // Load and save
      var jsonLabel = new Label( parent );
      parent.rootingArr.push(jsonLabel);
      jsonLabel.text = "Setup file";
      jsonLabel.toolTip = "Restoring script setup from a file, saving script setup to a file.";
      jsonLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      
      var jsonLoadButton = new ToolButton( parent );
      parent.rootingArr.push(jsonLoadButton);
      jsonLoadButton.icon = parent.scaledResource(":/icons/select-file.png");
      jsonLoadButton.toolTip = "Restore script setup from a Json file.";
      jsonLoadButton.setScaledFixedSize( 20, 20 );
      jsonLoadButton.onClick = function()
      {
            loadJsonFile(parent.dialog);
      };
      var jsonSaveButton = new ToolButton( parent );
      parent.rootingArr.push(jsonSaveButton);
      jsonSaveButton.icon = parent.scaledResource(":/icons/save.png");
      jsonSaveButton.toolTip = "<p>Save file lists to a Json file including checked status.</p><p>Image names from all pages are saved including light and calibration files.</p>";
      jsonSaveButton.setScaledFixedSize( 20, 20 );
      jsonSaveButton.onClick = function()
      {
            saveJsonFile(parent.dialog, false);
      };
      var jsonSaveWithSewttingsButton = new ToolButton( parent );
      parent.rootingArr.push(jsonSaveWithSewttingsButton);
      jsonSaveWithSewttingsButton.icon = parent.scaledResource(":/toolbar/file-project-save.png");
      jsonSaveWithSewttingsButton.toolTip = "<p>Save current settings and file lists to a Json file. All non-default settings are saved. " + 
                                            "Current window prefix and output directory is also saved.</p>" + 
                                            "<p>Images names from all pages are saved including light and calibration files. Checked status for files is saved</p>";
      jsonSaveWithSewttingsButton.setScaledFixedSize( 20, 20 );
      jsonSaveWithSewttingsButton.onClick = function()
      {
            saveJsonFile(parent.dialog, true);
      };
      
      var currentPageLabel = new Label( parent );
      parent.rootingArr.push(currentPageLabel);
      currentPageLabel.text = "Current page";
      currentPageLabel.toolTip = "Operations on the current page.";
      currentPageLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;

      var currentPageCheckButton = new ToolButton( parent );
      parent.rootingArr.push(currentPageCheckButton);
      currentPageCheckButton.icon = parent.scaledResource(":/icons/check.png");
      currentPageCheckButton.toolTip = "Mark all files in the current page as checked.";
      currentPageCheckButton.setScaledFixedSize( 20, 20 );
      currentPageCheckButton.onClick = function()
      {
            checkAllTreeBoxFiles(parent.dialog.treeBox[parent.dialog.tabBox.currentPageIndex]);
      };
      var currentPageClearButton = new ToolButton( parent );
      parent.rootingArr.push(currentPageClearButton);
      currentPageClearButton.icon = parent.scaledResource(":/icons/clear.png");
      currentPageClearButton.toolTip = "Clear the list of input images in the current page.";
      currentPageClearButton.setScaledFixedSize( 20, 20 );
      currentPageClearButton.onClick = function()
      {
            var pageIndex = parent.tabBox.currentPageIndex;
            parent.treeBox[pageIndex].clear();
            updateInfoLabel(parent);
            if (parent.tabBox.currentPageIndex == pages.LIGHTS) {
                  user_selected_best_image = null;
                  user_selected_reference_image = [];
                  star_alignment_image = null;
            }
      };
      var currentPageCollapseButton = new ToolButton( parent );
      parent.rootingArr.push(currentPageCollapseButton);
      currentPageCollapseButton.icon = parent.scaledResource(":/browser/collapse.png");
      currentPageCollapseButton.toolTip = "Collapse all sections in the current page.";
      currentPageCollapseButton.setScaledFixedSize( 20, 20 );
      currentPageCollapseButton.onClick = function()
      {
            setExpandedTreeBoxNode(parent.dialog.treeBox[parent.dialog.tabBox.currentPageIndex], false);
      };
      var currentPageExpandButton = new ToolButton( parent );
      parent.rootingArr.push(currentPageExpandButton);
      currentPageExpandButton.icon = parent.scaledResource(":/browser/expand.png");
      currentPageExpandButton.toolTip = "Expand all sections in the current page.";
      currentPageExpandButton.setScaledFixedSize( 20, 20 );
      currentPageExpandButton.onClick = function()
      {
            setExpandedTreeBoxNode(parent.dialog.treeBox[parent.dialog.tabBox.currentPageIndex], true);
      };
      var currentPageFilterButton = new ToolButton( parent );
      parent.rootingArr.push(currentPageFilterButton);
      currentPageFilterButton.icon = parent.scaledResource(":/icons/filter.png");
      currentPageFilterButton.toolTip = "Filter and sort files based on current weighting and filtering settings. Only checked files are used. " +
                                        "Without any filtering rules files are just sorted by weighting setting.";
      currentPageFilterButton.setScaledFixedSize( 20, 20 );
      currentPageFilterButton.onClick = function()
      {
            filterTreeBoxFiles(parent.dialog, parent.dialog.tabBox.currentPageIndex);
      };

      var bestImageLabel = newLabel( parent, "Reference images", "Selecting the reference images for star alignment, image integration and local normalization.");

      var setBestImageButton = new ToolButton( parent );
      parent.rootingArr.push(setBestImageButton);
      setBestImageButton.icon = parent.scaledResource(":/icons/ok-button.png");
      setBestImageButton.toolTip = "Set current preview/selected image as the reference image for star alignment.";
      setBestImageButton.setScaledFixedSize( 20, 20 );
      setBestImageButton.onClick = function()
      {
            if (parent.tabBox.currentPageIndex == pages.LIGHTS && current_selected_file_name != null) {
                  setBestImageInTreeBox(parent, parent.treeBox[pages.LIGHTS], current_selected_file_name, "");
            }
      };

      var setReferenceImageButton = new ToolButton( parent );
      parent.rootingArr.push(setReferenceImageButton);
      setReferenceImageButton.icon = parent.scaledResource(":/icons/item.png");
      setReferenceImageButton.toolTip = "Set current preview/selected image as the reference image for current filter for image integration and local normalization.";
      setReferenceImageButton.setScaledFixedSize( 20, 20 );
      setReferenceImageButton.onClick = function()
      {
            if (parent.tabBox.currentPageIndex == pages.LIGHTS && current_selected_file_name != null) {
                  setReferenceImageInTreeBox(parent, parent.treeBox[pages.LIGHTS], current_selected_file_name, "", current_selected_file_filter);
            }
      };

      var clearBestImageButton = new ToolButton( parent );
      parent.rootingArr.push(clearBestImageButton);
      clearBestImageButton.icon = parent.scaledResource(":/browser/disable.png");
      clearBestImageButton.toolTip = "Clear all reference image settings.";
      clearBestImageButton.setScaledFixedSize( 20, 20 );
      clearBestImageButton.onClick = function()
      {
            if (parent.tabBox.currentPageIndex == pages.LIGHTS) {
                  setBestImageInTreeBox(parent, parent.treeBox[pages.LIGHTS], null, "");
                  setReferenceImageInTreeBox(parent, parent.treeBox[pages.LIGHTS], null, "", null);
                  user_selected_best_image = null;
                  user_selected_reference_image = [];
                  star_alignment_image = null;
            }
      };

      var findBestImageButton = new ToolButton( parent );
      parent.rootingArr.push(findBestImageButton);
      findBestImageButton.icon = parent.scaledResource(":/icons/find.png");
      findBestImageButton.toolTip = "<p>Find reference images based on SSWEIGHT.</p>" + 
                                    "<p>This will overwrite all current reference image selections.</p>";
      findBestImageButton.setScaledFixedSize( 20, 20 );
      findBestImageButton.onClick = function()
      {
            if (parent.tabBox.currentPageIndex == pages.LIGHTS) {
                  if (findBestImageFromTreeBoxFiles(parent.treeBox[pages.LIGHTS])) {
                        // Best files are set into user_selected_best_image and user_selected_reference_image
                        setBestImageInTreeBox(
                              parent, 
                              parent.treeBox[pages.LIGHTS], 
                              user_selected_best_image,
                              "");
                        for (var i = 0; i < user_selected_reference_image.length; i++)  {
                              setReferenceImageInTreeBox(
                                    parent, 
                                    parent.treeBox[pages.LIGHTS], 
                                    user_selected_reference_image[i][0],
                                    "",
                                    user_selected_reference_image[i][1]);
                        }
                  }
            }
      };

      var buttonsSizer = new HorizontalSizer;
      parent.rootingArr.push(buttonsSizer);
      buttonsSizer.spacing = 4;

      if (!use_preview) {
            buttonsSizer.add( blinkLabel );
            buttonsSizer.add( blinkFitButton );
            buttonsSizer.add( blinkZoomButton );
            buttonsSizer.add( blinkLeft );
            buttonsSizer.add( blinkRight );
            buttonsSizer.add( blinkUp );
            buttonsSizer.add( blinkDown );
      }
      buttonsSizer.addSpacing( 20 );
      buttonsSizer.add( jsonLabel );
      buttonsSizer.add( jsonLoadButton );
      buttonsSizer.add( jsonSaveButton );
      buttonsSizer.add( jsonSaveWithSewttingsButton );

      buttonsSizer.addSpacing( 20 );
      buttonsSizer.add( currentPageLabel );
      buttonsSizer.add( currentPageCheckButton );
      buttonsSizer.add( currentPageClearButton );
      buttonsSizer.add( currentPageCollapseButton );
      buttonsSizer.add( currentPageExpandButton );
      buttonsSizer.add( currentPageFilterButton );

      buttonsSizer.addSpacing( 20 );
      buttonsSizer.add( bestImageLabel );
      buttonsSizer.add( setBestImageButton );
      buttonsSizer.add( setReferenceImageButton );
      buttonsSizer.add( clearBestImageButton );
      buttonsSizer.add( findBestImageButton );

      buttonsSizer.addStretch();
      let obj = newLabel(parent, "Actions", "Script actions, these are the same as in the bottom row of the script.");
      parent.rootingArr.push(obj);
      buttonsSizer.add( obj );
      buttonsSizer.addSpacing( 6 );
      obj = newAutoContinueButton(parent, true);
      parent.rootingArr.push(obj);
      buttonsSizer.add( obj );
      buttonsSizer.addSpacing( 6 );
      obj = newRunButton(parent, true);
      parent.rootingArr.push(obj);
      buttonsSizer.add( obj );
      obj = newExitButton(parent, true);
      parent.rootingArr.push(obj);
      buttonsSizer.add( obj );

      buttonsSizer.addSpacing( 6 );
      obj = newAdjustToContentButton(parent);
      parent.rootingArr.push(obj);
      buttonsSizer.add( obj );

      return buttonsSizer;
}

function getSectionVisible(name, control)
{
      if (do_not_read_settings) {
            return;
      }
      var tempSetting = Settings.read(name, DataType_Boolean);
      if (Settings.lastReadOK) {
            // console.writeln("AutoIntegrate: read from settings " + name + "=" + tempSetting);
            control.visible = tempSetting;
      }
}

function newSectionBar(parent, control, title, name)
{
      var sb = new SectionBar(parent, title);
      sb.setSection(control);
      sb.onToggleSection = function(bar, beginToggle) {
            if (!do_not_write_settings) {
                  Settings.write(name, DataType_Boolean, control.visible);
            }
            parent.adjustToContents();
      };
      parent.rootingArr.push(sb);

      getSectionVisible(name, control);

      var gb = new newGroupBox( parent );
      gb.sizer = new VerticalSizer;
      gb.sizer.margin = 4;
      gb.sizer.spacing = 4;
      gb.sizer.add( sb );
      gb.sizer.add( control );

      return gb;
}

function newSectionBarAdd(parent, groupbox, control, title, name)
{
      var sb = new SectionBar(parent, title);
      sb.setSection(control);
      sb.onToggleSection = function(bar, beginToggle) {
            if (!do_not_write_settings) {
                  Settings.write(name, DataType_Boolean, control.visible);
            }
            parent.adjustToContents();
      };
      parent.rootingArr.push(sb);

      getSectionVisible(name, control);

      groupbox.sizer.add( sb );
      groupbox.sizer.add( control );
}

function newSectionBarAddArray(parent, groupbox, title, name, objarray)
{
      var ProcessingControl = new Control( parent );
      ProcessingControl.sizer = new VerticalSizer;
      ProcessingControl.sizer.margin = 6;
      ProcessingControl.sizer.spacing = 4;
      for (var i = 0; i < objarray.length; i++) {
            ProcessingControl.sizer.add( objarray[i] );
      }
      // hide this section by default
      ProcessingControl.visible = false;

      parent.rootingArr.push(ProcessingControl);

      newSectionBarAdd(parent, groupbox, ProcessingControl, title, name);
}

function getWindowBitmap(imgWin)
{
      var bmp = new Bitmap(imgWin.mainView.image.width, imgWin.mainView.image.height);
      bmp.assign(imgWin.mainView.image.render());
      return bmp;
}

/***************************************************************************
 * 
 *    PreviewControl
 * 
 * Copyright (C) 2013, Andres del Pozo
 */
function PreviewControl(parent, size_x, size_y)
{
	this.__base__ = Frame;
  	this.__base__(parent);

      this.SetImage = function(image)
      {
            //console.writeln("SetImage");
            this.image = image;
            this.metadata = image;
            this.scaledImage = null;
            this.SetZoomOutLimit();
            this.UpdateZoom(-100);
      }

      this.UpdateImage = function(image)
      {
            //console.writeln("UpdateImage");
            if (this.zoom == this.zoomOutLimit) {
                  this.SetImage(image);
            } else {
                  this.image = image;
                  this.metadata = image;
                  this.scaledImage = null;
                  this.SetZoomOutLimit();
                  this.UpdateZoom(this.zoom);
            }
      }

      this.UpdateZoom = function (newZoom, refPoint)
      {
            if (newZoom < this.zoomOutLimit) {
                  newZoom = this.zoomOutLimit;
            } else if (newZoom >= 1) {
                  newZoom = 1;
            }
            if (newZoom == this.zoom && this.scaledImage) {
                  return;
            }

            if(refPoint==null) {
                  refPoint=new Point(this.scrollbox.viewport.width/2, this.scrollbox.viewport.height/2);
            }
            var imgx=null;
            if(this.scrollbox.maxHorizontalScrollPosition>0 || this.zoom == this.zoomOutLimit) {
                  imgx=(refPoint.x+this.scrollbox.horizontalScrollPosition)/this.scale;
            }
            // imgx and imgy are in this.image coordinates (i.e. 1:1 scale)
            var imgy=null;
            if(this.scrollbox.maxVerticalScrollPosition>0 || this.zoom == this.zoomOutLimit) {
                  imgy=(refPoint.y+this.scrollbox.verticalScrollPosition)/this.scale;
            }

            this.zoom = newZoom;
            this.scale = this.zoom;
            this.scaledImage = null;
            if (this.zoom >= 1) {
                  this.zoomVal_Label.text = "1:1";
            } else {
                  this.zoomVal_Label.text = format("1:%d", Math.ceil(1 / this.zoom));
            }
            if (this.image) {
                  if (this.zoom > this.zoomOutLimit) {
                        this.scaledImage = this.image.scaled(this.scale);
                  } else {
                        this.scaledImage = this.image.scaled(0.98 * this.scale);
                  }
            } else {
                  this.scaledImage = {width:this.metadata.width * this.scale, height:this.metadata.height * this.scale};
            }
            this.scrollbox.maxHorizontalScrollPosition = Math.max(0, this.scaledImage.width - this.scrollbox.viewport.width);
            this.scrollbox.maxVerticalScrollPosition = Math.max(0, this.scaledImage.height - this.scrollbox.viewport.height);

            if(this.scrollbox.maxHorizontalScrollPosition>0 && imgx!=null) {
                  this.scrollbox.horizontalScrollPosition = (imgx*this.scale)-refPoint.x;
            }
            if(this.scrollbox.maxVerticalScrollPosition>0 && imgy!=null) {
                  this.scrollbox.verticalScrollPosition = (imgy*this.scale)-refPoint.y;
            }

            this.scrollbox.viewport.update();
      }

      this.zoomIn_Button = new ToolButton( this );
      this.zoomIn_Button.icon = this.scaledResource( ":/icons/zoom-in.png" );
      this.zoomIn_Button.setScaledFixedSize( 20, 20 );
      this.zoomIn_Button.toolTip = "Zoom in";
      this.zoomIn_Button.onMousePress = function()
      {
            this.parent.UpdateZoom(this.parent.zoom + this.parent.zoomOutLimit);
      };

      this.zoomOut_Button = new ToolButton( this );
      this.zoomOut_Button.icon = this.scaledResource( ":/icons/zoom-out.png" );
      this.zoomOut_Button.setScaledFixedSize( 20, 20 );
      this.zoomOut_Button.toolTip = "Zoom out";
      this.zoomOut_Button.onMousePress = function()
      {
            this.parent.UpdateZoom(this.parent.zoom - this.parent.zoomOutLimit);
      };


      this.zoom11_Button = new ToolButton( this );
      this.zoom11_Button.icon = this.scaledResource( ":/icons/zoom-1-1.png" );
      this.zoom11_Button.setScaledFixedSize( 20, 20 );
      this.zoom11_Button.toolTip = "Zoom 1:1";
      this.zoom11_Button.onMousePress = function()
      {
            this.parent.UpdateZoom(1);
      };

      this.zoomFit_Button = new ToolButton( this );
      this.zoomFit_Button.icon = this.scaledResource( ":/icons/zoom.png" );
      this.zoomFit_Button.setScaledFixedSize( 20, 20 );
      this.zoomFit_Button.toolTip = "Zoom fit";
      this.zoomFit_Button.onMousePress = function()
      {
            this.parent.UpdateZoom(-100);
      };

      this.buttons_Sizer = new HorizontalSizer;
      this.buttons_Sizer.add( this.zoomIn_Button );
      this.buttons_Sizer.add( this.zoomOut_Button );
      this.buttons_Sizer.add( this.zoom11_Button );
      this.buttons_Sizer.add( this.zoomFit_Button );
      this.buttons_Sizer.addStretch();

      this.zoom = 1;
      this.scale = 1;
      this.zoomOutLimit = -100;
      this.scrollbox = new ScrollBox(this);
      this.scrollbox.autoScroll = true;
      this.scrollbox.tracking = true;
      this.scrollbox.cursor = new Cursor(StdCursor_Arrow);

      this.scroll_Sizer = new HorizontalSizer;
      this.scroll_Sizer.add( this.scrollbox );

      this.SetZoomOutLimit = function()
      {
            var scaleX = this.scrollbox.viewport.width/this.metadata.width;
            var scaleY = this.scrollbox.viewport.height/this.metadata.height;
            var scale = Math.min(scaleX,scaleY);
            this.zoomOutLimit = scale;
            //console.writeln("scale ", scale, ", this.zoomOutLimit ", this.zoomOutLimit);
      }

      this.scrollbox.onHorizontalScrollPosUpdated = function (newPos)
      {
            this.viewport.update();
      }
      this.scrollbox.onVerticalScrollPosUpdated = function (newPos)
      {
            this.viewport.update();
      }

      this.forceRedraw = function()
      {
            this.scrollbox.viewport.update();
      };

      this.setSize = function(w, h)
      {
            this.setScaledMinSize(w, h);
            this.width = w;
            this.heigth = h;
      }

      this.scrollbox.viewport.onMouseWheel = function (x, y, delta, buttonState, modifiers)
      {
            var preview = this.parent.parent;
            preview.UpdateZoom(preview.zoom + (delta > 0 ? preview.zoomOutLimit : -preview.zoomOutLimit), new Point(x,y));
      }

      this.scrollbox.viewport.onMousePress = function ( x, y, button, buttonState, modifiers )
      {
            var preview = this.parent.parent;
            var p =  preview.transform(x, y, preview);
            if(preview.onCustomMouseDown)
            {
                  preview.onCustomMouseDown.call(this, p.x, p.y, button, buttonState, modifiers )
            }
      }

      this.scrollbox.viewport.onMouseMove = function ( x, y, buttonState, modifiers )
      {
            var preview = this.parent.parent;
            var p =  preview.transform(x, y, preview);
            preview.Xval_Label.text = Math.floor(p.x).toString();
            preview.Yval_Label.text = Math.floor(p.y).toString();

            if(preview.onCustomMouseMove)
            {
                  preview.onCustomMouseMove.call(this, p.x, p.y, buttonState, modifiers )
            }
      }

      this.scrollbox.viewport.onMouseRelease = function (x, y, button, buttonState, modifiers)
      {
            var preview = this.parent.parent;

            var p =  preview.transform(x, y, preview);
            if(preview.onCustomMouseUp)
            {
                  preview.onCustomMouseUp.call(this, p.x, p.y, button, buttonState, modifiers )
            }
      }

      this.scrollbox.viewport.onResize = function (wNew, hNew, wOld, hOld)
      {
            var preview = this.parent.parent;
            if(preview.metadata && preview.scaledImage != null)
            {
                  this.parent.maxHorizontalScrollPosition = Math.max(0, preview.scaledImage.width - wNew);
                  this.parent.maxVerticalScrollPosition = Math.max(0, preview.scaledImage.height - hNew);
                  preview.SetZoomOutLimit();
                  preview.UpdateZoom(preview.zoom);
            }
            this.update();
      }

      this.scrollbox.viewport.onPaint = function (x0, y0, x1, y1)
      {
            var preview = this.parent.parent;
            var graphics = new VectorGraphics(this);

            graphics.fillRect(x0,y0, x1, y1, new Brush(0xff202020));
            if (preview.scaledImage != null) {
                  var offsetX = this.parent.maxHorizontalScrollPosition>0 ? -this.parent.horizontalScrollPosition : (this.width-preview.scaledImage.width)/2;
                  var offsetY = this.parent.maxVerticalScrollPosition>0 ? -this.parent.verticalScrollPosition: (this.height-preview.scaledImage.height)/2;
                  graphics.translateTransformation(offsetX, offsetY);
                  if(preview.image)
                        graphics.drawBitmap(0, 0, preview.scaledImage);
                  else
                        graphics.fillRect(0, 0, preview.scaledImage.width, preview.scaledImage.height, new Brush(0xff000000));
                  graphics.pen = new Pen(0xffffffff,0);
                  graphics.drawRect(-1, -1, preview.scaledImage.width + 1, preview.scaledImage.height + 1);
            }

            if(preview.onCustomPaint)
            {
                  graphics.antialiasing = true;
                  graphics.scaleTransformation(preview.scale,preview.scale);
                  preview.onCustomPaint.call(this, graphics, x0, y0, x1, y1);
            }
            graphics.end();
      }

      this.transform = function(x, y, preview)
      {
            var scrollbox = preview.scrollbox;
            var ox = 0;
            var oy = 0;
            ox = scrollbox.maxHorizontalScrollPosition>0 ? -scrollbox.horizontalScrollPosition : (scrollbox.viewport.width-preview.scaledImage.width)/2;
            oy = scrollbox.maxVerticalScrollPosition>0 ? -scrollbox.verticalScrollPosition: (scrollbox.viewport.height-preview.scaledImage.height)/2;
            var coordPx = new Point((x - ox) / preview.scale, (y - oy) / preview.scale);
            return new Point(coordPx.x, coordPx.y);
      }

      this.center = function()
      {
            var preview = this;
            var scrollbox = preview.scrollbox;
            var x = scrollbox.viewport.width / 2;
            var y = scrollbox.viewport.height / 2;
            var p =  this.transform(x, y, preview);
            return p;
      }

      this.zoomLabel_Label =new Label(this);
      this.zoomLabel_Label.text = "Zoom:";
      this.zoomVal_Label =new Label(this);
      this.zoomVal_Label.text = "1:1";

      this.Xlabel_Label = new Label(this);
      this.Xlabel_Label .text = "X:";
      this.Xval_Label = new Label(this);
      this.Xval_Label.text = "---";
      this.Ylabel_Label = new Label(this);
      this.Ylabel_Label.text = "Y:";
      this.Yval_Label = new Label(this);
      this.Yval_Label.text = "---";

      this.coords_Frame = new Frame(this);
      this.coords_Frame.backgroundColor = 0xffffffff;
      this.coords_Frame.sizer = new HorizontalSizer;
      this.coords_Frame.sizer.margin = 2;
      this.coords_Frame.sizer.spacing = 4;
      this.coords_Frame.sizer.add(this.zoomLabel_Label);
      this.coords_Frame.sizer.add(this.zoomVal_Label);
      this.coords_Frame.sizer.addSpacing(6);
      this.coords_Frame.sizer.add(this.Xlabel_Label);
      this.coords_Frame.sizer.add(this.Xval_Label);
      this.coords_Frame.sizer.addSpacing(6);
      this.coords_Frame.sizer.add(this.Ylabel_Label);
      this.coords_Frame.sizer.add(this.Yval_Label);

      this.coords_Frame.sizer.addStretch();

      this.sizer = new VerticalSizer;
      this.sizer.add(this.buttons_Sizer);
      this.sizer.add(this.scroll_Sizer);
      this.sizer.add(this.coords_Frame);

      this.setScaledMinSize(6, 6);

      var width_overhead = this.scrollbox.viewport.width;
      var heigth_overhead = this.scrollbox.viewport.height;

      this.setScaledMinSize(size_x + width_overhead + 6, size_y + heigth_overhead + 6);
}

function newPreviewObj(parent)
{
      var newPreviewControl = new PreviewControl(parent, ppar.preview_width, ppar.preview_height);

      var previewImageSizer = new Sizer();
      previewImageSizer.add(newPreviewControl);

      var newPreviewInfoLabel = new Label( parent );
      newPreviewInfoLabel.text = "<b>Preview</b> No preview";
      newPreviewInfoLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      newPreviewInfoLabel.useRichText = true;

      var newStatusInfoLabel = new Label( parent );
      newStatusInfoLabel.text = "";
      newStatusInfoLabel.textAlignment = TextAlign_VertCenter;

      var previewSizer = new VerticalSizer;
      previewSizer.margin = 6;
      previewSizer.spacing = 10;
      previewSizer.add(newPreviewInfoLabel);
      previewSizer.add(newStatusInfoLabel);
      previewSizer.add(previewImageSizer);

      updatePreviewNoImageInControl(newPreviewControl);

      return { control: newPreviewControl, infolabel: newPreviewInfoLabel, 
               statuslabel: newStatusInfoLabel, sizer: previewSizer };
}

function mainSizerTab(parent, sizer)
{
      var gb = new Control( parent );
      gb.sizer = new HorizontalSizer;
      gb.sizer.add( sizer );

      parent.rootingArr.push(gb);

      return gb;
}

function exitFromDialog()
{
      console.show();
      if (blink_window != null) {
            blink_window.forceClose();
            blink_window = null;
      }
      updateImageInfoLabel("");
}

function updateSidePreviewState()
{
      if (!use_preview || sidePreviewControl == null) {
            return;
      }
      if (ppar.side_preview_visible) {
            sidePreviewInfoLabel.show();
            sideStatusInfoLabel.show();
            sidePreviewControl.show();
            ppar.side_preview_visible = true;
      } else {      
            sidePreviewInfoLabel.hide();
            sideStatusInfoLabel.hide();
            sidePreviewControl.hide();
            ppar.side_preview_visible = false;
      }
}

function toggleSidePreview()
{
      if (!use_preview) {
            return;
      }

      ppar.side_preview_visible = !ppar.side_preview_visible;
      updateSidePreviewState();
}

/***************************************************************************
 * 
 *    AutoIntegrateDialog
 * 
 */
 this.AutoIntegrateDialog = function()
 {
       this.__base__ = Dialog;
       this.__base__();
 
      if (ppar.default_preview_size && this.availableScreenRect != undefined) {
            let preview_size = Math.floor(Math.min(this.availableScreenRect.width * 0.4, this.availableScreenRect.height * 0.4));
            ppar.preview_width = preview_size;
            ppar.preview_height = preview_size;
            console.writeln("Screen size " + this.availableScreenRect.width + "x" + this.availableScreenRect.height, ", using preview size " + ppar.preview_width + "x" + ppar.preview_height);
      }

      this.textEditWidth = 25 * this.font.width( "M" );
      this.numericEditWidth = 6 * this.font.width( "0" );

      this.rootingArr = [];    // for rooting objects

      var mainHelpTips = 
      "<p>" +
      "<b>AutoIntegrate - Automatic image integration utility</b>" +
      "</p><p>" +
      "Script automates initial steps of image processing in PixInsight. "+ 
      "It can calibrate images or it can be used with already calibrated images. "+ 
      "Most often you get the best results by running the script with default " +
      "settings and then continue processing in PixInsight." +
      "</p><p>"+
      "By default output files goes to the following subdirectories:<br>" +
      "- AutoOutput contains intermediate files generated during processing<br>" +
      "- AutoMaster contains generated master calibration files<br>" +
      "- AutoCalibrated contains calibrated light files<br>" +
      "- AutoProcessed contains processed final images. Also integrated images and log output is here." +
      "</p><p>" +
      "User can give output root directory which can be relative or absolute path." +
      "</p><p>"+
      "Always remember to check you data with Blink tool and remove all bad images." +
      "</p><p>" +
      "Batch mode is intended to be used with mosaic images. In Batch mode script " +
      "automatically asks files for the next mosaic panel. All mosaic panels are left open " +
      "and can be saved with Save batch result files buttons." +
      "</p><p>" +
      "When using color/OSC/RAW files it is recommended to set Pure RAW in PixInsight settings." +
      "</p><p>" +
      "For more details see:<br>" +
      "https://ruuth.xyz/AutoIntegrateInfo.html" +
      "</p><p>" +
      "This product is based on software from the PixInsight project, developed " +
      "by Pleiades Astrophoto and its contributors (https://pixinsight.com/)." +
      "</p><p>" +
      "Copyright (c) 2018-2022 Jarmo Ruuth<br>" +
      "Copyright (c) 2022 Jean-Marc Lugrin<br>" +
      "Copyright (c) 2021 rob pfile<br>" +
      "Copyright (c) 2013 Andres del Pozo<br>" +
      "Copyright (c) 2019 Vicent Peris<br>" +
      "Copyright (c) 2003-2020 Pleiades Astrophoto S.L." +
      "</p>";

      this.helpTips = new ToolButton( this );
      this.helpTips.icon = this.scaledResource( ":/icons/help.png" );
      this.helpTips.setScaledFixedSize( 20, 20 );
      this.helpTips.toolTip = mainHelpTips;

      // Run, Exit and AutoContinue buttons
      this.run_Button = newRunButton(this, false);
      this.exit_Button = newExitButton(this, false);
      this.autoContinueButton = newAutoContinueButton(this, false);
      
      this.filesToolTip = [];
      this.filesToolTip[pages.LIGHTS] = "<p>Add light files. If only lights are added " + 
                             "they are assumed to be already calibrated.</p>" +
                             "<p>If IMAGETYP is set on images script tries to automatically detect "+
                             "bias, dark flat and flat dark images. This can be disabled with No autodetect option.</p>";
      this.filesToolTip[pages.BIAS] = "<p>Add bias files. If only one file is added " + 
                             "it is assumed to be a master file.</p>";
      this.filesToolTip[pages.DARKS] = "<p>Add dark files. If only one file is added " + 
                             "it is assumed to be a master file.</p>";
      this.filesToolTip[pages.FLATS] = "<p>Add flat files. If only one file is added " + 
                             "it is assumed to be a master file.</p>";
      this.filesToolTip[pages.FLAT_DARKS] = "<p>Add flat dark image files. If only one file is added " + 
                             "it is assumed to be a master file. If flat dark files are selected " + 
                             "then master flat dark is used instead of master bias and master dark " + 
                             "is not used to calibrate flats.</p>";

      this.treeBox = [];
      this.treeBoxRootingArr = [];
      this.filesButtonsSizer = addFilesButtons(this);

      this.tabBox = new TabBox( this );

      let newFilesTreeBox = new filesTreeBox( this, lightsOptions(this), pages.LIGHTS );
      this.rootingArr.push(newFilesTreeBox);
      this.tabBox.addPage( newFilesTreeBox, "Lights" );

      newFilesTreeBox = new filesTreeBox( this, biasOptions(this), pages.BIAS );
      this.rootingArr.push(newFilesTreeBox);
      this.tabBox.addPage( newFilesTreeBox, "Bias" );

      newFilesTreeBox = new filesTreeBox( this, darksOptions(this), pages.DARKS );
      this.rootingArr.push(newFilesTreeBox);
      this.tabBox.addPage( newFilesTreeBox, "Darks" );

      newFilesTreeBox = new filesTreeBox( this, flatsOptions(this), pages.FLATS );
      this.rootingArr.push(newFilesTreeBox);
      this.tabBox.addPage( newFilesTreeBox, "Flats" );

      newFilesTreeBox = new filesTreeBox( this, flatdarksOptions(this), pages.FLAT_DARKS );
      this.rootingArr.push(newFilesTreeBox);
      this.tabBox.addPage( newFilesTreeBox, "Flat Darks" );

      /* Parameters check boxes. */
      this.useLocalNormalizationCheckBox = newCheckBox(this, "Local Normalization", par.local_normalization, 
            "<p>Use local normalization data for ImageIntegration</p>" );
      this.FixColumnDefectsCheckBox = newCheckBox(this, "Fix column defects", par.fix_column_defects, 
            "If checked, fix linear column defects by using linear defect detection algorithm from LinearDefectDetection.js script. " + 
            "Defect information is used by CosmeticCorrection to fix the defects." );
      this.FixRowDefectsCheckBox = newCheckBox(this, "Fix row defects", par.fix_row_defects, 
            "If checked, fix linear row defects by using linear defect detection algorithm from LinearDefectDetection.js script. " + 
            "Defect information is used by CosmeticCorrection to fix the defects." );
      this.CosmeticCorrectionCheckBox = newCheckBox(this, "No CosmeticCorrection", par.skip_cosmeticcorrection, 
            "<p>Do not run CosmeticCorrection on image files</p>" );
      this.SubframeSelectorCheckBox = newCheckBox(this, "No SubframeSelector", par.skip_subframeselector, 
            "<p>Do not run SubframeSelector to get image weights</p>" );
      this.CalibrateOnlyCheckBox = newCheckBox(this, "Calibrate only", par.calibrate_only, 
            "<p>Stop after image calibration step.</p>" );
      this.DebayerOnlyCheckBox = newCheckBox(this, "Debayer only", par.debayer_only, 
            "<p>Stop after Debayering step. Later it is possible to continue by selecting Debayered files " + 
            "and choosing None for Debayer.</p>" );
      this.ExtractChannelsOnlyCheckBox = newCheckBox(this, "Extract channels only", par.extract_channels_only, 
            "<p>Stop after Extract channels step. Later it is possible to continue by selecting extracted files " + 
            "and run a normal mono camera (LRGB/HSO) workflow.</p>" );
      this.BinningOnlyCheckBox = newCheckBox(this, "Binning only", par.binning_only, 
            "<p>Run only binning to create smaller files.</p>" );
      this.IntegrateOnlyCheckBox = newCheckBox(this, "Integrate only", par.integrate_only, 
            "<p>Run only image integration to create L,R,G,B or RGB files</p>" );
      this.CropInfoOnlyCheckBox = newCheckBox(this, "Crop info only", par.cropinfo_only, 
            "<p>Run only image integration on *_r.xisf files to create automatic cropping info.</p>" +
            "<p>Light file list should include all registered *_r.xisf files. The result will be LowRejectionMap_ALL.xisf file " +
            "that can be used to crop files to common are during AutoContinue.</p>" );
      this.imageWeightTestingCheckBox = newCheckBox(this, "Image weight testing ", par.image_weight_testing, 
            "<p>Run only SubframeSelector to output image weight information and outlier filtering into AutoIntegrate.log AutoWeights.json. " +
            "Json file can be loaded as input file list.</p>" +
            "<p>With this option no output image files are written.</p>" );
      this.ChannelCombinationOnlyCheckBox = newCheckBox(this, "ChannelCombination only", par.channelcombination_only, 
            "<p>Run only channel combination to linear RGB file. No autostretch or color calibration.</p>" );
      /* this.relaxedStartAlignCheckBox = newCheckBox(this, "Strict StarAlign", par.strict_StarAlign, 
            "<p>Use more strict StarAlign par. When set more files may fail to align.</p>" ); */
      this.keepIntegratedImagesCheckBox = newCheckBox(this, "Keep integrated images", par.keep_integrated_images, 
            "<p>Keep integrated images when closing all windows</p>" );
      this.keepTemporaryImagesCheckBox = newCheckBox(this, "Keep temporary images", par.keep_temporary_images, 
            "<p>Keep temporary images created while processing and do not close them. They will have tmp_ prefix.</p>" );
      this.ABE_before_channel_combination_CheckBox = newCheckBox(this, "Use ABE on channel images", par.ABE_before_channel_combination, 
            "<p>Use AutomaticBackgroundExtractor on L, R, G and B images separately before channels are combined.</p>" );
      this.ABE_on_lights_CheckBox = newCheckBox(this, "Use ABE on light images", par.ABE_on_lights, 
            "<p>Use AutomaticBackgroundExtractor on all light images. It is run very early in the processing before cosmetic correction.</p>" );
      this.useABE_L_RGB_CheckBox = newCheckBox(this, "Use ABE on combined images", par.use_ABE_on_L_RGB, 
            "<p>Use AutomaticBackgroundExtractor on L and RGB images. This is the Use ABE option.</p>" );
      var remove_stars_Tooltip = "<p>Choose star image stretching and combining settings from Stretching settings section.</p>"
      this.remove_stars_before_stretch_CheckBox = newCheckBox(this, "Remove stars before stretch", par.remove_stars_before_stretch, 
            "<p>Remove stars from combined RGB or narrowband images just before stretching while it still is in linear stage. " + 
            "Stars are used only from RGB image, stars from L image are not used. " + 
            "This needs StarXTerminator.</p>" + 
            "<p>When stars are removed before stretching then a different stretching can be used for the stars and potentially " + 
            "get better star colors.</p>" + 
            "<p>For OSC data this may not work well. Separating channels might help.</p>" +
            remove_stars_Tooltip);
      this.remove_stars_channel_CheckBox = newCheckBox(this, "Remove stars from channels", par.remove_stars_channel, 
            "<p>With LRGB or narrowband images remove stars from L, R, G, B, H, S and O channel images separately after image integration. " + 
            "while images are still in linear stage. Star images are then combined " +
            "to create a RGB star image. This needs StarXTerminator.</p>" +
            "<p>With color images (DSLR/OSC) remove stars after image integration while image is still in linear stage. " + 
            "This needs StarXTerminator.</p>" +
            remove_stars_Tooltip);
      this.remove_stars_stretched_CheckBox = newCheckBox(this, "Remove_stars after stretch", par.remove_stars_stretched, 
            "<p>Remove stars after image has been stretched to non-linear state. Start from RGB image are saved and they " + 
            "can be later added back to the image. This needs StarXTerminator.</p>" +
            remove_stars_Tooltip);
      var unscreen_tooltip = "<p>Use unscreen method to get stars image as described by Russell Croman.</p>" +
                             "<p>Unscreen method usually keeps star colors more correct than simple star removal. It is " + 
                             "recommended to use Screen method when combining star and starless images back together.<p>";
      this.unscreen_stars_CheckBox = newCheckBox(this, "Unscreen stars", par.unscreen_stars, unscreen_tooltip);
      this.color_calibration_before_ABE_CheckBox = newCheckBox(this, "Color calibration before ABE", par.color_calibration_before_ABE, 
            "<p>Run ColorCalibration before AutomaticBackgroundExtractor in run on RGB image</p>" );
      this.use_background_neutralization_CheckBox = newCheckBox(this, "Use BackgroundNeutralization", par.use_background_neutralization, 
            "<p>Run BackgroundNeutralization before ColorCalibration</p>" );
      this.batch_mode_CheckBox = newCheckBox(this, "Batch/mosaic mode", par.batch_mode, 
            "<p>Run in batch mode, continue until no files are given.</p>" +
            "<p>Batch mode is intended for processing mosaic panels. When one set of files " + 
            "is processed, batch mode will automatically ask for the next set of files. " + 
            "In batch mode only final image windows are left visible. </p>" +
            "<p>Final images are renamed using the subdirectory name. It is " + 
            "recommended that each part of the batch is stored in a separate directory. </p>");
      this.autodetect_imagetyp_CheckBox = newCheckBox(this, "Do not use IMAGETYP keyword", par.skip_autodetect_imagetyp, 
            "<p>If selected do not try to autodetect calibration files based on IMAGETYP keyword.</p>" );
      this.aiPages = pages;
      this.autodetect_filter_CheckBox = newCheckBoxEx(this, "Do not use FILTER keyword", par.skip_autodetect_filter, 
            "<p>If selected do not try to autodetect light and flat files based on FILTER keyword.</p>" +
            "<p>Selecting this enables manual adding of filter files for lights and flats.</p>",
            function(checked) { 
                  this.dialog.autodetect_filter_CheckBox.aiParam.val = checked; 
                  showOrHideFilterSectionBar(this.dialog.aiPages.LIGHTS);
                  showOrHideFilterSectionBar(this.dialog.aiPages.FLATS);
            });
      this.select_all_files_CheckBox = newCheckBox(this, "Select all files", par.select_all_files, 
            "<p>If selected default file select pattern is all files (*.*) and not image files.</p>" );
      this.save_all_files_CheckBox = newCheckBox(this, "Save all files", par.save_all_files, 
            "<p>If selected save buttons will save all processed and iconized files and not just final image files. </p>" );
      this.no_subdirs_CheckBox = newCheckBoxEx(this, "No subdirectories", par.no_subdirs, 
            "<p>If selected output files are not written into subdirectories</p>",
            function(checked) { 
                  this.dialog.no_subdirs_CheckBox.aiParam.val = checked;
                  if (this.dialog.no_subdirs_CheckBox.aiParam.val) {
                        clearDefaultDirs();
                  } else {
                        setDefaultDirs();
                  }
            });
      this.use_drizzle_CheckBox = newCheckBox(this, "Drizzle", par.use_drizzle, 
            "<p>Use Drizzle integration</p>" );
      this.imageintegration_ssweight_CheckBox = newCheckBox(this, "ImageIntegration use ssweight", par.use_imageintegration_ssweight, 
            "<p>Use SSWEIGHT weight keyword during ImageIntegration.</p>" );
      this.imageintegration_clipping_CheckBox = newCheckBox(this, "No ImageIntegration clipping", par.skip_imageintegration_clipping, 
            "<p>Do not use clipping in ImageIntegration</p>" );
      this.crop_to_common_area_CheckBox = newCheckBox(this, "Crop to common area", par.crop_to_common_area, 
            "<p>Crop all channels to area covered by all images</p>" );
      this.RRGB_image_CheckBox = newCheckBox(this, "RRGB image", par.RRGB_image, 
            "<p>RRGB image using R as Luminance.</p>" );
      this.synthetic_l_image_CheckBox = newCheckBox(this, "Synthetic L image", par.synthetic_l_image, 
            "<p>Create synthetic L image from all light images.</p>" );
      this.synthetic_missing_images_CheckBox = newCheckBox(this, "Synthetic missing image", par.synthetic_missing_images, 
            "<p>Create synthetic image for any missing image.</p>" );
      this.force_file_name_filter_CheckBox = newCheckBox(this, "Use file name for filters", par.force_file_name_filter, 
            "<p>Use file name for recognizing filters and ignore FILTER keyword.</p>" );
      this.unique_file_names_CheckBox = newCheckBox(this, "Use unique file names", par.unique_file_names, 
            "<p>Use unique file names by adding a timestamp when saving to disk.</p>" );
      this.skip_noise_reduction_CheckBox = newCheckBox(this, "No noise reduction", par.skip_noise_reduction, 
            "<p>Do not use noise reduction. More fine grained noise reduction settings can be found in the Processing settings section.</p>" );
      this.skip_star_noise_reduction_CheckBox = newCheckBox(this, "No star noise reduction", par.skip_star_noise_reduction, 
            "<p>Do not use star noise reduction. Star noise reduction is used when stars are removed from image.</p>" );
      this.non_linear_noise_reduction_CheckBox = newCheckBox(this, "Non-linear noise reduction", par.non_linear_noise_reduction, 
            "<p>Do noise reduction in non-linear state after stretching.</p>" );
      this.no_mask_contrast_CheckBox = newCheckBox(this, "No extra contrast on mask", par.skip_mask_contrast, 
            "<p>Do not add extra contrast on automatically created luminance mask.</p>" );
      this.no_sharpening_CheckBox = newCheckBox(this, "No sharpening", par.skip_sharpening, 
            "<p>Do not use sharpening on image. Sharpening uses a luminance and star mask to target light parts of the image.</p>" );
      this.shadowClip_CheckBox = newCheckBox(this, "Shadow clip", par.shadow_clip, 
            "<p>Clip shadows.</p>" +
            "<p>Clipping shadows increases contrast but clips out some data. Shadow clip clips " + shadow_clip_value + "% of shadows " +
            "after image is stretched.</p>");
      this.forceNewMask_CheckBox = newCheckBox(this, "New mask", par.force_new_mask, 
            "<p>Do not use an existing mask but always create a new mask.</p>)");
      this.no_SCNR_CheckBox = newCheckBox(this, "No SCNR", par.skip_SCNR, 
            "<p>Do not use SCNR to remove green cast.</p>"  +
            "<p>SCNR is automatically skipped when processing narrowband images.</p>" +
            "<p>Skipping SCNR can be useful when processing for example comet images.</p>");
      this.skip_color_calibration_CheckBox = newCheckBox(this, "No color calibration", par.skip_color_calibration, 
            "<p>Do not run color calibration. Color calibration is run by default on RGB data.</p>" );
      this.use_starxterminator_CheckBox = newCheckBox(this, "Use StarXTerminator", par.use_starxterminator, 
            "<p>Use StarXTerminator instead of StarNet to remove stars from an image.</p>" );
      this.use_noisexterminator_CheckBox = newCheckBox(this, "Use NoiseXTerminator", par.use_noisexterminator, 
            "<p>Use NoiseXTerminator for noise reduction.</p>" );
      this.use_starnet2_CheckBox = newCheckBox(this, "Use StarNet2", par.use_starnet2, 
            "<p>Use StarNet2 instead of StarNet to remove stars from an image.</p>" );
      this.win_prefix_to_log_files_CheckBox = newCheckBox(this, "Add window prefix to log files", par.win_prefix_to_log_files, 
            "<p>Add window prefix to AutoIntegrate.log and AutoContinue.log files.</p>" );
      this.start_from_imageintegration_CheckBox = newCheckBox(this, "Start from ImageIntegration", par.start_from_imageintegration, 
            "<p>Start processing from ImageIntegration. File list should include star aligned files (*_r.xisf).</p>" +
            "<p>This option can be useful for testing different processing like Local Normalization or Drizzle " + 
            "(if Generate .xdrz files is selected). This is also useful if there is a need to manually remove " + 
            "bad files after alignment.</p>" +
            "<p>If filter type is not included in the file keywords it cannot be detected from the file name. In that case " + 
            "filter files must be added manually to the file list.</p>" );
      this.generate_xdrz_CheckBox = newCheckBox(this, "Generate .xdrz files", par.generate_xdrz, 
            "<p>Generate .xdrz files even if Drizzle integration is not used. It is useful if you want to try Drizzle " + 
            "integration later with Start from ImageIntegration option.</p>" );
      this.blink_checkbox = newCheckBoxEx(this, "No blink", par.skip_blink, 
            "<p>Disable blinking of files.</p>",
            function(checked) { 
                  this.dialog.blink_checkbox.aiParam.val = checked;
                  if (this.dialog.blink_checkbox.aiParam.val) {
                        if (blink_window != null) {
                              blink_window.forceClose();
                              blink_window = null;
                        }
                  }
            });
      this.StartWithEmptyWindowPrefixBox = newCheckBox(this, "Start with empty window prefix", par.start_with_empty_window_prefix, 
            "<p>Start the script with empty window prefix</p>" );
      this.ManualIconColumnBox = newCheckBox(this, "Manual icon column control", par.use_manual_icon_column, 
            "<p>Enable manual control of icon columns. Useful for example when using multiple Workspaces.</p>" +
            "<p>When this option is enabled the control for icon column is in the Interface settings section.</p>" +
            "<p>This setting is effective only after restart of the script.</p>" );
      this.AutoSaveSetupBox = newCheckBox(this, "Autosave setup", par.autosave_setup, 
            "<p>Save setup after successful processing into AutosaveSetup.json file. Autosave is done only after the Run command, " + 
            "it is not done after the Autocontinue command.</p>" +
            "<p>File is saved to the lights file directory, or to the user given output directory.</p>" +
            "<p>Setup can be later loaded into AutoIntegrate to see the settings or run the setup again possibly with different options.</p>");
      this.UseProcessedFilesBox = newCheckBox(this, "Use processed files", par.use_processed_files, 
            "<p>When possible use already processed files. This option can be useful when adding files to an already processed set of files. " +
            "Only files generated before image integration are reused.</p>" +
            "<p>Option works best with setup file that is saved after processing or with Autosave setup generated AutosaveSetup.json file because " + 
            "then star alignment reference image and possible defect info is saved.</p>" +
            "<p>With image calibration it is possible to use previously generated master files by loading already processed master files " +
            "info calibration file lists. If only one calibration file is present then the script automatically uses it as a master file.</p>");

      // Image parameters set 1.
      this.imageParamsSet1 = new VerticalSizer;
      this.imageParamsSet1.margin = 6;
      this.imageParamsSet1.spacing = 4;
      this.imageParamsSet1.add( this.FixColumnDefectsCheckBox );
      this.imageParamsSet1.add( this.FixRowDefectsCheckBox );
      this.imageParamsSet1.add( this.CosmeticCorrectionCheckBox );
      this.imageParamsSet1.add( this.SubframeSelectorCheckBox );
      /* this.imageParamsSet1.add( this.relaxedStartAlignCheckBox); */
      this.imageParamsSet1.add( this.imageintegration_ssweight_CheckBox );
      this.imageParamsSet1.add( this.imageintegration_clipping_CheckBox );
      this.imageParamsSet1.add( this.crop_to_common_area_CheckBox );
      this.imageParamsSet1.add( this.no_mask_contrast_CheckBox );
      this.imageParamsSet1.add( this.remove_stars_channel_CheckBox );
      this.imageParamsSet1.add( this.remove_stars_before_stretch_CheckBox );
      this.imageParamsSet1.add( this.remove_stars_stretched_CheckBox );
      this.imageParamsSet1.add( this.unscreen_stars_CheckBox );
      this.imageParamsSet1.add( this.forceNewMask_CheckBox );
      this.imageParamsSet1.add( this.shadowClip_CheckBox );
      
      // Image parameters set 2.
      this.imageParamsSet2 = new VerticalSizer;
      this.imageParamsSet2.margin = 6;
      this.imageParamsSet2.spacing = 4;
      this.imageParamsSet2.add( this.no_SCNR_CheckBox );
      this.imageParamsSet2.add( this.no_sharpening_CheckBox );
      this.imageParamsSet2.add( this.skip_noise_reduction_CheckBox );
      this.imageParamsSet2.add( this.skip_star_noise_reduction_CheckBox );
      this.imageParamsSet2.add( this.non_linear_noise_reduction_CheckBox );
      this.imageParamsSet2.add( this.use_background_neutralization_CheckBox );
      this.imageParamsSet2.add( this.useLocalNormalizationCheckBox );
      this.imageParamsSet2.add( this.skip_color_calibration_CheckBox );
      this.imageParamsSet2.add( this.color_calibration_before_ABE_CheckBox );
      this.imageParamsSet2.add( this.ABE_on_lights_CheckBox );
      this.imageParamsSet2.add( this.ABE_before_channel_combination_CheckBox );
      this.imageParamsSet2.add( this.useABE_L_RGB_CheckBox );
      this.imageParamsSet2.add( this.use_drizzle_CheckBox );

      // Image group par.
      this.imageParamsControl = new Control( this );
      this.imageParamsControl.sizer = new HorizontalSizer;
      this.imageParamsControl.sizer.margin = 6;
      this.imageParamsControl.sizer.spacing = 4;
      this.imageParamsControl.sizer.add( this.imageParamsSet1 );
      this.imageParamsControl.sizer.add( this.imageParamsSet2 );
      this.imageParamsControl.visible = false;
      //this.imageParamsControl.sizer.addStretch();

      // LRGBCombination selection
      this.LRGBCombinationLightnessControl = newNumericEdit(this, "Lightness", par.LRGBCombination_lightness, 0, 1, 
            "<p>LRGBCombination lightness setting. Smaller value gives more bright image. Usually should be left to the default value.</p>");

      this.LRGBCombinationSaturationControl = newNumericEdit(this, "Saturation", par.LRGBCombination_saturation, 0, 1, 
            "<p>LRGBCombination saturation setting. Smaller value gives more saturated image. Usually should be left to the default value.</p>");

      this.LRGBCombinationGroupBoxLabel = newSectionLabel(this, "LRGBCombination settings");
      this.LRGBCombinationGroupBoxLabel.toolTip = 
            "LRGBCombination settings can be used to fine tune image. For relatively small " +
            "and bright objects like galaxies it may be useful to reduce brightness and increase saturation.";
      this.LRGBCombinationGroupBoxSizer = new HorizontalSizer;
      this.LRGBCombinationGroupBoxSizer.margin = 6;
      this.LRGBCombinationGroupBoxSizer.spacing = 4;
      this.LRGBCombinationGroupBoxSizer.add( this.LRGBCombinationLightnessControl );
      this.LRGBCombinationGroupBoxSizer.add( this.LRGBCombinationSaturationControl );
      this.LRGBCombinationGroupBoxSizer.addStretch();

      // StarAlignment selection
      var starAlignmentValuesToolTip = "<p>If star aligment fails you can try change values. Here is one suggestion of values that might help:<br>" +
                                       "- Sensitivity: 0.70<br>" + 
                                       "- Noise reduction<br>" + 
                                       "If you have very bad distortion then also increasing maximum distortion can help.</p>";
      this.sensitivityStarAlignmentControl = newNumericEdit(this, "Sensitivity", par.staralignment_sensitivity, 0, 1, 
            "<p>Sensitivity setting. Bigger value will detect fainter stars.</p>" + starAlignmentValuesToolTip);
      this.maxStarDistortionStarAlignmentControl = newNumericEdit(this, "Maximum distortion", par.staralignment_maxstarsdistortion, 0, 1, 
            "<p>Maximum star distortion setting. Bigger value will detect more irregular stars.</p>" + starAlignmentValuesToolTip);
      this.structureLayersStarAlignmentLabel = newLabel(this, "Structure layers", "<p>Structure layers setting. Bigger value will detect more stars.</p>" + starAlignmentValuesToolTip);
      this.structureLayersStarAlignmentControl = newSpinBox(this, par.staralignment_structurelayers, 1, 8, this.structureLayersStarAlignmentLabel.toolTip);
      this.noiseReductionFilterRadiusStarAlignmentLabel = newLabel(this, "Noise reduction", "<p>Noise reduction filter radius layers setting. Bigger value can help with very noisy images.</p>" + starAlignmentValuesToolTip);
      this.noiseReductionFilterRadiusStarAlignmentControl = newSpinBox(this, par.staralignment_noisereductionfilterradius, 0, 50, this.noiseReductionFilterRadiusStarAlignmentLabel.toolTip);

      this.StarAlignmentGroupBoxLabel = newSectionLabel(this, "StarAlignment settings");
      this.StarAlignmentGroupBoxLabel.toolTip = 
            "<p>StarAlignment settings can be used to fine tune star alignment to detect more stars if default values do not work.</p>" + starAlignmentValuesToolTip;
      this.StarAlignmentGroupBoxSizer = new HorizontalSizer;
      this.StarAlignmentGroupBoxSizer.margin = 6;
      this.StarAlignmentGroupBoxSizer.spacing = 4;
      this.StarAlignmentGroupBoxSizer.add( this.sensitivityStarAlignmentControl );
      this.StarAlignmentGroupBoxSizer.add( this.maxStarDistortionStarAlignmentControl );
      this.StarAlignmentGroupBoxSizer.add( this.structureLayersStarAlignmentLabel );
      this.StarAlignmentGroupBoxSizer.add( this.structureLayersStarAlignmentControl );
      this.StarAlignmentGroupBoxSizer.add( this.noiseReductionFilterRadiusStarAlignmentLabel );
      this.StarAlignmentGroupBoxSizer.add( this.noiseReductionFilterRadiusStarAlignmentControl );
      this.StarAlignmentGroupBoxSizer.addStretch();

      // Saturation selection
      this.linearSaturationLabel = new Label( this );
      this.linearSaturationLabel.text = "Linear saturation increase";
      this.linearSaturationLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      this.linearSaturationLabel.toolTip = "<p>Saturation increase in linear state using a mask.</p>";
      this.linearSaturationSpinBox = newSpinBox(this, par.linear_increase_saturation, 0, 5, this.linearSaturationLabel.toolTip);

      this.nonLinearSaturationLabel = new Label( this );
      this.nonLinearSaturationLabel.text = "Non-linear saturation increase";
      this.nonLinearSaturationLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      this.nonLinearSaturationLabel.toolTip = "<p>Saturation increase in non-linear state using a mask.</p>";
      this.nonLinearSaturationSpinBox = newSpinBox(this, par.non_linear_increase_saturation, 0, 5, this.nonLinearSaturationLabel.toolTip);

      this.saturationGroupBoxLabel = newSectionLabel(this, "Saturation setting");
      this.saturationGroupBoxSizer = new HorizontalSizer;
      this.saturationGroupBoxSizer.margin = 6;
      this.saturationGroupBoxSizer.spacing = 4;
      this.saturationGroupBoxSizer.add( this.linearSaturationLabel );
      this.saturationGroupBoxSizer.add( this.linearSaturationSpinBox );
      this.saturationGroupBoxSizer.add( this.nonLinearSaturationLabel );
      this.saturationGroupBoxSizer.add( this.nonLinearSaturationSpinBox );
      this.saturationGroupBoxSizer.addStretch();

      // Noise reduction
      var noiseReductionToolTipCommon = "<p>Noise reduction is done using a luminance mask to target noise reduction on darker areas of the image. " +
                                        "Bigger strength value means stronger noise reduction. Noise reduction uses MultiscaleLinerTransform or NoiseXTerminator.</p>" + 
                                        "<p>With MultiscaleLinerTransform the strength between 3 and 5 is the number of layers used to reduce noise. " + 
                                        "Strength values 1 and 2 are very mild three layer noise reductions and strength 6 is very aggressive five layer noise reduction.</p>" +
                                        "<p>With NoiseXTerminator the strength changes denoise and detail values. Strength value has the following mapping to denoise " + 
                                        "and detail: 1=0.60 0.10, 2=0.70 0.15 3=0.80 0.15 4=0.90 0.15, 5=0.90 0.20 and 6=0.95 0.20.t</p>";
      this.noiseReductionStrengthLabel = new Label( this );
      this.noiseReductionStrengthLabel.text = "Noise reduction";
      this.noiseReductionStrengthLabel.toolTip = "<p>Noise reduction strength for color channel (R,G,B,H,S,O) or color images.</p>" + noiseReductionToolTipCommon;
      this.noiseReductionStrengthLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
   
      this.noiseReductionStrengthComboBox = newComboBoxStrvalsToInt(this, par.noise_reduction_strength, noise_reduction_strength_values, this.noiseReductionStrengthLabel.toolTip);

      this.luminanceNoiseReductionStrengthLabel = new Label( this );
      this.luminanceNoiseReductionStrengthLabel.text = "Luminance noise reduction";
      this.luminanceNoiseReductionStrengthLabel.toolTip = "<p>Noise reduction strength for luminance image.</p>" + noiseReductionToolTipCommon;
      this.luminanceNoiseReductionStrengthLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
   
      this.luminanceNoiseReductionStrengthComboBox = newComboBoxStrvalsToInt(this, par.luminance_noise_reduction_strength, noise_reduction_strength_values, this.luminanceNoiseReductionStrengthLabel.toolTip);

      this.combined_noise_reduction_CheckBox = newCheckBox(this, "Combined image noise reduction", par.combined_image_noise_reduction,
            "<p>Do noise reduction on combined image instead of each color channels separately.</p>" );
      this.color_noise_reduction_CheckBox = newCheckBox(this, "Color noise reduction", par.use_color_noise_reduction, 
            "<p>Do color noise reduction.</p>" );

      var ACDNR_StdDev_tooltip = "<p>A mild ACDNR noise reduction with StdDev value between 1.0 and 2.0 can be useful to smooth image and reduce black spots left from previous noise reduction.</p>";
      this.ACDNR_noise_reduction_Control = newNumericControl(this, "ACDNR noise reduction", par.ACDNR_noise_reduction, 0, 5, 
            "<p>If non-zero, sets StdDev value and runs ACDNR noise reduction.</p>" +
            ACDNR_StdDev_tooltip);

      this.noiseReductionGroupBoxLabel = newSectionLabel(this, "Noise reduction settings");
      this.noiseReductionGroupBoxSizer1 = new HorizontalSizer;
      this.noiseReductionGroupBoxSizer1.margin = 6;
      this.noiseReductionGroupBoxSizer1.spacing = 4;
      this.noiseReductionGroupBoxSizer1.add( this.noiseReductionStrengthLabel );
      this.noiseReductionGroupBoxSizer1.add( this.noiseReductionStrengthComboBox );
      this.noiseReductionGroupBoxSizer1.add( this.luminanceNoiseReductionStrengthLabel );
      this.noiseReductionGroupBoxSizer1.add( this.luminanceNoiseReductionStrengthComboBox );
      this.noiseReductionGroupBoxSizer1.add( this.ACDNR_noise_reduction_Control );
      this.noiseReductionGroupBoxSizer1.addStretch();

      this.noiseReductionGroupBoxSizer2 = new HorizontalSizer;
      this.noiseReductionGroupBoxSizer2.margin = 6;
      this.noiseReductionGroupBoxSizer2.spacing = 4;
      this.noiseReductionGroupBoxSizer2.add( this.color_noise_reduction_CheckBox );
      this.noiseReductionGroupBoxSizer2.add( this.combined_noise_reduction_CheckBox );
      this.noiseReductionGroupBoxSizer2.addStretch();

      this.noiseReductionGroupBoxSizer = new VerticalSizer;
      this.noiseReductionGroupBoxSizer.margin = 6;
      this.noiseReductionGroupBoxSizer.spacing = 4;
      this.noiseReductionGroupBoxSizer.add( this.noiseReductionGroupBoxSizer1 );
      this.noiseReductionGroupBoxSizer.add( this.noiseReductionGroupBoxSizer2 );
      //this.noiseReductionGroupBoxSizer.addStretch();

      this.binningLabel = new Label( this );
      this.binningLabel.text = "Binning";
      this.binningLabel.toolTip = 
            "<p>Do binning for each light file. Binning is done first on calibrated light files before any other operations.<p>" +
            "<p>With Color option binning is done only for color channel files.<p>" +
            "<p>With L and Color option binning is done for both luminance and color channel files.<p>" +
            "<p>Binning uses IntegerResample process and should help to reduce noise at the cost of decreased resolution.<p>";
      this.binningLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
   
      // Binning
      this.binningComboBox = newComboBoxIndex(this, par.binning, binning_values, this.binningLabel.toolTip);
      this.binningSpinBoxLabel = newLabel(this, "Resample factor", 
                                          "<p>Resample factor for binning.</p>" +
                                          this.binningLabel.toolTip);
      this.binningSpinBox = newSpinBox(this, par.binning_resample, 2, 4, this.binningSpinBoxLabel.toolTip);

      this.binningGroupBoxLabel = newSectionLabel(this, "Binning");
      this.binningGroupBoxSizer = new HorizontalSizer;
      this.binningGroupBoxSizer.margin = 6;
      this.binningGroupBoxSizer.spacing = 4;
      this.binningGroupBoxSizer.add( this.binningLabel );
      this.binningGroupBoxSizer.add( this.binningComboBox );
      this.binningGroupBoxSizer.add( this.binningSpinBoxLabel );
      this.binningGroupBoxSizer.add( this.binningSpinBox );
      this.binningGroupBoxSizer.addStretch();

      // Other parameters set 1.
      this.otherParamsSet1 = new VerticalSizer;
      this.otherParamsSet1.margin = 6;
      this.otherParamsSet1.spacing = 4;
      this.otherParamsSet1.add( this.CalibrateOnlyCheckBox );
      this.otherParamsSet1.add( this.DebayerOnlyCheckBox );
      this.otherParamsSet1.add( this.BinningOnlyCheckBox );
      this.otherParamsSet1.add( this.ExtractChannelsOnlyCheckBox );
      this.otherParamsSet1.add( this.IntegrateOnlyCheckBox );
      this.otherParamsSet1.add( this.ChannelCombinationOnlyCheckBox );
      this.otherParamsSet1.add( this.CropInfoOnlyCheckBox );
      this.otherParamsSet1.add( this.imageWeightTestingCheckBox );
      this.otherParamsSet1.add( this.start_from_imageintegration_CheckBox );
      this.otherParamsSet1.add( this.RRGB_image_CheckBox );
      this.otherParamsSet1.add( this.synthetic_l_image_CheckBox );
      this.otherParamsSet1.add( this.synthetic_missing_images_CheckBox );
      this.otherParamsSet1.add( this.no_subdirs_CheckBox );
      this.otherParamsSet1.add( this.use_starxterminator_CheckBox );
      this.otherParamsSet1.add( this.use_starnet2_CheckBox );
      this.otherParamsSet1.add( this.use_noisexterminator_CheckBox );

      // Other parameters set 2.
      this.otherParamsSet2 = new VerticalSizer;
      this.otherParamsSet2.margin = 6;
      this.otherParamsSet2.spacing = 4;
      this.otherParamsSet2.add( this.keepIntegratedImagesCheckBox );
      this.otherParamsSet2.add( this.keepTemporaryImagesCheckBox );
      this.otherParamsSet2.add( this.select_all_files_CheckBox );
      this.otherParamsSet2.add( this.save_all_files_CheckBox );
      this.otherParamsSet2.add( this.unique_file_names_CheckBox );
      this.otherParamsSet2.add( this.win_prefix_to_log_files_CheckBox );
      this.otherParamsSet2.add( this.batch_mode_CheckBox );
      this.otherParamsSet2.add( this.force_file_name_filter_CheckBox );
      this.otherParamsSet2.add( this.autodetect_filter_CheckBox );
      this.otherParamsSet2.add( this.autodetect_imagetyp_CheckBox );
      this.otherParamsSet2.add( this.generate_xdrz_CheckBox );
      this.otherParamsSet2.add( this.blink_checkbox );
      this.otherParamsSet2.add( this.StartWithEmptyWindowPrefixBox );
      this.otherParamsSet2.add( this.ManualIconColumnBox );
      this.otherParamsSet2.add( this.AutoSaveSetupBox );
      this.otherParamsSet2.add( this.UseProcessedFilesBox );

      // Other Group par.
      this.otherParamsControl = new Control( this );
      this.otherParamsControl.sizer = new HorizontalSizer;
      this.otherParamsControl.sizer.margin = 6;
      this.otherParamsControl.sizer.spacing = 4;
      this.otherParamsControl.sizer.add( this.otherParamsSet1 );
      this.otherParamsControl.sizer.add( this.otherParamsSet2 );
      this.otherParamsControl.visible = false;
      //this.otherParamsControl.sizer.addStretch();
      
      // Weight calculations
      var weightHelpToolTips =
            "<p>" +
            "Generic - Use both noise and stars for the weight calculation.<br>" +
            "Noise - More weight on image noise.<br>" +
            "Stars - More weight on stars.<br>" +
            "PSF Signal - Use PSF Signal value as is.<br>" +
            "PSF Signal scaled - PSF Signal value scaled by AutoIntegrate to 1-100.<br>" +
            "FWHM scaled - FWHM value scaled by AutoIntegrate to 1-100.<br>" +
            "Eccentricity scaled - Eccentricity value scaled by AutoIntegrate to 1-100.<br>" +
            "SNR scaled - SNR value scaled by AutoIntegrate to 1-100.<br>" +
            "Star count - Star count value.<br>" +
            "</p>" +
            "<p>" +
            "All values are scaled so that bigger value is better." +
            "</p>";

      this.weightLabel = new Label( this );
      this.weightLabel.text = "Weight calculation";
      this.weightLabel.toolTip = weightHelpToolTips;
      this.weightLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      this.weightComboBox = newComboBox(this, par.use_weight, use_weight_values, weightHelpToolTips);

      var weightLimitToolTip = "Limit value for SSWEIGHT. If value for SSWEIGHT is below the limit " +
                               "it is not included in the set of processed images.";
      this.weightLimitSpinBoxLabel = newLabel(this, "Limit", weightLimitToolTip);
      this.weightLimitSpinBox = newSpinBox(this, par.ssweight_limit, 0, 999999, weightLimitToolTip);

      this.outlierMethodLabel = new Label( this );
      this.outlierMethodLabel.text = "Outlier method";
      this.outlierMethodLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      this.outlierMethodLabel.toolTip = 
            "<p>Different methods are available for detecting outliers.<p>" +
            "<p>Two sigma filters out outliers that are two sigmas away from mean value.</p>" +
            "<p>One sigma filters out outliers that are one sigmas away from mean value. This option filters "+ 
            "more outliers than the two other options.</p>" +
            "<p>Interquartile range (IQR) measurement is based on median calculations. It should be " + 
            "relatively close to two sigma method.</p>";
      this.outlierMethodComboBox = newComboBox(this, par.outliers_method, outliers_methods, this.outlierMethodLabel.toolTip);

      this.outlierMinMax_CheckBox = newCheckBox(this, "Min Max", par.outliers_minmax, 
            "<p>If checked outliers are filtered using both min and max outlier threshold values.</p>" + 
            "<p>By default FWHM and Eccentricity are filtered for too high values, and SNR and SSWEIGHT are filtered for too low values.</p>" );

      var outlier_filtering_tooltip = 
            "<p>Skipping outliers can be useful when processing very large data sets and manual " +
            "filtering gets too complicated</p>" +
            "<p>Option 'SSWEIGHT' will filter out outliers based on the calculated SSWEIGHT value. It is an alternative " + 
            "to using a fixed Limit value.</p>" + 
            "<p>All other options will filter out outliers based on individual values.</p>";
      this.outlierLabel = new Label( this );
      this.outlierLabel.text = "Outlier filtering";
      this.outlierLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      this.outlierLabel.toolTip = outlier_filtering_tooltip;
      this.outlier_ssweight_CheckBox = newCheckBox(this, "SSWEIGHT", par.outliers_ssweight, outlier_filtering_tooltip);
      this.outlier_fwhm_CheckBox = newCheckBox(this, "FWHM", par.outliers_fwhm, outlier_filtering_tooltip);
      this.outlier_ecc_CheckBox = newCheckBox(this, "Ecc", par.outliers_ecc, outlier_filtering_tooltip);
      this.outlier_snr_CheckBox = newCheckBox(this, "SNR", par.outliers_snr, outlier_filtering_tooltip);
      this.outlier_psfsignal_CheckBox = newCheckBox(this, "PSF Signal", par.outliers_psfsignal, outlier_filtering_tooltip);
      this.outlier_psfpower_CheckBox = newCheckBox(this, "PSF Power", par.outliers_psfpower, outlier_filtering_tooltip);
      this.outlier_stars_CheckBox = newCheckBox(this, "Stars", par.outliers_stars, outlier_filtering_tooltip);

      this.weightGroupBoxLabel = newSectionLabel(this, "Image weight calculation settings");

      this.weightGroupBoxSizer = new HorizontalSizer;
      this.weightGroupBoxSizer.margin = 6;
      this.weightGroupBoxSizer.spacing = 4;
      this.weightGroupBoxSizer.add( this.weightLabel );
      this.weightGroupBoxSizer.add( this.weightComboBox );
      this.weightGroupBoxSizer.add( this.weightLimitSpinBoxLabel );
      this.weightGroupBoxSizer.add( this.weightLimitSpinBox );
      this.weightGroupBoxSizer.addStretch();

      this.weightGroupBoxSizer2 = new HorizontalSizer;
      this.weightGroupBoxSizer2.margin = 6;
      this.weightGroupBoxSizer2.spacing = 4;
      this.weightGroupBoxSizer2.add( this.outlierLabel );
      this.weightGroupBoxSizer2.add( this.outlier_ssweight_CheckBox );
      this.weightGroupBoxSizer2.add( this.outlier_fwhm_CheckBox );
      this.weightGroupBoxSizer2.add( this.outlier_ecc_CheckBox );
      this.weightGroupBoxSizer2.add( this.outlier_snr_CheckBox );
      this.weightGroupBoxSizer2.add( this.outlier_psfsignal_CheckBox );
      this.weightGroupBoxSizer2.add( this.outlier_psfpower_CheckBox );
      this.weightGroupBoxSizer2.add( this.outlier_stars_CheckBox );
      this.weightGroupBoxSizer2.addStretch();

      this.weightGroupBoxSizer3 = new HorizontalSizer;
      this.weightGroupBoxSizer3.margin = 6;
      this.weightGroupBoxSizer3.spacing = 4;
      this.weightGroupBoxSizer3.add( this.outlierMethodLabel );
      this.weightGroupBoxSizer3.add( this.outlierMethodComboBox );
      this.weightGroupBoxSizer3.add( this.outlierMinMax_CheckBox );
      this.weightGroupBoxSizer3.addStretch();

      this.weightSizer = new VerticalSizer;
      //this.weightSizer.margin = 6;
      //this.weightSizer.spacing = 4;
      this.weightSizer.add( this.weightGroupBoxLabel );
      this.weightSizer.add( this.weightGroupBoxSizer );
      this.weightSizer.add( this.weightGroupBoxSizer2 );
      this.weightSizer.add( this.weightGroupBoxSizer3 );

      // CosmeticCorrection Sigma values
      //
      this.cosmeticCorrectionSigmaGroupBoxLabel = newSectionLabel(this, "CosmeticCorrection Sigma values");
      
      var cosmeticCorrectionSigmaGroupBoxLabeltoolTip = "Hot Sigma and Cold Sigma values for CosmeticCorrection";

      this.cosmeticCorrectionHotSigmaGroupBoxLabel = newLabel(this, "Hot Sigma", cosmeticCorrectionSigmaGroupBoxLabeltoolTip);
      this.cosmeticCorrectionHotSigmaSpinBox = newSpinBox(this, par.cosmetic_correction_hot_sigma, 0, 10, cosmeticCorrectionSigmaGroupBoxLabeltoolTip);
      this.cosmeticCorrectionColSigmaGroupBoxLabel = newLabel(this, "Cold Sigma", cosmeticCorrectionSigmaGroupBoxLabeltoolTip);
      this.cosmeticCorrectionColdSigmaSpinBox = newSpinBox(this, par.cosmetic_correction_cold_sigma, 0, 10, cosmeticCorrectionSigmaGroupBoxLabeltoolTip);
      this.cosmeticCorrectionSigmaGroupBoxSizer = new HorizontalSizer;
      this.cosmeticCorrectionSigmaGroupBoxSizer.margin = 6;
      this.cosmeticCorrectionSigmaGroupBoxSizer.spacing = 4;
      this.cosmeticCorrectionSigmaGroupBoxSizer.add( this.cosmeticCorrectionHotSigmaGroupBoxLabel );
      this.cosmeticCorrectionSigmaGroupBoxSizer.add( this.cosmeticCorrectionHotSigmaSpinBox );
      this.cosmeticCorrectionSigmaGroupBoxSizer.add( this.cosmeticCorrectionColSigmaGroupBoxLabel );
      this.cosmeticCorrectionSigmaGroupBoxSizer.add( this.cosmeticCorrectionColdSigmaSpinBox );
      this.cosmeticCorrectionSigmaGroupBoxSizer.toolTip = cosmeticCorrectionSigmaGroupBoxLabeltoolTip;
      this.cosmeticCorrectionSigmaGroupBoxSizer.addStretch();

      this.cosmeticCorrectionGroupBoxSizer = new VerticalSizer;
      //this.cosmeticCorrectionGroupBoxSizer.margin = 6;
      //this.cosmeticCorrectionGroupBoxSizer.spacing = 4;
      this.cosmeticCorrectionGroupBoxSizer.add( this.cosmeticCorrectionSigmaGroupBoxLabel );
      this.cosmeticCorrectionGroupBoxSizer.add( this.cosmeticCorrectionSigmaGroupBoxSizer );
      this.cosmeticCorrectionGroupBoxSizer.toolTip = cosmeticCorrectionSigmaGroupBoxLabeltoolTip;
      this.cosmeticCorrectionGroupBoxSizer.addStretch();

      // Linear Fit selection

      this.linearFitComboBox = newComboBox(this, par.use_linear_fit, use_linear_fit_values, 
            "<p>Choose how to do linear fit of images.</p>" +
            "<p>Default for linear fit is to use the luminance channel. If the luminance channel is not present then RGB images use a red channel and narrowband images do not do linear fit.</p>" +
            "<p>In case of narrowband images, note that if luminance image is generated and luminance is used for linear fit then in auto mode the channels will be linked by default.</p>"
      );

      this.linearFitGroupBoxLabel = newSectionLabel(this, "Linear fit setting");
      this.linearFitGroupBoxSizer = new HorizontalSizer;
      this.linearFitGroupBoxSizer.margin = 6;
      this.linearFitGroupBoxSizer.spacing = 4;
      this.linearFitGroupBoxSizer.add( this.linearFitComboBox );
      this.linearFitGroupBoxSizer.addStretch();

      //
      // Stretching
      //

      var Hyperbolic_tips = "<p>Generalized Hyperbolic Stretching (GHS) is most useful on bright targets where AutoSTF may not work well. " + 
                            "It often preserves background and stars well and also saturation is good. For very dim or small targets " + 
                            "the implementation in AutoIntegrate does not work that well.</p>" + 
                            "<p>It is recommended that dark background is as clean as possible from any gradients with GHS. " + 
                            "Consider using ABE on combined images and maybe also BackgroundNeutralization to clean image background. Local Normalization can be useful too.</p>" +
                            "<p>It is also recommended that Crop to common are option is used. It cleans the image from bad data and makes " + 
                            "finding the symmetry point more robust.</p>" + 
                            "<p>Generalized Hyperbolic Stretching is using PixelMath formulas from PixInsight forum member dapayne (David Payne).</p>";

      var histogramStretchToolTip = "Experimental, using simple histogram transformation with some clipping to get histogram median or peak to the target value. " + 
                                    "Works best with images that are processed with the Crop to common area option.";
      var stretchingTootip = 
            "<ul>" +
            "<li>Auto STF - Use auto Screen Transfer Function to stretch image to non-linear.</li>" +
            "<li>Masked Stretch - Use MaskedStretch to stretch image to non-linear.<p>Useful when AutoSTF generates too bright images, like on some galaxies.</p></li>" +
            "<li>Arcsinh Stretch - Use ArcsinhStretch to stretch image to non-linear.<p>Useful also when stretching stars to keep good star color.</p></li>" +
            "<li>Hyperbolic - Experimental, Generalized Hyperbolic Stretching. " + Hyperbolic_tips + "</li>" +
            "<li>Histogram stretch - " + histogramStretchToolTip + "</li>" +
            "</ul>";
      this.stretchingComboBox = newComboBox(this, par.image_stretching, image_stretching_values, stretchingTootip);
      this.starsStretchingLabel = newLabel(this, " Stars ", "Stretching for stars if stars are extracted from image.");
      this.starsStretchingComboBox = newComboBox(this, par.stars_stretching, image_stretching_values, stretchingTootip);
      var stars_combine_operations_Tooltip = "<p>Possible combine operations are:<br>" +
                                             "Add - Use stars+starless formula in Pixelmath<br>" +
                                             "Screen - Similar to screen in Photoshop<br>" +
                                             "Lighten - Similar to lighten in Photoshop</p>";
      var stars_combine_Tooltip = "<p>Select how to combine star and starless image.</p>" + stars_combine_operations_Tooltip;
      this.starsCombineLabel = newLabel(this, " Combine ", stars_combine_Tooltip);
      this.starsCombineComboBox = newComboBox(this, par.stars_combine, starless_and_stars_combine_values, stars_combine_Tooltip);
      
      this.stretchingChoiceSizer = new HorizontalSizer;
      this.stretchingChoiceSizer.margin = 6;
      this.stretchingChoiceSizer.spacing = 4;
      this.stretchingChoiceSizer.add( this.stretchingComboBox );
      this.stretchingChoiceSizer.add( this.starsStretchingLabel );
      this.stretchingChoiceSizer.add( this.starsStretchingComboBox );
      this.stretchingChoiceSizer.add( this.starsCombineLabel );
      this.stretchingChoiceSizer.add( this.starsCombineComboBox );
      this.stretchingChoiceSizer.addStretch();

      this.STFLabel = new Label( this );
      this.STFLabel.text = "Auto STF link RGB channels";
      this.STFLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      this.STFLabel.toolTip = 
      "<p>" +
      "RGB channel linking in Screen Transfer Function." +
      "</p><p>" +
      "With Auto the default for true RGB images is to use linked channels. For narrowband and OSC/DSLR images the default " +
      "is to use unlinked channels. But if linear fit is done with narrowband images, then linked channels are used." +
      "</p>";
      this.STFComboBox = newComboBox(this, par.STF_linking, STF_linking_values, this.STFLabel.toolTip);

      this.STFSizer = new HorizontalSizer;
      this.STFSizer.spacing = 4;
      this.STFSizer.toolTip = this.STFLabel.toolTip;
      this.STFSizer.add( this.STFLabel );
      this.STFSizer.add( this.STFComboBox );

      this.STFTargetBackgroundControl = newNumericControl(this, "STF targetBackground", par.STF_targetBackground, 0, 1,
            "<p>STF targetBackground value. If you get too bright image lowering this value can help.</p>");

      /* Masked.
       */
      this.MaskedStretchTargetBackgroundControl = newNumericControl(this, "Masked Stretch targetBackground", par.MaskedStretch_targetBackground, 0, 1,
            "<p>Masked Stretch targetBackground value. Usually values between 0.1 and 0.2 work best.</p>");

      /* Arcsinh.
       */
      this.Arcsinh_stretch_factor_Edit = newNumericEdit(this, "Arcsinh Stretch Factor", par.Arcsinh_stretch_factor, 1, 1000,
            "<p>Arcsinh Stretch Factor value. Smaller values are usually better than really big ones.</p>" +
            "<p>For some smaller but bright targets like galaxies it may be useful to increase stretch factor and iterations. A good starting point could be 100 and 5.</p>" +
            "<p>Useful for stretching stars to keep star colors. Depending on the star combine method you may need to use a different values. For less stars you can use a smaller value.</p>");
      this.Arcsinh_black_point_Control = newNumericEdit(this, "Black point value %", par.Arcsinh_black_point, 0, 99,
            "<p>Arcsinh Stretch black point value.</p>" + 
            "<p>The value is given as percentage of shadow pixels, that is, how many pixels are on the left side of the histogram.</p>");
      this.Arcsinh_black_point_Control.setPrecision( 4 );
      var Arcsinh_iterations_tooltip = "Number of iterations used to get the requested stretch factor."
      this.Arcsinh_iterations_Label = newLabel(this, "Iterations", Arcsinh_iterations_tooltip);
      this.Arcsinh_iterations_SpinBox = newSpinBox(this, par.Arcsinh_iterations, 1, 10, Arcsinh_iterations_tooltip);

      this.ArcsinhSizer = new HorizontalSizer;
      this.ArcsinhSizer.spacing = 4;
      this.ArcsinhSizer.margin = 2;
      this.ArcsinhSizer.add( this.Arcsinh_stretch_factor_Edit );
      this.ArcsinhSizer.add( this.Arcsinh_black_point_Control );
      this.ArcsinhSizer.add( this.Arcsinh_iterations_Label );
      this.ArcsinhSizer.add( this.Arcsinh_iterations_SpinBox );
      this.ArcsinhSizer.addStretch();

      /* Hyperbolic.
       */
      this.Hyperbolic_D_Control = newNumericEdit(this, "Hyperbolic Stretch D value", par.Hyperbolic_D, 1, 15,
            "<p>Experimental, Hyperbolic Stretch factor D value, with 0 meaning no stretch/change at all.</p>" + 
            "<p>This value is a starting value that we use for iteration. The value is decreased until histogram " +
            "target is below the given limit.</p>" + Hyperbolic_tips);
      this.Hyperbolic_b_Control = newNumericEdit(this, "b value", par.Hyperbolic_b, 1, 15,
            "<p>Experimental, Hyperbolic Stretch b value that can be thought of as the stretch intensity. For bigger b, the stretch will be greater " + 
            "focused around a single intensity, while a lower b will spread the stretch around.</p>" + Hyperbolic_tips);
      this.Hyperbolic_SP_Control = newNumericEdit(this, "SP value %", par.Hyperbolic_SP, 0, 99,
            "<p>Experimental, Hyperbolic Stretch symmetry point value specifying the pixel value around which the stretch is applied. " + 
            "The value is given as percentage of shadow pixels, that is, how many pixels are on the left side of the histogram.</p>" + 
            "<p>As a general rule for small targets you should use relatively small value so SP stays on the left side of the histogram (for example 0.1 or 1). " + 
            "For large targets that cover more of the image you should use a values that are closer to the histogram peak (maybe something between 40 and 50).</p>" +
            Hyperbolic_tips);
      this.Hyperbolic_target_Control = newNumericEdit(this, "Hyperbolic histogram target", par.Hyperbolic_target, 0, 1,
            "<p>Experimental, Hyperbolic Stretch histogram target value. Stops stretching when histogram peak is within 10% of this value. Value is given in scale of [0, 1].</p>" + Hyperbolic_tips);
      this.hyperbolicIterationsLabel = new Label(this);
      this.hyperbolicIterationsLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      this.hyperbolicIterationsLabel.text = "Iterations";
      this.hyperbolicIterationsLabel.toolTip = "<p>Experimental, Hyperbolic Stretch number of iterations.</p>" + Hyperbolic_tips;
      this.hyperbolicIterationsSpinBox = newSpinBox(this, par.Hyperbolic_iterations, 1, 20, this.hyperbolicIterationsLabel.toolTip);
      this.hyperbolicModeLabel = new Label(this);
      this.hyperbolicModeLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      this.hyperbolicModeLabel.text = "Mode";
      this.hyperbolicModeLabel.toolTip = "<p>Experimental, Hyperbolic Stretch test mode.</p>" +
                                         "<ul>" +
                                         "<li>1 - Decrease D for every iteration</li>" +
                                         "<li>2 - Decrease D for every iteration, use histogram peak as symmetry point (ignore SP value %)</li>" +
                                         "</ul>" + Hyperbolic_tips;
      this.hyperbolicModeSpinBox = newSpinBox(this, par.Hyperbolic_mode, 1, 2, this.hyperbolicModeLabel.toolTip);
      this.hyperbolicSizer1 = new HorizontalSizer;
      this.hyperbolicSizer1.spacing = 4;
      this.hyperbolicSizer1.margin = 2;
      this.hyperbolicSizer1.add( this.Hyperbolic_D_Control );
      this.hyperbolicSizer1.add( this.Hyperbolic_b_Control );
      this.hyperbolicSizer1.add( this.Hyperbolic_SP_Control );
      this.hyperbolicSizer1.addStretch();
      this.hyperbolicSizer2 = new HorizontalSizer;
      this.hyperbolicSizer2.spacing = 4;
      this.hyperbolicSizer2.margin = 2;
      this.hyperbolicSizer2.add( this.Hyperbolic_target_Control );
      this.hyperbolicSizer2.add( this.hyperbolicIterationsLabel );
      this.hyperbolicSizer2.add( this.hyperbolicIterationsSpinBox );
      this.hyperbolicSizer2.add( this.hyperbolicModeLabel );
      this.hyperbolicSizer2.add( this.hyperbolicModeSpinBox );
      this.hyperbolicSizer2.addStretch();
      this.hyperbolicSizer = new VerticalSizer;
      this.hyperbolicSizer.spacing = 4;
      this.hyperbolicSizer.margin = 2;
      this.hyperbolicSizer.add( this.hyperbolicSizer1 );
      this.hyperbolicSizer.add( this.hyperbolicSizer2 );
      this.hyperbolicSizer.addStretch();

      this.histogramShadowClip_Control = newNumericEditPrecision(this, "Histogram stretch shadow clip", par.histogram_shadow_clip, 0, 99,
                                          "Percentage of shadows that are clipped with Histogram stretch.", 3);
      this.histogramTypeLabel = newLabel(this, "Target type", "Target type specifies what value calculated from histogram is tried to get close to Target value.");
      this.histogramTypeComboBox = newComboBox(this, par.histogram_stretch_type, histogram_stretch_type_values, this.histogramTypeLabel.toolTip);
      this.histogramTargetValue_Control = newNumericEdit(this, "Target value", par.histogram_stretch_target, 0, 99, "Target value specifies where we try to get the the value calculated using Target type.");

      this.histogramStretchingSizer = new HorizontalSizer;
      this.histogramStretchingSizer.spacing = 4;
      this.histogramStretchingSizer.margin = 2;
      this.histogramStretchingSizer.add( this.histogramShadowClip_Control );
      this.histogramStretchingSizer.add( this.histogramTypeLabel );
      this.histogramStretchingSizer.add( this.histogramTypeComboBox );
      this.histogramStretchingSizer.add( this.histogramTargetValue_Control );
      this.histogramStretchingSizer.addStretch();
      
      /* Options.
       */
      this.StretchingOptionsSizer = new VerticalSizer;
      this.StretchingOptionsSizer.spacing = 4;
      this.StretchingOptionsSizer.margin = 2;
      this.StretchingOptionsSizer.add( this.STFSizer );
      this.StretchingOptionsSizer.add( this.STFTargetBackgroundControl );
      this.StretchingOptionsSizer.add( this.MaskedStretchTargetBackgroundControl );
      this.StretchingOptionsSizer.add( this.ArcsinhSizer );
      //this.StretchingOptionsSizer.addStretch();

      this.StretchingGroupBoxLabel = newSectionLabel(this, "Image stretching settings");
      this.StretchingGroupBoxLabel.toolTip = "Settings for stretching linear image image to non-linear.";
      this.StretchingGroupBoxSizer = new VerticalSizer;
      this.StretchingGroupBoxSizer.margin = 6;
      this.StretchingGroupBoxSizer.spacing = 4;
      this.StretchingGroupBoxSizer.add( this.stretchingChoiceSizer );
      this.StretchingGroupBoxSizer.add( this.StretchingOptionsSizer );
      this.StretchingOptionsSizer.add( this.hyperbolicSizer );
      this.StretchingOptionsSizer.add( this.histogramStretchingSizer );
      this.StretchingGroupBoxSizer.addStretch();

      //
      // Image integration
      //
      // normalization
      this.ImageIntegrationNormalizationLabel = new Label( this );
      this.ImageIntegrationNormalizationLabel.text = "Normalization";
      this.ImageIntegrationNormalizationLabel.toolTip = "Rejection normalization. This is value is ignored if local normalization is used.";
      this.ImageIntegrationNormalizationLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      this.ImageIntegrationNormalizationComboBox = newComboBox(this, par.imageintegration_normalization, imageintegration_normalization_values, this.ImageIntegrationNormalizationLabel.toolTip);
   
      this.ImageIntegrationNormalizationSizer = new HorizontalSizer;
      this.ImageIntegrationNormalizationSizer.spacing = 4;
      this.ImageIntegrationNormalizationSizer.add( this.ImageIntegrationNormalizationLabel );
      this.ImageIntegrationNormalizationSizer.add( this.ImageIntegrationNormalizationComboBox, 100 );

      // Pixel rejection algorithm/clipping
      var sigma_tips = "If you are not happy with the rejection result you can lower the High sigma for example to 2.8.";
      var winsorised_tips = "To remove satellite trails with Winsorised sigma use lower high sigma value like 2.2 or even 1.8.";
      var ESD_tips = "If you are not happy with the rejection result you can try higher ESD Significance like 0.2 and lower Low relaxation like 1.0.";
      var ImageIntegrationHelpToolTips = 
            "<p>" +
            "<b>Auto1</b><br>" + 
            "- Percentile clipping for 1-7 images<br>" +
            "- Sigma clipping otherwise." +
            "</p><p>" +
            "<b>Auto2</b><br>" + 
            "- Percentile clipping for 1-7 images<br>" +
            "- Sigma clipping for 8 - 10 images<br>" +
            "- Winsorised sigma clipping for 11 - 19 images<br>" +
            "- Linear fit clipping for 20 - 24 images<br>" +
            "- ESD clipping for more than 25 images" +
            "</p><p>" +
            "<b>Percentile</b> - Percentile clip" +
            "</p><p>" +
            "<b>Sigma</b> - Sigma clipping. " + sigma_tips +
            "</p><p>" +
            "<b>Winsorised</b> - Winsorised sigma clipping. " + winsorised_tips +
            "</p><p>" +
            "<b>Averaged</b> - Averaged sigma clipping. " + sigma_tips +
            "</p><p>" +
            "<b>Linear</b> - Linear fit clipping" +
            "</p><p>" +
            "<b>ESD</b> - Extreme Studentized Deviate clipping. " + ESD_tips +
            "</p><p>" +
            "<b>None</b> - No rejection. Useful for example with blown out comet core." +
            "</p>";

      this.ImageIntegrationRejectionLabel = new Label( this );
      this.ImageIntegrationRejectionLabel.text = "Rejection";
      this.ImageIntegrationRejectionLabel.toolTip = ImageIntegrationHelpToolTips;
      this.ImageIntegrationRejectionLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
   
      this.ImageIntegrationRejectionComboBox = newComboBox(this, par.use_clipping, use_clipping_values, ImageIntegrationHelpToolTips);
   
      // Image integration
      this.ImageIntegrationRejectionSizer = new HorizontalSizer;
      this.ImageIntegrationRejectionSizer.spacing = 4;
      this.ImageIntegrationRejectionSizer.add( this.ImageIntegrationRejectionLabel );
      this.ImageIntegrationRejectionSizer.add( this.ImageIntegrationRejectionComboBox, 100 );

      this.ImageIntegrationPercentileLow = newNumericEdit(this, 'Percentile Low', par.percentile_low, 0, 1, "<p>Percentile low clipping factor.</p>");
      this.ImageIntegrationPercentileHigh = newNumericEdit(this, 'High', par.percentile_high, 0, 1, "<p>Percentile high clipping factor.</p>");
      this.ImageIntegrationSigmaLow = newNumericEdit(this, 'Sigma Low', par.sigma_low, 0, 10, "<p>Sigma low clipping factor.</p>");
      this.ImageIntegrationSigmaHigh = newNumericEdit(this, 'High', par.sigma_high, 0, 10, "<p>Sigma high clipping factor.</p><p>" + sigma_tips + "</p><p>" + winsorised_tips + "</p>");
      this.ImageIntegrationWinsorisedCutoff = newNumericEdit(this, 'Winsorization cutoff', par.winsorised_cutoff, 3, 10, "<p>Cutoff point for Winsorised sigma clipping.</p>");
      this.ImageIntegrationLinearFitLow = newNumericEdit(this, 'Linear fit Low', par.linearfit_low, 0, 10, "<p>Tolerance of low values for linear fit low clipping.</p>");
      this.ImageIntegrationLinearFitHigh = newNumericEdit(this, 'High', par.linearfit_high, 0, 10, "<p>Tolerance of high values for linear fit low clipping.</p>");
      this.ImageIntegrationESDOutliers = newNumericEdit(this, 'ESD Outliers', par.ESD_outliers, 0, 1, "<p>ESD outliers.</p>");
      this.ImageIntegrationESDSignificance = newNumericEdit(this, 'Significance', par.ESD_significance, 0, 1, "<p>ESD significance.</p><p>" + ESD_tips + "</p>");

      this.ImageIntegrationRejectionSettingsSizer1 = new HorizontalSizer;
      this.ImageIntegrationRejectionSettingsSizer1.spacing = 4;
      this.ImageIntegrationRejectionSettingsSizer1.toolTip = ImageIntegrationHelpToolTips;
      this.ImageIntegrationRejectionSettingsSizer1.add( this.ImageIntegrationNormalizationSizer );
      this.ImageIntegrationRejectionSettingsSizer1.add( this.ImageIntegrationRejectionSizer );
      this.ImageIntegrationRejectionSettingsSizer1.addStretch();

      this.ImageIntegrationRejectionSettingsSizer2 = new HorizontalSizer;
      this.ImageIntegrationRejectionSettingsSizer2.spacing = 4;
      this.ImageIntegrationRejectionSettingsSizer2.add( this.ImageIntegrationPercentileLow );
      this.ImageIntegrationRejectionSettingsSizer2.add( this.ImageIntegrationPercentileHigh );
      this.ImageIntegrationRejectionSettingsSizer2.add( this.ImageIntegrationSigmaLow );
      this.ImageIntegrationRejectionSettingsSizer2.add( this.ImageIntegrationSigmaHigh );
      this.ImageIntegrationRejectionSettingsSizer2.add( this.ImageIntegrationWinsorisedCutoff );
      this.ImageIntegrationRejectionSettingsSizer2.addStretch();

      this.ImageIntegrationRejectionSettingsSizer3 = new HorizontalSizer;
      this.ImageIntegrationRejectionSettingsSizer3.spacing = 4;
      this.ImageIntegrationRejectionSettingsSizer3.add( this.ImageIntegrationLinearFitLow );
      this.ImageIntegrationRejectionSettingsSizer3.add( this.ImageIntegrationLinearFitHigh );
      this.ImageIntegrationRejectionSettingsSizer3.add( this.ImageIntegrationESDOutliers );
      this.ImageIntegrationRejectionSettingsSizer3.add( this.ImageIntegrationESDSignificance );
      this.ImageIntegrationRejectionSettingsSizer3.addStretch();

      this.clippingGroupBoxLabel = newSectionLabel(this, 'Image integration pixel rejection');
      this.clippingGroupBoxSizer = new VerticalSizer;
      this.clippingGroupBoxSizer.margin = 6;
      this.clippingGroupBoxSizer.spacing = 4;
      this.clippingGroupBoxSizer.toolTip = ImageIntegrationHelpToolTips;
      this.clippingGroupBoxSizer.add( this.ImageIntegrationRejectionSettingsSizer1 );
      this.clippingGroupBoxSizer.add( this.ImageIntegrationRejectionSettingsSizer2 );
      this.clippingGroupBoxSizer.add( this.ImageIntegrationRejectionSettingsSizer3 );
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

      this.narrowbandColorPaletteLabel = newSectionLabel(this, "Color palette");
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
            "Dynamic palettes, credit https://thecoldestnights.com/2020/06/PixInsight-dynamic-narrowband-combinations-with-pixelmath/<br>" +
            "L-eXtreme SHO palette was posted by Alessio Pariani to Astrobin forums. It is an example mapping for L-eXtreme filter." +
            "</p>" +
            narrowbandToolTip;
      this.narrowbandCustomPalette_ComboBox.onItemSelected = function( itemIndex )
      {
            this.dialog.narrowbandCustomPalette_R_ComboBox.editText = narrowBandPalettes[itemIndex].R;
            this.dialog.narrowbandCustomPalette_G_ComboBox.editText = narrowBandPalettes[itemIndex].G;
            this.dialog.narrowbandCustomPalette_B_ComboBox.editText = narrowBandPalettes[itemIndex].B;

            par.custom_R_mapping.val = this.dialog.narrowbandCustomPalette_R_ComboBox.editText;
            par.custom_G_mapping.val = this.dialog.narrowbandCustomPalette_G_ComboBox.editText;
            par.custom_B_mapping.val = this.dialog.narrowbandCustomPalette_B_ComboBox.editText;
      };

      /* Create Editable boxes for R, G and B mapping. 
       */
      this.narrowbandCustomPalette_R_Label = new Label( this );
      this.narrowbandCustomPalette_R_Label.text = "R";
      this.narrowbandCustomPalette_R_Label.textAlignment = TextAlign_Right|TextAlign_VertCenter;
      this.narrowbandCustomPalette_R_Label.toolTip = 
            "<p>" +
            "Mapping for R channel. Use one of the predefined mappings or edit and create your own mapping." +
            "</p>" +
            narrowbandToolTip;

      this.narrowbandCustomPalette_R_ComboBox = newComboBoxpalette(this, par.custom_R_mapping, [par.custom_R_mapping.val, "0.75*H + 0.25*S"], this.narrowbandCustomPalette_R_Label.toolTip);

      this.narrowbandCustomPalette_G_Label = new Label( this );
      this.narrowbandCustomPalette_G_Label.text = "G";
      this.narrowbandCustomPalette_G_Label.textAlignment = TextAlign_Right|TextAlign_VertCenter;
      this.narrowbandCustomPalette_G_Label.toolTip = 
            "<p>" +
            "Mapping for G channel. Use one of the predefined mappings or edit and create your own mapping." +
            "</p>" +
            narrowbandToolTip;

      this.narrowbandCustomPalette_G_ComboBox = newComboBoxpalette(this, par.custom_G_mapping, [par.custom_G_mapping.val, "0.50*S + 0.50*O"], this.narrowbandCustomPalette_G_Label.toolTip);

      this.narrowbandCustomPalette_B_Label = new Label( this );
      this.narrowbandCustomPalette_B_Label.text = "B";
      this.narrowbandCustomPalette_B_Label.textAlignment = TextAlign_Right|TextAlign_VertCenter;
      this.narrowbandCustomPalette_B_Label.toolTip = 
            "<p>" +
            "Mapping for B channel. Use one of the predefined mappings or edit and create your own mapping." +
            "</p>" +
            narrowbandToolTip;

      this.narrowbandCustomPalette_B_ComboBox = newComboBoxpalette(this, par.custom_B_mapping, [par.custom_B_mapping.val, "0.30*H + 0.70*O"], this.narrowbandCustomPalette_B_Label.toolTip);

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
      this.narrowbandCustomPalette_Sizer.addStretch();

      this.force_narrowband_mapping_CheckBox = newCheckBox(this, "Force narrowband mapping", par.force_narrowband_mapping, 
            "<p>" +
            "Force narrowband mapping using formulas given in Color palette section." +
            "</p>" );
      this.mapping_on_nonlinear_data_CheckBox = newCheckBox(this, "Narrowband mapping using non-linear data", par.mapping_on_nonlinear_data, 
            "<p>" +
            "Do narrowband mapping using non-linear data. Before running PixelMath images are stretched to non-linear state. " +
            "</p>" );

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
      this.narrowbandLinearFit_ComboBox = newComboBox(this, par.narrowband_linear_fit, narrowband_linear_fit_values, this.narrowbandLinearFit_Label.toolTip);

      this.mapping_on_nonlinear_data_Sizer = new HorizontalSizer;
      this.mapping_on_nonlinear_data_Sizer.margin = 2;
      this.mapping_on_nonlinear_data_Sizer.spacing = 4;
      this.mapping_on_nonlinear_data_Sizer.add( this.force_narrowband_mapping_CheckBox );
      this.mapping_on_nonlinear_data_Sizer.add( this.mapping_on_nonlinear_data_CheckBox );

      /* Luminance channel mapping.
       */
      this.narrowbandLuminancePalette_ComboBox = new ComboBox( this );
      this.narrowbandLuminancePalette_ComboBox.addItem( "" );
      this.narrowbandLuminancePalette_ComboBox.addItem( "L" );
      this.narrowbandLuminancePalette_ComboBox.addItem( "max(L, H)" );
      this.narrowbandLuminancePalette_ComboBox.toolTip = "<p>Mapping of Luminance channel with narrowband data if both RGB and narrowband data are available.</p>" +
                                                         "<p>With empty text no mapping is done.</p>";
      this.narrowbandLuminancePalette_ComboBox.onItemSelected = function( itemIndex )
      {
            switch (itemIndex) {
                  case 0:
                        this.dialog.narrowbandCustomPalette_L_ComboBox.editText = "";
                        break;
                  case 1:
                        this.dialog.narrowbandCustomPalette_L_ComboBox.editText = "L";
                        break;
                  case 2:
                        this.dialog.narrowbandCustomPalette_L_ComboBox.editText = "max(L, H)";
                        break;
            }
            par.custom_L_mapping.val = this.dialog.narrowbandCustomPalette_L_ComboBox.editText;
      };

      this.narrowbandCustomPalette_L_Label = new Label( this );
      this.narrowbandCustomPalette_L_Label.text = "L";
      this.narrowbandCustomPalette_L_Label.textAlignment = TextAlign_Right|TextAlign_VertCenter;
      this.narrowbandCustomPalette_L_Label.toolTip = this.narrowbandLuminancePalette_ComboBox.toolTip;

      this.narrowbandCustomPalette_L_ComboBox = newComboBoxpalette(this, par.custom_L_mapping, [par.custom_L_mapping.val, "max(L, H)"], this.narrowbandLuminancePalette_ComboBox.toolTip);

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
      this.NbLuminanceSizer.add( this.narrowbandLinearFit_Label );
      this.NbLuminanceSizer.add( this.narrowbandLinearFit_ComboBox );
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
            "This mapping is similar to NBRGBCombination script in PixInsight or " +
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
            
      this.useRGBNBmapping_CheckBox = newCheckBox(this, "Use Narrowband RGB mapping", par.use_RGBNB_Mapping, RGBNB_tooltip);
      this.useRGBbandwidth_CheckBox = newCheckBox(this, "Use RGB image", par.use_RGB_image, 
            "<p>" +
            "Use RGB image for bandwidth mapping instead of separate R, G and B channel images. " +
            "R channel bandwidth is then used for the RGB image." +
            "</p>" );
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
            par.use_RGBNB_Mapping.val = true;
            clearDefaultDirs();
            try {
                  testRGBNBmapping();
                  setDefaultDirs();
            } 
            catch(err) {
                  console.criticalln(err);
                  console.criticalln("Processing stopped!");
                  writeProcessingSteps(null, true, ppar.win_prefix + "AutoRGBNB");
                  console.endLog();
                  setDefaultDirs();
            }
            par.use_RGBNB_Mapping.val = false;
      };   

      // channel mapping
      this.RGBNB_MappingLabel = newLabel(this, 'Mapping', "Select mapping of narrowband channels to (L)RGB channels.");
      this.RGBNB_MappingLLabel = newLabel(this, 'L', "Mapping of narrowband channel to L channel. If there is no L channel available then this setting is ignored.");
      this.RGBNB_MappingLValue = newComboBox(this, par.L_mapping, RGBNB_mapping_values, this.RGBNB_MappingLLabel.toolTip);
      this.RGBNB_MappingRLabel = newLabel(this, 'R', "Mapping of narrowband channel to R channel. If no mapping is selected then channel is left unchanged.");
      this.RGBNB_MappingRValue = newComboBox(this, par.R_mapping, RGBNB_mapping_values, this.RGBNB_MappingRLabel.toolTip);
      this.RGBNB_MappingGLabel = newLabel(this, 'G', "Mapping of narrowband channel to G channel. If no mapping is selected then channel is left unchanged.");
      this.RGBNB_MappingGValue = newComboBox(this, par.G_mapping, RGBNB_mapping_values, this.RGBNB_MappingGLabel.toolTip);
      this.RGBNB_MappingBLabel = newLabel(this, 'B', "Mapping of narrowband channel to G channel. If no mapping is selected then channel is left unchanged.");
      this.RGBNB_MappingBValue = newComboBox(this, par.B_mapping, RGBNB_mapping_values, this.RGBNB_MappingBLabel.toolTip);

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
      this.RGBNB_BoostLabel = newLabel(this, 'Boost', "Select boost, or multiplication factor, for the channels.");
      this.RGBNB_BoostLValue = newRGBNBNumericEdit(this, 'L', par.L_BoostFactor, "Boost, or multiplication factor, for the L channel.");
      this.RGBNB_BoostRValue = newRGBNBNumericEdit(this, 'R', par.R_BoostFactor, "Boost, or multiplication factor, for the R channel.");
      this.RGBNB_BoostGValue = newRGBNBNumericEdit(this, 'G', par.G_BoostFactor, "Boost, or multiplication factor, for the G channel.");
      this.RGBNB_BoostBValue = newRGBNBNumericEdit(this, 'B', par.B_BoostFactor, "Boost, or multiplication factor, for the B channel.");

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
      this.RGBNB_BandwidthLabel = newLabel(this, 'Bandwidth', "Select bandwidth (nm) for each filter.");
      this.RGBNB_BandwidthLValue = newRGBNBNumericEdit(this, 'L', par.L_bandwidth, "Bandwidth (nm) for the L filter.");
      this.RGBNB_BandwidthRValue = newRGBNBNumericEdit(this, 'R', par.R_bandwidth, "Bandwidth (nm) for the R filter.");
      this.RGBNB_BandwidthGValue = newRGBNBNumericEdit(this, 'G', par.G_bandwidth, "Bandwidth (nm) for the G filter.");
      this.RGBNB_BandwidthBValue = newRGBNBNumericEdit(this, 'B', par.B_bandwidth, "Bandwidth (nm) for the B filter.");
      this.RGBNB_BandwidthHValue = newRGBNBNumericEdit(this, 'H', par.H_bandwidth, "Bandwidth (nm) for the H filter. Typical values could be 7 nm or 3 nm.");
      this.RGBNB_BandwidthSValue = newRGBNBNumericEdit(this, 'S', par.S_bandwidth, "Bandwidth (nm) for the S filter. Typical values could be 8.5 nm or 3 nm.");
      this.RGBNB_BandwidthOValue = newRGBNBNumericEdit(this, 'O', par.O_bandwidth, "Bandwidth (nm) for the O filter. Typical values could be 8.5 nm or 3 nm.");

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

      this.narrowbandControl = new Control( this );
      this.narrowbandControl.sizer = new VerticalSizer;
      this.narrowbandControl.sizer.margin = 6;
      this.narrowbandControl.sizer.spacing = 4;
      this.narrowbandControl.sizer.add( this.narrowbandColorPaletteLabel );
      this.narrowbandControl.sizer.add( this.narrowbandCustomPalette_Sizer );
      this.narrowbandControl.sizer.add( this.NbLuminanceSizer );
      this.narrowbandControl.sizer.add( this.mapping_on_nonlinear_data_Sizer );
      this.narrowbandControl.visible = false;

      this.narrowbandRGBmappingControl = new Control( this );
      //this.narrowbandRGBmappingControl.title = "Narrowband to RGB mapping";
      this.narrowbandRGBmappingControl.sizer = new VerticalSizer;
      this.narrowbandRGBmappingControl.sizer.margin = 6;
      this.narrowbandRGBmappingControl.sizer.spacing = 4;
      this.narrowbandRGBmappingControl.sizer.add( this.RGBNB_Sizer );
      //this.narrowbandRGBmappingControl.sizer.add( this.narrowbandAutoContinue_sizer );
      // hide this section by default
      this.narrowbandRGBmappingControl.visible = false;

      // Narrowband extra processing
      this.fix_narrowband_star_color_CheckBox = newCheckBox(this, "Fix star colors", par.fix_narrowband_star_color, 
            "<p>Fix magenta color on stars typically seen with SHO color palette. If all green is not removed from the image then a mask use used to fix only stars. " + 
            "This is also run with AutoContinue and Extra processing.</p>" );
      this.narrowband_orange_hue_shift_CheckBox = newCheckBox(this, "Hue shift for more orange", par.run_orange_hue_shift, 
            "<p>Do hue shift to enhance orange color. Useful with SHO color palette. Also run with AutoContinue and Extra processing.</p>" );
      this.narrowband_hue_shift_CheckBox = newCheckBox(this, "Hue shift for SHO", par.run_hue_shift, 
            "<p>Do hue shift to enhance HSO colors. Useful with SHO color palette. Also run with AutoContinue and Extra processing.</p>" );
      this.narrowband_leave_some_green_CheckBox = newCheckBox(this, "Leave some green", par.leave_some_green, 
            "<p>Leave some green color on image when running SCNR (amount 0.50). Useful with SHO color palette. " +
            "This is also run with AutoContinue and Extra processing.</p>" );
      this.run_narrowband_SCNR_CheckBox = newCheckBox(this, "Remove green cast", par.run_narrowband_SCNR, 
            "<p>Run SCNR to remove green cast. Useful with SHO color palette. This is also run with AutoContinue and Extra processing.</p>" );
      this.no_star_fix_mask_CheckBox = newCheckBox(this, "No mask when fixing star colors", par.skip_star_fix_mask, 
            "<p>Do not use star mask when fixing star colors</p>" );

      this.narrowbandOptions1_sizer = new VerticalSizer;
      this.narrowbandOptions1_sizer.margin = 6;
      this.narrowbandOptions1_sizer.spacing = 4;
      this.narrowbandOptions1_sizer.add( this.narrowband_orange_hue_shift_CheckBox );
      this.narrowbandOptions1_sizer.add( this.run_narrowband_SCNR_CheckBox );
      this.narrowbandOptions1_sizer.add( this.fix_narrowband_star_color_CheckBox );

      this.narrowbandOptions2_sizer = new VerticalSizer;
      this.narrowbandOptions2_sizer.margin = 6;
      this.narrowbandOptions2_sizer.spacing = 4;
      this.narrowbandOptions2_sizer.add( this.narrowband_hue_shift_CheckBox );
      this.narrowbandOptions2_sizer.add( this.narrowband_leave_some_green_CheckBox );
      this.narrowbandOptions2_sizer.add( this.no_star_fix_mask_CheckBox );

      this.narrowbandExtraLabel = newSectionLabel(this, "Extra processing for narrowband");
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
      var extraRemoveStars_Tooltip = 
            "<p>Run Starnet or StarXTerminator on image to generate a starless image and a separate image for the stars.</p>" + 
            "<p>When this is selected, extra processing is applied to the starless image. Smaller stars option is run on star images.</p>" + 
            "<p>At the end of the processing a combined image can be created from starless and star images. Combine operation can be " + 
            "selected from the combo box.</p>" +
            stars_combine_operations_Tooltip;
      this.extraRemoveStars_CheckBox = newCheckBox(this, "Remove stars", par.extra_remove_stars, extraRemoveStars_Tooltip);
      this.extraUnscreenStars_CheckBox = newCheckBox(this, "Unscreen", par.extra_unscreen_stars, unscreen_tooltip);
      this.extraRemoveStars_Sizer = new HorizontalSizer;
      this.extraRemoveStars_Sizer.spacing = 4;
      this.extraRemoveStars_Sizer.add( this.extraRemoveStars_CheckBox);
      this.extraRemoveStars_Sizer.add( this.extraUnscreenStars_CheckBox);
      this.extraRemoveStars_Sizer.toolTip = this.narrowbandExtraLabel.toolTip;
      this.extraRemoveStars_Sizer.addStretch();

      var extraCombineStarsReduce_Tooltip =
            "<p>With reduce selection it is possible to reduce stars while combining. " +
            "Star reduction uses PixelMath expressions created by Bill Blanshan.</p>" +
            "<p>Different methods are:</p>" +
            "<p>" +
            "None - No reduction<br>" +
            "Transfer - Method 1, Transfer method<br>" +
            "Halo - Method 2, Halo method<br>" +
            "Star - Method 3, Star method" +
            "</p>";
      var extraCombineStars_Tooltip = 
            "<p>Create a combined image from starless and star images. Combine operation can be " + 
            "selected from the combo box.</p>" +
            stars_combine_operations_Tooltip + 
            extraCombineStarsReduce_Tooltip;
      this.extraCombineStars_CheckBox = newCheckBox(this, "Combine starless and stars", par.extra_combine_stars, extraCombineStars_Tooltip);
      this.extraCombineStars_ComboBox = newComboBox(this, par.extra_combine_stars_mode, starless_and_stars_combine_values, extraCombineStars_Tooltip);
      
      this.extraCombioneStars_Sizer1= new HorizontalSizer;
      this.extraCombioneStars_Sizer1.spacing = 4;
      this.extraCombioneStars_Sizer1.add( this.extraCombineStars_CheckBox);
      this.extraCombioneStars_Sizer1.add( this.extraCombineStars_ComboBox);
      this.extraCombioneStars_Sizer1.toolTip = this.narrowbandExtraLabel.toolTip;
      this.extraCombioneStars_Sizer1.addStretch();

      this.extraCombineStarsReduce_Label = newLabel(this, "Reduce stars", extraCombineStarsReduce_Tooltip);
      this.extraCombineStarsReduce_ComboBox = newComboBox(this, par.extra_combine_stars_reduce, star_reduce_methods, 
            extraCombineStarsReduce_Tooltip);
      this.extraCombineStarsReduce_S_edit = newNumericEdit(this, 'S', par.extra_combine_stars_reduce_S, 0.0, 1.0, 
            "<p>To reduce stars size more with Transfer and Halo, lower S value.<p>" + extraCombineStarsReduce_Tooltip);
      var extraCombineStarsReduce_M_toolTip = "<p>Star method mode; 1=Strong; 2=Moderate; 3=Soft reductions.</p>" + extraCombineStarsReduce_Tooltip;
      this.extraCombineStarsReduce_M_Label = newLabel(this, "I", extraCombineStarsReduce_M_toolTip);
      this.extraCombineStarsReduce_M_SpinBox = newSpinBox(this, par.extra_combine_stars_reduce_M, 1, 3, 
            extraCombineStarsReduce_M_toolTip);

      this.extraCombioneStars_Sizer2 = new HorizontalSizer;
      this.extraCombioneStars_Sizer2.spacing = 4;
      this.extraCombioneStars_Sizer2.addSpacing(20);
      this.extraCombioneStars_Sizer2.add( this.extraCombineStarsReduce_Label);
      this.extraCombioneStars_Sizer2.add( this.extraCombineStarsReduce_ComboBox);
      this.extraCombioneStars_Sizer2.add( this.extraCombineStarsReduce_S_edit);
      this.extraCombioneStars_Sizer2.add( this.extraCombineStarsReduce_M_Label);
      this.extraCombioneStars_Sizer2.add( this.extraCombineStarsReduce_M_SpinBox);
      this.extraCombioneStars_Sizer2.toolTip = this.narrowbandExtraLabel.toolTip;
      this.extraCombioneStars_Sizer2.addStretch();

      this.extraCombioneStars_Sizer = new VerticalSizer;
      this.extraCombioneStars_Sizer.spacing = 4;
      this.extraCombioneStars_Sizer.add( this.extraCombioneStars_Sizer1);
      this.extraCombioneStars_Sizer.add( this.extraCombioneStars_Sizer2);
      this.extraCombioneStars_Sizer.toolTip = this.narrowbandExtraLabel.toolTip;
      this.extraCombioneStars_Sizer.addStretch();

      this.extraDarkerBackground_CheckBox = newCheckBox(this, "Darker background", par.extra_darker_background, 
            "<p>Make image background darker.</p>" );
      this.extraABE_CheckBox = newCheckBox(this, "ABE", par.extra_ABE, 
            "<p>Run AutomaticBackgroundExtractor.</p>" );

      var extra_ET_tooltip = "<p>Run ExponentialTransform on image using a mask.</p>";
      this.extra_ET_CheckBox = newCheckBox(this, "ExponentialTransform,", par.extra_ET, extra_ET_tooltip);
      this.extra_ET_edit = newNumericEdit(this, 'Order', par.extra_ET_order, 0.1, 6, "Order value for ExponentialTransform.");
      this.extra_ET_Sizer = new HorizontalSizer;
      this.extra_ET_Sizer.spacing = 4;
      this.extra_ET_Sizer.add( this.extra_ET_CheckBox );
      this.extra_ET_Sizer.add( this.extra_ET_edit );
      this.extra_ET_Sizer.toolTip = extra_ET_tooltip;
      this.extra_ET_Sizer.addStretch();

      var extra_HDRMLT_tooltip = "<p>Run HDRMultiscaleTransform on image using a mask.</p>" +
                                 "<p>Color option is used select different methods to keep hue and saturation. " + 
                                 "Option 'Preserve hue' uses HDRMLT preserve  hue option. " + 
                                 "Option 'Color corrected' uses a method described by Russell Croman</p>" + 
                                 "<p>Layers selection specifies the layers value for HDRMLT.</p>";
      this.extra_HDRMLT_CheckBox = newCheckBox(this, "HDRMultiscaleTransform", par.extra_HDRMLT, extra_HDRMLT_tooltip);

      this.extra_HDRMLT_Layers_Label = new Label( this );
      this.extra_HDRMLT_Layers_Label.text = "Layers";
      this.extra_HDRMLT_Layers_Label.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      this.extra_HDRMLT_Layers_Label.toolTip = extra_HDRMLT_tooltip;
      this.extra_HDRMLT_Layers_SpinBox = newSpinBox(this, par.extra_HDRMLT_layers, 2, 10, extra_HDRMLT_tooltip);

      this.extra_HDRMLT_Color_Label = new Label( this );
      this.extra_HDRMLT_Color_Label.text = "Color";
      this.extra_HDRMLT_Color_Label.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      this.extra_HDRMLT_Color_Label.toolTip = extra_HDRMLT_tooltip;
      this.extra_HDRMLT_color_ComboBox = newComboBox(this, par.extra_HDRMLT_color, extra_HDRMLT_color_values, extra_HDRMLT_tooltip);

      this.extra_HDRMLT_Options_Sizer = new HorizontalSizer;
      this.extra_HDRMLT_Options_Sizer.spacing = 4;
      this.extra_HDRMLT_Options_Sizer.addSpacing(20);
      this.extra_HDRMLT_Options_Sizer.add( this.extra_HDRMLT_Color_Label );
      this.extra_HDRMLT_Options_Sizer.add( this.extra_HDRMLT_color_ComboBox );
      this.extra_HDRMLT_Options_Sizer.add( this.extra_HDRMLT_Layers_Label );
      this.extra_HDRMLT_Options_Sizer.add( this.extra_HDRMLT_Layers_SpinBox );
      this.extra_HDRMLT_Options_Sizer.addStretch();
      this.extra_HDRMLT_Sizer = new VerticalSizer;
      this.extra_HDRMLT_Sizer.spacing = 4;
      this.extra_HDRMLT_Sizer.add( this.extra_HDRMLT_CheckBox );
      this.extra_HDRMLT_Sizer.add( this.extra_HDRMLT_Options_Sizer );
            
      var extra_LHE_tooltip = "<p>Run LocalHistogramEqualization on image using a mask.</p>";
      this.extra_LHE_CheckBox = newCheckBox(this, "LocalHistogramEqualization,", par.extra_LHE, extra_LHE_tooltip);
      this.extra_LHE_edit = newNumericEdit(this, 'Kernel Radius', par.extra_LHE_kernelradius, 16, 512, "Kernel radius value for LocalHistogramEqualization.");
      this.extra_LHE_sizer = new HorizontalSizer;
      this.extra_LHE_sizer.spacing = 4;
      this.extra_LHE_sizer.add( this.extra_LHE_CheckBox );
      this.extra_LHE_sizer.add( this.extra_LHE_edit );
      this.extra_LHE_sizer.toolTip = extra_LHE_tooltip;
      this.extra_LHE_sizer.addStretch();
      
      this.extra_Contrast_CheckBox = newCheckBox(this, "Add contrast", par.extra_contrast, 
            "<p>Run slight S shape curves transformation on image to add contrast.</p>" );
      this.contrastIterationsSpinBox = newSpinBox(this, par.extra_contrast_iterations, 1, 5, "Number of iterations for contrast enhancement");
      this.contrastIterationsLabel = new Label( this );
      this.contrastIterationsLabel.text = "iterations";
      this.contrastIterationsLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      this.contrastIterationsLabel.toolTip = this.contrastIterationsSpinBox.toolTip;
      this.extraContrastSizer = new HorizontalSizer;
      this.extraContrastSizer.spacing = 4;
      this.extraContrastSizer.add( this.extra_Contrast_CheckBox );
      this.extraContrastSizer.add( this.contrastIterationsSpinBox );
      this.extraContrastSizer.add( this.contrastIterationsLabel );
      this.extraContrastSizer.toolTip = this.contrastIterationsSpinBox.toolTip;
      this.extraContrastSizer.addStretch();

      this.extra_stretch_CheckBox = newCheckBox(this, "Auto stretch", par.extra_stretch, 
            "<p>Run automatic stretch on image. Can be helpful in some rare cases but it is most useful on testing stretching settings with Apply button.</p>" );
      this.extra_force_new_mask_CheckBox = newCheckBox(this, "New mask", par.extra_force_new_mask, 
            "<p>Do not use existing mask but create a new luminance or star mask when needed.</p>" );

      var shadowclipTooltip = "<p>Run shadow clipping on image. Clip percentage tells how many shadow pixels are clipped.</p>";
      this.extra_shadowclip_CheckBox = newCheckBox(this, "Clip shadows,", par.extra_shadowclipping, shadowclipTooltip);
      this.extra_shadowclipperc_edit = newNumericEditPrecision(this, 'percent', par.extra_shadowclippingperc, 0, 100, shadowclipTooltip, 3);
      this.extra_shadowclip_Sizer = new HorizontalSizer;
      this.extra_shadowclip_Sizer.spacing = 4;
      this.extra_shadowclip_Sizer.add( this.extra_shadowclip_CheckBox );
      this.extra_shadowclip_Sizer.add( this.extra_shadowclipperc_edit );
      this.extra_shadowclip_Sizer.toolTip = shadowclipTooltip;
      this.extra_shadowclip_Sizer.addStretch();

      this.extra_SmallerStars_CheckBox = newCheckBox(this, "Smaller stars", par.extra_smaller_stars, 
            "<p>Make stars smaller on image.</p>" );
      this.smallerStarsIterationsSpinBox = newSpinBox(this, par.extra_smaller_stars_iterations, 0, 10, 
            "Number of iterations when reducing star sizes. Value zero uses Erosion instead of Morphological Selection");
      this.smallerStarsIterationsLabel = new Label( this );
      this.smallerStarsIterationsLabel.text = "iterations";
      this.smallerStarsIterationsLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      this.smallerStarsIterationsLabel.toolTip = this.smallerStarsIterationsSpinBox.toolTip;
      this.extraSmallerStarsSizer = new HorizontalSizer;
      this.extraSmallerStarsSizer.spacing = 4;
      this.extraSmallerStarsSizer.add( this.extra_SmallerStars_CheckBox );
      this.extraSmallerStarsSizer.add( this.smallerStarsIterationsSpinBox );
      this.extraSmallerStarsSizer.add( this.smallerStarsIterationsLabel );
      this.extraSmallerStarsSizer.toolTip = this.smallerStarsIterationsSpinBox.toolTip;
      this.extraSmallerStarsSizer.addStretch();

      var extra_noise_reduction_tooltip = "<p>Noise reduction on image.</p>" + noiseReductionToolTipCommon;
      this.extra_NoiseReduction_CheckBox = newCheckBox(this, "Noise reduction", par.extra_noise_reduction, 
            extra_noise_reduction_tooltip);

      this.extraNoiseReductionStrengthComboBox = newComboBoxStrvalsToInt(this, par.extra_noise_reduction_strength, noise_reduction_strength_values, extra_noise_reduction_tooltip);
      this.extraNoiseReductionStrengthLabel = new Label( this );
      this.extraNoiseReductionStrengthLabel.text = "strength";
      this.extraNoiseReductionStrengthLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      this.extraNoiseReductionStrengthLabel.toolTip = extra_noise_reduction_tooltip;
      this.extraNoiseReductionStrengthSizer = new HorizontalSizer;
      this.extraNoiseReductionStrengthSizer.spacing = 4;
      this.extraNoiseReductionStrengthSizer.add( this.extra_NoiseReduction_CheckBox );
      this.extraNoiseReductionStrengthSizer.add( this.extraNoiseReductionStrengthComboBox );
      this.extraNoiseReductionStrengthSizer.add( this.extraNoiseReductionStrengthLabel );
      this.extraNoiseReductionStrengthSizer.toolTip = extra_noise_reduction_tooltip;
      this.extraNoiseReductionStrengthSizer.addStretch();

      this.extra_ACDNR_CheckBox = newCheckBox(this, "ACDNR noise reduction", par.extra_ACDNR, 
            "<p>Run ACDNR noise reduction on image using a lightness mask.</p><p>StdDev value is taken from noise reduction section.</p>" + ACDNR_StdDev_tooltip);
      this.extra_color_noise_CheckBox = newCheckBox(this, "Color noise reduction", par.extra_color_noise, 
            "<p>Run color noise reduction on image.</p>" );
      this.extra_star_noise_reduction_CheckBox = newCheckBox(this, "Star noise reduction", par.extra_star_noise_reduction, 
            "<p>Run star noise reduction on star image.</p>" );

      var extra_sharpen_tooltip = "<p>Sharpening on image using a luminance mask.</p>" + 
                                  "<p>Number of iterations specifies how many times the sharpening is run.</p>";
      this.extra_sharpen_CheckBox = newCheckBox(this, "Sharpening", par.extra_sharpen, extra_sharpen_tooltip);

      this.extraSharpenIterationsSpinBox = newSpinBox(this, par.extra_sharpen_iterations, 1, 10, extra_sharpen_tooltip);
      this.extraSharpenIterationsLabel = new Label( this );
      this.extraSharpenIterationsLabel.text = "iterations";
      this.extraSharpenIterationsLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      this.extraSharpenIterationsLabel.toolTip = extra_sharpen_tooltip;
      this.extraSharpenIterationsSizer = new HorizontalSizer;
      this.extraSharpenIterationsSizer.spacing = 4;
      this.extraSharpenIterationsSizer.add( this.extra_sharpen_CheckBox );
      this.extraSharpenIterationsSizer.add( this.extraSharpenIterationsSpinBox );
      this.extraSharpenIterationsSizer.add( this.extraSharpenIterationsLabel );
      this.extraSharpenIterationsSizer.toolTip = extra_sharpen_tooltip;
      this.extraSharpenIterationsSizer.addStretch();

      var unsharpmask_tooltip = "Sharpen image using UnsharpMask and a luminance mask.";
      this.extra_unsharpmask_CheckBox = newCheckBox(this, "UnsharpMask", par.extra_unsharpmask, unsharpmask_tooltip);
      this.extraUnsharpMaskStdDevEdit = newNumericEdit(this, "StdDev", par.extra_unsharpmask_stddev, 0.1, 250, unsharpmask_tooltip);
      this.extraUnsharpMaskSizer = new HorizontalSizer;
      this.extraUnsharpMaskSizer.spacing = 4;
      this.extraUnsharpMaskSizer.add( this.extra_unsharpmask_CheckBox );
      this.extraUnsharpMaskSizer.add( this.extraUnsharpMaskStdDevEdit );
      this.extraUnsharpMaskSizer.addStretch();
      
      this.extraImageLabel = new Label( this );
      this.extraImageLabel.text = "Target image";
      this.extraImageLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      this.extraImageLabel.toolTip = "<p>Target image for editing. By default edits are applied on a copy of target image. Copied " + 
            "is named as <target image>_edit.</p>" +
            "<p>Auto option is used when extra processing is done with Run or AutoContinue option.</p>";
      this.extraImageComboBox = new ComboBox( this );
      this.extraImageComboBox.minItemCharWidth = 20;
      this.extraImageComboBox.onItemSelected = function( itemIndex )
      {
            if (extra_target_image == extra_target_image_window_list[itemIndex]) {
                  return;
            }
            close_undo_images(this.dialog);
            extra_target_image = extra_target_image_window_list[itemIndex];
            console.writeln("extra_target_image " + extra_target_image);
            if (extra_target_image == "Auto") {
                  updatePreviewNoImage();
                  this.dialog.extraSaveButton.enabled = false;
            } else {
                  updatePreviewIdReset(extra_target_image, true);
                  this.dialog.extraSaveButton.enabled = true;
            }
      };
      update_extra_target_image_window_list(this, "Auto");
      extra_target_image = extra_target_image_window_list[0];

      var notetsaved_note = "<p>Note that edited image is not automatically saved to disk.</p>";
      this.extraApplyButton = new PushButton( this );
      this.extraApplyButton.text = "Apply";
      this.extraApplyButton.toolTip = 
            "<p>Apply extra processing edits on the copy of the selected image. Auto option is used when extra processing is done with Run or AutoContinue option.</p>" +
            notetsaved_note;
      this.extraApplyButton.onClick = function()
      {
            if (!is_extra_option() && !is_narrowband_option()) {
                  console.criticalln("No extra processing option selected!");
            } else if (extra_target_image == null) {
                  console.criticalln("No image!");
            } else if (extra_target_image == "Auto") {
                  console.criticalln("Auto target image cannot be used with Apply button!");
            } else if (findWindow(extra_target_image) == null) {
                  console.criticalln("Could not find target image " + extra_target_image);
            } else {
                  if (undo_images.length == 0) {
                        var saved_extra_target_image = extra_target_image;
                        if (!par.extra_apply_no_copy_image.val) {
                              // make copy of the original image
                              extra_target_image = copy_undo_edit_image(extra_target_image);
                        }
                        var first_undo_image_id = create_undo_image(extra_target_image);
                  } else {
                        var first_undo_image_id = null;
                  }
                  console.writeln("Apply extra processing edits on " + extra_target_image);
                  try {
                        narrowband = is_narrowband_option();
                        extraProcessingEngine(this.dialog, extra_target_image);
                        narrowband = false;
                        if (undo_images.length == 0) {
                              // add first/original undo image
                              add_undo_image(this.dialog, extra_target_image, first_undo_image_id);
                              // save copy of original image to the window list and make is current
                              update_extra_target_image_window_list(this.dialog, extra_target_image);
                        }
                        let undo_image_id = create_undo_image(extra_target_image);
                        add_undo_image(this.dialog, extra_target_image, undo_image_id);
                        console.noteln("Apply completed");
                  } 
                  catch(err) {
                        if (first_undo_image_id != null) {
                              remove_undo_image(first_undo_image_id);
                              extra_target_image = saved_extra_target_image;
                        }
                        console.criticalln(err);
                        console.criticalln("Operation failed!");
                        narrowband = false;
                  }
            }
      };   

      this.extraUndoButton = new ToolButton( this );
      this.extraUndoButton.icon = new Bitmap( ":/icons/undo.png" );
      this.extraUndoButton.toolTip = 
            "<p>Undo last extra edit operation.</p>" + notetsaved_note;
      this.extraUndoButton.enabled = false;
      this.extraUndoButton.onMousePress = function()
      {
            apply_undo(this.dialog);
      };

      this.extraRedoButton = new ToolButton( this );
      this.extraRedoButton.icon = new Bitmap( ":/icons/redo.png" );
      this.extraRedoButton.toolTip = 
            "<p>Redo last extra edit operation.</p>" + notetsaved_note;
      this.extraRedoButton.enabled = false;
      this.extraRedoButton.onMousePress = function()
      {
            apply_redo(this.dialog);
      };

      this.extraSaveButton = new ToolButton( this );
      this.extraSaveButton.icon = new Bitmap( ":/icons/save-as.png" );
      this.extraSaveButton.toolTip = 
            "<p>Save current edited image to disk.</p>" + notetsaved_note;
      this.extraSaveButton.enabled = false;
      this.extraSaveButton.onMousePress = function()
      {
            save_as_undo(this.dialog);
      };

      this.extraImageSizer = new HorizontalSizer;
      this.extraImageSizer.margin = 6;
      this.extraImageSizer.spacing = 4;
      this.extraImageSizer.add( this.extraImageLabel );
      this.extraImageSizer.add( this.extraImageComboBox );
      this.extraImageSizer.add( this.extraApplyButton );
      this.extraImageSizer.add( this.extraUndoButton );
      this.extraImageSizer.add( this.extraRedoButton );
      this.extraImageSizer.add( this.extraSaveButton );
      this.extraImageSizer.addStretch();

      this.extra_image_no_copy_CheckBox = newCheckBox(this, "Do not make a copy for Apply", par.extra_apply_no_copy_image, 
            "<p>Do not make a copy of the image for Apply.</p>" );

      this.extraOptionsSizer = new HorizontalSizer;
      this.extraOptionsSizer.margin = 6;
      this.extraOptionsSizer.spacing = 4;
      this.extraOptionsSizer.add( this.extra_image_no_copy_CheckBox );
      this.extraOptionsSizer.add( this.extra_stretch_CheckBox );
      this.extraOptionsSizer.add( this.extra_force_new_mask_CheckBox );
      this.extraOptionsSizer.addStretch();

      this.extra1 = new VerticalSizer;
      this.extra1.margin = 6;
      this.extra1.spacing = 4;
      this.extra1.add( this.extraRemoveStars_Sizer );
      this.extra1.add( this.extra_shadowclip_Sizer );
      this.extra1.add( this.extraABE_CheckBox );
      this.extra1.add( this.extraDarkerBackground_CheckBox );
      this.extra1.add( this.extra_ET_Sizer );
      this.extra1.add( this.extra_HDRMLT_Sizer );
      this.extra1.add( this.extra_LHE_sizer );
      this.extra1.add( this.extraContrastSizer );

      this.extra2 = new VerticalSizer;
      this.extra2.margin = 6;
      this.extra2.spacing = 4;
      this.extra2.add( this.extraNoiseReductionStrengthSizer );
      this.extra2.add( this.extra_ACDNR_CheckBox );
      this.extra2.add( this.extra_color_noise_CheckBox );
      this.extra2.add( this.extra_star_noise_reduction_CheckBox );
      this.extra2.add( this.extraUnsharpMaskSizer );
      this.extra2.add( this.extraSharpenIterationsSizer );
      this.extra2.add( this.extraSmallerStarsSizer );
      this.extra2.add( this.extraCombioneStars_Sizer );

      this.extraLabel = newSectionLabel(this, "Generic extra processing");
      this.extraLabel.toolTip = 
            "<p>" +
            "In case of Run or AutoContinue " + 
            "extra processing options are always applied to a copy of the final image. " + 
            "A new image is created with _extra added to the name. " + 
            "For example if the final image is AutoLRGB then a new image AutoLRGB_extra is created. " + 
            "AutoContinue can be used to apply extra processing after the final image is created. " +
            "</p><p>" +
            "In case of Apply button extra processing is run directly on the selected image. " +
            "Apply button can be used to execute extra options one by one in custom order." +
            "</p><p>" +
            "Both extra processing options and narrowband processing options are applied to the image. If some of the " +
            "narrowband options are selected then image is assumed to be narrowband." +
            "</p><p>" +
            "If multiple extra processing options are selected they are executed in the following order:<br>" +
            "1. Auto stretch<br>" +
            "2. Narrowband options<br>" +
            "3. Remove stars<br>" +
            "4. Clip shadows<br>" +
            "5. AutomaticBackgroundExtractor<br>" +
            "6. Darker background<br>" +
            "7. ExponentialTransformation<br>" +
            "8. HDRMultiscaleTransform<br>" +
            "9. LocalHistogramEqualization<br>" +
            "10. Add contrast<br>" +
            "11. Noise reduction<br>" +
            "12. ACDNR noise reduction<br>" +
            "13. Color noise reduction<br>" +
            "14. Sharpen using Unsharp Mask<br>" +
            "15. Sharpening<br>" +
            "16. Smaller stars<br>" +
            "17. Combine starless and stars images" +
            "</p><p>" +
            "If narrowband processing options are selected they are applied before extra processing options." +
            "</p>";

      this.extraGroupBoxSizer = new HorizontalSizer;
      //this.extraGroupBoxSizer.margin = 6;
      //this.extraGroupBoxSizer.spacing = 4;
      this.extraGroupBoxSizer.add( this.extra1 );
      this.extraGroupBoxSizer.add( this.extra2 );
      this.extraGroupBoxSizer.addStretch();

      this.extraControl = new Control( this );
      // this.extraControl.title = "Extra processing";
      this.extraControl.sizer = new VerticalSizer;
      this.extraControl.sizer.margin = 6;
      this.extraControl.sizer.spacing = 4;
      this.extraControl.sizer.add( this.narrowbandExtraLabel );
      this.extraControl.sizer.add( this.narrowbandExtraOptionsSizer );
      this.extraControl.sizer.add( this.extraLabel );
      this.extraControl.sizer.add( this.extraGroupBoxSizer );
      this.extraControl.sizer.add( this.extraImageSizer );
      this.extraControl.sizer.add( this.extraOptionsSizer );
      this.extraControl.sizer.addStretch();
      this.extraControl.visible = false;

      // Button to close all windows
      this.closeAllButton = new PushButton( this );
      this.closeAllButton.text = "Close prefix";
      this.closeAllButton.icon = this.scaledResource( ":/icons/window-close.png" );
      this.closeAllButton.toolTip = "<p>Close all windows that are created by this script using the <b>current prefix</b> (including empty prefix).</p>" +
                                    "<p>If Window Prefix is used then all windows with that prefix are closed. " +
                                    "To close all windows with all prefixes use button Close all prefixes</p>";
      this.closeAllButton.onClick = function()
      {
            console.noteln("Close prefix");
            updateWindowPrefix();
            // Close all using the current ppar.win_prefix
            closeAllWindows(par.keep_integrated_images.val, false);
            var index = findPrefixIndex(ppar.win_prefix);
            if (index != -1) {
                  // If prefix was found update array
                  if (par.keep_integrated_images.val) {
                        // If we keep integrated images then we can start
                        // from zero icon position
                        ppar.prefixArray[index][2] = 0;
                  } else {
                        // Mark closed position as empty/free
                        ppar.prefixArray[index] = [ 0, '-', 0 ];
                        fix_win_prefix_array();
                  }
                  savePersistentSettings(false);
                  //this.columnCountControlComboBox.currentItem = columnCount + 1;
            }
            update_extra_target_image_window_list(this.dialog, null);
            console.writeln("Close prefix completed");
      };

      closeAllPrefixButton = new PushButton( this );
      closeAllPrefixButton.text = "Close all prefixes";
      closeAllPrefixButton.icon = this.scaledResource( ":/icons/window-close-all.png" );
      closeAllPrefixButton.toolTip = "!!! See setWindowPrefixHelpTip !!!";
      closeAllPrefixButton.onClick = function()
      {
            console.noteln("Close all prefixes");
            try {
                  updateWindowPrefix();
                  // Always close default/empty prefix
                  // For delete to work we need to update fixed window
                  // names with the prefix we use for closing
                  fixAllWindowArrays("");
                  console.writeln("Close default empty prefix");
                  closeAllWindows(par.keep_integrated_images.val, false);
                  if (ppar.win_prefix != "" && findPrefixIndex(ppar.win_prefix) == -1) {
                        // Window prefix box has unsaved prefix, clear that too.
                        console.writeln("Close prefix '" + ppar.win_prefix + "'");
                        fixAllWindowArrays(ppar.win_prefix);
                        closeAllWindows(par.keep_integrated_images.val, false);
                  }
                  // Go through the prefix list
                  for (var i = 0; i < ppar.prefixArray.length; i++) {
                        if (ppar.prefixArray[i][1] != '-') {
                              console.writeln("Close prefix '" + ppar.prefixArray[i][1] + "'");
                              fixAllWindowArrays(ppar.prefixArray[i][1]);
                              closeAllWindows(par.keep_integrated_images.val, false);
                              if (par.keep_integrated_images.val) {
                                    // If we keep integrated images then we can start
                                    // from zero icon position
                                    ppar.prefixArray[i][2] = 0;
                              } else {
                                    // Mark closed position as empty/free
                                    ppar.prefixArray[i] = [ 0, '-', 0 ];
                              }
                        }
                  }
                  if (par.use_manual_icon_column.val && ppar.userColumnCount != -1) {
                        ppar.userColumnCount = 0;
                  }
            }  catch (x) {
                  console.writeln( x );
            }
            fix_win_prefix_array();
            savePersistentSettings(false);
            // restore original prefix
            fixAllWindowArrays(ppar.win_prefix);
            update_extra_target_image_window_list(this.dialog, null);
            console.writeln("Close all prefixes completed");
      };

      if (par.use_manual_icon_column.val) {
            this.columnCountControlLabel = new Label( this );
            this.columnCountControlLabel.text = "Icon Column ";
            this.columnCountControlLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
            this.columnCountControlLabel.toolTip = "<p>Set Icon Column for next run.</p> " + 
                                                "<p>This keeps window icons from piling up on top of one another, " +
                                                "as you change prefixes and run again.</p>" +
                                                "<p>Set to 1 if you have removed all the icons " + 
                                                "created by AutoIntegrate or changed to a fresh workspace.</p>" + 
                                                "<p>Set to a free column if you have deleted a column of icons by hand.</p>" + 
                                                "<p>Left alone the script will manage the value, incrementing after each run, " +
                                                "decrementing if you close all windows, " +
                                                "and saving the value between script invocations.</p>";
            this.columnCountControlComboBox = new ComboBox( this );
            addArrayToComboBox(this.columnCountControlComboBox, column_count_values);
            if (ppar.userColumnCount == -1) {
                  this.columnCountControlComboBox.currentItem = 0;
            } else {
                  this.columnCountControlComboBox.currentItem = ppar.userColumnCount + 1;
            }
            this.columnCountControlComboBox.toolTip = this.columnCountControlLabel.toolTip;
            this.columnCountControlComboBox.onItemSelected = function( itemIndex )
            {
                  if (itemIndex == 0) {
                        // Auto
                        ppar.userColumnCount = -1;
                  } else {
                        // Combo box values start with one but in the code
                        // we want values to start with zero.
                        ppar.userColumnCount = parseInt(column_count_values[itemIndex]) - 1;
                  }
            };
      }

      // Buttons for saving final images in different formats
      this.mosaicSaveXisfButton = new PushButton( this );
      this.mosaicSaveXisfButton.text = "XISF";
      this.mosaicSaveXisfButton.icon = this.scaledResource( ":/icons/save.png" );
      this.mosaicSaveXisfButton.onClick = function()
      {
            console.writeln("Save XISF");
            saveAllFinalImageWindows(32);
      };   
      this.mosaicSave16bitButton = new PushButton( this );
      this.mosaicSave16bitButton.text = "16 bit TIFF";
      this.mosaicSave16bitButton.icon = this.scaledResource( ":/icons/save.png" );
      this.mosaicSave16bitButton.onClick = function()
      {
            console.writeln("Save 16 bit TIFF");
            saveAllFinalImageWindows(16);
      };   
      this.mosaicSave8bitButton = new PushButton( this );
      this.mosaicSave8bitButton.text = "8 bit TIFF";
      this.mosaicSave8bitButton.icon = this.scaledResource( ":/icons/save.png" );
      this.mosaicSave8bitButton.onClick = function()
      {
            console.writeln("Save 8 bit TIFF");
            saveAllFinalImageWindows(8);
      };   

      this.mosaicSaveControl = new Control( this );
      this.mosaicSaveControl.sizer = new HorizontalSizer;
      this.mosaicSaveControl.sizer.margin = 6;
      this.mosaicSaveControl.sizer.spacing = 4;
      this.mosaicSaveControl.sizer.add( this.mosaicSaveXisfButton );
      this.mosaicSaveControl.sizer.addSpacing( 4 );
      this.mosaicSaveControl.sizer.add( this.mosaicSave16bitButton );
      this.mosaicSaveControl.sizer.addSpacing( 4 );
      this.mosaicSaveControl.sizer.add( this.mosaicSave8bitButton );
      this.mosaicSaveControl.visible = false;

      /* Interface.
       */

      this.saveInterfaceButton = new PushButton( this );
      this.saveInterfaceButton.text = "Save";
      this.saveInterfaceButton.toolTip = 
            "<p>Save current interface settings.</p>" +
            "<p>Settings are saved by default when exiting the script. This button can be used " +
            "to save settings without exiting. It can be useful if the Exit button is not visible.</p>";
      this.saveInterfaceButton.onClick = function() {
            savePersistentSettings(false);
      };

      this.show_preview_CheckBox = newGenericCheckBox(this, "Enable preview", ppar, ppar.use_preview, 
            "Enable image preview on script preview window. You need to restart the script before this setting is effective.",
            function(checked) { this.dialog.show_preview_CheckBox.aiParam.use_preview = checked; });

      this.use_single_column_CheckBox = newGenericCheckBox(this, "Single column", ppar, ppar.use_single_column, 
            "Show all dialog settings in a single column. You need to restart the script before this setting is effective.",
            function(checked) { this.dialog.use_single_column_CheckBox.aiParam.use_single_column = checked; });

      this.preview1Sizer = new HorizontalSizer;
      this.preview1Sizer.margin = 6;
      this.preview1Sizer.spacing = 4;
      this.preview1Sizer.add( this.show_preview_CheckBox );
      this.preview1Sizer.add( this.use_single_column_CheckBox );

      this.preview_width_label = newLabel(this, 'Preview width', "Preview image width.");
      this.preview_width_edit = newGenericSpinBox(this, ppar, ppar.preview_width, 100, 4000, 
            "Preview image width.",
            function(value) { 
                  this.dialog.preview_width_edit.aiParam.preview_width = value; 
                  preview_size_changed = true; 
                  this.dialog.preview_width_edit.aiParam.default_preview_size = false;
      });
      this.preview_height_label = newLabel(this, 'height', "Preview image height.");
      this.preview_height_edit = newGenericSpinBox(this, ppar, ppar.preview_height, 100, 4000, 
            "Preview image height.",
            function(value) { 
                  this.dialog.preview_height_edit.aiParam.preview_height = value; 
                  preview_size_changed = true; 
                  this.dialog.preview_height_edit.aiParam.default_preview_size = false;
      });

      this.preview2Sizer = new HorizontalSizer;
      this.preview2Sizer.margin = 6;
      this.preview2Sizer.spacing = 4;
      this.preview2Sizer.add( this.preview_width_label );
      this.preview2Sizer.add( this.preview_width_edit );
      this.preview2Sizer.add( this.preview_height_label );
      this.preview2Sizer.add( this.preview_height_edit );
      this.preview2Sizer.addStretch();
      this.preview2Sizer.add( this.saveInterfaceButton );

      this.processConsole_label = newLabel(this, 'Process console', "Show or hide process console.");

      this.hideProcessConsoleButton = new PushButton( this );
      this.hideProcessConsoleButton.text = "Hide";
      this.hideProcessConsoleButton.icon = this.scaledResource( ":/auto-hide/hide.png" );
      this.hideProcessConsoleButton.toolTip = "<p>Hide Process Console.</p>";
      this.hideProcessConsoleButton.onClick = function() {
            console.hide();
      };

      this.showProcessConsoleButton = new PushButton( this );
      this.showProcessConsoleButton.text = "Show";
      this.showProcessConsoleButton.icon = this.scaledResource( ":/toolbar/view-process-console.png" );
      this.showProcessConsoleButton.toolTip = "<p>Show Process Console.</p>";
      this.showProcessConsoleButton.onClick = function() {
            console.show();
      };

      this.interfaceSizer = new HorizontalSizer;
      this.interfaceSizer.margin = 6;
      this.interfaceSizer.spacing = 4;
      this.interfaceSizer.add( this.processConsole_label );
      this.interfaceSizer.add( this.showProcessConsoleButton );
      this.interfaceSizer.add( this.hideProcessConsoleButton );
      this.interfaceSizer.addStretch();

      if (par.use_manual_icon_column.val) {
            this.interfaceManualColumnSizer = new HorizontalSizer;
            this.interfaceManualColumnSizer.margin = 6;
            this.interfaceManualColumnSizer.spacing = 4;
            this.interfaceManualColumnSizer.add( this.columnCountControlLabel );
            this.interfaceManualColumnSizer.add( this.columnCountControlComboBox );
            this.interfaceManualColumnSizer.addStretch();
      }
      if (use_preview) {
            this.previewToggleButton = new PushButton( this );
            this.previewToggleButton.text = "Toggle preview";
            this.previewToggleButton.toolTip = "<p>Show/hide image preview on the side of the dialog.</p>" +
                                               "<p>Note that sometimes you need to adjust the screen manually or restart the script.</p>";
            this.previewToggleButton.onClick = function() {
                  toggleSidePreview();
                  this.adjustToContents();
            }
            this.previewToggleButtonSizer = new HorizontalSizer;
            this.previewToggleButtonSizer.margin = 6;
            this.previewToggleButtonSizer.spacing = 4;
            this.previewToggleButtonSizer.add( this.previewToggleButton );
            this.previewToggleButtonSizer.addStretch();
      }

      this.interfaceControl = new Control( this );
      this.interfaceControl.sizer = new VerticalSizer;
      this.interfaceControl.sizer.margin = 6;
      this.interfaceControl.sizer.spacing = 4;
      this.interfaceControl.sizer.add( this.preview1Sizer );
      this.interfaceControl.sizer.add( this.preview2Sizer );
      this.interfaceControl.sizer.add( this.interfaceSizer );
      if (par.use_manual_icon_column.val) {
            this.interfaceControl.sizer.add( this.interfaceManualColumnSizer );
      }
      if (use_preview) {
            this.interfaceControl.sizer.add( this.previewToggleButtonSizer );
      }
      this.interfaceControl.sizer.addStretch();
      this.interfaceControl.visible = false;

      this.newInstance_Button = new ToolButton(this);
      this.newInstance_Button.icon = new Bitmap( ":/process-interface/new-instance.png" );
      this.newInstance_Button.toolTip = "New Instance";
      this.newInstance_Button.onMousePress = function()
      {
         this.hasFocus = true;
         saveParametersToProcessIcon();
         this.pushed = false;
         this.dialog.newInstance();
      };
      this.savedefaults_Button = new ToolButton(this);
      this.savedefaults_Button.icon = new Bitmap( ":/process-interface/edit-preferences.png" );
      this.savedefaults_Button.toolTip = 
            "<p>Save all current parameter values using the PixInsight persistent module settings mechanism. Saved parameter " + 
            "values are remembered and automatically restored when the script starts.</p> " +
            "<p>Persistent module settings are overwritten by any settings restored from process icon.</p>" +
            "<p>Set default button sets default values for all parameters.</p>";
      this.savedefaults_Button.onMousePress = function()
      {
            saveParametersToPersistentModuleSettings();
      };
      this.reset_Button = new ToolButton(this);
      this.reset_Button.icon = new Bitmap( ":/images/icons/reset.png" );
      this.reset_Button.toolTip = "Set default values for all parameters.";
      this.reset_Button.onMousePress = function()
      {
            setParameterDefaults();
      };
      this.website_Button = new ToolButton(this);
      this.website_Button.icon = new Bitmap( ":/icons/internet.png" );
      this.website_Button.toolTip = "Browse documentation on AutoIntegrate web site.";
      this.website_Button.onMousePress = function()
      {
            Dialog.openBrowser("https://ruuth.xyz/AutoIntegrateInfo.html");
      };

      this.adjusttocontent_Button = newAdjustToContentButton(this);
   
      this.infoLabel = new Label( this );
      this.infoLabel.text = "";
      infoLabel = this.infoLabel;

      this.imageInfoLabel = new Label( this );
      this.imageInfoLabel.text = "";
      this.imageInfoLabel.textAlignment = TextAlign_VertCenter;
      imageInfoLabel = this.imageInfoLabel;

      this.info1_Sizer = new HorizontalSizer;
      this.info1_Sizer.spacing = 6;
      this.info1_Sizer.add( this.infoLabel );
      this.info1_Sizer.addSpacing( 6 );
      this.info1_Sizer.add( this.imageInfoLabel );
      this.info1_Sizer.addStretch();

      if (!use_preview) {
            this.tabStatusInfoLabel = new Label( this );
            this.tabStatusInfoLabel.text = "";
            this.tabStatusInfoLabel.textAlignment = TextAlign_VertCenter;
            tabStatusInfoLabel = this.tabStatusInfoLabel;

            this.info2_Sizer = new HorizontalSizer;
            this.info2_Sizer.spacing = 6;
            this.info2_Sizer.add( this.tabStatusInfoLabel );
            this.info2_Sizer.addStretch();
      }

      this.info_Sizer = new VerticalSizer;
      this.info_Sizer.add( this.info1_Sizer );
      if (!use_preview) {
            this.info_Sizer.add( this.info2_Sizer );
      }
      this.info_Sizer.addStretch();

      this.buttons_Sizer = new HorizontalSizer;
      this.buttons_Sizer.spacing = 6;
      this.buttons_Sizer.add( this.newInstance_Button );
      this.buttons_Sizer.add( this.savedefaults_Button );
      this.buttons_Sizer.add( this.reset_Button );
      this.buttons_Sizer.add( this.website_Button );
      this.buttons_Sizer.addSpacing( 6 );
      this.buttons_Sizer.add( this.adjusttocontent_Button );
      this.buttons_Sizer.addSpacing( 6 );
      this.buttons_Sizer.add( this.info_Sizer );
      this.buttons_Sizer.addStretch();
      this.buttons_Sizer.add( this.closeAllButton );
      this.buttons_Sizer.add( closeAllPrefixButton );
      this.buttons_Sizer.add( this.autoContinueButton );
      this.buttons_Sizer.addSpacing( 12 );
      this.buttons_Sizer.add( this.run_Button );
      this.buttons_Sizer.add( this.exit_Button );
      this.buttons_Sizer.add( this.helpTips );

      this.leftGroupBox = newSectionBar(this, this.imageParamsControl, "Image processing parameters", "Image1");

      newSectionBarAdd(this, this.leftGroupBox, this.otherParamsControl, "Other parameters", "Other1");

      // Add Processiong settings sections
      newSectionBarAddArray(this, this.leftGroupBox, "Stretching settings", "ps_stretching",
            [ this.StretchingGroupBoxLabel,
              this.StretchingGroupBoxSizer ]);
      newSectionBarAddArray(this, this.leftGroupBox, "Linear fit and LRGB combination settings", "ps_linearfit_combination",
            [ this.linearFitGroupBoxLabel,
              this.linearFitGroupBoxSizer,
              this.LRGBCombinationGroupBoxLabel,
              this.LRGBCombinationGroupBoxSizer ]);
      newSectionBarAddArray(this, this.leftGroupBox, "Saturation and noise reduction settings", "ps_saturation_noise",
            [ this.saturationGroupBoxLabel,
              this.saturationGroupBoxSizer,
              this.noiseReductionGroupBoxLabel,
              this.noiseReductionGroupBoxSizer ]);
      newSectionBarAddArray(this, this.leftGroupBox, "Image integration settings", "ps_integration",
            [ this.clippingGroupBoxLabel,
              this.clippingGroupBoxSizer ]);
      newSectionBarAddArray(this, this.leftGroupBox, "Star alignment settings", "ps_alignment",
            [ this.StarAlignmentGroupBoxLabel,
              this.StarAlignmentGroupBoxSizer ]);
      newSectionBarAddArray(this, this.leftGroupBox, "Weighting and filtering settings", "ps_weighting",
            [ this.weightSizer ]);
      newSectionBarAddArray(this, this.leftGroupBox, "Binning and cosmetic correction settings", "ps_binning_CC",
            [ this.binningGroupBoxLabel,
              this.binningGroupBoxSizer,
              this.cosmeticCorrectionGroupBoxSizer ]);
      
      if (!ppar.use_single_column) {
            this.leftGroupBox.sizer.addStretch();
      }



      this.rightGroupBox = newSectionBar(this, this.narrowbandControl, "Narrowband processing", "Narrowband1");
      newSectionBarAdd(this, this.rightGroupBox, this.narrowbandRGBmappingControl, "Narrowband to RGB mapping", "NarrowbandRGB1");
      newSectionBarAdd(this, this.rightGroupBox, this.extraControl, "Extra processing", "Extra1");
      newSectionBarAdd(this, this.rightGroupBox, this.mosaicSaveControl, "Save final image files", "Savefinalimagefiles");
      newSectionBarAdd(this, this.rightGroupBox, this.interfaceControl, "Interface settings", "interface");

      if (!ppar.use_single_column) {
            this.rightGroupBox.sizer.addStretch();
      }
      if (ppar.use_single_column) {
            this.cols = new VerticalSizer;
      } else {
            this.cols = new HorizontalSizer;
      }
      this.cols.spacing = 4;
      this.cols.add( this.leftGroupBox );
      this.cols.add( this.rightGroupBox );
      if (ppar.use_single_column) {
            this.cols.addStretch();
      }

      if (use_preview) {
            /* Tab preview.
             */
            if (use_tab_preview) {
                  this.tabPreviewObj = newPreviewObj(this);

                  tabPreviewControl = this.tabPreviewObj.control;
                  tabPreviewInfoLabel = this.tabPreviewObj.infolabel;
                  tabStatusInfoLabel = this.tabPreviewObj.statuslabel;
            }
            /* Side preview.
             */
            if (use_side_preview) {
                  this.sidePreviewObj = newPreviewObj(this);

                  sidePreviewControl = this.sidePreviewObj.control;
                  sidePreviewInfoLabel = this.sidePreviewObj.infolabel;
                  sideStatusInfoLabel = this.sidePreviewObj.statuslabel;

                  updateSidePreviewState();
            }
      }
      /* Main dialog.
       */
      this.dialogSizer = new VerticalSizer;
      //this.dialogSizer.add( this.tabBox, 300 );
      if (!use_preview) {
            this.dialogSizer.add( this.tabBox);
            this.dialogSizer.add( this.filesButtonsSizer);
      }
      //this.dialogSizer.add( this.buttonsSizer);
      this.dialogSizer.margin = 6;
      this.dialogSizer.spacing = 6;
      this.dialogSizer.add( this.cols );
      //this.dialogSizer.add( this.buttons_Sizer );
      this.dialogSizer.addStretch();

      /* ------------------------------- */

      this.mainSizer = new HorizontalSizer;
      this.mainSizer.margin = 6;
      this.mainSizer.spacing = 4;

      if (use_preview && use_tab_preview) {
            this.mainTabBox = new TabBox( this );
            mainTabBox = this.mainTabBox;

            let tabSizer = new mainSizerTab(this, this.dialogSizer);
            this.rootingArr.push(tabSizer);
            this.mainTabBox.addPage( tabSizer, "Settings" );

            tabSizer = new mainSizerTab(this, this.tabPreviewObj.sizer);
            this.rootingArr.push(tabSizer);
            this.mainTabBox.addPage( tabSizer, "Preview" );

            if (use_side_preview) {
                  this.mainSizer.add( this.sidePreviewObj.sizer);
            }
            this.mainSizer.add( this.mainTabBox );

      } else if (use_preview && use_side_preview) {
            this.mainSizer.add( this.sidePreviewObj.sizer);
            this.mainSizer.add( this.dialogSizer );

      } else {
            this.mainSizer.add( this.dialogSizer );
      }
      //this.mainSizer.addStretch();

      this.sizer = new VerticalSizer;
      this.sizer.margin = 6;
      this.sizer.spacing = 4;
      if (use_preview) {
            this.sizer.add( this.tabBox);
            this.sizer.add( this.filesButtonsSizer);
      }
      this.sizer.add( this.mainSizer );
      this.sizer.add( this.buttons_Sizer );
      //this.sizer.addStretch();

      // Version number
      this.windowTitle = autointegrate_version; 
      this.userResizable = true;
      this.adjustToContents();
      //this.setVariableSize();
      //this.files_GroupBox.setFixedHeight();

      setWindowPrefixHelpTip(ppar.win_prefix);

      console.show();

} // End of AutoIntegrateDialog code

/***************************************************************************
 * 
 *    test utility functions
 * 
 */
function init_pixinsight_version()
{
      pixinsight_version_str = CoreApplication.versionMajor + '.' + CoreApplication.versionMinor + '.' + 
                               CoreApplication.versionRelease + '-' + CoreApplication.versionRevision;
      pixinsight_version_num = CoreApplication.versionMajor * 1e6 + 
                               CoreApplication.versionMinor * 1e4 + 
                               CoreApplication.versionRelease * 1e2 + 
                               CoreApplication.versionRevision;
}

this.test_initialize = function()
{
      console.writeln("test_initialize");

      init_pixinsight_version();

      do_not_write_settings = true;

      setDefaultDirs();

      // Initialize ppar to the default values they have when the script is started
      ppar.win_prefix = '';
      ppar.prefixArray = [];
      ppar.userColumnCount = -1;    
      ppar.lastDir = '';  

      // Hopefully remove the prefixes of a previous run
      fixAllWindowArrays(ppar.win_prefix);

      // Reset the parameters to the default they would have when the program is loaded
      setParameterDefaults();

      console.writeln("test_initialize done");
}

this.test_autosetup = function(autosetup_path)
{
      console.writeln("test_autosetup");

      var pagearray = readJsonFile(autosetup_path, false);

      for (var i = 0; i < pagearray.length; i++) {
            if (pagearray[i] != null) {
                  addFilesToTreeBox(this.AutoIntegrateDialog, i, pagearray[i]);
            }
      }
      updateInfoLabel(this.AutoIntegrateDialog);

      console.writeln("test_autosetup done");
}

this.test_getpar = function()
{
      return par;
}

this.test_getppar = function()
{
      return ppar;
}

this.get_run_results = function()
{
      return run_results;
}

this.get_autointegrate_version = function()
{
      return autointegrate_version;
}

this.set_outputRootDir = function(dir)
{
      outputRootDir = dir;
}

this.set_dialog = function(dialog)
{
      this.AutoIntegrateDialog = dialog;
}

this.openImageWindowFromFile = function(name)
{
      return openImageWindowFromFile(name);
}

/***************************************************************************
 * 
 *    autointerate_main
 * 
 */
 this.autointerate_main = function ()
{
      console.writeln("autointerate_main");
      try {
            /* Check command line arguments. Arguments can be given by starting the script from
             * the command line in the Process Console window. Arguments are given using syntax:
             *    -a="value"
             * For example:
             *    run -a="do_not_read_settings" -a="do_not_write_settings" --execute-mode=auto "C:/Users/jarmo_000/GitHub/AutoIntegrate/AutoIntegrate.js"
             * You can find the start command line by checking the Process Console window after starting
             * the scrip.
             */
            for (let i = 0; i < jsArguments.length; i++) {
                  if (jsArguments[i] == "do_not_read_settings") {
                        console.writeln("Found do_not_read_settings argument, no parameters are read from persistent module settings or from icon.");
                        do_not_read_settings = true;
                  } 
                  if (jsArguments[i] == "do_not_write_settings") {
                        console.writeln("Found do_not_write_settings argument, no parameters are written to persistent module settings.");
                        do_not_write_settings = true;
                  } 
            }

            setDefaultDirs();

            // 1. Read saved parameters from persistent module settings
            console.noteln("Read persistent module settings");
            ReadParametersFromPersistentModuleSettings();

            // 2. Read parameters saved to process icon, these overwrite persistent module settings
            if (Parameters.isGlobalTarget || Parameters.isViewTarget) {
                  // read default parameters from saved settings/process icon
                  console.noteln("Read process icon settings");
                  readParametersFromProcessIcon();
            }
            
            if (ai_use_persistent_module_settings) {
                  // 3. Read persistent module settings that are temporary work values
                  readPersistentSettings();
            } else {
                  console.noteln("Skip reading persistent settings");
            }

            fixAllWindowArrays(ppar.win_prefix);

            init_pixinsight_version();
            console.noteln("======================================================");
            console.noteln("To enable automatic updates add the following link to ");
            console.noteln("the PixInsight update repository: ");
            console.noteln("https://ruuth.xyz/autointegrate ");
            console.noteln("======================================================");
            console.noteln("For more information visit the following link:");
            console.noteln("https://ruuth.xyz/AutoIntegrateInfo.html");
            console.noteln("======================================================");
            console.noteln(autointegrate_version + ", PixInsight v" + pixinsight_version_str + ' (' + pixinsight_version_num + ')');
            console.noteln("======================================================");
            
            if (pixinsight_version_num < 1080810) {
                  var old_default = 'Generic';
                  if (par.use_weight.val == par.use_weight.def 
                      && par.use_weight.def != old_default) 
                  {
                        console.noteln("PixInsight version is older than 1.8.8-10, using " + old_default + " instead of " + 
                                       par.use_weight.def + " for " + par.use_weight.name);
                        par.use_weight.val = old_default;
                        par.use_weight.def = old_default;
                  }
            }
      }
      catch (x) {
            console.writeln( x );
      }


      var dialog = new this.AutoIntegrateDialog();

      dialog.execute();
}

this.AutoIntegrateDialog.prototype = new Dialog;
PreviewControl.prototype = new Frame;

} // AutoIntegrate wrapper end

AutoIntegrate.prototype = new Object;

function main()
{
      var autointegrate = new AutoIntegrate();

      autointegrate.autointerate_main();

      autointegrate = null;
}

// Disable execution of main if the script is included as part of a test
#ifndef TEST_AUTO_INTEGRATE
main();
#endif
