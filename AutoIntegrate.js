/*

Script to automate initial steps of image processing in PixInsight.

Script has a GUI interface where some processing options can be selected.

In the end there will be integrated light files and automatically
processed final image. Both LRGB and color files are accepted.

Clicking button AutoRun on GUI all the following steps 1-16 listed below are performed.

It is possible to rerun the script by clicking button AutoContinue with following steps if there are
manually created images:
- L_HT + RGB_HT
  LRGB image with HistogramTransformation already done, the script starts with step 9.
- RGB_HT
  Color (RGB) image with HistogramTransformation already done, the script starts with step 12.
- Integration_L_DBE + Integration_RGB_DBE
  LRGB image background extracted, the script starts with step 8.
- Integration_RGB_DBE
  Color (RGB) image background extracted, the script starts with step 11.
- Integration_L_DBE + Integration_R_DBE + Integration_G_DBE + Integration_B_DBE
  LRGB image background extracted before image integration, the script starts with step 5b.
- Integration_L + Integration_R + Integration_G + Integration_B
  LRGB image with integrated L,R,G,B images (maybe e.g. cropped), the script starts with step 5a.

This scripts does the following steps:

1. Opens a file dialog. On that select all *.fit files. Both LRGB and color
   files can be used.
2a. SubframeSelector is run on .fit files to measure and generate SSWEIGHT for
    each file. Output is *_a.xisf files.
2b. Files are scanned and the file with highest SSWEIGHT is selected as a
   reference.
3. Files are assumed to have a FILTER keyword that tells if a file
   is Luminance, Red, Green or Blue channel. Otherwise the file is
   considered a color file.
4. StarAlign is run on all files and *_a_r.xisf files are
   generated.
5. ImageIntegration is run on LRGB or color *_a_r.xisf files.
   Rejection method is chosen dynamically based on the number of image files.
   (Optionally there is LocalNormalization before ImageIntegration but
   that does not seem to produce good results. There must be a bug...)
   After this step there are Integrate_L, Integrate_R, Integrate_G, Integrate_B and 
   Integrate_RGB images in case of LRGB files or Integrate_RGB image in case of color 
   files.
5a. If BE_before_channel_combination then ABE is run on each color channel (LRGB)
5b. If use_linear_fit is set then Linear fir is done on RGB channels using L as a reference
6. ChannelCombination is run on Red, Green and Blue integrated images to
   create an RGB image. After that there is one L and  one RGB image or
   just an RGB image if files were color files.
7. AutomaticBackgroundExtraction is run on L and RGB images.
8. Autostretch is run on L and RGB images and that is used as an input
   to HistogramTransform.
9. Mask is created as a copy of stretched L image or stretched and grayscale
   converted color RGB image.
10. MultiscaleLinearTransform is run on L image or color RGB image to reduce noise.
    Mask is used to target noise reduction more on the background.
11. ColorCalibration is run on RGB image.
12. Slight CurvesTransformation is run on RGB image to increase saturation.
13. If there are both L and RGB images then LRGBCombination is run to generate final
    LRGB image.
14. SCNR is run on (L)RGB image to reduce green cast.
15. MultiscaleLinearTransform is run to sharpen the image. A mask is used to target
    sharpening more on the light parts of the image.
16. Extra windows are closed or hidden.

Written by Jarmo Ruuth, 2018-2019.

Routine ApplyAutoSTF is written by Juan Conejero (PTeam),
Copyright (C) 2010-2013 Pleiades Astrophoto.

Routine applySTF is originally made by Silvercup, heavily modified
by roryt (Ioannis Ioannou).

PixInsight scripts that come with the product were a great help.
Web site Light Vortex Astronomy (http://www.lightvortexastronomy.com/)
was a great place to find details and best practises when using PixInsight.

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

var test_mode = false;

var close_windows = false;
var use_local_normalization = false;            /* color problems, maybe should be used only for L images */
var same_stf_for_all_images = false;            /* does not work, colors go bad */
var BE_before_channel_combination = false;
var use_linear_fit = true;
var use_noise_reduction_on_all_channels = false;
var hide_console = true;
var integrate_only = false;
var run_subframeselector = true;
var increase_saturation = true;
var relaxed_StarAlign = false;
var keep_integrated_images = false;
var run_HT = true;
var skip_ABE = false;

var dialogFileNames = null;
var all_files;
var best_ssweight = 0;
var best_image = null;
var best_l_ssweight = 0;
var best_l_image = null;
var best_r_ssweight = 0;
var best_r_image = null;
var best_g_ssweight = 0;
var best_g_image = null;
var best_b_ssweight = 0;
var best_b_image = null;
var best_c_ssweight = 0;
var best_c_image = null;
var luminance_images;
var red_images;
var green_images;
var blue_images;
var color_images;

var processing_steps = "";
var all_windows = new Array;
var iconPoint;

var testModefileNames = [
      "m17_20180909_224950_0_8lxvv6_l_cal_a.fit",
      "m17_20180909_225110_1_dzezji_l_cal_a.fit",
      "m17_20180909_225231_3_dbdaah_l_cal_a.fit",
      "m17_20180909_225401_2_lgndgd_r_cal_a.fit",
      "m17_20180909_225527_2_enoohu_g_cal_a.fit",
      "m17_20180909_225655_2_ygleft_b_cal_a.fit"
];

// known window names
var integration_LRGB_windows = [
      "Integration_L",
      "Integration_R",
      "Integration_G",
      "Integration_B"
];

var integration_color_windows = [
      "Integration_RGB"
];

var fixed_windows = [
      "Integration_L_ABE",
      "Integration_R_ABE",
      "Integration_G_ABE",
      "Integration_B_ABE",
      "Integration_RGB_ABE",
      "Integration_L_ABE_HT",
      "Integration_RGB_ABE_HT",
      "Integration_L_noABE",
      "Integration_R_noABE",
      "Integration_G_noABE",
      "Integration_B_noABE",
      "Integration_RGB_noABE",
      "Integration_L_noABE_HT",
      "Integration_RGB_noABE_HT",
      "L_BE_HT",
      "RGB_BE_HT",
      "AutoMask",
      "AutoLRGB_ABE",
      "AutoRGB_ABE",
      "AutoLRGB_noABE",
      "AutoRGB_noABE"
];

function addProcessingStep(txt)
{
      console.noteln(txt);
      processing_steps = processing_steps + "\n" + txt;
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
      for (var i in images) {
            if (images[i].mainView.id == id) {
               return images[i];
         }
      }
      return null;
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
            w.close();
      }
}

function windowIconizeif(id)
{
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

function windowRename(old_name, new_name)
{
      var w = ImageWindow.windowById(old_name);
      w.mainView.id = new_name;
      addScriptWindow(new_name);
      return w.mainView.id;
}

function addScriptWindow(name)
{
      all_windows[all_windows.length] = name;
}

// close all windows created by this script
function closeAllWindowsFromArray(arr)
{
      for (var i = 0; i < arr.length; i++) {
            var w = findWindow(arr[i]);
            if (w != null) {
                  w.forceClose();
            }
      }
}

function closeAllWindows()
{
      closeAllWindowsFromArray(all_windows);
      if (keep_integrated_images) {
            if (findWindow(integration_LRGB_windows[0]) != null) {
                  // we have LRGB images
                  closeAllWindowsFromArray(integration_color_windows);
            } else {
                  // we have color image
                  closeAllWindowsFromArray(integration_LRGB_windows);
            }
      } else {
            closeAllWindowsFromArray(integration_LRGB_windows);
            closeAllWindowsFromArray(integration_color_windows);
      }
      closeAllWindowsFromArray(fixed_windows);
}

function copyView(sourceView, name)
{
      var targetView = new ImageWindow(
                              sourceView.mainView.image.width,
                              sourceView.mainView.image.height,
                              sourceView.mainView.image.numberOfChannels,
                              sourceView.mainView.window.bitsPerSample,
                              sourceView.mainView.window.isFloatSample,
                              sourceView.mainView.image.colorSpace != ColorSpace_Gray,
                              name);
      targetView.mainView.beginProcess(UndoFlag_NoSwapFile);
      targetView.mainView.image.assign(sourceView.mainView.image);
      targetView.mainView.endProcess();

      targetView.show();

      addScriptWindow(name);

      return targetView;
}

function newMaskView(sourceView, name)
{
      /* Default mask is the same as stretched image. */
      var targetView = copyView(sourceView, name);

      if (targetView.mainView.image.colorSpace != ColorSpace_Gray) {
            /* If we have color files we use gray scale converted
               image as a mask.
            */
           addProcessingStep("Create mask using grayscale converted color image "+ sourceView.mainView.id);
           var P = new ConvertToGrayscale;
            targetView.mainView.beginProcess(UndoFlag_NoSwapFile);
            P.executeOn(targetView.mainView);
            targetView.mainView.endProcess();
      } else {
            addProcessingStep("Create mask from image " + sourceView.mainView.id);
      }

      targetView.show();

      return targetView;
}

function openFitFiles()
{
      var filenames;
      var ofd = new OpenFileDialog;

      ofd.multipleSelections = true;
      ofd.caption = "Select Light Frames (*.fit)";
      ofd.loadImageFilters();

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

function setSSWEIGHT(imageWindow, SSWEIGHT) 
{
      var oldKeywords = [];
      var keywords = imageWindow.keywords;
      for (var i = 0; i != keywords.length; i++) {
            var keyword = keywords[i];
            if (keyword.name != "SSWEIGHT") {
                  oldKeywords[oldKeywords.length] = keyword;
            }
      }
      imageWindow.keywords = oldKeywords.concat([
         new FITSKeyword(
            "SSWEIGHT",
            SSWEIGHT.toFixed(3),
            "Image weight"
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
   

function SubframeSelectorMeasure(fileNames)
{
      console.noteln("SubframeSelectorMeasure");
      
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

      console.noteln("SubframeSelectorMeasure:executeGlobal");

      P.executeGlobal();

      console.noteln("SubframeSelectorMeasure:calculate weight");

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

      var ssFiles = new Array;

      for (var i = 0; i < P.measurements.length; i++) {
            var FWHM = P.measurements[i][indexFWHM];
            var Eccentricity = P.measurements[i][indexEccentricity];
            var SNRWeight = P.measurements[i][indexSNRWeight];
            var SSWEIGHT = (15*(1-(FWHM-FWHMMin)/(FWHMMax-FWHMMin)) + 
                           15*(1-(Eccentricity-EccentricityMin)/(EccentricityMax-EccentricityMin)) + 
                           20*(SNRWeight-SNRWeightMin)/(SNRWeightMax-SNRWeightMin))+
                           50;
            P.measurements[i][indexWeight] = SSWEIGHT;
            P.measurements[i][0] = true;
            P.measurements[i][1] = false;
            console.noteln(P.measurements[i][3]+" SSWEIGHT "+SSWEIGHT)
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
      
      var ssWeights = SubframeSelectorMeasure(fileNames);
      // SubframeSelectorOutput(P.measurements); Does not write weight keyword

      var ssFiles = new Array;

      for (var i = 0; i < ssWeights.length; i++) {
            var filePath = ssWeights[i][0];
            if (filePath != null && filePath != "") {
                  var SSWEIGHT = ssWeights[i][1];
                  var newFilePath = filePath.replace(".fit", "_a.xisf");
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
                  setSSWEIGHT(imageWindow, SSWEIGHT);
                  if (!writeImage(newFilePath, imageWindow)) {
                        console.writeln(
                           "*** Error: Can't write output image: ", newFilePath
                        );
                        continue;
                  }         
                  ssFiles[ssFiles.length] = newFilePath;
            }
      }
      console.noteln("runSubframeSelector:"+fileNames.length+"files");

      return ssFiles;
}

function findBestSSWEIGHT(fileNames)
{
      var ssweight;

      run_HT = true;

      /* Loop through files and find image with best SSWEIGHT.
       */
      addProcessingStep("Find best SSWEIGHT");
      var n = 0;
      var first_image = true;
      for (var i = 0; i < fileNames.length; i++) {
            var filter;
            var filePath = fileNames[i];
            var ext = '.' + filePath.split('.').pop();
            console.noteln("File " +  filePath + " ext " +  ext);
            if (ext.toUpperCase() == '.TIF' || ext.toUpperCase() == '.TIFF' ||
                ext.toUpperCase() == '.JPG')
            {
                  run_HT = false;
            }
            var F = new FileFormat(ext, true/*toRead*/, false/*toWrite*/);
            if (F.isNull) {
                  throw new Error("No installed file format can read \'" + ext + "\' files."); // shouldn't happen
            }
            var f = new FileFormatInstance(F);
            if (f.isNull) {
                  throw new Error("Unable to instantiate file format: " + F.name);
            }
            var info = f.open(filePath, "verbosity 0"); // do not fill the console with useless messages
            if (info.length <= 0) {
                  throw new Error("Unable to open input file: " + filePath);
            }
            var keywords = [];
            if (F.canStoreKeywords) {
                  keywords = f.keywords;
            }

            f.close();

            n++;

            var skip_this = false;
            
            // First check if we skip image since we do not know
            // the order for keywords
            for (var j = 0; j < keywords.length; j++) {
                  var value = keywords[j].strippedValue.trim();
                  switch (keywords[j].name) {
                        case "TELESCOP":
                              console.noteln("telescop=" +  value);
                              if (value.indexOf("T2-UWF") != -1) {
                                    skip_this = true;                                    
                              }
                              break;
                        default:
                              break;
                  }
            }
            if (!skip_this) {
                  for (var j = 0; j < keywords.length; j++) {
                        var value = keywords[j].strippedValue.trim();
                        switch (keywords[j].name) {
                              case "SSWEIGHT":
                                    ssweight = value;
                                    console.noteln("ssweight=" +  ssweight);
                                    if (first_image || parseFloat(ssweight) > parseFloat(best_ssweight)) {
                                          best_ssweight = ssweight;
                                          console.noteln("new best_ssweight=" +  best_ssweight);
                                          best_image = filePath;
                                          first_image = false;
                                    }
                                    break;
                              default:
                                    break;
                        }
                  }
            }
      }
      if (best_image == null) {
            console.noteln("Unable to find image with best SSWEIGHT, using first image");
            best_image = fileNames[0];
            best_ssweight = 1;
      }
      return best_image;
}

function findLRGBchannels(
      alignedFiles,
      luminance_images,
      red_images,
      green_images,
      blue_images,
      color_images)
{
      /* Loop through aligned files and find different channels.
       */
      addProcessingStep("Find L,R,G,B channels");

      best_l_image = null;
      best_r_image = null;
      best_g_image = null;
      best_b_image = null;
      best_c_image = null;

      var n = 0;
      for (var i = 0; i < alignedFiles.length; i++) {
            var filter;
            var ssweight;
            var filePath = alignedFiles[i];
            console.noteln("findLRGBchannels file " +  filePath);
            var ext = ".xisf";
            var F = new FileFormat(ext, true/*toRead*/, false/*toWrite*/);
            if (F.isNull) {
                  throw new Error("No installed file format can read \'" + ext + "\' files."); // shouldn't happen
            }
            var f = new FileFormatInstance(F);
            if (f.isNull) {
                  throw new Error("Unable to instantiate file format: " + F.name);
            }
            var info = f.open(filePath, "verbosity 0"); // do not fill the console with useless messages
            if (info.length <= 0) {
                  throw new Error("Unable to open input file: " + filePath);
            }
            var keywords = [];
            if (F.canStoreKeywords) {
                  keywords = f.keywords;
            }
            f.close();

            filter = 'Color';
            var skip_this = false;

            n++;
            for (var j = 0; j < keywords.length; j++) {
                  var value = keywords[j].strippedValue.trim();
                  switch (keywords[j].name) {
                        case "FILTER":
                              console.noteln("filter=" +  value);
                              filter = value;
                              break;
                        case "SSWEIGHT":
                              ssweight = value;
                              console.noteln("ssweight=" +  ssweight);
                              break;
                        case "TELESCOP":
                              console.noteln("telescop=" +  value);
                              if (value.indexOf("T2-UWF") != -1) {
                                    skip_this = true;                                    
                              }
                              break;
                        default:
                              break;
                  }
            }
            if (skip_this) {
                  filter = "skip";
            }

            switch (filter) {
                  case 'Luminance':
                        if (best_l_image == null || parseFloat(ssweight) >= parseFloat(best_l_ssweight)) {
                              /* Add best images first in the array. */
                              best_l_ssweight = ssweight;
                              console.noteln("new best_l_ssweight=" +  parseFloat(best_l_ssweight));
                              best_l_image = filePath;
                              insert_image_for_integrate(luminance_images, filePath);
                        } else {
                              append_image_for_integrate(luminance_images, filePath);
                        }
                        break;
                  case 'Red':
                        if (best_r_image == null || parseFloat(ssweight) >= parseFloat(best_r_ssweight)) {
                              /* Add best images first in the array. */
                              best_r_ssweight = ssweight;
                              console.noteln("new best_r_ssweight=" +  best_r_ssweight);
                              best_r_image = filePath;
                              insert_image_for_integrate(red_images, filePath);
                        } else {
                              append_image_for_integrate(red_images, filePath);
                        }
                        break;
                  case 'Green':
                        if (best_g_image == null || parseFloat(ssweight) >= parseFloat(best_g_ssweight)) {
                              /* Add best images first in the array. */
                              best_g_ssweight = ssweight;
                              console.noteln("new best_g_ssweight=" +  best_g_ssweight);
                              best_g_image = filePath;
                              insert_image_for_integrate(green_images, filePath);
                        } else {
                              append_image_for_integrate(green_images, filePath);
                        }
                        break;
                  case 'Blue':
                        if (best_b_image == null || parseFloat(ssweight) >= parseFloat(best_b_ssweight)) {
                              /* Add best images first in the array. */
                              best_b_ssweight = ssweight;
                              console.noteln("new best_b_ssweight=" +  best_b_ssweight);
                              best_b_image = filePath;
                              insert_image_for_integrate(blue_images, filePath);
                        } else {
                              append_image_for_integrate(blue_images, filePath);
                        }
                        break;
                  case 'Color':
                        if (best_c_image == null || parseFloat(ssweight) >= parseFloat(best_c_ssweight)) {
                              /* Add best images first in the array. */
                              best_c_ssweight = ssweight;
                              console.noteln("new best_c_ssweight=" +  best_c_ssweight);
                              best_c_image = filePath;
                              insert_image_for_integrate(color_images, filePath);
                        } else {
                              append_image_for_integrate(color_images, filePath);
                        }
                        break;
                  default:
                        /* Assume color files.*/
                        if (best_c_image == null) {
                              /* Add best images first in the array. */
                              best_c_ssweight = 1;
                              console.noteln("new best_c_ssweight=" +  best_c_ssweight);
                              best_c_image = filePath;
                              insert_image_for_integrate(color_images, filePath);
                        } else {
                              append_image_for_integrate(color_images, filePath);
                        }
                        break;
            }
      }
      if (color_images.length > 0) {
            if (luminance_images.length > 0) {
                  throw new Error("Cannot mix color and luminance filter files");
            }
            if (red_images.length > 0) {
                  throw new Error("Cannot mix color and red filter files");
            }
            if (blue_images.length > 0) {
                  throw new Error("Cannot mix color and blue filter files");
            }
            if (green_images.length > 0) {
                  throw new Error("Cannot mix color and green filter files");
            }
      } else {
            if (luminance_images.length == 0) {
                  throw new Error("No Luminance images found");
            }
            if (red_images.length == 0) {
                  throw new Error("No Red images found");
            }
            if (blue_images.length == 0) {
                  throw new Error("No Blue images found");
            }
            if (green_images.length == 0) {
                  throw new Error("No Green images found");
            }
      }
}

function insert_image_for_integrate(images, new_image)
{
      images.unshift(new Array(2));
      images[0][0] = true;
      images[0][1] = new_image;
}

function append_image_for_integrate(images, new_image)
{
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
      var P = new StarAlignment;
      var targets = new Array;

      for (var i = 0; i < imagetable.length; i++) {
            var oneimage = new Array(3);
            oneimage[0] = true;
            oneimage[1] = true;
            oneimage[2] = imagetable[i];
            targets[targets.length] = oneimage;
      }

      if (relaxed_StarAlign) {
            P.structureLayers = 6;
      } else {
            P.structureLayers = 5;
      }
      P.noiseLayers = 0;
      P.hotPixelFilterRadius = 1;
      P.noiseReductionFilterRadius = 0;
      if (relaxed_StarAlign) {
            P.sensitivity = 0.010;
      } else {
            P.sensitivity = 0.100;
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
      if (relaxed_StarAlign) {
            P.ransacTolerance = 6.00;
            P.ransacMaxIterations = 3000;
      } else {
            P.ransacTolerance = 2.00;
            P.ransacMaxIterations = 2000;
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
      P.generateDrizzleData = false;
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

      console.noteln("runStarAlignment, output " + alignedFiles.length + " files");

      return alignedFiles;
}

function runLocalNormalization(imagetable, refImage)
{
      if (!use_local_normalization) {
            addProcessingStep("Do not run local normalization");
            return;
      }
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
      P.fileThreadOverload = 1.20;
      P.maxFileReadThreads = 1;
      P.maxFileWriteThreads = 1;
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
      var targetWin = ImageWindow.windowById(targetId);
      var P = new LinearFit;
      P.referenceViewId = refViewId;
      P.rejectLow = 0.000000;
      P.rejectHigh = 0.920000;

      targetWin.mainView.beginProcess(UndoFlag_NoSwapFile);
      P.executeOn(targetWin.mainView);
      targetWin.mainView.endProcess();
}

function runImageIntegration(images, name)
{
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

      var II = new ImageIntegration;

      II.evaluateNoise = true;
      if (images.length < 8) {
            addProcessingStep("  Using percentile clip for rejection");
            II.rejection = ImageIntegration.prototype.PercentileClip;
      } else {
            addProcessingStep("  Using sigma clip for rejection");
            II.rejection = ImageIntegration.prototype.SigmaClip;
      }
      II.images = images;

      II.executeGlobal();

      windowCloseif(II.highRejectionMapImageId);
      windowCloseif(II.lowRejectionMapImageId);

      var new_name = windowRename(II.integrationImageId, "Integration_" + name);
      //addScriptWindow(new_name);
      return new_name
}

function runImageIntegrationNormalized(images, name)
{
      addProcessingStep("  Using local normalized data in integrate");
      var norm_images = new Array;
      for (var i = 0; i < images.length; i++) {
            var oneimage = new Array(4);
            oneimage[0] = true;                                   // enabled
            oneimage[1] = images[i][1];                           // path
            oneimage[2] = "";                                     // drizzlePath
            oneimage[3] = images[i][1].replace(".xisf", ".xnml");    // localNormalizationDataPath
            norm_images[norm_images.length] = oneimage;
      }
      var P = new ImageIntegration;
      P.images = norm_images;
      P.inputHints = "";
      P.combination = ImageIntegration.prototype.Average;
      P.weightMode = ImageIntegration.prototype.KeywordWeight;
      P.weightKeyword = "SSWEIGHT";
      P.weightScale = ImageIntegration.prototype.WeightScale_IKSS;
      P.ignoreNoiseKeywords = false;
      P.normalization = ImageIntegration.prototype.LocalNormalization;
      if (images.length < 8) {
            addProcessingStep("  Using percentile clip for rejection");
            P.rejection = ImageIntegration.prototype.PercentileClip;
      } else {
            addProcessingStep("  Using sigma clip for rejection");
            P.rejection = ImageIntegration.prototype.SigmaClip;
      }
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

      var new_name = windowRename(P.integrationImageId, "Integration_" + name);
      //addScriptWindow(new_name);
      return new_name
}

function runABE(win, target_id)
{
      if (skip_ABE) {
            var noABE_id = win.mainView.id + "_noABE";
            addProcessingStep("No ABE for " + win.mainView.id);
            addScriptWindow(noABE_id);
            copyView(win, noABE_id);
            return noABE_id;
      }
      addProcessingStep("ABE from " + win.mainView.id);
      var ABE_id = win.mainView.id + "_ABE";
      var ABE = new AutomaticBackgroundExtractor;

      console.noteln("runABE, target_id " + ABE_id);

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

/* ApplyAutoSTF routine is from AutoSTF.js
 *
 * Written by Juan Conejero (PTeam)<br/>\
 * Copyright (C) 2010-2013 Pleiades Astrophoto
 */
function ApplyAutoSTF(view, shadowsClipping, targetBackground, rgbLinked)
{
   addProcessingStep("  Apply AutoSTF on " + view.id);
   var stf = new ScreenTransferFunction;

   var n = view.image.isColor ? 3 : 1;

   var median = view.computeOrFetchProperty("Median");

   var mad = view.computeOrFetchProperty("MAD");
   mad.mul(1.4826); // coherent with a normal distribution

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

/* applySTF routine is from NBRGBCombination.js
 *
 * That file is originally made by Silvercup
 * heavily modified by roryt (Ioannis Ioannou)
 */
function applySTF(imgView, stf)
{
      addProcessingStep("  Apply STF on " + imgView.id);
      var HT = new HistogramTransformation;
      if (imgView.isColor) {
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

function runHistogramTransform(ABE_win, stf_to_use)
{
      if (!run_HT) {
            addProcessingStep("Do not run histogram transform on " + ABE_win.mainView.id);
            return null;
      }
      addProcessingStep("Run histogram transform on " + ABE_win.mainView.id);

      if (stf_to_use == null) {
            /* Apply autostrech on image */
            ApplyAutoSTF(ABE_win.mainView,
                        DEFAULT_AUTOSTRETCH_SCLIP,
                        DEFAULT_AUTOSTRETCH_TBGND,
                        DEFAULT_AUTOSTRETCH_CLINK);
            stf_to_use = ABE_win.mainView.stf;
      }

      /* Run histogram transfer function based on autostretch */
      applySTF(ABE_win.mainView, stf_to_use);

      /* Undo autostretch */
      addProcessingStep("  Undo STF on " + ABE_win.mainView.id);
      var stf = new ScreenTransferFunction;

      ABE_win.mainView.beginProcess(UndoFlag_NoSwapFile);

      stf.executeOn(ABE_win.mainView);

      ABE_win.mainView.endProcess();

      return stf_to_use;
}

function runMultiscaleLinearTransformReduceNoise(imgView, MaskView)
{
      addProcessingStep("Noise reduction on " + imgView.mainView.id + " using mask " + MaskView.mainView.id);
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

      imgView.mainView.beginProcess(UndoFlag_NoSwapFile);

      /* Remove noise from dark parts of the image. */
      imgView.setMask(MaskView);
      imgView.maskInverted = true;

      P.executeOn(imgView.mainView, false);

      imgView.removeMask();

      imgView.mainView.endProcess();
}

function runColorCalibration(imgView)
{
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

function runCurvesTransformationSaturation(imgView)
{
      addProcessingStep("Curves transformation for saturation on " + imgView.id);
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

      imgView.beginProcess(UndoFlag_NoSwapFile);

      P.executeOn(imgView, false);

      imgView.endProcess();
}

function runLRGBCombination(RGBimgView, L_id)
{
      addProcessingStep("LRGB combination on " + RGBimgView.id + ", luminance image " + L_id);
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
}

function runSCNR(RGBimgView)
{
      addProcessingStep("SCNR on " + RGBimgView.id);
      var P = new SCNR;
      P.amount = 1.00;
      P.protectionMethod = SCNR.prototype.AverageNeutral;
      P.colorToRemove = SCNR.prototype.Green;
      P.preserveLightness = true;

      RGBimgView.beginProcess(UndoFlag_NoSwapFile);

      P.executeOn(RGBimgView, false);

      RGBimgView.endProcess();
}

function runMultiscaleLinearTransformSharpen(imgView, MaskView)
{
      addProcessingStep("Sharpening on " + imgView.mainView.id + " using mask " + MaskView.mainView.id);
      var P = new MultiscaleLinearTransform;
      P.layers = [ // enabled, biasEnabled, bias, noiseReductionEnabled, noiseReductionThreshold, noiseReductionAmount, noiseReductionIterations
            [true, true, 0.000, false, 3.000, 0.50, 3],
            [true, true, 0.050, false, 2.000, 0.50, 2],
            [true, true, 0.050, false, 1.000, 0.50, 2],
            [true, true, 0.000, false, 0.500, 0.50, 1],
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

      /* Sharpen only light parts of the image. */
      imgView.setMask(MaskView);
      imgView.maskInverted = false;

      P.executeOn(imgView.mainView, false);

      imgView.removeMask();

      imgView.mainView.endProcess();
}

function AutoIntegrateEngine(auto_continue)
{
      var alignedFiles;
      var mask_win;
      var mask_win_id;
      var RGB_win;
      var RGB_win_id;
      var color_files = false;
      var preprocessed_images;
      var L_ABE_id;
      var L_ABE_win;
      var L_ABE_HT_win;
      var L_ABE_HT_id;
      var L_HT_win;
      var RGB_ABE_id;
      var RGB_ABE_HT_id;
      var luminance_id = null;
      var red_id = null;
      var green_id = null;
      var blue_id = null;
      var R_ABE_id = null;
      var G_ABE_id = null;
      var B_ABE_id = null;
      var saved_BE_before_channel_combination = BE_before_channel_combination;

      console.show();

      console.noteln("Start main...");
      processing_steps = "";
      all_windows = new Array;
      iconPoint = null;

      /* First check if we have some processing done and we should continue
       * from the middle of the processing.
       */
      var start_images = {
            NONE : 0,
            L_R_G_B_DBE : 1,
            L_RGB_DBE : 2,
            RGB_DBE : 3,
            L_RGB_HT : 4,
            RGB_HT : 5,
            RGB_COLOR : 6,
            L_R_G_B : 7
      };

      /* Check if we have manual background extracted files. */
      var L_BE_win = findWindow("Integration_L_DBE");
      var R_BE_win = findWindow("Integration_R_DBE");
      var G_BE_win = findWindow("Integration_G_DBE");
      var B_BE_win = findWindow("Integration_B_DBE");
      var RGB_BE_win = findWindow("Integration_RGB_DBE");

      /* Check if we have manually done histogram transformation. */
      var L_HT_win = findWindow("L_HT");
      var RGB_HT_win = findWindow("RGB_HT");

      luminance_id = findWindowId("Integration_L");
      red_id = findWindowId("Integration_R");
      green_id = findWindowId("Integration_G");
      blue_id = findWindowId("Integration_B");
      color_id = findWindowId("Integration_RGB");

      /* Check if we have manually created mask. */
      var range_mask_win = null;

      if (winIsValid(L_HT_win) && winIsValid(RGB_HT_win)) {        /* L,RGB HistogramTransformation */
            preprocessed_images = start_images.L_RGB_HT;
      } else if (winIsValid(RGB_HT_win)) {                         /* RGB (color) HistogramTransformation */
            preprocessed_images = start_images.RGB_HT;
      } else if (winIsValid(L_BE_win) && winIsValid(RGB_BE_win)) { /* L,RGB background extracted */
            preprocessed_images = start_images.L_RGB_DBE;
      } else if (winIsValid(RGB_BE_win)) {                         /* RGB (color) background extracted */
            preprocessed_images = start_images.RGB_DBE;
      } else if (winIsValid(L_BE_win) && winIsValid(R_BE_win) &&   /* L,R,G,B background extracted */
                 winIsValid(G_BE_win) && winIsValid(B_BE_win)) {
            preprocessed_images = start_images.L_R_G_B_DBE;
            BE_before_channel_combination = true;
      } else if (color_id != null) {                              /* RGB (color) integrated image */
            preprocessed_images = start_images.RGB_COLOR;
      } else if (luminance_id != null && red_id != null &&
                 green_id != null && blue_id != null) {           /* L,R,G,B integrated images */
            preprocessed_images = start_images.L_R_G_B;
      } else {
            preprocessed_images = start_images.NONE;
      }

      if (auto_continue) {
          if (preprocessed_images == start_images.NONE) {
            addProcessingStep("No preprocessed images found, processing not started!");
            return;
          }
      } else {
            if (preprocessed_images != start_images.NONE) {
                  addProcessingStep("There are already preprocessed images, processing not started!");
                  addProcessingStep("Close or rename old images before continuing.");
                  return;
            }  
      }

      if (preprocessed_images != start_images.NONE) {
            addProcessingStep("Using preprocessed images " + preprocessed_images);
            console.noteln("L_BE_win="+L_BE_win);
            console.noteln("RGB_BE_win="+RGB_BE_win);
            console.noteln("L_HT_win="+L_HT_win);
            console.noteln("RGB_HT_win="+RGB_HT_win);
            if (preprocessed_images == start_images.RGB_DBE ||
                preprocessed_images == start_images.RGB_HT ||
                preprocessed_images == start_images.RGB_COLOR) 
            {
                  /* No L files, assume color. */
                  addProcessingStep("Processing as color images");
                  color_files = true;
            }
            if (preprocessed_images == start_images.RGB_COLOR) {
                  RGB_win = ImageWindow.windowById(color_id);
                  RGB_win_id = color_id;
            }
            /* Check if we have manually created mask. */
            mask_win_id = "range_mask";
            range_mask_win = findWindow(mask_win_id);
      } else {
            /* Open .fit files and run SubframeSelector on them
            * that assigns SSWEIGHT.
            */
            var fileNames;
            if (test_mode) {
                  addProcessingStep("Test mode");
                  fileNames = testModefileNames;
                  for (var i = 0; i < fileNames.length; i++) {
                        fileNames[i] = "c:\\Slooh\\Swan_Nebula_M17_T1\\" + fileNames[i];
                  }
            } else {
                  if (dialogFileNames == null) {
                        dialogFileNames = openFitFiles();
                        addProcessingStep("Get files from dialog");
                  }
                  if (dialogFileNames == null) {
                        console.noteln("No files to process");
                        return;
                  }
                  fileNames = dialogFileNames;
            }

            if (run_subframeselector) {
                  /* Run SubframeSelector that assigns SSWEIGHT for each file.
                  * Output is *_a.xisf files.
                  */
                  fileNames = runSubframeSelector(fileNames);
            }

            /* Find file with best SSWEIGHT to be used
            * as a reference image in StarAlign.
            */
            best_image = findBestSSWEIGHT(fileNames);

            /* StarAlign
            */
            alignedFiles = runStarAlignment(fileNames, best_image);

            /* LocalNormalization
            */
            runLocalNormalization(alignedFiles, best_image);

            /* Find files for each L, R, G and B channels, or color files.
            */
            luminance_images = new Array;
            red_images = new Array;
            green_images = new Array;
            blue_images = new Array;
            color_images = new Array;

            findLRGBchannels(
                  alignedFiles,
                  luminance_images,
                  red_images,
                  green_images,
                  blue_images,
                  color_images);

            /* ImageIntegration
            */
            if (color_images.length == 0) {
                  /* We have LRGB files. */
                  addProcessingStep("Processing as LRGB files");
                  color_files = false;

                  luminance_id = runImageIntegration(luminance_images, 'L');

                  red_id = runImageIntegration(red_images, 'R');
                  green_id = runImageIntegration(green_images, 'G');
                  blue_id = runImageIntegration(blue_images, 'B');

                  ImageWindow.windowById(red_id).show();
                  ImageWindow.windowById(green_id).show();
                  ImageWindow.windowById(blue_id).show();

            } else {
                  /* We have color files. */
                  addProcessingStep("Processing as color files");
                  color_files = true;
                  var color_id = runImageIntegration(color_images, 'RGB');
                  RGB_win = ImageWindow.windowById(color_id);
                  RGB_win.show();
                  RGB_win_id = color_id;
            }
      }

      /* Now we have L (Gray) and RGB images, or just RGB image
       * in case of color files.
       *
       * Next we apply ABE on both and use autostrech as
       * input for HistogramTransfer.
       *
       * We keep integrated L and RGB images so it is
       * possible to continue manually if automatic
       * processing is not good enough.
       */

      if (!integrate_only) {
            var L_stf = null;

            if (!color_files) {
                  /* LRGB files */
                  console.noteln("ABE L");
                  if (preprocessed_images == start_images.L_RGB_HT) {
                        /* We have run HistogramTransformation. */
                        addProcessingStep("Start from image " + L_HT_win.mainView.id);
                        L_ABE_HT_win = L_HT_win;
                        L_ABE_HT_id = L_HT_win.mainView.id;
                  } else {
                        if (preprocessed_images == start_images.L_RGB_DBE ||
                        preprocessed_images == start_images.L_R_G_B_DBE) 
                        {
                              /* We have background extracted from L. */
                              L_ABE_id = L_BE_win.mainView.id;
                              addProcessingStep("Start from image " + L_ABE_id);
                        } else {
                              var L_win = ImageWindow.windowById(luminance_id);

                              /* ABE on L
                              */
                              L_ABE_id = runABE(L_win);
                        }
                        /* On L image run HistogramTransform based on autostretch
                        */
                        L_ABE_HT_id = L_ABE_id + "_HT";
                        L_stf = runHistogramTransform(copyView(ImageWindow.windowById(L_ABE_id), L_ABE_HT_id), null);
                        if (!same_stf_for_all_images) {
                              L_stf = null;
                        }

                        L_ABE_win = ImageWindow.windowById(L_ABE_id);
                        L_ABE_HT_win = ImageWindow.windowById(L_ABE_HT_id);
                  }

                  if (winIsValid(range_mask_win)) {
                        /* We already have a mask. */
                        addProcessingStep("Use existing mask " + range_mask_win.mainView.id);
                        mask_win = range_mask_win;
                  } else {
                        /* Create mask for noise reduction and sharpening. */
                        mask_win_id = "AutoMask";
                        mask_win = newMaskView(L_ABE_HT_win, mask_win_id);
                  }

                  /* Noise reduction for L.
                  */
                  runMultiscaleLinearTransformReduceNoise(L_ABE_HT_win, mask_win);
            }

            if (!color_files && 
                (preprocessed_images == start_images.NONE ||
                 preprocessed_images == start_images.L_R_G_B_DBE ||
                 preprocessed_images == start_images.L_R_G_B)) 
            {
                  if (BE_before_channel_combination) {
                        if (preprocessed_images == start_images.L_R_G_B_DBE) {
                              R_ABE_id = R_BE_win.mainView.id;
                              G_ABE_id = G_BE_win.mainView.id;
                              B_ABE_id = B_BE_win.mainView.id;
                        } else {
                              /* Run automatic background extraction or R,G,B images 
                              * before channel combination.
                              */
                              console.noteln("ABE R");
                              R_ABE_id = runABE(ImageWindow.windowById(red_id));
                              console.noteln("ABE G");
                              G_ABE_id = runABE(ImageWindow.windowById(green_id));
                              console.noteln("ABE B");
                              B_ABE_id = runABE(ImageWindow.windowById(blue_id));
                        }
                  }
                  if (use_linear_fit) {
                        /* LinearFit
                        */
                        if (BE_before_channel_combination) {
                              runLinearFit(L_ABE_id, R_ABE_id);
                              runLinearFit(L_ABE_id, G_ABE_id);
                              runLinearFit(L_ABE_id, B_ABE_id);
                        } else {
                              runLinearFit(luminance_id, red_id);
                              runLinearFit(luminance_id, green_id);
                              runLinearFit(luminance_id, blue_id);
                        }
                  }
                  if (use_noise_reduction_on_all_channels) {
                        if (BE_before_channel_combination) {
                              runMultiscaleLinearTransformReduceNoise(ImageWindow.windowById(R_ABE_id), mask_win);
                              runMultiscaleLinearTransformReduceNoise(ImageWindow.windowById(G_ABE_id), mask_win);
                              runMultiscaleLinearTransformReduceNoise(ImageWindow.windowById(B_ABE_id), mask_win);
                        } else {
                              runMultiscaleLinearTransformReduceNoise(ImageWindow.windowById(red_id), mask_win);
                              runMultiscaleLinearTransformReduceNoise(ImageWindow.windowById(green_id), mask_win);
                              runMultiscaleLinearTransformReduceNoise(ImageWindow.windowById(blue_id), mask_win);
                        }
                  }

                  /* ChannelCombination
                  */
                  console.noteln("ChannelCombination");
                  var model_win;
                  var cc = new ChannelCombination;
                  cc.colorSpace = ChannelCombination.prototype.RGB;
                  if (BE_before_channel_combination) {
                        addProcessingStep("Channel combination using images " + R_ABE_id + "," + G_ABE_id + "," + B_ABE_id);
                        cc.channels = [ // enabled, id
                              [true, R_ABE_id],
                              [true, G_ABE_id],
                              [true, B_ABE_id]
                        ];
                        model_win = ImageWindow.windowById(R_ABE_id);
                  } else {
                        addProcessingStep("Channel combination using images " + red_id + "," + green_id + "," + blue_id);
                        cc.channels = [ // enabled, id
                              [true, red_id],
                              [true, green_id],
                              [true, blue_id]
                        ];
                        model_win = ImageWindow.windowById(red_id);
                  }
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

            /* ABE on RGB
            */
            if (preprocessed_images == start_images.L_RGB_HT ||
                preprocessed_images == start_images.RGB_HT) 
            {
                  /* We already have run HistogramTransformation. */
                  RGB_ABE_HT_id = RGB_HT_win.mainView.id;
                  addProcessingStep("Start from image " + RGB_ABE_HT_id);
            } else {
                  if (preprocessed_images == start_images.L_RGB_DBE ||
                      preprocessed_images == start_images.RGB_DBE) 
                  {
                        /* We already have background extracted. */
                        RGB_ABE_id = RGB_BE_win.mainView.id;
                        addProcessingStep("Start from image " + RGB_ABE_id);
                  } else if (color_files || !BE_before_channel_combination) {
                        console.noteln("ABE RGB");
                        RGB_ABE_id = runABE(RGB_win);
                  } else {
                        RGB_ABE_id = RGB_win.mainView.id;
                  }

                  /* Color calibration on RGB
                  */
                  runColorCalibration(ImageWindow.windowById(RGB_ABE_id).mainView);

                  /* On RGB image run HistogramTransform based on autostretch
                  */
                  RGB_ABE_HT_id = RGB_ABE_id + "_HT";
                  runHistogramTransform(copyView(ImageWindow.windowById(RGB_ABE_id), RGB_ABE_HT_id), L_stf);
            }

            if (color_files) {
                  if (winIsValid(range_mask_win)) {
                        /* We already have a mask. */
                        mask_win = range_mask_win;
                        addProcessingStep("Use existing mask " + range_mask_win.mainView.id);
                  } else {
                        /* Color files. Create mask for noise reduction and sharpening. */
                        mask_win_id = "AutoMask";
                        mask_win = newMaskView(
                                    ImageWindow.windowById(RGB_ABE_HT_id),
                                    mask_win_id);
                  }
                  /* Noise reduction for color RGB
                  */
                  runMultiscaleLinearTransformReduceNoise(
                        ImageWindow.windowById(RGB_ABE_HT_id),
                        mask_win);
            }

            if (increase_saturation) {
                  /* Add saturation on RGB
                  */
                  runCurvesTransformationSaturation(ImageWindow.windowById(RGB_ABE_HT_id).mainView);
            }

            if (!color_files) {
                  /* LRGB files. Combine L and RGB images.
                  */
                  runLRGBCombination(
                        ImageWindow.windowById(RGB_ABE_HT_id).mainView,
                        L_ABE_HT_id);
            }

            /* Remove green cast, run SCNR
            */
            runSCNR(ImageWindow.windowById(RGB_ABE_HT_id).mainView);

            /* Sharpen image, use mask to sharpen mostly the light parts of image.
            */
            runMultiscaleLinearTransformSharpen(
                  ImageWindow.windowById(RGB_ABE_HT_id),
                  mask_win);

            if (preprocessed_images == start_images.NONE) {
                  /* Rename some windows. Need to be done before iconize.
                  */
                  if (!color_files) {
                        /* LRGB files */
                        if (skip_ABE) {
                              RGB_ABE_HT_id = windowRename(RGB_ABE_HT_id, "AutoLRGB_noABE");
                        } else {
                              RGB_ABE_HT_id = windowRename(RGB_ABE_HT_id, "AutoLRGB_ABE");
                        }
                  } else {
                        /* Color files */
                        if (skip_ABE) {
                              RGB_ABE_HT_id = windowRename(RGB_ABE_HT_id, "AutoRGB_noABE");
                        } else {
                              RGB_ABE_HT_id = windowRename(RGB_ABE_HT_id, "AutoRGB_ABE");

                        }
                  }
            }
      }

      /* All done, do cleanup on windows on screen 
       */
      addProcessingStep("Processing completed");

      windowIconizeif(luminance_id);            /* Integration_L */
      windowIconizeif(red_id);                  /* Integration_R */
      windowIconizeif(green_id);                /* Integraion_G */
      windowIconizeif(blue_id);                 /* Integration_B */

      windowIconizeif(L_ABE_id);
      windowIconizeif(R_ABE_id);
      windowIconizeif(G_ABE_id);
      windowIconizeif(B_ABE_id);

      windowIconizeif(RGB_ABE_id);
      windowIconizeif(L_ABE_HT_id);
      windowIconizeif(RGB_win_id);              /* Integration_RGB */
      windowIconizeif(mask_win_id);             /* AutoMask or range_mask window */

      console.noteln("Processing steps:");
      console.noteln(processing_steps);

      console.noteln("Parameter values:");
      console.noteln("Integrate only:"+integrate_only);
      console.noteln("Run local normalization:"+use_local_normalization);
      console.noteln("ABE on R,G,B images before channel combination:"+BE_before_channel_combination);
      console.noteln("Use Linear Fit:"+use_linear_fit);
      console.noteln("Use noise reduction on R,G,B channels:"+use_noise_reduction_on_all_channels);
      console.noteln("Increase saturation:"+increase_saturation);
      console.noteln("Relaxed StarAlign:"+relaxed_StarAlign);

      if (preprocessed_images == start_images.NONE) {
            /* Output some info of files.
            */
            console.noteln("* All data files *");
            console.noteln(all_files.length + " data files, " + alignedFiles.length + " accepted");
            console.noteln("best_ssweight="+best_ssweight);
            console.noteln("best_image="+best_image);

            console.noteln("");

            if (!color_files) {
                  /* LRGB files */
                  console.noteln("* L " + luminance_images.length + " data files *");
                  //console.noteln("luminance_images="+luminance_images);
                  console.noteln("best_l_ssweight="+best_l_ssweight);
                  console.noteln("best_l_image="+best_l_image);
                  console.noteln("");

                  console.noteln("* R " + red_images.length + " data files *");
                  //console.noteln("red_images="+red_images);
                  console.noteln("best_r_ssweight="+best_r_ssweight);
                  console.noteln("best_r_image="+best_r_image);
                  console.noteln("");

                  console.noteln("* G " + green_images.length + " data files *");
                  //console.noteln("green_images="+green_images);
                  console.noteln("best_g_ssweight="+best_g_ssweight);
                  console.noteln("best_g_image="+best_g_image);
                  console.noteln("");

                  console.noteln("* B " + blue_images.length + " data files *");
                  //console.noteln("blue_images="+blue_images);
                  console.noteln("best_b_ssweight="+best_b_ssweight);
                  console.noteln("best_b_image="+best_b_image);
                  console.noteln("");
            } else {
                  /* Color files */
                  console.noteln("* Color data files *");
                  //console.noteln("color_images="+color_images);
                  console.noteln("best_c_ssweight="+best_c_ssweight);
                  console.noteln("best_c_image="+best_c_image);
                  console.noteln("");
            }
      }
      console.noteln("Script completed");

      BE_before_channel_combination = saved_BE_before_channel_combination;

      if (hide_console) {
            console.hide();
      }
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

function AutoIntegrateDialog()
{
      this.__base__ = Dialog;
      this.__base__();

      var labelWidth1 = this.font.width( "Output format hints:" + 'T' );
      this.textEditWidth = 25 * this.font.width( "M" );
      this.numericEditWidth = 6 * this.font.width( "0" );
   
      /* Info box at the top. */
      this.helpLabel = new Label( this );
      this.helpLabel.frameStyle = FrameStyle_Box;
      this.helpLabel.margin = this.logicalPixelsToPhysical( 4 );
      this.helpLabel.wordWrapping = true;
      this.helpLabel.useRichText = true;
      if (test_mode) {
            this.helpLabel.text = "<p><b>AutoIntegrate TEST MODE</b> &mdash; " +
                              "Automatic image integration utility.</p>";
      } else {
            this.helpLabel.text = "<p><b>AutoIntegrate v0.4</b> &mdash; " +
                              "Automatic image integration utility.</p>";
      }
      /* Tree box to show files. */
      this.files_TreeBox = new TreeBox( this );
      this.files_TreeBox.multipleSelection = true;
      this.files_TreeBox.rootDecoration = false;
      this.files_TreeBox.alternateRowColor = true;
      this.files_TreeBox.setScaledMinSize( 300, 200 );
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
            dialogFileNames = openFitFiles();
            if (dialogFileNames != null) {
                  this.dialog.files_TreeBox.canUpdate = false;
                  for (var i = 0; i < dialogFileNames.length; i++) {
                  var node = new TreeBoxNode(this.dialog.files_TreeBox);
                  node.setText(0, dialogFileNames[i]);
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
      this.useLocalNormalizationCheckBox.onClick = function(checked) { use_local_normalization = checked; }

      this.ABEeforeChannelCombinationCheckBox = newCheckBox(this, "ABE before ChannelCombination", BE_before_channel_combination, 
            "<p>Run ABE in R,G,B images before ChannelCombination instead of after CC</p>" );
      this.ABEeforeChannelCombinationCheckBox.onClick = function(checked) { BE_before_channel_combination = checked; }

      this.useLinearFitCheckBox = newCheckBox(this, "Linear fit", use_linear_fit, 
            "<p>Run LinearFit based on L image before ChannelCombination</p>" );
      this.useLinearFitCheckBox.onClick = function(checked) { use_linear_fit = checked; }

      this.useNoiseReductionOnAllChannelsCheckBox = newCheckBox(this, "Noise reduction also on on R,G,B", use_noise_reduction_on_all_channels, 
            "<p>Run noise also reduction on R,G,B images in addition to L image</p>" );
      this.useNoiseReductionOnAllChannelsCheckBox.onClick = function(checked) { use_noise_reduction_on_all_channels = checked; }

      this.SubframeSelectorCheckBox = newCheckBox(this, "Run SubframeSelector", run_subframeselector, 
            "<p>Run SubframeSelector to get image weights</p>" );
      this.SubframeSelectorCheckBox.onClick = function(checked) { run_subframeselector = checked; }

      this.IntegrateOnlyCheckBox = newCheckBox(this, "Integrate only", integrate_only, 
            "<p>Run only image integration to create L,R,G,B or RGB files</p>" );
      this.IntegrateOnlyCheckBox.onClick = function(checked) { integrate_only = checked; }

      this.relaxedStartAlignCheckBox = newCheckBox(this, "More relaxed StarAlign", relaxed_StarAlign, 
            "<p>Use more relaxed StarAlign parameters. Could be useful if too many files fail to align.</p>" );
      this.relaxedStartAlignCheckBox.onClick = function(checked) { relaxed_StarAlign = checked; }
      
      this.SaturationCheckBox = newCheckBox(this, "Increase saturation", increase_saturation, 
            "<p>Increase saturation on RGB image using CurvesTransformation</p>" );
      this.SaturationCheckBox.onClick = function(checked) { increase_saturation = checked; }

      this.keepIntegratedImagesCheckBox = newCheckBox(this, "Keep integrated images", keep_integrated_images, 
            "<p>Keep integrated images when closing all windows</p>" );
      this.keepIntegratedImagesCheckBox.onClick = function(checked) { keep_integrated_images = checked; }

      this.skipABECheckBox = newCheckBox(this, "Skip ABE", skip_ABE, 
      "<p>Skip ABE on image</p>" );
      this.skipABECheckBox.onClick = function(checked) { skip_ABE = checked; }

      this.hideConsoleCheckBox = newCheckBox(this, "Hide console", hide_console, 
            "<p>Hide console</p>" );
      this.hideConsoleCheckBox.onClick = function(checked) { 
            hide_console = checked;
            if (hide_console) {
                  console.hide();
            } else {
                  console.show();
            }
      }

      // Parameters set 1.
      this.paramsSet1 = new VerticalSizer;
      this.paramsSet1.margin = 6;
      this.paramsSet1.spacing = 4;
      this.paramsSet1.add( this.SubframeSelectorCheckBox );
      this.paramsSet1.add( this.IntegrateOnlyCheckBox );
      this.paramsSet1.add( this.relaxedStartAlignCheckBox);
      this.paramsSet1.add( this.useLocalNormalizationCheckBox );
      this.paramsSet1.add( this.ABEeforeChannelCombinationCheckBox );
      this.paramsSet1.add( this.skipABECheckBox );

      // Parameters set 2.
      this.paramsSet2 = new VerticalSizer;
      this.paramsSet2.margin = 6;
      this.paramsSet2.spacing = 4;
      this.paramsSet2.add( this.useLinearFitCheckBox );
      this.paramsSet2.add( this.useNoiseReductionOnAllChannelsCheckBox );
      this.paramsSet2.add( this.SaturationCheckBox );
      this.paramsSet2.add( this.keepIntegratedImagesCheckBox );
      this.paramsSet2.add( this.hideConsoleCheckBox );

      // Group parameters.
      this.paramsGroupBox = new newGroupBox( this );
      this.paramsGroupBox.title = "Parameters";
      this.paramsGroupBox.sizer = new HorizontalSizer;
      this.paramsGroupBox.sizer.margin = 6;
      this.paramsGroupBox.sizer.spacing = 4;
      this.paramsGroupBox.sizer.add( this.paramsSet1 );
      this.paramsGroupBox.sizer.add( this.paramsSet2 );
      // Stop columns of buttons moving as dialog expands horizontally.
      this.paramsGroupBox.sizer.addStretch();
      
      // Button to run automatic processing
      this.autoRunLabel = new Label( this );
      with (this.autoRunLabel) {
         text = "Run automatic integrate";
         textAlignment = TextAlign_Left|TextAlign_VertCenter;
      }
      this.autoRunButton = new PushButton( this );
      this.autoRunButton.text = "AutoRun";
      this.autoRunButton.onClick = function()
      {
            console.noteln("AutoRun");
            if (dialogFileNames == null) {
                  dialogFileNames = openFitFiles();
                  if (dialogFileNames != null) {
                        this.dialog.files_TreeBox.canUpdate = false;
                        for (var i = 0; i < dialogFileNames.length; i++) {
                              var node = new TreeBoxNode(this.dialog.files_TreeBox);
                              node.setText(0, dialogFileNames[i]);
                        }
                        this.dialog.files_TreeBox.canUpdate = true;
                  }
            }
            if (dialogFileNames != null) {
                  try {
                        AutoIntegrateEngine(false);
                  } 
                  catch(err) {
                        console.noteln(err);
                        console.noteln("Processing stopped!");
                  }
            }
      };   
      this.autoRunSizer = new HorizontalSizer;
      this.autoRunSizer.add( this.autoRunLabel );
      this.autoRunSizer.addSpacing( 4 );
      this.autoRunSizer.add( this.autoRunButton );
      this.autoRunGroupBox = new newGroupBox( this );
      this.autoRunGroupBox.sizer = new HorizontalSizer;
      this.autoRunGroupBox.sizer.margin = 6;
      this.autoRunGroupBox.sizer.spacing = 4;
      this.autoRunGroupBox.sizer.add( this.autoRunSizer );

      // Button to continue from existing files
      this.autoContinueLabel = new Label( this );
      with (this.autoContinueLabel) {
            text = "Run automatic processing from previously created images.";
            textAlignment = TextAlign_Left|TextAlign_VertCenter;
            toolTip = "Image check order is:\n" +
                      "L_HT + RGB_HT\n" +
                      "RGB_HT\n" +
                      "Integration_L_DBE + Integration_RGB_DBE\n" +
                      "Integration_RGB_DBE\n" +
                      "Integration_L_DBE + Integration_R_DBE + Integration_G_DBE + Integration_B_DBE\n" +
                      "Integration_L + Integration_R + Integration_G + Integration_B\n";
      }
      this.autoContinueButton = new PushButton( this );
      this.autoContinueButton.text = "AutoContinue";
      this.autoContinueButton.onClick = function()
      {
            console.noteln("autoContinue");
            try {
                  AutoIntegrateEngine(true);
            } 
            catch(err) {
                  console.noteln(err);
                  console.noteln("Processing stopped!");
            }
      };   
      this.autoContinueSizer = new HorizontalSizer;
      this.autoContinueSizer.add( this.autoContinueLabel );
      this.autoContinueSizer.addSpacing( 4 );
      this.autoContinueSizer.add( this.autoContinueButton );
      this.autoContinueGroupBox = new newGroupBox( this );
      this.autoContinueGroupBox.sizer = new HorizontalSizer;
      this.autoContinueGroupBox.sizer.margin = 6;
      this.autoContinueGroupBox.sizer.spacing = 4;
      this.autoContinueGroupBox.sizer.add( this.autoContinueSizer );

      // Button to close all windows
      this.closeAllLabel = new Label( this );
      with (this.closeAllLabel) {
            text = "Close all image windows created by this script";
            textAlignment = TextAlign_Left|TextAlign_VertCenter;
      }
      this.closeAllButton = new PushButton( this );
      this.closeAllButton.text = "Close all";
      this.closeAllButton.onClick = function()
      {
            console.noteln("closeAll");
            closeAllWindows();
      };   
      this.closeAllSizer = new HorizontalSizer;
      this.closeAllSizer.add( this.closeAllLabel );
      this.closeAllSizer.addSpacing( 4 );
      this.closeAllSizer.add( this.closeAllButton );
      this.closeAllGroupBox = new newGroupBox( this );
      this.closeAllGroupBox.sizer = new HorizontalSizer;
      this.closeAllGroupBox.sizer.margin = 6;
      this.closeAllGroupBox.sizer.spacing = 4;
      this.closeAllGroupBox.sizer.add( this.closeAllSizer );

      // OK and Cancel buttons
      this.ok_Button = new PushButton( this );
      this.ok_Button.text = "OK";
      this.ok_Button.icon = this.scaledResource( ":/icons/ok.png" );
      this.ok_Button.onClick = function()
      {
         this.dialog.ok();
      };
   
      this.cancel_Button = new PushButton( this );
      this.cancel_Button.text = "Cancel";
      this.cancel_Button.icon = this.scaledResource( ":/icons/cancel.png" );
      this.cancel_Button.onClick = function()
      {
         this.dialog.cancel();
      };
   
      this.buttons_Sizer = new HorizontalSizer;
      this.buttons_Sizer.spacing = 6;
      this.buttons_Sizer.addStretch();
      this.buttons_Sizer.add( this.ok_Button );
      this.buttons_Sizer.add( this.cancel_Button );
   
      this.sizer = new VerticalSizer;
      this.sizer.margin = 6;
      this.sizer.spacing = 6;
      this.sizer.add( this.helpLabel );
      this.sizer.addSpacing( 4 );
      this.sizer.add( this.files_GroupBox, 100 );
      this.sizer.add( this.paramsGroupBox );
      this.sizer.add( this.autoRunGroupBox );
      this.sizer.add( this.autoContinueGroupBox );
      this.sizer.add( this.closeAllGroupBox );
      this.sizer.add( this.buttons_Sizer );

      this.windowTitle = "AutoIntegrate Script";
      this.userResizable = true;
      this.adjustToContents();
      this.helpLabel.setFixedHeight();
      this.files_GroupBox.setFixedHeight();
}

AutoIntegrateDialog.prototype = new Dialog;

function main()
{
      if (hide_console) {
            console.hide();
      }
      if (test_mode) {
            dialogFileNames = testModefileNames;
            all_files = testModefileNames;
      }
      var dialog = new AutoIntegrateDialog();

      dialog.execute();

      //AutoIntegrateEngine(false);
}

main();
