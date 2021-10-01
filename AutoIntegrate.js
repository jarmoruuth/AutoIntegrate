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

Calibration steps
-----------------

Calibration can run two basic worflows, one with bias files and one
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
2. Optionally ABE in run on L image. <lABE>
3. HistogramTransform is run on L image. <lHT>
4. Streched L image is stored as a mask unless user has a predefined mask named range_mask.
5. Noise reduction is run on L image using a mask.
6. If ABE_before_channel_combination is selected then ABE is run on each color channel (R,G,B). 
   <rgbDBE>
7. By default LinearFit is run on RGB channels using L, R, G or B as a reference
8. If Channel noise reduction is non-zero then noise reduction is done separately 
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
  stretch. Default is to use unlinked STF stretch for narrowband files.
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
For calibration another useful link is a PixInsight forum post
"For beginners: Guide to PI's ImageCalibration":
https://pixinsight.com/forum/index.php?threads/for-beginners-guide-to-pis-imagecalibration.11547/

Routines ApplyAutoSTF and applySTF are from PixInsight scripts that are 
distributed with Pixinsight. 

Routines for Linear Defect Detection are from PixInsight scripts 
LinearDefectDetection.js and CommonFunctions.jsh that is distributed 
with Pixinsight. 

This product is based on software from the PixInsight project, developed
by Pleiades Astrophoto and its contributors (https://pixinsight.com/).

Copyright (c) 2018-2021 Jarmo Ruuth. All Rights Reserved.

Window name prefix and icon location code

      Copyright (c) 2021 rob pfile

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


// GUI variables
var infoLabel;
var windowPrefixHelpTips;     // For updating tooTip
var closeAllPrefixButton;     // For updating toolTip

/*
      Parameters that can be adjusted in the GUI
      These can be saved to a process icon and later restored.
*/
var par = {
      // Image processing parameters
      use_local_normalization: { val: false, def: false, name : "Local normalization", type : 'B' },  /* color problems, maybe should be used only for L images */
      fix_column_defects: { val: false, def: false, name : "Fix column defects", type : 'B' },
      fix_row_defects: { val: false, def: false, name : "Fix row defetcs", type : 'B' },
      skip_cosmeticcorrection: { val: false, def: false, name : "Cosmetic correction", type : 'B' },
      skip_subframeselector: { val: false, def: false, name : "SubframeSelector", type : 'B' },
      strict_StarAlign: { val: false, def: false, name : "Strict StarAlign", type : 'B' },
      ABE_before_channel_combination: { val: false, def: false, name : "ABE before channel combination", type : 'B' },
      use_ABE_on_L_RGB: { val: false, def: false, name : "Use ABE on L, RGB", type : 'B' },
      skip_color_calibration: { val: false, def: false, name : "No color calibration", type : 'B' },
      color_calibration_before_ABE: { val: false, def: false, name : "Color calibration before ABE", type : 'B' },
      use_background_neutralization: { val: false, def: false, name : "Background neutralization", type : 'B' },
      skip_imageintegration_ssweight: { val: false, def: false, name : "No ImageIntegration SSWEIGHT", type : 'B' },
      skip_noise_reduction: { val: false, def: false, name : "No noise reduction", type : 'B' },
      noise_reduction_strength: { val: 3, def: 3, name : "Noise reduction strength", type : 'I' },
      channel_noise_reduction_strength: { val: 0, def: 0, name : "Noise reduction strength on color channels", type : 'I' },
      use_color_noise_reduction: { val: false, def: false, name : "Color noise reduction", type : 'B' },
      skip_mask_contrast: { val: false, def: false, name : "No mask contrast", type : 'B' },

      // Other parameters
      calibrate_only: { val: false, def: false, name : "Calibrate only", type : 'B' },
      integrate_only: { val: false, def: false, name : "Integrate only", type : 'B' },
      channelcombination_only: { val: false, def: false, name : "ChannelCombination only", type : 'B' },
      RRGB_image: { val: false, def: false, name : "RRGB", type : 'B' },
      batch_mode: { val: false, def: false, name : "Batch mode", type : 'B' },
      autodetect_filter: { val: true, def: true, name : "Autodetect FILTER keyword", type : 'B' },
      autodetect_imagetyp: { val: true, def: true, name : "Autodetect IMAGETYP keyword", type : 'B' },
      select_all_files: { val: false, def: false, name : "Select all files", type : 'B' },
      save_all_files: { val: false, def: false, name : "Save all files", type : 'B' },
      no_subdirs: { val: false, def: false, name : "No subdirectories", type : 'B' },
      use_drizzle: { val: false, def: false, name : "Drizzle", type : 'B' },
      keep_integrated_images: { val: false, def: false, name : "Keep integrated images", type : 'B' },
      keep_temporary_images: { val: false, def: false, name : "Keep temporary images", type : 'B' },
      use_uwf: { val: false, def: false, name : "UWF", type : 'B' },
      monochrome_image: { val: false, def: false, name : "Monochrome", type : 'B' },
      imageintegration_clipping: { val: true, def: true, name : "ImageIntegration clipping", type : 'B' },
      synthetic_l_image: { val: false, def: false, name : "Synthetic L", type : 'B' },
      synthetic_missing_images: { val: false, def: false, name : "Synthetic missing image", type : 'B' },
      force_file_name_filter: { val: false, def: false, name : "Use file name for filters", type : 'B' },
      unique_file_names: { val: false, def: false, name : "Unique file names", type : 'B' },
      
      // Narrowband processing
      custom_R_mapping: { val: 'S', def: 'S', name : "Narrowband R mapping", type : 'S' },
      custom_G_mapping: { val: 'H', def: 'H', name : "Narrowband G mapping", type : 'S' },
      custom_B_mapping: { val: 'O', def: 'O', name : "Narrowband B mapping", type : 'S' },
      custom_L_mapping: { val: 'L', def: 'L', name : "Narrowband L mapping", type : 'S' },
      narrowband_linear_fit: { val: 'Auto', def: 'Auto', name : "Narrowband linear fit", type : 'S' },
      mapping_on_nonlinear_data: { val: false, def: false, name : "Narrowband mapping on non-linear data", type : 'B' },
      narrowband_starnet: { val: false, def: false, name : "Narrowband starnet", type : 'B' },

      // Narrowband to RGB mappping
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
      use_weight: { val: 'Generic', def: 'Generic', name : "Weight calculation", type : 'S' },
      use_linear_fit: { val: 'Luminance', def: 'Luminance', name : "Linear fit", type : 'S' },
      image_stretching: { val: 'Auto STF', def: 'Auto STF', name : "Image stretching", type : 'S' },
      STF_linking: { val: 'Auto', def: 'Auto', name : "RGB channel linking", type : 'S' },
      imageintegration_normalization: { val: 'Additive', def: 'Additive', name : "ImageIntegration Normalization", type : 'S' },
      use_clipping: { val: 'Auto1', def: 'Auto1', name : "ImageIntegration rejection", type : 'S' },
      cosmetic_correction_hot_sigma: { val: 3, def: 3, name : "CosmeticCorection hot sigma", type : 'I' },
      cosmetic_correction_cold_sigma: { val: 3, def: 3, name : "CosmeticCorection cold sigma", type : 'I' },
      MaskedStretch_targetBackground: { val: 0.125, def: 0.125, name : "Masked Stretch targetBackground", type : 'R' },    
      LRGBCombination_lightness: { val: 0.5, def: 0.5, name : "LRGBCombination lightness", type : 'R' },    
      LRGBCombination_saturation: { val: 0.5, def: 0.5, name : "LRGBCombination saturation", type : 'R' },    
      linear_increase_saturation: { val: 1, def: 1, name : "Linear saturation increase", type : 'I' },    
      non_linear_increase_saturation: { val: 1, def: 1, name : "Non-linear saturation increase", type : 'I' },    
      
      // Extra processing for narrowband
      run_hue_shift: { val: false, def: false, name : "Extra narrowband more orange", type : 'B' },
      leave_some_green: { val: false, def: false, name : "Extra narrowband leave some green", type : 'B' },
      run_narrowband_SCNR: { val: false, def: false, name : "Extra narrowband remove green", type : 'B' },
      fix_narrowband_star_color: { val: false, def: false, name : "Extra narrowband fix star colors", type : 'B' },
      skip_star_fix_mask: { val: false, def: false, name : "Extra narrowband no star mask", type : 'B' },

      // Generic Extra processing
      extra_StarNet: { val: false, def: false, name : "Extra StarNet", type : 'B' },
      extra_ABE: { val: false, def: false, name : "Extra ABE", type : 'B' },
      extra_darker_background: { val: false, def: false, name : "Extra Darker background", type : 'B' },
      extra_HDRMLT: { val: false, def: false, name : "Extra HDRMLT", type : 'B' },
      extra_LHE: { val: false, def: false, name : "Extra LHE", type : 'B' },
      extra_contrast: { val: false, def: false, name : "Extra contrast", type : 'B' },
      extra_STF: { val: false, def: false, name : "Extra STF", type : 'B' },
      
      extra_noise_reduction: { val: false, def: false, name : "Extra noise reduction", type : 'B' },
      extra_noise_reduction_strength: { val: 3, def: 3, name : "Extra noise reduction strength", type : 'I' },
      extra_smaller_stars: { val: false, def: false, name : "Extra smaller stars", type : 'B' },
      extra_smaller_stars_iterations: { val: 1, def: 1, name : "Extra smaller stars iterations", type : 'I' },

      // Calibration settings
      debayerPattern: { val: "Auto", def: "Auto", name : "Debayer", type : 'S' },
      create_superbias: { val: true, def: true, name : "Superbias", type : 'B' },
      pre_calibrate_darks: { val: false, def: false, name : "Pre-calibrate darks", type : 'B' },
      optimize_darks: { val: true, def: true, name : "Optimize darks", type : 'B' },
      stars_in_flats: { val: false, def: false, name : "Stars in flats", type : 'B' },
      no_darks_on_flat_calibrate: { val: false, def: false, name : "Do not use darks on flats", type : 'B' },
      lights_add_manually: { val: false, def: false, name : "Add lights manually", type : 'B' },
      flats_add_manually: { val: false, def: false, name : "Add flats manually", type : 'B' },
};

var debayerPattern_values = [ "Auto", "RGGB", "BGGR", "GBRG", 
                              "GRBG", "GRGB", "GBGR", "RGBG", 
                              "BGRG", "None" ];
var debayerPattern_enums = [ Debayer.prototype.Auto, Debayer.prototype.RGGB, Debayer.prototype.BGGR, Debayer.prototype.GBRG,
                             Debayer.prototype.GRBG, Debayer.prototype.GRGB, Debayer.prototype.GBGR, Debayer.prototype.RGBG,
                             Debayer.prototype.BGRG, Debayer.prototype.Auto ];
var RGBNB_mapping_values = [ 'H', 'S', 'O', '' ];
var use_weight_values = [ 'Generic', 'Noise', 'Stars' ];
var use_linear_fit_values = [ 'Luminance', 'Red', 'Green', 'Blue', 'No linear fit' ];
var image_stretching_values = [ 'Auto STF', 'Masked Stretch', 'Use both' ];
var use_clipping_values = [ 'Auto1', 'Auto2', 'Percentile', 'Sigma', 'Winsorised sigma', 'Averaged sigma', 'Linear fit' ]; 
var narrowband_linear_fit_values = [ 'Auto', 'H', 'S', 'O', 'None' ];
var STF_linking_values = [ 'Auto', 'Linked', 'Unlinked' ];
var imageintegration_normalization_values = [ 'Additive', 'Adaptive', 'None' ];
var noise_reduction_strength_values = [ '0', '3', '4', '5'];

var close_windows = false;
var same_stf_for_all_images = false;            /* does not work, colors go bad */
var ssweight_set = false;
var run_HT = true;
var batch_narrowband_palette_mode = false;
var narrowband = false;
var autocontinue_narrowband = false;
var linear_fit_done = false;
var is_luminance_images = false;    // Do we have luminance files from autocontinue or FITS

var processingDate;
var lightFileNames = null;
var outputRootDir = "";
var darkFileNames = null;
var biasFileNames = null;
var flatdarkFileNames = null;
var flatFileNames = null;
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

var extra_target_image = null;

var processing_steps = "";
var all_windows = [];
var iconPoint;
var iconStartRow = 0;   // Starting row for icons, AutoContinue start from non-zero position
var logfname;

var filterSectionbars = [];
var filterSectionbarcontrols = [];
var lightFilterSet = null;
var flatFilterSet = null;
    
// These are initialzied by setDefaultDirs
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
var RGBcolor_id;
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

var pages = {
      LIGHTS : 0,
      BIAS : 1,
      DARKS : 2,
      FLATS : 3,
      FLAT_DARKS : 4,
      END : 5
};

var win_prefix = "";
var last_win_prefix = "";
var columnCount = 0;
var haveIconized = 0;

// Array of prefix names and icon count
var prefixArray = [];

// known window names
var integration_LRGB_windows = [
      "Integration_L",  // must be first
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
      "L_win_mask",
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

// Create a table of known prefix names for toolTip
function setWindowPrefixHelpTip()
{
      var prefix_list = "<table><tr><th>Col</th><th>Name</th><th>Icon count</th></tr>";
      for (var i = 0; i < prefixArray.length; i++) {
            if (prefixArray[i][0] == '-') {
                  prefix_list = prefix_list + "<tr><td>" + i + '</td><td>not used</td><td></td></tr>';
            } else {
                  prefix_list = prefix_list + "<tr><td>" + i + '</td><td>' + prefixArray[i][0] + '</td><td>' + prefixArray[i][1] + '</td></tr>';
            }
      }
      prefix_list = prefix_list + "</table>";
      windowPrefixHelpTips.toolTip = "<p>Current Window Prefixes:</p><p> " + prefix_list + "</p>";
      closeAllPrefixButton.toolTip = "<p>Use all known window prefixes to close all image windows that are created by this script.</p>" +
                                     "<p>Prefixes used to close windows are default empty prefix, prefix in the Window Prefix box and all saved window prefixes. " +
                                     "All saved prefix information is cleared after this operation.</p>" +
                                     "<p>To close windows with current prefix use Close all button.</p>" +
                                     windowPrefixHelpTips.toolTip;
}

function ensure_win_prefix(id)
{
      if (win_prefix != "" && !id.startsWith(win_prefix)) {
            return win_prefix + id;
      } else {
            return id;
      }
}

// Find a prefix from the prefix array. Returns -1 if not
// found.
function findPrefixIndex(prefix)
{
      for (var i = 0; i < prefixArray.length; i++) {
            if (prefixArray[i][0] == prefix) {
                  return i;
            }
      }
      return -1;
}

// Find a new free column position for a prefix. Prefix name '-'
// is used to mark a free position.
function findNewPrefixIndex()
{
      for (var i = 0; i < prefixArray.length; i++) {
            if (prefixArray[i][0] == '-') {
                  return i;
            }
      }
      return i;
}

// Save prefix settings
function saveSettings()
{
      Settings.write (SETTINGSKEY + "/prefixName", DataType_String, win_prefix);
      Settings.write (SETTINGSKEY + "/prefixArray", DataType_String, JSON.stringify(prefixArray));
      setWindowPrefixHelpTip();
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

// Fix all fixed window names by having the given prefix
// We find possible previous prefix from the known fixed
// window name
function fixAllWindowArrays(new_prefix)
{
      var basename = "Integration_L";
      var curname = integration_LRGB_windows[0];
      var old_prefix = curname.substring(0, curname.length - basename.length);
      if (old_prefix == new_prefix) {
            // no change
            return;
      }
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

function ensurePathEndSlash(dir)
{
      if (dir.length > 0) {
            switch (dir[dir.length-1]) {
                  case '/':
                  case '\\':
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
function parseNewOutputRootDir(filePath, subdir)
{
      var path = ensurePathEndSlash(File.extractDrive(filePath) + File.extractDirectory(filePath));
      path = ensurePathEndSlash(path + subdir);
      console.writeln("parseNewOutputRootDir " + path);
      return path;
}

// If path is relativge and not absolute, we append it to the 
// path of the image file
function pathIsRelative(p)
{
      var dir = File.extractDirectory(p);
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
      addProcessingStep(txt);
      throw new Error(txt);
}

function winIsValid(w)
{
      return w != null;
}

function checkWinFilePath(w)
{
      if (outputRootDir == "" || pathIsRelative(outputRootDir)) {
            console.writeln("checkWinFilePath id ", w.mainView.id);
            var filePath = w.filePath;
            if (filePath != null && filePath != "") {
                  outputRootDir = parseNewOutputRootDir(filePath, outputRootDir);
                  console.writeln("checkWinFilePath, set outputRootDir ", outputRootDir);
            } else {
                  outputRootDir = "";
                  console.writeln("checkWinFilePath empty filePath");
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
            if (par.keep_temporary_images.val) {
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

function windowIconizeAndKeywordif(id)
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
                                    -(w.width / 2) + 5 + columnCount*300,
                                    -(w.height / 2) + 5 + iconStartRow * 32);
                  //addProcessingStep("Icons start from position " + iconPoint);
            } else {
                  /* Put next icons in a nice row below the first icon.
                  */
                  iconPoint.moveBy(0, 32);
            }
            w.position = new Point(iconPoint);  // set window position to get correct icon position
            w.iconize();
            w.position = oldpos;                // restore window position

            // Set processed image keyword. It will not overwrite old
            // keyword. If we later set a final image keyword it will overwrite
            // this keyword.
            setProcessedImageKeyword(w);
            haveIconized++;
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
      if (par.keep_temporary_images.val) {
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
          //          console.writeln(" AINew Closing Window: " + arr[i]);
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
      closeAllWindowsFromArray(calibrate_windows);
      closeFinalWindowsFromArray(final_windows);
}

function ensureDir(dir)
{
      console.writeln("ensureDir " + dir)
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

function combinePath(p1, p2)
{
      if (p1 == "") {
            return "";
      } else {
            return p1 + p2;
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
      if (path == "") {
            console.criticalln("No output directory, cannot save image "+ id);
            return;
      }
      var processedPath = combinePath(path, AutoProcessedDir);
      ensureDir(processedPath);
      saveWindowEx(ensurePathEndSlash(processedPath), id, getOptionalUniqueFilenamePart());
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
                              if (imageWindow.mainView != null && imageWindow.mainView != undefined) {
                                    finalimages[finalimages.length] = imageWindow;
                              }
                              break;
                        }
                  }
            }
      }

      if (finalimages.length == 0) {
            console.noteln("No final iamges found");
            return;
      }

      var gdd = new GetDirectoryDialog;
      gdd.caption = "Select Final Image Save Directory";
      var filePath = finalimages[0].filePath;
      if (filePath != null) {
            gdd.initialPath = File.extractDrive(filePath) + File.extractDirectory(filePath);
      }

      if (gdd.execute()) {
            console.writeln("saveAllFinalImageWindows:dir " + gdd.directory);
            for (var i = 0; i < finalimages.length; i++) {
                  saveFinalImageWindow(finalimages[i], gdd.directory, finalimages[i].mainView.id, bits);
            }
      }
      console.writeln("All final image windows are saved!");
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

      if (!par.skip_mask_contrast.val) {
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

function openImageFiles(filetype)
{
      var filenames;
      var ofd = new OpenFileDialog;

      ofd.multipleSelections = true;
      ofd.caption = "Select " + filetype + " Images";
      var fits_files = "*.fit *.fits *.fts";
      var raw_files = "*.3fr *.ari *.arw *.bay *.braw *.crw *.cr2 *.cr3 *.cap *.data *.dcs *.dcr *.dng " +
                      "*.drf *.eip *.erf *.fff *.gpr *.iiq *.k25 *.kdc *.mdc *.mef *.mos *.mrw *.nef *.nrw *.obm *.orf " +
                      "*.pef *.ptx *.pxn *.r3d *.raf *.raw *.rwl *.rw2 *.rwz *.sr2 *.srf *.srw *.tif *.x3f";
      var image_files = fits_files + " " + raw_files;

      if (!par.select_all_files.val) {
            ofd.filters = [
                  ["Image files", image_files],
                  ["All files", "*.*"]
            ];
      } else {
            ofd.filters = [
                  ["All files", "*.*"],
                  ["Image files", image_files]
            ];
      }
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
            SSWEIGHT.toFixed(3),
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
 * Image calibration as dedscribed in Light Vortex Astronomy.
 */

// Integrate (stack) bias and dark images
function runImageIntegrationBiasDarks(images, name)
{
      console.writeln("runImageIntegrationBiasDarks, images[0] " + images[0][1] + ", name " + name);

      ensureThreeImages(images);

      var P = new ImageIntegration;
      P.images = images; // [ enabled, path, drizzlePath, localNormalizationDataPath ];
      P.rejection = getRejectionAlgorigthm(images.length);

      P.inputHints = "fits-keywords normalize raw cfa signed-is-physical";
      P.combination = ImageIntegration.prototype.Average;
      P.weightMode = ImageIntegration.prototype.DontCare;
      P.weightKeyword = "";
      P.weightScale = ImageIntegration.prototype.WeightScale_BWMV;
      P.adaptiveGridSize = 16;
      P.adaptiveNoScale = false;
      P.ignoreNoiseKeywords = false;
      P.normalization = ImageIntegration.prototype.NoNormalization;
      // P.rejection = ImageIntegration.prototype.NoRejection;
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
      P.clipLow = true;
      P.clipHigh = true;
      P.rangeClipLow = false;
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
      P.evaluateNoise = false;
      P.mrsMinDataFraction = 0.010;
      P.subtractPedestals = false;
      P.truncateOnOutOfRange = false;
      P.noGUIMessages = true;
      P.showImages = true;
      P.useFileThreads = true;
      P.fileThreadOverload = 1.00;
      P.useBufferThreads = true;
      P.maxBufferThreads = 0;

      P.executeGlobal();

      windowCloseif(P.highRejectionMapImageId);
      windowCloseif(P.lowRejectionMapImageId);
      windowCloseif(P.slopeMapImageId);

      var new_name = windowRename(P.integrationImageId, name);

      console.writeln("runImageIntegrationBiasDarks, integrated image " + new_name);

      return new_name;
}

// Generate SuperBias from integrated bias image
function runSuberBias(biasWin)
{
      console.writeln("runSuberBias, bias " + biasWin.mainView.id);

      var P = new Superbias;
      P.columns = true;
      P.rows = false;
      P.medianTransform = true;
      P.excludeLargeScale = true;
      P.multiscaleLayers = 7;
      P.trimmingFactor = 0.200;

      biasWin.mainView.beginProcess(UndoFlag_NoSwapFile);

      P.executeOn(biasWin.mainView, false);

      biasWin.mainView.endProcess();

      var targetWindow = ImageWindow.activeWindow;

      windowRenameKeepif(targetWindow.mainView.id, win_prefix + "AutoMasterSuperBias", true);

      return targetWindow.mainView.id
}

// Run ImageCalibration to darks using master bias image
// Output will be _c.xisf images
function runCalibrateDarks(images, masterbiasPath)
{
      if (masterbiasPath == null) {
            console.writeln("runCalibrateDarks, no master bias");
            return imagesEnabledPathToFileList(images);
      }

      console.writeln("runCalibrateDarks, images[0] " + images[0][1] + ", master bias " + masterbiasPath);

      var P = new ImageCalibration;
      P.targetFrames = filesNamesToEnabledPath(images); // [ enabled, path ];
      P.enableCFA = is_color_files && par.debayerPattern.val != 'None';
      P.cfaPattern = debayerPattern_enums[debayerPattern_values.indexOf(par.debayerPattern.val)];
      P.inputHints = "fits-keywords normalize raw cfa signed-is-physical";
      P.outputHints = "properties fits-keywords no-compress-data no-embedded-data no-resolution";
      P.pedestal = 0;
      P.pedestalMode = ImageCalibration.prototype.Keyword;
      P.pedestalKeyword = "";
      P.overscanEnabled = false;
      P.overscanImageX0 = 0;
      P.overscanImageY0 = 0;
      P.overscanImageX1 = 0;
      P.overscanImageY1 = 0;
      P.overscanRegions = [ // enabled, sourceX0, sourceY0, sourceX1, sourceY1, targetX0, targetY0, targetX1, targetY1
         [false, 0, 0, 0, 0, 0, 0, 0, 0],
         [false, 0, 0, 0, 0, 0, 0, 0, 0],
         [false, 0, 0, 0, 0, 0, 0, 0, 0],
         [false, 0, 0, 0, 0, 0, 0, 0, 0]
      ];
      P.masterBiasEnabled = true;
      P.masterBiasPath = masterbiasPath;
      P.masterDarkEnabled = false;
      P.masterDarkPath = "";
      P.masterFlatEnabled = false;
      P.masterFlatPath = "";
      P.calibrateBias = false;
      P.calibrateDark = false;
      P.calibrateFlat = false;
      P.optimizeDarks = true;
      P.darkOptimizationThreshold = 0.00000;
      P.darkOptimizationLow = 3.0000;
      P.darkOptimizationWindow = 0;
      P.darkCFADetectionMode = ImageCalibration.prototype.DetectCFA;
      P.separateCFAFlatScalingFactors = true;
      P.flatScaleClippingFactor = 0.05;
      P.evaluateNoise = true;
      P.noiseEvaluationAlgorithm = ImageCalibration.prototype.NoiseEvaluation_MRS;
      P.outputDirectory = outputRootDir + AutoOutputDir;
      P.outputExtension = ".xisf";
      P.outputPrefix = "";
      P.outputPostfix = "_c";
      P.outputSampleFormat = ImageCalibration.prototype.f32;
      P.outputPedestal = 0;
      P.overwriteExistingFiles = true;
      P.onError = ImageCalibration.prototype.Continue;
      P.noGUIMessages = true;

      P.executeGlobal();

      return fileNamesFromOutputData(P.outputData);
}

// Run ImageCalibration to flats using master bias and master dark images
// Output will be _c.xisf images
function runCalibrateFlats(images, masterbiasPath, masterdarkPath, masterflatdarkPath)
{
      if (masterbiasPath == null && masterdarkPath == null && masterflatdarkPath == null) {
            console.writeln("runCalibrateFlats, no master bias or dark");
            return imagesEnabledPathToFileList(images);
      }

      console.writeln("runCalibrateFlats, images[0] " + images[0][1]);

      var P = new ImageCalibration;
      P.targetFrames = images; // [ // enabled, path ];
      P.enableCFA = is_color_files && par.debayerPattern.val != 'None';
      P.cfaPattern = debayerPattern_enums[debayerPattern_values.indexOf(par.debayerPattern.val)];
      P.inputHints = "fits-keywords normalize raw cfa signed-is-physical";
      P.outputHints = "properties fits-keywords no-compress-data no-embedded-data no-resolution";
      P.pedestal = 0;
      P.pedestalMode = ImageCalibration.prototype.Keyword;
      P.pedestalKeyword = "";
      P.overscanEnabled = false;
      P.overscanImageX0 = 0;
      P.overscanImageY0 = 0;
      P.overscanImageX1 = 0;
      P.overscanImageY1 = 0;
      P.overscanRegions = [ // enabled, sourceX0, sourceY0, sourceX1, sourceY1, targetX0, targetY0, targetX1, targetY1
      [false, 0, 0, 0, 0, 0, 0, 0, 0],
      [false, 0, 0, 0, 0, 0, 0, 0, 0],
      [false, 0, 0, 0, 0, 0, 0, 0, 0],
      [false, 0, 0, 0, 0, 0, 0, 0, 0]
      ];
      if (masterflatdarkPath != null) {
            console.writeln("runCalibrateFlats, master flat dark " + masterflatdarkPath);
            P.masterBiasEnabled = true;
            P.masterBiasPath = masterflatdarkPath;
      } else if (masterbiasPath != null) {
            console.writeln("runCalibrateFlats, master bias " + masterbiasPath);
            P.masterBiasEnabled = true;
            P.masterBiasPath = masterbiasPath;
      } else {
            console.writeln("runCalibrateFlats, no master bias or flat dark");
            P.masterBiasEnabled = false;
            P.masterBiasPath = "";
      }
      if (masterdarkPath != null && !par.no_darks_on_flat_calibrate.val && masterflatdarkPath == null) {
            console.writeln("runCalibrateFlats, master dark " + masterdarkPath);
            P.masterDarkEnabled = true;
            P.masterDarkPath = masterdarkPath;
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
      P.calibrateFlat = false;
      P.optimizeDarks = true;
      P.darkOptimizationThreshold = 0.00000;
      P.darkOptimizationLow = 3.0000;
      P.darkOptimizationWindow = 0;
      P.darkCFADetectionMode = ImageCalibration.prototype.DetectCFA;
      P.separateCFAFlatScalingFactors = true;
      P.flatScaleClippingFactor = 0.05;
      P.evaluateNoise = true;
      P.noiseEvaluationAlgorithm = ImageCalibration.prototype.NoiseEvaluation_MRS;
      P.outputDirectory = outputRootDir + AutoOutputDir;;
      P.outputExtension = ".xisf";
      P.outputPrefix = "";
      P.outputPostfix = "_c";
      P.outputSampleFormat = ImageCalibration.prototype.f32;
      P.outputPedestal = 0;
      P.overwriteExistingFiles = true;
      P.onError = ImageCalibration.prototype.Continue;
      P.noGUIMessages = true;

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
      P.inputHints = "fits-keywords normalize raw cfa signed-is-physical";
      P.combination = ImageIntegration.prototype.Average;
      P.weightMode = ImageIntegration.prototype.DontCare;
      P.weightKeyword = "";
      P.weightScale = ImageIntegration.prototype.WeightScale_BWMV;
      P.adaptiveGridSize = 16;
      P.adaptiveNoScale = false;
      P.ignoreNoiseKeywords = false;
      P.normalization = ImageIntegration.prototype.MultiplicativeWithScaling;
      P.rejection = ImageIntegration.prototype.PercentileClip;
      P.rejectionNormalization = ImageIntegration.prototype.EqualizeFluxes;
      P.minMaxLow = 1;
      P.minMaxHigh = 1;
      if (par.stars_in_flats.val) {
            P.pcClipLow = 0.010;
            P.pcClipHigh = 0.010;
      } else {
            P.pcClipLow = 0.200;
            P.pcClipHigh = 0.100;
      }
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
      P.clipLow = true;
      P.clipHigh = true;
      P.rangeClipLow = false;
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
      P.maxBufferThreads = 0;

      P.executeGlobal();

      windowCloseif(P.highRejectionMapImageId);
      windowCloseif(P.lowRejectionMapImageId);
      windowCloseif(P.slopeMapImageId);

      var new_name = windowRename(P.integrationImageId, name);

      console.writeln("runImageIntegrationFlats, integrated image " + new_name);

      return new_name;
}

function runCalibrateLights(images, masterbiasPath, masterdarkPath, masterflatPath)
{
      if (masterbiasPath == null && masterdarkPath == null && masterflatPath == null) {
            console.writeln("runCalibrateLights, no master bias, dark or flat");
            return imagesEnabledPathToFileList(images);
      }

      console.writeln("runCalibrateLights, images[0] " + images[0][1]);

      var P = new ImageCalibration;
      P.targetFrames = images; // [ enabled, path ];
      P.enableCFA = is_color_files && par.debayerPattern.val != 'None';
      P.cfaPattern = debayerPattern_enums[debayerPattern_values.indexOf(par.debayerPattern.val)];
      P.inputHints = "fits-keywords normalize raw cfa signed-is-physical";
      P.outputHints = "properties fits-keywords no-compress-data no-embedded-data no-resolution";
      P.pedestal = 0;
      P.pedestalMode = ImageCalibration.prototype.Keyword;
      P.pedestalKeyword = "";
      P.overscanEnabled = false;
      P.overscanImageX0 = 0;
      P.overscanImageY0 = 0;
      P.overscanImageX1 = 0;
      P.overscanImageY1 = 0;
      P.overscanRegions = [ // enabled, sourceX0, sourceY0, sourceX1, sourceY1, targetX0, targetY0, targetX1, targetY1
      [false, 0, 0, 0, 0, 0, 0, 0, 0],
      [false, 0, 0, 0, 0, 0, 0, 0, 0],
      [false, 0, 0, 0, 0, 0, 0, 0, 0],
      [false, 0, 0, 0, 0, 0, 0, 0, 0]
      ];
      if (masterbiasPath != null) {
            console.writeln("runCalibrateLights, master bias " + masterbiasPath);
            P.masterBiasEnabled = true;
            P.masterBiasPath = masterbiasPath;
      } else {
            console.writeln("runCalibrateLights, no master bias");
            P.masterBiasEnabled = false;
            P.masterBiasPath = "";
      }
      if (masterdarkPath != null) {
            console.writeln("runCalibrateLights, master dark " + masterdarkPath);
            P.masterDarkEnabled = true;
            P.masterDarkPath = masterdarkPath;
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
      P.darkOptimizationThreshold = 0.00000;
      P.darkOptimizationLow = 3.0000;
      P.darkOptimizationWindow = 0;
      P.darkCFADetectionMode = ImageCalibration.prototype.DetectCFA;
      P.separateCFAFlatScalingFactors = true;
      P.flatScaleClippingFactor = 0.05;
      P.evaluateNoise = true;
      P.noiseEvaluationAlgorithm = ImageCalibration.prototype.NoiseEvaluation_MRS;
      P.outputDirectory = outputRootDir + AutoCalibratedDir;
      P.outputExtension = ".xisf";
      P.outputPrefix = "";
      P.outputPostfix = "_c";
      P.outputSampleFormat = ImageCalibration.prototype.f32;
      P.outputPedestal = 0;
      P.overwriteExistingFiles = true;
      P.onError = ImageCalibration.prototype.Continue;
      P.noGUIMessages = true;

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

function filesNamesToEnabledPath(fileNames)
{
      var images = [];
      for (var i = 0; i < fileNames.length; i++) {
            images[images.length] = [ true, fileNames[i] ]; // [ enabled, path ];
      }
      return images;
}

function filesNamesToEnabledPathFromFilearr(filearr)
{
      var images = [];
      for (var i = 0; i < filearr.length; i++) {
            images[images.length] = [ true, filearr[i].name ]; // [ enabled, path ];
      }
      return images;
}

function imagesEnabledPathToFileList(images)
{
      var fileNames = [];
      for (var i = 0; i < images.length; i++) {
            fileNames[fileNames.length] = images[i][1];
      }
      return fileNames;
}


// Calibration engine to run image calibration 
// if bias, dark and/or flat files are selected.
function calibrateEngine()
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

      addProcessingStep("calibrateEngine");

      ensureDir(outputRootDir);
      ensureDir(combinePath(outputRootDir, AutoMasterDir));
      ensureDir(combinePath(outputRootDir, AutoOutputDir));
      ensureDir(combinePath(outputRootDir, AutoCalibratedDir));

      // Collect filter files
      var filtered_flats = getFilterFiles(flatFileNames, pages.FLATS, '');
      var filtered_lights = getFilterFiles(lightFileNames, pages.LIGHTS, '');

      is_color_files = filtered_flats.color_files;

      if (flatFileNames.length > 0 && lightFileNames.length > 0) {
            // we have flats and lights
            // check that filtered files match
            for (var i = 0; i < filtered_flats.allfilesarr.length; i++) {
                  var is_flats = filtered_flats.allfilesarr[i][0].length > 0;
                  var is_lights = filtered_lights.allfilesarr[i][0].length > 0;
                  if (is_flats != is_lights) {
                        // lights and flats do not match on filters
                        throwFatalError("Filters on light and flat images do not match.");
                  }
            }
      }

      if (biasFileNames.length == 1) {
            addProcessingStep("calibrateEngine use existing master bias " + biasFileNames[0]);
            var masterbiasPath = biasFileNames[0];
      } else if (biasFileNames.length > 0) {
            addProcessingStep("calibrateEngine generate master bias using " + biasFileNames.length + " files");
            // integrate bias images
            var biasimages = filesForImageIntegration(biasFileNames);
            var masterbiasid = runImageIntegrationBiasDarks(biasimages, win_prefix + "AutoMasterBias");

            // save master bias
            setImagetypKeyword(findWindow(masterbiasid), "Master bias");
            var masterbiasPath = saveMasterWindow(outputRootDir, masterbiasid);

            // optionally generate superbias
            if (par.create_superbias.val) {
                  var masterbiaswin = findWindow(masterbiasid);
                  var mastersuperbiasid = runSuberBias(masterbiaswin);
                  setImagetypKeyword(findWindow(mastersuperbiasid), "Master bias");
                  var masterbiasPath = saveMasterWindow(outputRootDir, mastersuperbiasid);
            }
      } else {
            addProcessingStep("calibrateEngine no master bias");
            var masterbiasPath = null;
      }

      if (flatdarkFileNames.length == 1) {
            addProcessingStep("calibrateEngine use existing master flat dark " + flatdarkFileNames[0]);
            var masterflatdarkPath = flatdarkFileNames[0];
      } else if (flatdarkFileNames.length > 0) {
            addProcessingStep("calibrateEngine generate master flat dark using " + flatdarkFileNames.length + " files");
            // integrate flat dark images
            var flatdarkimages = filesForImageIntegration(flatdarkFileNames);
            var masterflatdarkid = runImageIntegrationBiasDarks(flatdarkimages, win_prefix + "AutoMasterFlatDark");
            setImagetypKeyword(findWindow(masterflatdarkid), "Master flat dark");
            var masterflatdarkPath = saveMasterWindow(outputRootDir, masterflatdarkid);
      } else {
            addProcessingStep("calibrateEngine no master flat dark");
            var masterflatdarkPath = null;
      }

      if (darkFileNames.length == 1) {
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
            var masterdarkid = runImageIntegrationBiasDarks(darkimages, win_prefix + "AutoMasterDark");
            setImagetypKeyword(findWindow(masterdarkid), "Master dark");
            var masterdarkPath = saveMasterWindow(outputRootDir, masterdarkid);
      } else {
            addProcessingStep("calibrateEngine no master dark");
            var masterdarkPath = null;
      }

      // generate master flat for each filter
      addProcessingStep("calibrateEngine generate master flats");
      var masterflatPath = [];
      for (var i = 0; i < filtered_flats.allfilesarr.length; i++) {
            var filterFiles = filtered_flats.allfilesarr[i][0];
            var filterName = filtered_flats.allfilesarr[i][1];
            if (filterFiles.length == 1) {
                  addProcessingStep("calibrateEngine use existing " + filterName + " master flat " + filterFiles[0].name);
                  masterflatPath[i] = filterFiles[0].name;
            } else if (filterFiles.length > 0) {
                  // calibrate flats for each filter with master bias and master dark
                  addProcessingStep("calibrateEngine calibrate " + filterName + " flats using " + filterFiles.length + " files, " + filterFiles[0].name);
                  var flatcalimages = filesNamesToEnabledPathFromFilearr(filterFiles);
                  console.writeln("flatcalimages[0] " + flatcalimages[0][1]);
                  var flatcalFileNames = runCalibrateFlats(flatcalimages, masterbiasPath, masterdarkPath, masterflatdarkPath);
                  console.writeln("flatcalFileNames[0] " + flatcalFileNames[0]);

                  // integrate flats to generate master flat for each filter
                  var flatimages = filesForImageIntegration(flatcalFileNames);
                  console.writeln("flatimages[0] " + flatimages[0][1]);
                  masterflatid = runImageIntegrationFlats(flatimages, win_prefix + "AutoMasterFlat_" + filterName);
                  console.writeln("masterflatid " + masterflatid);
                  setImagetypKeyword(findWindow(masterflatid), "Master flat");
                  setFilterKeyword(findWindow(masterflatid), filterFiles[0].filter);
                  masterflatPath[i] = saveMasterWindow(outputRootDir, masterflatid);
            } else {
                  masterflatPath[i] = null;
            }
      }

      addProcessingStep("calibrateEngine calibrate light images");
      var calibratedLightFileNames = [];
      for (var i = 0; i < filtered_lights.allfilesarr.length; i++) {
            var filterFiles = filtered_lights.allfilesarr[i][0];
            var filterName = filtered_lights.allfilesarr[i][1];
            if (filterFiles.length > 0) {
                  // calibrate light frames with master bias, master dark and master flat
                  // optionally master dark can be left out
                  addProcessingStep("calibrateEngine calibrate " + filterName + " lights using " + filterFiles.length + " files, " + filterFiles[0].name);
                  var lightcalimages = filesNamesToEnabledPathFromFilearr(filterFiles);
                  var lightcalFileNames = runCalibrateLights(lightcalimages, masterbiasPath, masterdarkPath, masterflatPath[i]);
                  calibratedLightFileNames = calibratedLightFileNames.concat(lightcalFileNames);
            }
      }

      // We now have calibrated light images
      // We now proceed with cosmetic connection and
      // after that debayering in case of OSC/RAW files

      console.writeln("calibrateEngine, return calibrated images, calibratedLightFileNames[0] " + calibratedLightFileNames[0]);

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
            if (!par.lights_add_manually.val) {
                  if (par.use_uwf.val) {
                        if (!slooh_uwf) {
                              continue;
                        }
                  } else {
                        if (slooh_uwf) {
                              continue;
                        }
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

function generateNewFileNames(oldFileNames, outputdir, postfix, extension)
{
      var newFileNames = [];

      console.writeln("generateNewFileNames, old " + oldFileNames[0]);

      for (var i = 0; i < oldFileNames.length; i++) {
            newFileNames[i] = ensurePathEndSlash(outputdir) + File.extractName(oldFileNames[i]) + postfix + extension;
      }

      console.writeln("generateNewFileNames, new " + newFileNames[0]);
      return newFileNames;
}

function runCosmeticCorrection(fileNames, defects, color_images)
{
      if (defects.length > 0) {
            addProcessingStep("run CosmeticCorrection, output *_cc.xisf, number of line defects to fix is " + defects.length);
      } else {
            addProcessingStep("run CosmeticCorrection, output *_cc.xisf, no line defects to fix");
      }
      console.writeln("fileNames[0] " + fileNames[0]);

      var P = new CosmeticCorrection;

      P.targetFrames = filesNamesToEnabledPath(fileNames);
      P.masterDarkPath = "";
      P.outputDir = outputRootDir + AutoOutputDir;
      P.outputExtension = ".xisf";
      P.prefix = "";
      P.postfix = "_cc";
      P.overwrite = true;
      P.amount = 1.00;
      if (color_images && par.debayerPattern.val != 'None') {
            P.cfa = true;
      } else {
            P.cfa = false;
      }
      P.useMasterDark = false;
      P.hotDarkCheck = false;
      P.hotDarkLevel = 1.0000000;
      P.coldDarkCheck = false;
      P.coldDarkLevel = 0.0000000;
      P.useAutoDetect = true;
      P.hotAutoCheck = true;
      P.hotAutoValue = par.cosmetic_correction_hot_sigma.val;
      P.coldAutoCheck = true;
      P.coldAutoValue = par.cosmetic_correction_cold_sigma.val;
      if (defects.length > 0) {
            P.useDefectList = true;
            P.defects = defects; // defectEnabled, defectIsRow, defectAddress, defectIsRange, defectBegin, defectEnd
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

function SubframeSelectorMeasure(fileNames)
{
      console.writeln("SubframeSelectorMeasure");

      var P = new SubframeSelector;
      P.routine = SubframeSelector.prototype.MeasureSubframes;
      P.nonInteractive = true;
      P.subframes = filesNamesToEnabledPath(fileNames);     // [ subframeEnabled, subframePath ]
      P.fileCache = true;
      P.subframeScale = 1.0000;     // old version: 2.1514
      P.cameraGain = 1.0000;
      P.cameraResolution = SubframeSelector.prototype.Bits16;
      P.siteLocalMidnight = 24;
      P.scaleUnit = SubframeSelector.prototype.ArcSeconds;
      P.dataUnit = SubframeSelector.prototype.Electron;
      P.trimmingFactor = 0.10;
      P.structureLayers = 4;  // def: 5
      P.noiseLayers = 2;      // def: 2
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
      P.roiX0 = 0;
      P.roiY0 = 0;
      P.roiX1 = 0;
      P.roiY1 = 0;
      P.pedestalMode = SubframeSelector.prototype.Pedestal_Keyword;
      P.pedestal = 0;
      P.pedestalKeyword = "";
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
      P.weightingExpression = "";
      P.sortProperty = SubframeSelector.prototype.Index;
      P.graphProperty = SubframeSelector.prototype.FWHM;
      P.measurements = [ // measurementIndex, measurementEnabled, measurementLocked, measurementPath, measurementWeight, measurementFWHM, measurementEccentricity, measurementSNRWeight, measurementMedian, measurementMedianMeanDev, measurementNoise, measurementNoiseRatio, measurementStars, measurementStarResidual, measurementFWHMMeanDev, measurementEccentricityMeanDev, measurementStarResidualMeanDev
      ];
     
      console.writeln("SubframeSelectorMeasure:executeGlobal");

      P.executeGlobal();

      // Close measurements and expressions windows
      closeAllWindowsSubstr("SubframeSelector");

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

      var ssFiles = [];

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
            } else if (par.use_weight.val == 'Noise') {
                  /* More weight on noise.
                   */
                  SSWEIGHT = (5*(1-(FWHM-FWHMMin)/(FWHMMax-FWHMMin)) + 
                              10*(1-(Eccentricity-EccentricityMin)/(EccentricityMax-EccentricityMin)) + 
                              20*(SNRWeight-SNRWeightMin)/(SNRWeightMax-SNRWeightMin))+
                              65;

            } else if (par.use_weight.val == 'Stars') {
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
            ssFiles[ssFiles.length] = [ P.measurements[i][indexPath], SSWEIGHT ];
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
            if (!par.lights_add_manually.val) {
                  if (par.use_uwf.val) {
                        skip_this = !slooh_uwf;
                  } else {
                        skip_this = slooh_uwf;
                  }
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

// Filter files based on filter keyword/file name.
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

      /* Collect all different file types and some information about them.
       */
      var n = 0;
      for (var i = 0; i < files.length; i++) {
            var filter = null;
            var ssweight = '0';
            var exptime = 0;
            var filePath = files[i];
            
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
                                    console.writeln("filter already found, ignored FILTER=" +  value);
                              } else if (par.autodetect_filter.val) {
                                    console.writeln("FILTER=" +  value);
                                    filter = value;
                              } else {
                                    console.writeln("ignored FILTER=" +  value);
                              }
                              break;
                        case "SSWEIGHT":
                              ssweight = value;
                              console.writeln("SWEIGHT=" +  ssweight);
                              ssweight_set = true;
                              break;
                        case "TELESCOP":
                              console.writeln("TELESCOP=" +  value);
                              break;
                        case "NAXIS1":
                              console.writeln("NAXIS1=" + value);
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
            switch (filter.trim()) {
                  case 'Luminance':
                  case 'Lum':
                  case 'Clear':
                        filter = 'L';
                        break;
                  case 'Red':
                        filter = 'R';
                        break;
                  case 'Green':
                        filter = 'G';
                        break;
                  case 'Blue':
                        filter = 'B';
                        break;
                  case 'Halpha':
                  case 'Ha':
                        filter = 'H';
                        break;
                  case 'SII':
                        filter = 'S';
                        break;
                  case 'OIII':
                        filter = 'O';
                        break;
                  case 'Color':
                  case 'No filter':
                        filter = 'C';
                        break;
                  default:
                        break;
            }
            // Do final resolve based on first letter in the filter
            switch (filter.trim().substring(0, 1)) {
                  case 'L':
                  case 'l':
                        allfiles.L[allfiles.L.length] = { name: filePath, ssweight: ssweight, exptime: exptime, filter: filter};
                        luminance = true;
                        break;
                  case 'R':
                  case 'r':
                        allfiles.R[allfiles.R.length] = { name: filePath, ssweight: ssweight, exptime: exptime, filter: filter};
                        rgb = true;
                        break;
                  case 'G':
                  case 'g':
                        allfiles.G[allfiles.G.length] = { name: filePath, ssweight: ssweight, exptime: exptime, filter: filter};
                        rgb = true;
                        break;
                  case 'B':
                  case 'b':
                        allfiles.B[allfiles.B.length] = { name: filePath, ssweight: ssweight, exptime: exptime, filter: filter};
                        rgb = true;
                        break;
                  case 'H':
                  case 'h':
                        allfiles.H[allfiles.H.length] = { name: filePath, ssweight: ssweight, exptime: exptime, filter: filter};
                        narrowband = true;
                        break;
                  case 'S':
                  case 's':
                        allfiles.S[allfiles.S.length] = { name: filePath, ssweight: ssweight, exptime: exptime, filter: filter};
                        narrowband = true;
                        break;
                  case 'O':
                  case 'o':
                        allfiles.O[allfiles.O.length] = { name: filePath, ssweight: ssweight, exptime: exptime, filter: filter};
                        narrowband = true;
                        break;
                  case 'C':
                  default:
                        allfiles.C[allfiles.C.length] = { name: filePath, ssweight: ssweight, exptime: exptime, filter: filter};
                        color_files = true;
                        break;
            }
      }

      allfilesarr[0] = [ allfiles.L, 'L' ];
      allfilesarr[1] = [ allfiles.R, 'R' ];
      allfilesarr[2] = [ allfiles.G, 'G' ];
      allfilesarr[3] = [ allfiles.B, 'B' ];
      allfilesarr[4] = [ allfiles.H, 'H' ];
      allfilesarr[5] = [ allfiles.S, 'S' ];
      allfilesarr[6] = [ allfiles.O, 'O' ];
      allfilesarr[7] = [ allfiles.C, 'C' ];

      if (color_files && (luminance || rgb || narrowband)) {
            error_text = "Error, cannot mix color and monochrome filter files";
      } else if (rgb && (allfiles.R.length == 0 || allfiles.G.length == 0 || allfiles.B.length == 0)) {
            error_text = "Error, with RBG files for all RGB channels must be given";
      }

      return { allfiles : allfiles, 
               allfilesarr : allfilesarr,
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

function findLRGBchannels(alignedFiles, filename_postfix)
{
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

      /* Collect all different file types and some information about them.
       */
      var filter_info = getFilterFiles(alignedFiles, pages.LIGHTS, filename_postfix);

      var allfiles = filter_info.allfiles;
      var rgb = filter_info.rgb;
      is_color_files = filter_info.color_files;

      // update global variables
      narrowband = filter_info.narrowband;
      ssweight_set = filter_info.ssweight_set;

      // Check for synthetic images
      if (allfiles.C.length == 0) {
            if (par.synthetic_l_image.val ||
                  (par.synthetic_missing_images.val && allfiles.L.length == 0))
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
            if (allfiles.R.length == 0 && par.synthetic_missing_images.val) {
                  addProcessingStep("No red images, synthetic red image from luminance images");
                  allfiles.R = allfiles.R.concat(allfiles.L);
            }
            if (allfiles.G.length == 0 && par.synthetic_missing_images.val) {
                  addProcessingStep("No green images, synthetic green image from luminance images");
                  allfiles.G = allfiles.G.concat(allfiles.L);
            }
            if (allfiles.B.length == 0 && par.synthetic_missing_images.val) {
                  addProcessingStep("No blue images, synthetic blue image from luminance images");
                  allfiles.B = allfiles.B.concat(allfiles.L);
            }
            if (par.RRGB_image.val) {
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
            if (par.monochrome_image.val) {
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
      console.writeln("mapCustomAndReplaceImageNames " + targetChannel + " using " + mapping);
      /* Replace letters with actual image identifiers. */
      mapping = replaceMappingImageNames(mapping, "L", win_prefix + "Integration_L", images);
      mapping = replaceMappingImageNames(mapping, "R", win_prefix + "Integration_R", images);
      mapping = replaceMappingImageNames(mapping, "G", win_prefix + "Integration_G", images);
      mapping = replaceMappingImageNames(mapping, "B", win_prefix + "Integration_B", images);
      mapping = replaceMappingImageNames(mapping, "H", win_prefix + "Integration_H", images);
      mapping = replaceMappingImageNames(mapping, "S", win_prefix + "Integration_S", images);
      mapping = replaceMappingImageNames(mapping, "O", win_prefix + "Integration_O", images);
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

      if (createNewImage) {
            var targetFITSKeywords = getTargetFITSKeywordsForPixelmath(idWin);
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
      addProcessingStep("Run PixelMath mapping R " + mapping_R + ", G " + mapping_G + ", B " + mapping_B);

      if (idWin == null) {
            idWin = findWindow(win_prefix + "Integration_H");
      }
      if (idWin == null) {
            findWindow(win_prefix + "Integration_S");
      }
      if (idWin == null) {
            findWindow(win_prefix + "Integration_O");
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
            refimage = win_prefix + "Integration_O_map";
            if (arrayFindImage(images, refimage)) {
                  return(refimage);
            }
            refimage = win_prefix + "Integration_S_map";
            if (arrayFindImage(images, refimage)) {
                  return(refimage);
            }
      } else {
            refimage = win_prefix + "Integration_" + suggestion + "_map";
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
            var copyname = ensure_win_prefix(images[i] + "_map");
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
      if (par.skip_noise_reduction.val || par.channel_noise_reduction_strength.val == 0) {
            return;
      }
      addProcessingStep("Reduce noise on channe image " + image);

      /* Create a temporary stretched copy to be used as a mask. */
      var maskname = ensure_win_prefix(image + "_mask");
      var image_win = findWindow(image);
      var mask_win = copyWindow(image_win, maskname);
      runHistogramTransform(mask_win, null, false, 'mask');

      runMultiscaleLinearTransformReduceNoise(image_win, mask_win, par.channel_noise_reduction_strength.val);

      closeOneWindow(maskname);
}

// Remove stars from an image. We do not create star mask here.
function removeStars(imgWin)
{
      addProcessingStep("Run StarNet on " + imgWin.mainView.id);

      var P = new StarNet;
      P.stride = StarNet.prototype.Stride_128;
      P.mask = false;

      /* Execute StarNet on image.
       */
      imgWin.mainView.beginProcess(UndoFlag_NoSwapFile);

      P.executeOn(imgWin.mainView, false);
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

            if (par.ABE_before_channel_combination.val) {
                  // Optionally do ABE on channel images
                  for (var i = 0; i < images.length; i++) {
                        run_ABE_before_channel_combination(images[i]);
                  }
            }

            if (par.channel_noise_reduction_strength.val > 0) {
                  // Optionally do noise reduction on color channels in linear state
                  for (var i = 0; i < images.length; i++) {
                        reduceNoiseOnChannelImage(images[i]);
                  }
            }
            if (par.narrowband_linear_fit.val == "Auto"
                && par.image_stretching.val == 'Auto STF') 
            {
                  /* By default we do not do linear fit
                   * if we stretch with STF. If we stretch
                   * with MaskedStretch we use linear
                   * for to balance channels better.
                   * */
                  par.narrowband_linear_fit.val = "None";
            }
            if (par.narrowband_starnet.val) {
                  var mapping_on_nonlinear_data = true;
            } else {
                  var mapping_on_nonlinear_data = par.mapping_on_nonlinear_data.val;
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
                  if (par.narrowband_starnet.val) {
                        addProcessingStep("Custom mapping, run StarNet to remove stars");
                        for (var i = 0; i < images.length; i++) {
                              removeStars(findWindow(images[i]));
                        }
                  }
                  RBGmapping.stretched = true;
            }
            if (par.narrowband_linear_fit.val != "None") {
                  /* Do a linear fit of images before PixelMath. We do this on both cases,
                  * linear and stretched.
                  */
                  var refimage = findLinearFitHSOMapRefimage(images, par.narrowband_linear_fit.val);
                  linearFitArray(refimage, images);
            }

            /* Run PixelMath to create a combined RGB image.
             */
            RGB_win_id = runPixelMathRGBMapping(win_prefix + "Integration_RGB", null, red_mapping, green_mapping, blue_mapping);

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
                  luminance_id = mapRGBchannel(L_images, win_prefix + "Integration_L", luminance_mapping);
            }

            red_id = mapRGBchannel(R_images, win_prefix + "Integration_R", red_mapping);
            green_id = mapRGBchannel(G_images, win_prefix + "Integration_G", green_mapping);
            blue_id = mapRGBchannel(B_images, win_prefix + "Integration_B", blue_mapping);
            
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
      var custom_mapping = narrowband && !par.use_RGBNB_Mapping.val;

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
            targets[targets.length] = [ true, true, imagetable[i] ];
      }

      if (par.strict_StarAlign.val) {
            P.structureLayers = 5;
      } else {
            P.structureLayers = 6;
      }
      P.noiseLayers = 0;
      P.hotPixelFilterRadius = 1;
      if (par.strict_StarAlign.val) {
            P.noiseReductionFilterRadius = 0;
      } else {
            P.noiseReductionFilterRadius = 5;
      }
      if (par.strict_StarAlign.val) {
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
      if (par.strict_StarAlign.val) {
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
      if (par.use_drizzle.val) {
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

      alignedFiles = fileNamesFromOutputData(P.outputData);

      addProcessingStep("runStarAlignment, " + alignedFiles.length + " files");
      console.writeln("output[0] " + alignedFiles[0]);

      return alignedFiles;
}

function runLocalNormalization(imagetable, refImage)
{
      addProcessingStep("Run local normalization using reference image " + refImage);
      var targets = new Array;

      for (var i = 0; i < imagetable.length; i++) {
            targets[targets.length] = [ true, imagetable[i][1] ];
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
      P.outputDirectory = outputRootDir + AutoOutputDir;
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
      if (refViewId == null || targetId == null) {
            throwFatalError("No image for linear fit, maybe some previous step like star alignment failed");
      }
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
      P.enableCFA = is_color_files && par.debayerPattern.val != 'None';
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

      var new_name = windowRename(P.integrationImageId, win_prefix + "Integration_" + name);
      //addScriptWindow(new_name);
      return new_name;
}

function getRejectionAlgorigthm(numimages)
{
      if (numimages < 8) {
            addProcessingStep("  Using Percentile clip for rejection because number of images is " + numimages);
            return ImageIntegration.prototype.PercentileClip;
      }
      if (par.use_clipping.val == 'Percentile') {
            addProcessingStep("  Using Percentile clip for rejection");
            return ImageIntegration.prototype.PercentileClip;
      } else if (par.use_clipping.val == 'Sigma') {
            addProcessingStep("  Using Sigma clip for rejection");
            return ImageIntegration.prototype.SigmaClip;
      } else if (par.use_clipping.val == 'Winsorised sigma') {
            addProcessingStep("  Using Winsorised sigma clip for rejection");
            return ImageIntegration.prototype.WinsorizedSigmaClip;
      } else if (par.use_clipping.val == 'Averaged sigma') {
            addProcessingStep("  Using Averaged sigma clip for rejection");
            return ImageIntegration.prototype.AveragedSigmaClip;
      } else if (par.use_clipping.val == 'Linear fit') {
            addProcessingStep("  Using Linear fit clip for rejection");
            return ImageIntegration.prototype.LinearFit;
      } else if (par.use_clipping.val == 'Auto2') {
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
            /* par.use_clipping.val == 'Auto1' */
            if (numimages < 8) {
                  addProcessingStep("  Auto1 using percentile clip for rejection");
                  return ImageIntegration.prototype.PercentileClip;
            } else {
                  addProcessingStep("  Auto1 using Sigma clip for rejection");
                  return ImageIntegration.prototype.SigmaClip;
            }
      }
}

function ensureThreeImages(images)
{
      if (images.length < 3) {
            for (var i = 0; images.length < 3; i++) {
                  addProcessingStep("  Image integration needs 3 files, have only " + images.length + ", add one existing file");
                  append_image_for_integrate(images, images[i][1]);
            }
      }
     
}

function runImageIntegration(channel_images, name)
{
      var images = channel_images.images;
      if (images == null || images.length == 0) {
            return null;
      }
      addProcessingStep("Image " + name + " integration on " + images.length + " files");

      if (par.use_local_normalization.val && name != 'LDD') {
            return runImageIntegrationNormalized(channel_images, name);
      }

      ensureThreeImages(images);

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
      P.clipLow = par.imageintegration_clipping.val;             // def: true
      P.clipHigh = par.imageintegration_clipping.val;            // def: true
      P.rangeClipLow = par.imageintegration_clipping.val;        // def: true
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
      if (ssweight_set && !par.skip_imageintegration_ssweight.val) {
            // Using weightKeyword seem to give better results
            addProcessingStep("  Using SSWEIGHT for ImageIntegration weightMode");
            P.weightMode = ImageIntegration.prototype.KeywordWeight;
            P.weightKeyword = "SSWEIGHT";
      }
      if (par.imageintegration_normalization.val == 'Additive') {
            addProcessingStep("  Using AdditiveWithScaling for ImageIntegration normalization");
            P.normalization = ImageIntegration.prototype.AdditiveWithScaling;
      } else if (par.imageintegration_normalization.val == 'Adaptive') {
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
      
      if (par.use_drizzle.val) {
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

      if (par.use_drizzle.val) {
            windowCloseif(P.integrationImageId);
            return runDrizzleIntegration(images, name);
      } else {
            var new_name = windowRename(P.integrationImageId, win_prefix + "Integration_" + name);
            //addScriptWindow(new_name);
            return new_name
      }
}

function runImageIntegrationNormalized(channel_images, name)
{
      var images = channel_images.images;

      ensureThreeImages(images);

      runLocalNormalization(images, channel_images.best_image);

      addProcessingStep("  Using local normalized data in image integration");
      
      var norm_images = new Array;
      for (var i = 0; i < images.length; i++) {
            var oneimage = new Array(4);
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
      var P = new ImageIntegration;
      P.images = norm_images;
      P.inputHints = "";
      P.combination = ImageIntegration.prototype.Average;
      if (ssweight_set && !par.skip_imageintegration_ssweight.val) {
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
      P.clipLow = par.imageintegration_clipping.val;             // def: true
      P.clipHigh = par.imageintegration_clipping.val;            // def: true
      P.rangeClipLow = par.imageintegration_clipping.val;        // def: true
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
      if (par.use_drizzle.val) {
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
      windowCloseif(P.slopeMapImageId);

      if (par.use_drizzle.val) {
            windowCloseif(P.integrationImageId);
            return runDrizzleIntegration(images, name);
      } else {
            var new_name = windowRename(P.integrationImageId, win_prefix + "Integration_" + name);
            //addScriptWindow(new_name);
            return new_name;
      }
}

/* Do run ABE so just make copy of the source window as
 * is done by AutomaticBackgroundExtractor.
 */
function noABEcopyWin(win)
{
      var noABE_id = ensure_win_prefix(win.mainView.id + "_noABE");
      addProcessingStep("No ABE for " + win.mainView.id);
      addScriptWindow(noABE_id);
      copyWindow(win, noABE_id);
      return noABE_id;
}

function runABE(win, replaceTarget)
{
      addProcessingStep("ABE from " + win.mainView.id);
      if (replaceTarget) {
            var ABE_id = win.mainView.id;
      } else {
            var ABE_id = ensure_win_prefix(win.mainView.id + "_ABE");
      }
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
      ABE.replaceTarget = replaceTarget;
      ABE.correctedImageId = "";
      ABE.correctedImageSampleFormat = AutomaticBackgroundExtractor.prototype.SameAsTarget;
      ABE.verboseCoefficients = false;
      ABE.compareModel = false;
      ABE.compareFactor = 10.00;

      win.mainView.beginProcess(UndoFlag_NoSwapFile);

      ABE.executeOn(win.mainView, false);

      win.mainView.endProcess();

      if (replaceTarget) {
            windowCloseif(ABE_id + "_ABE_background");
      } else {
            windowCloseif(ABE_id + "_background");
      }

      addScriptWindow(ABE_id);

      return ABE_id;
}

// Run ABE and rename windows so that the final result has the same id
function run_ABE_before_channel_combination(id)
{
      if (id == null) {
            throwFatalError("No image for ABE, maybe some previous step like star alignment failed");
      }
      var id_win = ImageWindow.windowById(id);

      var ABE_id = runABE(id_win, false);

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

   if (par.STF_linking.val == 'Linked') {
      rgbLinked = true;  
   } else if (par.STF_linking.val == 'Unlinked') {
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
            } else if (iscolor) {
                  rgbLinked = false;
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
      P.targetBackground = par.MaskedStretch_targetBackground.val;
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

      if (par.image_stretching.val == 'Auto STF' 
          || type == 'mask'
          || (par.image_stretching.val == 'Use both' && type == 'L'))
      {
            return runHistogramTransformSTF(ABE_win, stf_to_use, iscolor);

      } else if (par.image_stretching.val == 'Masked Stretch'
                 || (par.image_stretching.val == 'Use both' && type == 'RGB'))
      {
            return runHistogramTransformMaskedStretch(ABE_win);

      } else {
            throwFatalError("Bad image stretching value " + par.image_stretching.val + " with type " + type);
            return null;
      }
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

function runMultiscaleLinearTransformReduceNoise(imgWin, maskWin, strength)
{
      if (strength == 0) {
            return;
      }

      console.writeln("runMultiscaleLinearTransformReduceNoise on " + imgWin.mainView.id + " using mask " + maskWin.mainView.id + ", strength " + strength);

      if (strength <= 3) {
            var P = noiseMild();
      } else if (strength == 4) {
            var P = noiseStrong();
      } else {
            var P = noiseSuperStrong();
       } 

      imgWin.mainView.beginProcess(UndoFlag_NoSwapFile);

      if (maskWin != null) {
            /* Remove noise from dark parts of the image. */
            imgWin.setMask(maskWin);
            imgWin.maskInverted = true;
      }

      P.executeOn(imgWin.mainView, false);

      if (maskWin != null) {
            imgWin.removeMask();
      }

      imgWin.mainView.endProcess();
}

function runNoiseReduction(imgWin, maskWin)
{
      if (par.skip_noise_reduction.val || par.noise_reduction_strength.val == 0) {
            return;
      }

      addProcessingStep("Noise reduction on " + imgWin.mainView.id + " using mask " + maskWin.mainView.id);

      runMultiscaleLinearTransformReduceNoise(imgWin, maskWin, par.noise_reduction_strength.val);
}

function runColorReduceNoise(imgWin)
{
      if (!par.use_color_noise_reduction.val) {
            return;
      }
      addProcessingStep("Color noise reduction on " + imgWin.mainView.id);

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

      imgWin.mainView.beginProcess(UndoFlag_NoSwapFile);

      /* Remove color noise from the whole image. */
      P.executeOn(imgWin.mainView, false);

      imgWin.mainView.endProcess();
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
            addProcessingStep("No color calibration for narrowband");
            return;
      }
      if (par.skip_color_calibration.val) {
            addProcessingStep("No color calibration was selected");
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

function runColorSaturation(imgWin, maskWin)
{
      addProcessingStep("Color saturation on " + imgWin.mainView.id + " using mask " + maskWin.mainView.id);
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

      imgWin.mainView.beginProcess(UndoFlag_NoSwapFile);

      /* Saturate only light parts of the image. */
      imgWin.setMask(maskWin);
      imgWin.maskInverted = false;
      
      P.executeOn(imgWin.mainView, false);

      imgWin.removeMask();

      imgWin.mainView.endProcess();
}

function runCurvesTransformationSaturation(imgWin, maskWin)
{
      addProcessingStep("Curves transformation for saturation on " + imgWin.mainView.id + " using mask " + maskWin.mainView.id);

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

      imgWin.mainView.beginProcess(UndoFlag_NoSwapFile);

      /* Saturate only light parts of the image. */
      imgWin.setMask(maskWin);
      imgWin.maskInverted = false;
      
      P.executeOn(imgWin.mainView, false);

      imgWin.removeMask();

      imgWin.mainView.endProcess();
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
      addProcessingStep("LRGB combination of " + RGB_id + " and luminance image " + L_id + " into " + RGBimgView.id);
      var P = new LRGBCombination;
      P.channels = [ // enabled, id, k
            [false, "", 1.00000],
            [false, "", 1.00000],
            [false, "", 1.00000],
            [true, L_id, 1.00000]
      ];
      P.mL = par.LRGBCombination_lightness.val;
      P.mc = par.LRGBCombination_saturation.val;
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
      if (narrowband && par.leave_some_green.val && !fixing_stars) {
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

function runMultiscaleLinearTransformSharpen(imgWin, maskWin)
{
      addProcessingStep("Sharpening on " + imgWin.mainView.id + " using mask " + maskWin.mainView.id);

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
      
      imgWin.mainView.beginProcess(UndoFlag_NoSwapFile);

      /* Sharpen only light parts of the image. */
      imgWin.setMask(maskWin);
      imgWin.maskInverted = false;

      P.executeOn(imgWin.mainView, false);

      imgWin.removeMask();

      imgWin.mainView.endProcess();
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
            console.noteln(gdd.caption);
            if (!gdd.execute()) {
                  console.writeln("No path for " + names + ', nothing written');
                  return false;
            }
            outputRootDir = gdd.directory;
            if (outputRootDir != "") {
                  outputRootDir = ensurePathEndSlash(outputRootDir);
            }
            console.writeln("ensureDialogFilePath, set outputRootDir ", outputRootDir);
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
      logfname = basename + getOptionalUniqueFilenamePart() + ".log";

      if (!ensureDialogFilePath(basename + ".log")) {
            return;
      }

      var processedPath = combinePath(outputRootDir, AutoProcessedDir);
      processedPath = ensurePathEndSlash(processedPath);

      console.writeln("Write processing steps to " + processedPath + logfname);

      var file = new File();
      file.createForWriting(processedPath + logfname);

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

// Find window and optinally search without a prefix
function findWindowCheckBaseNameIf(id, check_base_name)
{
      var win = findWindow(win_prefix + id);
      if (win == null && check_base_name && win_prefix != "") {
            // Try to find without prefix so we can autocontinue
            // from default run but will have new output
            // file names.
            win = findWindow(id);
      }
      return win;
}

// Find window id and optinally search without a prefix
function findWindowIdCheckBaseNameIf(name, check_base_name)
{
      var id = findWindowId(win_prefix + name);
      if (id == null && check_base_name && win_prefix != "") {
            // Try to find without prefix so we can autocontinue
            // from default run but will have new output
            // file names.
            id = findWindowId(name);
      }
      return id;
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
      RGBcolor_id = findWindowIdCheckBaseNameIf("Integration_RGB", check_base_name);
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

      addProcessingStep("debayerImages, fileNames[0] " + fileNames[0]);
      var P = new Debayer;
      P.cfaPattern = debayerPattern_enums[debayerPattern_values.indexOf(par.debayerPattern.val)];
      P.debayerMethod = Debayer.prototype.VNG;
      P.fbddNoiseReduction = 0;
      P.evaluateNoise = true;
      P.noiseEvaluationAlgorithm = Debayer.prototype.NoiseEvaluation_MRS;
      P.showImages = true;
      P.cfaSourceFilePath = "";
      P.targetItems = filesNamesToEnabledPath(fileNames);
      P.noGUIMessages = true;
      P.inputHints = "raw cfa";
      P.outputHints = "";
      P.outputDirectory = outputRootDir + AutoOutputDir;
      P.outputExtension = ".xisf";
      P.outputPrefix = "";
      P.outputPostfix = "_d";
      P.overwriteExistingFiles = true;
      P.onError = Debayer.prototype.OnError_Continue;
      P.useFileThreads = true;
      P.fileThreadOverload = 1.00;
      P.maxFileReadThreads = 0;
      P.maxFileWriteThreads = 0;
      P.memoryLoadControl = true;
      P.memoryLoadLimit = 0.85;

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
 */
function CreateChannelImages(auto_continue)
{
      addProcessingStep("CreateChannelImages");

      final_win = null;

      /* Check if we have manually done histogram transformation. */
      L_HT_win = findWindowCheckBaseNameIf("L_HT", auto_continue);
      RGB_HT_win = findWindowCheckBaseNameIf("RGB_HT", auto_continue);

      /* Check if we have manual background extracted files. */
      L_BE_win = findWindowCheckBaseNameIf("Integration_L_BE", auto_continue);
      R_BE_win = findWindowCheckBaseNameIf("Integration_R_BE", auto_continue);
      G_BE_win = findWindowCheckBaseNameIf("Integration_G_BE", auto_continue);
      B_BE_win = findWindowCheckBaseNameIf("Integration_B_BE", auto_continue);
      H_BE_win = findWindowCheckBaseNameIf("Integration_H_BE", auto_continue);
      S_BE_win = findWindowCheckBaseNameIf("Integration_S_BE", auto_continue);
      O_BE_win = findWindowCheckBaseNameIf("Integration_O_BE", auto_continue);
      RGB_BE_win = findWindowCheckBaseNameIf("Integration_RGB_BE", auto_continue);

      findProcessedImages(auto_continue);

      if (is_extra_option() || is_narrowband_option()) {
            for (var i = 0; i < final_windows.length; i++) {
                  // remove prefix for function findWindowCheckBaseNameIf
                  console.writeln("final_windows " + i + " " + final_windows[i] + " prefix " + win_prefix);
                  if (win_prefix != "" && final_windows[i].startsWith(win_prefix)) {
                        var win_name = final_windows[i].substring(win_prefix.length);
                  } else {
                        var win_name = final_windows[i];
                  }
                  console.writeln("win_name " + win_name);
                  final_win = findWindowCheckBaseNameIf(win_name, auto_continue);
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
      } else if (RGBcolor_id != null 
                 && H_id == null && O_id == null && L_id == null) { /* RGB (color) integrated image */
            addProcessingStep("RGB (color) integrated image " + RGBcolor_id);
            checkAutoCont(findWindow(RGBcolor_id));
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
                  RGB_win = ImageWindow.windowById(RGBcolor_id);
                  RGB_win_id = RGBcolor_id;
            }
            /* Check if we have manually created mask. */
            mask_win_id = "range_mask";
            range_mask_win = findWindow(mask_win_id);
      } else {
            /* Open dialog files and run SubframeSelector on them
             * to assigns SSWEIGHT.
             */
            var fileNames;
            if (lightFileNames == null) {
                  lightFileNames = openImageFiles("Light");
                  addProcessingStep("Get files from dialog");
            }
            if (lightFileNames == null) {
                  console.writeln("No files to process");
                  return false;
            }

            // We keep track of extensions added to the file names
            // If we need to original file names we can substract
            // added extensions.
            var filename_postfix = '';

            if (outputRootDir == "" || pathIsRelative(outputRootDir)) {
                  /* Get path to current directory. */
                  outputRootDir = parseNewOutputRootDir(lightFileNames[0], outputRootDir);
                  console.writeln("CreateChannelImages, set outputRootDir ", outputRootDir);
            }

            ensureDir(outputRootDir);
            ensureDir(combinePath(outputRootDir, AutoOutputDir));
            ensureDir(combinePath(outputRootDir, AutoProcessedDir));

            // Run image calibration if we have calibration frames
            var calibrateInfo = calibrateEngine();
            lightFileNames = calibrateInfo[0];
            filename_postfix = filename_postfix + calibrateInfo[1];

            if (par.calibrate_only.val) {
                  return(true);
            }

            var filtered_files = getFilterFiles(lightFileNames, pages.LIGHTS, filename_postfix);
            if (filtered_files.allfiles.C.length == 0) {
                  is_color_files = false;
            } else {
                  is_color_files = true;
            }

            fileNames = lightFileNames;

            if (!par.skip_cosmeticcorrection.val) {
                  if (par.fix_column_defects.val || par.fix_row_defects.val) {
                        var ccFileNames = [];
                        var ccInfo = runLinearDefectDetection(fileNames);
                        for (var i = 0; i < ccInfo.length; i++) {
                              addProcessingStep("run CosmeticCorrection for linear defect file group " + i + ", " + ccInfo[i].ccFileNames.length + " files");
                              var cc = runCosmeticCorrection(ccInfo[i].ccFileNames, ccInfo[i].ccDefects, is_color_files);
                              ccFileNames = ccFileNames.concat(cc);
                        }
                        fileNames = ccFileNames;
                  } else {
                        var defects = [];
                        /* Run CosmeticCorrection for each file.
                        * Output is *_cc.xisf files.
                        */
                        fileNames = runCosmeticCorrection(fileNames, defects, is_color_files);
                  }
                  filename_postfix = filename_postfix + '_cc';
            }

            if (is_color_files && par.debayerPattern.val != 'None') {
                  // after cosmetic correction we need to debayer
                  // OSC/RAW images
                  fileNames = debayerImages(fileNames);
                  filename_postfix = filename_postfix + '_b';
            }

            if (!par.skip_subframeselector.val) {
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

            /* Find files for each L, R, G, B, H, O and S channels, or color files.
             */
            findLRGBchannels(alignedFiles, filename_postfix);

            /* ImageIntegration
            */
            if (C_images.images.length == 0) {
                  /* We have LRGB files. */
                  if (!par.monochrome_image.val) {
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
                        L_id = runImageIntegration(L_images, 'L');
                        luminance_id = L_id;
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
                  addProcessingStep("Processing as color files");
                  is_color_files = true;
                  var color_img_id = runImageIntegration(C_images, 'RGB');
                  RGB_win = ImageWindow.windowById(color_img_id);
                  RGB_win.show();
                  RGB_win_id = color_img_id;
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
                  L_win = copyWindow(L_HT_win, win_prefix + "L_win_mask");
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
                  L_win = copyWindow(L_win, win_prefix + "L_win_mask");

                  /* Run HistogramTransform based on autostretch because mask should be non-linear. */
                  runHistogramTransform(L_win, null, false, 'mask');
            }
            /* Create mask.
             */
            mask_win_id = win_prefix + "AutoMask";
            mask_win = newMaskWindow(L_win, mask_win_id);
            windowCloseif(win_prefix + "L_win_mask")
      }
}

/* Create mask for color processing. Mask is needed also in non-linear
 * so we do a separate runHistogramTransform here.
 */
function ColorCreateMask(color_img_id, RBGstretched)
{
      addProcessingStep("ColorCreateMask");

      if (winIsValid(range_mask_win)) {
            /* We already have a mask. */
            addProcessingStep("Use existing mask " + range_mask_win.mainView.id);
            mask_win = range_mask_win;
      } else {
            var color_win;
            color_win = ImageWindow.windowById(color_img_id);
            addProcessingStep("Using image " + color_img_id + " for a mask");
            color_win = copyWindow(color_win, ensure_win_prefix("color_win_mask"));

            if (!RBGstretched) {
                  /* Run HistogramTransform based on autostretch because mask should be non-linear. */
                  runHistogramTransform(color_win, null, true, 'mask');
            }

            /* Create mask.
             */
            mask_win_id = win_prefix + "AutoMask";
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
      var noise_reduction_done = false;

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
                        if (par.use_ABE_on_L_RGB.val && !par.ABE_before_channel_combination.val) {
                              L_ABE_id = runABE(L_win, false);
                        } else {
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

            if (!RBGmapping.combined) {
                  /* Noise reduction for L. */
                  runNoiseReduction(ImageWindow.windowById(L_ABE_id), mask_win);
                  noise_reduction_done = true;
            }

            /* On L image run HistogramTransform based on autostretch
            */
            L_ABE_HT_id = ensure_win_prefix(L_ABE_id + "_HT");
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

      if (!noise_reduction_done) {
            /* Noise reduction for L. */
            runNoiseReduction(L_ABE_HT_win, mask_win);
      }
}

/* Run linear fit in L, R, G and B images based on options set by user.
 */
function LinearFitLRGBchannels()
{
      addProcessingStep("LinearFitLRGBchannels");

      if (luminance_id == null && par.use_linear_fit.val == 'Luminance') {
            // no luminance
            if (narrowband) {
                  addProcessingStep("No Luminance, no linear fit with narrowband");
                  par.use_linear_fit.val = 'No linear fit';
            } else {
                  addProcessingStep("No Luminance, linear fit using R with RGB");
                  par.use_linear_fit.val = 'Red';
            }
      }

      /* Check for LinearFit
       */
      if (par.use_linear_fit.val == 'Red') {
            /* Use R.
             */
            addProcessingStep("Linear fit using R");
            if (luminance_id != null) {
                  runLinearFit(red_id, luminance_id);
            }
            runLinearFit(red_id, green_id);
            runLinearFit(red_id, blue_id);
      } else if (par.use_linear_fit.val == 'Green') {
            /* Use G.
              */
            addProcessingStep("Linear fit using G");
            if (luminance_id != null) {
                  runLinearFit(green_id, luminance_id);
            }
            runLinearFit(green_id, red_id);
            runLinearFit(green_id, blue_id);
      } else if (par.use_linear_fit.val == 'Blue') {
            /* Use B.
              */
            addProcessingStep("Linear fit using B");
            if (luminance_id != null) {
                  runLinearFit(blue_id, luminance_id);
            }
            runLinearFit(blue_id, red_id);
            runLinearFit(blue_id, green_id);
      } else if (par.use_linear_fit.val == 'Luminance' && luminance_id != null) {
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

      if (par.channel_noise_reduction_strength.val > 0 && !narrowband) {
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
                        win_prefix + "Integration_RGB");                 // const IsoString &id=IsoString()

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
      writeProcessingSteps(null, true, win_prefix + "AutoRGBNB");

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
                  ColorCreateMask(RGB_ABE_id, RBGstretched);
            }
            if (narrowband && par.linear_increase_saturation.val > 0) {
                  /* Default 1 means no increase with narrowband. */
                  par.linear_increase_saturation.val--;
            }
            if (par.linear_increase_saturation.val > 0 && !RBGstretched) {
                  /* Add saturation linear RGB
                  */
                  console.writeln("Add saturation to linear RGB, " + par.linear_increase_saturation.val + " steps");
                  for (var i = 0; i < par.linear_increase_saturation.val; i++) {
                        increaseSaturation(ImageWindow.windowById(RGB_ABE_id), mask_win);
                  }
            }
      
            if (!is_color_files) {
                  /* Optional noise reduction for RGB
                   */
                  runNoiseReduction(
                        ImageWindow.windowById(RGB_ABE_id),
                        mask_win);
            }
            if (!RBGstretched) {
                  /* On RGB image run HistogramTransform based on autostretch
                  */
                  RGB_ABE_HT_id = ensure_win_prefix(RGB_ABE_id + "_HT");
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
            runNoiseReduction(
                  ImageWindow.windowById(RGB_ABE_HT_id),
                  mask_win);
            runColorReduceNoise(ImageWindow.windowById(RGB_ABE_HT_id));
      }

      if (narrowband && par.non_linear_increase_saturation.val > 0) {
            /* Default 1 means no increase with narrowband. */
            par.non_linear_increase_saturation.val--;
      }
      if (par.non_linear_increase_saturation.val > 0) {
            /* Add saturation on RGB
            */
            for (var i = 0; i < par.non_linear_increase_saturation.val; i++) {
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
            star_fix_mask_win = findWindow(win_prefix + "star_fix_mask");
      }
      if (star_fix_mask_win == null) {
            star_fix_mask_win = findWindow(win_prefix + "AutoStarFixMask");
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

      windowRenameKeepif(star_fix_mask_win.mainView.id, win_prefix + "AutoStarFixMask", true);
      star_fix_mask_win_id = star_fix_mask_win.mainView.id;

      addProcessingStep("Created star fix mask " + star_fix_mask_win.mainView.id);
}

/* Do a rough fix on magen stars by inverting the image, applying
 * SCNR to remove the now green cast on stars and then inverting back.
 * If we are not removing all green case we use mask ro protect
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

      addProcessingStep("Fix narrowband star color");

      if (use_mask) {
            createStarFixMask(targetWin.mainView);
      }

      invertImage(targetWin.mainView);

      if (use_mask) {
            /* Use mask to change only star colors. */
            addProcessingStep("Using mask " + star_fix_mask_win.mainView.id + " when fixing star colors");
            targetWin.setMask(star_fix_mask_win);
            targetWin.maskInverted = false;
      }      

      runSCNR(targetWin.mainView, true);

      if (use_mask) {
            targetWin.removeMask();
      }

      invertImage(targetWin.mainView);
}

// When starnet is run we do some thins differently
// - We make a copy of the starless image
// - We make a copy of the stars image
// - Operations like HDMT and LHE are run on the starless image
// - Star reduction is done on the stars image
// - In the end starless and stars images are combined together
function extraStarNet(imgWin)
{
      addProcessingStep("Run StarNet on " + imgWin.mainView.id);

      var P = new StarNet;
      P.stride = StarNet.prototype.Stride_128;
      P.mask = true;

      /* Execute StarNet on image.
       */
      imgWin.mainView.beginProcess(UndoFlag_NoSwapFile);

      P.executeOn(imgWin.mainView, false);

      imgWin.mainView.endProcess();

      /* Get star mask.
       */
      console.writeln("extraStarNet star_mask_win_id " + ImageWindow.activeWindow.mainView.id);
      star_mask_win = ImageWindow.activeWindow;
      star_mask_win_id = star_mask_win.mainView.id;

      var FITSkeywords = getTargetFITSKeywordsForPixelmath(imgWin);
      setTargetFITSKeywordsForPixelmath(star_mask_win, FITSkeywords);

      ensureDir(outputRootDir);

      /* Make a copy of the stars image.
       */
      console.writeln("extraStarNet copy " + star_mask_win_id + " to " + imgWin.mainView.id + "_stars");
      var copywin = copyWindow(star_mask_win, ensure_win_prefix(imgWin.mainView.id + "_stars"));
      setFinalImageKeyword(copywin);
      saveProcessedWindow(outputRootDir, copywin.mainView.id);
      addProcessingStep("StarNet stars image " + copywin.mainView.id);

      /* Make a copy of the starless image.
       */
      console.writeln("extraStarNet copy " + imgWin.mainView.id + " to " + imgWin.mainView.id + "_starless");
      var copywin = copyWindow(imgWin, ensure_win_prefix(imgWin.mainView.id + "_starless"));
      setFinalImageKeyword(copywin);
      saveProcessedWindow(outputRootDir, copywin.mainView.id);
      addProcessingStep("StarNet starless image " + copywin.mainView.id);
}

function extraDarkerBackground(imgWin, maskWin)
{
      addProcessingStep("Darker background on " + imgWin.mainView.id + " using mask " + maskWin.mainView.id);

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

      imgWin.mainView.beginProcess(UndoFlag_NoSwapFile);

      /* Darken only dark parts (background) of the image. */
      imgWin.setMask(maskWin);
      imgWin.maskInverted = true;
      
      P.executeOn(imgWin.mainView, false);

      imgWin.removeMask();

      imgWin.mainView.endProcess();
}

function extraHDRMultiscaleTansform(imgWin, maskWin)
{
      addProcessingStep("HDRMultiscaleTransform on " + imgWin.mainView.id + " using mask " + maskWin.mainView.id);

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
      
      imgWin.mainView.beginProcess(UndoFlag_NoSwapFile);

      /* Transform only light parts of the image. */
      imgWin.setMask(maskWin);
      imgWin.maskInverted = false;
      
      P.executeOn(imgWin.mainView, false);

      imgWin.removeMask();

      imgWin.mainView.endProcess();
}

function extraLocalHistogramEqualization(imgWin, maskWin)
{
      addProcessingStep("LocalHistogramEqualization on " + imgWin.mainView.id + " using mask " + maskWin.mainView.id);

      var P = new LocalHistogramEqualization;
      P.radius = 110;
      P.histogramBins = LocalHistogramEqualization.prototype.Bit8;
      P.slopeLimit = 1.3;
      P.amount = 1.000;
      P.circularKernel = true;
      
      imgWin.mainView.beginProcess(UndoFlag_NoSwapFile);

      /* Transform only light parts of the image. */
      imgWin.setMask(maskWin);
      imgWin.maskInverted = false;
      
      P.executeOn(imgWin.mainView, false);

      imgWin.removeMask();

      imgWin.mainView.endProcess();
}

function createStarMask(imgWin)
{
      star_mask_win = maskIsCompatible(imgWin, star_mask_win);
      if (star_mask_win == null) {
            star_mask_win = maskIsCompatible(imgWin, findWindow(win_prefix + "star_mask"));
      }
      if (star_mask_win == null) {
            star_mask_win = maskIsCompatible(imgWin, findWindow(win_prefix + "AutoStarMask"));
      }
      if (star_mask_win != null) {
            // Use already created start mask
            console.writeln("Use existing star mask " + star_mask_win.mainView.id);
            star_mask_win_id = star_mask_win.mainView.id;
            return;
      }

      closeOneWindow("AutoStarMask");

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

      imgWin.mainView.beginProcess(UndoFlag_NoSwapFile);
      P.executeOn(imgWin.mainView, false);
      imgWin.mainView.endProcess();

      star_mask_win = ImageWindow.activeWindow;

      windowRenameKeepif(star_mask_win.mainView.id, "AutoStarMask", true);

      addProcessingStep("Created star mask " + star_mask_win.mainView.id);
      star_mask_win_id = star_mask_win.mainView.id;
}

function extraSmallerStars(imgWin)
{
      var targetWin = imgWin;

      createStarMask(imgWin);

      if (par.extra_StarNet.val) {
            addProcessingStep("Smaller stars on " + star_mask_win_id + 
                        " using " + par.extra_smaller_stars_iterations.val + " iterations");
            targetWin = star_mask_win;    
      } else {
            addProcessingStep("Smaller stars on " + imgWin.mainView.id + " using mask " + star_mask_win.mainView.id + 
                        " and " + par.extra_smaller_stars_iterations.val + " iterations");
      }

      if (par.extra_smaller_stars_iterations.val == 0) {
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
            P.numberOfIterations = par.extra_smaller_stars_iterations.val;
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
      
      targetWin.mainView.beginProcess(UndoFlag_NoSwapFile);

      if (!par.extra_StarNet.val) {
            /* Transform only light parts of the image. */
            targetWin.setMask(star_mask_win);
            targetWin.maskInverted = false;
      }
      
      P.executeOn(targetWin.mainView, false);

      if (!par.extra_StarNet.val) {
            targetWin.removeMask();
      }

      targetWin.mainView.endProcess();
}

function extraContrast(imgWin)
{
      addProcessingStep("Increase contrast on " + imgWin.mainView.id);

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

      imgWin.mainView.beginProcess(UndoFlag_NoSwapFile);

      P.executeOn(imgWin.mainView, false);

      imgWin.mainView.endProcess();
}

function extraSTF(win)
{
      runHistogramTransform(win, null, win.mainView.image.isColor, 'mask');
}

function extraNoiseReduction(win, mask_win)
{
      if (par.extra_noise_reduction_strength.val == 0) {
            return;
      }
      addProcessingStep("Extra noise reduction on " + win.mainView.id);

      runMultiscaleLinearTransformReduceNoise(
            win, 
            mask_win, 
            par.extra_noise_reduction_strength.val);
}

function extraABE(extraWin)
{
      runABE(extraWin, true);
}

function is_non_starnet_option()
{
      return par.extra_ABE.val || 
             par.extra_darker_background.val || 
             par.extra_HDRMLT.val || 
             par.extra_LHE.val || 
             par.extra_contrast.val ||
             par.extra_STF.val ||
             par.extra_noise_reduction.val ||
             par.extra_smaller_stars.val;
}

function is_extra_option()
{
      return par.extra_StarNet.val || 
             is_non_starnet_option();
}

function is_narrowband_option()
{
      return par.fix_narrowband_star_color.val ||
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
function AutoIntegrateNarrowbandPaletteBatch(auto_continue)
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
                  addProcessingStep("Narrowband palette " + narrowBandPalettes[i].name + " batch using " + par.custom_R_mapping.val + ", " + par.custom_G_mapping.val + ", " + par.custom_B_mapping.val);

                  var succ = AutoIntegrateEngine(auto_continue);
                  if (!succ) {
                        addProcessingStep("Narrowband palette batch could not process all palettes");
                  }
                  // rename and save the final image
                  narrowbandPaletteBatchFinalImage(narrowBandPalettes[i].name, win_prefix + "AutoRGB", false);
                  if (findWindow(win_prefix + "AutoRGB_extra") != null) {
                        narrowbandPaletteBatchFinalImage(narrowBandPalettes[i].name, win_prefix + "AutoRGB_extra", true);
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
      var extra_id = id;
      var need_L_mask = par.extra_darker_background.val || 
                        par.extra_HDRMLT.val || 
                        par.extra_LHE.val ||
                        par.extra_noise_reduction.val;

      var extraWin = ImageWindow.windowById(id);

      checkWinFilePath(extraWin);
      ensureDir(outputRootDir);
      ensureDir(combinePath(outputRootDir, AutoOutputDir));
      ensureDir(combinePath(outputRootDir, AutoProcessedDir));

      if (!apply_directly) {
            extra_id = ensure_win_prefix(id + "_extra");
            extraWin = copyWindow(extraWin, extra_id);
      }

      if (narrowband) {
            if (par.run_hue_shift.val) {
                  narrowbandHueShift(extraWin.mainView);
            }
            if (par.run_narrowband_SCNR.val || par.leave_some_green.val) {
                  runSCNR(extraWin.mainView, false);
            }
            if (par.fix_narrowband_star_color.val) {
                  fixNarrowbandStarColor(extraWin);
            }
      }
      if (par.extra_StarNet.val) {
            extraStarNet(extraWin);
      }
      if (par.extra_ABE.val) {
            extraABE(extraWin);
      }
      if (need_L_mask) {
            // Try find mask window
            // If we need to create a mask di it after we
            // have removed the stars
            mask_win = maskIsCompatible(extraWin, mask_win);
            if (mask_win == null) {
                  mask_win = maskIsCompatible(extraWin, findWindow(win_prefix + "range_mask"));
            }
            if (mask_win == null) {
                  mask_win = maskIsCompatible(extraWin, findWindow(win_prefix +"AutoMask"));
            }
            if (mask_win == null) {
                  mask_win_id = win_prefix + "AutoMask";
                  closeOneWindow(mask_win_id);
                  mask_win = newMaskWindow(extraWin, mask_win_id);
            }
            console.writeln("Use mask " + mask_win.mainView.id);
      }
      if (par.extra_darker_background.val) {
            extraDarkerBackground(extraWin, mask_win);
      }
      if (par.extra_HDRMLT.val) {
            extraHDRMultiscaleTansform(extraWin, mask_win);
      }
      if (par.extra_LHE.val) {
            extraLocalHistogramEqualization(extraWin, mask_win);
      }
      if (par.extra_contrast.val) {
            extraContrast(extraWin);
      }
      if (par.extra_STF.val) {
            extraSTF(extraWin);
      }
      if (par.extra_noise_reduction.val) {
            extraNoiseReduction(extraWin, mask_win);
      }
      if (par.extra_smaller_stars.val) {
            extraSmallerStars(extraWin);
      }
      if (par.extra_StarNet.val) {
            /* Restore stars by combining starless image and stars. */
            addProcessingStep("Restore stars by combining " + extraWin.mainView.id + " and " + star_mask_win_id);
            runPixelMathSingleMappingEx(
                  extraWin.mainView.id, 
                  extraWin.mainView.id + " + " + star_mask_win_id,
                  false);
            // star_mask_win_id was a temp window with maybe smaller stars
            closeOneWindow(star_mask_win_id);
      }
      if (apply_directly) {
            setFinalImageKeyword(ImageWindow.windowById(extraWin.mainView.id));
      } else {
            setFinalImageKeyword(ImageWindow.windowById(extra_id));
            saveProcessedWindow(outputRootDir, extra_id); /* Extra window */
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

      windowIconizeAndKeywordif(mask_win_id);             /* AutoMask or range_mask window */
      windowIconizeAndKeywordif(star_mask_win_id);        /* AutoStarMask or star_mask window */
      windowIconizeAndKeywordif(star_fix_mask_win_id);    /* AutoStarFixMask or star_fix_mask window */

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
      L_stf = null;
      linear_fit_done = false;
      narrowband = autocontinue_narrowband;
      is_luminance_images = false;

      console.noteln("--------------------------------------");
      var processingOptions = getProcessingOptions();
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

      if (par.calibrate_only.val) {
            preprocessed_images = start_images.CALIBRATE_ONLY;
      } else if (preprocessed_images == start_images.FINAL) {
            // We have a final image, just run run possible extra processing steps
            LRGB_ABE_HT_id = final_win.mainView.id;
      } else if (!par.integrate_only.val && preprocessed_images != start_images.FINAL) {
            var processRGB = !is_color_files && 
                             !par.monochrome_image.val &&
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
                        if (par.ABE_before_channel_combination.val) {
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

            if (par.monochrome_image.val) {
                  console.writeln("par.monochrome_image.val:rename windows")
                  LRGB_ABE_HT_id = windowRename(L_ABE_HT_win.mainView.id, win_prefix + "AutoMono");

            } else if (!par.channelcombination_only.val) {

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

                  if (!narrowband && !par.use_RGBNB_Mapping.val) {
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
                        if (par.RRGB_image.val) {
                              LRGB_ABE_HT_id = windowRename(LRGB_ABE_HT_id, win_prefix + "AutoRRGB");
                        } else {
                              LRGB_ABE_HT_id = windowRename(LRGB_ABE_HT_id, win_prefix + "AutoLRGB");
                        }
                  } else {
                        /* Color or narrowband or RGB files */
                        LRGB_ABE_HT_id = windowRename(LRGB_ABE_HT_id, win_prefix + "AutoRGB");
                  }
            }
      }

      if (is_extra_option() || is_narrowband_option()) {
            extraProcessing(LRGB_ABE_HT_id, false);
      }

      ensureDialogFilePath("processed files");

      if (preprocessed_images < start_images.L_R_G_B_BE) {
            // We have generated integrated images, save them
            saveProcessedWindow(outputRootDir, L_id);                    /* Integration_L */
            saveProcessedWindow(outputRootDir, R_id);                    /* Integration_R */
            saveProcessedWindow(outputRootDir, G_id);                    /* Integration_G */
            saveProcessedWindow(outputRootDir, B_id);                    /* Integration_B */
            saveProcessedWindow(outputRootDir, H_id);                    /* Integration_H */
            saveProcessedWindow(outputRootDir, S_id);                    /* Integraiton_S */
            saveProcessedWindow(outputRootDir, O_id);                    /* Integration_O */
      }
      if (preprocessed_images >= start_images.L_R_G_B_BE) {
            // We have generated RGB image, save it
            saveProcessedWindow(outputRootDir, RGB_win_id);              /* Integration_RGB */
      }
      if (preprocessed_images < start_images.FINAL) {
            // We have generated final image, save it
            saveProcessedWindow(outputRootDir, LRGB_ABE_HT_id);          /* Final image. */
      }

      /* All done, do cleanup on windows on screen 
       */
      addProcessingStep("Processing completed");

      closeTempWindows();
      if (!par.calibrate_only.val) {
            closeAllWindowsFromArray(calibrate_windows);
      }

      windowIconizeAndKeywordif(L_id);                    /* Integration_L */
      windowIconizeAndKeywordif(R_id);                    /* Integration_R */
      windowIconizeAndKeywordif(G_id);                    /* Integraion_G */
      windowIconizeAndKeywordif(B_id);                    /* Integration_B */
      windowIconizeAndKeywordif(H_id);                    /* Integration_H */
      windowIconizeAndKeywordif(S_id);                    /* Integraion_S */
      windowIconizeAndKeywordif(O_id);                    /* Integration_O */
      windowIconizeAndKeywordif(RGB_win_id);              /* Integration_RGB */

      windowIconizeAndKeywordif(L_ABE_id);
      windowIconizeAndKeywordif(R_ABE_id);
      windowIconizeAndKeywordif(G_ABE_id);
      windowIconizeAndKeywordif(B_ABE_id);
      windowIconizeAndKeywordif(RGB_ABE_id);

      windowIconizeAndKeywordif(RGB_ABE_HT_id);
      windowIconizeAndKeywordif(L_ABE_HT_id);
      windowIconizeAndKeywordif(LRGB_Combined);           /* LRGB Combined image */
      windowIconizeAndKeywordif(mask_win_id);             /* AutoMask or range_mask window */
      windowIconizeAndKeywordif(star_mask_win_id);        /* AutoStarMask or star_mask window */
      windowIconizeAndKeywordif(star_fix_mask_win_id);    /* AutoStarFixMask or star_fix_mask window */

      if (par.batch_mode.val > 0) {
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
            LRGB_ABE_HT_id = windowRenameKeepif(LRGB_ABE_HT_id, fname, true);
      }

      if (LRGB_ABE_HT_id != null) {
            console.writeln("Set final image keyword");
            // set final image keyword so it easy to save all file e.g. as 16 bit TIFF
            setFinalImageKeyword(ImageWindow.windowById(LRGB_ABE_HT_id));
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
                  lightFileNames = openImageFiles("Light");
                  if (lightFileNames != null) {
                        that.dialog.treeBox[pages.LIGHTS].canUpdate = false;
                        for (var i = 0; i < lightFileNames.length; i++) {
                              var node = new TreeBoxNode(that.dialog.treeBox[pages.LIGHTS]);
                              node.setText(0, lightFileNames[i]);
                        }
                        that.dialog.treeBox[pages.LIGHTS].canUpdate = true;
                  }
            }
            if (lightFileNames != null) {
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
                  if (par.batch_mode.val) {
                        lightFileNames = null;
                        console.writeln("AutoRun in batch mode");
                        closeAllWindows(par.keep_integrated_images.val);
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


function addArrayToComboBox(cb, arr)
{
      for (var i = 0; i < arr.length; i++) {
            cb.addItem( arr[i] );
      }
}

function ai_RGBNB_Mapping_ComboBox(parent, channel, defval, setValueFunc, tip)
{
      var cb = new ComboBox( parent );
      cb.toolTip = tip;
      addArrayToComboBox(cb, RGBNB_mapping_values);
      cb.currentItem = RGBNB_mapping_values.indexOf(defval);
      cb.onItemSelected = function( itemIndex )
      {
            setValueFunc(RGBNB_mapping_values[itemIndex]);
      };
      return cb;
}

function filesOptionsSizer(parent, name, toolTip)
{
      var label = aiSectionLabel(parent, name);
      label.toolTip = toolTip;
      var labelempty = new Label( parent );
      labelempty.text = " ";

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
                  var show = par.lights_add_manually.val || !par.autodetect_filter.val;
                  break;
            case pages.FLATS:
                  var show = par.flats_add_manually.val || !par.autodetect_filter.val;
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
      var sizer = filesOptionsSizer(parent, "Add light images", parent.filesToolTip[0]);

      var label = new Label( parent );
      label.text = "Debayer";
      label.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      label.toolTip = "<p>Select bayer pattern for debayering color/OSC/RAW/DSLR files.</p>" +
                      "<p>Auto option tries to recognize debayer pattern from image metadata.</p>" +
                      "<p>If images are already debayered choose none which does not do debayering.</p>";

      var combobox = new ComboBox( parent );
      combobox.toolTip = label.toolTip;
      addArrayToComboBox(combobox, debayerPattern_values);
      combobox.currentItem = debayerPattern_values.indexOf(par.debayerPattern.val);
      combobox.onItemSelected = function( itemIndex )
      {
            par.debayerPattern.val = debayerPattern_values[itemIndex];
      }

      var checkbox = newCheckBox(parent, "Add manually", par.lights_add_manually.val, 
            "<p>Add light files manually by selecting files for each filter.</p>" );
      checkbox.onClick = function(checked) { 
            par.lights_add_manually.val = checked; 
            showOrHideFilterSectionBar(pages.LIGHTS);
      }

      sizer.add(label);
      sizer.add(combobox);
      sizer.add(checkbox);
      sizer.addStretch();

      return sizer;
}

function biasOptions(parent)
{
      var sizer = filesOptionsSizer(parent, "Add bias images", parent.filesToolTip[1]);

      var checkbox = newCheckBox(parent, "SuperBias", par.create_superbias.val, 
            "<p>Create SuperBias from bias files.</p>" );
      checkbox.onClick = function(checked) { 
            par.create_superbias.val = checked; 
      }

      sizer.add(checkbox);
      sizer.addStretch();

      return sizer;
}

function darksOptions(parent)
{
      var sizer = filesOptionsSizer(parent, "Add dark images", parent.filesToolTip[2]);

      var checkbox = newCheckBox(parent, "Pre-calibrate", par.pre_calibrate_darks.val, 
            "<p>If checked darks are pre-calibrated with bias and not during ImageCalibration. " + 
            "Normally this is not recommened and it is better to calibrate darks during " + 
            "ImageCalibration.</p>" );
      checkbox.onClick = function(checked) { 
            par.pre_calibrate_darks.val = checked; 
      }
      var checkbox2 = newCheckBox(parent, "Optimize", par.optimize_darks.val, 
            "<p>If checked darks are optimized when calibrating lights." + 
            "</p><p>" +
            "Normally using optimize flag should not cause any problems. " +
            "With cameras without temperature control it can greatly improve the results. " +
            'With cameras that have "amplifier glow" dark optimization may give worse results. ' +
            "</p><p>" +
            "When Optimize is not checked bias frames are ignored and dark and flat file optimize " + 
            "and calibrate flags are disabled in light file calibration. " +
            "</p>" );
      checkbox2.onClick = function(checked) { 
            par.optimize_darks.val = checked; 
      }

      sizer.add(checkbox);
      sizer.add(checkbox2);
      sizer.addStretch();

      return sizer;
}

function flatsOptions(parent)
{
      var sizer = filesOptionsSizer(parent, "Add flat images", parent.filesToolTip[3]);

      var checkboxStars = newCheckBox(parent, "Stars in flats", par.stars_in_flats.val, 
            "<p>If you have stars in your flats then checking this option will lower percentile " + 
            "clip values and should help remove the stars.</p>" );
      checkboxStars.onClick = function(checked) { 
            par.stars_in_flats.val = checked; 
      }
      var checkboxDarks = newCheckBox(parent, "Do not use darks", par.no_darks_on_flat_calibrate.val, 
            "<p>For some sensors darks should not be used to calibrate flats.  " + 
            "An example of such sensor is most CMOS sensors.</p>"  +
            "<p>If flat darks are selected then darks are not used " + 
            "to calibrate flats.</p>");
      checkboxDarks.onClick = function(checked) { 
            par.no_darks_on_flat_calibrate.val = checked; 
      }
      var checkboxManual = newCheckBox(parent, "Add manually", par.flats_add_manually.val, 
            "<p>Add flat files manually by selecting files for each filter.</p>" );
      checkboxManual.onClick = function(checked) {
            par.flats_add_manually.val = checked;
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
      var sizer = filesOptionsSizer(parent, "Add flat dark images", parent.filesToolTip[4]);

      return sizer;
}

function addOutputDir(parent)
{
      var lbl = new Label( parent );
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
      var edt = new Edit( parent );
      edt.text = outputRootDir;
      edt.toolTip = lbl.toolTip;
      edt.onEditCompleted = function() {
            outputRootDir = ensurePathEndSlash(edt.text.trim());
            console.writeln("addOutputDir, set outputRootDir ", outputRootDir);
      };

      var dirbutton = new ToolButton( parent );
      dirbutton.icon = parent.scaledResource( ":/icons/select-file.png" );
      dirbutton.toolTip = "<p>Select output root directory.</p>";
      dirbutton.onClick = function() {
            var gdd = new GetDirectoryDialog;
            gdd.initialPath = outputRootDir;
            gdd.caption = "Select Output Directory";
            if (gdd.execute()) {
                  outputRootDir = ensurePathEndSlash(gdd.directory);
                  console.writeln("addOutputDir, set outputRootDir ", outputRootDir);
                  edt.text = outputRootDir;
            }
      };
      
      var outputdir_Sizer = new HorizontalSizer;
      outputdir_Sizer.spacing = 4;
      outputdir_Sizer.add( lbl );
      outputdir_Sizer.add( edt );
      outputdir_Sizer.add( dirbutton );

      return outputdir_Sizer;
}

function addWinPrefix(parent)
{
      var lbl = new Label( parent );
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
      var edt = new Edit( parent );
      edt.text = win_prefix;
      edt.toolTip = lbl.toolTip;
      edt.onEditCompleted = function() {
            win_prefix = edt.text.trim();
            if (win_prefix != last_win_prefix) {
                  win_prefix = win_prefix.replace(/[^A-Za-z0-9]/gi,'_');
                  win_prefix = win_prefix.replace(/_+$/,'');
                  if (win_prefix.match(/^\d/)) {
                        // if user tries to start prefix with a digit, prepend an underscore
                        win_prefix = "_" + win_prefix;
                  }
                  if (win_prefix != "") {
                        win_prefix = win_prefix + "_";
                  }
                  fixAllWindowArrays(win_prefix);
                  last_win_prefix = win_prefix;
                  edt.text = win_prefix;

            }

            console.writeln("addWinPrefix, set winPrefix ", win_prefix);
      };

      // Add help button to show known prefixes. Maybe this should be in
      // label and edit box toolTips.
      windowPrefixHelpTips = new ToolButton( parent );
      windowPrefixHelpTips.icon = parent.scaledResource( ":/icons/help.png" );
      windowPrefixHelpTips.setScaledFixedSize( 20, 20 );
      windowPrefixHelpTips.toolTip = "Current Window Prefixes:";

      var winprefix_Sizer = new HorizontalSizer;
      winprefix_Sizer.spacing = 4;
      winprefix_Sizer.add( lbl );
      winprefix_Sizer.add( edt );
      winprefix_Sizer.add( windowPrefixHelpTips );

      return winprefix_Sizer;
}


function addFilesToFileList(pageIndex, imageFileNames)
{
      var allFileNames = null;
      switch (pageIndex) {
            case pages.LIGHTS:
                  allFileNames = lightFiles(imageFileNames);
                  break;
            case pages.BIAS:
                  allFileNames = biasFiles(imageFileNames);
                  break;
            case pages.DARKS:
                  allFileNames = darkFiles(imageFileNames);
                  break;
            case pages.FLATS:
                  allFileNames = flatFiles(imageFileNames);
                  break;
            case pages.FLAT_DARKS:
                  allFileNames = flatdarkFiles(imageFileNames);
                  break;
            default:
                  throwFatalError("addFilesToFileList bad pageIndex " + pageIndex);
      }
      return allFileNames;
}

function addFilteredFilesToTreeBox(parent, pageIndex, newImageFileNames)
{
      var imageFileNames = addFilesToFileList(pageIndex, newImageFileNames);

      var filteredFiles = getFilterFiles(imageFileNames, pageIndex, '');
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

      files_TreeBox.canUpdate = false;

      console.writeln("addFilteredFilesToTreeBox " + filteredFiles.allfilesarr.length + " files");

      for (var i = 0; i < filteredFiles.allfilesarr.length; i++) {

            var filterFiles = filteredFiles.allfilesarr[i][0];
            var filterName = filteredFiles.allfilesarr[i][1];

            if (filterFiles.length > 0) {
                  console.writeln("addFilteredFilesToTreeBox filterName " + filterName + ", " + filterFiles.length + " files");

                  var filternode = new TreeBoxNode(rootnode);
                  filternode.expanded = true;
                  filternode.setText( 0, filterName +  ' (' + filterFiles[0].filter + ') ' + filterFiles.length + ' files');
                  filternode.nodeData_type = "FrameGroup";
            
                  for (var j = 0; j < filterFiles.length; j++) {
                        var node = new TreeBoxNode(filternode);
                        var nodefile = filterFiles[j].name;
                        node.setText(0, nodefile);
                  }
            }
      }
      files_TreeBox.canUpdate = true;
}

function addUnfilteredFilesToTreeBox(parent, pageIndex, newImageFileNames)
{
      var files_TreeBox = parent.treeBox[pageIndex];
      files_TreeBox.clear();

      var imageFileNames = addFilesToFileList(pageIndex, newImageFileNames);

      files_TreeBox.canUpdate = false;
      for (var i = 0; i < imageFileNames.length; i++) {
            var node = new TreeBoxNode(files_TreeBox);
            node.setText(0, imageFileNames[i]);
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

function addOneFilesButton(parent, filetype, pageIndex, toolTip)
{
      var filesAdd_Button = new PushButton( parent );
      filesAdd_Button.text = "Add " + filetype;
      filesAdd_Button.icon = parent.scaledResource( ":/icons/add.png" );
      filesAdd_Button.toolTip = toolTip;
      filesAdd_Button.onClick = function()
      {
            var imageFileNames = openImageFiles(filetype);
            if (imageFileNames != null) {
                  if (pageIndex == pages.LIGHTS && par.autodetect_imagetyp.val) {
                        var imagetypes = getImagetypFiles(imageFileNames);
                        for (var i = 0; i < pages.END; i++) {
                              if (imagetypes[i].length > 0) {
                                    addFilesToTreeBox(parent, i, imagetypes[i]);
                              }
                        }
                  } else {
                        addFilesToTreeBox(parent, pageIndex, imageFileNames);
                  }
                  updateInfoLabel();
                  parent.tabBox.currentPageIndex = pageIndex;
            }
      };
      return filesAdd_Button;
}

function addFilesButtons(parent)
{
      var addLightsButton = addOneFilesButton(parent, "Lights", pages.LIGHTS, parent.filesToolTip[pages.LIGHTS]);
      var addBiasButton = addOneFilesButton(parent, "Bias", pages.BIAS, parent.filesToolTip[pages.BIAS]);
      var addDarksButton = addOneFilesButton(parent, "Darks", pages.DARKS, parent.filesToolTip[pages.DARKS]);
      var addFlatsButton = addOneFilesButton(parent, "Flats", pages.FLATS, parent.filesToolTip[pages.FLATS]);
      var addFlatDarksButton = addOneFilesButton(parent, "Flat Darks", pages.FLAT_DARKS, parent.filesToolTip[pages.FLAT_DARKS]);

      /* Clear files button. */
      var filesClear_Button = new PushButton( parent );
      filesClear_Button.text = "Clear";
      filesClear_Button.icon = parent.scaledResource( ":/icons/clear.png" );
      filesClear_Button.toolTip = "<p>Clear the list of input images in the current page.</p>";
      filesClear_Button.onClick = function()
      {
            var pageIndex = parent.tabBox.currentPageIndex;
            parent.treeBox[pageIndex].clear();
            switch (pageIndex) {
                  case pages.LIGHTS:
                        lightFiles(null);
                        break;
                  case pages.BIAS:
                        biasFiles(null);
                        break;
                  case pages.DARKS:
                        darkFiles(null);
                        break;
                  case pages.FLATS:
                        flatFiles(null);
                        break;
                  case pages.FLAT_DARKS:
                        flatdarkFiles(null);
                        break;
            }
            updateInfoLabel();
      };

      var winprefix_sizer = addWinPrefix(parent);
      var outputdir_sizer = addOutputDir(parent);


      var filesButtons_Sizer = new HorizontalSizer;
      filesButtons_Sizer.spacing = 4;
      filesButtons_Sizer.add( addLightsButton );
      filesButtons_Sizer.add( addBiasButton );
      filesButtons_Sizer.add( addDarksButton );
      filesButtons_Sizer.add( addFlatsButton );
      filesButtons_Sizer.add( addFlatDarksButton );
      filesButtons_Sizer.add( filesClear_Button );
      filesButtons_Sizer.addStretch();
      filesButtons_Sizer.add( winprefix_sizer );
      filesButtons_Sizer.add( outputdir_sizer );
      return filesButtons_Sizer;
}

function addOneFileFilterButton(parent, filetype, pageIndex)
{
      var filesAdd_Button = new PushButton( parent );
      filesAdd_Button.text = filetype;
      filesAdd_Button.icon = parent.scaledResource( ":/icons/add.png" );
      if (filetype == 'C') {
            filesAdd_Button.toolTip = "Add color/OSC/DSLR files";
      } else {
            filesAdd_Button.toolTip = "Add " + filetype + " files";
      }
      filesAdd_Button.onClick = function() {
            var imageFileNames = openImageFiles(filetype);
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
                              throwFatalError("addOneFileFilterButton bad pageIndex " + pageIndex);
                  }
                  console.writeln("addOneFileFilterButton add " + filetype + " files");
                  for (var i = 0; i < imageFileNames.length; i++) {
                        addFilterSetFile(filterSet, imageFileNames[i], filetype);
                  }
                  addFilesToTreeBox(parent, pageIndex, imageFileNames);
                  updateInfoLabel();
            }
      };
      return filesAdd_Button;
}

function addFileFilterButtons(parent, pageIndex)
{
      var buttonsControl = new Control(parent);
      buttonsControl.sizer = new HorizontalSizer;
      buttonsControl.sizer.add(addOneFileFilterButton(parent, 'L', pageIndex));
      buttonsControl.sizer.add(addOneFileFilterButton(parent, 'R', pageIndex));
      buttonsControl.sizer.add(addOneFileFilterButton(parent, 'G', pageIndex));
      buttonsControl.sizer.add(addOneFileFilterButton(parent, 'B', pageIndex));
      buttonsControl.sizer.add(addOneFileFilterButton(parent, 'H', pageIndex));
      buttonsControl.sizer.add(addOneFileFilterButton(parent, 'S', pageIndex));
      buttonsControl.sizer.add(addOneFileFilterButton(parent, 'O', pageIndex));
      buttonsControl.sizer.add(addOneFileFilterButton(parent, 'C', pageIndex));
      buttonsControl.visible = false;
      return buttonsControl;
}

function addFileFilterButtonSectionBar(parent, pageIndex)
{
      var control = addFileFilterButtons(parent, pageIndex);

      var sb = new SectionBar(parent, "Add filter files manually");
      sb.setSection(control);
      sb.hide();
      sb.toolTip = "Select manually files for each filter. Useful if filters are not recognized automatically.";
      sb.onToggleSection = function(bar, beginToggle){
            parent.dialog.adjustToContents();
      };

      filterSectionbars[pageIndex] = sb;
      filterSectionbarcontrols[pageIndex] = control;

      var gb = new Control( parent );
      gb.sizer = new VerticalSizer;
      gb.sizer.add( sb );
      gb.sizer.add( control );

      return gb;
}

function filesTreeBox(parent, optionsSizer, pageIndex)
{
      /* Tree box to show files. */
      var files_TreeBox = new TreeBox( parent );
      files_TreeBox.multipleSelection = true;
      files_TreeBox.rootDecoration = false;
      files_TreeBox.alternateRowColor = true;
      files_TreeBox.setScaledMinSize( 300, 100 );
      files_TreeBox.numberOfColumns = 1;
      files_TreeBox.headerVisible = false;

      parent.treeBox[pageIndex] = files_TreeBox;

      if (pageIndex == pages.LIGHTS || pageIndex == pages.FLATS) {
            var filesControl = new Control(parent);
            filesControl.sizer = new VerticalSizer;
            filesControl.sizer.add(files_TreeBox);
            filesControl.sizer.add(addFileFilterButtonSectionBar(parent, pageIndex));
      } else {
            var filesControl = files_TreeBox;
      }

      var files_GroupBox = new GroupBox( parent );
      //files_GroupBox.title = "Images";
      files_GroupBox.sizer = new HorizontalSizer;
      files_GroupBox.sizer.margin = 6;
      files_GroupBox.sizer.spacing = 4;
      files_GroupBox.sizer.add( filesControl, parent.textEditWidth );
      files_GroupBox.sizer.add( optionsSizer );

      return files_GroupBox;
}

function appendInfoTxt(txt, fileNames, type)
{
      if (fileNames == null || fileNames.length == 0) {
            return txt;
      }
      var newtxt = fileNames.length + " " + type + " files";
      if (txt == "") {
            return newtxt;
      } else {
            return txt + ", " + newtxt;
      }
}

function updateInfoLabel()
{
      var txt = "";
      txt = appendInfoTxt(txt, lightFileNames, "light");
      txt = appendInfoTxt(txt, biasFileNames, "bias");
      txt = appendInfoTxt(txt, darkFileNames, "dark");
      txt = appendInfoTxt(txt, flatFileNames, "flat");
      txt = appendInfoTxt(txt, flatdarkFileNames, "flat dark");

      console.writeln(txt);

      infoLabel.text = txt;
}

function lightFiles(fnameList)
{
      if (fnameList == null) {
            // reset
            lightFileNames = null;
            lightFilterSet = null;
      } else {
            // add file
            if (lightFileNames == null) {
                  lightFileNames = [];
            }
            lightFileNames = lightFileNames.concat(fnameList);
      }
      return lightFileNames;
}

function darkFiles(fnameList)
{
      if (fnameList == null) {
            // reset
            darkFileNames = null;
      } else {
            // add file
            if (darkFileNames == null) {
                  darkFileNames = [];
            }
            darkFileNames = darkFileNames.concat(fnameList);
      }
      return darkFileNames;
}

function biasFiles(fnameList)
{
      if (fnameList == null) {
            // reset
            biasFileNames = null;
      } else {
            // add file
            if (biasFileNames == null) {
                  biasFileNames = [];
            }
            biasFileNames = biasFileNames.concat(fnameList);
      }
      return biasFileNames;
}

function flatFiles(fnameList)
{
      if (fnameList == null) {
            // reset
            flatFileNames = null;
            flatFilterSet = null;
      } else {
            // add file
            if (flatFileNames == null) {
                  flatFileNames = [];
            }
            flatFileNames = flatFileNames.concat(fnameList);
      }
      return flatFileNames;
}

function flatdarkFiles(fnameList)
{
      if (fnameList == null) {
            // reset
            flatdarkFileNames = null;
      } else {
            // add file
            if (flatdarkFileNames == null) {
                  flatdarkFileNames = [];
            }
            flatdarkFileNames = flatdarkFileNames.concat(fnameList);
      }
      return flatdarkFileNames;
}

function mapBadChars(str)
{
      str = str.replace(/ /g,"_");
      str = str.replace(/-/g,"_");
      str = str.replace(/,/g,"_");
      return str;
}

function exportParameters() 
{
      console.writeln("exportParameters");
      for (let x in par) {
            var param = par[x];
            if (param.val != param.def) {
                  var name = mapBadChars(param.name);
                  console.writeln(name + "=" + param.val);
                  Parameters.set(name, param.val);
            }
      }
}

function importParameters() 
{
      console.writeln("importParameters");
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
                              console.writeln("Unknown type '" + param.type + '" for parameter ' + name);
                              break;
                  }
            }
      }
}

function aiSectionBar(parent, control, title)
{
      var sb = new SectionBar(parent, title);
      sb.setSection(control);
      sb.onToggleSection = function(bar, beginToggle){
            parent.dialog.adjustToContents();
      };

      var gb = new newGroupBox( parent );
      gb.sizer = new VerticalSizer;
      gb.sizer.margin = 6;
      gb.sizer.spacing = 4;
      gb.sizer.add( sb );
      gb.sizer.add( control );

      return gb;
}

function aiSectionBarAdd(parent, groupbox, control, title)
{
      var sb = new SectionBar(parent, title);
      sb.setSection(control);
      sb.onToggleSection = function(bar, beginToggle){
            parent.dialog.adjustToContents();
      };

      groupbox.sizer.add( sb );
      groupbox.sizer.add( control );
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
      "Script automates initial steps of image processing in PixInsight. "+ 
      "It can calibrate images or it can be used with already calibrated iumages. "+ 
      "Most often you get the best results by running the script with default " +
      "settings and then continue processing in Pixinsight." +
      "</p><p>"+
      "By default output files goes to the following subdirectories:<br>" +
      "- AutoOutput contains intermediate files generated during processing<br>" +
      "- AutoMaster contains generated master calibration files<br>" +
      "- AutoCalibrated contains calibrated light files<br>" +
      "- AutoProcessed contains processed final images. Also integrated images and log output is here." +
      "</p><p>" +
      "User can give output root dir which can be relative or absolute path." +
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
      "Copyright (c) 2018-2021 Jarmo Ruuth<br>" +
      "Copyright (c) 2021 rob pfile<br>" +
      "Copyright (c) 2019 Vicent Peris<br>" +
      "Copyright (c) 2003-2020 Pleiades Astrophoto S.L." +
      "</p>";

      this.helpTips = new ToolButton( this );
      this.helpTips.icon = this.scaledResource( ":/icons/help.png" );
      this.helpTips.setScaledFixedSize( 20, 20 );
      this.helpTips.toolTip = mainHelpTips;

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
      this.filesButtonsSizer = addFilesButtons(this);

      this.tabBox = new TabBox( this );
      this.tabBox.addPage( new filesTreeBox( this, lightsOptions(this), pages.LIGHTS ), "Lights" );
      this.tabBox.addPage( new filesTreeBox( this, biasOptions(this), pages.BIAS ), "Bias" );
      this.tabBox.addPage( new filesTreeBox( this, darksOptions(this), pages.DARKS ), "Darks" );
      this.tabBox.addPage( new filesTreeBox( this, flatsOptions(this), pages.FLATS ), "Flats" );
      this.tabBox.addPage( new filesTreeBox( this, flatdarksOptions(this), pages.FLAT_DARKS ), "Flat Darks" );

      /* Paremeters check boxes. */
      this.useLocalNormalizationCheckBox = newCheckBox(this, "Local Normalization", par.use_local_normalization.val, 
            "<p>Run local normalization before StarAlign</p>" );
      this.useLocalNormalizationCheckBox.onClick = function(checked) { 
            par.use_local_normalization.val = checked; 
      }

      this.FixColumnDefectsCheckBox = newCheckBox(this, "Fix column defects", par.fix_column_defects.val, 
            "If checked, fix linear column defects by using linear defect detection algorithm from LinearDefectDetection.js script. " + 
            "Defect information is used by CosmeticCorrection to fix the defects." );
      this.FixColumnDefectsCheckBox.onClick = function(checked) { 
            par.fix_column_defects.val = checked; 
      }

      this.FixRowDefectsCheckBox = newCheckBox(this, "Fix row defects", par.fix_row_defects.val, 
            "If checked, fix linear row defects by using linear defect detection algorithm from LinearDefectDetection.js script. " + 
            "Defect information is used by CosmeticCorrection to fix the defects." );
      this.FixRowDefectsCheckBox.onClick = function(checked) { 
            par.fix_row_defects.val = checked; 
      }

      this.CosmeticCorrectionCheckBox = newCheckBox(this, "No CosmeticCorrection", par.skip_cosmeticcorrection.val, 
            "<p>Do not run CosmeticCorrection on image files</p>" );
      this.CosmeticCorrectionCheckBox.onClick = function(checked) { 
            par.skip_cosmeticcorrection.val = checked; 
      }

      this.SubframeSelectorCheckBox = newCheckBox(this, "No SubframeSelector", par.skip_subframeselector.val, 
            "<p>Do not run SubframeSelector to get image weights</p>" );
      this.SubframeSelectorCheckBox.onClick = function(checked) { 
            par.skip_subframeselector.val = checked; 
      }

      this.CalibrateOnlyCheckBox = newCheckBox(this, "Calibrate only", par.calibrate_only.val, 
            "<p>Run only image calibration</p>" );
      this.CalibrateOnlyCheckBox.onClick = function(checked) { 
            par.calibrate_only.val = checked; 
      }

      this.IntegrateOnlyCheckBox = newCheckBox(this, "Integrate only", par.integrate_only.val, 
            "<p>Run only image integration to create L,R,G,B or RGB files</p>" );
      this.IntegrateOnlyCheckBox.onClick = function(checked) { 
            par.integrate_only.val = checked; 
      }

      this.ChannelCombinationOnlyCheckBox = newCheckBox(this, "ChannelCombination only", par.channelcombination_only.val, 
            "<p>Run only channel combination to linear RGB file. No autostretch or color calibration.</p>" );
      this.ChannelCombinationOnlyCheckBox.onClick = function(checked) { 
            par.channelcombination_only.val = checked; 
      }

      this.relaxedStartAlignCheckBox = newCheckBox(this, "Strict StarAlign", par.strict_StarAlign.val, 
            "<p>Use more strict StarAlign par. When set more files may fail to align.</p>" );
      this.relaxedStartAlignCheckBox.onClick = function(checked) { 
            par.strict_StarAlign.val = checked; 
      }
      
      this.keepIntegratedImagesCheckBox = newCheckBox(this, "Keep integrated images", par.keep_integrated_images.val, 
            "<p>Keep integrated images when closing all windows</p>" );
      this.keepIntegratedImagesCheckBox.onClick = function(checked) { 
            par.keep_integrated_images.val = checked; 
      }

      this.keepTemporaryImagesCheckBox = newCheckBox(this, "Keep temporary images", par.keep_temporary_images.val, 
            "<p>Keep temporary images created while processing and do not close them. They will have tmp_ prefix.</p>" );
      this.keepTemporaryImagesCheckBox.onClick = function(checked) { 
            par.keep_temporary_images.val = checked; 
      }

      this.ABE_before_channel_combination_CheckBox = newCheckBox(this, "Use ABE on channel images", par.ABE_before_channel_combination.val, 
      "<p>Use AutomaticBackgroundExtractor on L, R, G and B images separately before channels are combined.</p>" );
      this.ABE_before_channel_combination_CheckBox.onClick = function(checked) { 
            par.ABE_before_channel_combination.val = checked; 
      }

      this.useABE_L_RGB_CheckBox = newCheckBox(this, "Use ABE on combined images", par.use_ABE_on_L_RGB.val, 
      "<p>Use AutomaticBackgroundExtractor on L and RGB images. This is the Use ABE option.</p>" );
      this.useABE_L_RGB_CheckBox.onClick = function(checked) { 
            par.use_ABE_on_L_RGB.val = checked; 
      }

      this.color_calibration_before_ABE_CheckBox = newCheckBox(this, "Color calibration before ABE", par.color_calibration_before_ABE.val, 
      "<p>Run ColorCalibration before AutomaticBackgroundExtractor in run on RGB image</p>" );
      this.color_calibration_before_ABE_CheckBox.onClick = function(checked) { 
            par.color_calibration_before_ABE.val = checked; 
      }

      this.use_background_neutralization_CheckBox = newCheckBox(this, "Use BackgroundNeutralization", par.use_background_neutralization.val, 
      "<p>Run BackgroundNeutralization before ColorCalibration</p>" );
      this.use_background_neutralization_CheckBox.onClick = function(checked) { 
            par.use_background_neutralization.val = checked; 
      }

      this.batch_mode_CheckBox = newCheckBox(this, "Batch mode", par.batch_mode.val, 
      "<p>Run in batch mode, continue until no files are given</p>" );
      this.batch_mode_CheckBox.onClick = function(checked) { 
            par.batch_mode.val = checked; 
      }

      this.autodetect_imagetyp_CheckBox = newCheckBox(this, "Do not use IMAGETYP keyword", !par.autodetect_imagetyp.val, 
      "<p>If selected do not try to autodetect calibration files based on IMAGETYP keyword.</p>" 
      );
      this.autodetect_imagetyp_CheckBox.onClick = function(checked) { 
            par.autodetect_imagetyp.val = !checked; 
      }

      this.autodetect_filter_CheckBox = newCheckBox(this, "Do not use FILTER keyword", !par.autodetect_filter.val, 
      "<p>If selected do not try to autodetect light and flat files based on FILTER keyword.</p>" +
      "<p>Selecting this enables manual adding of filter files for lights and flats.</p>" 
      );
      this.autodetect_filter_CheckBox.onClick = function(checked) { 
            par.autodetect_filter.val = !checked; 
            showOrHideFilterSectionBar(pages.LIGHTS);
            showOrHideFilterSectionBar(pages.FLATS);
      }

      this.select_all_files_CheckBox = newCheckBox(this, "Select all files", par.select_all_files.val, 
      "<p>If selected default file select pattern is all files (*.*) and not image files.</p>" );
      this.select_all_files_CheckBox.onClick = function(checked) { 
            par.select_all_files.val = checked; 
      }

      this.save_all_files_CheckBox = newCheckBox(this, "Save all files", par.save_all_files.val, 
      "<p>If selected save buttons will save all processed and iconized files and not just final image files. </p>" );
      this.save_all_files_CheckBox.onClick = function(checked) { 
            par.save_all_files.val = checked; 
      }

      this.no_subdirs_CheckBox = newCheckBox(this, "No subdirectories", par.no_subdirs.val, 
      "<p>If selected output files are not written into subdirectores</p>" );
      this.no_subdirs_CheckBox.onClick = function(checked) { 
            par.no_subdirs.val = checked;
            if (par.no_subdirs.val) {
                  clearDefaultDirs();
            } else {
                  setDefaultDirs();
            }
      }

      this.use_drizzle_CheckBox = newCheckBox(this, "Drizzle", par.use_drizzle.val, 
      "<p>Use Drizzle integration</p>" );
      this.use_drizzle_CheckBox.onClick = function(checked) { 
            par.use_drizzle.val = checked; 
      }

      this.use_uwf_CheckBox = newCheckBox(this, "Ultra Wide Field", par.use_uwf.val, 
      "<p>Use Slooh Ultra Wide Field (UWF) images for integration</p>" );
      this.use_uwf_CheckBox.onClick = function(checked) { 
            par.use_uwf.val = checked; 
      }
      
      this.monochrome_image_CheckBox = newCheckBox(this, "Monochrome", par.monochrome_image.val, 
      "<p>Create monochrome image</p>" );
      this.monochrome_image_CheckBox.onClick = function(checked) { 
            par.monochrome_image.val = checked; 
      }

      this.imageintegration_ssweight_CheckBox = newCheckBox(this, "ImageIntegration do not use weight", par.skip_imageintegration_ssweight.val, 
      "<p>Do not use use SSWEIGHT weight keyword during ImageIntegration</p>" );
      this.imageintegration_ssweight_CheckBox.onClick = function(checked) { 
            par.skip_imageintegration_ssweight.val = checked; 
      }

      this.imageintegration_clipping_CheckBox = newCheckBox(this, "No ImageIntegration clipping", !par.imageintegration_clipping.val, 
      "<p>Do not use clipping in ImageIntegration</p>" );
      this.imageintegration_clipping_CheckBox.onClick = function(checked) { 
            par.imageintegration_clipping.val = !checked; 
      }

      this.RRGB_image_CheckBox = newCheckBox(this, "RRGB image", par.RRGB_image.val, 
      "<p>RRGB image using R as Luminance.</p>" );
      this.RRGB_image_CheckBox.onClick = function(checked) { 
            par.RRGB_image.val = checked; 
      }

      this.synthetic_l_image_CheckBox = newCheckBox(this, "Synthetic L image", par.synthetic_l_image.val, 
      "<p>Create synthetic L image from all LRGB images.</p>" );
      this.synthetic_l_image_CheckBox.onClick = function(checked) { 
            par.synthetic_l_image.val = checked; 
      }

      this.synthetic_missing_images_CheckBox = newCheckBox(this, "Synthetic missing image", par.synthetic_missing_images.val, 
      "<p>Create synthetic image for any missing image.</p>" );
      this.synthetic_missing_images_CheckBox.onClick = function(checked) { 
            par.synthetic_missing_images.val = checked; 
      }

      this.force_file_name_filter_CheckBox = newCheckBox(this, "Use file name for filters", par.force_file_name_filter.val, 
      "<p>Use file name for recognizing filters and ignore FILTER keyword.</p>" );
      this.force_file_name_filter_CheckBox.onClick = function(checked) { 
            par.force_file_name_filter.val = checked; 
      }

      this.unique_file_names_CheckBox = newCheckBox(this, "Use unique file names", par.unique_file_names.val, 
      "<p>Use unique file names by adding a timestamp when saving to disk.</p>" );
      this.unique_file_names_CheckBox.onClick = function(checked) { 
            par.unique_file_names.val = checked; 
      }

      this.skip_noise_reduction_CheckBox = newCheckBox(this, "No noise reduction", par.skip_noise_reduction.val, 
      "<p>Do not use noise reduction. More fine grained noise reduction settings can be found in the Processing settings section.</p>" );
      this.skip_noise_reduction_CheckBox.onClick = function(checked) { 
            par.skip_noise_reduction.val = checked; 
      }

      this.no_mask_contrast_CheckBox = newCheckBox(this, "No extra contrast on mask", par.skip_mask_contrast.val, 
      "<p>Do not add extra contrast on automatically created luminance mask.</p>" );
      this.no_mask_contrast_CheckBox.onClick = function(checked) { 
            par.skip_mask_contrast.val = checked; 
      }

      this.skip_color_calibration_CheckBox = newCheckBox(this, "No color calibration", par.skip_color_calibration.val, 
      "<p>Do not run color calibration. Color calibration is run by default on RGB data.</p>" );
      this.skip_color_calibration_CheckBox.onClick = function(checked) { 
            par.skip_color_calibration.val = checked; 
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
      this.imageParamsSet1.add( this.no_mask_contrast_CheckBox );
      
      // Image parameters set 2.
      this.imageParamsSet2 = new VerticalSizer;
      this.imageParamsSet2.margin = 6;
      this.imageParamsSet2.spacing = 4;
      this.imageParamsSet2.add( this.skip_noise_reduction_CheckBox );
      this.imageParamsSet2.add( this.use_background_neutralization_CheckBox );
      this.imageParamsSet2.add( this.useLocalNormalizationCheckBox );
      this.imageParamsSet2.add( this.skip_color_calibration_CheckBox );
      this.imageParamsSet2.add( this.color_calibration_before_ABE_CheckBox );
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
      //this.imageParamsControl.sizer.addStretch();

      this.imageParamsGroupBox = aiSectionBar(this, this.imageParamsControl, "Image processing parameters");

      // LRGBCombination selection
      this.LRGBCombinationLightnessControl = new NumericControl( this );
      this.LRGBCombinationLightnessControl.label.text = "Lightness";
      this.LRGBCombinationLightnessControl.setRange(0, 1);
      this.LRGBCombinationLightnessControl.setValue(par.LRGBCombination_lightness.val);
      this.LRGBCombinationLightnessControl.toolTip = "<p>LRGBCombination lightness setting. Smaller value gives more bright image. Usually should be left to the default value.</p>";
      this.LRGBCombinationLightnessControl.onValueUpdated = function( value )
      {
            par.LRGBCombination_lightness.val = value;
      };

      this.LRGBCombinationSaturationControl = new NumericControl( this );
      this.LRGBCombinationSaturationControl.label.text = "Saturation";
      this.LRGBCombinationSaturationControl.setRange(0, 1);
      this.LRGBCombinationSaturationControl.setValue(par.LRGBCombination_saturation.val);
      this.LRGBCombinationSaturationControl.toolTip = "<p>LRGBCombination saturation setting. Smaller value gives more saturated image. Usually should be left to the default value.</p>";
      this.LRGBCombinationSaturationControl.onValueUpdated = function( value )
      {
            par.LRGBCombination_saturation.val = value;
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

      // Saturation selection
      this.linearSaturationLabel = new Label( this );
      this.linearSaturationLabel.text = "Linear saturation increase";
      this.linearSaturationLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      this.linearSaturationLabel.toolTip = "<p>Saturation increase in linear state using a mask.</p>";
      this.linearSaturationSpinBox = new SpinBox( this );
      this.linearSaturationSpinBox.minValue = 0;
      this.linearSaturationSpinBox.maxValue = 5;
      this.linearSaturationSpinBox.value = par.linear_increase_saturation.val;
      this.linearSaturationSpinBox.toolTip = this.linearSaturationLabel.toolTip;
      this.linearSaturationSpinBox.onValueUpdated = function( value )
      {
            par.linear_increase_saturation.val = value;
      };

      this.nonLinearSaturationLabel = new Label( this );
      this.nonLinearSaturationLabel.text = "Non-linear saturation increase";
      this.nonLinearSaturationLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      this.nonLinearSaturationLabel.toolTip = "<p>Saturation increase in non-linear state using a mask.</p>";
      this.nonLinearSaturationSpinBox = new SpinBox( this );
      this.nonLinearSaturationSpinBox.minValue = 0;
      this.nonLinearSaturationSpinBox.maxValue = 5;
      this.nonLinearSaturationSpinBox.value = par.non_linear_increase_saturation.val;
      this.nonLinearSaturationSpinBox.toolTip = this.nonLinearSaturationLabel.toolTip;
      this.nonLinearSaturationSpinBox.onValueUpdated = function( value )
      {
            par.non_linear_increase_saturation.val = value;
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

      // Noise reduction
      var noiseReductionToolTipCommon = "<p>Noise reduction is done using a luminance mask to target noise reduction on darker areas of the image. " +
                                        "Bigger strength value means stronger noise reduction.</p>" + 
                                        "<p>Noise reduction uses MultiscaleLinerTransaform. Strenght is the number of layers used to reduce noise.</p>";
      this.noiseReductionStrengthLabel = new Label( this );
      this.noiseReductionStrengthLabel.text = "Noise reduction";
      this.noiseReductionStrengthLabel.toolTip = "<p>Noise reduction strength for L and combined image.</p>" + noiseReductionToolTipCommon;
      this.noiseReductionStrengthLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
   
      this.noiseReductionStrengthComboBox = new ComboBox( this );
      this.noiseReductionStrengthComboBox.toolTip = this.noiseReductionStrengthLabel.toolTip;
      addArrayToComboBox(this.noiseReductionStrengthComboBox, noise_reduction_strength_values);
      this.noiseReductionStrengthComboBox.currentItem = noise_reduction_strength_values.indexOf(par.noise_reduction_strength.val.toString());
      this.noiseReductionStrengthComboBox.onItemSelected = function( itemIndex )
      {
            par.noise_reduction_strength.val = parseInt(noise_reduction_strength_values[itemIndex]);
      };

      this.channelNoiseReductionStrengthLabel = new Label( this );
      this.channelNoiseReductionStrengthLabel.text = "Channel noise reduction";
      this.channelNoiseReductionStrengthLabel.toolTip = "<p>Noise reduction strength for color channel (R,G,B,H,S,O) images.</p>" + noiseReductionToolTipCommon;
      this.channelNoiseReductionStrengthLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
   
      this.channelNoiseReductionStrengthComboBox = new ComboBox( this );
      this.channelNoiseReductionStrengthComboBox.toolTip = this.channelNoiseReductionStrengthLabel.toolTip;
      addArrayToComboBox(this.channelNoiseReductionStrengthComboBox, noise_reduction_strength_values);
      this.channelNoiseReductionStrengthComboBox.currentItem = noise_reduction_strength_values.indexOf(par.channel_noise_reduction_strength.val.toString());
      this.channelNoiseReductionStrengthComboBox.onItemSelected = function( itemIndex )
      {
            par.channel_noise_reduction_strength.val = parseInt(noise_reduction_strength_values[itemIndex]);
      };

      this.color_noise_reduction_CheckBox = newCheckBox(this, "Color noise reduction", par.use_color_noise_reduction.val, 
      "<p>Do color noise reduction.</p>" );
      this.color_noise_reduction_CheckBox.onClick = function(checked) { 
            par.use_color_noise_reduction.val = checked; 
      }

      this.noiseReductionGroupBoxLabel = aiSectionLabel(this, "Noise reduction settings");
      this.noiseReductionGroupBoxSizer = new HorizontalSizer;
      this.noiseReductionGroupBoxSizer.margin = 6;
      this.noiseReductionGroupBoxSizer.spacing = 4;
      this.noiseReductionGroupBoxSizer.add( this.noiseReductionStrengthLabel );
      this.noiseReductionGroupBoxSizer.add( this.noiseReductionStrengthComboBox );
      this.noiseReductionGroupBoxSizer.add( this.channelNoiseReductionStrengthLabel );
      this.noiseReductionGroupBoxSizer.add( this.channelNoiseReductionStrengthComboBox );
      this.noiseReductionGroupBoxSizer.add( this.color_noise_reduction_CheckBox );
      //this.noiseReductionGroupBoxSizer.addStretch();

      // Other parameters set 1.
      this.otherParamsSet1 = new VerticalSizer;
      this.otherParamsSet1.margin = 6;
      this.otherParamsSet1.spacing = 4;
      this.otherParamsSet1.add( this.CalibrateOnlyCheckBox );
      this.otherParamsSet1.add( this.IntegrateOnlyCheckBox );
      this.otherParamsSet1.add( this.ChannelCombinationOnlyCheckBox );
      this.otherParamsSet1.add( this.RRGB_image_CheckBox );
      this.otherParamsSet1.add( this.synthetic_l_image_CheckBox );
      this.otherParamsSet1.add( this.synthetic_missing_images_CheckBox );
      this.otherParamsSet1.add( this.no_subdirs_CheckBox );
      this.otherParamsSet1.add( this.select_all_files_CheckBox );
      this.otherParamsSet1.add( this.save_all_files_CheckBox );

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
      this.otherParamsSet2.add( this.force_file_name_filter_CheckBox );
      this.otherParamsSet2.add( this.autodetect_filter_CheckBox );
      this.otherParamsSet2.add( this.autodetect_imagetyp_CheckBox );

      // Other Group par.
      this.otherParamsControl = new Control( this );
      this.otherParamsControl.sizer = new HorizontalSizer;
      this.otherParamsControl.sizer.margin = 6;
      this.otherParamsControl.sizer.spacing = 4;
      this.otherParamsControl.sizer.add( this.otherParamsSet1 );
      this.otherParamsControl.sizer.add( this.otherParamsSet2 );
      //this.otherParamsControl.sizer.addStretch();
      
      this.otherParamsGroupBox = aiSectionBar(this, this.otherParamsControl, "Other parameters");

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
      addArrayToComboBox(this.weightComboBox, use_weight_values);
      this.weightComboBox.currentItem = use_weight_values.indexOf(par.use_weight.val);
      this.weightComboBox.onItemSelected = function( itemIndex )
      {
            par.use_weight.val = use_weight_values[itemIndex];
      };

      this.weightGroupBoxLabel = aiSectionLabel(this, "Image weight calculation settings");
      this.weightGroupBoxSizer = new HorizontalSizer;
      this.weightGroupBoxSizer.margin = 6;
      this.weightGroupBoxSizer.spacing = 4;
      this.weightGroupBoxSizer.add( this.weightComboBox );
      this.weightGroupBoxSizer.toolTip = weightHelpToolTips;
      this.weightGroupBoxSizer.addStretch();
      
      // CosmeticCorrection Sigma values
      //
      this.cosmeticCorrectionSigmaGroupBoxLabel = aiSectionLabel(this, "CosmeticCorrection Sigma values");
      
      var cosmeticCorrectionSigmaGroupBoxLabeltoolTip = "Hot Sigma and Cold Sigma values for CosmeticCorrection";

      this.cosmeticCorrectionHotSigmaGroupBoxLabel = aiLabel(this, "Hot Sigma", cosmeticCorrectionSigmaGroupBoxLabeltoolTip);
      this.cosmeticCorrectionHotSigmaSpinBox = new SpinBox( this );
      this.cosmeticCorrectionHotSigmaSpinBox.minValue = 0;
      this.cosmeticCorrectionHotSigmaSpinBox.maxValue = 10;
      this.cosmeticCorrectionHotSigmaSpinBox.value = par.cosmetic_correction_hot_sigma.val;
      this.cosmeticCorrectionHotSigmaSpinBox.toolTip = cosmeticCorrectionSigmaGroupBoxLabeltoolTip;
      this.cosmeticCorrectionHotSigmaSpinBox.onValueUpdated = function( value )
      {
            par.cosmetic_correction_hot_sigma.val = value;
      };
      this.cosmeticCorrectionColSigmaGroupBoxLabel = aiLabel(this, "Cold Sigma", cosmeticCorrectionSigmaGroupBoxLabeltoolTip);
      this.cosmeticCorrectionColdSigmaSpinBox = new SpinBox( this );
      this.cosmeticCorrectionColdSigmaSpinBox.minValue = 0;
      this.cosmeticCorrectionColdSigmaSpinBox.maxValue = 10;
      this.cosmeticCorrectionColdSigmaSpinBox.value = par.cosmetic_correction_cold_sigma.val;
      this.cosmeticCorrectionColdSigmaSpinBox.toolTip = cosmeticCorrectionSigmaGroupBoxLabeltoolTip;
      this.cosmeticCorrectionColdSigmaSpinBox.onValueUpdated = function( value )
      {
            par.cosmetic_correction_cold_sigma.val = value;
      };
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
      addArrayToComboBox(this.linearFitComboBox, use_linear_fit_values);
      this.linearFitComboBox.currentItem = use_linear_fit_values.indexOf(par.use_linear_fit.val);
      this.linearFitComboBox.onItemSelected = function( itemIndex )
      {
            par.use_linear_fit.val = use_linear_fit_values[itemIndex]; 
      };

      this.linearFitGroupBoxLabel = aiSectionLabel(this, "Linear fit setting");
      this.linearFitGroupBoxSizer = new HorizontalSizer;
      this.linearFitGroupBoxSizer.margin = 6;
      this.linearFitGroupBoxSizer.spacing = 4;
      this.linearFitGroupBoxSizer.add( this.linearFitComboBox );
      this.linearFitGroupBoxSizer.addStretch();

      //
      // Stretching
      //

      this.stretchingComboBox = new ComboBox( this );
      this.stretchingComboBox.toolTip = 
            "Auto STF - Use auto Screen Transfer Function to stretch image to non-linear.\n" +
            "Masked Stretch - Use MaskedStretch to stretch image to non-linear.\n" +
            "Use both - Use auto Screen Transfer Function for luminance and MaskedStretch for RGB to stretch image to non-linear.";
      addArrayToComboBox(this.stretchingComboBox, image_stretching_values);
      this.stretchingComboBox.currentItem = image_stretching_values.indexOf(par.image_stretching.val);
      this.stretchingComboBox.onItemSelected = function( itemIndex )
      {
            par.image_stretching.val = image_stretching_values[itemIndex]; 
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
      "RGB channel linking in Screen Transfer Function." +
      "</p><p>" +
      "With Auto the default for true RGB images is to use linked channels. For narrowband and OSC/DSLR images the default " +
      "is to use unlinked channels. But if linear fit is done with narrowband images, then linked channels are used." +
      "</p>";
      this.STFComboBox = new ComboBox( this );
      this.STFComboBox.toolTip = this.STFLabel.toolTip;
      addArrayToComboBox(this.STFComboBox, STF_linking_values);
      this.STFComboBox.currentItem = STF_linking_values.indexOf(par.STF_linking.val);
      this.STFComboBox.onItemSelected = function( itemIndex )
      {
            par.STF_linking.val = STF_linking_values[itemIndex];
      };

      this.STFSizer = new HorizontalSizer;
      this.STFSizer.spacing = 4;
      this.STFSizer.toolTip = this.STFLabel.toolTip;
      this.STFSizer.add( this.STFLabel );
      this.STFSizer.add( this.STFComboBox );

      this.MaskedStretchTargetBackgroundControl = new NumericControl( this );
      this.MaskedStretchTargetBackgroundControl.label.text = "Masked Stretch targetBackground";
      this.MaskedStretchTargetBackgroundControl.setRange(0, 1);
      this.MaskedStretchTargetBackgroundControl.setValue(par.MaskedStretch_targetBackground.val);
      this.MaskedStretchTargetBackgroundControl.toolTip = "<p>Masked Stretch targetBackground value. Usually values between 0.1 and 0.2 work best.</p>";
      this.MaskedStretchTargetBackgroundControl.onValueUpdated = function( value )
      {
            par.MaskedStretch_targetBackground.val = value;
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
      addArrayToComboBox(this.ImageIntegrationNormalizationComboBox, imageintegration_normalization_values);
      this.ImageIntegrationNormalizationComboBox.currentItem  = imageintegration_normalization_values.indexOf(par.imageintegration_normalization.val);
      this.ImageIntegrationNormalizationComboBox.onItemSelected = function( itemIndex )
      {
            par.imageintegration_normalization.val = imageintegration_normalization_values[itemIndex];
      };
   
      this.ImageIntegrationNormalizationSizer = new HorizontalSizer;
      this.ImageIntegrationNormalizationSizer.spacing = 4;
      this.ImageIntegrationNormalizationSizer.add( this.ImageIntegrationNormalizationLabel );
      this.ImageIntegrationNormalizationSizer.add( this.ImageIntegrationNormalizationComboBox, 100 );

      // Pixel rejection algorithm/clipping
      this.ImageIntegrationRejectionLabel = new Label( this );
      this.ImageIntegrationRejectionLabel.text = "Rejection";
      this.ImageIntegrationRejectionLabel.toolTip = ImageIntegrationHelpToolTips;
      this.ImageIntegrationRejectionLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
   
      this.ImageIntegrationRejectionComboBox = new ComboBox( this );
      this.ImageIntegrationRejectionComboBox.toolTip = ImageIntegrationHelpToolTips;
      addArrayToComboBox(this.ImageIntegrationRejectionComboBox, use_clipping_values);
      this.ImageIntegrationRejectionComboBox.currentItem = use_clipping_values.indexOf(par.use_clipping.val);
      this.ImageIntegrationRejectionComboBox.onItemSelected = function( itemIndex )
      {
            par.use_clipping.val = use_clipping_values[itemIndex];
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
            "Mapping for R channel. Use one of the prefined mappings or edit and create your own mapping." +
            "</p>" +
            narrowbandToolTip;
      this.narrowbandCustomPalette_R_ComboBox = new ComboBox( this );
      this.narrowbandCustomPalette_R_ComboBox.enabled = true;
      this.narrowbandCustomPalette_R_ComboBox.editEnabled = true;
      this.narrowbandCustomPalette_R_ComboBox.addItem(par.custom_R_mapping.val);
      this.narrowbandCustomPalette_R_ComboBox.addItem("0.75*H + 0.25*S");
      this.narrowbandCustomPalette_R_ComboBox.toolTip = this.narrowbandCustomPalette_R_Label.toolTip;
      this.narrowbandCustomPalette_R_ComboBox.onEditTextUpdated = function() { 
            par.custom_R_mapping.val = this.editText.trim(); 
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
      this.narrowbandCustomPalette_G_ComboBox.addItem(par.custom_G_mapping.val);
      this.narrowbandCustomPalette_G_ComboBox.addItem("0.50*S + 0.50*O");
      this.narrowbandCustomPalette_G_ComboBox.toolTip = this.narrowbandCustomPalette_G_Label.toolTip;
      this.narrowbandCustomPalette_G_ComboBox.onEditTextUpdated = function() { 
            par.custom_G_mapping.val = this.editText.trim(); 
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
      this.narrowbandCustomPalette_B_ComboBox.addItem(par.custom_B_mapping.val);
      this.narrowbandCustomPalette_B_ComboBox.addItem("0.30*H + 0.70*O");
      this.narrowbandCustomPalette_B_ComboBox.toolTip = this.narrowbandCustomPalette_B_Label.toolTip;
      this.narrowbandCustomPalette_B_ComboBox.onEditTextUpdated = function() { 
            par.custom_B_mapping.val = this.editText.trim(); 
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

      this.mapping_on_nonlinear_data_CheckBox = newCheckBox(this, "Narrowband mapping using non-linear data", par.mapping_on_nonlinear_data.val, 
            "<p>" +
            "Do narrowband mapping using non-linear data. Before running PixelMath images are stretched to non-linear state. " +
            "</p>" );
      this.mapping_on_nonlinear_data_CheckBox.onClick = function(checked) { 
            par.mapping_on_nonlinear_data.val = checked; 
      }
      this.narrowband_starnet_CheckBox = newCheckBox(this, "StarNet", par.narrowband_starnet.val, 
            "<p>" +
            "Run StarNet to remove stars before narrowband mapping. This needs non-linear data so images are stretched to non-linear state." +
            "</p>" );
      this.narrowband_starnet_CheckBox.onClick = function(checked) { 
            par.narrowband_starnet.val = checked; 
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
      addArrayToComboBox(this.narrowbandLinearFit_ComboBox, narrowband_linear_fit_values);
      this.narrowbandLinearFit_ComboBox.currentItem = narrowband_linear_fit_values.indexOf(par.narrowband_linear_fit.val);
      this.narrowbandLinearFit_ComboBox.toolTip = this.narrowbandLinearFit_Label.toolTip;
      this.narrowbandLinearFit_ComboBox.onItemSelected = function( itemIndex )
      {
            par.narrowband_linear_fit.val = narrowband_linear_fit_values[itemIndex];
      };

      this.mapping_on_nonlinear_data_Sizer = new HorizontalSizer;
      this.mapping_on_nonlinear_data_Sizer.margin = 2;
      this.mapping_on_nonlinear_data_Sizer.spacing = 4;
      this.mapping_on_nonlinear_data_Sizer.add( this.mapping_on_nonlinear_data_CheckBox );
      this.mapping_on_nonlinear_data_Sizer.add( this.narrowband_starnet_CheckBox );
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
            par.custom_L_mapping.val = this.dialog.narrowbandCustomPalette_L_ComboBox.editText;
      };

      this.narrowbandCustomPalette_L_Label = new Label( this );
      this.narrowbandCustomPalette_L_Label.text = "L";
      this.narrowbandCustomPalette_L_Label.textAlignment = TextAlign_Right|TextAlign_VertCenter;
      this.narrowbandCustomPalette_L_Label.toolTip = this.narrowbandLuminancePalette_ComboBox.toolTip;
      this.narrowbandCustomPalette_L_ComboBox = new ComboBox( this );
      this.narrowbandCustomPalette_L_ComboBox.enabled = true;
      this.narrowbandCustomPalette_L_ComboBox.editEnabled = true;
      this.narrowbandCustomPalette_L_ComboBox.addItem(par.custom_L_mapping.val);
      this.narrowbandCustomPalette_L_ComboBox.addItem("max(L, H)");
      this.narrowbandCustomPalette_L_ComboBox.toolTip = this.narrowbandLuminancePalette_ComboBox.toolTip
      this.narrowbandCustomPalette_L_ComboBox.onEditTextUpdated = function() { 
            par.custom_L_mapping.val = this.editText.trim(); 
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
            
      this.useRGBNBmapping_CheckBox = newCheckBox(this, "Use Narrowband RGB mapping", par.use_RGBNB_Mapping.val, RGBNB_tooltip);
      this.useRGBNBmapping_CheckBox.onClick = function(checked) { 
            par.use_RGBNB_Mapping.val = checked; 
      }
      this.useRGBbandwidth_CheckBox = newCheckBox(this, "Use RGB image", par.use_RGB_image.val, 
            "<p>" +
            "Use RGB image for bandwidth mapping instead of separate R, G and B channel images. " +
            "R channel bandwidth is then used for the RGB image." +
            "</p>" );
      this.useRGBbandwidth_CheckBox.onClick = function(checked) { 
            par.use_RGB_image.val = checked; 
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
            par.use_RGBNB_Mapping.val = true;
            clearDefaultDirs();
            try {
                  testRGBNBmapping();
                  setDefaultDirs();
            } 
            catch(err) {
                  console.criticalln(err);
                  console.criticalln("Processing stopped!");
                  writeProcessingSteps(null, true, win_prefix + "AutoRGBNB");
                  console.endLog();
                  setDefaultDirs();
            }
            par.use_RGBNB_Mapping.val = false;
      };   

      // channel mapping
      this.RGBNB_MappingLabel = aiLabel(this, 'Mapping', "Select mapping of narrowband channels to (L)RGB channels.");
      this.RGBNB_MappingLLabel = aiLabel(this, 'L', "Mapping of narrowband channel to L channel. If there is no L channel available then this setting is ignored.");
      this.RGBNB_MappingLValue = ai_RGBNB_Mapping_ComboBox(this, "L", par.L_mapping.val, function(value) { par.L_mapping.val = value; }, this.RGBNB_MappingLLabel.toolTip);
      this.RGBNB_MappingRLabel = aiLabel(this, 'R', "Mapping of narrowband channel to R channel. If no mapping is selected then channel is left unchanged.");
      this.RGBNB_MappingRValue = ai_RGBNB_Mapping_ComboBox(this, "R", par.R_mapping.val, function(value) { par.R_mapping.val = value; }, this.RGBNB_MappingRLabel.toolTip);
      this.RGBNB_MappingGLabel = aiLabel(this, 'G', "Mapping of narrowband channel to G channel. If no mapping is selected then channel is left unchanged.");
      this.RGBNB_MappingGValue = ai_RGBNB_Mapping_ComboBox(this, "G", par.G_mapping.val, function(value) { par.G_mapping.val = value; }, this.RGBNB_MappingGLabel.toolTip);
      this.RGBNB_MappingBLabel = aiLabel(this, 'B', "Mapping of narrowband channel to G channel. If no mapping is selected then channel is left unchanged.");
      this.RGBNB_MappingBValue = ai_RGBNB_Mapping_ComboBox(this, "B", par.B_mapping.val, function(value) { par.B_mapping.val = value; }, this.RGBNB_MappingBLabel.toolTip);

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
      this.RGBNB_BoostLValue = aiNumericEdit(this, 'L', par.L_BoostFactor.val, function(value) { par.L_BoostFactor.val = value; }, "Boost, or multiplication factor, for the L channel.");
      this.RGBNB_BoostRValue = aiNumericEdit(this, 'R', par.R_BoostFactor.val, function(value) { par.R_BoostFactor.val = value; }, "Boost, or multiplication factor, for the R channel.");
      this.RGBNB_BoostGValue = aiNumericEdit(this, 'G', par.G_BoostFactor.val, function(value) { par.G_BoostFactor.val = value; }, "Boost, or multiplication factor, for the G channel.");
      this.RGBNB_BoostBValue = aiNumericEdit(this, 'B', par.B_BoostFactor.val, function(value) { par.B_BoostFactor.val = value; }, "Boost, or multiplication factor, for the B channel.");

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
      this.RGBNB_BandwidthLValue = aiNumericEdit(this, 'L', par.L_bandwidth.val, function(value) { par.L_bandwidth.val = value; }, "Bandwidth (nm) for the L filter.");
      this.RGBNB_BandwidthRValue = aiNumericEdit(this, 'R', par.R_bandwidth.val, function(value) { par.R_bandwidth.val = value; }, "Bandwidth (nm) for the R filter.");
      this.RGBNB_BandwidthGValue = aiNumericEdit(this, 'G', par.G_bandwidth.val, function(value) { par.G_bandwidth.val = value; }, "Bandwidth (nm) for the G filter.");
      this.RGBNB_BandwidthBValue = aiNumericEdit(this, 'B', par.B_bandwidth.val, function(value) { par.B_bandwidth.val = value; }, "Bandwidth (nm) for the B filter.");
      this.RGBNB_BandwidthHValue = aiNumericEdit(this, 'H', par.H_bandwidth.val, function(value) { par.H_bandwidth.val = value; }, "Bandwidth (nm) for the H filter. Typical values could be 7 nm or 3 nm.");
      this.RGBNB_BandwidthSValue = aiNumericEdit(this, 'S', par.S_bandwidth.val, function(value) { par.S_bandwidth.val = value; }, "Bandwidth (nm) for the S filter. Typical values could be 8.5 nm or 3 nm.");
      this.RGBNB_BandwidthOValue = aiNumericEdit(this, 'O', par.O_bandwidth.val, function(value) { par.O_bandwidth.val = value; }, "Bandwidth (nm) for the O filter. Typical values could be 8.5 nm or 3 nm.");

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
      // this.narrowbandControl.title = "Narrowband processing";
      this.narrowbandControl.sizer = new VerticalSizer;
      this.narrowbandControl.sizer.margin = 6;
      this.narrowbandControl.sizer.spacing = 4;
      this.narrowbandControl.sizer.add( this.narrowbandColorPaletteLabel );
      this.narrowbandControl.sizer.add( this.narrowbandCustomPalette_Sizer );
      this.narrowbandControl.sizer.add( this.mapping_on_nonlinear_data_Sizer );
      this.narrowbandControl.sizer.add( this.NbLuminanceSizer );
      //this.narrowbandControl.sizer.add( this.narrowbandAutoContinue_sizer );

      this.narrowbandGroupBox = aiSectionBar(this, this.narrowbandControl, "Narrowband processing");

      this.narrowbandRGBmappingControl = new Control( this );
      //this.narrowbandRGBmappingControl.title = "Narrowband to RGB mapping";
      this.narrowbandRGBmappingControl.sizer = new VerticalSizer;
      this.narrowbandRGBmappingControl.sizer.margin = 6;
      this.narrowbandRGBmappingControl.sizer.spacing = 4;
      this.narrowbandRGBmappingControl.sizer.add( this.RGBNB_Sizer );
      //this.narrowbandRGBmappingControl.sizer.add( this.narrowbandAutoContinue_sizer );
      // hide this section by default
      this.narrowbandRGBmappingControl.visible = false;

      this.narrowbandRGBmappingGroupBox = aiSectionBar(this, this.narrowbandRGBmappingControl, "Narrowband to RGB mapping");

      // Narrowband extra processing
      this.fix_narrowband_star_color_CheckBox = newCheckBox(this, "Fix star colors", par.fix_narrowband_star_color.val, 
      "<p>Fix magenta color on stars typically seen with SHO color palette. If all green is not removed from the image then a mask use used to fix only stars. " + 
      "This is also run with AutoContinue and Extra processing.</p>" );
      this.fix_narrowband_star_color_CheckBox.onClick = function(checked) { 
            par.fix_narrowband_star_color.val = checked; 
      }
      this.narrowband_hue_shift_CheckBox = newCheckBox(this, "Hue shift for more orange", par.run_hue_shift.val, 
      "<p>Do hue shift to enhance orange color. Useful with SHO color palette. Also run with AutoContinue and Extra processing.</p>" );
      this.narrowband_hue_shift_CheckBox.onClick = function(checked) { 
            par.run_hue_shift.val = checked; 
      }
      this.narrowband_leave_some_green_CheckBox = newCheckBox(this, "Leave some green", par.leave_some_green.val, 
      "<p>Leave some green color on image when running SCNR (amount 0.50). Useful with SHO color palette. " +
      "This is also run with AutoContinue and Extra processing.</p>" );
      this.narrowband_leave_some_green_CheckBox.onClick = function(checked) { 
            par.leave_some_green.val = checked; 
      }
      this.run_narrowband_SCNR_CheckBox = newCheckBox(this, "Remove green cast", par.run_narrowband_SCNR.val, 
      "<p>Run SCNR to remove green cast. Useful with SHO color palette. This is also run with AutoContinue and Extra processing.</p>" );
      this.run_narrowband_SCNR_CheckBox.onClick = function(checked) { 
            par.run_narrowband_SCNR.val = checked; 
      }
      this.no_star_fix_mask_CheckBox = newCheckBox(this, "No mask when fixing star colors", par.skip_star_fix_mask.val, 
      "<p>Do not use star mask when fixing star colors</p>" );
      this.no_star_fix_mask_CheckBox.onClick = function(checked) { 
            par.skip_star_fix_mask.val = checked; 
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
      this.extraStarNet_CheckBox = newCheckBox(this, "StarNet", par.extra_StarNet.val, 
      "<p>Run Starnet on image to generate a starless image and a separate image for the stars. When Starnet is selected, extra processing is " +
      "applied to the starless image. Smaller stars option is run on star images. At the end of the processing also a combined image is created " + 
      "from starless and star images.</p>" );
      this.extraStarNet_CheckBox.onClick = function(checked) { 
            par.extra_StarNet.val = checked; 
      }
      this.extraDarkerBackground_CheckBox = newCheckBox(this, "Darker background", par.extra_darker_background.val, 
      "<p>Make image background darker.</p>" );
      this.extraDarkerBackground_CheckBox.onClick = function(checked) { 
            par.extra_darker_background.val = checked; 
      }
      this.extraABE_CheckBox = newCheckBox(this, "ABE", par.extra_ABE.val, 
      "<p>Run AutomaticBackgroundExtractor.</p>" );
      this.extraABE_CheckBox.onClick = function(checked) { 
            par.extra_ABE.val = checked; 
      }
      this.extra_HDRMLT_CheckBox = newCheckBox(this, "HDRMultiscaleTansform", par.extra_HDRMLT.val, 
      "<p>Run HDRMultiscaleTansform on image.</p>" );
      this.extra_HDRMLT_CheckBox.onClick = function(checked) { 
            par.extra_HDRMLT.val = checked; 
      }
      this.extra_LHE_CheckBox = newCheckBox(this, "LocalHistogramEqualization", par.extra_LHE.val, 
      "<p>Run LocalHistogramEqualization on image.</p>" );
      this.extra_LHE_CheckBox.onClick = function(checked) { 
            par.extra_LHE.val = checked; 
      }
      this.extra_Contrast_CheckBox = newCheckBox(this, "Add contrast", par.extra_contrast.val, 
      "<p>Run slight curves transformation on image to add contrast.</p>" );
      this.extra_Contrast_CheckBox.onClick = function(checked) { 
            par.extra_contrast.val = checked; 
      }
      this.extra_STF_CheckBox = newCheckBox(this, "Auto STF", par.extra_STF.val, 
      "<p>Run automatic ScreenTransferFunction on image to brighten it.</p>" );
      this.extra_STF_CheckBox.onClick = function(checked) { 
            par.extra_STF.val = checked; 
      }

      this.extra_SmallerStars_CheckBox = newCheckBox(this, "Smaller stars", par.extra_smaller_stars.val, 
      "<p>Make stars smaller on image.</p>" );
      this.extra_SmallerStars_CheckBox.onClick = function(checked) { 
            par.extra_smaller_stars.val = checked; 
      }
      this.IterationsSpinBox = new SpinBox( this );
      this.IterationsSpinBox.minValue = 0;
      this.IterationsSpinBox.maxValue = 10;
      this.IterationsSpinBox.value = par.extra_smaller_stars_iterations.val;
      this.IterationsSpinBox.toolTip = "<p>Number of iterations when reducing star sizes. Value zero uses Erosion instead of Morphological Selection</p>";
      this.IterationsSpinBox.onValueUpdated = function( value )
      {
            par.extra_smaller_stars_iterations.val = value;
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

      var extra_noise_reduction_tooltip = "<p>Noise reduction on image.</p>" + noiseReductionToolTipCommon;
      this.extra_NoiseReduction_CheckBox = newCheckBox(this, "Noise reduction", par.extra_noise_reduction.val, 
            extra_noise_reduction_tooltip);
      this.extra_NoiseReduction_CheckBox.onClick = function(checked) { 
            par.extra_noise_reduction.val = checked; 
      }
      this.extraNoiseReductionStrengthSpinBox = new SpinBox( this );
      this.extraNoiseReductionStrengthSpinBox.minValue = 3;
      this.extraNoiseReductionStrengthSpinBox.maxValue = 5;
      this.extraNoiseReductionStrengthSpinBox.value = par.extra_noise_reduction_strength.val;
      this.extraNoiseReductionStrengthSpinBox.toolTip = extra_noise_reduction_tooltip;
      this.extraNoiseReductionStrengthSpinBox.onValueUpdated = function( value )
      {
            par.extra_noise_reduction_strength.val = value;
      };
      this.extraNoiseReductionStrengthLabel = new Label( this );
      this.extraNoiseReductionStrengthLabel.text = "strength";
      this.extraNoiseReductionStrengthLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      this.extraNoiseReductionStrengthLabel.toolTip = extra_noise_reduction_tooltip;
      this.extraNoiseReductionStrengthSizer = new HorizontalSizer;
      this.extraNoiseReductionStrengthSizer.spacing = 4;
      this.extraNoiseReductionStrengthSizer.add( this.extra_NoiseReduction_CheckBox );
      this.extraNoiseReductionStrengthSizer.add( this.extraNoiseReductionStrengthSpinBox );
      this.extraNoiseReductionStrengthSizer.add( this.extraNoiseReductionStrengthLabel );
      this.extraNoiseReductionStrengthSizer.toolTip = extra_noise_reduction_tooltip;
      this.extraNoiseReductionStrengthSizer.addStretch();

      this.extraImageLabel = new Label( this );
      this.extraImageLabel.text = "Target image";
      this.extraImageLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      this.extraImageLabel.toolTip = "<p>Target image for extra processing. Target image is replaced with processed image. This can be useful " + 
      "if extra processing is not done with Run or AutoContinue option.</p>";
      this.extraImageComboBox = new ComboBox( this );
      var windowList = getWindowListReverse();
      windowList.unshift("Auto");
      for (var i = 0; i < windowList.length; i++) {
            this.extraImageComboBox.addItem( windowList[i] );
      }
      extra_target_image = windowList[0];
      this.extraImageComboBox.onItemSelected = function( itemIndex )
      {
            extra_target_image = windowList[itemIndex];
      };
      this.extraApplyButton = new PushButton( this );
      this.extraApplyButton.text = "Apply";
      this.extraApplyButton.toolTip = 
            "Apply extra processing on the selected image. Auto option is used when extra processing is done with Run or AutoContinue option.";
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
      this.extra1.add( this.extraABE_CheckBox );
      this.extra1.add( this.extraDarkerBackground_CheckBox );
      this.extra1.add( this.extra_HDRMLT_CheckBox );
      this.extra1.add( this.extra_LHE_CheckBox );

      this.extra2 = new VerticalSizer;
      this.extra2.margin = 6;
      this.extra2.spacing = 4;
      this.extra2.add( this.extra_Contrast_CheckBox );
      this.extra2.add( this.extra_STF_CheckBox );
      this.extra2.add( this.extraNoiseReductionStrengthSizer );
      this.extra2.add( this.SmallerStarsSizer );

      this.extraLabel = aiSectionLabel(this, "Generic extra processing");

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
      this.extraControl.sizer.addStretch();
      this.extraControl.toolTip = 
            "<p>" +
            "In case of Run or AutoContinue " + 
            "extra processing options are always applied to a copy of the final image. " + 
            "A new image is created with _extra added to the name. " + 
            "For example if the final image is AutoLRGB then a new image AutoLRGB_extra is created. " + 
            "AutoContinue can be used to apply extra processing after the final image is created. " +
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
            "6. Auto STF<br>" +
            "7. Noise reduction<br>" +
            "8. Smaller stars" +
            "With Smaller stars the number of iterations can be given. More iterations will generate smaller stars." +
            "</p><p>" +
            "If narrowband processing options are selected they are applied before extra processing options." +
            "</p>";

      this.extraGroupBox = aiSectionBar(this, this.extraControl, "Extra processing");

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
            "Integration_H + Integration_S + Integration_O<br>" +
            "Integration_L + Integration_R + Integration_G + Integration_B<br>" +
            "Final image (for extra processing)" +
            "</p>" +
            "<p>" +
            "Not all images must be present, for example L image can be missing.<br>" +
            "RGB = Combined image, can be RGB or HSO.<br>" +
            "HT = Histogram Transformation, imnage is manually streched to non-liner state.<br>" +
            "BE = Background Extracted, for example manual DBE is run on image.<br>" +
            "</p>";
      this.autoContinueButton.onClick = function()
      {
            console.writeln("autoContinue");

            // Do not create subdirectory strucure with AutoContinue

            clearDefaultDirs();
            batch_narrowband_palette_mode = isbatchNarrowbandPaletteMode();
            haveIconized = 0;
            try {
                  autocontinue_narrowband = is_narrowband_option();
                  if (batch_narrowband_palette_mode) {
                        AutoIntegrateNarrowbandPaletteBatch(true);
                  } else {
                        columnCount = findPrefixIndex(win_prefix);
                        if (columnCount == -1) {
                              iconStartRow = 0;
                              columnCount = findNewPrefixIndex();
                        } else {
                              // With AutoContinue start icons below current
                              // icons.
                              iconStartRow = prefixArray[columnCount][1];
                        }
                        AutoIntegrateEngine(true);
                  }
                  autocontinue_narrowband = false;
                  setDefaultDirs();
                  if (haveIconized) {
                        // We have iconized something so update prefix array
                        prefixArray[columnCount] = [ win_prefix, Math.max(haveIconized, iconStartRow) ];
                        //this.dialog.columnCountControlSpinBox.value = columnCount + 1;
                        saveSettings();
                  }
            }
            catch(err) {
                  console.criticalln(err);
                  console.criticalln("Processing stopped!");
                  writeProcessingSteps(null, true, null);
                  autocontinue_narrowband = false;
                  setDefaultDirs();
            }
      };   

      // Button to close all windows
      this.closeAllButton = new PushButton( this );
      this.closeAllButton.text = "Close all";
      this.closeAllButton.toolTip = "<p>Close all image windows created by this script</p>" +
                                    "<p>If Window Prefix is used then all windows with that prefix are closed. " +
                                    "To close all windows with all prefixes use button Close all prefixes</p>";
      this.closeAllButton.onClick = function()
      {
            console.writeln("closeAll");
            // Close all using the current win_prefix
            closeAllWindows(par.keep_integrated_images.val);
            columnCount = findPrefixIndex(win_prefix);
            if (columnCount != -1) {
                  // If prefix was found update array
                  if (par.keep_integrated_images.val) {
                        // If we keep integrated images then we can start
                        // from zero icon position
                        prefixArray[columnCount][1] = 0;
                  } else {
                        // Mark closed position as empty/free
                        prefixArray[columnCount] = [ '-', 0 ];
                        // Clear tail of array
                        while (prefixArray.length > 0 && prefixArray[prefixArray.length - 1][0] == '-') {
                              prefixArray.pop();
                        }
                  }
                  saveSettings();
                  //this.dialog.columnCountControlSpinBox.value = columnCount + 1;
            }
      };

      closeAllPrefixButton = new PushButton( this );
      closeAllPrefixButton.text = "Close all prefixes";
      closeAllPrefixButton.toolTip = "Updated in function setWindowPrefixHelpTip";
      closeAllPrefixButton.onClick = function()
      {
            console.writeln("closeAllPrefix");
            try {
                  // Always close default/empty prefix
                  // For delete to work we need to update fixed window
                  // names with the prefix we use for closing
                  fixAllWindowArrays("");
                  closeAllWindows(par.keep_integrated_images.val);
                  if (win_prefix != "" && findPrefixIndex(win_prefix) == -1) {
                        // Window prefix box has unsaved prefix, clear that too.
                        fixAllWindowArrays(win_prefix);
                        closeAllWindows(par.keep_integrated_images.val);
                  }
                  // Go through the prefix list
                  for (columnCount = 0; columnCount < prefixArray.length; columnCount++) {
                        if (prefixArray[columnCount][0] != '-') {
                              console.writeln("Close prefix '" + prefixArray[columnCount][0] + "'");
                              fixAllWindowArrays(prefixArray[columnCount][0]);
                              closeAllWindows(par.keep_integrated_images.val);
                              if (par.keep_integrated_images.val) {
                                    prefixArray[columnCount][1] = 0;
                              } else {
                                    prefixArray[columnCount] = [ '-', 0 ];
                              }
                        }
                  }
                  // Remove empty/free positions at the tail of the array
                  while (prefixArray.length > 0 && prefixArray[prefixArray.length - 1][0] == '-') {
                        prefixArray.pop();
                  }
            }  catch (x) {
                  console.writeln( x );
             }
            saveSettings();
            // restore original prefix
            fixAllWindowArrays(win_prefix);
      };

      /* Using new prefix array so this code is not needed.
      this.columnCountControlLabel = new Label( this );
      this.columnCountControlLabel.text = "Icon Column ";
      this.columnCountControlLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      this.columnCountControlLabel.toolTip = "<p>Set Icon Column for next run.</p> " + 
                                             "<p>This keeps window icons from piling up on top of one another, " +
                                             "as you change prefixes and run again.</p>" +
                                             "Set to 1 if you have removed all the icons " + 
                                             "created by AutoIntegrate or changed to a fresh workspace. " + 
                                             "<p>Set to a free column if you have deleted a column of icons by hand.</p>" + 
                                             "<p>Left alone the script will manage the value, incrementing after each run, " +
                                             "decrementing if you close all windows, " +
                                             "and saving the value between script invocations.</p>";
      this.columnCountControlSpinBox = new SpinBox( this );
      this.columnCountControlSpinBox.minValue = 1;
      this.columnCountControlSpinBox.maxValue = 10;
      this.columnCountControlSpinBox.value = columnCount + 1;
      this.columnCountControlSpinBox.toolTip = this.columnCountControlLabel.toolTip;
      this.columnCountControlSpinBox.onValueUpdated = function( value )
      {
            columnCount = value - 1;
      };
      */

      // Group box for AutoContinue and CloseAll
      this.autoButtonSizer = new HorizontalSizer;
      this.autoButtonSizer.add( this.autoContinueButton );
      this.autoButtonSizer.addSpacing( 4 );
      this.autoButtonSizer.add( this.closeAllButton );
      this.autoButtonSizer.addSpacing ( 250 );
      this.autoButtonSizer.add( closeAllPrefixButton );
      //this.autoButtonSizer.add (this.columnCountControlLabel );
      //this.autoButtonSizer.add (this.columnCountControlSpinBox );
      this.autoButtonGroupBox = new newGroupBox( this );
      this.autoButtonGroupBox.sizer = new HorizontalSizer;
      this.autoButtonGroupBox.sizer.margin = 6;
      this.autoButtonGroupBox.sizer.spacing = 4;
      this.autoButtonGroupBox.sizer.add( this.autoButtonSizer );
      this.autoButtonGroupBox.sizer.addStretch();
      //this.autoButtonGroupBox.setFixedHeight(60);

      // Buttons for saving final images in different formats
      this.mosaicSaveXisfButton = new PushButton( this );
      this.mosaicSaveXisfButton.text = "XISF";
      this.mosaicSaveXisfButton.onClick = function()
      {
            console.writeln("Save XISF");
            saveAllFinalImageWindows(32);
      };   
      this.mosaicSave16bitButton = new PushButton( this );
      this.mosaicSave16bitButton.text = "16 bit TIFF";
      this.mosaicSave16bitButton.onClick = function()
      {
            console.writeln("Save 16 bit TIFF");
            saveAllFinalImageWindows(16);
      };   
      this.mosaicSave8bitButton = new PushButton( this );
      this.mosaicSave8bitButton.text = "8 bit TIFF";
      this.mosaicSave8bitButton.onClick = function()
      {
            console.writeln("Save 8 bit TIFF");
            saveAllFinalImageWindows(8);
      };   
      this.mosaicSaveSizer = new HorizontalSizer;
      this.mosaicSaveSizer.add( this.mosaicSaveXisfButton );
      this.mosaicSaveSizer.addSpacing( 4 );
      this.mosaicSaveSizer.add( this.mosaicSave16bitButton );
      this.mosaicSaveSizer.addSpacing( 4 );
      this.mosaicSaveSizer.add( this.mosaicSave8bitButton );
      this.mosaicSaveGroupBox = new newGroupBox( this );
      this.mosaicSaveGroupBox.title = "Save final image files";
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
            haveIconized = 0;
            columnCount = findPrefixIndex(win_prefix);
            if (columnCount == -1) {
                  columnCount = findNewPrefixIndex();
            }
            iconStartRow = 0;
            Autorun(this);
            if (haveIconized) {
                  // We have iconized something so update prefix array
                  prefixArray[columnCount] = [ win_prefix, haveIconized ];
                  //this.dialog.columnCountControlSpinBox.value = columnCount + 1;
                  saveSettings();
            }
      };
   
      this.cancel_Button = new PushButton( this );
      this.cancel_Button.text = "Exit";
      this.cancel_Button.icon = this.scaledResource( ":/icons/close.png" );
      this.cancel_Button.onClick = function()
      {
         // save prefix setting at the end
         saveSettings();
         this.dialog.cancel();
      };
   
      this.newInstance_Button = new ToolButton(this);
      this.newInstance_Button.icon = new Bitmap( ":/process-interface/new-instance.png" );
      this.newInstance_Button.toolTip = "New Instance";
      this.newInstance_Button.onMousePress = function()
      {
         this.hasFocus = true;
         exportParameters();
         this.pushed = false;
         this.dialog.newInstance();
      };
   
      this.infoLabel = new Label( this );
      this.infoLabel.text = "";

      infoLabel = this.infoLabel;

      this.buttons_Sizer = new HorizontalSizer;
      this.buttons_Sizer.spacing = 6;
      this.buttons_Sizer.add( this.newInstance_Button );
      this.buttons_Sizer.add( this.infoLabel );
      this.buttons_Sizer.addStretch();
      this.buttons_Sizer.add( this.ok_Button );
      this.buttons_Sizer.add( this.cancel_Button );
      this.buttons_Sizer.add( this.helpTips );

      this.ProcessingControl1 = new Control( this );
      this.ProcessingControl1.sizer = new VerticalSizer;
      this.ProcessingControl1.sizer.margin = 6;
      this.ProcessingControl1.sizer.spacing = 4;
      this.ProcessingControl1.sizer.add( this.saturationGroupBoxLabel );
      this.ProcessingControl1.sizer.add( this.saturationGroupBoxSizer );
      this.ProcessingControl1.sizer.add( this.noiseReductionGroupBoxLabel );
      this.ProcessingControl1.sizer.add( this.noiseReductionGroupBoxSizer );
      // hide this section by default
      this.ProcessingControl1.visible = false;

      this.ProcessingControl2 = new Control( this );
      this.ProcessingControl2.sizer = new VerticalSizer;
      this.ProcessingControl2.sizer.margin = 6;
      this.ProcessingControl2.sizer.spacing = 4;
      this.ProcessingControl2.sizer.add( this.linearFitGroupBoxLabel );
      this.ProcessingControl2.sizer.add( this.linearFitGroupBoxSizer );
      this.ProcessingControl2.sizer.add( this.StretchingGroupBoxLabel );
      this.ProcessingControl2.sizer.add( this.StretchingGroupBoxSizer );
      // hide this section by default
      this.ProcessingControl2.visible = false;

      this.ProcessingControl3 = new Control( this );
      this.ProcessingControl3.sizer = new VerticalSizer;
      this.ProcessingControl3.sizer.margin = 6;
      this.ProcessingControl3.sizer.spacing = 4;
      this.ProcessingControl3.sizer.add( this.weightAndSigmaSizer );
      this.ProcessingControl3.sizer.add( this.clippingGroupBoxLabel );
      this.ProcessingControl3.sizer.add( this.clippingGroupBoxSizer );
      this.ProcessingControl3.sizer.add( this.LRGBCombinationGroupBoxLabel );
      this.ProcessingControl3.sizer.add( this.LRGBCombinationGroupBoxSizer );
      // hide this section by default
      this.ProcessingControl3.visible = false;

      this.ProcessingGroupBox = aiSectionBar(this, this.ProcessingControl1, "Processing settings, saturation and noise");
      aiSectionBarAdd(this, this.ProcessingGroupBox, this.ProcessingControl2, "Processing settings, linear fit and stretching");
      aiSectionBarAdd(this, this.ProcessingGroupBox, this.ProcessingControl3, "Processing settings, other");

      this.col1 = new VerticalSizer;
      this.col1.margin = 6;
      this.col1.spacing = 6;
      this.col1.add( this.imageParamsGroupBox );
      this.col1.add( this.otherParamsGroupBox );
      this.col1.add( this.ProcessingGroupBox );
      this.col1.add( this.mosaicSaveGroupBox );
      this.col1.addStretch();

      this.col2 = new VerticalSizer;
      this.col2.margin = 6;
      this.col2.spacing = 6;
      this.col2.add( this.narrowbandGroupBox );
      this.col2.add( this.narrowbandRGBmappingGroupBox );
      this.col2.add( this.extraGroupBox );
      this.col2.add( this.autoButtonGroupBox );
      this.col2.addStretch();

      this.cols = new HorizontalSizer;
      this.cols.margin = 6;
      this.cols.spacing = 6;
      this.cols.add( this.col1 );
      this.cols.add( this.col2 );
      this.cols.addStretch();

      /* ------------------------------- */

      this.sizer = new VerticalSizer;
      this.sizer.add( this.tabBox, 300 );
      this.sizer.add( this.filesButtonsSizer);
      this.sizer.margin = 6;
      this.sizer.spacing = 6;
      this.sizer.add( this.cols );
      this.sizer.add( this.buttons_Sizer );
      this.sizer.addStretch();

      // Version number
      this.windowTitle = "AutoIntegrate v1.11 (prefix-array)";
      this.userResizable = true;
      this.adjustToContents();
      //this.files_GroupBox.setFixedHeight();

      setWindowPrefixHelpTip();

      console.show(false);
}

AutoIntegrateDialog.prototype = new Dialog;

function main()
{
      setDefaultDirs();

       try {
            // Read prefix info. We use new setting names to avoid conflict with
            // older columnCOunt/winPrefix names
            var tempSetting = Settings.read(SETTINGSKEY + "/prefixName", DataType_String);
            if (Settings.lastReadOK) {
                  win_prefix = tempSetting;
            }
            var tempSetting  = Settings.read(SETTINGSKEY + "/prefixArray", DataType_String);
            if (Settings.lastReadOK) {
                  prefixArray = JSON.parse(tempSetting);
            }
            fixAllWindowArrays(win_prefix);
            last_win_prefix = win_prefix;
            console.noteln("AutoIntegrate: Restored window prefix '" + win_prefix + "' and prefix array " + JSON.stringify(prefixArray) + " from settings.");
      }
      catch (x) {
            console.writeln( x );
      }


      if (Parameters.isGlobalTarget || Parameters.isViewTarget) {
            importParameters();
      }
      
      var dialog = new AutoIntegrateDialog();

      dialog.execute();
}

main();
