/*

Script to automate initial steps of image processing in PixInsight.

Before running this script SubframeSelector script must be run manually 
on .fit files to generate *_a.fit files and SSWEIGHT keyword.

In the end there will be integrated light files and automatically
processed final image. Both LRGB and color files are accepted.

This scripts then does the following steps:

1. Opens a file dialog. On that select all *_a.fit files. Both LRGB and color
   can be used.
2. Files are scanned and the file with highest SSWEIGHT is selected as a 
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
6. ChannelCombination is run on Red, Green and Blue integrated images to 
   create an RGB image. After that there is one L and and one RGB image or 
   just an RGB image if files were color files.
---
At this point we have Integrate_L and Integrate_RGB images in case of
LRGB files or Integrate_RGB image in case of color files.
It is possible to rerun the script with following steps if there are 
manually created images:
- If there are images L_BE and RGB_BE with background extracted the script starts 
  with step 8.
- If there is image RBG_BE with background extracted the script starts with 
  step 11.
- If there are images L_HT and RGB_HT with HistogramTransformation already done 
  the script starts with step 9.
- If there is image RBG_HT with HistogramTransformation already done the script 
  starts with step 12.
- In all cases if there is already a mask with name range_mask
  then that is used as a mask in steps 10 and 15.
---
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
17. In case of LRGB files there are integrated L and RGB windows and processed 
    LRGB window. In case of color files there are integrated RBG window
    and processed RGB window.

Written by Jarmo Ruuth, 2018.

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

#include <pjsr/UndoFlag.jsh>
#include <pjsr/ColorSpace.jsh>

var test_mode = false;

var close_windows = true;
var use_local_normalization = false;
var same_stf_for_both_images = false;

var all_files;
var best_ssweight = 0;
var best_image = null;
var best_l_ssweight = 0;
var best_l_image = null;
var best_r_ssweight = 0;
var best_r_image = null;
var best_g_ssweight = 0;
var best_g_mage = null;
var best_b_ssweight = 0;
var best_b_mage = null;
var best_c_ssweight = 0;
var best_c_mage = null;
var luminance_images;
var red_images;
var green_images;
var blue_images;
var color_images;

function windowCloseif(id)
{
      var w = findWindow(id);
      if (w != null) {
            w.close();
      }
}

function newMaskView(sourceView, name)
{
      /* Default mask is the same as stretched image. */
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

      if (targetView.mainView.image.colorSpace != ColorSpace_Gray) {
            /* If we have color files we use gray scale converted
               image as a mask.
            */
            var P = new ConvertToGrayscale;
            targetView.mainView.beginProcess(UndoFlag_NoSwapFile);
            P.executeOn(targetView.mainView);
            targetView.mainView.endProcess();
      }

      targetView.show();
   
      return targetView;
}

function openFitFiles()
{
      var filenames;
      var ofd = new OpenFileDialog;

      ofd.multipleSelections = true;
      ofd.caption = "Select Light Frames (*_a.fit)";
      ofd.loadImageFilters();

      if (!ofd.execute()) {
            throw new Error("Open files dialog failed");
      }

      if (ofd.fileNames.length < 1) {
            throw new Error("Zero files");
      }
      filenames = ofd.fileNames;
      all_files = filenames;

      return filenames;
}

function findBestSSWEIGHT(fileNames)
{
      var ssweight;

      /* Loop through files and find image with best SSWEIGHT.
       */
      var n = 0;
      for (var i = 0; i < fileNames.length; i++) {
            var filter;
            var filePath = fileNames[i];
            console.noteln("File " +  filePath);
            var F = new FileFormat(".fit", true/*toRead*/, false/*toWrite*/);
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
            for (var j = 0; j < keywords.length; j++) {
                  var value = keywords[j].strippedValue.trim();
                  switch (keywords[j].name) {
                        case "SSWEIGHT":
                              ssweight = value;
                              console.noteln("ssweight=" +  ssweight);
                              if (i == 0 || parseFloat(ssweight) > parseFloat(best_ssweight)) {
                                    best_ssweight = ssweight;
                                    console.noteln("new best_ssweight=" +  best_ssweight);
                                    best_image = filePath;
                              }
                              break;
                        default:
                              break;
                  }
            }
      }
      if (best_image.isNull) {
            throw new Error("Unable to find image with best SSWEIGHT");
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
      var n = 0;
      for (var i = 0; i < alignedFiles.length; i++) {
            var filter;
            var ssweight;
            var filePath = alignedFiles[i];
            console.noteln("findLRGBchannels file " +  filePath);
            var F = new FileFormat(".xisf", true/*toRead*/, false/*toWrite*/);
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
                        default:
                              break;
                  }
            }
            
            switch (filter) {
                  case 'Luminance':
                        if (parseFloat(ssweight) >= parseFloat(best_l_ssweight)) {
                              /* Add best images first in the array. */
                              best_l_ssweight = ssweight;
                              console.noteln("new best_l_ssweight=" +  best_l_ssweight);
                              best_l_image = filePath;
                              insert_image_for_integrate(luminance_images, filePath);
                        } else {
                              append_image_for_integrate(luminance_images, filePath);
                        }
                        break;
                  case 'Red':
                        if (parseFloat(ssweight) >= parseFloat(best_r_ssweight)) {
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
                        if (parseFloat(ssweight) >= parseFloat(best_g_ssweight)) {
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
                        if (parseFloat(ssweight) >= parseFloat(best_b_ssweight)) {
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
                        if (parseFloat(ssweight) >= parseFloat(best_c_ssweight)) {
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

/* After SubframeSelector run StarAlignment on *_a.fit files.
   The output will be *_a_r.xisf files.
*/
function runStarAlignment(imagetable, refImage)
{
      var alignedFiles;

      console.noteln("runStarAlignment," + imagetable.length + " files");
      var starAlignment = new StarAlignment;
      var targets = new Array;

      for (var i = 0; i < imagetable.length; i++) {
            var oneimage = new Array(3);
            oneimage[0] = true;
            oneimage[1] = true;
            oneimage[2] = imagetable[i];
            targets[targets.length] = oneimage;
      }

      starAlignment.referenceImage = refImage;
      starAlignment.referenceIsFile = true;
      starAlignment.targets = targets;
      starAlignment.overwriteExistingFiles = true;

      starAlignment.executeGlobal();

      alignedFiles = new Array;

      for (var i = 0; i < starAlignment.outputData.length; ++i) {
            var filePath = starAlignment.outputData[i][0];
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
            return;
      }
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

function runImageIntegration(images, name)
{
      console.noteln("runImageIntegration " + name + ", " + images.length + " files");

      if (images.length < 3) {
            for (var i = 0; images.length < 3; i++) {
                  append_image_for_integrate(images, images[i][1]);
            }
      }
      if (use_local_normalization && name == 'L') {
            return runImageIntegrationNormalized(images, name);
      }

      var II = new ImageIntegration;

      II.evaluateNoise = true;
      if (images.length < 8) {
            II.rejection = ImageIntegration.prototype.PercentileClip;
      } else {
            II.rejection = ImageIntegration.prototype.SigmaClip;
      }
      II.images = images;

      II.executeGlobal();

      if (close_windows) {
            windowCloseif(II.highRejectionMapImageId);
            windowCloseif(II.lowRejectionMapImageId);
      }

      return II.integrationImageId;
}

function runImageIntegrationNormalized(images, name)
{
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
            P.rejection = ImageIntegration.prototype.PercentileClip;
      } else {
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

      if (close_windows) {
            windowCloseif(P.highRejectionMapImageId);
            windowCloseif(P.lowRejectionMapImageId);
      }

      return P.integrationImageId;
}

function runABE(win, target_id)
{
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

function runHistogramTransform(ABE_id, stf_to_use)
{
      console.noteln("runHistogramTransform, ABE_id=" + ABE_id);
      var ABE_win = ImageWindow.windowById(ABE_id);

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
      var stf = new ScreenTransferFunction;
      
      ABE_win.mainView.beginProcess(UndoFlag_NoSwapFile);
      
      stf.executeOn(ABE_win.mainView);

      ABE_win.mainView.endProcess();

      return stf_to_use;
}

function runMultiscaleLinearTransformReduceNoise(imgView, MaskView)
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

function winIsValid(w)
{
      return w != null;
}

function findWindow(id)
{
      var images = ImageWindow.windows;
      for (var i in images) {
         if (images[i].mainView.id == id) {
               return images[i];
         }
      }
      return null;
}

function main()
{
      var mask_win;
      var RGB_win;
      var color_files = false;
      var preprocessed_files = false;
      var L_ABE_id;

      console.noteln("Start main...");

      /* First check if we have some processing done and we should continue
       * from the middle of the processing.
       */

      /* Check if we have manual background extracted files. */
      var L_BE_win = findWindow("L_BE");
      var RGB_BE_win = findWindow("RGB_BE");

      /* Check if we have manually done histogram transformation. */
      var L_HT_win = findWindow("L_HT");
      var RGB_HT_win = findWindow("RGB_HT");

      /* Check if we have manually created mask. */
      var range_mask_win = null;

      if ((winIsValid(L_BE_win) && winIsValid(RGB_BE_win)) ||     /* LRGB background extracted */
          winIsValid(RGB_BE_win) ||                               /* color background extracted */
          (winIsValid(L_HT_win) && winIsValid(RGB_HT_win)) ||     /* LRGB HistogramTransformation */
          winIsValid(RGB_HT_win))                                 /* LRGB HistogramTransformation */
      {
            console.noteln("Using preprocessed images");
            console.noteln("L_BE_win="+L_BE_win);
            console.noteln("RGB_BE_win="+RGB_BE_win);
            console.noteln("L_HT_win="+L_HT_win);
            console.noteln("RGB_HT_win="+RGB_HT_win);
            preprocessed_files = true;
            if (!winIsValid(L_BE_win) && !winIsValid(L_HT_win)) {
                  /* No L files, assume color. */
                  console.noteln("Processing as color images");
                  color_files = true;
            }
            /* Check if we have manually created mask. */
            range_mask_win = findWindow("range_mask");
      } else {
            /* Open .fit files, we assume SubframeSelector is run
            * so each file has SSWEIGHT set.
            */
            var fileNames;
            if (test_mode) {
                  fileNames = ["c:\\Slooh\\test\\ngc2146_20171004_014519_0_qx7pbs_l_cal_a.fit",
                              "c:\\Slooh\\test\\ngc2146_20171004_014639_1_siw5my_l_cal_a.fit",
                              "c:\\Slooh\\test\\ngc2146_20171004_014758_2_imetl7_l_cal_a.fit",
                              "c:\\Slooh\\test\\ngc2146_20171004_014934_3_eaiesc_r_cal_a.fit",
                              "c:\\Slooh\\test\\ngc2146_20171004_015056_3_t1h1b8_g_cal_a.fit",
                              "c:\\Slooh\\test\\ngc2146_20171004_015221_3_wuzurn_b_cal_a.fit"];
            } else {
                  fileNames = openFitFiles();
            }

            /* Find file with best SSWEIGHT to be used 
            * as a reference image in StarAlign.
            */
            var best_image = findBestSSWEIGHT(fileNames);

            /* StarAlign
            */
            var alignedFiles = runStarAlignment(fileNames, best_image);

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
                  var luminance_id = runImageIntegration(luminance_images, 'L');

                  var red_id = runImageIntegration(red_images, 'R');
                  var green_id = runImageIntegration(green_images, 'G');
                  var blue_id = runImageIntegration(blue_images, 'B');

                  /* ChannelCombination
                  */
                  console.noteln("ChannelCombination");
                  var cc = new ChannelCombination;
                  cc.colorSpace = ChannelCombination.prototype.RGB;
                  cc.channels = [ // enabled, id
                        [true, red_id],
                        [true, green_id],
                        [true, blue_id]
                  ];

                  var red_win = ImageWindow.windowById(red_id);
                  RGB_win = new ImageWindow(
                                    red_win.mainView.image.width,       // int width
                                    red_win.mainView.image.height,      // int height
                                    3,                                  // int numberOfChannels=1
                                    32,                                 // int bitsPerSample=32
                                    true,                               // bool floatSample=true
                                    true,                               // bool color=false
                                    "Integration_RGB");                 // const IsoString &id=IsoString()
                  cc.executeOn(RGB_win.mainView);
                  RGB_win.show();

                  if (close_windows) {
                        windowCloseif(red_id);
                        windowCloseif(green_id);
                        windowCloseif(blue_id);
                  }
            } else {
                  /* We have color files. */
                  color_files = true;
                  var color_id = runImageIntegration(color_images, 'C');
                  RGB_win = ImageWindow.windowById(color_id);
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
      
      var L_stf = null;

      if (!color_files) {
            /* LRGB files */
            console.noteln("ABE L");
            if (winIsValid(L_HT_win)) {
                  /* We have run HistogramTransformation. */
                  L_ABE_win = L_HT_win;
                  L_ABE_id = L_HT_win.mainView.id;
            } else {
                  if (winIsValid(L_BE_win)) {
                        /* We have background extracted from L. */
                        L_ABE_id = L_BE_win.mainView.id;
                  } else {
                        var L_win = ImageWindow.windowById(luminance_id);           

                        /* ABE on L
                        */
                        L_ABE_id = runABE(L_win);
                  }
                  /* On L image run HistogramTransform based on autostretch
                  */
                  L_stf = runHistogramTransform(L_ABE_id, null);
                  if (!same_stf_for_both_images) {
                        L_stf = null;
                  }

                  L_ABE_win = ImageWindow.windowById(L_ABE_id);
            }

            if (winIsValid(range_mask_win)) {
                  /* We already have a mask. */
                  mask_win = range_mask_win;
            } else {
                  /* Create mask for noise reduction and sharpening. */
                  mask_win = newMaskView(L_ABE_win, "AutoMask");
            }

            /* Noise reduction for L.
             */
            runMultiscaleLinearTransformReduceNoise(L_ABE_win, mask_win);
      }

      /* ABE on RGB
       */
      var RGB_ABE_id;
      if (winIsValid(RGB_HT_win)) {
            /* We already have run HistogramTransformation. */
            RGB_ABE_id = RGB_HT_win.mainView.id;
      } else {
            if (winIsValid(RGB_BE_win)) {
                  /* We already have background extracted. */
                  RGB_ABE_id = RGB_BE_win.mainView.id;
            } else {
                  console.noteln("ABE RGB");
                  RGB_ABE_id = runABE(RGB_win);
            }

            /* Color calibration on RGB
            */
            runColorCalibration(ImageWindow.windowById(RGB_ABE_id).mainView);

            /* On RGB image run HistogramTransform based on autostretch
            */
            runHistogramTransform(RGB_ABE_id, L_stf);
      }

      if (color_files) {
            if (winIsValid(range_mask_win)) {
                  /* We already have a mask. */
                  mask_win = range_mask_win;
            } else {
                  /* Color files. Create mask for noise reduction and sharpening. */
                  mask_win = newMaskView(
                              ImageWindow.windowById(RGB_ABE_id), 
                              "AutoMask");
            }
            /* Noise reduction for color RGB
             */
            runMultiscaleLinearTransformReduceNoise(
                  ImageWindow.windowById(RGB_ABE_id), 
                  mask_win);
      }

      /* Add saturation on RGB
       */
      runCurvesTransformationSaturation(ImageWindow.windowById(RGB_ABE_id).mainView);

      if (!color_files) {
            /* LRGB files. Combine L and RGB images.
            */
            runLRGBCombination(
                  ImageWindow.windowById(RGB_ABE_id).mainView, 
                  L_ABE_id);

            if (close_windows) {
                  //windowCloseif(L_ABE_id);
                  windowCloseif(L_ABE_id + "_background");
                  windowCloseif(RGB_ABE_id + "_background");
            }
      } else {
            /* Color files */
            if (close_windows) {
                  windowCloseif(RGB_ABE_id + "_background");
            }
      }

      /* Remove green cast, run SCNR
       */
      runSCNR(ImageWindow.windowById(RGB_ABE_id).mainView);

      /* Sharpen image, use mask to sharpen mostly the light parts of image.
       */
      runMultiscaleLinearTransformSharpen(
            ImageWindow.windowById(RGB_ABE_id), 
            mask_win);

      if (!preprocessed_files) {
            if (!color_files) {
                  /* LRGB files */
                  ImageWindow.windowById(luminance_id).mainView.id = "Integration_L";
                  ImageWindow.windowById(RGB_ABE_id).mainView.id = "AutoLRGB_ABE";
            } else {
                  /* Color files */
                  RGB_win.mainView.id = "Integration_RGB";
                  ImageWindow.windowById(RGB_ABE_id).mainView.id = "AutoRGB_ABE";
            }
     
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
}

main();
