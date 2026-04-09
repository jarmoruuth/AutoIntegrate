/*
      AutoIntegrate Engine.

This is the main this for AutoIntegrate script.

Interface functions, see at the end of the module. Main entry 
point is autointegrateProcessingEngine.

Copyright (c) 2018-2026 Jarmo Ruuth.

Crop to common area code

      Copyright (c) 2022 Jean-Marc Lugrin.

Window name prefix and icon location code

      Copyright (c) 2021 rob pfile.

PreviewControl module

      Copyright (C) 2013, Andres del Pozo

The following copyright notice is for Linear Defect Detection

   Copyright (c) 2019 Vicent Peris (OAUV). All Rights Reserved.

The following copyright notice is for routines this.applyAutoSTF and this.applySTF:

   Copyright (c) 2003-2020 Pleiades Astrophoto S.L. All Rights Reserved.

The following condition apply for routines this.applyAutoSTF, this.applySTF and 
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

/* 
      Some functions that are main steps during the processing.
      - autointegrateProcessingEngine
      - this.createChannelImages - create channel images, or find existing ones for AutoContinue
      - this.mapLRGBchannels
            - customMapping - create RGB in case there are narrowband images
      - combineRGBimage - used in case of LRGB processing
*/

#ifndef AUTOINTEGRATEENGINE_JS
#define AUTOINTEGRATEENGINE_JS

#include "AutoIntegrateVeraLuxHMS.js"
#include "AutoIntegrateImageSolver.js"
#include "AutoIntegrateAnnotateImage.js"

class AutoIntegrateEngine extends Object
{

constructor(global, util, flowchart) {

      super();

      this.global = global;
      this.util = util;
      this.flowchart = flowchart;

#ifdef AUTOINTEGRATE_STANDALONE
      this.autointegrateLDD = null;
#else
      this.autointegrateLDD = new AutoIntegrateLDD(this.util);
#endif

      this.gui = null;
      this.par = this.global.par;
      this.ppar = this.global.ppar;

      this.veralux = new AutoIntegrateVeraLuxHMS(this.global.debug);
      this.calibrate = new AutoIntegrateCalibrate(this.global, this.util, this.flowchart, this);
      this.imageSolver = new AutoIntegrateImageSolver(this.global, this.util, this.flowchart, this);


      // Copy of files from this.global object
      this.lightFileNames = null;
      this.darkFileNames = null;
      this.biasFileNames = null;
      this.flatdarkFileNames = null;
      this.flatFileNames = null;

      this.standalone_narrowband_mappings = null;

      this.selectiveColor = null;

      this.ssweight_set = false;
      this.H_in_R_channel = false;
      this.is_luminance_images = false;    // Do we have luminance files from autocontinue or FITS
      this.autocontinue_prefix = "";       // prefix used to find base files for autocontinue

      this.crop_truncate_amount = null;       // used when cropping channel images
      this.crop_lowClipImageName = null;      // integrated image used to calculate this.crop_truncate_amount
      this.crop_lowClipImage_changed = false; // changed flag for saving to disk

      this.save_processed_images = true;     // save processed L+RGB images to disk while they still are linear

      this.crop_suggestion_txt = "Adjust crop parameters, or adjust the crop manually and run again using AutoContinue."; 

      this.enhancementsApply = false;

      this.firstDateFileInfo = null;
      this.lastDateFileInfo = null;

      this.medianFWHM = null;

      // List of images used in processing
      // Images is an array of objects with properties (see init_images):
      //   images : array of image ids
      //   best_image: image id
      //   best_ssweight: ssweight value
      //   exptime: exposure time
      this.L_images = [];
      this.R_images = [];
      this.G_images = [];
      this.B_images = [];
      this.H_images = [];
      this.S_images = [];
      this.O_images = [];
      this.C_images = [];

      this.astrobin_info = null; // Astrobin info for the generating CSV information

      // SPCC parameters that may be changed with spcc_auto_narrowband
      // so they are used from here.
      this.spcc_params = {
            wavelengths: [],        // R, G, B
            bandhwidths: [],        // R, G, B
            white_reference: "",
            narrowband_mode: false
      };

      this.process_narrowband = false;

      this.logfname = null;
      this.alignedFiles = null;

      /* Variable used during processing images.
      */
      this.mask_win = null;
      this.mask_win_id = null;
      this.star_mask_win = null;
      this.star_mask_win_id = null;
      this.star_fix_mask_win = null;
      this.star_fix_mask_win_id = null;

      this.RGB_win = null;
      this.RGB_win_id = null;
      this.L_processed_id = null;
      this.L_processed_HT_win = null;
      this.L_processed_HT_id = null;
      this.RGB_processed_id = null;

      this.is_color_files = false;    // Are we processing color/OSC files
      this.is_rgb_files = false;
      this.is_narrowband_files = false;
      this.preprocessed_images = null;

      this.save_id_list = []; // list of images to save to disk

      this.luminance_id = null;      // These are working images and copies of 
      this.red_id = null;            // original integrated images
      this.green_id = null;
      this.blue_id = null;

      this.luminance_crop_id = null; // Not used for now, use Save cropped images

      this.L_id = null;                     // Original integrated images
      this.R_id = null;                     // We make copies of these images during processing
      this.G_id = null;
      this.B_id = null;
      this.H_id = null;
      this.S_id = null;
      this.O_id = null;
      this.RGB_color_id = null;              // Integrated RGB from OSC/DSLR data

      this.RGBHa_H_enhanced_info = {  // Ha RGB image info
                                    nb_channel_id: null,    // Enhanced Ha channel image id
                                    starless: false, 
                                    mapping_done: false
                              };    

      this.iconized_image_ids = [];        // Random images that are iconized at the end of processing
      this.iconized_debug_image_ids = [];  // Random images that are iconized or closed at the end of processing

      this.RGB_stars_win = null;           // linear combined RGB/narrowband/OSC stars
      this.RGB_stars_win_HT = null;        // stretched/non-linear RGB stars win
      this.RGB_stars_channel_ids = [];     // linear RGB channel star image ids

      // Local copies of parameter that may be changed during processing
      this.local_RGB_stars = false;
      this.local_narrowband_mapping = "";
      this.local_L_mapping = "";
      this.local_R_mapping = "";
      this.local_G_mapping = "";
      this.local_B_mapping = "";
      this.local_image_stretching = "";
      this.local_debayer_pattern = "";
      this.local_RGBHa_prepare_method = "";
      this.local_RGBHa_combine_method = "";

      this.script_start_time = null;

      this.L_GC_start_win = null;           // Gradient corrected and integrated start images for AutoContinue
      this.R_GC_start_win = null;
      this.G_GC_start_win = null;
      this.B_GC_start_win = null;
      this.H_GC_start_win = null;
      this.S_GC_start_win = null;
      this.O_GC_start_win = null;
      this.RGB_GC_start_win = null;

      this.L_HT_start_win = null;           // HT images for AutoContinue
      this.RGB_HT_start_win = null;

      this.range_mask_win = null;
      this.final_win = null;
      this.linear_fit_rerefence_id = null;

      this.stepno = 1;

      this.retval = {
            ERROR : 0,
            SUCCESS : 1,
            INCOMPLETE: 2
      };

      this.channels = {
            L: 0,
            R: 1,
            G: 2,
            B: 3,
            H: 4,
            S: 5,
            O: 6,
            C: 7
      };

      this.GraXpertCmd = {
            background: 0,
            denoise: 1,
            deconvolution_stars: 2,
            deconvolution_object: 3,
      };

} // constructor

/* Set optional GUI object to update GUI components.
 */
setGUI(aigui) {
      this.gui = aigui;
}

imageIsLinear(window, median = null, stdDev = null) 
{
      let view = window.mainView;
      let image = view.image;

      // Calculate basic statistics
      if (median == null || stdDev == null) {
            median = image.median();
            stdDev = image.stdDev();
      }

      // Make a very basic determination of linearity
      if (median < 0.1 && stdDev < 0.05) {
            console.writeln("Image is linear, median: ", median, " stdDev: ", stdDev);
            return true;
      } else {
            console.writeln("Image is not linear, median: ", median, " stdDev: ", stdDev);
            return false;
      }
}

// Binning value for this.par.fast_mode
getFastModeBinning(imgWin)
{
      switch (this.par.fast_mode_opt.val) {
            case 'S':
                  // Use smallest image size
                  // Longest side of image should be less than 1024
                  var image_size = Math.max(imgWin.mainView.image.width, imgWin.mainView.image.height);
                  break;
            case 'M':
                  // Use medium image size
                  // Shortest side of image should be less than 2048
                  var image_size = Math.min(imgWin.mainView.image.width, imgWin.mainView.image.height);
                  break;
            default:
                  this.util.throwFatalError("getFastModeBinning, unknown fast_mode_opt " + this.par.fast_mode_opt.val);
                  break;
      }
      var binning = 1;
      var binned_size = image_size;
      while (binned_size > 2048) {
            binning++;
            binned_size = image_size / binning;
      }
      return binning;
}

// Filtering for this.par.fast_mode
filterFilesForFastMode(fileNames, auto_continue, filetype)
{
      if (fileNames == null || fileNames.length == 0) {
            return fileNames;
      }
      if (auto_continue) {
            return fileNames;
      } else if (this.par.fast_mode.val) {
            // Get a subset of images for fast mode
            var original_len = fileNames.length;
            switch (filetype) {
                  case this.global.pages.FLATS:
                  case this.global.pages.FLAT_DARKS:
                  case this.global.pages.LIGHTS:
                        // For each filter, get 10%, or at least 3 images from the list
                        var fast_mode_filtered_files = this.getFilterFiles(fileNames, filetype, '');
                        var allfilesarr = fast_mode_filtered_files.allfilesarr;
                        fileNames = [];
                        for (var i = 0; i < allfilesarr.length; i++) {
                              if (allfilesarr[i].files.length == 0) {
                                    continue;
                              }
                              console.writeln("filterFilesForFastMode, " + allfilesarr[i].filter);
                              var len = allfilesarr[i].files.length;
                              var cnt = Math.max(3, Math.floor(len / 10));
                              var nth = Math.max(1, Math.floor(len / cnt));
                              for (var j = 0; j < cnt; j++) {
                                    if (j * nth < allfilesarr[i].files.length) {
                                          fileNames[fileNames.length] = allfilesarr[i].files[j * nth].name;
                                    }
                              }
                        }
                        break;
                  default:
                        // Get 10%, or at least 3 images from the list
                        fileNames = fileNames.slice(0, Math.max(3, Math.floor(fileNames.length / 10)));
                        break;
            }

            console.writeln("filterFilesForFastMode, original files " + original_len + ", filtered files " + fileNames.length);

            // Calculate binning to use smaller images
            console.writeln("filterFilesForFastMode, read image " + fileNames[0] + " to get binning");
            this.util.closeOneWindowById("AutoIntegrateFastModeTemp");
            var imgWin = this.util.openImageWindowFromFile(fileNames[0], false, true);
            imgWin.mainView.id = "AutoIntegrateFastModeTemp";
            var binning = this.getFastModeBinning(imgWin);
            this.util.closeOneWindow(imgWin);
            console.writeln("filterFilesForFastMode, binning " + binning);

            if (binning > 1) {
                  fileNames = this.runBinningOnFiles(fileNames, 2, 2, null, null, "_fb" + binning);
            }
            return fileNames;
      } else {
            return fileNames;
      }
}

// Filter files for this.global.get_flowchart_data.
// Pick just one or two files for each channel
// (Binning skipped for now: and use IntegerResample to make files really small.)
flowchartFilterFiles(fileNames, filetype)
{
      if (filetype == this.global.pages.FLATS) {
            console.writeln("flowchartFilterFiles, " + fileNames.length + " flats");
            var stop_on_image = 1;  // Pick two flats for each channel
      } else if (filetype == this.global.pages.FLAT_DARKS) {
            console.writeln("flowchartFilterFiles, " + fileNames.length + " flat darks");
            var stop_on_image = 1;  // Pick two flat darks for each channel
      } else if (filetype == this.global.pages.LIGHTS) {
            console.writeln("flowchartFilterFiles, " + fileNames.length + " lights");
            var stop_on_image = 0;  // Pick one light for each channel
      } else {
            this.util.throwFatalError("flowchartFilterFiles, unknown filetype " + filetype);
      }
      console.flush();

      var flowchar_filtered_files = this.getFilterFiles(fileNames, filetype, '', true);
      var allfilesarr = flowchar_filtered_files.allfilesarr;
      var newFileNames = [];
      var renamedFileNames = [];
      var maxsize = Math.max(flowchar_filtered_files.maxwidth, flowchar_filtered_files.maxheigth);

      // Pick first files for each channel, one file per exposure time group
      console.writeln("flowchartFilterFiles, " + allfilesarr.length + " channels");
      console.flush();
      for (var i = 0; i < allfilesarr.length; i++) {
            console.writeln("flowchartFilterFiles, " + allfilesarr[i].filter + ", " + allfilesarr[i].files.length);
            var exptimeGroups = this.calibrate.groupLightsByExposureTime(allfilesarr[i].files);
            for (var eg = 0; eg < exptimeGroups.length; eg++) {
                  for (var j = 0; j < exptimeGroups[eg].files.length; j++) {
                        var name = exptimeGroups[eg].files[j].name;
                        console.writeln("flowchartFilterFiles, " + allfilesarr[i].filter + ", " + exptimeGroups[eg].exptime + "s, " + name);
                        newFileNames[newFileNames.length] = name;
                        if (j == stop_on_image) {
                              break;
                        }
                  }
            }
      }
      if (0) {
            console.writeln("flowchartFilterFiles, maxsize " + maxsize);
            var binning = 1;
            var binned_size = maxsize;
            while (binned_size > 1024) {
                  binning++;
                  binned_size = maxsize / binning;
            }
            console.writeln("flowchartFilterFiles, binning " + binning);

            // Shrink the files and write renamed files to disk
            newFileNames = this.runBinningOnFiles(newFileNames, 2, binning, null, renamedFileNames, "");
      }
      return newFileNames;
}

flowchartNewIntegrationImage(fileName, targetImageName)
{
      targetImageName = this.util.mapBadWindowNameChars(targetImageName);
      console.writeln("flowchartNewIntegrationImage: " + fileName + ", " + targetImageName);
      // read image file
      var imgWin = this.util.openImageWindowFromFile(fileName, true);
      if (imgWin == null) {
            var viewname = this.util.ensure_win_prefix((this.util.mapBadWindowNameChars(File.extractName(fileName))));
            console.writeln("flowchartNewIntegrationImage, cannot open image file " + fileName + ", trying to find view " + viewname);
            imgWin = this.util.findWindow(viewname);
      }
      if (imgWin == null) {
            this.util.throwFatalError("flowchartNewIntegrationImage, cannot open image file " + fileName);
      }
      // rename image
      console.writeln("flowchartNewIntegrationImage, rename " + imgWin.mainView.id + " to " + targetImageName);
      imgWin.mainView.id = targetImageName;

      // Do binning to ensure we work on small images
      console.writeln("flowchartNewIntegrationImage, binning " + targetImageName);
      var minsize = Math.min(imgWin.mainView.image.width, imgWin.mainView.image.height);
      var binning = 1;
      var binned_size = minsize;
      while (binned_size > 1024) {
            binning++;
            binned_size = minsize / binning;
      }
      console.writeln("flowchartNewIntegrationImage, binning " + binning);
      this.runBinning(imgWin, binning);

      return targetImageName;
}

flowchartNewImage(imgWin, targetImageName)
{
      console.writeln("flowchartNewImage: " + targetImageName);

      // copy image file
      this.util.copyWindow(imgWin, this.util.ensure_win_prefix(targetImageName));

      return targetImageName;
}

flowchartUpdated()
{
      if (this.par.flowchart_debug.val) console.writeln("flowchartUpdated");
      if (this.gui) {
            this.gui.flowchartUpdated();
      }
}


guiSetTreeBoxNodeSsweight(node, filename, ssweight, filename_postfix)
{
      if (this.gui) {
            this.gui.setTreeBoxSsweight(node, filename, ssweight, filename_postfix);
      }
}

guiUpdatePreviewWin(imgWin)
{
      if (this.gui) {
            this.gui.updatePreviewWin(imgWin);
      }
}

guiUpdatePreviewId(id)
{
      if (this.gui) {
            this.gui.updatePreviewId(id);
      }
}

guiUpdatePreviewFilename(filename, run_autostf = false)
{
      if (this.gui) {
            this.gui.updatePreviewFilename(filename, run_autostf);
      }
}

targetTypeToStretching(targetType)
{
      if (targetType == 'Galaxy' ||
          targetType == 'Star cluster'
      ) {
            return 'Masked Stretch';
      } else if (targetType == 'Nebula') {
            return 'Auto STF';
      } else {
            return null;
      }
}

targetTypeSetup()
{
      let stretching = this.targetTypeToStretching(this.par.target_type.val);
      if (stretching != null) {
            this.local_image_stretching = stretching;
            console.writeln(this.par.target_type.val + " target using " + this.local_image_stretching);
      }
}

printImageInfo(images, name)
{
      if (images.images.length == 0) {
            return;
      }
      this.util.addProcessingStep("* " + name + " " + images.images.length + " data files *");
      this.util.addProcessingStep(name + " images best ssweight: "+images.best_ssweight);
      this.util.addProcessingStep(name + " images best image: "+images.best_image);
      this.util.addProcessingStep(name + " exptime: "+images.exptime);
}

winIsValid(w)
{
      return w != null;
}

checkWinFilePathForOutputDir(w)
{
      if (w.filePath) {
            this.util.setOutputRootDir(this.util.getOutputDir(w.filePath));
      }
}

checkAutoCont(w)
{
      if (this.winIsValid(w))  {
            this.checkWinFilePathForOutputDir(w);
            return true;
      } else {
            return false;
      }
}


saveProcessedImage(id, save_id)
{
      if (id == null) {
            return;
      }

      if (!save_id.endsWith("_processed")) {
            // Replace _map or _map_pm to _processed
            if (save_id) {
                  save_id = save_id.replace(/_map.*/g, "_processed");
            } else {
                  save_id = id.replace(/_map.*/g, "_processed");
            }
            this.util.copyWindow(this.util.findWindow(id), save_id);
            this.global.processed_channel_images[this.global.processed_channel_images.length] = save_id;
      }

      console.writeln("Save processed image " + id + " as " + save_id);

      this.save_id_list.push([save_id, save_id]);
}

saveProcessedWindow(id, optional_save_id = null, optional_extension = ".xisf")
{
      if (id == null) {
            return null;
      }
      if (this.global.get_flowchart_data) {
            return null;
      }
      if (this.global.outputRootDir == "") {
            // Ask for a save location
            this.util.ensureDialogFilePath(optional_save_id ? optional_save_id : id);
            if (this.global.outputRootDir == "") {
                  this.util.addCriticalStatus("No output directory, cannot save image " + (optional_save_id ? optional_save_id : id));
                  return null;
            }
            var processedPath = this.global.outputRootDir;
      } else {
            var processedPath = this.util.combinePath(this.global.outputRootDir, this.global.AutoProcessedDir);
            this.util.ensureDir(processedPath);
      }
      var path = this.util.ensurePathEndSlash(processedPath);
      var uniquepart = this.util.getOptionalUniqueFilenamePart();

      var fname = this.util.saveWindowEx(path, id, uniquepart, optional_save_id, optional_extension);

      var image_win = this.util.findWindow(id);
      if (image_win == null) {
            this.util.throwFatalError("saveProcessedWindow:could not find image " + id);
      }
      var keyword = this.util.getKeywordValue(image_win, "AutoIntegrate");
      console.writeln("saveProcessedWindow, keyword " + keyword + ", id " + id + ", save_id " + optional_save_id + ", extension " + optional_extension);

      if (keyword == "finalimage" && !optional_save_id && optional_extension == ".xisf") {
            // Saving final image with default extension, check if we should save in other formats too
            if (this.par.save_final_image_tiff.val) {
                  // Save as TIFF, 16 bit
                  console.writeln("saveProcessedWindow:save as TIFF, 16 bit");
                  var tmp_win = this.util.copyWindow(image_win, id + "_savetmp");
                  if (tmp_win.bitsPerSample != 16) {
                        console.writeln("saveProcessedWindow:TIFF, set bits to 16");
                        tmp_win.setSampleFormat(16, false);
                  }
                  this.util.saveWindowEx(path, tmp_win.mainView.id, uniquepart, id, ".tif");
                  this.util.closeOneWindow(tmp_win);
            }
            if (this.par.save_final_image_jpg.val) {
                  // Save as JPG, 8 bit
                  var fname = path + id + uniquepart + ".jpg";
                  console.writeln("saveProcessedWindow:save as JPG, 8 bit, quality " + this.par.save_final_image_jpg_quality.val);
                  this.util.saveWindowAsJpg(image_win, fname, this.par.save_final_image_jpg_quality.val);
            }
      }
      return fname;
}

saveOutputWindow(id, save_id)
{
      console.writeln("saveOutputWindow, id " + id + " as " + save_id);

      if (id == null) {
            return null;
      }
      var path = this.global.outputRootDir;
      if (path == "") {
            this.util.addCriticalStatus("No output directory, cannot save image "+ id);
            return null;
      }

      this.util.copyWindow(this.util.findWindow(id), save_id);

      var outputPath = this.util.combinePath(path, this.global.AutoOutputDir);
      this.util.ensureDir(outputPath);

      var saved_name = this.util.saveWindowEx(this.util.ensurePathEndSlash(outputPath), save_id, this.util.getOptionalUniqueFilenamePart());

      this.util.closeOneWindowById(save_id);

      return saved_name;
}

saveMasterWindow(path, id)
{
      if (path == "") {
            this.util.throwFatalError("No output directory, cannot save image "+ id);
      }
      var masterDir = this.util.combinePath(path, this.global.AutoMasterDir);
      this.util.ensureDir(this.global.outputRootDir);
      this.util.ensureDir(masterDir);
      var fname = this.util.saveWindowEx(this.util.ensurePathEndSlash(masterDir), id, "");
      if (fname == null) {
            this.util.throwFatalError("Failed to save work image: " + this.util.ensurePathEndSlash(masterDir) + id);
      }
      return fname;
}

boolToInteger(b)
{
      b == true ? 1 : 0;
}

// Check options for possible conflicting settings
// Nete that check_engine_processing does similar things a bit earlier
checkOptions()
{
      var intval = this.boolToInteger(this.par.remove_stars_before_stretch.val) + this.boolToInteger(this.par.remove_stars_channel.val) + 
                   this.boolToInteger(this.par.remove_stars_stretched.val) + this.boolToInteger(this.par.remove_stars_light.val);
      if (intval > 1) {
            this.util.throwFatalError("Only one remove stars option can be selected.")
      }
      if (this.par.remove_stars_light.val && this.local_RGB_stars) {
            this.util.throwFatalError("Remove stars light and RGB stars cannot be used together.");
      }
      if (this.par.enhancements_combine_stars.val && !this.par.enhancements_remove_stars.val) {
            this.util.throwFatalError("Enhancements combine stars cannot be used during processing if enhancements remove stars is not set.");
      }
      if (this.par.local_normalization.val && this.par.use_fastintegration.val) {
            this.util.throwFatalError("Local normalization and fast integration cannot be used together.");
      }
}

setMaskChecked(imgWin, maskWin)
{
      try {
            imgWin.setMask(maskWin);
      } catch(err) {
            console.criticalln("setMask failed: " + err.toString());
            console.criticalln("Image:" + imgWin.mainView.id + ", mask:" + maskWin.mainView.id);
            console.criticalln("Maybe mask is from different data set, different image size/binning or different crop to common areas setting.");
            this.save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
            this.util.throwFatalError("Error setting the mask.");
      }
}

getChangedProcessingOptions()
{
      if (this.global.debug) console.writeln("getChangedProcessingOptions");
      var options = [];
      for (let x in this.par) {
            var param = this.par[x];
            if (this.global.isParameterChanged(param)) {
                  options[options.length] = [ param.name, param.val ];
            }
      }
      if (this.global.debug) console.writeln("getChangedProcessingOptions:return options " + options.length);
      return options;
}

checkCancel()
{
      if (this.global.cancel_processing) {
            this.global.cancel_processing = false;
            this.util.addProcessingStep("Processing canceled");
            this.util.throwFatalError("Processing canceled");
      }
}

copy_processed_image(imgWin, process_name)
{
      if (this.par.keep_processed_images.val 
          && imgWin 
          && !this.global.creating_mask
          && this.global.is_processing == this.global.processing_state.processing) 
      {
            // Copy window to new window with process name
            var copy_name = this.util.ensure_win_prefix(this.util.mapBadWindowNameChars(process_name) + "_" + imgWin.mainView.id);
            console.writeln("Copy processed image " + imgWin.mainView.id + " to " + copy_name);
            this.util.copyWindow(imgWin, copy_name);
      }
}

engine_end_process(node, imgWin = null, process_name = null, copy_image = true)
{
      if (this.global.debug) console.writeln("engine_end_process");
      if (node) {
            console.writeln("Process end " + node.txt);
            if (!this.global.get_flowchart_data) {
                  this.flowchart.flowchartOperationEnd(node);
            }
      }
      if (imgWin && this.global.is_processing == this.global.processing_state.processing) {
            if (this.global.testmode) {
                  this.global.testmode_log += process_name + "\n";
            }
            this.saveProcessingStepToImage(imgWin, "Step " + this.stepno + ": " + process_name);
            this.stepno++;
      }
      if (copy_image) {
            this.copy_processed_image(imgWin, process_name);
      }
      this.checkCancel();
}

extractHSchannels(sourceWindow)
{
      var P = new ChannelExtraction;
      P.colorSpace = ChannelExtraction.HSI;
      P.channels = [ // enabled, id
            [true,  ""],       // H
            [false, ""],       // S
            [false, ""]        // I
      ];
      P.sampleFormat = ChannelExtraction.SameAsSource;

      sourceWindow.mainView.beginProcess(UndoFlag.NoSwapFile);
      P.executeOn(sourceWindow.mainView);
      var hueWindow = ImageWindow.activeWindow;
      sourceWindow.mainView.endProcess();

      this.engine_end_process(null);

      var P = new ChannelExtraction;
      P.colorSpace = ChannelExtraction.HSI;
      P.channels = [ // enabled, id
            [false, ""],       // H
            [true,  ""],       // S
            [false, ""]        // I
      ];
      P.sampleFormat = ChannelExtraction.SameAsSource;

      sourceWindow.mainView.beginProcess(UndoFlag.NoSwapFile);
      P.executeOn(sourceWindow.mainView);
      var saturationWindow = ImageWindow.activeWindow;
      sourceWindow.mainView.endProcess();

      this.engine_end_process(null);

      return [ hueWindow , saturationWindow ];
}

extractIchannel(sourceWindow)
{
      var P = new ChannelExtraction;
      P.colorSpace = ChannelExtraction.HSI;
      P.channels = [ // enabled, id
            [false, ""],       // H
            [false, ""],       // S
            [true,  ""]        // I
      ];
      P.sampleFormat = ChannelExtraction.SameAsSource;

      sourceWindow.mainView.beginProcess(UndoFlag.NoSwapFile);
      P.executeOn(sourceWindow.mainView);
      var intensityWindow = ImageWindow.activeWindow;
      sourceWindow.mainView.endProcess();

      this.engine_end_process(null);

      return intensityWindow;
}

extractLchannel(sourceWindow, from_lights)
{
      if (this.global.debug) console.writeln("extractLchannel");
      var node = null;
      var P = new ChannelExtraction;
      P.colorSpace = ChannelExtraction.CIELab;
      P.channels = [ // enabled, id
            [true, ""],       // L
            [false, ""],      // a
            [false, ""]       // b
      ];
      P.sampleFormat = ChannelExtraction.SameAsSource;

      sourceWindow.mainView.beginProcess(UndoFlag.NoSwapFile);
      P.executeOn(sourceWindow.mainView);
      var targetWindow = ImageWindow.activeWindow;
      sourceWindow.mainView.endProcess();

      this.printAndSaveProcessValues(P, "", sourceWindow.mainView.id);
      this.engine_end_process(node);
      return targetWindow;
}

enhancementsRescaleImage(imgWin)
{
      this.addEnhancementsStep("Rescale image");
      var node = this.flowchart.flowchartOperation("PixelMath:rescale");

      if (this.global.get_flowchart_data) {
            return;
      }

      var min = imgWin.mainView.image.minimum();
      var max = imgWin.mainView.image.maximum();
      //var expression = "rescale($T," + min + "," + max + ")";
      var expression = "normalize($T)";

      console.writeln("Expression " + expression + ", min " + min + ", max " + max);

      var P = new PixelMath;

      P.expression = expression;
      P.useSingleExpression = true;
      P.showNewImage = false;
      P.createNewImage = false;
      P.newImageId = "";
      P.newImageColorSpace = PixelMath.RGB;

      imgWin.mainView.beginProcess(UndoFlag.NoSwapFile);

      P.executeOn(imgWin.mainView);

      imgWin.mainView.endProcess();

      this.engine_end_process(node);
}

enhancementsNormalizeImage(imgWin)
{
      this.addEnhancementsStep("Normalize image");
      var node = this.flowchart.flowchartOperation("PixelMath:normalize");

      if (this.global.get_flowchart_data) {
            return;
      }

      if (!imgWin.mainView.image.isColor) {
            this.util.throwFatalError("Normalization can only be applied to color images.");
      }

      /* Normalize black point and brightness on all this.channels based on a reference channel.
       * Normalization uses similar PixelMath expressions as Bill Blanshan in his 
       * Narrowband Normalization using Pixnsight Pixelmath script. See more information 
       * in his YouTube channel AnotherAstroChannel.
       */
      switch (this.par.enhancements_normalize_channels_reference.val) {
            case 'R':
                  var expressions = [ "$T[0]",
                                      "((adev($T[0])/adev($T[1]))*($T[1]-med($T[1])))+med($T[0])",
                                      "((adev($T[0])/adev($T[2]))*($T[2]-med($T[2])))+med($T[0])"
                                    ];
                  break;
            case 'G':
                  var expressions = [ "((adev($T[1])/adev($T[0]))*($T[0]-med($T[0])))+med($T[1])",
                                      "$T[1]",
                                      "((adev($T[1])/adev($T[2]))*($T[2]-med($T[2])))+med($T[1])"
                                    ];
                  break;
            case 'B':
                  var expressions = [ "((adev($T[2])/adev($T[0]))*($T[0]-med($T[0])))+med($T[2])",
                                      "((adev($T[2])/adev($T[1]))*($T[1]-med($T[1])))+med($T[2])",
                                      "$T[2]"
                                    ];
                  break;
            default:
                  this.util.throwFatalError("Invalid enhancements_normalize_channels_reference value: " + this.par.enhancements_normalize_channels_reference.val);
                  break;
      }

      if (this.par.enhancements_normalize_channels_mask.val) {
            this.util.closeOneWindowById("AutoNormalizeMask");
            this.setNewMaskWindow(this.newMaskWindow(imgWin, "AutoNormalizeMask", false, true));
      }

      console.writeln("Expressions " + expressions[0] + ", " + expressions[1] + ", " + expressions[2]);

      var P = new PixelMath;

      P.expression = expressions[0];
      P.expression1 = expressions[1];
      P.expression2 = expressions[2];
      P.useSingleExpression = false;
      P.showNewImage = false;
      P.createNewImage = false;
      P.newImageId = "";
      P.newImageColorSpace = PixelMath.RGB;
      if (this.par.enhancements_normalize_channels_rescale.val) {
            P.rescale = true;
            P.truncate = false;
      }

      imgWin.mainView.beginProcess(UndoFlag.NoSwapFile);

      if (this.par.enhancements_normalize_channels_mask.val) {
            this.setMaskChecked(imgWin, this.mask_win);
            /* Normalize only light parts of the image. */
            imgWin.maskInverted = false;
      }

      P.executeOn(imgWin.mainView);

      if (this.par.enhancements_normalize_channels_mask.val) {
            imgWin.removeMask();
            this.util.closeOneWindow(this.mask_win);
      }
      imgWin.mainView.endProcess();

      this.engine_end_process(node);
}

addMildBlur(imgWin)
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

      imgWin.mainView.beginProcess(UndoFlag.NoSwapFile);
      P.executeOn(imgWin.mainView);
      imgWin.mainView.endProcess();

      this.printAndSaveProcessValues(P, "blur");
      this.engine_end_process(null);
}

findHistogramPeak(win, channel = -1)
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
                  // combine all this.channels
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
      console.writeln(this.channelText(channel) + " histogram peak is at " + normalizedPeakCol + " (value " + peakValue + ", col "+ peakCol + ", maxcol " + histogramMatrix.cols + ")");
      return { peakValue : peakValue, peakCol : peakCol, maxCol : histogramMatrix.cols, normalizedPeakCol :  normalizedPeakCol, maxRows : histogramMatrix.rows };
}

countPixels(histogramMatrix, row)
{
      var cnt = 0;
      for (var i = 0; i < histogramMatrix.cols; i++) {
            cnt += histogramMatrix.at(row, i);
      }
      // console.writeln("Pixel count for matrix row " + row + " is " + cnt);
      return cnt;
}

getAdjustPoint(win, perc, channel = -1)
{
      // Get image histogram
      var view = win.mainView;
	var histogramMatrix = view.computeOrFetchProperty("Histogram16");

      var pixelCount = 0;
      if (channel >= 0) {
            pixelCount += this.countPixels(histogramMatrix, channel);
      } else {
            // Count pixels for all this.channels
            console.writeln("getAdjustPoint, all channels, histogramMatrix.rows " + histogramMatrix.rows);
            for (var i = 0; i < histogramMatrix.rows; i++) {
                  pixelCount += this.countPixels(histogramMatrix, i);
            }
      }
      // console.writeln("Total pixel count for matrix is " + pixelCount);

      var adjustPoint = (perc / 100) * pixelCount;
      console.writeln("Adjust point pixel count " + adjustPoint + " (" + perc + "%)");

      // Adjust shadows
      var adjustCount = 0;
      for (var col = 0; col < histogramMatrix.cols; col++) {
            var coladjustCount = 0;
            if (channel >= 0) {
                  coladjustCount += histogramMatrix.at(channel, col)
            } else {
                  for (var row = 0; row < histogramMatrix.rows; row++) {
                        coladjustCount += histogramMatrix.at(row, col)
                  }
            }
            adjustCount += coladjustCount;
            // if (adjustCount > adjustPoint && col != 0 && coladjustCount > 0) {
            if (adjustCount > adjustPoint && coladjustCount > 0) {
                  adjustCount = adjustCount - coladjustCount;
                  break;
            }
      }
      var normalizedAdjustPoint = col / histogramMatrix.cols;
      console.writeln(this.channelText(channel) + " normalized adjust value is " + normalizedAdjustPoint + ", pixel count " + adjustCount + ", col " + col);

      return { normalizedAdjustPoint : normalizedAdjustPoint, rows : histogramMatrix.rows, adjustCount : adjustCount };
}

adjustShadows(win, perc)
{
      console.writeln("Adjust " + perc + "% of shadows from image " + win.mainView.id);

      var node = this.flowchart.flowchartOperation("Adjust shadows");
      if (this.global.get_flowchart_data) {
            return;
      }

      this.printImageStatistics(win);
      
      var view = win.mainView;

      var adjust = this.getAdjustPoint(win, perc, -1);
      var normalizedAdjustPoint = adjust.normalizedAdjustPoint;

      var P = new HistogramTransformation;
      if (adjust.rows == 1) {
            P.H = [ // c0, m, c1, r0, r1
                  [0.00000000, 0.50000000, 1.00000000, 0.00000000, 1.00000000],
                  [0.00000000, 0.50000000, 1.00000000, 0.00000000, 1.00000000],
                  [0.00000000, 0.50000000, 1.00000000, 0.00000000, 1.00000000],
                  [normalizedAdjustPoint, 0.50000000, 1.00000000, 0.00000000, 1.00000000],  // luminance
                  [0.00000000, 0.50000000, 1.00000000, 0.00000000, 1.00000000]
            ];
      } else {
            P.H = [ // c0, m, c1, r0, r1
                  [normalizedAdjustPoint, 0.50000000, 1.00000000, 0.00000000, 1.00000000],   // R
                  [normalizedAdjustPoint, 0.50000000, 1.00000000, 0.00000000, 1.00000000],   // G
                  [normalizedAdjustPoint, 0.50000000, 1.00000000, 0.00000000, 1.00000000],   // B
                  [0.00000000, 0.50000000, 1.00000000, 0.00000000, 1.00000000],  // luminance
                  [0.00000000, 0.50000000, 1.00000000, 0.00000000, 1.00000000]
            ];
      }
      view.beginProcess(UndoFlag.NoSwapFile);

      P.executeOn(view, false);

      view.endProcess();

      this.printAndSaveProcessValues(P, "shadows");
      this.engine_end_process(node, win, "HistogramTransformation:adjust shadows");

      this.printImageStatistics(win);
}

channelText(channel)
{
      switch (channel) {
            case 0:
                  return 'Red';
            case 1:
                  return 'Green';
            case 2:
                  return 'Blue';
            case -1:
                  return 'All';
            default:
                  this.util.throwFatalError("Invalid channel value: " + channel);
                  return 'unknown';
      }
}

// Find symmetry point as percentage of clipped pixels
findSymmetryPoint(win, perc, channel = -1)
{
      console.writeln(this.channelText(channel) + ", findSymmetryPoint at " + perc + "% of shadows from image " + win.mainView.id);

      // Get image histogram
      var view = win.mainView;
	var histogramMatrix = view.computeOrFetchProperty("Histogram16");

      var pixelCount = 0;
      if (channel >= 0) {
            pixelCount += this.countPixels(histogramMatrix, channel);
      } else {
            // Count pixels for each row
            for (var i = 0; i < histogramMatrix.rows; i++) {
                  pixelCount += this.countPixels(histogramMatrix, i);
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
      var normalizedAdjustPoint = col / histogramMatrix.cols;
      console.writeln(this.channelText(channel) + " symmetry point is " + normalizedAdjustPoint);

      return normalizedAdjustPoint;
}

newMaskWindow(sourceWindow, name, allow_duplicate_name, clip_shadows_more)
{
      var targetWindow;

      if (sourceWindow.mainView.image.colorSpace != ColorSpace.Gray) {
            /* If we have color files we extract lightness component and
               use it as a mask.
            */
            this.util.addProcessingStepAndStatusInfo("Create mask by extracting lightness component from color image " + sourceWindow.mainView.id);

            targetWindow = this.extractLchannel(sourceWindow);

            if (this.par.force_new_mask.val) {
                  this.util.closeOneWindowById(name);
            }
      
            this.util.windowRenameKeepifEx(targetWindow.mainView.id, name, true, allow_duplicate_name);
      } else {
            /* Default mask is the same as stretched image. */
            this.util.addProcessingStepAndStatusInfo("Create mask from image " + sourceWindow.mainView.id);
            targetWindow = this.util.copyWindowEx(sourceWindow, name, allow_duplicate_name);
      }

      // addMildBlur(targetWindow); Not sure if this actually helps

      targetWindow.show();

      if (clip_shadows_more) {
            this.autoContrast(targetWindow, 10, 99.9);
      } else if (!this.par.skip_mask_contrast.val) {
            this.autoContrast(targetWindow, 0.1, 99.9);
      }

      this.runMultiscaleLinearTransformReduceNoise(targetWindow, null, 3);

      return targetWindow;
}

setNewMaskWindow(maskWin)
{
      if (maskWin != null && maskWin.isNull) {
            maskWin = null;
      }
      if (this.global.debug) console.writeln("setNewMaskWindow: " + (maskWin ? maskWin.mainView.id : "null"));
      if (this.mask_win == maskWin) {
            return;
      }
      if (this.mask_win != null && !this.mask_win.isClosed && this.mask_win.mainView != null) {
            if (this.global.debug) console.writeln("setNewMaskWindow: close old mask");
            this.util.closeOneWindow(this.mask_win);
      }
      this.mask_win = maskWin;
      if (maskWin != null) {
            this.mask_win_id = maskWin.mainView.id;
      } else {
            this.mask_win_id = null;
      }
      if (this.global.debug) console.writeln("setNewMaskWindow: new mask set to " + (maskWin ? maskWin.mainView.id : "null"));
}

maskIsCompatible(imgWin, maskWin)
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

treeboxfilesToFilenames(treeboxfiles)
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
openImageFiles(filetype, lights_only, json_only, filetype_is_full_caption)
{
      var ofd = new OpenFileDialog;

      ofd.multipleSelections = true;
      if (this.ppar.lastDir != "") {
            ofd.initialPath = this.ppar.lastDir;
      }
      if (filetype_is_full_caption) {
            ofd.caption = filetype;
      } else if (lights_only) {
            ofd.caption = "Select " + filetype + " files";
      } else if (json_only) {
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
      } else if (!this.par.select_all_files.val) {
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

      if (ofd.filePaths.length < 1) {
            return null;
      }
      this.util.saveLastDir(File.extractDrive(ofd.filePaths[0]) + File.extractDirectory(ofd.filePaths[0]));
      if (json_only) {
            // accept any single file selected
            if (ofd.filePaths.length != 1)  {
                  console.criticalln("Only one Json file can be loaded");
                  return null;
            }
            var is_json_file = true;
      } else {
            var is_json_file = (ofd.filePaths.length == 1 && File.extractExtension(ofd.filePaths[0]) == ".json");
      }
      if (is_json_file) {
            /* Read files from a json file.
             * If lights_only, return a simple file array of light files
             * If not lights_only, return treebox files for each page
             */
            var pagearray = this.util.readJsonFile(ofd.filePaths[0], lights_only);
            if (lights_only) {
                  if (pagearray[this.global.pages.LIGHTS] == null) {
                        return null;
                  } else {
                        return this.treeboxfilesToFilenames(pagearray[this.global.pages.LIGHTS].files);
                  }
            } else {
                  return pagearray;
            }
      } else if (!lights_only) {
            /* Returns a simple file array as the only array member
             */
            return [ ofd.filePaths ];
      } else {
            // return a simple file array
            return ofd.filePaths;
      }
}

openDirectoryFiles(filetype, file_filter, lights_only, filetype_is_full_caption, pageIndex)
{
      console.writeln("openDirectoryFiles: " + filetype + " " + file_filter);

      var gdd = new GetDirectoryDialog;

      gdd.initialPath = this.ppar.lastDir;
      if (filetype_is_full_caption) {
            gdd.caption = filetype;
      } else {
            gdd.caption = "Select " + filetype + " files directory";
      }
      
      if (!gdd.execute()) {
            console.writeln("No directory selected");
            return null;
      }
      console.writeln("openDirectoryFiles: directory=" + gdd.directory);

      if (file_filter.trim() < 1 ) {
            console.writeln("Empty filter");
            return null;
      }
      var file_filter_array = file_filter.split(" ");
      if (file_filter_array.length < 1) {
            console.writeln("No file filter given");
            return null;
      }

      var fileNames = [];
      for (var i = 0; i < file_filter_array.length; i++) {
            console.writeln("openDirectoryFiles: file_filter_array[" + i + "]=" + file_filter_array[i]);
            var filelist = this.searchDirectory(gdd.directory + "/" + file_filter_array[i], true /*recursive*/ );
            fileNames = fileNames.concat(filelist);
      }
      if (fileNames.length < 1) {
            console.writeln("No '" + file_filter + "' files found in directory " + gdd.directory);
            return null;
      }
      console.writeln("openDirectoryFiles: fileNames[0]=" + fileNames[0]);

      this.util.saveLastDir(gdd.directory);

      if (pageIndex == this.global.pages.LIGHTS) {
            // If we opened lights files we save the directory
            // We may want to use it as outputRootDir
            console.writeln("openDirectoryFiles: save to openedLightsDirectories, directory=" + gdd.directory);
            this.global.openedLightsDirectories.push(gdd.directory);
      }

      if (lights_only) {
            return fileNames;
      } else {
            return [ fileNames ];
      }
}

findMin(arr, idx)
{
      var val = arr[0][idx];
      if (isNaN(val)) {
            val = 0;
      }
      var minval = val;
      for (var i = 1; i < arr.length; i++) {
            val = arr[i][idx];
            if (isNaN(val)) {
                  val = 0;
            }
            if (val < minval) {
                  minval = val;
            }
      }
      return minval;
}

findMax(arr, idx)
{
      var val = arr[0][idx];
      if (isNaN(val)) {
            val = 0;
      }
      var maxval = val;
      for (var i = 1; i < arr.length; i++) {
            val = arr[i][idx];
            if (isNaN(val)) {
                  val = 0;
            }
            if (val > maxval) {
                  maxval = val;
            }
      }
      return maxval;
}

updateBinningKeywords(imageWindow, binning_size)
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
getTargetFITSKeywordsForPixelmath(imageWindow)
{
      var oldKeywords = [];
      var keywords = imageWindow.keywords;
      for (var i = 0; i < keywords.length; i++) {
            var keyword = keywords[i];
            if (keyword.name != 'FILTER')  {
                  oldKeywords[oldKeywords.length] = keyword;
            }
      }
      return oldKeywords;
}

// put keywords to PixelMath generated image
setTargetFITSKeywordsForPixelmath(imageWindow, keywords)
{
      imageWindow.keywords = keywords;
}

copySelectedFITSKeywords(sourceWindow, targetWindow)
{
      var keywords = sourceWindow.keywords;
      for (var i = 0; i < keywords.length; i++) {
            var keyword = keywords[i];
            if (keyword.name == 'AutoIntegrateDrizzle'
                || keyword.name == 'AutoIntegrateMEDFWHM'
                || keyword.name == 'AutoLinearfit') 
            {
                  // copy keyword
                  console.writeln("Copy keyword " + keyword.name + " to " + targetWindow.mainView.id);
                  targetWindow.keywords = targetWindow.keywords.concat([keyword]);
            }
      }
}

setSSWEIGHTkeyword(imageWindow, SSWEIGHT) 
{
      var oldKeywords = this.util.filterKeywords(imageWindow, "SSWEIGHT");
      imageWindow.keywords = oldKeywords.concat([
         new FITSKeyword(
            "SSWEIGHT",
            SSWEIGHT.toFixed(10),
            "Image weight"
         )
      ]);
      this.ssweight_set = true;
}

setFinalImageKeyword(imageWindow) 
{
      console.writeln("setFinalImageKeyword to " + imageWindow.mainView.id);
      this.setAutoIntegrateVersionIfNeeded(imageWindow);
      this.util.setFITSKeyword(
            imageWindow,
            "AutoIntegrate",
            "finalimage",
            "AutoIntegrate processed final image");
}

setAutoIntegrateVersionIfNeeded(imageWindow)
{
      if (!imageWindow) {
            return;
      }
      if (!imageWindow.keywords) {
            imageWindow.keywords = [];
      }
      var version = this.global.autointegrate_version;
      var existingVersion = this.util.getKeywordValue(imageWindow, "AutoIntegrateVersion");
      if (existingVersion == null) {
            this.util.setFITSKeyword(
                  imageWindow,
                  "AutoIntegrateVersion",
                  version,
                  "AutoIntegrate version");
      }
}

getProcessingInfo()
{
      var header = [];
      var options = [];

      if (this.global.debug) console.writeln("getProcessingInfo");

      header.push("PixInsight version " + this.global.pixinsight_version_str);
      header.push(this.global.autointegrate_version);
      var d = new Date();
      header.push("Processing date " + d.toString());
      var processingOptions = this.getChangedProcessingOptions();
      if (processingOptions.length > 0) {
            header.push("Processing options:");
            for (var i = 0; i < processingOptions.length; i++) {
                  options.push(processingOptions[i][0] + ": " + processingOptions[i][1]);
            }
      } else {
            header.push("Using default processing options");
      }
      if (this.global.debug) console.writeln("getProcessingInfo:end");
      return { header : header, options : options };
}

saveProcessingStepToImage(imageWindow, step) 
{
      console.writeln("saveProcessingStepToImage to " + imageWindow.mainView.id + ", step " + step);
      this.setAutoIntegrateVersionIfNeeded(imageWindow);
      this.util.appenFITSKeyword(
            imageWindow,
            "HISTORY",
            step,
            "AutoIntegrate processing");
}

saveProcessingHistoryToImage(imageWindow) 
{
      console.writeln("saveProcessingHistoryToImage to " + imageWindow.mainView.id);
      this.setAutoIntegrateVersionIfNeeded(imageWindow);
      var processing_info = this.getProcessingInfo();
      for (var i = 0; i < processing_info.header.length; i++) {
            this.util.appenFITSKeyword(
                  imageWindow,
                  "HISTORY",
                  processing_info.header[i],
                  "AutoIntegrate processing info");
      }
      for (var i = 0; i < processing_info.options.length; i++) {
            this.util.appenFITSKeyword(
                  imageWindow,
                  "HISTORY",
                  processing_info.options[i],
                  "AutoIntegrate processing option " + (i + 1));
      }
}

saveEnhancementsHistoryToImage(imageWindow) 
{
      console.writeln("saveEnhancementsHistoryToImage to " + imageWindow.mainView.id);
      this.setAutoIntegrateVersionIfNeeded(imageWindow);
      var enhancementscount = this.util.getKeywordValue(imageWindow, "AutoIntegrateEnhancementsCount");
      if (enhancementscount == null) {
            enhancementscount = 0;
      } else {
            enhancementscount = parseInt(enhancementscount);
      }
      for (var i = 0; i < this.global.enhancements_info.length; i++) {
            this.util.appenFITSKeyword(
                  imageWindow,
                  "HISTORY",
                  this.global.enhancements_info[i],
                  "AutoIntegrate enhancements option " + (enhancementscount + i + 1));
      }
      this.util.setFITSKeyword(
            imageWindow, 
            "AutoIntegrateEnhancementsCount", 
            (enhancementscount + this.global.enhancements_info.length).toString(), 
            "AutoIntegrate enhancements step count");
}

setDrizzleKeyword(imageWindow, val) 
{
      console.writeln("setDrizzleKeyword to " + val);
      this.util.setFITSKeyword(
            imageWindow,
            "AutoIntegrateDrizzle",
            val.toString(),
            "AutoIntegrate drizzle scale");
}

setMEDFWHMKeyword(imageWindow, val) 
{
      console.writeln("setMEDFWHMKeyword to " + val);
      this.util.setFITSKeyword(
            imageWindow,
            "AutoIntegrateMEDFWHM",
            val.toString(),
            "Median FWHM of images");
}

setImagetypKeyword(imageWindow, imagetype) 
{
      this.util.setFITSKeyword(
            imageWindow,
            "IMAGETYP",
            imagetype,
            "Type of image");
}

setFilterKeyword(imageWindow, value) 
{
      this.util.setFITSKeyword(
            imageWindow,
            "FILTER",
            value,
            "Filter used when taking the image");
}

writeImage(filePath, imageWindow) 
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

filesForImageIntegration(fileNames)
{
      var images = [];
      for (var i = 0; i < fileNames.length; i++) {
            images[images.length] = [ true, fileNames[i], null, null ]; // [ enabled, path, drizzlePath, localNormalizationDataPath ];
      }
      return images;
}

filesForImageIntegrationFromFilearr(filearr)
{
      var images = [];
      for (var i = 0; i < filearr.length; i++) {
            images[images.length] = [ true, filearr[i].name, null, null ]; // [ enabled, path, drizzlePath, localNormalizationDataPath ];
      }
      return images;
}

fileNamesToEnabledPath(fileNames)
{
      var images = [];
      for (var i = 0; i < fileNames.length; i++) {
            images[images.length] = [ true, fileNames[i] ]; // [ enabled, path ];
      }
      return images;
}

fileNamesToEnabledPathSubframes(fileNames)
{
      var images = [];
      for (var i = 0; i < fileNames.length; i++) {
            images[images.length] = [ true, fileNames[i], null, null ]; // subframeEnabled, subframePath, localNormalizationDataPath, drizzlePath
      }
      return images;
}

fileNamesToEnabledPathFromFilearr(filearr)
{
      var images = [];
      for (var i = 0; i < filearr.length; i++) {
            images[images.length] = [ true, filearr[i].name ]; // [ enabled, path ];
      }
      return images;
}

fileNamesFromFilearr(filearr)
{
      var fileNames = [];
      for (var i = 0; i < filearr.length; i++) {
            fileNames[fileNames.length] = filearr[i].name;
      }
      return fileNames;
}

imagesEnabledPathToFileList(images)
{
      var fileNames = [];
      for (var i = 0; i < images.length; i++) {
            fileNames[fileNames.length] = images[i][1];
      }
      return fileNames;
}

// Group files based on telescope and resolution
getLDDgroups(fileNames)
{
      console.writeln("getLDDgroups");
      var groups = [];
      for (var i = 0; i < fileNames.length; i++) {
            var keywords = this.getFileKeywords(fileNames[i]);
            var groupname = "";
            var naxis1 = 0;
            for (var j = 0; j < keywords.length; j++) {
                  var value = keywords[j].strippedValue.trim();
                  switch (keywords[j].name) {
                        case "TELESCOP":
                              console.writeln("telescop=" + value);
                              if (groupname != "") {
                                    groupname = groupname + " ";
                              }
                              groupname = groupname + value;
                              break;
                        case "NAXIS1":
                              console.writeln("naxis1=" + value);
                              if (groupname != "") {
                                    groupname = groupname + " ";
                              }
                              groupname = groupname + value;
                              naxis1 = parseInt(value);
                              break;
                        default:
                              break;
                  }
            }
            for (var j = 0; j < groups.length; j++) {
                  if (groups[j].groupname == groupname) {
                        // found, add to existing group
                        groups[j].groupfiles[groups[j].groupfiles.length] = fileNames[i];
                        break;
                  }
            }
            if (j == groups.length) {
                  // not found, add a new group
                  console.writeln("getLDDgroups, add a new group " + groupname);
                  groups[groups.length] = { groupname: groupname, groupfiles: [ fileNames[i] ]};
            }
      }
      console.writeln("getLDDgroups found " + groups.length + " groups");
      return groups;
}

// Get row or col defect information
getDefects(LDD_win, detectColumns)
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
      var detectedLines = new this.autointegrateLDD.LDDEngine( LDD_win, detectColumns, detectPartialLines,
                                                          layersToRemove, rejectionLimit, imageShift,
                                                          detectionThreshold, partialLineDetectionThreshold );
      // Generate output for cosmetic correction
      console.writeln("getDefects, LDDOutput");
      var defects = this.autointegrateLDD.LDDOutput( detectColumns, detectedLines, detectionThreshold );

      return defects;
}

// Run ImageIntegration and then get row/col defects
getDefectInfo(fileNames, groupname)
{
      console.writeln("getDefectInfo, fileNames[0]=" + fileNames[0] + ", groupname=" + groupname);
      var LDD_images = this.init_images();
      for (var i = 0; i < fileNames.length; i++) {
            this.append_image_for_integrate(LDD_images.images, fileNames[i]);
      }
      // Run image integration as-is to make line defects more visible
      console.writeln("getDefectInfo, runImageIntegration");

      this.flowchart.flowchartParentBegin("Fix linear defects " + groupname);
      var LDD_id = this.runImageIntegration(LDD_images, "LDD", false, groupname ? "Group " + groupname : null);
      this.flowchart.flowchartParentEnd("Fix linear defects " + groupname);

      var LDD_win = this.util.findWindow(LDD_id);
      var defects = [];

      if (this.par.fix_column_defects.val) {
            console.writeln("getDefectInfo, fix_column_defects");
            var colDefects = this.getDefects(LDD_win, true);
            defects = defects.concat(colDefects);
      }
      if (this.par.fix_row_defects.val) {
            console.writeln("getDefectInfo, fix_row_defects");
            var rowDefects = this.getDefects(LDD_win, false);
            defects = defects.concat(rowDefects);
      }

      this.util.closeOneWindowById(LDD_id);

      return { ccFileNames: fileNames, ccDefects: defects };
}

runLinearDefectDetection(fileNames)
{
      this.util.addProcessingStepAndStatusInfo("Run Linear Defect Detection");
      var node = this.flowchart.flowchartOperation("LinearDefectDetection");
      console.writeln("runLinearDefectDetection, fileNames[0]=" + fileNames[0]);

      if (this.global.get_flowchart_data) {
            return [ { ccFileNames: fileNames, ccDefects: null } ];
      }
      var ccInfo = [];

      // Group images by telescope and resolution
      var LDD_groups = this.getLDDgroups(fileNames);

      if (LDD_groups.length > 4) {
            this.util.throwFatalError("too many LDD groups: " + LDD_groups.length);
      }

      // For each group, generate own defect information
      for (var i = 0; i < LDD_groups.length; i++) {
            console.writeln("runLinearDefectDetection, group " + i + ", " + LDD_groups[i].groupname);
            if (this.par.use_processed_files.val) {
                  for (var j = 0; j < this.global.LDDDefectInfo.length; j++) {
                        if (this.global.LDDDefectInfo[j].groupname == LDD_groups[i].groupname) {
                              // found existing defect info
                              console.writeln("Use existing defect info " + this.global.LDDDefectInfo[j].groupname);
                              break;
                        }
                  }
            }
            if (!this.par.use_processed_files.val || j == this.global.LDDDefectInfo.length) {
                  // generate new defect info
                  var ccGroupInfo = this.getDefectInfo(LDD_groups[i].groupfiles, LDD_groups.length > 1 ? LDD_groups[i].groupname : null);
                  this.global.LDDDefectInfo[this.global.LDDDefectInfo.length] = { groupname: LDD_groups[i].groupname, defects: ccGroupInfo.ccDefects }
            } else {
                  // use existing defect info
                  var ccGroupInfo = { ccFileNames: LDD_groups[i].groupfiles, ccDefects: this.global.LDDDefectInfo[j].defects };
            }
            ccInfo[ccInfo.length] = ccGroupInfo;
      }
      this.engine_end_process(node);

      return ccInfo;
}

addNewPostfixToFileName(fileName, postfix)
{
      return File.extractDrive(fileName) + File.extractDirectory(fileName) + File.extractName(fileName) + postfix + File.extractExtension(fileName);
}

generateNewFileName(fileName, outputdir, postfix, extension)
{
      return this.util.ensurePathEndSlash(outputdir) + File.extractName(fileName) + postfix + extension;
}

generateNewFileNames(oldFileNames, outputdir, postfix, extension)
{
      var newFileNames = [];

      console.writeln("generateNewFileNames, old " + oldFileNames[0]);

      for (var i = 0; i < oldFileNames.length; i++) {
            newFileNames[i] = this.generateNewFileName(oldFileNames[i], outputdir, postfix, extension);
      }

      console.writeln("generateNewFileNames, new " + newFileNames[0]);
      return newFileNames;
}

isLuminanceFile(filtered_files, filePath)
{
      var Lfiles = filtered_files.allfilesarr[this.channels.L].files;
      for (var i = 0; i < Lfiles.length; i++) {
            if (Lfiles[i].name == filePath) {
                  return true;
            }
      }
      return false;
}

getBinningPostfix()
{
      return '_b' + this.par.binning_resample.val;
}

// resample_val is scale factor to get the desired dimension
runResample(imageWindow, resample_val)
{
      console.writeln("runResample, imageWindow " + imageWindow.mainView.id + ", resample_val " + resample_val + "using Lanczos3");
      var P = new Resample;
      P.xSize = resample_val;
      P.ySize = resample_val;
      P.mode = Resample.RelativeDimensions;
      P.absoluteMode = Resample.ForceWidthAndHeight;
      P.xResolution = 72.000;
      P.yResolution = 72.000;
      P.metric = false;
      P.forceResolution = false;
      P.interpolation = Resample.Lanczos3;
      P.clampingThreshold = 0.30;
      P.smoothness = 1.50;
      P.gammaCorrection = false;
      P.noGUIMessages = true;

      imageWindow.mainView.beginProcess(UndoFlag.NoSwapFile);

      P.executeOn(imageWindow.mainView, false);
      
      imageWindow.mainView.endProcess();
}

runBinning(imageWindow, resample_val)
{
      var P = new IntegerResample;
      P.zoomFactor = -resample_val;
      P.noGUIMessages = true;

      imageWindow.mainView.beginProcess(UndoFlag.NoSwapFile);

      P.executeOn(imageWindow.mainView, false);
      
      imageWindow.mainView.endProcess();
}

// binning_values_index: 1 color, 2 = L + color (0 = None but not checked here)
runBinningOnFiles(fileNames, binning_values_index, resample_val, filtered_files, renamedFileNames, postfix)
{
      if (this.global.outputRootDir == "" || this.util.pathIsRelative(this.global.outputRootDir)) {
            /* Get path to current directory. */
            var outputRootDir = this.util.parseNewOutputDir(fileNames[0], this.global.outputRootDir);
            console.writeln("runBinningOnFiles, outputRootDir ", outputRootDir);
      } else {
            var outputRootDir = this.global.outputRootDir;
      }
      var newFileNames = [];
      var outputDir = outputRootDir + this.global.AutoOutputDir;
      var outputExtension = ".xisf";

      if (postfix == null) {
            postfix = this.getBinningPostfix();
      }
      
      console.writeln("runBinningOnFiles input[0] " + fileNames[0]);

      for (var i = 0; i < fileNames.length; i++) {
            var do_binning = true;
            if (binning_values_index == 1) {
                  // Binning is done only for color this.channels, check if this is luminance file
                  if (this.isLuminanceFile(filtered_files, fileNames[i])) {
                        do_binning = false;
                  }
            }
            if (do_binning) {
                  // Open source image window from a file
                  var imageWindows = ImageWindow.open(fileNames[i]);
                  if (!imageWindows || imageWindows.length == 0) {
                        this.util.throwFatalError("***runBinningOnFiles Error: imageWindows.length: " + imageWindows.length);
                  }
                  var imageWindow = imageWindows[0];
                  if (imageWindow == null) {
                        this.util.throwFatalError("***runBinningOnFiles Error: Can't read file: " + fileNames[i]);
                  }

                  this.runBinning(imageWindow, resample_val);

                  this.engine_end_process(null, imageWindow, "Binning", false);

                  this.updateBinningKeywords(imageWindow, resample_val);
            
                  if (renamedFileNames == null) {
                        var filePath = this.generateNewFileName(fileNames[i], outputDir, postfix, outputExtension);
                  } else {
                        var filePath = renamedFileNames[i];
                  }

                  // Save window
                  if (!this.writeImage(filePath, imageWindow)) {
                        this.util.throwFatalError("***runBinningOnFiles Error: Can't write output image: " + imageWindow.mainView.id + ", file: " + filePath);
                  }
                  // Close window
                  this.util.closeOneWindow(imageWindow);   
            } else {
                  // keep the old file name
                  var filePath = fileNames[i];
            }

            newFileNames[newFileNames.length] = filePath;
      }

      console.writeln("runBinningOnFiles output[0] " + newFileNames[0]);

      return newFileNames;
}

runBinningOnLights(fileNames, filtered_files)
{
      this.util.addStatusInfo("Do " + this.par.binning_resample.val + "x" + this.par.binning_resample.val + " binning using IntegerResample on light files");
      this.util.addProcessingStep("Do " + this.par.binning_resample.val + "x" + this.par.binning_resample.val + " binning using IntegerResample on light files, output *" + this.getBinningPostfix() + ".xisf");
      var node = this.flowchart.flowchartOperation("Binning");

      var newFileNames = this.runBinningOnFiles(fileNames, this.par.binning.val, this.par.binning_resample.val, filtered_files);

      this.engine_end_process(node);

      return newFileNames;
}

runGradientCorrectionOnLights(fileNames)
{
      var newFileNames = [];
      var outputDir = this.global.outputRootDir + this.global.AutoOutputDir;
      var postfix = "_GC";
      var outputExtension = ".xisf";

      this.util.addProcessingStepAndStatusInfo("Run gradient correction on light files using " + this.getGradientCorrectionName());
      var node = this.flowchart.flowchartOperation(this.getGradientCorrectionName());

      if (this.global.get_flowchart_data) {
            return fileNames;
      }

      console.writeln("runGradientCorrectionOnLights output *" + postfix + ".xisf");
      console.writeln("runGradientCorrectionOnLights input[0] " + fileNames[0]);

      for (var i = 0; i < fileNames.length; i++) {
            // Open source image window from a file
            var imageWindows = ImageWindow.open(fileNames[i]);
            if (!imageWindows || imageWindows.length == 0) {
                  this.util.throwFatalError("*** runGradientCorrectionOnLights Error: imageWindows.length: " + imageWindows.length);
            }
            var imageWindow = imageWindows[0];
            if (imageWindow == null) {
                  this.util.throwFatalError("*** runGradientCorrectionOnLights Error: Can't read file: " + fileNames[i]);
            }
            
            // Run gradient correction which creates a new window with postfix extension

            var new_id = this.runGradientCorrectionEx(imageWindow, false, postfix, true);
            var new_win = this.util.findWindow(new_id);
            if (new_win == null) {
                  this.util.throwFatalError("*** runGradientCorrectionOnLights Error: could not find window: " + new_id);
            }
            
            // Source image window is not needed any more
            this.util.closeOneWindow(imageWindow);

            var filePath = this.generateNewFileName(fileNames[i], outputDir, postfix, outputExtension);

            // Save GC window
            if (!this.writeImage(filePath, new_win)) {
                  this.util.throwFatalError("*** runGradientCorrectionOnLights Error: Can't write output image: " + new_id);
            }
            // Close GC window
            this.util.closeOneWindow(new_win);

            newFileNames[newFileNames.length] = filePath;
      }

      console.writeln("runGradientCorrectionOnLights output[0] " + newFileNames[0]);

      this.engine_end_process(node);

      return newFileNames;
}

runCosmeticCorrection(fileNames, defects, color_images)
{
      if (defects && defects.length > 0) {
            this.util.addStatusInfo("Run CosmeticCorrection, number of line defects to fix is " + defects.length);
            this.util.addProcessingStep("Run CosmeticCorrection, output *_cc.xisf, number of line defects to fix is " + defects.length);
      } else {
            this.util.addStatusInfo("Run CosmeticCorrection");
            this.util.addProcessingStep("Run CosmeticCorrection, output *_cc.xisf, no line defects to fix");
      }
      console.writeln("fileNames[0] " + fileNames[0]);
      var node = this.flowchart.flowchartOperation("CosmeticCorrection");

      if (this.global.get_flowchart_data) {
            return fileNames;
      }

      var P = new CosmeticCorrection;
      P.targetFrames = this.fileNamesToEnabledPath(fileNames);
      P.overwrite = true;
      if (color_images && this.local_debayer_pattern != 'None') {
            P.cfa = true;
      } else {
            P.cfa = false;
      }
      P.outputDir = this.global.outputRootDir + this.global.AutoOutputDir;
      P.useAutoDetect = true;
      P.hotAutoCheck = true;
      P.hotAutoValue = this.par.cosmetic_correction_hot_sigma.val;
      P.coldAutoCheck = true;
      P.coldAutoValue = this.par.cosmetic_correction_cold_sigma.val;
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
            console.criticalln(err.toString());
            this.util.throwFatalError("CosmeticCorrection failed, maybe a problem in some of the files or in output directory´" + P.outputDir);
      }
      
      this.printAndSaveProcessValues(P);
      this.engine_end_process(node);

      fileNames = this.generateNewFileNames(fileNames, P.outputDir, P.postfix, P.outputExtension);
      console.writeln("runCosmeticCorrection output[0] " + fileNames[0]);

      return fileNames;
}

// Calculate mean and standard deviation of an array
getStandardDeviationAndMean(data)
{
      if (!Array.isArray(data) || data.length === 0) {
            console.criticalln("getStandardDeviationAndMean: Invalid input data");
            return { mean: 0, std: 0 };
      }
      const array = data.filter(x => !isNaN(x)); // Filter out NaN values
      if (array.length === 0) {
            console.criticalln("getStandardDeviationAndMean: No valid numbers in input data");
            return { mean: 0, std: 0 };
      }
      if (array.length === 1) {
            console.writeln("getStandardDeviationAndMean: Only one valid number in input data, returning mean and std as that number");
            return { mean: array[0], std: 0 };
      }
      // Calculate mean and standard deviation
      // Using the formula: mean = sum(x) / n, std = sqrt(sum((x - mean)^2) / n)
      // where n is the number of elements in the array
      array.sort((a, b) => a - b); // Sort the array to ensure correct calculations
      if (array[0] == array[array.length - 1]) {
            console.writeln("getStandardDeviationAndMean: All values are equal, returning mean and std as that value");
            return { mean: array[0], std: 0 };
      }
      // Calculate mean
      const arraySum = array.reduce((a, b) => a + b, 0);
      const mean = arraySum / array.length;
      // Calculate standard deviation
      const squaredDifferences = array.map(x => Math.pow(x - mean, 2));
      const variance = squaredDifferences.reduce((a, b) => a + b, 0) / array.length;
      const std = Math.sqrt(variance);
      // Return mean and standard deviation
      return { mean: mean, std: std };
}

findOutlierMinMax(measurements, indexvalue)
{
      if (this.par.outliers_method.val == 'IQR') {
            // Use IQR for filtering
            var values = measurements.concat();
      
            values.sort( function(a, b) {
                  let a0 = a[indexvalue];
                  let b0 = b[indexvalue];
                  if (isNaN(a0)) {
                        a0 = 0;
                  }
                  if (isNaN(b0)) {
                        b0 = 0;
                  }
                  return a0 - b0;
            });
      
            var q1 = values[Math.floor((values.length / 4))][indexvalue];
            var q3 = values[Math.ceil((values.length * (3 / 4)))][indexvalue];
            var iqr = q3 - q1;
      
            console.writeln("findOutlierMinMax q1 " + q1 + ", q3 " + q3 + ", iqr " + iqr);

            return { maxValue: q3 + iqr * 1.5, 
                     minValue: q1 - iqr * 1.5 };

      } else {
            // Use one or two sigma for filtering
            if (this.par.outliers_method.val == 'Two sigma') {
                  var sigma_count = 2;
            } else {
                  var sigma_count = 1;
            }
            var number_array = []
            for (var i = 0; i < measurements.length; i++) {
                  if (isNaN(measurements[i][indexvalue])) {
                        measurements[i][indexvalue] = 0;
                  }
                  number_array[number_array.length] = measurements[i][indexvalue];
            }
            var mean_std = this.getStandardDeviationAndMean(number_array);

            console.writeln("findOutlierMinMax mean " + mean_std.mean + ", std " + mean_std.std);

            return { maxValue: mean_std.mean + sigma_count * mean_std.std, 
                     minValue: mean_std.mean - sigma_count * mean_std.std };
      }
}

filterOutliers(measurements, name, index, do_filtering, fileindex, filtered_files)
{
      if (!do_filtering) {
            // console.writeln("Outliers are not filtered");
            return measurements;
      }

      if (measurements.length < 8) {
            console.criticalln("filterOutliers requires at last eight images, number of images is " + measurements.length);
            return measurements;
      }

      var type = this.getFilterLimitType(name);

      var minmax = this.findOutlierMinMax(measurements, index);

      console.writeln(name + " outliers min " + minmax.minValue + ", max " + minmax.maxValue);

      console.writeln("filterOutliers");

      var newMeasurements = [];
      for (var i = 0; i < measurements.length; i++) {
            if (isNaN(measurements[i][index])) {
                  console.writeln(name + " NaN value, setting zero value in file " + measurements[i][fileindex]);
                  measurements[i][index] = 0;
            }
            if ((type == 'min' || this.par.outliers_minmax.val) && measurements[i][index] < minmax.minValue) {
                  console.writeln(name + " below limit " + minmax.maxValue + ", ignoring file " + measurements[i][fileindex]);
                  filtered_files[filtered_files.length] = measurements[i];
                  measurements[i][1] = false; // measurementEnabled
                  measurements[i][2] = 2;  // measurementLocked for metrics visualizer
            } else if ((type == 'max' || this.par.outliers_minmax.val) && measurements[i][index] > minmax.maxValue) {
                  console.writeln(name + " above limit " + minmax.maxValue + ", ignoring file " + measurements[i][fileindex]);
                  filtered_files[filtered_files.length] = measurements[i];
                  measurements[i][1] = false; // measurementEnabled
                  measurements[i][2] = 2;  // measurementLocked for metrics visualizer
            } else {
                  newMeasurements[newMeasurements.length] = measurements[i];
                  measurements[i][1] = true; // measurementEnabled
            }
      }
      this.util.addProcessingStep(name + " outliers filtered " + (measurements.length - newMeasurements.length) + " files");
      return newMeasurements;
}

filterLimit(measurements, name, index_info, limit_val, fileindex, filtered_files, ssweight_limit = false)
{
      var index = index_info[0];
      var filter_high = index_info[1];

      if (limit_val == 0) {
            return measurements;
      }

      console.writeln("filterLimit " + limit_val);

      var newMeasurements = [];
      for (var i = 0; i < measurements.length; i++) {
            if (isNaN(measurements[i][index])) {
                  measurements[i][index] = 0;
            }
            if (filter_high) {
                  var filter_out = measurements[i][index] > limit_val;
            } else {
                  var filter_out = measurements[i][index] < limit_val;
            }
            if (filter_out) {
                  console.writeln(name + " outside limit " + limit_val + ", ignoring file " + measurements[i][fileindex]);
                  filtered_files[filtered_files.length] = measurements[i];
                  measurements[i][1] = false; // measurementEnabled
                  if (ssweight_limit) {
                        // If this is a SubframeSelector weight limit, then measurementLocked is 1
                        measurements[i][2] = 1;  // measurementLocked for metrics visualizer
                  }
            } else {
                  newMeasurements[newMeasurements.length] = measurements[i];
                  measurements[i][1] = true; // measurementEnabled
            }
      }
      this.util.addProcessingStep(name + " limit filtered " + (measurements.length - newMeasurements.length) + " files");
      return newMeasurements;
}

getFilterValues(measurements, name)
{
      console.writeln("getFilterValues " + name);

      if (name == 'None') {
            return [];
      }
      var index_info = this.findFilterIndex(name);
      var index = index_info[0];
      var values = [];

      for (var i = 0; i < measurements.length; i++) {
            if (isNaN(measurements[i][index])) {
                  measurements[i][index] = 0;
            }
            values[values.length] = measurements[i][index];
      }
      return values;
}

// Get a boolean array of measurements that are filtered out
getMetricsFilteredOut(measurements, ssweight_limit = false)
{
      console.writeln("getMetricsFilteredOut");
      var filteredOut = [];
      var count = 0;
      for (var i = 0; i < measurements.length; i++) {
            if (ssweight_limit) {
                  if (measurements[i][1] == false && measurements[i][2] == 2) {
                        // measurementEnabled is false and measurementLocked is 2, 
                        // so this measurement is filtered out by outliers.
                        // Limits are checked by the metrics visualizer.
                        filteredOut[filteredOut.length] = true;
                        count++;
                  } else {
                        // measurementEnabled is true, so this measurement is not filtered out
                        filteredOut[filteredOut.length] = false;
                  }
            } else {
                  if (measurements[i][1] == false && measurements[i][2] != 0) {
                        // measurementEnabled is false and measurementLocked is non-zero, 
                        // so this measurement is filtered out by outliers or ssweight.
                        // Limits are checked by the metrics visualizer.
                        filteredOut[filteredOut.length] = true;
                        count++;
                  } else {
                        // measurementEnabled is true, so this measurement is not filtered out
                        filteredOut[filteredOut.length] = false;
                  }
            }
      }
      console.writeln("getMetricsFilteredOut, filtered out " + count + " measurements");
      return filteredOut;
}

// Returns true if the filter is high limit, false if low limit
// name is the filter name, e.g. 'FWHM', 'Eccentricity', 'PSFSignal', 'PSFPower', 'SNR', 'Stars'
getFilterHigh(name)
{
      console.writeln("getFilterHigh " + name);
      if (name == 'None') {
            return false;
      }
      var index_info = this.findFilterIndex(name);
      var filter_high = index_info[1];

      return filter_high;
}

getScaledValNeg(val, min, max)
{
      if (min == max) {
            return 0.5;
      } else {
            return 1-(val-min)/(max-min);
      }
}

getScaledValPos(val, min, max)
{
      if (min == max) {
            return 0.5;
      } else {
            return (val-min)/(max-min);
      }
}

getSubframeSelectorMeasurements(fileNames, flowchart_name)
{
      console.writeln("run SubframeSelector on " + fileNames.length + " files");
      if (flowchart_name) {
            var node = this.flowchart.flowchartOperation(flowchart_name);
      }

      var P = new SubframeSelector;
      P.nonInteractive = true;
      P.subframes = this.fileNamesToEnabledPathSubframes(fileNames);     // [ subframeEnabled, subframePath, localNormalizationDataPath, drizzlePath ]
      P.noiseLayers = 2;
      P.outputDirectory = this.global.outputRootDir + this.global.AutoOutputDir;
      P.overwriteExistingFiles = true;
      P.maxPSFFits = 8000;
      /*
      ** PI 1.8.8-10
      P.measurements = [ 
            measurementIndex, measurementEnabled, measurementLocked, measurementPath, measurementWeight,                             0-4
            measurementFWHM, measurementEccentricity, measurementPSFSignalWeight, measurementPSFPowerWeight, measurementSNRWeight,   5-9
            measurementMedian, measurementMedianMeanDev, measurementNoise, measurementNoiseRatio, measurementStars,                  10-14
            measurementStarResidual, measurementFWHMMeanDev, measurementEccentricityMeanDev, measurementStarResidualMeanDev,         15-18
            measurementAzimuth, measurementAltitude                                                                                  19-20
            *** New in PI 1.8.9-1
            measurementPSFFlux, measurementPSFFluxPower, measurementPSFTotalMeanFlux, measurementPSFTotalMeanPowerFlux,              21-24
            measurementPSFCount, measurementMStar, measurementNStar, measurementPSFSNR, measurementPSFScale,                         25-29
            measurementPSFScaleSNR                                                                                                   30
      ];
     */
      
      P.executeGlobal();

      console.writeln("SubframeSelector completed");

      this.printAndSaveProcessValues(P);
      if (flowchart_name) {
            this.engine_end_process(node);
      }
      this.global.subframeselector_call_count++;

      // Set measurementEnabled to true for all measurements
      for (var i = 0; i < P.measurements.length; i++) {
            P.measurements[i][1] = true; // measurementEnabled
            P.measurements[i][2] = false; // measurementLocked
      }

      return P.measurements;
}

filterBadPSFImages(fileNames)
{
      var newFileNames = [];
      var indexPSFSignal = 7;

      this.util.addProcessingStep("Filter bad PSF images");
      console.writeln("fileNames[0]=" + fileNames[0]);

      var measurements = this.getSubframeSelectorMeasurements(fileNames, "Filter bad PSF");

      for (var i = 0; i < measurements.length; i++) {
            if (measurements[i][indexPSFSignal] >= this.par.ssweight_limit.val && !isNaN(measurements[i][indexPSFSignal])) {
                  newFileNames[newFileNames.length] = fileNames[i];
            } else {
                  console.noteln("Skipped bad PSF " + measurements[i][indexPSFSignal] +  " in image " + fileNames[i]);
            }
      }

      console.noteln("Accepted " + newFileNames.length + "/" + fileNames.length + " images");

      return newFileNames;
}

getImagePSF(imgWin)
{
      var indexFWHM = 5;

      console.writeln("Calculate PSF from image " + imgWin.mainView.id);

      var copy_win = this.util.copyWindowEx(imgWin, "AutoIntegrateTemp", true);

      var fname = File.systemTempDirectory + "/AutoIntegrateTemp.xisf";
      console.writeln("getImagePSF input file " + fname);
      if (!copy_win.saveAs(fname, false, false, false, false)) {
            this.util.closeOneWindowById(copy_win.mainView.id);
            this.save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
            this.util.throwFatalError("Failed to save image to get image PSF: " + fname);
      }
      this.util.closeOneWindowById(copy_win.mainView.id);

      console.writeln("Using saved image " + fname);

      var measurements = this.getSubframeSelectorMeasurements([ fname ], "Get PSF");

      return measurements[0][indexFWHM];
}

// returns [ index, filter_high ]
// index is the index in the measurements array
// filter_high is true if the filter is high limit, false if low limit
findFilterIndex(name)
{
      switch (name) {
            case 'SSWEIGHT':
                  return [ 4, false ];
            case 'FWHM':
                  return [ 5, true ];
            case 'Eccentricity':
                  return [ 6, true ];
            case 'PSFSignal':
                  return [ 7, false ];
            case 'PSFPower':
                  return [ 8, false ];
            case 'SNR':
                  return [ 9, false ];
            case 'Stars':
                  return [ 14, false ];
            default:
                  this.util.throwFatalError("Unknown measure filtering name " + name);
                  return [ 0, false ];
      }
}

getFilterLimitType(name)
{
      var index_info = this.findFilterIndex(name);
      var filter_high = index_info[1];
      if (filter_high) {
            return 'max';
      } else {
            return 'min';
      }
}

// Check that measurement value is a bad value and return it as a text string
getBadMeasurementValueTxt(value)
{
      if (isNaN(value)) {
            return "NaN";
      } else if (value == null) {
            return "null";
      } else if (value == undefined) {
            return "undefined";
      } else {
            return "bad";
      }
}

// Check that measurement value is a valid number and return it as a text string
getMeasurementValueTxt(value)
{
      if (isNaN(value) || value == null || value == undefined) {
            return null;
      } else {
            return value.toFixed(10);
      }
}

measurementToTextWithLimit(measurement_name, val)
{
      var formatting1 = "";
      var formatting2 = "";
      var valtxt = this.getMeasurementValueTxt(val);
      if (valtxt == null) {
            valtxt = this.getBadMeasurementValueTxt(val);
      } else {
            // Check if we have a limit for the value
            if (this.par.filter_limit1_type.val == measurement_name) {
                  var limit = this.par.filter_limit1_val.val;
            } else if (this.par.filter_limit2_type.val == measurement_name) {
                  var limit = this.par.filter_limit2_val.val;
            } else if (this.par.filter_limit3_type.val == measurement_name) {
                  var limit = this.par.filter_limit3_val.val;
            } else if (this.par.filter_limit4_type.val == measurement_name) {
                  var limit = this.par.filter_limit4_val.val;
            } else {
                  var limit = null;
            }
            if (limit != null && limit != 0) {
                  // We have a limit for this measurement
                  valtxt += " (limit " + limit + ")";
                  var filter_type = this.getFilterLimitType(measurement_name);
                  if (filter_type == 'max' && val > limit) {
                        // Above max limit
                        formatting1 = "<b>";
                        formatting2 = "</b>";
                  } else if (filter_type == 'min' && val < limit) {
                        // Below min limit
                        formatting1 = "<b>";
                        formatting2 = "</b>";
                  }
            }
      }
      return formatting1 + measurement_name + ": " + valtxt + formatting2 + "<br>";
}

measurementToText(measurement)
{
      var indexWeight = 4;
      var indexFWHM = 5;
      var indexEccentricity = 6;
      var indexPSFSignal = 7;
      var indexPSFPower = 8;
      var indexStars = 14;
      var text = "";
      text += this.measurementToTextWithLimit("SSWEIGHT", measurement[indexWeight]);
      text += this.measurementToTextWithLimit("FWHM", measurement[indexFWHM]);
      text += this.measurementToTextWithLimit("Eccentricity", measurement[indexEccentricity]);
      text += this.measurementToTextWithLimit("PSF Signal", measurement[indexPSFSignal]);
      text += this.measurementToTextWithLimit("PSF Power", measurement[indexPSFPower]);
      text += this.measurementToTextWithLimit("Stars", measurement[indexStars]);
      return text;
}

// Binary search for measurement text in this.global.saved_measurements
// Returns measurement text for filename or empty string if not found
measurementTextForFilename(filename)
{
      // console.writeln("measurementTextForFilenameBinary, filename " + filename);
      if (this.global.saved_measurements == null) {
            return "";
      }
      if (this.global.saved_measurements_sorted == null) {
            // Make a sorted copy of this.global.saved_measurements
            // console.writeln("measurementTextForFilenameBinary, sorting this.global.saved_measurements");
            this.global.saved_measurements_sorted = this.global.saved_measurements.concat();
            this.global.saved_measurements_sorted.sort( function(a, b) {
                  let a0 = File.extractName(a[3]);
                  let b0 = File.extractName(b[3]);
                  if (a0 < b0) {
                        return -1;
                  } else if (a0 > b0) {
                        return 1;
                  } else {
                        return 0;
                  }
            });
      }
      var indexPath = 3;
      var low = 0;
      var high = this.global.saved_measurements.length - 1;
      var new_name = File.extractName(filename);
      // We do binary search for file name prefix
      // console.writeln("measurementTextForFilenameBinary, new_name " + new_name + ", low " + low + ", high " + high);
      while (low <= high) {
            var mid = Math.floor((low + high) / 2);
            var mid_name = File.extractName(this.global.saved_measurements_sorted[mid][indexPath]);
            if (mid_name.startsWith(new_name)) {
                  // Found a match, return the measurement text
                  // console.writeln("measurementTextForFilenameBinary, found match for " + new_name + " in " + mid_name);
                  return this.measurementToText(this.global.saved_measurements_sorted[mid]);
            } else if (mid_name < new_name) {
                  // Search in the right half
                  low = mid + 1;
            } else {
                  // Search in the left half
                  high = mid - 1;
            }
      }
      // If we reach here, no match was found
      // console.writeln("measurementTextForFilenameBinary, no measurement found for " + filename);
      // No measurement found for this filename
      return "";
}

sortMeasurements(measurements, filtered_files, sort_order)
{
      var indexWeight = 4;
      var indexFWHM = 5;
      var indexPSFSignal = 7;
      var ascending_order = false;

      if (sort_order == 'File name') {
            // Sort by File name
            var sortIndex = 3; // File name is the fourth column
            measurements.sort( function(a, b) {
                  let a0 = a[sortIndex];
                  let b0 = b[sortIndex];
                  if (a0 < b0) {
                        return -1;
                  } else if (a0 > b0) {
                        return 1;
                  } else {
                        return 0;
                  }
            });
            console.writeln("sortMeasurements, sort by File name");
            // Sort filtered files by File name
            filtered_files.sort( function(a, b) {
                  let a0 = a[sortIndex];
                  let b0 = b[sortIndex];
                  if (a0 < b0) {
                        return -1;
                  } else if (a0 > b0) {
                        return 1;
                  } else {
                        return 0;
                  }
            });
      } else {
            if (sort_order == 'SSWEIGHT' || sort_order == null) {
                  // Sort by SSWEIGHT
                  // It is the default order
                  console.writeln("sortMeasurements, sort by SSWEIGHT");
                  var sortIndex = indexWeight;
            } else {
                  console.writeln("sortMeasurements, sort by " + sort_order);
                  let filterIndex = this.findFilterIndex(sort_order);
                  var sortIndex = filterIndex[0];
                  var ascending_order = filterIndex[1];
            }

            // Sorting for files that are filtered out
            if (sortIndex == indexWeight) {
                  // We have not calculated SSWEIGHT for filtered files so 
                  // we use FWHM or PSFSignal
                  if (this.global.pixinsight_version_num < 1080810) {
                        // Use FWHM for old versions
                        console.writeln("sortMeasurements, sort filtered files by FWHM");
                        var filteredSortIndex = indexFWHM;
                  } else {
                        // Use PSFSignal for new versions
                        console.writeln("sortMeasurements, sort filtered files by PSFSignal");
                        var filteredSortIndex = indexPSFSignal;
                  }
            } else {
                  // Use filterIndex for sorting
                  var filteredSortIndex = sortIndex;
            }
            if (ascending_order) {
                  // Sort by filteredSortIndex in ascending order
                  filtered_files.sort( function(a, b) {
                        return a[filteredSortIndex] - b[filteredSortIndex];
                  });
            } else {
                  filtered_files.sort( function(a, b) {
                        return b[filteredSortIndex] - a[filteredSortIndex];
                  });
            }

            // Sorting for included measurements files
            if (ascending_order) {
                  measurements.sort( function(a, b) {
                        return a[sortIndex] - b[sortIndex];
                  });
            } else {
                  // Sort by sortIndex in descending order
                  measurements.sort( function(a, b) {
                        return b[sortIndex] - a[sortIndex];
                  });
            }
      }
}

// If weight_filtering == true and treebox_filtering == true
//    returns array of [ filename, checked, weight ]
// else
//    returns array of [ filename, weight ]
subframeSelectorMeasure(fileNames, weight_filtering, treebox_filtering, measurementFileNames, sort_order = null)
{
      console.writeln("subframeSelectorMeasure, input[0] " + fileNames[0]);

      var indexPath = 3;
      var indexWeight = 4;
      var indexFWHM = 5;
      var indexEccentricity = 6;
      var indexPSFSignal = 7;
      var indexPSFPower = 8;
      var indexStars = 14;
      var fast_mode = false;

      if (this.global.get_flowchart_data) {
            if (this.par.use_fastintegration.val && this.par.fastintegration_fast_subframeselector.val) {
                  var node = this.flowchart.flowchartOperation("Fast SubframeSelector");
            } else {
                  var node =  this.flowchart.flowchartOperation("SubframeSelector");
            }
            var ssFiles = [];
            for (var i = 0; i < fileNames.length; i++) {
                  ssFiles[ssFiles.length] = [ fileNames[i], 1 ];
            }
            return ssFiles;
      }

      /* Index for indexSNRWeight has changed at some point.
       * I assume it is in old position before version 1.8.8.10.
       */
      if (this.global.pixinsight_version_num < 1080810) {
            var indexSNRWeight = 7;
      } else {
            var indexSNRWeight = 9;
      }

      if (this.par.use_fastintegration.val && this.par.fastintegration_fast_subframeselector.val) {
            var node = this.flowchart.flowchartOperation("Fast SubframeSelector");
            fast_mode = true;
      } else {
            var node = this.flowchart.flowchartOperation("SubframeSelector");
      }

      if (this.global.saved_measurements == null) {
            // collect new measurements
            console.writeln("subframeSelectorMeasure, collect measurements");
            this.global.saved_measurements = this.getSubframeSelectorMeasurements(measurementFileNames, null);
            this.global.saved_measurements_sorted = null;
      }

      // Find measurements from this.global.saved_measurements
      // We may have collected more measurements using measurementFileNames than we
      // have in files in fileNames so we create a new array
      console.writeln("subframeSelectorMeasure, use saved measurements");
      var measurements = null;
      for (var retrycount = 0; retrycount < 2; retrycount++) {
            measurements = [];
            // Loop through all fileNames and find matching measurements
            for (var i = 0; i < fileNames.length; i++) {
                  for (var j = 0; j < this.global.saved_measurements.length; j++) {
                        var saved_name = File.extractName(this.global.saved_measurements[j][indexPath]);
                        var new_name = File.extractName(fileNames[i]);
                        if (saved_name.startsWith(new_name)) {
                              measurements[measurements.length] = this.global.saved_measurements[j];
                              measurements[measurements.length-1][indexPath] = fileNames[i];
                              break;
                        }
                  }
            }
            if (fast_mode && measurements.length == this.global.saved_measurements.length) {
                  // Fast mode, we have less measurements than files, found all measurements
                  console.writeln("subframeSelectorMeasure, fast mode, found all " + measurements.length + " measurements");
                  break;
            } else if (measurements.length == fileNames.length) {
                  // We have found all measurements for the files
                  console.writeln("subframeSelectorMeasure, found all measurements for " + fileNames.length + " files");
                  break;
            } else {
                  // We have found some measurements, but not all
                  // something went wrong, list are not compatible, generate new ones
                  console.writeln("subframeSelectorMeasure, found " + measurements.length + " measurements for " + fileNames.length + " files");
                  console.writeln("subframeSelectorMeasure, saved_measurements[0][indexPath] " + this.global.saved_measurements[0][indexPath]);
                  console.writeln("subframeSelectorMeasure, saved measurements not found for " + fileNames[i]);
                  console.writeln("subframeSelectorMeasure, retry measurements");
                  measurements = null;
                  console.writeln("subframeSelectorMeasure, collect new measurements");
                  this.global.saved_measurements = this.getSubframeSelectorMeasurements(measurementFileNames, null);
                  this.global.saved_measurements_sorted = null;
                  continue; // Retry to find measurements
            }
      }

      if (this.global.testmode) {
            if (this.global.subframeselector_call_count > 1) {
                  // We should call subframe selector only once in normal processing
                  this.util.throwFatalError("subframeSelectorMeasure, subframe selector called multiple times, this is not allowed in test mode.");
            }
      }

      if (measurements == null) {
            this.util.throwFatalError("subframeSelectorMeasure, could not find measurements for all files. Please check that all files are available and that the measurement files are not corrupted.");
      }

      this.engine_end_process(node);     // Update procesing time

      // Close measurements and expressions windows
      this.util.closeAllWindowsSubstr("SubframeSelector");

      // Reset measurementEnabled and measurementLocked
      // measurementEnabled is true for all measurements, measurementLocked is 0
      for (var i = 0; i < measurements.length; i++) {
            measurements[i][1] = true; // measurementEnabled
            measurements[i][2] = 0; // measurementLocked
            // measurementLocked is used for metrics visualizer to show measurements that are filtered out
            // measurementLocked is 0 for measurements that are not filtered out,
            // 1 for measurements that are filtered out by SSWEIGHT limit and 2 for measurements that are filtered out by outliers
      }

      // We filter outliers here so they are not included in the
      // min/max calculations below
      var filtered_files = [];
      measurements = this.filterOutliers(measurements, "FWHM", indexFWHM, this.par.outliers_fwhm.val, indexPath, filtered_files);
      measurements = this.filterOutliers(measurements, "Eccentricity", indexEccentricity, this.par.outliers_ecc.val, indexPath, filtered_files);
      measurements = this.filterOutliers(measurements, "SNR", indexSNRWeight, this.par.outliers_snr.val, indexPath, filtered_files);
      if (this.global.pixinsight_version_num >= 1080810) {
            measurements = this.filterOutliers(measurements, "PSF Signal", indexPSFSignal, this.par.outliers_psfsignal.val, indexPath, filtered_files);
            measurements = this.filterOutliers(measurements, "PSF Power", indexPSFPower, this.par.outliers_psfpower.val, indexPath, filtered_files);
      }
      measurements = this.filterOutliers(measurements, "Stars", indexStars, this.par.outliers_stars.val, indexPath, filtered_files);

      console.writeln("subframeSelectorMeasure:calculate weight");

      /* Calculate weight */
      var FWHMMin = this.findMin(measurements, indexFWHM);
      var FWHMMax = this.findMax(measurements, indexFWHM);
      var EccentricityMin = this.findMin(measurements, indexEccentricity);
      var EccentricityMax = this.findMax(measurements, indexEccentricity);
      var SNRWeightMin = this.findMin(measurements, indexSNRWeight);
      var SNRWeightMax = this.findMax(measurements, indexSNRWeight);
      if (this.global.pixinsight_version_num >= 1080810) {
            var PSFSignalMin = this.findMin(measurements, indexPSFSignal);
            var PSFSignalMax = this.findMax(measurements, indexPSFSignal);
            var PSFPowerMin = this.findMin(measurements, indexPSFPower);
            var PSFPowerMax = this.findMax(measurements, indexPSFPower);
      } else {
            var PSFSignalMin = 0;
            var PSFSignalMax = 0;
            var PSFPowerMin = 0;
            var PSFPowerMax = 0;
      }
      var StarsMin = this.findMin(measurements, indexStars);
      var StarsMax = this.findMax(measurements, indexStars);

      console.writeln("FWHMMin " + FWHMMin + ", EccMin " + EccentricityMin + ", SNRMin " + SNRWeightMin + ", PSFSignalMin " + PSFSignalMin + ", PSFPowerMin " + PSFPowerMin + ", StarsMin " + StarsMin);
      console.writeln("FWHMMax " + FWHMMax + ", EccMax " + EccentricityMax + ", SNRMax " + SNRWeightMax + ", PSFSignalMax " + PSFSignalMax + ", PSFPowerMax " + PSFPowerMax + ", StarsMax " + StarsMax);

      var filter_high = false;
      for (var i = 0; i < measurements.length; i++) {
            var FWHM = measurements[i][indexFWHM];
            if (isNaN(FWHM)) {
                  measurements[i][indexFWHM] = 0;
                  FWHM = 0;
            }
            var Eccentricity = measurements[i][indexEccentricity];
            if (isNaN(Eccentricity)) {
                  measurements[i][indexEccentricity] = 0;
                  Eccentricity = 0;
            }
            var SNRWeight = measurements[i][indexSNRWeight];
            if (isNaN(SNRWeight)) {
                  measurements[i][indexSNRWeight] = 0;
                  SNRWeight = 0;
            }
            var SSWEIGHT;
            /* Defaults below for Noise, Stars and Generic options are from script Weighted Batch Preprocessing v1.4.0
             * https://www.tommasorubechi.it/2019/11/15/the-new-weighted-batchpreprocessing/
             */
            switch (this.par.use_weight.val) {
                  case 'Generic':
                        /* Generic weight.
                         */
                        SSWEIGHT = 20*this.getScaledValNeg(FWHM, FWHMMin, FWHMMax) + 
                              15*this.getScaledValNeg(Eccentricity, EccentricityMin, EccentricityMax) + 
                              25*this.getScaledValPos(SNRWeight, SNRWeightMin, SNRWeightMax) +
                              40;
                        break;
                  case 'Noise':
                        /* More weight on noise.
                         */
                        SSWEIGHT = 5*this.getScaledValNeg(FWHM, FWHMMin, FWHMMax) + 
                              10*this.getScaledValNeg(Eccentricity, EccentricityMin, EccentricityMax) + 
                              20*this.getScaledValPos(SNRWeight, SNRWeightMin, SNRWeightMax) +
                              65;
                        break;
                  case 'Stars':
                        /* More weight on stars.
                         */
                        SSWEIGHT = 35*this.getScaledValNeg(FWHM, FWHMMin, FWHMMax) + 
                              35*this.getScaledValNeg(Eccentricity, EccentricityMin, EccentricityMax) + 
                              20*this.getScaledValPos(SNRWeight, SNRWeightMin, SNRWeightMax) +
                              10;
                        break;
                  case 'PSF Signal':
                        if (this.global.pixinsight_version_num < 1080810) {
                              this.util.throwFatalError("Option " + this.par.use_weight.val + " is not supported in this version of PixInsight");
                        }
                        SSWEIGHT = measurements[i][indexPSFSignal];
                        if (isNaN(SSWEIGHT)) {
                              SSWEIGHT = 0;
                              measurements[i][indexPSFSignal] = 0;
                        }
                        break;
                  case 'PSF Signal scaled':
                        if (this.global.pixinsight_version_num < 1080810) {
                              this.util.throwFatalError("Option " + this.par.use_weight.val + " is not supported in this version of PixInsight");
                        }
                        SSWEIGHT = 99 * this.getScaledValPos(measurements[i][indexPSFSignal], PSFSignalMin, PSFSignalMax) + 1;
                        break;
                  case 'FWHM scaled':
                        SSWEIGHT = 99 * this.getScaledValNeg(measurements[i][indexFWHM], FWHMMin, FWHMMax) + 1;
                        filter_high = true;
                        break;
                  case 'Eccentricity scaled':
                        SSWEIGHT = 99 * this.getScaledValNeg(measurements[i][indexEccentricity], EccentricityMin, EccentricityMax) + 1;
                        filter_high = true;
                        break;
                  case 'SNR scaled':
                        SSWEIGHT = 99 * this.getScaledValPos(measurements[i][indexSNRWeight], SNRWeightMin, SNRWeightMax) + 1;
                        break;
                  case 'Star count':
                        SSWEIGHT = measurements[i][indexStars] + 1;      // Add one to avoid zero value
                        break;
                  default:
                        this.util.throwFatalError("Invalid option " + this.par.use_weight.val);
            }
            if (isNaN(SSWEIGHT)) {
                  SSWEIGHT = 0;
            }
            console.writeln("SSWEIGHT " + SSWEIGHT + ", FWHM " + FWHM + ", Ecc " + Eccentricity + ", SNR " + SNRWeight + 
                              ", Stars " + measurements[i][indexStars] + ", PSFSignal " + measurements[i][indexPSFSignal] + ", PSFPower " + measurements[i][indexPSFPower] +
                              ", " + measurements[i][indexPath]);
            // set SSWEIGHT to indexWeight column
            measurements[i][indexWeight] = SSWEIGHT;
      }
      console.writeln("SSWEIGHTMin " + this.findMin(measurements, indexWeight) + " SSWEIGHTMax " + this.findMax(measurements, indexWeight));
      measurements = this.filterOutliers(measurements, "SSWEIGHT", indexWeight, this.par.outliers_ssweight.val, indexPath, filtered_files);
      measurements = this.filterLimit(measurements, "SSWEIGHT", [ indexWeight, filter_high ], this.par.ssweight_limit.val, indexPath, filtered_files, true);
      if (this.par.filter_limit1_type.val != 'None' && this.par.filter_limit1_val.val != 0) {
            measurements = this.filterLimit(measurements, this.par.filter_limit1_type.val, this.findFilterIndex(this.par.filter_limit1_type.val), this.par.filter_limit1_val.val, indexPath, filtered_files);
      }
      if (this.par.filter_limit2_type.val != 'None' && this.par.filter_limit2_val.val != 0) {
            measurements = this.filterLimit(measurements, this.par.filter_limit2_type.val, this.findFilterIndex(this.par.filter_limit2_type.val), this.par.filter_limit2_val.val, indexPath, filtered_files);
      }
      if (this.par.filter_limit3_type.val != 'None' && this.par.filter_limit3_val.val != 0) {
            measurements = this.filterLimit(measurements, this.par.filter_limit3_type.val, this.findFilterIndex(this.par.filter_limit3_type.val), this.par.filter_limit3_val.val, indexPath, filtered_files);
      }
      if (this.par.filter_limit4_type.val != 'None' && this.par.filter_limit4_val.val != 0) {
            measurements = this.filterLimit(measurements, this.par.filter_limit4_type.val, this.findFilterIndex(this.par.filter_limit4_type.val), this.par.filter_limit4_val.val, indexPath, filtered_files);
      }

      /* Collect FWHM values to a separate array to find median FWHM.*/
      var FWHMValues = [];
      for (var i = 0; i < measurements.length; i++) {
            let FWHM = measurements[i][indexFWHM];
            if (FWHM != undefined && !isNaN(FWHM) && FWHM != 0) {
                  FWHMValues[FWHMValues.length] = FWHM;
            }
      }

      /* Sort values to find median FWHM. */
      FWHMValues.sort( function(a, b) {
            return a - b;
      });
      if (FWHMValues.length >= 3) {
            console.writeln("FWHMValues " + FWHMValues);
            var medianIndex = Math.floor(FWHMValues.length / 2);
            this.medianFWHM = FWHMValues[medianIndex];
      } else if (FWHMValues.length > 0) {
            this.medianFWHM = FWHMValues[0];
      } else {
            this.medianFWHM = null;
      }

      if (this.medianFWHM != null) {
            console.writeln("AutoIntegrateMEDFWHM " + this.medianFWHM);
      } else {
            console.writeln("AutoIntegrateMEDFWHM not available, measurements.length " + measurements.length + ", FWHMValues.length " + FWHMValues.length);
      }

      var ssFiles = [];
      for (var i = 0; i < measurements.length; i++) {
            ssFiles[ssFiles.length] = [ measurements[i][indexPath], measurements[i][indexWeight] ];
      }

      if (weight_filtering) {
            this.sortMeasurements(measurements, filtered_files, sort_order);
            console.writeln("subframeSelectorMeasure, " + filtered_files.length + " discarded files");
            if (this.par.debug.val) {
                  for (var i = 0; i < filtered_files.length; i++) {
                        console.writeln(filtered_files[i][indexPath]);
                  }
            }
            console.writeln("subframeSelectorMeasure, " + measurements.length + " accepted files");
            if (this.par.debug.val) {
                  for (var i = 0; i < measurements.length; i++) {
                        console.writeln(measurements[i][indexPath]);
                  }
            }
            var treeboxfiles = [];
            // add selected files as checked
            for (var i = 0; i < measurements.length; i++) {
                  // Create treeboxfiles as [ filename, checked, weight ]
                  treeboxfiles[treeboxfiles.length] =  [ measurements[i][indexPath], true, measurements[i][indexWeight] ];
            }
            // add filtered files as unchecked
            for (var i = 0; i < filtered_files.length; i++) {
                  treeboxfiles[treeboxfiles.length] = [ filtered_files[i][indexPath], false, 0 ];
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
                        this.util.addJsonFileInfo(fileInfoList, this.global.pages.LIGHTS, treeboxfiles, null);
                        let saveInfo = this.util.initJsonSaveInfo(fileInfoList, false, "");
                        console.writeln("saveInfo " + saveInfo);
                        let saveInfoJson = JSON.stringify(saveInfo, null, 2);
                        console.writeln("saveInfoJson " + saveInfoJson);
                        // save to a file
                        let weightsFile = this.util.ensure_win_prefix("AutoWeights.json");
                        let outputDir = this.util.getOutputDir(treeboxfiles[0][0]);
                        let outputFile = outputDir + weightsFile;
                        console.noteln("Write weights to " + outputFile);
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

runSubframeSelector(fileNames)
{
      if (this.par.use_fastintegration.val && this.par.fastintegration_fast_subframeselector.val) {
            this.util.addProcessingStepAndStatusInfo("Run SubframeSelector on subset of files");
            var fast_measure = true;
            // Measure only 32 first images
            var measured_files = fileNames.slice(0, 32);
            // save rest of files
            var rest_files = fileNames.slice(32);
      } else {
            this.util.addProcessingStepAndStatusInfo("Run SubframeSelector");
            var fast_measure = false;
            var measured_files = fileNames;
      }
      console.writeln("input[0] " + fileNames[0]);

      var ssWeights = this.subframeSelectorMeasure(measured_files, this.par.image_weight_testing.val, false, measured_files);
      // SubframeSelectorOutput(P.measurements); Does not write weight keyword

      if (this.global.get_flowchart_data) {
            var names_and_weights = { filenames: fileNames, ssweights: ssWeights, postfix: "" /* "_a" */ };
            return names_and_weights;
      }

      var newFileNames = [];

      if (this.par.image_weight_testing.val) {
            // Do not generate output files
            var postfix = "";
            for (var i = 0; i < ssWeights.length; i++) {
                  var filePath = ssWeights[i][0];
                  if (filePath != null && filePath != "") {
                        newFileNames[newFileNames.length] = filePath;
                  }
            }
      } else if (fast_measure) {
            // Do not generate output files
            var postfix = "";
            for (var i = 0; i < ssWeights.length; i++) {
                  var filePath = ssWeights[i][0];
                  if (filePath != null && filePath != "") {
                        newFileNames[newFileNames.length] = filePath;
                  }
            }
            // Add rest of files to newFileNames and add empty weights to ssWeights
            for (var i = 0; i < rest_files.length; i++) {
                  newFileNames[newFileNames.length] = rest_files[i];
                  ssWeights[ssWeights.length] = [ rest_files[i], 0 ];
            }
      } else {
            /* Basically we could skip writing SSWEIGHT to output files as we have that
            * information in memory. But for some cases like starting from ImageIntegration
            * and printing best files for each channel it is useful to write
            * output files with SSWEIGHT on them.
            */
            var outputDir = this.global.outputRootDir + this.global.AutoOutputDir;
            var postfix = "" /* "_a" */;
            var outputExtension = ".xisf";
            for (var i = 0; i < ssWeights.length; i++) {
                  var filePath = ssWeights[i][0];
                  if (filePath != null && filePath != "") {
                        var SSWEIGHT = ssWeights[i][1];
                        var newFilePath = this.generateNewFileName(filePath, outputDir, postfix, outputExtension);
                        console.writeln("Writing file " + newFilePath + ", SSWEIGHT=" + SSWEIGHT);
                        var imageWindows = ImageWindow.open(filePath);
                        if (!imageWindows || imageWindows.length == 0) {
                              console.writeln("*** Error: imageWindows.length: ", imageWindows.length);
                              continue;
                        }
                        var imageWindow = imageWindows[0];
                        if (imageWindow == null) {
                              console.writeln("*** Error: Can't read subframe: ", filePath);
                              continue;
                        }
                        this.setSSWEIGHTkeyword(imageWindow, SSWEIGHT);
                        if (!this.writeImage(newFilePath, imageWindow)) {
                              this.util.closeOneWindow(imageWindow);
                              console.writeln(
                              "*** Error: Can't write output image: ", newFilePath
                              );
                              continue;
                        }         
                        this.util.closeOneWindow(imageWindow);
                  }
                  newFileNames[newFileNames.length] = newFilePath;
            }
      }
      this.util.addProcessingStep("runSubframeSelector, input " + fileNames.length + " files, output " + newFileNames.length + " files");
      console.writeln("output[0] " + newFileNames[0]);

      var names_and_weights = { filenames: newFileNames, ssweights: ssWeights, postfix: postfix };
      return names_and_weights;
}

findBestSSWEIGHT(parent, names_and_weights, filename_postfix)
{
      var ssweight;
      var fileNames = names_and_weights.filenames;
      var newFileNames = [];

      if (names_and_weights.filenames.length < names_and_weights.ssweights.length) {
            // we have inconsistent lengths
            this.util.throwFatalError("Inconsistent lengths, filenames.length=" + names_and_weights.filenames.length + ", ssweights.length=" + names_and_weights.ssweights.length);
      }

      if (this.par.use_fastintegration.val && this.par.fastintegration_fast_subframeselector.val) {
            var ssweight_limit = 0;
      } else {
            var ssweight_limit = this.par.ssweight_limit.val;
      }

      this.global.best_ssweight = 0;
      this.global.best_image = null;

      /* Loop through files and find image with best SSWEIGHT.
       */
      this.util.addProcessingStepAndStatusInfo("Find best SSWEIGHT");
      var n = 0;
      var first_image = true;
      var best_ssweight_naxis = 0;
      var file_name_text_best_image = null;
      var file_name_text_best_image_ssweight = 0;
      var found_user_selected_best_image = null;
      var found_user_selected_best_image_ssweight = 0;
      for (var i = 0; i < fileNames.length; i++) {
            var filePath = fileNames[i];
            var keywords = this.getFileKeywords(filePath);

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
            if (this.global.user_selected_best_image != null 
                && found_user_selected_best_image == null
                && this.util.compareReferenceFileNames(this.global.user_selected_best_image, filePath, filename_postfix))
              {
                    found_user_selected_best_image = filePath;
                    found_user_selected_best_image_ssweight = ssweight;
                    console.writeln("found user selected best image " + this.global.user_selected_best_image + " as " + filePath);
              }
              if (fileNames[i].indexOf("best_image") != -1) {
                    // User has marked this image as the best
                    file_name_text_best_image = filePath;
                    file_name_text_best_image_ssweight = ssweight;
                    console.writeln("found text 'best_image' from file name " + filePath);
              }
              if (ssweight_found) {
                  this.ssweight_set = true;
                  if (ssweight >= ssweight_limit) {
                        if (!first_image && naxis1 > best_ssweight_naxis) {
                              this.util.addProcessingStep("Files have different resolution, using bigger NAXIS1="+naxis1+" for best SSWEIGHT");
                        }
                        if (first_image || 
                            naxis1 > best_ssweight_naxis ||
                            (ssweight > this.global.best_ssweight &&
                             naxis1 == best_ssweight_naxis))
                        {
                              /* Set a new best image if
                              - this is the first image
                              - this has a bigger resolution
                              - this has a bigger SSWEIGHT value and is the same resolution
                              */
                              this.global.best_ssweight = ssweight;
                              console.writeln("new best_ssweight=" +  this.global.best_ssweight);
                              this.global.best_image = filePath;
                              best_ssweight_naxis = naxis1;
                              first_image = false;
                        }
                  } else {
                        console.writeln("below ssweight limit " + this.par.ssweight_limit.val + ", skip image");
                        accept_file = false;
                  }
                  if (this.gui) {
                        this.guiSetTreeBoxNodeSsweight(parent.treeBox[this.global.pages.LIGHTS], filePath, ssweight, filename_postfix);
                  }
            }
            if (accept_file) {
                  newFileNames[newFileNames.length] = fileNames[i];
            }
      }
      if (newFileNames.length == 0) {
            this.util.throwFatalError("No files found for processing.");
      }
      if (found_user_selected_best_image != null || file_name_text_best_image != null) {
            if (found_user_selected_best_image != null) {
                  console.writeln("Using user selected best image " + found_user_selected_best_image + ", ssweight " + found_user_selected_best_image_ssweight);
                  this.global.best_image = found_user_selected_best_image;
                  this.global.best_ssweight = found_user_selected_best_image_ssweight;
            } else {
                  console.writeln("Using best image as a file with text best_image " + file_name_text_best_image + ", ssweight " + file_name_text_best_image_ssweight);
                  this.global.best_image = file_name_text_best_image;
                  this.global.best_ssweight = file_name_text_best_image_ssweight;
            }
      } else if (this.global.best_image != null) {
            console.writeln("Using best image " + this.global.best_image);
      } else {
            console.writeln("Unable to find image with best SSWEIGHT, using first image " + newFileNames[0]);
            this.global.best_image = newFileNames[0];
            this.global.best_ssweight = 1.0;
      }
      return [ this.global.best_image, newFileNames ];
}

filterByFileName(filePath, filename_postfix)
{
      var basename = File.extractName(filePath);
      var filter = basename.slice(0, basename.length - filename_postfix.length).slice(-2);
      
      console.writeln("filterByFileName:filePath=" + basename + ", filename_postfix=" + filename_postfix + ", filter=" + filter);
      
      // Create filter based of file name ending.
      switch (filter) {
            case '_L':
                  filter = 'L';
                  break;
            case '_R':
                  filter = 'R';
                  break;
            case '_G':
                  filter = 'G';
                  break;
            case '_B':
                  filter = 'B';
                  break;
            case '_S':
                  filter = 'S';
                  break;
            case '_H':
                  filter = 'H';
                  break;
            case '_O':
                  filter = 'O';
                  break;
            default:
                  filter = null;
                  break;
      }
      if (filter != null) {
            console.writeln("filterByFileName:file end filter=" + filter);
            return filter;
      }
      // Check if filter name is embedded in file name.
      var names = [ '_Luminance_', '_Red_', '_Green_', '_Blue_', '_SII_', '_Halpha_', '_OIII_' ];
      var filters = [ 'L', 'R', 'G', 'B', 'S', 'H', 'O' ];
      for (var i = 0; i < names.length; i++) {
            if (basename.indexOf(names[i]) != -1) {
                  console.writeln("filterByFileName:file name filter=" + filters[i]);
                  return filters[i];
            }
      }
      console.writeln("filterByFileName:filter not found");
      return null;
}

// Update files.images info for a channel. Find the best image for a channel
// using either ssweight or user chosen reference image.
// For image integration are ordered so that the best image is first. We also
// record best image separately that use used by local normalization.
updateFilesInfo(parent, files, filearr, filter, filename_postfix)
{
      console.writeln("updateFilesInfo, " + filearr.length + " " + filter + " files");

      // Check if we have user selected reference image for the channel.
      var refImage = null;
      for (var i = 0; i < this.global.user_selected_reference_image.length && !this.global.get_flowchart_data; i++) {
            if (this.global.user_selected_reference_image[i][1] == filter) {
                  refImage = this.global.user_selected_reference_image[i][0];
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
                  if (this.util.compareReferenceFileNames(refImage, filearr[i].name, filename_postfix)) {
                        refImage = filearr[i].name;
                        break;
                  }
            }
            if (i == filearr.length) {
                  this.util.throwFatalError("User selected reference image " + refImage + " for filter " + filter + " not found from image list, filename_postfix " + filename_postfix);
            }
      }

      // Update files object.
      var automatic_reference_image = null;
      for (var i = 0; i < filearr.length; i++) {
            var found_best_image = false;
            if (refImage != null && filearr[i].name == refImage) {
                  found_best_image = true;
                  console.writeln(filter + " user selected best image " + filearr[i].name + " as reference image, ssweight=" + filearr[i].ssweight);
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
                   this.insert_image_for_integrate(files.images, filearr[i].name, filearr[i].ssweight);
            } else {
                  this.append_image_for_integrate(files.images, filearr[i].name, filearr[i].ssweight);
            }
            files.exptime += filearr[i].exptime;
      }
      if (automatic_reference_image != null && this.gui && !this.global.get_flowchart_data) {
            console.writeln("Set automatic reference image " + automatic_reference_image + " for filter " + filter + ", ssweight=" + files.best_ssweight);
            this.gui.setReferenceImageInTreeBox(parent, parent.treeBox[this.global.pages.LIGHTS], automatic_reference_image, filename_postfix, filter);
      }
}

init_images()
{
      return { images: [], best_image: null, best_ssweight: 0, exptime: 0 };
}

getFileKeywords(filePath)
{
      if (this.global.debug) console.writeln("getFileKeywords " + filePath);
      var keywords = [];

      if (this.global.get_flowchart_data && !File.exists(filePath)) {
            return [];
      }

      var ext = '.' + filePath.split('.').pop();
      var F = new FileFormat(ext, true/*toRead*/, false/*toWrite*/);
      if (F.isNull) {
            this.util.throwFatalError("No installed file format can read \'" + ext + "\' files."); // shouldn't happen
      }
      var f = new FileFormatInstance(F);
      if (f.isNull) {
            this.util.throwFatalError("Unable to instantiate file format: " + F.name);
      }
      var info = f.open(filePath, "verbosity 0"); // do not fill the console with useless messages
      if (info == null) {
            this.util.throwFatalError("Unable to open input file: " + filePath);
      }
      if (info.length <= 0) {
            this.util.throwFatalError("Unable to open input file: " + filePath);
      }
      if (F.canStoreKeywords) {
            keywords = f.keywords;
      }
      f.close();

      return keywords;
}

/* Read FITS headers from a file and return its EXPTIME/EXPOSURE value. */
getExptimeFromFile(filePath)
{
      var keywords = this.getFileKeywords(filePath);
      for (var j = 0; j < keywords.length; j++) {
            var value = keywords[j].strippedValue.trim();
            if (keywords[j].name == "EXPTIME" || keywords[j].name == "EXPOSURE") {
                  return parseFloat(value);
            }
      }
      return 0;
}

// Get filter keywpord for image. If filter is not found from FILTER keyword
// or file name, default to color files.
// Parameters:
// filter: FILTER keyword value or null
// filePath: file path
// filename_postfix: file name postfix
getFilterKeywordForImage(filter, filePath, filename_postfix)
{
      /* 1. Check Hubble filter
       */
      if (filter != null && filter.trim().substring(0, 1) == 'F') {
            // Hubble FILTER starts with F, force using file name
            filter = null;
      }
      /* 2. No filter keyword, check file name
       */
      if (filter == null || this.par.force_file_name_filter.val) {
            // No filter keyword. Try mapping based on file name.
            filter = this.filterByFileName(filePath, filename_postfix);
            if (filter == null  && this.global.get_flowchart_data) {
                  filter = this.filterByFileName(filePath, '');
            }
      }
      /* 3. No filter keyword or name found, default to color files
       */
      if (filter == null) {
            filter = 'Color';
      }
      /* 4. With monochrome settings, set all as luminance
       */
      if (this.par.monochrome_image.val) {
            console.writeln("Create monochrome image, set filter = Luminance");
            filter = 'Luminance';
      }
      /* 5. Check with full filter name, either from FILTER keyword or file name
       */
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
            case 'LC':   // Seestar
            case 'LP':   // Seestar
            case 'C':
                  filter = 'C';
                  break;
            default:
                  break;
      }
      /* 6. Do final resolve based on the first letter in the filter
       */
      var filter_keyword = filter.trim().substring(0, 1).toUpperCase();

      return filter_keyword;
}

// Group astrobin info so that for each date there are 
// entries for each filter. Each filter has number of images 
// for each exposure time.
addAstrobinInfo(date_obs, filter, exptime, binning)
{
      if (date_obs == null || date_obs == "") {
            console.writeln("addAstrobinInfo: date_obs is null or empty, filter=" + filter + ", exptime=" + exptime);
            return;
      }
      if (filter == null || filter == "") {
            console.writeln("addAstrobinInfo: filter is null or empty, date_obs=" + date_obs + ", exptime=" + exptime);
            return;
      }
      if (exptime == null || exptime == "") {
            console.writeln("addAstrobinInfo: exptime is null or empty, date_obs=" + date_obs + ", filter=" + filter);
            return;
      }
      // From date obs get only date part
      date_obs = date_obs.split('T')[0];
      // Initialize astrobin_info if not already done
      if (!this.astrobin_info) {
            this.astrobin_info = {};
      }
      if (!this.astrobin_info[date_obs]) {
            this.astrobin_info[date_obs] = {};
      }
      if (!this.astrobin_info[date_obs][filter]) {
            this.astrobin_info[date_obs][filter] = {};
      }
      if (!this.astrobin_info[date_obs][filter][exptime]) {
            this.astrobin_info[date_obs][filter][exptime] = { count: 0, binning: binning };
      }
      var info = this.astrobin_info[date_obs][filter][exptime];
      info.count++;
      if (binning >  info.binning) {
            // Update binning if it is bigger than the current one
            info.binning = binning;
      }
      // console.writeln("addAstrobinInfo: date_obs=" + date_obs + ", filter=" + filter + ", exptime=" + exptime + ", count=" + info.count + ", binning=" + info.binning);
}

getAstrobinFilterNumber(filter)
{
      var number_txt = "";
      switch (filter) {
            case 'L':
                  number_txt = this.par.astrobin_L.val;
                  break;
            case 'R':
                  number_txt = this.par.astrobin_R.val;
                  break;
            case 'G':
                  number_txt = this.par.astrobin_G.val;
                  break;
            case 'B':
                  number_txt = this.par.astrobin_B.val;
                  break;
            case 'H':
                  number_txt = this.par.astrobin_H.val;
                  break;
            case 'S':
                  number_txt = this.par.astrobin_S.val;
                  break;
            case 'O':
                  number_txt = this.par.astrobin_O.val;
                  break;
            case 'C':
            default:
                  number_txt = this.par.astrobin_C.val;
                  break;
      }
      if (number_txt == "") {
            return filter;
      } else {
            return number_txt;
      }
}

// Write astrobin info to a file in CSV format
writeAstrobinInfo()
{
      if (this.astrobin_info == null || Object.keys(this.astrobin_info).length == 0) {
            return;
      }
      // Write this.astrobin_info to a file in CSV format
      var outputDir = this.global.outputRootDir + this.global.AutoProcessedDir;
      var outputFile = this.util.ensurePathEndSlash(outputDir) + "AstrobinInfo.csv";
      console.writeln("Writing astrobin info to " + outputFile);
      var file = new File();
      file.createForWriting(outputFile);
      file.outTextLn("date,filter,number,duration,binning");
      for (var date in this.astrobin_info) {
            for (var filter in this.astrobin_info[date]) {
                  for (var exptime in this.astrobin_info[date][filter]) {
                        var info = this.astrobin_info[date][filter][exptime];
                        file.outTextLn(date + "," + this.getAstrobinFilterNumber(filter) + "," + info.count + "," + exptime + "," + info.binning);
                  }
            }
      }
      file.close();
}

// Filter files based on filter keyword/file name.
// files array can be either simple file name array
// or treeboxfiles array having [ filename, checked, weight ] members
getFilterFiles(files, pageIndex, filename_postfix, flochart_files = false, generate_astrobin_info = false)
{
      var luminance = false;
      var rgb = false;
      var narrowband = false;
      this.ssweight_set = false;
      var allfilesarr = [];
      var error_text = "";
      var color_files = false;
      var filterSet = null;
      var imgwidth = 0;
      var imgheigth = 0;
      var minwidth = 0;
      var minheigth = 0;
      var maxwidth = 0;
      var maxheigth = 0;
      var firstDate = null;
      var lastDate = null;
      var filecount = 0;

      var allfiles = {
            L: [], R: [], G: [], B: [], H: [], S: [], O: [], C: []
      };

      switch (pageIndex) {
            case this.global.pages.LIGHTS:
                  filterSet = this.global.lightFilterSet;
                  break;
            case this.global.pages.FLATS:
                  filterSet = this.global.flatFilterSet;
                  break;
            case this.global.pages.FLAT_DARKS:
                  filterSet = this.global.flatDarkFilterSet;
                  break;
      }

      if (filterSet != null) {
            this.util.clearFilterFileUsedFlags(filterSet);
      }

      if (this.par.force_narrowband_mapping.val) {
            narrowband = true;
      }

      if (generate_astrobin_info) {
            // Clear possible old info
            this.astrobin_info = null;
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
            var date_obs = null;
            var binning = 1;
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
            
            if (this.global.debug) console.writeln("getFilterFiles file " +  filePath);

            if (!File.exists(filePath)) {
                  console.criticalln("File " + filePath + " does not exist\n");
                  continue;
            }
            filecount++;
            if (filterSet != null) {
                  filter = this.util.findFilterForFile(filterSet, filePath, filename_postfix);
            }

            /* Go through keywords in the file.
             */
            var keywords = this.getFileKeywords(filePath);
            n++;
            for (var j = 0; j < keywords.length; j++) {
                  var value = keywords[j].strippedValue.trim();
                  switch (keywords[j].name) {
                        case "FILTER":
                        case "INSFLNAM":
                              if (filter != null) {
                                    if (this.global.debug) console.writeln("filter already found, ignored "+ keywords[j].name + "=" +  value);
                              } else if (!this.par.skip_autodetect_filter.val) {
                                    if (this.global.debug) console.writeln(keywords[j].name + "=" + value);
                                    filter = value;
                              } else {
                                    if (this.global.debug) console.writeln("ignored " + keywords[j].name + "=" +  value);
                              }
                              break;
                        case "SSWEIGHT":
                              if (!use_treebox_ssweight) {
                                    ssweight = parseFloat(value);
                                    if (this.global.debug) console.writeln("SSWEIGHT=" +  ssweight);
                                    this.ssweight_set = true;
                              }
                              break;
                        case "TELESCOP":
                              if (this.global.debug) console.writeln("TELESCOP=" +  value);
                              if (pageIndex == this.global.pages.LIGHTS
                                  && this.local_debayer_pattern == 'Auto'
                                  && value.search(/slooh/i) != -1
                                  && value.search(/T3/) != -1) 
                              {
                                    if (this.global.debug) console.writeln("Set debayer pattern from Auto to None");
                                    this.local_debayer_pattern = 'None';
                              }
                              this.imageSolver.current_telescope_name = value;
                              break;
                        case "NAXIS1":
                              if (this.global.debug) console.writeln("NAXIS1=" + value);
                              var imgwidth = parseFloat(value);
                              if (minwidth == 0 || imgwidth < minwidth) {
                                    minwidth = imgwidth;
                              }
                              if (imgwidth > maxwidth) {
                                    maxwidth = imgwidth;
                              }
                              break;
                        case "NAXIS2":
                              if (this.global.debug) console.writeln("NAXIS2=" + value);
                              var imgheigth = parseFloat(value);
                              if (minheigth == 0 || imgheigth < minheigth) {
                                    minheigth = imgheigth;
                              }
                              if (imgheigth > maxheigth) {
                                    maxheigth = imgheigth;
                              }
                              break;
                        case "EXPTIME":
                        case "EXPOSURE":
                              if (this.global.debug) console.writeln(keywords[j].name + "=" + value);
                              exptime = parseFloat(value);
                              break;
                        case "DATE-OBS":
                              if (this.global.debug) console.writeln(keywords[j].name + "=" + value);
                              date_obs = value;
                              break;
                        case "XBINNING":
                              if (this.global.debug) console.writeln("XBINNING=" + value);
                              var val = parseInt(value);
                              if (val > binning) {
                                    binning = val;
                              }
                              break;
                        case "YBINNING":
                              if (this.global.debug) console.writeln("YBINNING=" + value);
                              var val = parseInt(value);
                              if (val > binning) {
                                    binning = val;
                              }
                              break;
                        default:
                              break;
                  }
            }

            /* Resolve image filter.
             */
            var filter_keyword = this.getFilterKeywordForImage(filter, filePath, filename_postfix);

            if (generate_astrobin_info) {
                  this.addAstrobinInfo(date_obs, filter_keyword, exptime, binning);
            }

            var file_info = { name: filePath, ssweight: ssweight, exptime: exptime, filter: filter_keyword, checked: checked,
                              best_image: treebox_best_image, reference_image: treebox_reference_image,
                              width: imgwidth, heigth: imgheigth, date_obs: date_obs, isFirstDate: false, isLastDate: false };
            if (date_obs != null) {
                  if (firstDate == null || date_obs < firstDate) {
                        if (this.global.debug) console.writeln("firstDate " + date_obs);
                        firstDate = date_obs;
                        this.firstDateFileInfo = file_info;
                  }
                  if (lastDate == null || date_obs > lastDate) {
                        if (this.global.debug) console.writeln("lastDate " + date_obs);
                        lastDate = date_obs;
                        this.lastDateFileInfo = file_info;
                  }
            }
            switch (filter_keyword) {
                  case 'L':
                        if (allfiles.L.length == 0) {
                              console.writeln("Found "+ filter_keyword + " files (" + filePath + ")");
                        }
                        allfiles.L[allfiles.L.length] = file_info;
                        luminance = true;
                        break;
                  case 'R':
                        if (allfiles.R.length == 0) {
                              console.writeln("Found "+ filter_keyword + " files (" + filePath + ")");
                        }
                        allfiles.R[allfiles.R.length] = file_info;
                        rgb = true;
                        break;
                  case 'G':
                        if (allfiles.G.length == 0) {
                              console.writeln("Found "+ filter_keyword + " files (" + filePath + ")");
                        }
                        allfiles.G[allfiles.G.length] = file_info;
                        rgb = true;
                        break;
                  case 'B':
                        if (allfiles.B.length == 0) {
                              console.writeln("Found "+ filter_keyword + " files (" + filePath + ")");
                        }
                        allfiles.B[allfiles.B.length] = file_info;
                        rgb = true;
                        break;
                  case 'H':
                        if (allfiles.H.length == 0) {
                              console.writeln("Found "+ filter_keyword + " files (" + filePath + ")");
                        }
                        allfiles.H[allfiles.H.length] = file_info;
                        narrowband = true;
                        break;
                  case 'S':
                        if (allfiles.S.length == 0) {
                              console.writeln("Found "+ filter_keyword + " files (" + filePath + ")");
                        }
                        allfiles.S[allfiles.S.length] = file_info;
                        narrowband = true;
                        break;
                  case 'O':
                        if (allfiles.O.length == 0) {
                              console.writeln("Found "+ filter_keyword + " files (" + filePath + ")");
                        }
                        allfiles.O[allfiles.O.length] = file_info;
                        narrowband = true;
                        break;
                  case 'C':
                  default:
                        if (allfiles.C.length == 0) {
                              console.writeln("Found "+ filter_keyword + " files (" + filePath + ")");
                        }
                        allfiles.C[allfiles.C.length] = file_info;
                        color_files = true;
                        break;
            }
            if (flochart_files) {
                  // Stop as soon as we have collected enough files for this.flowchart
                  if (allfiles.C.length >= 3) {
                        break;
                  }
                  // Harder for channel files as we may have random order
                  // We just select all files
            }
      }

      allfilesarr[this.channels.L] = { files: allfiles.L, filter: 'L' };
      allfilesarr[this.channels.R] = { files: allfiles.R, filter: 'R' };
      allfilesarr[this.channels.G] = { files: allfiles.G, filter: 'G' };
      allfilesarr[this.channels.B] = { files: allfiles.B, filter: 'B' };
      allfilesarr[this.channels.H] = { files: allfiles.H, filter: 'H' };
      allfilesarr[this.channels.S] = { files: allfiles.S, filter: 'S' };
      allfilesarr[this.channels.O] = { files: allfiles.O, filter: 'O' };
      allfilesarr[this.channels.C] = { files: allfiles.C, filter: 'C' };

      if (color_files && (luminance || rgb || narrowband)) {
            error_text = "Error, cannot mix color and monochrome filter files";
      } else if (rgb && (allfiles.R.length == 0 || allfiles.G.length == 0 || allfiles.B.length == 0)) {
            error_text = "Error, with RGB files for all RGB channels must be given";
      } else if (luminance && (!rgb && !narrowband && !this.par.monochrome_image.val)) {
            error_text = "Error, with luminance files RGB or narrowband channels must be given";
      }

      return { allfilesarr : allfilesarr,
               luminance : luminance, 
               rgb : rgb, 
               narrowband : narrowband,
               color_files : color_files,
               ssweight_set : this.ssweight_set,
               error_text: error_text,
               firstDateFileInfo: this.firstDateFileInfo,
               lastDateFileInfo: this.lastDateFileInfo,
               minwidth : minwidth,
               minheigth : minheigth,
               maxwidth : maxwidth,
               maxheigth : maxheigth,
               filecount : filecount
      };
}

getImagetypFiles(files)
{
      var allfiles = [];

      for (var i = 0; i < this.global.pages.END; i++) {
            allfiles[i] = [];
      }

      /* Collect all different image types types.
       */
      var n = 0;
      for (var i = 0; i < files.length; i++) {
            var imagetyp = null;
            var filePath = files[i];
            
            if (this.global.debug) console.writeln("getImagetypFiles file " +  filePath);
            var keywords = this.getFileKeywords(filePath);
            n++;
            for (var j = 0; j < keywords.length; j++) {
                  var value = keywords[j].strippedValue.trim();
                  switch (keywords[j].name) {
                        case "IMAGETYP":
                              if (this.global.debug) console.writeln("imagetyp=" +  value);
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
                        allfiles[this.global.pages.BIAS][allfiles[this.global.pages.BIAS].length] = filePath;
                        break;
                  case 'dark frame':
                  case 'dark':
                  case 'master dark':
                        allfiles[this.global.pages.DARKS][allfiles[this.global.pages.DARKS].length] = filePath;
                        break;
                  case 'flat frame':
                  case 'flat field':
                  case 'flat':
                  case 'master flat':
                        allfiles[this.global.pages.FLATS][allfiles[this.global.pages.FLATS].length] = filePath;
                        break;
                  case 'flatdark':
                  case 'flat dark':
                  case 'darkflat':
                  case 'dark flat':
                  case 'master flat dark':
                        allfiles[this.global.pages.FLAT_DARKS][allfiles[this.global.pages.FLAT_DARKS].length] = filePath;
                        break;
                  case 'light frame':
                  case 'light':
                  case 'master light':
                  default:
                        allfiles[this.global.pages.LIGHTS][allfiles[this.global.pages.LIGHTS].length] = filePath;
                        break;
            }
      }
      return allfiles;
}

findLRGBchannels(parent, alignedFiles, filename_postfix)
{
      /* Loop through aligned files and find different this.channels.
       */
      this.util.addProcessingStepAndStatusInfo("Find L,R,G,B,H,S,O and color channels");

      this.L_images = this.init_images();
      this.R_images = this.init_images();
      this.G_images = this.init_images();
      this.B_images = this.init_images();
      this.H_images = this.init_images();
      this.S_images = this.init_images();
      this.O_images = this.init_images();
      this.C_images = this.init_images();

      /* Collect all different file types and some information about them.
       */
      var filter_info = this.getFilterFiles(alignedFiles, this.global.pages.LIGHTS, filename_postfix, false, true);

      var allfilesarr = filter_info.allfilesarr;
      var rgb = filter_info.rgb;
      this.is_color_files = filter_info.color_files;

      // update this.global variables
      this.is_narrowband_files = filter_info.narrowband;
      this.is_rgb_files = filter_info.rgb;
      this.process_narrowband = this.is_narrowband_files;
      this.ssweight_set = filter_info.ssweight_set;

      // Check for synthetic images
      if (allfilesarr[this.channels.C].files.length == 0) {
            if (this.par.synthetic_l_image.val ||
                  (this.par.synthetic_missing_images.val && allfilesarr[this.channels.L].files.length == 0))
            {
                  if (allfilesarr[this.channels.L].files.length == 0) {
                        this.util.addProcessingStep("No luminance images, synthetic luminance image from all other images");
                  } else {
                        this.util.addProcessingStep("Synthetic luminance image from all light images");
                  }
                  allfilesarr[this.channels.L].files = allfilesarr[this.channels.L].files.concat(allfilesarr[this.channels.R].files);
                  allfilesarr[this.channels.L].files = allfilesarr[this.channels.L].files.concat(allfilesarr[this.channels.G].files);
                  allfilesarr[this.channels.L].files = allfilesarr[this.channels.L].files.concat(allfilesarr[this.channels.B].files);
                  allfilesarr[this.channels.L].files = allfilesarr[this.channels.L].files.concat(allfilesarr[this.channels.H].files);
                  allfilesarr[this.channels.L].files = allfilesarr[this.channels.L].files.concat(allfilesarr[this.channels.S].files);
                  allfilesarr[this.channels.L].files = allfilesarr[this.channels.L].files.concat(allfilesarr[this.channels.O].files);
            }
            if (allfilesarr[this.channels.R].files.length == 0 && this.par.synthetic_missing_images.val) {
                  this.util.addProcessingStep("No red images, synthetic red image from luminance images");
                  allfilesarr[this.channels.R].files = allfilesarr[this.channels.R].files.concat(allfilesarr[this.channels.L].files);
            }
            if (allfilesarr[this.channels.G].files.length == 0 && this.par.synthetic_missing_images.val) {
                  this.util.addProcessingStep("No green images, synthetic green image from luminance images");
                  allfilesarr[this.channels.G].files = allfilesarr[this.channels.G].files.concat(allfilesarr[this.channels.L].files);
            }
            if (allfilesarr[this.channels.B].files.length == 0 && this.par.synthetic_missing_images.val) {
                  this.util.addProcessingStep("No blue images, synthetic blue image from luminance images");
                  allfilesarr[this.channels.B].files = allfilesarr[this.channels.B].files.concat(allfilesarr[this.channels.L].files);
            }
            if (this.par.RRGB_image.val) {
                  this.util.addProcessingStep("RRGB image, use R as L image");
                  console.writeln("L images " +  allfilesarr[this.channels.L].files.length);
                  console.writeln("R images " +  allfilesarr[this.channels.R].files.length);
                  allfilesarr[this.channels.L].files = [];
                  allfilesarr[this.channels.L].files = allfilesarr[this.channels.L].files.concat(allfilesarr[this.channels.R].files);
            }
      }

      // Update channel files.images array.  We find best image for a channel
      // and order it so that best image is first. Channel images are used
      // for image integration.
      this.updateFilesInfo(parent, this.L_images, allfilesarr[this.channels.L].files, 'L', filename_postfix);
      this.updateFilesInfo(parent, this.R_images, allfilesarr[this.channels.R].files, 'R', filename_postfix);
      this.updateFilesInfo(parent, this.G_images, allfilesarr[this.channels.G].files, 'G', filename_postfix);
      this.updateFilesInfo(parent, this.B_images, allfilesarr[this.channels.B].files, 'B', filename_postfix);
      this.updateFilesInfo(parent, this.H_images, allfilesarr[this.channels.H].files, 'H', filename_postfix);
      this.updateFilesInfo(parent, this.S_images, allfilesarr[this.channels.S].files, 'S', filename_postfix);
      this.updateFilesInfo(parent, this.O_images, allfilesarr[this.channels.O].files, 'O', filename_postfix);
      this.updateFilesInfo(parent, this.C_images, allfilesarr[this.channels.C].files, 'C', filename_postfix);

      if (this.C_images.images.length > 0) {
            // Color image
            if (this.L_images.images.length > 0) {
                  this.util.throwFatalError("Cannot mix color and luminance filter files");
            }
            if (this.R_images.images.length > 0) {
                  this.util.throwFatalError("Cannot mix color and red filter files");
            }
            if (this.B_images.images.length > 0) {
                  this.util.throwFatalError("Cannot mix color and blue filter files");
            }
            if (this.G_images.images.length > 0) {
                  this.util.throwFatalError("Cannot mix color and green filter files");
            }
      } else {
            if (this.par.monochrome_image.val) {
                  // Monochrome
                  if (this.L_images.images.length == 0) {
                        this.util.throwFatalError("No Luminance images found");
                  }
            } else if (rgb) {
                  // LRGB or RGB
                  if (this.R_images.images.length == 0 && !this.par.integrate_only.val && !this.par.image_weight_testing.val) {
                        this.util.throwFatalError("No Red images found");
                  }
                  if (this.B_images.images.length == 0 && !this.par.integrate_only.val && !this.par.image_weight_testing.val) {
                        this.util.throwFatalError("No Blue images found");
                  }
                  if (this.G_images.images.length == 0 && !this.par.integrate_only.val && !this.par.image_weight_testing.val) {
                        this.util.throwFatalError("No Green images found");
                  }
            }
            if (this.L_images.images.length > 0) {
                  // Use just RGB this.channels
                  this.is_luminance_images = true;
            }
      }
}

isVariableChar(str) {
      return str.length === 1 && str.match(/[a-z0-9_]/i);
}

add_missing_image(images, to)
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

printMissingNarrowbandMappingError()
{
      if (this.is_rgb_files && this.is_narrowband_files) {
            console.criticalln("There are both RGB and narrowband files");
            console.criticalln("Specify narrowband mapping or use Ha or Narrowband to RGB mapping");
      } else {
            console.criticalln("There are narrowband files so narrowband mapping is used");
      }
      console.criticalln("Selected narrowband mapping is: " + this.local_narrowband_mapping);
      console.criticalln("- R: " + this.local_R_mapping);
      console.criticalln("- G: " + this.local_G_mapping);
      console.criticalln("- B: " + this.local_B_mapping);
}

ensureLightImages(ch, check_allfilesarr)
{
      var errors = false;

      for (var i = 0; i < check_allfilesarr.length; i++) {
            var filterFiles = check_allfilesarr[i].files;
            var filterName = check_allfilesarr[i].filter;
            if (filterName == ch) {
                  if (filterFiles.length == 0) {
                        errors = true;
                  }
                  break;
            }
      }
      if (errors) {
            var filter_files = "";
            for (var i = 0; i < check_allfilesarr.length; i++) {
                  var filterFiles = check_allfilesarr[i].files;
                  if (filterFiles.length > 0) {
                        filter_files += check_allfilesarr[i].filter + " ";
                  }
            }
            this.util.closeTempWindows();
            this.printMissingNarrowbandMappingError();
            console.criticalln("There are no " + ch + " images, but there are " + filter_files + " images");
            this.util.throwFatalError("There are no " + ch + " images that are needed for PixelMath mapping");
      }
}

findWindowAutoContinuePrefix(to_id, check_basename)
{
      if (this.ppar.autocontinue_win_prefix != "" 
            && this.ppar.autocontinue_win_prefix != this.ppar.win_prefix)
      {
            // Try replacing autocontinue prefix with normal prefix
            if (to_id.startsWith(this.ppar.autocontinue_win_prefix)) {
                  var basename = to_id.substring(this.ppar.autocontinue_win_prefix.length);
                  var win = this.util.findWindow(this.ppar.win_prefix + basename);
                  if (win != null) {
                        return win;
                  }
            }
            // Try replacing normal prefix with autocontinue prefix
            if (to_id.startsWith(this.ppar.win_prefix)) {
                  var basename = to_id.substring(this.ppar.win_prefix.length);
                  var win = this.util.findWindow(this.ppar.autocontinue_win_prefix + basename);
                  if (win != null) {
                        return win;
                  }
            }
      }
      return null;
}

ensureLightImageWindow(to_id, ext)
{
      console.writeln("ensureLightImageWindow " + to_id + ", ext " + ext);
      if (this.findWindowNoPrefixIf(to_id, this.global.run_auto_continue) == null
          && this.findWindowAutoContinuePrefix(to_id, this.global.run_auto_continue) == null
          && this.findWindowNoPrefixIf(to_id + ext, this.global.run_auto_continue) == null)
      {
            this.util.closeTempWindows();
            this.printMissingNarrowbandMappingError();
            this.util.throwFatalError("Could not find image window " + to_id + " that is needed for PixelMath mapping");
      }
}

/* Replace tag "from" with real image name "to" with "ext" added to the end (H -> Integration_H_map) . 
 * Images names listed in the mapping are put into images array without _map added (Integration_H).
 */
replaceMappingImageNamesExt(mapping, from, to, ext, images, check_allfilesarr)
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
                  this.ensureLightImages(from, check_allfilesarr);
            } else if (images != null) {
                  this.ensureLightImageWindow(to, ext);
                  this.add_missing_image(images, to);
            }
            return to + ext;
      }
      // loop until all occurrences are replaced
      console.writeln("replaceMappingImageNames scan " + mapping);
      for (var i = mapping.length; i > 0; i--) {
            // console.writeln("replaceMappingImageNames scan " + mapping);
            for (var n = 0; n < mapping.length; n++) {
                  if (mapping.substring(n, n+1) == from) {
                        var replace = true;
                        if (n > 0 && this.isVariableChar(mapping.substring(n-1, n))) {
                              // nothing to replace
                              //console.writeln("replaceMappingImageNames letter before " + from);
                              replace = false;
                        } else if (n < mapping.length-1 && this.isVariableChar(mapping.substring(n+1, n+2))) {
                              // nothing to replace
                              //console.writeln("replaceMappingImageNames letter after " + from);
                              replace = false;
                        }
                        if (replace) {
                              if (check_allfilesarr != null) {
                                    this.ensureLightImages(from, check_allfilesarr);
                              } else if (images != null) {
                                    var to_id = to;
                                    this.ensureLightImageWindow(to_id, ext);
                                    this.add_missing_image(images, to_id);
                              }
                              mapping = mapping.substring(0, n) + to + ext + mapping.substring(n+1);
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

/* Replace tag "from" with real image name "to" with _map added to the end (H -> Integration_H_map) . 
 * Images names listed in the mapping are put into images array without _map added (Integration_H).
 */
replaceMappingImageNames(mapping, from, to, images, check_allfilesarr)
{
      var new_mapping = this.replaceMappingImageNamesExt(mapping.mapping, from, to, "_map", images, check_allfilesarr);
      if (new_mapping != mapping.mapping) {
            // We added filter "from" to the mapping
            mapping.filters += from;
      }
      mapping.mapping = new_mapping;
      return mapping;
}

/* Get custom channel mapping and replace target images with real names.
 * Tag is changed to a real image name with _map added to the end (H -> Integration_H_map) . 
 * Image names listed in the mapping are put into images array without _map added (Integration_H).
 */
mapCustomAndReplaceImageNames(targetChannel, images, check_allfilesarr)
{
      switch (targetChannel) {
            case 'R':
                  if (this.local_R_mapping == 'Auto') {
                        this.util.throwFatalError("Cannot use 'Auto' mapping for R channel");
                  }
                  var mapping = { mapping: this.local_R_mapping, filters: "" };
                  break;
            case 'G':
                  if (this.local_G_mapping == 'Auto') {
                        this.util.throwFatalError("Cannot use 'Auto' mapping for G channel");
                  }
                  var mapping = { mapping: this.local_G_mapping, filters: "" };
                  break;
            case 'B':
                  if (this.local_B_mapping == 'Auto') {
                        this.util.throwFatalError("Cannot use 'Auto' mapping for B channel");
                  }
                  var mapping = { mapping: this.local_B_mapping, filters: "" };
                  break;
            case 'L':
                  if (this.local_L_mapping == 'Auto') {
                        this.util.throwFatalError("Cannot use 'Auto' mapping for L channel");
                  }
                  var mapping = { mapping: this.local_L_mapping, filters: "" };
                  break;
            default:
                  console.writeln("ERROR: mapCustomAndReplaceImageNames " + targetChannel);
                  return null;
      }
      if (check_allfilesarr == null && !this.global.get_flowchart_data) {
            console.writeln("mapCustomAndReplaceImageNames " + targetChannel + " using " + mapping.mapping);
      }
      /* Replace letters with actual image identifiers. */
      mapping = this.replaceMappingImageNames(mapping, "L", this.ppar.win_prefix + "Integration_L", images, check_allfilesarr);
      mapping = this.replaceMappingImageNames(mapping, "R", this.ppar.win_prefix + "Integration_R", images, check_allfilesarr);
      mapping = this.replaceMappingImageNames(mapping, "G", this.ppar.win_prefix + "Integration_G", images, check_allfilesarr);
      mapping = this.replaceMappingImageNames(mapping, "B", this.ppar.win_prefix + "Integration_B", images, check_allfilesarr);
      mapping = this.replaceMappingImageNames(mapping, "H", this.ppar.win_prefix + "Integration_H", images, check_allfilesarr);
      mapping = this.replaceMappingImageNames(mapping, "S", this.ppar.win_prefix + "Integration_S", images, check_allfilesarr);
      mapping = this.replaceMappingImageNames(mapping, "O", this.ppar.win_prefix + "Integration_O", images, check_allfilesarr);

      if (check_allfilesarr == null && !this.global.get_flowchart_data) {
            console.writeln("mapCustomAndReplaceImageNames:converted mapping " + mapping.mapping + ", filters " + mapping.filters);
      }

      return mapping;
}

/* Run single expression PixelMath and optionally create new image. */
runPixelMathSingleMappingEx(id, reason, mapping, createNewImage, symbols, rescale, no_status_info, show_flowchart = true)
{
      if (!no_status_info) {
            this.util.addProcessingStepAndStatusInfo("Run PixelMath single mapping");
      }
      console.writeln("runPixelMathSingleMapping " + mapping);

      var idWin = this.util.findWindow(id);
      if (idWin == null) {
            console.writeln("ERROR: No reference window found for PixelMath");
      }

      if (createNewImage) {
            var targetFITSKeywords = this.getTargetFITSKeywordsForPixelmath(idWin);
      }
      if (reason != "from_lights") {
            var node = this.flowchart.flowchartOperation("PixelMath:" + reason);
      } else {
            var node = null;
      }

      this.util.printMemoryStatus("Before PixelMath " + reason);

      var P = new PixelMath;
      P.expression = mapping;
      if (symbols) {
            P.symbols = symbols;
      }
      P.createNewImage = createNewImage;
      P.showNewImage = false;
      P.newImageId = id + "_pm";
      if (rescale) {
            P.rescale = true;
      }

      idWin.mainView.beginProcess(UndoFlag.NoSwapFile);
      P.executeOn(idWin.mainView);
      idWin.mainView.endProcess();

      this.util.printMemoryStatus("After PixelMath " + reason);

      if (createNewImage) {
            var new_win = this.util.findWindow(P.newImageId);
            this.setTargetFITSKeywordsForPixelmath(new_win, targetFITSKeywords);
            if (this.global.pixinsight_version_num >= 1080902) {
                  new_win.copyAstrometricSolution(idWin);
            }
      } else {
            var new_win = idWin;
      }
      this.printAndSaveProcessValues(P, reason, idWin.mainView.id);
      this.engine_end_process(node, new_win, "PixelMath:" + reason, false);

      this.setAutoIntegrateVersionIfNeeded(this.util.findWindow(P.newImageId));

      this.util.printMemoryStatus("End runPixelMathSingleMappingEx");

      return P.newImageId;
}

/* Run single expression PixelMath and create new image. */
runPixelMathSingleMapping(id, reason, mapping)
{
      return this.runPixelMathSingleMappingEx(id, reason, mapping, true);
}

/* Run RGB channel combination using PixelMath. 
   If we have newId we create a new image. If newId is null we
   replace target image.
*/
runPixelMathRGBMapping(newId, idWin, mapping_R, mapping_G, mapping_B)
{
      this.util.addProcessingStepAndStatusInfo("Run PixelMath RGB mapping");
      console.writeln("runPixelMathRGBMapping R " + mapping_R + " G " + mapping_G + " B " + mapping_B);

      if (idWin == null) {
            console.writeln("ERROR: runPixelMathRGBMapping, no image window found for PixelMath");
      }

      if (newId != null) {
            var targetFITSKeywords = this.getTargetFITSKeywordsForPixelmath(idWin);
      }
      var channels_from_mappings = this.findChannelsFromMappings([mapping_R, mapping_G, mapping_B]);
      var node = this.flowchart.flowchartOperation("PixelMath:combine RGB" + channels_from_mappings);

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
      P.newImageColorSpace = PixelMath.RGB;
      P.newImageSampleFormat = PixelMath.SameAsTarget;

      idWin.mainView.beginProcess(UndoFlag.NoSwapFile);
      P.executeOn(idWin.mainView);
      idWin.mainView.endProcess();

      this.printAndSaveProcessValues(P, "RGB", idWin.mainView.id);
      if (newId != null) {
            var new_win = this.util.findWindow(newId);
      } else {
            var new_win = idWin;
      }
      if (newId != null) {
            this.setTargetFITSKeywordsForPixelmath(new_win, targetFITSKeywords);
            if (this.global.pixinsight_version_num >= 1080902) {
                  new_win.copyAstrometricSolution(idWin);
            }
      }
      this.engine_end_process(node, new_win, "PixelMath:combine RGB" + channels_from_mappings);

      this.setAutoIntegrateVersionIfNeeded(new_win);
      this.setImagetypKeyword(new_win, "Master light");

      return newId;
}

/* Run RGB channel combination using PixelMath. 
   We find reference image from existing images.
   We always create a new image.
*/
runPixelMathRGBMappingFindRef(newId, mapping_R, mapping_G, mapping_B, channels_from_mappings = null)
{
      this.util.addProcessingStepAndStatusInfo("Run PixelMath RGB mapping");

      var idWin = null;

      var reference_images = [ "Integration_H", "Integration_S", "Integration_O" ];

      for (var i = 0; i < reference_images.length && idWin == null; i++) {
            // Try to find idWin from reference images
            var refId = reference_images[i];
            refId = refId + "_map";
            idWin = this.findWindowCheckBaseNameIf(refId, this.global.run_auto_continue);
      }
      if (idWin == null) {
            console.writeln("ERROR: No reference window found for PixelMath");
      }
      if (channels_from_mappings == null) {
            // Find this.channels from mappings
            channels_from_mappings = this.findChannelsFromMappings([mapping_R, mapping_G, mapping_B]);
      }
      var node = this.flowchart.flowchartOperation("PixelMath:combine RGB" + channels_from_mappings);

      var targetFITSKeywords = this.getTargetFITSKeywordsForPixelmath(idWin);

      var P = new PixelMath;
      P.expression = mapping_R;
      P.expression1 = mapping_G;
      P.expression2 = mapping_B;
      P.useSingleExpression = false;
      P.showNewImage = true;
      P.createNewImage = true;
      P.newImageId = newId;
      P.newImageColorSpace = PixelMath.RGB;

      idWin.mainView.beginProcess(UndoFlag.NoSwapFile);
      P.executeOn(idWin.mainView);
      idWin.mainView.endProcess();

      this.printAndSaveProcessValues(P, "RGB", idWin.mainView.id);
      var new_win = this.util.findWindow(newId);
      if (this.global.pixinsight_version_num >= 1080902) {
            new_win.copyAstrometricSolution(idWin);
      }
      this.setTargetFITSKeywordsForPixelmath(new_win, targetFITSKeywords);
      this.engine_end_process(node, new_win, "PixelMath:combine RGB" + channels_from_mappings);

      this.setAutoIntegrateVersionIfNeeded(new_win);

      return newId;
}

linearFitArray(refimage, targetimages, add_to_flowchart = false)
{
      console.writeln("linearFitArray");
      if (add_to_flowchart) {
            var node = this.flowchart.flowchartOperation("LinearFit");
      } else {
            var node = null;
      }
      for (var i = 0; i < targetimages.length; i++) {
            if (targetimages[i] != null && targetimages[i] != refimage) {
                  this.linearFitImage(refimage, targetimages[i]);
            }
      }
      this.engine_end_process(node, null, "", false);
}

arrayFindImage(images, image)
{
      for (var i = 0; i < images.length; i++) {
            if (images[i] == image) {
                  return true;
            }
      }
      return false;
}

arrayAppendCheckDuplicates(images, appimages)
{
      for (var i = 0; i < appimages.length; i++) {
            if (!this.arrayFindImage(images, appimages[i])) {
                  images[images.length] = appimages[i];
            }
      }
}

findReferenceImageForLinearFit(images, suggestion)
{
      var refimage = null;
      var refvalue = null;
      console.writeln("findReferenceImageForLinearFit: suggestion " + suggestion);
      if (suggestion == "Min") {
            for (var i = 0; i < images.length; i++) {
                  if (images[i] == null) {
                        // For example Luminance may be missing sometimes
                        continue;
                  }
                  var win = ImageWindow.windowById(images[i]);
                  var current_value = win.mainView.computeOrFetchProperty("Median").at(0);
                  console.writeln("findReferenceImageForLinearFit " + images[i] + " " + current_value);
                  if (refimage == null || current_value < refvalue) {
                        refimage = images[i];
                        refvalue = current_value;
                  }
            }
      } else if (suggestion == "Max") {
            for (var i = 0; i < images.length; i++) {
                  if (images[i] == null) {
                        // For example Luminance may be missing sometimes
                        continue;
                  }
                  var win = ImageWindow.windowById(images[i]);
                  var current_value = win.mainView.computeOrFetchProperty("Median").at(0);
                  console.writeln("findReferenceImageForLinearFit " + images[i] + " " + current_value);
                  if (refimage == null || current_value > refvalue) {
                        refimage = images[i];
                        refvalue = current_value;
                  }
            }
      } else {
            this.util.throwFatalError("Unknown linear fit reference image suggestion " + suggestion);
      }
      console.writeln("findReferenceImageForLinearFit: refimage " + refimage);
      return refimage;
}

findLinearFitHSOMapRefimage(images, suggestion)
{
      var refimage;
      console.writeln("findLinearFitHSOMapRefimage");
      if (suggestion == "Auto") {
            suggestion = "Min";
      }
      if (suggestion == "Min" || suggestion == "Max") {
            refimage = this.findReferenceImageForLinearFit(images, suggestion);
      } else {
            refimage = this.ppar.win_prefix + "Integration_" + suggestion + "_map";
            if (this.arrayFindImage(images, refimage)) {
                  return(refimage);
            }
            this.util.throwFatalError("Could not find linear fit reference image " + suggestion);
      }
      // Just pick something
      return(images[0]);
}

remove_stars_for_RGB_stars()
{
      let is_some_remove_stars_option = this.par.remove_stars_channel.val
                                        || this.par.remove_stars_before_stretch.val
                                        || this.par.remove_stars_stretched.val
                                        || this.par.remove_stars_light.val;

      
      return this.local_RGB_stars && !is_some_remove_stars_option;
}

/* Process channel image for channel specific steps.
 * This is called from:
 *    this.mapLRGBchannels for normal LRGB images
 *    this.mapRGBchannel when mixing LRGB and narrowband
 *    customMapping for narrowband images
 */
processChannelImage(image_id, is_luminance)
{
      console.writeln("processChannelImage " + image_id);
      if (image_id == null) {
            // could be true for luminance
            return;
      }
      if (this.par.GC_before_channel_combination.val) {
            if (this.par.smoothbackground.val > 0) {
                  this.smoothBackgroundBeforeGC(image_id, this.par.smoothbackground.val, true);
            }
            // Optionally do GC on channel images
            this.runGradientCorrectionBeforeChannelCombination(image_id);
      }

      if (this.par.remove_stars_channel.val) {
            // Remove stars from channel images
            if (is_luminance) {
                  this.removeStars(this.util.findWindow(image_id), true, false, null, null, this.par.unscreen_stars.val);
            } else {
                  // For RGB this.channels we collect stars images into this.RGB_stars_channel_ids
                  this.removeStars(this.util.findWindow(image_id), true, true, this.RGB_stars_channel_ids, null, this.par.unscreen_stars.val);
            }
      }
}

findChannelFromName3(name)
{
      if (name.endsWith("_R")) {
            return 'R';
      } else if (name.endsWith("_G")) {
            return 'G';
      } else if (name.endsWith("_B")) {
            return 'B';
      } else if (name.endsWith("_H")) {
            return 'H';
      } else if (name.endsWith("_S")) {
            return 'S';
      } else if (name.endsWith("_O")) {
            return 'O';
      } else if (name.endsWith("_C")) {
            return 'C';
      } else if (name.endsWith("_L")) {
            return 'L';
      } else {
            console.writeln("findChannelFromName, unknown channel " + name);
            return name;
      }

}
findChannelFromName2(name)
{
      if (name.indexOf("_R_") != -1) {
            return 'R';
      } else if (name.indexOf("_G_") != -1) {
            return 'G';
      } else if (name.indexOf("_B_") != -1) {
            return 'B';
      } else if (name.indexOf("_H_") != -1) {
            return 'H';
      } else if (name.indexOf("_S_") != -1) {
            return 'S';
      } else if (name.indexOf("_O_") != -1) {
            return 'O';
      } else if (name.indexOf("_C_") != -1) {
            return 'C';
      } else if (name.indexOf("_L_") != -1) {
            return 'L';
      } else {
            return this.findChannelFromName3(name);
      }
}

findChannelFromName(name)
{
      if (name.indexOf("_R_map") != -1) {
            return 'R';
      } else if (name.indexOf("_G_map") != -1) {
            return 'G';
      } else if (name.indexOf("_B_map") != -1) {
            return 'B';
      } else if (name.indexOf("_H_map") != -1) {
            return 'H';
      } else if (name.indexOf("_S_map") != -1) {
            return 'S';
      } else if (name.indexOf("_O_map") != -1) {
            return 'O';
      } else if (name.indexOf("_C_map") != -1) {
            return 'C';
      } else if (name.indexOf("_L_map") != -1) {
            return 'L';
      } else {
            return this.findChannelFromName2(name);
      }
}

findChannelFromNameIf(name)
{
      var ch = this.findChannelFromName(name);
      if (ch == name) {
            if (name.indexOf("RGB") != -1) {
                  return 'RGB';
            } else {
                  return name;
            }
      } else {
            return ch;
      }
}


findChannelsFromOneMapping(onemapping)
{
      // Split onemapping text to image names
      // Then for each image name find onemapping and discard duplicates
      console.writeln("findChannelsFromOneMapping: " + onemapping);
      var image_names = onemapping.split(", +");
      var unique_names = [];
      for (var i = 0; i < image_names.length; i++) {
            console.writeln("findChannelsFromOneMapping, image name " + image_names[i]);
            var name = image_names[i].trim();
            var channel = this.findChannelFromName(name);
            if (channel != null && unique_names.indexOf(channel) == -1) {
                  unique_names.push(channel);
            }
      }
      console.writeln("findChannelsFromOneMapping, unique names " + unique_names);
      return unique_names;
}

// Find this.channels from narrowband mappings
// We assume that mappings are in channel order R, G, B
// If all R, G and B this.channels are found in narrowband mappings
// we return the palette name, otherwise we return this.channels as text
// Note that the returnd text has a spece added at the beginning if
// a non-empty text is returned.
findChannelsFromMappings(mappings)
{
      console.writeln("findChannelsFromMappings, mappings " + mappings);

      if (mappings.length == 3) {
            // First check is mappings this.channels mach to predined mappings in this.global.narrowBandPalettes
            // We assume that mappings are in channel order R, G, B
            for (var j = 0; j < this.global.narrowBandPalettes.length; j++) {
                  if (mappings[0] == this.global.narrowBandPalettes[j].R 
                      && mappings[1] == this.global.narrowBandPalettes[j].G
                      && mappings[2] == this.global.narrowBandPalettes[j].B) 
                  {
                        // We have a match, use the palette name
                        console.writeln("findChannelsFromMappings, found narrowband palette " + this.global.narrowBandPalettes[j].name);
                        return ' ' + this.global.narrowBandPalettes[j].name;
                  }
            }
      }

      // Find invidual this.channels from mapping text.
      this.channels = [];
      for (var i = 0; i < mappings.length; i++) {
            // Find this.channels from single mapping and save new ones to this.channels
            var unique_names = this.findChannelsFromOneMapping(mappings[i]);
            for (var j = 0; j < unique_names.length; j++) {
                  if (unique_names[j] != null && this.channels.indexOf(unique_names[j]) == -1) {
                        this.channels.push(unique_names[j]);
                  }
            }
      }
      if (this.channels.length == 0) {
            console.writeln("findChannelsFromMappings, no valid channels found");
            return "";
      } else {
            // Return channels as text
            return ' (channels:' + this.channels.join(",") + ')';
      }
}


/* Copy images with _map name so we do not change the original
 * images (Integration_H -> Integration_H_map).
 */
copyToMapImages(images)
{
      console.writeln("copyToMapImages");
      var update_preview = false;
      for (var i = 0; i < images.length; i++) {
            if (this.ppar.win_prefix != '' && images[i].startsWith(this.ppar.win_prefix)) {
                  var basename = images[i].substring(this.ppar.win_prefix.length);
            } else if (this.ppar.autocontinue_win_prefix != '' && images[i].startsWith(this.ppar.autocontinue_win_prefix)) {
                  var basename = images[i].substring(this.ppar.autocontinue_win_prefix.length);
            } else {
                  var basename = images[i];
            }
            if (basename.endsWith("_crop")) {
                  var copyname = this.util.ensure_win_prefix(this.util.replacePostfixOrAppend(basename, ["_crop"], "_map"));
            } else {
                  var copyname = this.util.ensure_win_prefix(basename + "_map");
            }
            if (!copyname.endsWith("_map")) {
                  this.util.throwFatalError("copyToMapImages bad copyname " + copyname);
            }
            if (this.util.findWindow(copyname) == null) {
                  if (!this.global.get_flowchart_data) {
                        console.writeln("copy from " + images[i] + " to " + copyname);
                  }
                  var imgWin = this.util.copyWindow(
                                    this.findWindowNoPrefixIf(images[i], this.global.run_auto_continue), 
                                    copyname);
                  this.global.temporary_windows[this.global.temporary_windows.length] = copyname;
                  if (this.par.fast_mode.val) {
                        var binning = this.getFastModeBinning(imgWin);
                        if (binning > 1) {
                              console.writeln("copyToMapImages, binning " + binning + " for " + copyname);
                              this.runBinning(imgWin, binning);
                              // Update preview to a smaller image
                              update_preview = true;
                        }
                  }
            } else {
                  console.writeln("map image " + copyname + " already copied");
            }
            images[i] = copyname;
      }
      if (update_preview) {
            // Try to find image with "_L_" or "_H_" in the name
            for (var i = 0; i < images.length; i++) {
                  if (images[i].indexOf("_L_") != -1 || images[i].indexOf("_H_") != -1) {
                        this.guiUpdatePreviewId(images[i]);
                        update_preview = false;
                        break;
                  }
            }
            if (update_preview) {
                  // Update preview to the first image
                  this.guiUpdatePreviewId(images[0]);
            }
      }
}

copyOneProcessedToMapImage(id)
{
      if (id == null) {
            return null;
      }

      var copyname = this.util.ensure_win_prefix(this.util.replacePostfixOrAppend(id, ["_processed"], "_map"));

      this.util.copyWindow(this.util.findWindow(id), copyname);
      this.global.temporary_windows[this.global.temporary_windows.length] = copyname;

      return copyname;
}

copyProcessedToMapImages(images)
{
      var copied_images = [];
      for (var i = 0; i < images.length; i++) {
            copied_images[i] = this.copyOneProcessedToMapImage(images[i]);
      }
      return copied_images;
}

mapRGBchannel(images, refimage, mapping, is_luminance, name)
{
      console.writeln("mapRGBchannel, refimage " + refimage + ", mapping " + mapping);
      // Copy files to _map names to avoid changing original files.
      // We close these images at the end as next call may want to use the
      // same image names.

      this.flowchart.flowchartChildBegin(name);

      this.copyToMapImages(images);

      if (images.length > 1) {
            // we have multiple this.channels in images array
            this.flowchart.flowchartParentBegin(name);
      }

      for (var i = 0; i < images.length; i++) {
            if (images.length > 1) {
                  this.flowchart.flowchartChildBegin(this.findChannelFromName(images[i]));
            }
            this.cropImageIf(images[i]);
            this.processChannelImage(images[i], is_luminance);
            if (images.length > 1) {
                  this.flowchart.flowchartChildEnd(this.findChannelFromName(images[i]));
            }
      }

      if (images.length > 1) {
            this.flowchart.flowchartParentEnd(name);
      }

      refimage = refimage + "_map";
      console.writeln("mapRGBchannel, new refimage " + refimage);
      if (this.util.findWindow(refimage) == null) {
            refimage = images[0];
            console.writeln("mapRGBchannel, refimage from images[0] " + refimage);
      }
      if (images.length > 1) {
            // Run linear fit to match images before PixelMath
            // This done for each channel to match images before PixelMath
            var node = this.flowchart.flowchartOperation("LinearFit");
            this.linearFitArray(refimage, images);
            this.copyLinearFitReferenceImage(refimage);
            this.engine_end_process(node);
      }
      // create combined image
      var target_image = this.runPixelMathSingleMapping(refimage, "map " + name, mapping);

      // close all copied images as we may want use the same names in the next RGB round
      this.util.closeAllWindowsFromArray(images);

      this.flowchart.flowchartChildEnd(name);

      return target_image;
}

checkNoiseReduction(image, phase)
{
      let noise_reduction = false;

      if (this.par.skip_noise_reduction.val) {
            console.writeln("checkNoiseReduction, " + image + ", " + phase, ", skip noise_reduction");
            return false;
      }
      switch (image) {
            case 'L':
                  if (this.is_color_files) {
                        this.save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
                        this.util.throwFatalError("checkNoiseReduction bad combination, L+color/OSC");
                  }
                  if (this.par.luminance_noise_reduction_strength.val == 0) {
                        console.writeln("checkNoiseReduction, " + image + ", " + phase, ", luminance_noise_reduction_strength == 0");
                        return false;
                  }
                  switch (phase) {
                        case 'channel':
                              noise_reduction = this.par.channel_noise_reduction.val ||
                                                (this.par.auto_noise_reduction.val && 
                                                      (!this.par.use_blurxterminator.val && !this.par.use_graxpert_deconvolution.val));
                              break;
                        case 'combined':
                              noise_reduction = this.par.combined_image_noise_reduction.val;
                              break;
                        case 'processed':
                              noise_reduction = this.par.processed_image_noise_reduction.val ||
                                                (this.par.auto_noise_reduction.val && 
                                                      (this.par.use_blurxterminator.val || this.par.use_graxpert_deconvolution.val));
                              break;
                        case 'nonlinear':
                              noise_reduction = this.par.non_linear_noise_reduction.val;
                              break;
                        default:
                              this.util.throwFatalError("checkNoiseReduction bad phase '" + phase + "' for " + image + " image");
                  }
                  break;
            case 'RGB':
                  if (this.is_color_files) {
                        this.save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
                        this.util.throwFatalError("checkNoiseReduction bad combination, RGB+color/OSC");
                  }
                  if (this.par.noise_reduction_strength.val == 0) {
                        console.writeln("checkNoiseReduction, " + image + ", " + phase, ", noise_reduction_strength == 0");
                        return false;
                  }
                  switch (phase) {
                        case 'channel':
                              if (this.par.channel_noise_reduction.val) {
                                    noise_reduction = true;
                              } else if (this.par.auto_noise_reduction.val) {
                                    // Auto select noise reduction
                                    if (this.par.use_blurxterminator.val || this.par.use_graxpert_deconvolution.val) {
                                          // Skip noise reduction on channel images if BlurXterminator is used
                                          noise_reduction = false;
                                    } else {
                                          // Do noise reduction on channel images if BlurXterminator is not used
                                          noise_reduction = true;
                                    }
                              }
                              break;
                        case 'combined':
                              noise_reduction = this.par.combined_image_noise_reduction.val;
                              break;
                        case 'processed':
                              if (this.par.processed_image_noise_reduction.val) {
                                    noise_reduction = true;
                              } else if (this.par.auto_noise_reduction.val) {
                                    // Auto select noise reduction
                                    if (this.par.use_blurxterminator.val || this.par.use_graxpert_deconvolution.val) {
                                          // Do noise reduction on combined images if BlurXterminator is used
                                          noise_reduction = true;
                                    } else {
                                          // Skip noise reduction on combined images if BlurXterminator is not used
                                          noise_reduction = false;
                                    }
                              }
                              break;
                        case 'nonlinear':
                              noise_reduction = this.par.non_linear_noise_reduction.val;
                              break;
                        default:
                              this.save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
                              this.util.throwFatalError("checkNoiseReduction bad phase '" + phase + "' for " + image + " image");
                  }
                  break;
            case 'color':
                  if (!this.is_color_files) {
                        this.save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
                        this.util.throwFatalError("checkNoiseReduction bad combination, color/OSC and nor color files");
                  }
                  if (this.par.noise_reduction_strength.val == 0) {
                        console.writeln("checkNoiseReduction, " + image + ", " + phase, ", noise_reduction_strength == 0");
                        return false;
                  }
                  switch (phase) {
                        case 'combined':
                              noise_reduction = this.par.combined_image_noise_reduction.val;
                              break;
                        case 'processed':
                              noise_reduction = this.par.processed_image_noise_reduction.val || this.par.auto_noise_reduction.val;
                              break;
                        case 'nonlinear':
                              noise_reduction = this.par.non_linear_noise_reduction.val;
                              break;
                        default:
                              this.save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
                              this.util.throwFatalError("checkNoiseReduction bad phase '" + phase + "' for " + image + " image");
                  }
                  break;
            default:
                  this.util.throwFatalError("checkNoiseReduction bad parameters, image " + image + ", phase " + phase);
      }
      console.writeln("checkNoiseReduction, " + image + ", " + phase, ", noise_reduction " + noise_reduction);
      return noise_reduction;
}

luminanceNoiseReduction(imgWin, maskWin)
{
      if (imgWin == null) {
            return;
      }

      this.util.addProcessingStepAndStatusInfo("Reduce noise on luminance image " + imgWin.mainView.id);

      if (maskWin == null && !(this.par.use_noisexterminator.val || this.par.use_graxpert_denoise.val || this.par.use_deepsnr.val)) {
            /* Create a temporary mask. */
            var temp_mask_win = this.createNewTempMaskFromLinearWin(imgWin, false);
            maskWin = temp_mask_win;
      } else {
            var temp_mask_win = null;
      }

      this.runNoiseReductionEx(imgWin, maskWin, this.par.luminance_noise_reduction_strength.val, true);
      this.guiUpdatePreviewWin(imgWin);

      if (temp_mask_win != null) {
            this.util.closeOneWindow(temp_mask_win);
      }
}

channelNoiseReduction(image_id)
{
      this.util.addProcessingStepAndStatusInfo("Reduce noise on channel image " + image_id);

      var image_win = this.util.findWindow(image_id);

      if (!(this.par.use_noisexterminator.val || this.par.use_graxpert_denoise.val || this.par.use_deepsnr.val)) {
            /* Create a temporary mask. */
            var temp_mask_win = this.createNewTempMaskFromLinearWin(image_win, false);
      } else {
            var temp_mask_win = null;
      }

      this.runNoiseReductionEx(image_win, temp_mask_win, this.par.noise_reduction_strength.val, true);

      this.guiUpdatePreviewWin(image_win);

      if (temp_mask_win != null) {
            this.util.closeOneWindow(temp_mask_win);
      }
}

createNewStarXTerminator(star_mask, linear_data, from_lights, use_unscreen)
{
      if (this.global.get_flowchart_data) {
            return {};
      }
      var node = null;
      try {
            console.writeln("createNewStarXTerminator, linear_data " + linear_data + ", star_mask "+ star_mask + ", use_unscreen " + use_unscreen);
            var P = new StarXTerminator;
            // P.linear = linear_data;    Not needed in v2.0.0
            P.stars = star_mask;
            if (this.par.starxterminator_ai_model.val != "") {
                  console.writeln("createNewStarXTerminator, AI model " + this.par.starxterminator_ai_model.val);
                  P.ai_file = this.par.starxterminator_ai_model.val;
            } else {
                  console.writeln("createNewStarXTerminator, default AI model " + P.ai_file);
            }
            if (this.par.starxterminator_large_overlap.val) {
                  console.writeln("createNewStarXTerminator, large overlap");
                  P.overlap = 0.50;
            }
            if (use_unscreen) {
                  P.unscreen = true;
            } else {
                  P.unscreen = false;
            }
            this.engine_end_process(node);
      } catch(err) {
            this.save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
            console.criticalln("StarXTerminator failed");
            console.criticalln(err);
            this.util.addProcessingStep("Maybe StarXTerminator is not installed, AI is missing or platform is not supported");
            this.util.throwFatalError("StarXTerminator failed");
      }
      return P;
}

createNewStarNet2(star_mask, from_lights)
{
      if (this.global.get_flowchart_data) {
            return {};
      }
      var node = null;
      try {
            var P = new StarNet2;
            P.mask = star_mask;
            this.engine_end_process(node);
      } catch(err) {
            this.save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
            console.criticalln("StarNet2 failed");
            console.criticalln(err);
            this.util.addProcessingStep("Maybe StarNet2 is not installed, weight files are missing or platform is not supported");
            this.util.throwFatalError("StarNet2 failed");
      }
      return P;
}

getStarMaskWin(imgWin, name)
{
      if (this.par.use_starxterminator.val) {
            var win_id = imgWin.mainView.id + "_stars";
            var win = this.util.findWindow(win_id);
            console.writeln("getStarMaskWin win_id " + win_id);
            if (win == null) {
                  this.save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
                  this.util.throwFatalError("Could not find StarXTerminator stars window " + win_id);
            }
            this.util.windowRename(win_id, name);
      } else {
            console.writeln("getStarMaskWin win_id " + ImageWindow.activeWindow.mainView.id);
            var win = ImageWindow.activeWindow;
            this.util.windowRename(win.mainView.id, name);
      }
      console.writeln("getStarMaskWin completed " + name);
      return win;
}

// Remove stars from an image. We save star mask for later processing and combining
// for star image.
removeStars(imgWin, linear_data, save_stars, save_array, stars_image_name, use_unscreen, from_lights)
{
      if (linear_data) {
            this.util.addProcessingStepAndStatusInfo("Remove stars from linear image " + imgWin.mainView.id);
      } else {
            this.util.addProcessingStepAndStatusInfo("Remove stars from non-linear image " + imgWin.mainView.id);
      }
      if (this.par.use_starxterminator.val) {
            var process_name = "StarXTerminator";
      } else if (this.par.use_starnet2.val) {
            var process_name = "StarNet2";
      } else {
            this.save_images_in_save_id_list(); // Save images so we can return with AutoContinue
            this.util.throwFatalError("StarNet2 or StarXTerminator must be selected to remove stars.");
      }

      if (!from_lights) {
            var node = this.flowchart.flowchartOperation(process_name);
      } else {
            var node = null;
      }

      if (linear_data && use_unscreen) {
            console.writeln("Not using unscreen for linear data");
      }

      var create_star_mask = save_stars;
      if (save_stars && use_unscreen && !this.par.use_starxterminator.val) {
            var originalwin_copy = this.util.copyWindow(imgWin, this.util.ensure_win_prefix(imgWin.mainView.id + "_tmp_original"));
            create_star_mask = false;
      }

      if (this.par.use_starxterminator.val) {
            this.util.addProcessingStep("Run StarXTerminator on " + imgWin.mainView.id);
            var P = this.createNewStarXTerminator(create_star_mask, linear_data, from_lights, use_unscreen);
      } else if (this.par.use_starnet2.val) {
            this.util.addProcessingStep("Run StarNet2 on " + imgWin.mainView.id);
            var P = this.createNewStarNet2(create_star_mask, from_lights);
      } else {
            this.save_images_in_save_id_list(); // Save images so we can return with AutoContinue
            this.util.throwFatalError("StarNet2 or StarXTerminator must be selected to remove stars.");
      }

      if (this.par.use_starnet2.val && linear_data) {
            var median = this.delinearizeImage(imgWin, from_lights ? "from_lights" : "delinearize");
      }

      if (!this.global.get_flowchart_data) {
            /* Execute on image.
             */
            imgWin.mainView.beginProcess(UndoFlag.NoSwapFile);

            var succp = P.executeOn(imgWin.mainView, false);
            
            imgWin.mainView.endProcess();
            this.printAndSaveProcessValues(P, "", imgWin.mainView.id);
      } else {
            var succp = true;
      }

      if (this.par.use_starnet2.val && linear_data) {
            this.relinearizeImage(imgWin, median, from_lights ? "from_lights" : "relinearize");
      }

      this.engine_end_process(node, imgWin, process_name);

      if (!succp) {
            this.save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
            this.util.throwFatalError("Failed to remove stars!");
      }

      if (this.par.use_starxterminator.val) {
            console.writeln("StarXTerminator completed");
      }

      this.util.setFITSKeyword(imgWin, "AutoIntegrateStarless", "true", "Starless image created by AutoIntegrate");

      if (this.global.get_flowchart_data) {
            if (save_stars) {
                  let new_id = this.flowchartNewImage(imgWin, imgWin.mainView.id + "_stars");
                  let new_win = this.util.findWindow(new_id);
                  this.util.setFITSKeyword(new_win, "AutoIntegrateStars", "true", "Stars image created by AutoIntegrate");
                  return new_win;
            } else {
                  return  null;
            }
      }

      this.guiUpdatePreviewWin(imgWin);

      if (save_stars) {
            if (stars_image_name == null) {
                  stars_image_name = imgWin.mainView.id + "_stars";
            }
            if (use_unscreen && !this.par.use_starxterminator.val) {
                  // Use unscreen method to get stars image as described by Russell Croman
                  console.writeln("removeStars use unscreen to get star image");
                  var id = this.runPixelMathSingleMappingEx(
                              imgWin.mainView.id,
                              "combine stars+starless",
                              "~((~" + originalwin_copy.mainView.id + ")/(~" + imgWin.mainView.id + "))",
                              true);
                  var star_win = this.util.findWindow(id);
                  console.writeln("removeStars, rename " + id + " to " + stars_image_name);
                  this.util.windowRename(id, stars_image_name);
                  this.util.closeOneWindow(originalwin_copy);
            } else {
                  var star_win = this.getStarMaskWin(imgWin, stars_image_name);
            }
            if (save_array != null && !this.global.get_flowchart_data) {
                  save_array[save_array.length] = star_win.mainView.id;
            }
            console.writeln("Removed stars from " + imgWin.mainView.id + " and created stars image " + star_win.mainView.id);
            this.util.setFITSKeyword(imgWin, "AutoIntegrateStars", "true", "Stars image created by AutoIntegrate");
            this.setAutoIntegrateVersionIfNeeded(star_win);
            this.setImagetypKeyword(star_win, "Master light");
            return star_win;
      } else {
            return null;
      }
}

removeStarsFromLights(fileNames)
{
      var newFileNames = [];
      var outputDir = this.global.outputRootDir + this.global.AutoOutputDir;
      var postfix = "_starless";
      var outputExtension = ".xisf";

      var node = this.flowchart.flowchartOperation("Remove stars");
      if (this.global.get_flowchart_data) {
            return fileNames;
      }

      for (var i = 0; i < fileNames.length; i++) {
            console.writeln("Remove stars from image " + fileNames[i]);

            // Open source image window from a file
            var imageWindows = ImageWindow.open(fileNames[i]);
            if (!imageWindows || imageWindows.length == 0) {
                  this.util.throwFatalError("*** removeStarsFromLights Error: imageWindows.length: " + imageWindows.length);
            }
            var imageWindow = imageWindows[0];
            if (imageWindow == null) {
                  this.util.throwFatalError("*** removeStarsFromLights Error: Can't read file: " + fileNames[i]);
            }

            this.removeStars(
                  imageWindow,      // imgWin
                  true,             // linear_data
                  false,            // save_stars
                  null,             // save_array
                  null,             // stars_image_name
                  false,            // use_unscreen
                  true);            // from_lights
            
            var filePath = this.generateNewFileName(fileNames[i], outputDir, postfix, outputExtension);

            // Save window
            console.writeln("Save starless image as " + filePath);
            if (!this.writeImage(filePath, imageWindow)) {
                  this.util.throwFatalError("*** removeStarsFromLights Error: Can't write output image: " + imageWindow.mainView.id + ", file: " + filePath);
            }
            // Close window
            this.util.closeOneWindow(imageWindow);   

            newFileNames[newFileNames.length] = filePath;
      }
      console.writeln("removeStarsFromLights output[0] " + newFileNames[0]);
      this.engine_end_process(node);

      return newFileNames;
}

initSPCCvalues()
{
      if (this.par.use_spcc.val) {
            this.spcc_params.wavelengths = [ this.par.spcc_red_wavelength.val, this.par.spcc_green_wavelength.val, this.par.spcc_blue_wavelength.val ];
            this.spcc_params.bandhwidths = [ this.par.spcc_red_bandwidth.val, this.par.spcc_green_bandwidth.val, this.par.spcc_blue_bandwidth.val ];
            this.spcc_params.white_reference = this.par.spcc_white_reference.val;
            this.spcc_params.narrowband_mode = this.par.spcc_narrowband_mode.val;
      } else {
            this.spcc_params.wavelengths = [ ];
            this.spcc_params.bandhwidths = [ ];
            this.spcc_params.white_reference = "";
            this.spcc_params.narrowband_mode = false;
      }
}

// Return default Wavelength and BandWidth for SPCC
// We use Astrodon LRGB 2GEN filter values
getSPCCWavelengthBandWidth(filter, channel)
{
      if (filter.indexOf('H') != -1) {
            // There is H filter
            if (channel == 'R') {
                  this.H_in_R_channel = true;
            }
            return [ 656.30, 3];
      } else if (filter.indexOf('O') != -1) {
            // There is O filter
            return [ 500.70, 3];
      } else if (filter.indexOf('S') != -1) {
            // There is S filter
            return [ 671.60, 3];
      } else {
            return null;
      }
}

mapSPCCAutoNarrowband(is_RGB)
{
      if (!this.par.use_spcc.val || 
          this.par.skip_color_calibration.val ||
          !this.par.spcc_auto_narrowband) 
      {
            return;
      }
      if (this.process_narrowband && !is_RGB) {
            this.spcc_params.narrowband_mode = true;
            console.writeln("SPCC auto narrowband using SPCC narrowband mode");
            this.spcc_params.white_reference = "Photon Flux";
      } else {
            this.spcc_params.narrowband_mode = false;
            console.writeln("SPCC narrowband auto mode not using SPCC narrowband mode");
            this.spcc_params.white_reference = "Average Spiral Galaxy";
      }
      console.writeln("SPCC auto narrowband using " + this.spcc_params.white_reference + " white reference");

      // We allow 'Auto' mapping for SPCC and use default values
      var values = this.getSPCCWavelengthBandWidth(this.local_R_mapping, 'R');
      if (values) {
            this.spcc_params.wavelengths[0] = values[0];
            this.spcc_params.bandhwidths[0] = values[1];
            console.writeln("SPCC auto narrowband for R mapping with filter " + this.local_R_mapping + " use wavelength " + values[0] + " and bandwidth " + values[1]);
      } else {
            console.writeln("SPCC auto narrowband for R mapping with filter " + this.local_R_mapping + " use default wavelength " + this.spcc_params.wavelengths[0] + " and default bandwidth " + this.spcc_params.bandhwidths[0]);
      }
      var values = this.getSPCCWavelengthBandWidth(this.local_G_mapping, 'G');
      if (values) {
            this.spcc_params.wavelengths[1] = values[0];
            this.spcc_params.bandhwidths[1] = values[1];
            console.writeln("SPCC auto narrowband for G mapping with filter " + this.local_G_mapping + " use wavelength " + values[0] + " and bandwidth " + values[1]);
      } else {
            console.writeln("SPCC auto narrowband for G mapping with filter " + this.local_G_mapping + " use default wavelength " + this.spcc_params.wavelengths[1] + " and default bandwidth " + this.spcc_params.bandhwidths[1]);
      }
      var values = this.getSPCCWavelengthBandWidth(this.local_B_mapping, 'B');
      if (values) {
            this.spcc_params.wavelengths[2] = values[0];
            this.spcc_params.bandhwidths[2] = values[1];
            console.writeln("SPCC auto narrowband for B mapping with filter " + this.local_B_mapping + " use wavelength " + values[0] + " and bandwidth " + values[1]);
      } else {
            console.writeln("SPCC auto narrowband for B mapping with filter " + this.local_B_mapping + " use default wavelength " + this.spcc_params.wavelengths[2] + " and default bandwidth " + this.spcc_params.bandhwidths[2]);
      }
}

// basename should not have an extension
save_id_as_xisf_and_tif(id, basename)
{
      if (this.global.get_flowchart_data) {
            return;
      }

      // Find source window
      var image_win = this.util.findWindow(id);
      if (image_win == null) {
            this.util.throwFatalError("save_id_as_xisf_and_tif:could not find image " + id);
      }

      // Copy image to temporary name
      console.writeln("save_id_as_xisf_and_tif, copy image " + id);
      image_win = this.util.copyWindow(image_win, id + "_tmp");

      var filePath = this.util.combinePath(this.global.outputRootDir, this.global.AutoProcessedDir);
      filePath = this.util.ensurePathEndSlash(filePath) + basename;

      // Save as .xisf
      console.writeln("createStarlessChannelImages, save starless image " + filePath + ".xisf");
      if (!image_win.saveAs(filePath + ".xisf", false, false, false, false)) {
            this.util.throwFatalError("createStarlessChannelImages:failed to save image: " + filePath + ".xisf");
      }
      
      // Save as .tif
      console.writeln("createStarlessChannelImages, save starless image " + filePath + ".tif");
      if (image_win.bitsPerSample != 16) {
            console.writeln("createStarlessChannelImages:set bits to 16");
            image_win.setSampleFormat(16, false);
      }
      if (!image_win.saveAs(filePath + ".tif", false, false, false, false)) {
            this.util.throwFatalError("createStarlessChannelImages:failed to save image: " + filePath + ".tif");
      }

      this.util.closeOneWindow(image_win);
}

// Stretch channel images, remove stars and save images
// Called when this.par.save_stretched_starless_channel_images.val is true
createStarlessChannelImages(images, basenames = null)
{
      this.flowchart.flowchartParentBegin("Starless channels");

      if (basenames == null) {
            basenames = images;
      }

      for (var i = 0; i < images.length; i++) {
            this.flowchart.flowchartChildBegin(this.findChannelFromName(basenames[i]));

            var id = images[i];
            console.writeln("createStarlessChannelImages, image " + id);
            var image_win = this.util.findWindow(id);
            if (image_win == null) {
                  this.save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
                  this.util.throwFatalError("createStarlessChannelImages:could not find image " + id);
            }

            // Copy image to temporary name
            var copy_id = id + "_tmp";
            console.writeln("createStarlessChannelImages, copy image " + images[i]);
            image_win = this.util.copyWindow(image_win, copy_id);
            
            // Stretch image
            image_win = this.runHistogramTransform(image_win, false, 'channel');

            // Remove stars
            this.removeStars(image_win, false, false, null, null, false, false);

            // Rename starless image
            var new_name = this.util.ensure_win_prefix(basenames[i].replace(/_map.*/g, "_processed") + "_starless")
            console.writeln("createStarlessChannelImages, rename image " + image_win.mainView.id + " to " + new_name);
            image_win.mainView.id = new_name;

            if (this.par.stretched_channel_auto_contrast.val) {
                  this.autoContrast(image_win, 0.1, 100);
            }

            // Save image in .xisf and .tif format
            this.save_id_as_xisf_and_tif(image_win.mainView.id, image_win.mainView.id);

            this.global.processed_channel_images[this.global.processed_channel_images.length] = image_win.mainView.id;

            if (copy_id != image_win.mainView.id) {
                  this.util.closeOneWindowById(copy_id);
            }

            this.flowchart.flowchartChildEnd(this.findChannelFromName(basenames[i]));
      }
      this.flowchart.flowchartParentEnd("Starless channels");
}

createStarsImageFromFinalImage(id)
{
      var starless_name = id + "_stars";
      var image_win = this.util.findWindow(starless_name);
      if (image_win != null) {
            // We already have starless image
            console.writeln("createStarsImageFromFinalImage, already stars image " + id);
            return;
      }

      console.writeln("createStarsImageFromFinalImage, image " + id);

      // Create temporary copy of image
      var image_win = this.util.findWindow(id);
      image_win = this.util.copyWindow(image_win, id + "_tmp");

      // Create starless image
      var stars_win = this.removeStars(image_win, false, true, null, null, true, false);

      if (stars_win != null) {
            stars_win.mainView.id = starless_name;

            // Save stars image in .xisf and .tif format
            this.save_id_as_xisf_and_tif(stars_win.mainView.id, starless_name);

            // Add to channel images as this is often used with channel images
            this.global.processed_channel_images[this.global.processed_channel_images.length] = starless_name;
      } else {
            if (!this.global.get_flowchart_data) {
                  this.util.throwFatalError("createStarsImageFromFinalImage:failed to create stars image " + id);
            }
      }

      if (!this.global.get_flowchart_data) {
            this.guiUpdatePreviewWin(this.util.findWindow(id)); // Undo preview update from this.removeStars
      }

      this.util.closeOneWindow(image_win);
}

// Extract this.channels to separate images and save stretched starless images
// Called when this.par.save_stretched_starless_channel_images.val is true
extractChannelsAndSaveStarlessImages(RGB_win_id)
{
      let channels = [ "R", "G", "B" ];
      let images = [];
      this.flowchart.flowchartParentBegin("Extract channels");
      for (var i = 0; i < channels.length; i++) {
            this.flowchart.flowchartChildBegin(channels[i]);
            let id = this.extractRGBchannel(RGB_win_id, channels[i], false);
            images[images.length] = id;
            this.flowchart.flowchartChildEnd(channels[i]);
      }
      this.flowchart.flowchartParentEnd("Extract channels");

      this.createStarlessChannelImages(images, [ 'Integration_R_processed', 'Integration_G_processed', 'Integration_B_processed' ]);
      
      for (var i = 0; i < images.length; i++) {
            this.util.closeOneWindowById(images[i]);
      }
}

/* Do custom mapping of channels to RGB image. We do some of the same 
 * stuff here as in combineRGBimage.
 * We process one of the this.global.narrowBandPalettes here to
 * create narrowband mapping.
 * If filtered_lights != null we do not do any processing, just check
 * that all files exist.
 */
customMapping(RGBmapping, filtered_lights)
{
      if (filtered_lights != null) {
            this.util.addProcessingStep("Check custom mapping");
            this.is_rgb_files = filtered_lights.rgb;
            this.is_narrowband_files = filtered_lights.narrowband;
            var check_allfilesarr = filtered_lights.allfilesarr;
      } else {
            this.util.addProcessingStepAndStatusInfo("Custom mapping");
            var check_allfilesarr = null;
      }

      if (this.local_narrowband_mapping == 'Auto') {
            // Do auto mapping, we may get here without mapping
            // when using extract channels option.
            this.findAutoMappingForIntegratedImages(this.global.start_images.L_R_G_B);
      }

      /* Get updated mapping strings and collect images
       * used in mapping.
       */
      var mapping_L_images = [];
      var mapping_R_images = [];
      var mapping_G_images = [];
      var mapping_B_images = [];

      /* Get a modified mapping with tags replaced with real image names.
       */
      if (!this.process_narrowband && this.is_luminance_images) {
            var luminance_mapping = this.mapCustomAndReplaceImageNames('L', mapping_L_images, check_allfilesarr);
      }
      var red_mapping = this.mapCustomAndReplaceImageNames('R', mapping_R_images, check_allfilesarr);
      var green_mapping = this.mapCustomAndReplaceImageNames('G', mapping_G_images, check_allfilesarr);
      var blue_mapping = this.mapCustomAndReplaceImageNames('B', mapping_B_images, check_allfilesarr);

      if (check_allfilesarr != null) {
            /* Just checking that all files exist. */
            return null;
      }

      RGBmapping.channels_from_mappings = this.findChannelsFromMappings([this.local_R_mapping, this.local_G_mapping, this.local_B_mapping]);

      if (this.process_narrowband) {
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

            if (this.luminance_id == null) {
                  // Check for luminance image.
                  // We may already have copied this.L_id so we do it
                  // here only if it is not copied yet.
                  this.luminance_id = this.copyToMapIf(this.L_id);
                  this.cropImageIf(this.luminance_id);
            }

            /* Make a copy so we do not change the original integrated images.
             * Here we create image with _map added to the end 
             * (Integration_H -> Integration_H_map).
             */
            var images = [];

            this.arrayAppendCheckDuplicates(images, mapping_R_images);
            this.arrayAppendCheckDuplicates(images, mapping_G_images);
            this.arrayAppendCheckDuplicates(images, mapping_B_images);

            if (this.par.debug.val) console.writeln('customMapping: copyToMapImages(images)');
            this.copyToMapImages(images);

            if (this.par.debug.val) console.writeln('customMapping: flowchartParentBegin("Channels")');
            this.flowchart.flowchartParentBegin("Channels");
            for (var i = 0; i < images.length; i++) {
                  if (this.par.debug.val) console.writeln('customMapping: flowchartChildBegin(findChannelFromName(images[i]))');
                  this.flowchart.flowchartChildBegin(this.findChannelFromName(images[i]));

                  this.cropImageIf(images[i]);
                  this.processChannelImage(images[i], false);
                  
                  if (this.par.debug.val) console.writeln('customMapping: flowchartChildEnd(findChannelFromName(images[i]))');
                  this.flowchart.flowchartChildEnd(this.findChannelFromName(images[i]));
            }
            if (this.par.debug.val) console.writeln('customMapping: flowchartParentEnd("Channels")');
            this.flowchart.flowchartParentEnd("Channels");

            var narrowband_linear_fit = this.par.narrowband_linear_fit.val;
            if (narrowband_linear_fit == "Auto") {
                  /* By default we do not do linear fit
                   * if we stretch with Auto STF or Histogram stretch. 
                   * If we stretch with MaskedStretch we use linear
                   * fit to balance channels better.
                   */
                  if (this.local_image_stretching == 'Auto STF'
                        || this.local_image_stretching == 'Histogram stretch')
                  {
                        console.writeln("Narrowband linear fit is Auto and stretching is " + this.local_image_stretching + ", do not use linear fit.");
                        narrowband_linear_fit = "None";
                  } else {
                        console.writeln("Narrowband linear fit is Auto and stretching is " + this.local_image_stretching + ", use linear fit.");
                  }
            }

            // Narrowband mapping name is stored into this.local_narrowband_mapping
            // Some predefined mapping work best with linear data, some with stretched data.
            // For example Dynamic Foraxx palettes should be used with stretched data
            // so we check if we should use stretched data for mapping.

            if (this.useStretchedNarrowBandData(this.local_narrowband_mapping)) {
                  console.writeln("Narrowband mapping using stretched data with palette " + this.local_narrowband_mapping);
                  var mapping_on_nonlinear_data = true;
            } else {
                  var mapping_on_nonlinear_data = this.par.mapping_on_nonlinear_data.val;
            }

            if (narrowband_linear_fit != "None") {
                  /* Do a linear fit of images before PixelMath and before possible
                  * stretching. We do this on both cases, linear and stretched.
                  */
                  var refimage = this.findLinearFitHSOMapRefimage(images, narrowband_linear_fit);
                  this.util.addProcessingStep("Linear fit using " + refimage);
                  this.linearFitArray(refimage, images, true);
                  this.copyLinearFitReferenceImage(refimage);
            }
            if (this.checkNoiseReduction('RGB', 'channel')) {
                  // Do noise reduction after linear fit.
                  this.flowchart.flowchartParentBegin("Channels");
                  for (var i = 0; i < images.length; i++) {
                        this.flowchart.flowchartChildBegin(this.findChannelFromName(images[i]));
                        this.channelNoiseReduction(images[i]);
                        this.flowchart.flowchartChildEnd(this.findChannelFromName(images[i]));
                  }
                  this.flowchart.flowchartParentEnd("Channels");
                  RGBmapping.channel_noise_reduction = true;
            }

            var bxt_run = false;
            if (!mapping_on_nonlinear_data) {
                  /* We run PixelMath using linear images. 
                   */
                  this.util.addProcessingStep("Custom mapping, linear narrowband images");
            } else {
                  /* Stretch images to non-linear before combining with PixelMath.
                   */
                  this.util.addProcessingStep("Custom mapping, stretched narrowband images");
                  if (this.par.remove_stars_before_stretch.val) {
                        this.save_images_in_save_id_list(); // Save images so we can return with AutoContinue
                        this.util.throwFatalError("Narrowband mapping using non-linear data is not compatible with Remove stars before stretch option.");
                  }
                  this.flowchart.flowchartParentBegin("Stretch channels");
                  for (var i = 0; i < images.length; i++) {
                        this.flowchart.flowchartChildBegin(this.findChannelFromName(images[i]));
                        if (!this.par.skip_sharpening.val) {
                               if (this.par.use_blurxterminator.val) {
                                    /* Run BlurXTerminator separately for each channel since
                                     * we want to run it on linear data.
                                     */
                                    this.runBlurXTerminator(ImageWindow.windowById(images[i]), false);
                                    bxt_run = true;
                               } else if (this.par.use_graxpert_deconvolution.val) {
                                    this.runGraXpertDeconvolution(ImageWindow.windowById(images[i]));
                              }
                        }
                        this.runHistogramTransform(this.util.findWindow(images[i]), false, this.findChannelFromName(images[i]));
                        this.flowchart.flowchartChildEnd(this.findChannelFromName(images[i]));
                  }
                  this.flowchart.flowchartParentEnd("Stretch channels");
                  RGBmapping.stretched = true;
            }

            if (this.par.bxt_correct_channels.val && !bxt_run && this.par.use_blurxterminator.val) {
                  // Run BlurXTerminator on all channels if we did not run it earlier
                  this.flowchart.flowchartParentBegin("Channels");
                  for (var i = 0; i < images.length; i++) {
                        this.flowchart.flowchartChildBegin(this.findChannelFromName(images[i]));
                        this.runBlurXTerminator(ImageWindow.windowById(images[i]), true);
                        this.flowchart.flowchartChildEnd(this.findChannelFromName(images[i]));
                  }
                  this.flowchart.flowchartParentEnd("Channels");
            }
            if (this.par.save_processed_channel_images.val) {
                  // Save processed channel images before we combine them
                  for (var i = 0; i < images.length; i++) {
                        this.saveProcessedImage(images[i], images[i]);
                  }
            }
            if (this.par.save_stretched_starless_channel_images.val) {
                  this.createStarlessChannelImages(images);
            }
      
            /* Run PixelMath to create a combined RGB image.
             */
            this.RGB_win_id = this.runPixelMathRGBMappingFindRef(
                              this.ppar.win_prefix + "Integration_RGB_combined", 
                              red_mapping.mapping, 
                              green_mapping.mapping, 
                              blue_mapping.mapping,
                              RGBmapping.channels_from_mappings);

            RGBmapping.combined = true;

            this.RGB_win = this.util.findWindow(this.RGB_win_id);
            this.guiUpdatePreviewWin(this.RGB_win);

            this.util.setFITSKeywordNoOverwrite(this.RGB_win, "AutoIntegrateNarrowband", "true", "If true then this is a narrowband image");
            this.util.setFITSKeyword(
                  this.RGB_win, 
                  "AutoIntegrateFilters", 
                  red_mapping.filters + ',' + green_mapping.filters + ',' + blue_mapping.filters, 
                  "Filters used");

            if (this.par.remove_stars_stretched.val && RGBmapping.stretched) {
                  let win = this.removeStars(this.RGB_win, false, !this.local_RGB_stars, null, null, this.par.unscreen_stars.val);
                  if (win != null && !this.local_RGB_stars) {
                        this.RGB_stars_win_HT = win;
                  }
                  if (!this.is_luminance_images) {
                        // use starless RGB image as mask
                        this.colorEnsureMask(this.RGB_win_id, true, true);
                  }
            }

            this.RGB_win.show();
            this.util.addScriptWindow(this.RGB_win_id);

      } else {
            // We have both RGB and narrowband, do custom mapping on individual channels.
            // Here we just create different combined channels in linear format and
            // then continue as normal RGB processing.
            // If we have multiple images in mapping we use linear fit to match
            // them before PixelMath.
            this.flowchart.flowchartParentBegin("RGB+Narrowband");
            this.util.addProcessingStep("RGB and narrowband mapping, create LRGB channel images and continue with RGB workflow");
            if (this.local_L_mapping == 'Auto' && this.L_id == null) {
                  // Auto mapping with no L image, skip mapping
                  this.local_L_mapping = '';
            }
            if (this.local_L_mapping != '') {
                  this.luminance_id = this.mapRGBchannel(mapping_L_images, this.ppar.win_prefix + "Integration_L", luminance_mapping.mapping, true, 'L');
                  this.guiUpdatePreviewId(this.luminance_id);
                  this.is_luminance_images = true;
            }

            this.red_id = this.mapRGBchannel(mapping_R_images, this.ppar.win_prefix + "Integration_R", red_mapping.mapping, false, 'R');
            this.green_id = this.mapRGBchannel(mapping_G_images, this.ppar.win_prefix + "Integration_G", green_mapping.mapping, false, 'G');
            this.blue_id = this.mapRGBchannel(mapping_B_images, this.ppar.win_prefix + "Integration_B", blue_mapping.mapping, false, 'B');

            this.flowchart.flowchartParentEnd("RGB+Narrowband");
      }

      return RGBmapping;
}

isCustomMapping(narrowband)
{
      return narrowband && !this.par.use_RGBNB_Mapping.val && !this.par.use_RGBHa_Mapping.val;
}

/* Copy id to _map name if id not null. This is done to avoid
 * modifying the original image.
 */
copyToMapIf(id)
{
      if (id != null) {
            if (id.endsWith("_map")) {
                  new_id = id;
            } else {
                  var new_id = this.util.remove_autocontinue_prefix(id);
                  new_id = this.util.ensure_win_prefix(new_id + "_map");
                  if (this.util.findWindow(new_id) == null) {
                        this.util.copyWindow(this.util.findWindow(id), new_id);
                  }
            }
            this.global.temporary_windows[this.global.temporary_windows.length] = new_id;
            return new_id;
      } else {
            return id;
      }
}

/* Copy integration_RGB to Integration_RGB_map so we do not
 * modify the original image.
 * Global variable this.RGB_win_id is set to the new image id and
 * this.RGB_win is set to the new image window.
 */ 
mapColorImage(oldname, newname)
{
      console.writeln("mapColorImage " + oldname + " to " + newname);
      this.RGB_win_id = this.util.ensure_win_prefix(newname);
      this.util.copyWindow(this.util.findWindow(this.RGB_color_id), this.RGB_win_id);
      this.RGB_win = ImageWindow.windowById(this.RGB_win_id);
      this.RGB_win.show();
}

RGBcopyToMapIf(ch, id)
{
      this.flowchart.flowchartChildBegin(ch);

      var mapped_id = this.copyToMapIf(id);
      this.cropImageIf(mapped_id);
      this.processChannelImage(mapped_id, false);

      this.flowchart.flowchartChildEnd(ch);

      return mapped_id;
}

// Check if we have any of LRGB channels listed in
// narrowband mappings
hasLRGBchannelsInNarrowbandMapping()
{
      if (this.local_R_mapping == 'Auto' || this.local_G_mapping == 'Auto' || this.local_B_mapping == 'Auto') {
            // We allow 'Auto' mapping and assume RGB
            console.writeln("hasLRGBchannelsInNarrowbandMapping: found Auto mapping, assume RGB");
            return true;
      }
      // Find one of RGB chars from mappings
      for (var ch of ['L', 'R', 'G', 'B']) {
            if (this.local_R_mapping.indexOf(ch) != -1
                || this.local_G_mapping.indexOf(ch) != -1
                ||  this.local_B_mapping.indexOf(ch) != -1) 
            {
                  console.writeln("hasLRGBchannelsInNarrowbandMapping: found " + ch + " in narrowband mapping, R: " + this.local_R_mapping +
                                 ", G: " + this.local_G_mapping + ", B: " + this.local_B_mapping);
                  return true;
            }
      }
      console.writeln("hasLRGBchannelsInNarrowbandMapping: not found " + ch + " in narrowband mapping, R: " + this.local_R_mapping +
                      ", G: " + this.local_G_mapping + ", B: " + this.local_B_mapping);
      return false;
}

/* Map RGB channels. We do PixelMath mapping here if we have narrowband images.
 */
mapLRGBchannels(RGBmapping)
{
      this.is_rgb_files = this.R_id != null || this.G_id != null || this.B_id != null;
      this.is_narrowband_files = this.H_id != null || this.S_id != null || this.O_id != null;
      var rgb = this.is_rgb_files;
      this.process_narrowband = this.is_narrowband_files || 
                           this.par.force_narrowband_mapping.val;
      var custom_mapping = this.isCustomMapping(this.process_narrowband);

      if (this.H_id != null) {
            console.writeln("mapLRGBchannels, H_id " + this.H_id);
      } else if (this.R_id != null) {
            console.writeln("mapLRGBchannels, R_id " + this.R_id);
      } else if (this.L_id != null) {
            console.writeln("mapLRGBchannels, L_id " + this.L_id);
      }

      if (rgb 
          && this.process_narrowband 
          && !this.par.force_narrowband_mapping.val
          && this.hasLRGBchannelsInNarrowbandMapping()) 
      {
            this.util.addProcessingStep("There are both RGB and narrowband data in mappings, processing as RGB image");
            this.process_narrowband = false;
      }
      if (this.process_narrowband) {
            this.util.addProcessingStep("Processing as narrowband image");
      }

      this.util.addProcessingStepAndStatusInfo("Map LRGB channels");

      if (custom_mapping) {
            this.util.addProcessingStep("Narrowband files, use custom mapping");
            RGBmapping = this.customMapping(RGBmapping, null);

      } else {
            this.util.addProcessingStep("Normal RGB processing");
            console.writeln("Make a copies of original windows.");
            
            this.flowchart.flowchartParentBegin("Channels");

            this.flowchart.flowchartChildBegin("L");
            if (this.luminance_id == null) {
                  // We may already have copied this.L_id so we do it
                  // here only if it is not copied yet.
                  this.luminance_id = this.copyToMapIf(this.L_id);
                  this.cropImageIf(this.luminance_id);
            }
            this.processChannelImage(this.luminance_id, true, 'L');
            this.flowchart.flowchartChildEnd("L");

            this.red_id = this.RGBcopyToMapIf("R", this.R_id);
            this.green_id = this.RGBcopyToMapIf("G", this.G_id);
            this.blue_id = this.RGBcopyToMapIf("B", this.B_id);

            this.flowchart.flowchartParentEnd("Channels");
      }
      return RGBmapping;
}

// add as a first item, first item should be the best image
insert_image_for_integrate(images, new_image, ssweight)
{
      console.writeln("insert_image_for_integrate " + new_image + ", ssweight=" + ssweight);
      images.unshift(new Array(2));
      images[0][0] = true;                // enabled
      images[0][1] = new_image;           // path
}

// add to the end
append_image_for_integrate(images, new_image, ssweight)
{
      console.writeln("append_image_for_integrate " + new_image + ", ssweight=" + ssweight);
      var len = images.length;
      images[len] = [];
      images[len][0] = true;
      images[len][1] = new_image;
}

/* After SubframeSelector run StarAlignment on *.xisf files.
   The output will be *_r.xisf files.
   old: After SubframeSelector run StarAlignment on *_a.xisf files.
   old: The output will be *_a_r.xisf files.
*/
runStarAlignment(imagetable, refImage)
{
      this.util.addProcessingStepAndStatusInfo("Star alignment reference image " + refImage);
      console.writeln("runStarAlignment input[0] " + imagetable[0]);
      var node = this.flowchart.flowchartOperation("StarAlignment");

      if (this.global.get_flowchart_data) {
            return imagetable;
      }

      var targets = [];

      for (var i = 0; i < imagetable.length; i++) {
            targets[targets.length] = [ true, true, imagetable[i] ];    // enabled, isFile, image
      }

      var P = new StarAlignment;
      P.sensitivity = this.par.staralignment_sensitivity.val;                                  // default 0.50
      P.maxStarDistortion = this.par.staralignment_maxstarsdistortion.val;                     // default 0.6
      P.structureLayers = this.par.staralignment_structurelayers.val;                          // default 5
      P.noiseReductionFilterRadius = this.par.staralignment_noisereductionfilterradius.val;    // default 0
      if (this.par.use_drizzle.val) {
            P.generateDrizzleData = true; /* Generate .xdrz files. */
      } else {
            P.generateDrizzleData = false;
      }
      P.outputDirectory = this.global.outputRootDir + this.global.AutoOutputDir;
      P.referenceImage = refImage;
      P.referenceIsFile = true;
      P.targets = targets;
      P.overwriteExistingFiles = true;
      // P.onError = StarAlignment.Continue;
      /*
       * Read-only properties
       *
       P.outputData = [ // outputImage, outputMask, totalPairMatches, inliers, overlapping, regularity, quality, rmsError, rmsErrorDev, peakErrorX, peakErrorY, H11, H12, H13, H21, H22, H23, H31, H32, H33, frameAdaptationBiasRK, frameAdaptationBiasG, frameAdaptationBiasB, frameAdaptationSlopeRK, frameAdaptationSlopeG, frameAdaptationSlopeB, frameAdaptationAvgDevRK, frameAdaptationAvgDevG, frameAdaptationAvgDevB, referenceStarX, referenceStarY, targetStarX, targetStarY, outputDistortionMap
       ];
       */
      P.executeGlobal();
      this.printAndSaveProcessValues(P);

      this.engine_end_process(node);

      var alignedFiles = this.fileNamesFromOutputData(P.outputData);

      this.util.addProcessingStep("runStarAlignment, " + alignedFiles.length + " files");
      console.writeln("output[0] " + alignedFiles[0]);

      this.global.star_alignment_image = refImage;

      return alignedFiles;
}

runCometAlignment(filenames, filename_postfix)
{
      console.writeln("Comet alignment, get metadata for images.");
      var node = this.flowchart.flowchartOperation("CometAlignment");

      if (this.global.get_flowchart_data) {
            return filenames;
      }

      var filter_files = this.getFilterFiles(filenames, this.global.pages.LIGHTS, '');

      /* Collect all file infos into a single list. 
       */
      console.writeln("Comet alignment, sort images by date.");
      var file_info_list = [];
      for (var i = 0; i < filter_files.allfilesarr.length; i++) {
            file_info_list = file_info_list.concat(filter_files.allfilesarr[i].files);
      }

      /* Sort the list by date. 
       */
      file_info_list.sort(function(a, b) {
            if (a.date_obs < b.date_obs) {
                  return -1;
            } else if (a.date_obs > b.date_obs) {
                  return 1;
            } else {
                  this.save_images_in_save_id_list(); // Save images so we can return with AutoContinue
                  this.util.throwFatalError("Comet alignment failed, equal DATE-OBS " + a.date_obs + " in files " + a.name + " and " + b.name);
                  return 0;
            }
      });

      /* Generate targetFrames.
       */
      console.writeln("Comet alignment, generate target frame info.");
      var splt = this.par.comet_first_xy.val.split(",");
      if (splt.length != 2) {
            this.save_images_in_save_id_list(); // Save images so we can return with AutoContinue
            this.util.throwFatalError("Comet alignment failed, incorrect first image X,Y format " + this.par.comet_first_xy.val);
      }
      var first_x = parseInt(splt[0]);
      var first_y = parseInt(splt[1]);
      var splt = this.par.comet_last_xy.val.split(",");
      if (splt.length != 2) {
            this.save_images_in_save_id_list(); // Save images so we can return with AutoContinue
            this.util.throwFatalError("Comet alignment failed, incorrect last image X,Y format " + this.par.comet_last_xy.val);
      }
      var last_x = parseInt(splt[0]);
      var last_y = parseInt(splt[1]);
      var first_jd = Math.calendarTimeToJD(file_info_list[0].date_obs);
      var last_jd = Math.calendarTimeToJD(file_info_list[file_info_list.length - 1].date_obs);

      var diff_x = last_x - first_x;
      var diff_y = last_y - first_y;
      var diff_jd = last_jd - first_jd;

      var speed_x = diff_x / diff_jd;
      var speed_y = diff_y / diff_jd;

      // Number Math.calendarTimeToJD( String dateTime )

      // Target frames example
      // [ path, enabled, date, jd, x, y, fixed, drizzlePath
      //      ["D:/Telescopes/TelescopeLive/COMETC2022E3_LRGB_SPA-1-CMOS/SPA-1-CMOS_2023-01-31T04-47-07_COMETC2022E3_Luminance_30s_ID333839_cal.fits", true, "", 2459975.699387777596712, 6950.60, 1804.66, true, ""],
      //      ["D:/Telescopes/TelescopeLive/COMETC2022E3_LRGB_SPA-1-CMOS/SPA-1-CMOS_2023-01-31T04-47-40_COMETC2022E3_Luminance_30s_ID333840_cal.fits", true, "", 2459975.699768784921616, 6901.26, 1817.37, false, ""],
      //      ["D:/Telescopes/TelescopeLive/COMETC2022E3_LRGB_SPA-1-CMOS/SPA-1-CMOS_2023-01-31T05-30-01_COMETC2022E3_Blue_30s_ID333926_cal.fits", true, "", 2459975.729182534851134, 3091.91, 2798.20, false, ""],
      //      ["D:/Telescopes/TelescopeLive/COMETC2022E3_LRGB_SPA-1-CMOS/SPA-1-CMOS_2023-01-31T05-30-34_COMETC2022E3_Blue_30s_ID333927_cal.fits", true, "", 2459975.729565069545060, 3042.37, 2810.96, true, ""]
      // ];
      var targetFrames = [];
      for (var i = 0; i < file_info_list.length; i++) {
            let x;
            let y;
            let jd = Math.calendarTimeToJD(file_info_list[i].date_obs);
            if (i == 0) {
                  x = first_x;
                  y = first_y;
            } else {
                  x = targetFrames[i-1][4] + (jd - targetFrames[i-1][3]) * speed_x;
                  y = targetFrames[i-1][5] + (jd - targetFrames[i-1][3]) * speed_y;
            }
            // path, enabled, date, jd, x, y, fixed, drizzlePath
            targetFrames[targetFrames.length] = [
                  file_info_list[i].name,                                                       // 0 path
                  true,                                                                         // 1 enabled
                  "",                                                                           // 2 date
                  jd,                                                                           // 3 jd
                  x,                                                                            // 4 x
                  y,                                                                            // 5 y
                  false,                                                                        // 6 fixed
                  this.par.use_drizzle.val ? file_info_list[i].name.replace(".xisf", ".xdrz") : ""   // 7 drizzlePath
            ];
      }
      targetFrames[0][6] = true;
      targetFrames[targetFrames.length-1][4] = last_x;
      targetFrames[targetFrames.length-1][5] = last_y;
      targetFrames[targetFrames.length-1][6] = true;

      console.writeln("[ path, enabled, date, jd, x, y, fixed, drizzlePath, diff x, diff y]");
      for (var i = 0; i < targetFrames.length; i++) {
            console.write('[');
            for (var j = 0; j < targetFrames[i].length; j++) {
                  console.write(targetFrames[i][j] + ", ");
            }
            if (i == 0) {
                  console.writeln("0, 0");
            } else {
                  console.writeln((targetFrames[i][4] - targetFrames[i-1][4]) + ", " +
                                  (targetFrames[i][5] - targetFrames[i-1][5]));
            }
      }

      console.writeln("Comet alignment, call CometAlignment.");

      var P = new CometAlignment;
      P.targetFrames = targetFrames;
      P.referenceIndex = 0;
      P.fitPSF = true;
      P.operandImageFilePath = "";
      P.operandSubtractAligned = true;
      P.operandLinearFit = true;
      P.operandLinearFitLow = 0.000000;
      P.operandLinearFitHigh = 0.920000;
      P.operandNormalize = true;
      P.drizzleWriteStarAlignedImage = true;
      P.drizzleWriteCometAlignedImage = true;
      P.pixelInterpolation = CometAlignment.Lanczos4;
      P.linearClampingThreshold = 0.30;
      P.inputHints = "";
      P.outputHints = "";
      P.outputDirectory = this.global.outputRootDir + this.global.AutoOutputDir;
      P.outputExtension = ".xisf";
      P.outputPrefix = "";
      P.outputPostfix = "_ca";
      P.overwriteExistingFiles = true;
      P.generateCometPathMap = true;
      P.onError = CometAlignment.OnError_Continue;
      P.useFileThreads = true;
      P.fileThreadOverload = 1.00;
      P.maxFileReadThreads = 0;
      P.maxFileWriteThreads = 0;

      P.executeGlobal();

      this.printAndSaveProcessValues(P);
      this.engine_end_process(node);

      this.alignedFiles = [];
      for (var i = 0; i < filenames.length; i++) {
            this.alignedFiles[this.alignedFiles.length] = filenames[i].replace(filename_postfix + ".", filename_postfix + "_ca.");
      }

      this.util.addProcessingStep("Comet alignment, " + this.alignedFiles.length + " files");
      console.writeln("output[0] " + this.alignedFiles[0]);

      return this.alignedFiles;
}

getWindowSizeFromFilename(filename)
{
      var imageWindows = ImageWindow.open(filename);
      if (imageWindows == null || imageWindows.length == 0) {
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

getLocalNormalizationScale(filename, defscale)
{
      var wh = this.getWindowSizeFromFilename(filename);
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

runLocalNormalization(imagetable, refImage, filter)
{
      if (imagetable.length == 0) {
            // No new files are needed
            this.util.addProcessingStep("No files for local normalization for filter " + filter);
            return;
      }

      this.util.addProcessingStepAndStatusInfo("Local normalization, filter " + filter + ", reference image " + refImage);
      var node = this.flowchart.flowchartOperation("LocalNormalization");

      if (imagetable.length == 1 || this.global.get_flowchart_data) {
            console.writeln("runLocalNormalization, only one file or flowchart, no need for local normalization");
            return;
      }

      if (this.par.use_processed_files.val) {
            var fileNames = [];
            for (var i = 0; i < imagetable.length; i++) {
                  fileNames[i] = imagetable[i][1];
            }
            var fileProcessedStatus = this.getFileProcessedStatusEx(fileNames, "", this.global.outputRootDir + this.global.AutoOutputDir, ".xnml");
            if (fileProcessedStatus.processed.length == fileNames.length) {
                  this.util.addProcessingStep("Using existing local normalization files");
                  return;
            }
      }

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
            if (add_file && this.par.start_from_imageintegration.val) {
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
            this.util.addProcessingStep("Using existing local normalization files");
            return;
      }

      var P = new LocalNormalization;
      if (this.par.use_localnormalization_multiscale.val) {
            console.writeln("runLocalNormalization, use multiscale analysis");
            P.scaleEvaluationMethod = LocalNormalization.ScaleEvaluationMethod_MultiscaleAnalysis;
      } else {
            // use default: P.scaleEvaluationMethod = LocalNormalization.ScaleEvaluationMethod_PSFSignal;
      }
      var scale = this.getLocalNormalizationScale(refImage, P.scale);
      if (scale != 0) {
            P.scale = scale;
      }
      P.referencePathOrViewId = refImage;
      if (this.global.pixinsight_version_num >= 1080900) {
            P.referenceIsView = false;
      }
      P.targetItems = targets;            // [ enabled, image ]
      P.outputDirectory = this.global.outputRootDir + this.global.AutoOutputDir;
      P.overwriteExistingFiles = true;

      P.executeGlobal();

      this.printAndSaveProcessValues(P);
      this.engine_end_process(node);
}

linearFitImage(refViewId, targetId, add_to_flowchart = false)
{
      if (refViewId == targetId) {
            return;
      }
      this.util.addProcessingStepAndStatusInfo("Run linear fit on " + targetId + " using " + refViewId + " as reference");
      if (refViewId == null || targetId == null) {
            this.save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
            this.util.throwFatalError("No image for linear fit, maybe some previous step like star alignment failed");
      }

      if (add_to_flowchart) {
            var node = this.flowchart.flowchartOperation("LinearFit");
      } else {
            var node = null;
      }

      if (this.global.get_flowchart_data) {
            return;
      }

      var targetWin = ImageWindow.windowById(targetId);
      var P = new LinearFit;
      P.referenceViewId = refViewId;

      targetWin.mainView.beginProcess(UndoFlag.NoSwapFile);
      P.executeOn(targetWin.mainView);
      targetWin.mainView.endProcess();

      this.printAndSaveProcessValues(P, this.findChannelFromNameIf(targetId), targetWin.mainView.id);

      this.util.setFITSKeyword(targetWin, "AutoLinearfit", "true", "Linear fit was done by AutoIntegrate");
      var refWin = ImageWindow.windowById(refViewId);
      this.util.setFITSKeyword(refWin, "AutoLinearfit", "true", "Linear fit was done by AutoIntegrate");

      this.engine_end_process(node, targetWin, "LinearFit", false);
}

runDrizzleIntegration(integrationImageId, images, name, local_normalization, drizzle_extension)
{
      this.util.addProcessingStepAndStatusInfo("Run DrizzleIntegration");
      var node = this.flowchart.flowchartOperation("DrizzleIntegration");

      if (this.global.get_flowchart_data) {
            return this.flowchartNewIntegrationImage(images[0][1], this.ppar.win_prefix + "Integration_" + name);
      }

      var drizzleImages = [];
      for (var i = 0; i < images.length; i++) {
            drizzleImages[i] = [];
            drizzleImages[i][0] = images[i][0];                                 // enabled
            drizzleImages[i][1] = images[i][1].replace(".xisf", drizzle_extension);       // drizzlePath
            if (local_normalization) {
                  drizzleImages[i][2] = images[i][1].replace(".xisf", ".xnml"); // localNormalizationDataPath
            } else {
                  drizzleImages[i][2] = "";                                     // localNormalizationDataPath
            }
      }

      console.writeln("runDrizzleIntegration, scale " + this.par.drizzle_scale.val + ", dropShrink " + this.par.drizzle_drop_shrink.val + ", useLUT " + this.par.drizzle_fast_mode.val + ", kernelFunction " + this.par.drizzle_function.val, ", enableLocalNormalization " + local_normalization);

      var P = new DrizzleIntegration;
      P.inputData = drizzleImages; // [ enabled, path, localNormalizationDataPath ]
      P.enableLocalNormalization = local_normalization;
      P.scale = this.par.drizzle_scale.val;
      P.dropShrink = this.par.drizzle_drop_shrink.val;
      P.useLUT = this.par.drizzle_fast_mode.val;
      switch (this.par.drizzle_function.val) {
            case 'Square':
                  P.kernelFunction = DrizzleIntegration.Kernel_Square;
                  break;
            case 'Circular':
                  P.kernelFunction = DrizzleIntegration.Kernel_Circular;
                  break;
            case 'Gaussian':
                  P.kernelFunction = DrizzleIntegration.Kernel_Gaussian;
                  break;
            default:
                  this.util.throwError("Unknown drizzle " + this.par.drizzle_function.val);
                  break;
      }
      // P.enableCFA = this.is_color_files && this.local_debayer_pattern != 'None';

      console.writeln("runDrizzleIntegration, P.scale " + P.scale + ", P.dropShrink " + P.dropShrink + ", P.useLUT " + P.useLUT + ", P.kernelFunction " + this.par.drizzle_function.val, ", P.enableLocalNormalization " + P.enableLocalNormalization);

      P.executeGlobal();

      this.printAndSaveProcessValues(P, name);
      this.engine_end_process(node);

      this.util.closeOneWindowById(P.weightImageId);

      var new_name = this.util.windowRename(P.integrationImageId, this.ppar.win_prefix + "Integration_" + name);
      var new_win = ImageWindow.windowById(new_name);

      this.util.copyKeywordsFromWindow(new_win, ImageWindow.windowById(integrationImageId));
      this.setDrizzleKeyword(new_win, this.par.drizzle_scale.val);
      if (this.medianFWHM) {
            this.setMEDFWHMKeyword(new_win, this.medianFWHM * this.par.drizzle_scale.val);
      }

      this.guiUpdatePreviewId(new_name);
      //this.util.addScriptWindow(new_name);
      console.writeln("runDrizzleIntegration new_name " + new_name);
      return new_name;
}

getRejectionAlgorithm(numimages)
{
      if (this.par.use_clipping.val == 'None') {
            this.util.addProcessingStep("Using no rejection");
            return ImageIntegration.NoRejection;
      } else if (this.par.use_clipping.val == 'Percentile') {
            this.util.addProcessingStep("Using Percentile clip for rejection");
            return ImageIntegration.PercentileClip;
      } else if (this.par.use_clipping.val == 'Sigma') {
            this.util.addProcessingStep("Using Sigma clip for rejection");
            return ImageIntegration.SigmaClip;
      } else if (this.par.use_clipping.val == 'Winsorised sigma') {
            this.util.addProcessingStep("Using Winsorised sigma clip for rejection");
            return ImageIntegration.WinsorizedSigmaClip;
      } else if (this.par.use_clipping.val == 'Averaged sigma') {
            this.util.addProcessingStep("Using Averaged sigma clip for rejection");
            return ImageIntegration.AveragedSigmaClip;
      } else if (this.par.use_clipping.val == 'Linear fit') {
            this.util.addProcessingStep("Using Linear fit clip for rejection");
            return ImageIntegration.LinearFit;
      } else if (this.par.use_clipping.val == 'ESD') {
            this.util.addProcessingStep("Using ESD clip for rejection");
            return ImageIntegration.Rejection_ESD;
      } else if (this.par.use_clipping.val == 'Auto2') {
            /* In theory these should be good choices but sometime give much more uneven
             * highlights than Sigma.
             */
            if (numimages < 8) {
                  this.util.addProcessingStep("Auto2 using Percentile clip for rejection");
                  return ImageIntegration.PercentileClip;
            } else if (numimages < 20) {
                  this.util.addProcessingStep("Auto2 using Sigma clip for rejection");
                  return ImageIntegration.SigmaClip;
            } else if (numimages < 25 || ImageIntegration.Rejection_ESD === undefined) {
                  this.util.addProcessingStep("Auto2 using Linear fit clip for rejection");
                  return ImageIntegration.LinearFit;
            } else {
                  this.util.addProcessingStep("Auto2 using ESD clip for rejection");
                  return ImageIntegration.Rejection_ESD;
            }
      } else {
            /* this.par.use_clipping.val == 'Auto1' */
            if (numimages < 8) {
                  this.util.addProcessingStep("Auto1 using Percentile clip for rejection");
                  return ImageIntegration.PercentileClip;
            } else {
                  this.util.addProcessingStep("Auto1 using Sigma clip for rejection");
                  return ImageIntegration.SigmaClip;
            }
      }
}

ensureThreeImages(images)
{
      if (images.length == 1) {
            // Add existing image twice so we have three images
            this.append_image_for_integrate(images, images[0][1]);
            this.append_image_for_integrate(images, images[0][1]);
      } else if (images.length == 2) {
            // Duplicate first images which should be a better one
            this.append_image_for_integrate(images, images[0][1]);
      }
}

runFastIntegration(integration_images, name, refImage)
{
      if (this.global.pixinsight_version_num < 1080902) {
            this.util.throwFatalError("FastIntegration requires PixInsight 1.8.9-2 or later");
      }
      this.util.addProcessingStepAndStatusInfo("FastIntegration reference image " + refImage);
      console.writeln("runFastIntegration input[0] " + integration_images[0][1]);
      var node = this.flowchart.flowchartOperation("FastIntegration");

      if (this.global.get_flowchart_data) {
            return this.flowchartNewIntegrationImage(integration_images[0][1], this.ppar.win_prefix + "Integration_" + name);
      }

      var targets = [];
      for (var i = 0; i < integration_images.length; i++) {
            targets[targets.length] = [ true, integration_images[i][1] ];    // enabled, image
      }

      var P = new FastIntegration;
      P.referenceImage = refImage;
      P.targets = targets;
      if (this.par.use_drizzle.val) {
            console.writeln("generate drizzle data");
            P.generateDrizzleData = true; /* Generate .xdrz files. */
      } else {
            P.generateDrizzleData = false;
      }
      P.generateRejectionMaps = false;
      P.outputDirectory = this.global.outputRootDir + this.global.AutoOutputDir;
      P.outputPostfix = "_r";
      P.overwriteExistingFiles = true;
      // Defaults from FBPP
      P.preciseAlignmentEnabled = false;
      P.useROI = false;

      // Other useful settings
      // P.weightingEnabled = true; // default false

      // Configuration settings
      P.rejectionFluxRatio = this.par.fastintegration_max_flux.val;          // default 0.5, AutoIntegrate default changed from 0.35 to 0.5
      P.maxStarSearchIterations = this.par.fastintegration_iterations.val;   // default 1, AutoIntegrate default 1
      P.medianErrorTolerance = this.par.fastintegration_errortolerance.val;  // default 1.5, AutoIntegrate default 1.5

      /*
       * Read-only properties
       *
       P.outputData = [ // outputImage, outputMask, totalPairMatches, inliers, overlapping, regularity, quality, rmsError, rmsErrorDev, peakErrorX, peakErrorY, H11, H12, H13, H21, H22, H23, H31, H32, H33, referenceStarX, referenceStarY, targetStarX, targetStarY
       ];
       */

      var succ = P.executeGlobal();

      if (this.par.debug.val) {
            console.writeln("P.outputData = [ // registeredImage, outputDrizzleFile, fastAlignment, totalPairMatches, medianError, peakError, H11, H12, H13, H21, H22, H23, H31, H32, H33, referenceStarX, referenceStarY, targetStarX, targetStarY, targetStarFlux ]");
            console.writeln("P.outputData = " + JSON.stringify(P.outputData));
      }

      this.printAndSaveProcessValues(P, name);
      this.engine_end_process(node);

      if (!succ) {
            this.util.throwFatalError("FastIntegration failed at executeGlobal");
      }

      var w = this.util.findWindowStartsWith("FastIntegrationMaster");
      if (w != null) {
            var master_name = w.mainView.id;
      } else {
            this.util.throwFatalError("FastIntegration failed, no output window found");
      }

      console.writeln("Rename FastIntegration master " + master_name + " to " + this.ppar.win_prefix + "Integration_" + name);  

      var new_name = this.util.windowRename(master_name, this.ppar.win_prefix + "Integration_" + name);

      this.util.addProcessingStep("runFastIntegration, " + targets.length + " files");
      console.writeln("output " + new_name);

      this.util.copyKeywordsFromFile(new_name, refImage);

      return new_name;
}

runFastIntegrationEx(integration_images, name, refImage)
{
      var id = this.runFastIntegration(integration_images, name, refImage)
      if (this.par.use_drizzle.val && name != 'LDD') {
            this.guiUpdatePreviewId(id);
            id = this.util.windowRename(id, id + "_tmp");
            var new_id = this.runDrizzleIntegration(id, integration_images, name, false, "_r.xdrz");
            this.util.closeOneWindowById(id);
            id = new_id;
      }
      return id;
}

runBasicIntegration(images, name, local_normalization)
{
      var node = this.flowchart.flowchartOperation("ImageIntegration");

      if (this.global.get_flowchart_data) {
            return this.flowchartNewIntegrationImage(images[0][1], "Integration");
      }

      var P = new ImageIntegration;

      var savedWeightMode = P.weightMode;

      P.images = images; // [ enabled, path, drizzlePath, localNormalizationDataPath ]
      if (this.ssweight_set && this.par.use_imageintegration_ssweight.val) {
            this.util.addProcessingStep("Using SSWEIGHT for ImageIntegration weightMode");
            P.weightMode = ImageIntegration.KeywordWeight;
            P.weightKeyword = "SSWEIGHT";
      }
      P.minWeight = this.par.ssweight_limit.val;     /* Default: 0.005, we use the value from the script parameter */
      if (local_normalization) {
            this.util.addProcessingStep("Using LocalNormalization for ImageIntegration normalization");
            P.normalization = ImageIntegration.LocalNormalization;
      } else if (this.par.imageintegration_normalization.val == 'Additive') {
            this.util.addProcessingStep("Using AdditiveWithScaling for ImageIntegration normalization");
            P.normalization = ImageIntegration.AdditiveWithScaling;
      } else if (this.par.imageintegration_normalization.val == 'Adaptive') {
            this.util.addProcessingStep("Using AdaptiveNormalization for ImageIntegration normalization");
            P.normalization = ImageIntegration.AdaptiveNormalization;
      } else {
            this.util.addProcessingStep("Using NoNormalization for ImageIntegration normalization");
            P.normalization = ImageIntegration.NoNormalization;
      }
      if (name == 'LDD') {
            // Integration for LDDEngine, do not use rejection
            P.rejection = ImageIntegration.NoRejection;
      } else {
            P.rejection = this.getRejectionAlgorithm(images.length);
      }
      if (local_normalization) {
            P.rejectionNormalization = ImageIntegration.LocalRejectionNormalization;
      } else if (0 && this.par.imageintegration_normalization.val == 'Adaptive') {
            // Using AdaptiveRejectionNormalization seem to abort ImageIntegration with bad data sets
            P.rejectionNormalization = ImageIntegration.AdaptiveRejectionNormalization;
      } else {
            P.rejectionNormalization = ImageIntegration.Scale;
      }
      P.clipLow = !this.par.skip_imageintegration_clipping.val;            // def: true
      P.clipHigh = !this.par.skip_imageintegration_clipping.val;           // def: true
      P.rangeClipLow = !this.par.skip_imageintegration_clipping.val;       // def: true
      if (name == 'LDD') {
            P.generateDrizzleData = false;
      } else {
            P.generateDrizzleData = this.par.use_drizzle.val || this.par.generate_xdrz.val;
      }
      P.pcClipLow = this.par.percentile_low.val;
      P.pcClipHigh = this.par.percentile_high.val;
      P.sigmaLow = this.par.sigma_low.val;
      P.sigmaHigh = this.par.sigma_high.val;
      P.winsorizationCutoff = this.par.winsorised_cutoff.val;
      P.linearFitLow = this.par.linearfit_low.val;
      P.linearFitHigh = this.par.linearfit_high.val;
      P.esdOutliersFraction = this.par.ESD_outliers.val;
      P.esdAlpha = this.par.ESD_significance.val;

      P.largeScaleClipHigh = this.par.large_scale_pixel_rejection_high.val;
      if (this.par.large_scale_pixel_rejection_high.val) {
            console.writeln("Using large scale pixel rejection high");
      }
      P.largeScaleClipLow = this.par.large_scale_pixel_rejection_low.val;
      if (this.par.large_scale_pixel_rejection_low.val) {
            console.writeln("Using large scale pixel rejection low");
      }

      // P.esdLowRelaxation = this.par.ESD_lowrelaxation.val; deprecated, use default for old version

      if (local_normalization) {
            // With local normalization the pedestal is already subtracted
            P.subtractPedestals = false;
      } else {
            P.subtractPedestals = true;
      }

      try {
            var succ = P.executeGlobal();
            if (!succ) {
                  this.util.throwFatalError("ImageIntegration failed");
            }
      } catch (e) {
            console.criticalln("ImageIntegration failed, " + e.toString());
            throw e;
      }

      this.util.closeOneWindowById(P.highRejectionMapImageId);
      this.util.closeOneWindowById(P.lowRejectionMapImageId);
      this.util.closeOneWindowById(P.slopeMapImageId);

      this.printProcessValues(P, name);

      // For saving restore original weight mode
      // In manual mode we have no way of writing SSWEIGHT to the output images
      P.weightMode = savedWeightMode;
      this.saveProcessValues(P, name);
      
      this.engine_end_process(node);

      this.util.copyKeywordsFromFile(P.integrationImageId, images[0][1]);

      /* Set the filter keyword for the integration image.
       */
      this.setAutoIntegrateFilters(P.integrationImageId, [ P.integrationImageId ]);
      if (this.medianFWHM) {
            this.setMEDFWHMKeyword(ImageWindow.windowById(P.integrationImageId), this.medianFWHM);
      }

      let win = this.util.findWindow(P.integrationImageId);
      this.setAutoIntegrateVersionIfNeeded(win);
      this.setImagetypKeyword(win, "Master light");

      return P.integrationImageId;
}

setAutoIntegrateFilters(target_id, idlist)
{
      console.writeln("setAutoIntegrateFilters, target_id " + target_id + ", idlist " + idlist);
      var filter_keywords = "";
      for (var i = 0; i < idlist.length; i++) {
            var win = ImageWindow.windowById(idlist[i]);
            var filter_keyword = this.util.getKeywordValue(win, "AutoIntegrateFilters");
            if (filter_keyword == null) {
                  var filter = this.util.getKeywordValue(win, "FILTER");
                  filter_keyword = this.getFilterKeywordForImage(filter, target_id, '');
            }
            if (filter_keyword) {
                  if (filter_keywords.length > 0) {
                        filter_keywords += ",";
                  }
                  filter_keywords += filter_keyword;
            }
      }
      var win = ImageWindow.windowById(target_id);
      this.util.setFITSKeyword(win, "AutoIntegrateFilters", filter_keywords, "Filters used");
      console.writeln("setAutoIntegrateFilters, target_id " + target_id + ", filter_keywords " + filter_keywords);
}

getAutoIntegrateFilters(imgWindow)
{
      console.writeln("getAutoIntegrateFilters, imgWindow " + imgWindow.mainView.id);
      var filter_keywords = this.util.getKeywordValue(imgWindow, "AutoIntegrateFilters");
      if (filter_keywords == null) {
            return "";
      } else {
            return filter_keywords;
      }
}

// Check is all RGB filters are listed in the image
checkRGBfilters(imgWindow)
{
      var filter_keywords = this.getAutoIntegrateFilters(imgWindow);
      var rgb_filters = ["R", "G", "B"];
      for (var i = 0; i < rgb_filters.length; i++) {
            if (filter_keywords.indexOf(rgb_filters[i]) === -1) {
                  console.writeln("Missing RGB filter: " + rgb_filters[i]);
                  return false;
            }
      }
      return true;
}

runImageIntegrationEx(images, name, local_normalization)
{
      var integrationImageId = this.runBasicIntegration(images, name, local_normalization);

      if (this.par.use_drizzle.val && name != 'LDD') {
            this.guiUpdatePreviewId(integrationImageId);
            integrationImageId = this.util.windowRename(integrationImageId, integrationImageId + "_tmp");
            var new_id = this.runDrizzleIntegration(integrationImageId, images, name, local_normalization, ".xdrz");
            console.writeln("runImageIntegrationEx completed, new name " + new_id);
            this.util.closeOneWindowById(integrationImageId);
            return new_id;
      } else {
            var new_name = this.util.windowRename(integrationImageId, this.ppar.win_prefix + "Integration_" + name);
            console.writeln("runImageIntegrationEx completed, new name " + new_name);
            this.guiUpdatePreviewId(new_name);
            return new_name
      }
}

checkFilesExist(imagearray)
{
      var succp = true;

      for (var i = 0; i < imagearray.length; i++) {
            if (!File.exists(imagearray[i])) {
                  console.criticalln("Error, could not find image file " + imagearray[i]);
                  succp = false;
            }
      }
      return succp;
}

runImageIntegrationNormalized(images, best_image, name)
{
      this.util.addProcessingStepAndStatusInfo("ImageIntegration with LocalNormalization");

      this.runLocalNormalization(images, best_image, name);

      console.writeln("Using local normalized data in image integration, " + images.length + " files");
      
      var norm_images = [];
      for (var i = 0; i < images.length; i++) {
            var oneimage = [];
            var imagearray = [];
            oneimage[0] = true;                                   // enabled
            oneimage[1] = images[i][1];                           // path
            imagearray[imagearray.length] = oneimage[1];
            if (this.par.use_drizzle.val) {
                  oneimage[2] = images[i][1].replace(".xisf", ".xdrz"); // drizzlePath
                  imagearray[imagearray.length] = oneimage[2];
            } else {
                  oneimage[2] = "";                                     // drizzlePath
            }
            oneimage[3] = images[i][1].replace(".xisf", ".xnml");    // localNormalizationDataPath
            imagearray[imagearray.length] = oneimage[3];
            if (this.global.get_flowchart_data || this.checkFilesExist(imagearray)) {
                  norm_images[norm_images.length] = oneimage;
            } else {
                  this.util.addWarningStatus("ImageIntegration with LocalNormalization skipping image " + imagearray[0]);
            }
      }
      console.writeln("runImageIntegrationNormalized, " + norm_images[0][1] + ", " + norm_images[0][3]);

      return this.runImageIntegrationEx(norm_images, name, true);
}

runImageIntegration(channel_images, name, save_to_file, flowchartname)
{
      var images = channel_images.images;
      if (images == null || images.length == 0) {
            return null;
      }
      this.util.addProcessingStepAndStatusInfo("Image " + name + " integration on " + images.length + " files");
      this.flowchart.flowchartChildBegin(flowchartname ? flowchartname : name);
      if (!this.global.get_flowchart_data) {
            this.ensureThreeImages(images);
      }

      if (!this.par.local_normalization.val || name == 'LDD') {
            if (this.par.use_drizzle.val) {
                  var drizzleImages = [];
                  for (var i = 0; i < images.length; i++) {
                        drizzleImages[i] = [];
                        drizzleImages[i][0] = images[i][0];      // enabled
                        drizzleImages[i][1] = images[i][1];      // path
                        drizzleImages[i][2] = images[i][1].replace(".xisf", ".xdrz"); // drizzlePath
                        drizzleImages[i][3] = null;                                   // localNormalizationDataPath
                  }
                  var integration_images = drizzleImages;
            } else {
                  var integration_images = [];
                  for (var i = 0; i < images.length; i++) {
                        integration_images[i] = [];
                        integration_images[i][0] = images[i][0];      // enabled
                        integration_images[i][1] = images[i][1];      // path
                        integration_images[i][2] = null;              // drizzlePath
                        integration_images[i][3] = null;              // localNormalizationDataPath
                  }
            }

            if (this.par.use_fastintegration.val) {
                  var image_id = this.runFastIntegrationEx(integration_images, name, this.global.best_image);
            } else {
                  var image_id = this.runImageIntegrationEx(integration_images, name, false);
            }

      } else {
            var image_id = this.runImageIntegrationNormalized(images, channel_images.best_image, name);
      }
      if (save_to_file) {
            this.save_id_list.push([image_id, image_id]);
      }
      this.util.runGarbageCollection();
      this.flowchart.flowchartChildEnd(flowchartname ? flowchartname : name);
      if (!this.global.get_flowchart_data) {
            // Update statistics to the image metadata
            // Add exposure time and number of images to the image metadata
            var win = ImageWindow.windowById(image_id);
            if (win != null) {
                  this.util.setFITSKeyword(win, "AutoIntegrateExposure", channel_images.exptime.toString(), "Exposure time in seconds");
                  this.util.setFITSKeyword(win, "AutoIntegrateNumImages", images.length.toString(), "Number of images used for integration");
            }
      }
      console.writeln("runImageIntegration completed, new name " + image_id);
      return image_id;
}

// Calculate exptime and numimages from keywords in integrated images
setIntegrationInfoKeywords(imageId)
{
      var targetWin = ImageWindow.windowById(imageId);
      if (targetWin == null) {
            console.criticalln("Error, could not find image window for " + imageId);
            return;
      }
      var exptime = 0;
      var numImages = 0;
      var image_ids = [ this.L_id, this.R_id, this.G_id, this.B_id, this.H_id, this.S_id, this.O_id, this.RGB_color_id ];

      for (var i = 0; i < image_ids.length; i++) {
            var id = image_ids[i];
            if (id == null) {
                  continue;
            }
            var win = ImageWindow.windowById(image_ids[i]);
            if (win == null) {
                  console.criticalln("Error, could not find image window for " + image_ids[i]);
                  continue;
            }
            var exp = this.util.getKeywordValue(win, "AutoIntegrateExposure");
            if (exp == null) {
                  if (!this.global.get_flowchart_data) {
                        console.criticalln("Error, could not find AutoIntegrateExposure keyword in " + image_ids[i]);
                  }
                  continue;
            }
            exptime += parseInt(exp);
            var num = this.util.getKeywordValue(win, "AutoIntegrateNumImages");
            if (num == null) {
                  if (!this.global.get_flowchart_data) {
                        console.criticalln("Error, could not find AutoIntegrateNumImages keyword in " + image_ids[i]);
                  }
                  continue;
            }
            numImages += parseInt(num);
      }
      this.util.setFITSKeyword(targetWin, "AutoIntegrateExposure", exptime.toString(), "Exposure time in seconds");
      this.util.setFITSKeyword(targetWin, "AutoIntegrateNumImages", numImages.toString(), "Number of images used for integration");
}

cropHandleDrizzle(name)
{
      console.writeln("Drizzle is used, expand the crop source image by " + this.par.drizzle_scale.val + "x for Crop");
      var win = ImageWindow.windowById(name);
      var P = new IntegerResample;
      P.zoomFactor = this.par.drizzle_scale.val;
      P.noGUIMessages = true;
      win.mainView.beginProcess(UndoFlag.NoSwapFile);
      P.executeOn(win.mainView, false);
      win.mainView.endProcess();
}

runImageIntegrationForCrop(images)
{
      console.noteln("ImageIntegration to find area common to all images");
      console.writeln("images[0]=" + images[0][1]);

      if (this.global.get_flowchart_data) {
            // we should have this.par.crop_use_rejection_low.val == false here
            var id = this.flowchartNewIntegrationImage(images[0][1], this.ppar.win_prefix + "LowRejectionMap_ALL");
            return { integrated_image_id: id, rejection_map_id: id };
      }

      // images is [ enabled, path ], convert it to [ enabled, path, drizzlePath, localNormalizationDataPath ] for ImageIntegration
      for (var i = 0; i < images.length; i++) {
            images[i][2] = null; // drizzlePath
            images[i][3] = null; // localNormalizationDataPath
      }

      var P = new ImageIntegration;

      // The commented properties are normally defaults, not set because the defaults could
      // be changed by the developer of ImageIntegration and should not impact this process
      // (hopefully).
      P.images = images; // [ enabled, path, drizzlePath, localNormalizationDataPath ]
      // P.inputHints = "fits-keywords normalize raw cfa signed-is-physical"; //Default, maybe should force normalize
      P.combination = ImageIntegration.Minimum;
      // P.weightMode = ImageIntegration.PSFSignalWeight;
      // P.weightKeyword = "";
      // P.weightScale = ImageIntegration.WeightScale_BWMV;
      // P.csvWeights = "";
      // P.adaptiveGridSize = 16;
      // P.adaptiveNoScale = false;
      P.minWeight = this.par.ssweight_limit.val;  /* Default: 0.005, we use the value from the script parameter */
      P.ignoreNoiseKeywords = true; // We do not use noise information anyhow
      P.normalization = ImageIntegration.NoNormalization; // Gain time, useless for our  need
      P.rejection = ImageIntegration.NoRejection; // Default, but essential for our needs
      // P.rejectionNormalization = ImageIntegration.Scale;
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
      if (this.par.crop_use_rejection_low.val) {
            P.rangeClipLow = true;
      } else {
            P.rangeClipLow = false; // Save some time especially on short runs.
      }
      P.rangeLow = 0.000000;   // default but ensure it is 0 for correct results in case rangeClipLow is true
      P.rangeClipHigh = false; // default, but ensure we do not clip high to avoid creating black dots.
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
      if (this.par.cropinfo_only.val || this.par.crop_use_rejection_low.val) {
            P.generateRejectionMaps = true;
      } else {
            P.generateRejectionMaps = false;
      }
      // P.generateIntegratedImage = true;
      // P.generateDrizzleData = false;
      if (this.par.cropinfo_only.val || this.par.crop_use_rejection_low.val) {
            P.closePreviousImages = true;
      } else {
            P.closePreviousImages = false; // Could be set to true to automatically suppress previuos result, but they are removed by the script
      }
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
                  // Effect of cache seems small (10 %) and may even negatively impact this.global
                  // performance as we do not calculate noise and may overwrite good cache data.
                  // Need further study
      P.evaluateSNR = false; // We do not use noise for our integration, save time
      // P.noiseEvaluationAlgorithm = ImageIntegration.NoiseEvaluation_MRS;
      // P.mrsMinDataFraction = 0.010;
      // P.psfStructureLayers = 5;
      // P.psfType = ImageIntegration.PSFType_Moffat4;
      // P.subtractPedestals = false;
      // P.truncateOnOutOfRange = false;
      P.noGUIMessages = true; // Default, but want to be sure as we are not interactive
      P.showImages = true; // To have the image on the workspace
      // P.useFileThreads = true;
      // P.fileThreadOverload = 1.00;
      // P.useBufferThreads = true;
      // P.maxBufferThreads = 0;


      P.executeGlobal();

      console.noteln("Warnings above about 'Inconsistent Instrument:Filter ...' above are normal, as we integrate all filters together");

      // Depending on integration options, some useless maps may be generated, especially low rejection map,
      // With the current integration parameters, these images are not generated,
      if (this.par.debug.val || this.par.cropinfo_only.val || this.par.crop_use_rejection_low.val) {
            this.util.windowShowif(P.lowRejectionMapImageId);
      } else {
            this.util.closeOneWindowById(P.lowRejectionMapImageId);
      }
      if (this.par.debug.val || this.par.cropinfo_only.val) {
            this.util.windowShowif(P.highRejectionMapImageId);
      } else {
            this.util.closeOneWindowById(P.highRejectionMapImageId);
      }
      if (this.par.debug.val || this.par.cropinfo_only.val) {
            this.util.windowShowif(P.slopeMapImageId);
      } else {
            this.util.closeOneWindowById(P.slopeMapImageId);
      }
      // KEEP (P.integrationImageId);

      this.engine_end_process(null);

      //console.writeln("Integration for CROP complete, \n", JSON.stringify(P, null, 2));

      //   console.writeln("highRejectionMapImageId ", P.highRejectionMapImageId)
      //   console.writeln("slopeMapImageId ", P.slopeMapImageId) 
      //   console.writeln("integrationImageId ", P.integrationImageId)
      //   console.writeln("lowRejectionMapImageId ", P.lowRejectionMapImageId)

      //console.writeln("Rename '",P.integrationImageId,"' to ",this.ppar.win_prefix + "LowRejectionMap_ALL")
      var new_name = this.util.windowRename(P.integrationImageId, this.ppar.win_prefix + "LowRejectionMap_ALL");

      if (this.par.use_drizzle.val && this.par.drizzle_scale.val > 1) {
            this.cropHandleDrizzle(new_name);
            if (this.par.crop_use_rejection_low.val) {
                  this.cropHandleDrizzle(P.lowRejectionMapImageId);
            }
      }
      this.engine_end_process(null);

      this.setAutoIntegrateVersionIfNeeded(this.util.findWindow(new_name));

      if (this.par.crop_use_rejection_low.val) {
            // We use the low rejection map to find the area common to all images
            return { integrated_image_id: new_name, rejection_map_id: P.lowRejectionMapImageId };
      } else {
            return { integrated_image_id: new_name, rejection_map_id: new_name };
      }
}

/* Do not run gradient correction so just make copy of the source window as
 * is done by AutomaticBackgroundExtractor or GraXpert.
 */
noGradientCorrectionCopyWin(win)
{
      var new_win_id = win.mainView.id;
      var fix_postfix = "_map_pm";
      if (new_win_id.endsWith(fix_postfix)) {
            new_win_id = new_win_id.substring(0, new_win_id.length - fix_postfix.length);
      }
      var noGC_id = this.util.ensure_win_prefix(this.util.replacePostfixOrAppend(new_win_id, ["_map", "_combined"], "_processed"));
      this.util.addProcessingStep("No gradient correction for " + win.mainView.id + ", copy to " + noGC_id);
      this.util.addScriptWindow(noGC_id);
      this.util.copyWindow(win, noGC_id);
      return noGC_id;
}

// Run GraXpert deconvolution
runGraXpertDeconvolution(win)
{
      var node = this.flowchart.flowchartOperation("GraXpert deconvolution");
      if (this.global.get_flowchart_data) {
            return;
      }

      if (this.par.graxpert_median_psf.val || this.par.graxpert_deconvolution_stellar_psf.val > 0) {
            console.writeln("GraXpert deconvolution stars");
            this.runGraXpertExternal(win, this.GraXpertCmd.deconvolution_stars);
      }
      if (this.par.graxpert_median_psf.val || this.par.graxpert_deconvolution_nonstellar_psf.val > 0) {
            console.writeln("GraXpert deconvolution object");
            this.runGraXpertExternal(win, this.GraXpertCmd.deconvolution_object);
      }
      this.engine_end_process(node, win, "GraXpert deconvolution");
}


// Run GraXpert as an external process.
// With option this.GraXpertCmd.background we return a new image.
// Other options update the input image directly.
// With option this.GraXpertCmd.denoise we do this.flowchart operations here.
runGraXpertExternal(win, cmd)
{
      switch (cmd) {
            case this.GraXpertCmd.background:
            case this.GraXpertCmd.deconvolution_stars:
            case this.GraXpertCmd.deconvolution_object:
                  // Flowchart is handled in upper levels
                  var node = null;
                  break;
            case this.GraXpertCmd.denoise:
                  var node = this.flowchart.flowchartOperation("GraXpert denoise");
                  break;
            default:
                  this.util.throwFatalError("Unknown GraXpert command " + cmd);
      }

      if (this.par.graxpert_path.val == "") {
            this.save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
            this.util.throwFatalError("GraXpert path is empty, please add path to GraXpert binary in Gradient correction section");
      }
      if (!File.exists(this.par.graxpert_path.val)) {
            console.noteln("GraXpert path does not exist: " + this.par.graxpert_path.val);
      }

      var copy_win = this.util.copyWindowEx(win, "AutoIntegrateTemp", true);

      var image_id_name = "AutoIntegrateImageId";
      var image_id = Date.now().toString();

      this.util.setFITSKeyword(copy_win, image_id_name, image_id, "Image processing id.");

      var fname = File.systemTempDirectory + "/AutoIntegrateTemp.xisf";
      console.writeln("GraXpert input file " + fname);
      if (!copy_win.saveAs(fname, false, false, false, false)) {
            this.util.closeOneWindowById(copy_win.mainView.id);
            this.save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
            this.util.throwFatalError("Failed to save image for GraXpert: " + fname);
      }

      this.util.closeOneWindowById(copy_win.mainView.id);

      if (cmd == this.GraXpertCmd.deconvolution_stars || cmd == this.GraXpertCmd.deconvolution_object) {
            if (this.par.graxpert_median_psf.val) {
                  var psf = this.medianFWHM;
                  if (psf == null) {
                        // Get psf from image header
                        psf = this.util.getKeywordValue(win, "AutoIntegrateMEDFWHM");
                        if (psf != null) {
                              // Convert to number
                              psf = parseFloat(psf);
                        }
                  }
                  if (psf == null) {
                        this.save_images_in_save_id_list(); // Save images so we can return with AutoContinue
                        this.util.throwFatalError("Cannot run GraXpert deconvolution, AutoIntegrateMEDFWHM is not calculated. Maybe subframe selector was not run, or not using XISF/FITS image with proper header values.");
                  }
                  console.writeln("Using PSF " + psf + " from AutoIntegrateMEDFWHM value");
            } else if (cmd == this.GraXpertCmd.deconvolution_stars) {
                  var psf = this.par.graxpert_deconvolution_stellar_psf.val;
            } else {
                  var psf = this.par.graxpert_deconvolution_nonstellar_psf.val;
            }
      } 

      switch (cmd) {
            case this.GraXpertCmd.background:
                  var command = '"' + this.par.graxpert_path.val + '"' + " -cli -cmd background-extraction " + '"' + fname + '"' + 
                                " -correction " + this.par.graxpert_correction.val + " -smoothing " + this.par.graxpert_smoothing.val;
                  break;
            case this.GraXpertCmd.denoise:
                  var command = '"' + this.par.graxpert_path.val + '"' + " -cli -cmd denoising -strength " + this.par.graxpert_denoise_strength.val + 
                                " -batch_size " + this.par.graxpert_denoise_batch_size.val + ' "' + fname + '"';
                  break;
            case this.GraXpertCmd.deconvolution_stars:
                  var command = '"' + this.par.graxpert_path.val + '"' + " -cli -cmd deconv-stellar -strength " + this.par.graxpert_deconvolution_stellar_strength.val + 
                                " -psfsize " + psf + ' "' + fname + '"';
                  break;
            case this.GraXpertCmd.deconvolution_object:
                  var command = '"' + this.par.graxpert_path.val + '"' + " -cli -cmd deconv-obj -strength " + this.par.graxpert_deconvolution_nonstellar_strength.val + 
                                 " -psfsize " + psf + ' "' + fname + '"';
                  break;
            default:
                  this.util.throwFatalError("Unknown GraXpert command " + cmd);
      }

      console.writeln("GraXpert command " + command);

      var P = new ExternalProcess();
      console.writeln("GraXpert processing...");
      P.start(command);
      while (P.isStarting) {
            CoreApplication.processEvents();
      }
      while (P.isRunning) {
            CoreApplication.processEvents();
      }
      console.writeln("GraXpert finished");

      var graxpert_fname = fname.replace(".xisf", "_GraXpert.xisf");
      console.writeln("GraXpert output file " + graxpert_fname);

      var imgWin = this.util.openImageWindowFromFile(graxpert_fname, true);

      if (imgWin != null) {
            imgWin.show();
            var processed_image_id = this.util.getKeywordValue(imgWin, image_id_name);
      }
      if (imgWin == null || processed_image_id != image_id) {
            if (imgWin != null) {
                  this.util.closeOneWindowById(imgWin.mainView.id);
            }
            console.criticalln("GraXpert failed to run, possible reasons could be");
            console.criticalln("- GraXpert path is incorrect.");
            console.criticalln("- GraXpert version is not compatible with selected options.");
            console.criticalln("- GraXpert AI model is not loaded. To load the AI model, run GraXpert manually once and close it. AutoIntegrate uses the default model.");
            this.save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
            if (imgWin == null) {
                  this.util.throwFatalError("GraXpert did not run, failed to open processed image: " + graxpert_fname);
            } else {
                  this.util.throwFatalError("GraXpert did not run, processed image id mismatch: " + processed_image_id + " != " + image_id);
            }
      }

      if (cmd == this.GraXpertCmd.background) {
            console.writeln("GraXpert output window " + imgWin.mainView.id);
            imgWin.copyAstrometricSolution(win);
      } else {
            win.mainView.beginProcess(UndoFlag.NoSwapFile);
            win.mainView.image.assign(imgWin.mainView.image);
            win.mainView.endProcess();
            imgWin.forceClose();
            imgWin = win;
      }
      if (cmd == this.GraXpertCmd.denoise) {
            this.engine_end_process(node, imgWin, "GraXpert denoise");
      }

      return imgWin;
}

// Run GraXpert on an image
runGraXpert(win, replaceTarget, postfix, from_lights)
{
      if (from_lights) {
            var node = null;
      } else {
            var node = this.flowchart.flowchartOperation("GraXpert");
      }
      if (replaceTarget) {
            if (!this.global.get_flowchart_data || this.par.debug.val) {
                  this.util.addProcessingStepAndStatusInfo("Run GraXpert on image " + win.mainView.id);
            }
            var GC_id = win.mainView.id;
      } else {
            var GC_id = this.util.ensure_win_prefix(this.util.replacePostfixOrAppend(win.mainView.id, ["_map", "_combined"], postfix));
            if (!this.global.get_flowchart_data || this.par.debug.val) {
                  this.util.addProcessingStepAndStatusInfo("Run GraXpert from image " + win.mainView.id + ", target image " + GC_id);
            }
      }
      if (!this.global.get_flowchart_data) {
            console.writeln("GraXpert using correction " + this.par.graxpert_correction.val + ' and smoothing ' + this.par.graxpert_smoothing.val);
      }

      if (this.global.get_flowchart_data) {
            var imgWin = this.util.copyWindowEx(win, "AutoIntegrateTemp", true);
      } else {
            var imgWin = this.runGraXpertExternal(win, this.GraXpertCmd.background);
      }

      if (replaceTarget) {
            if (!this.global.get_flowchart_data || this.par.debug.val) {
                  console.writeln("GraXpert replace target " + GC_id);
            }
            this.util.closeOneWindowById(win.mainView.id);
            var copyWin = this.util.copyWindowEx(imgWin, GC_id, true);
      } else {
            if (!this.global.get_flowchart_data || this.par.debug.val) {
                  console.writeln("GraXpert create target " + GC_id);
            }
            var copyWin = this.util.copyWindowEx(imgWin, GC_id, true);
      }
      this.util.closeOneWindowById(imgWin.mainView.id);
      copyWin.show();

      if (!this.global.get_flowchart_data || this.par.debug.val) {
            console.writeln("GraXpert output window " + copyWin.mainView.id);
      }
      this.engine_end_process(node, this.util.findWindow(GC_id), "GraXpert");

      return GC_id;
}

runABEex(win, replaceTarget, postfix, skip_flowchart, degree = null, normalize = null, correction = null)
{
      if (skip_flowchart) {
            var node = null;
      } else {
            var node = this.flowchart.flowchartOperation("AutomaticBackgroundExtractor");
      }
      if (degree == null) {
            degree = this.par.ABE_degree.val;
      }
      if (normalize == null) {
            normalize = this.par.ABE_normalize.val;
      }
      if (correction == null) {
            correction = this.par.ABE_correction.val;
      }
      if (replaceTarget) {
            this.util.addProcessingStepAndStatusInfo("Run ABE on image " + win.mainView.id);
            var GC_id = win.mainView.id;
      } else {
            var GC_id = this.util.ensure_win_prefix(this.util.replacePostfixOrAppend(win.mainView.id, ["_map", "_combined"], postfix));
            this.util.addProcessingStepAndStatusInfo("Run ABE from image " + win.mainView.id + ", target image " + GC_id);
      }
      console.writeln("ABE using degree " + degree + ', correction ' + correction + ", normalize " + normalize);

      var P = new AutomaticBackgroundExtractor;
      P.correctedImageId = GC_id;
      P.replaceTarget = replaceTarget;
      P.discardModel = this.par.GC_output_background_model.val ? false : true;
      if (correction == 'Subtraction') {
            P.targetCorrection = AutomaticBackgroundExtractor.Correction_Subtract;
      } else if (correction == 'Division') {
            P.targetCorrection = AutomaticBackgroundExtractor.Correction_Divide;
      } else {
            this.save_images_in_save_id_list(); // Save images so we can return with AutoContinue
            this.util.throwFatalError("Unknown ABE correction " + correction);
      }
      P.polyDegree = degree;
      P.normalize = normalize;

      if (this.par.debug.val) {
            console.writeln("DEBUG: ABE parameters:");
            console.writeln(P.toSource());
      }

      win.mainView.beginProcess(UndoFlag.NoSwapFile);

      P.executeOn(win.mainView, false);

      win.mainView.endProcess();

      this.printAndSaveProcessValues(P, this.findChannelFromNameIf(win.mainView.id), win.mainView.id);
      this.engine_end_process(null);

      this.util.addScriptWindow(GC_id);

      if (!replaceTarget) {
            if (this.global.pixinsight_version_num >= 1080902) {
                  var targetWindow = this.util.findWindow(GC_id);
                  if (targetWindow != null) {
                        targetWindow.copyAstrometricSolution(win);
                  }
            }
      }
      this.engine_end_process(node, this.util.findWindow(GC_id), "AutomaticBackgroundExtractor");

      return GC_id;
}

runGCProcess(win, replaceTarget, postfix, from_lights)
{
      if (from_lights) {
            var node = null;
      } else {
            var node = this.flowchart.flowchartOperation("GradientCorrection");
      }
      if (replaceTarget) {
            this.util.addProcessingStepAndStatusInfo("Run GradientCorrection on image " + win.mainView.id);
            var GC_id = win.mainView.id;
      } else {
            var GC_id = this.util.ensure_win_prefix(this.util.replacePostfixOrAppend(win.mainView.id, ["_map", "_combined"], postfix));
            this.util.addProcessingStepAndStatusInfo("Run GradientCorrection from image " + win.mainView.id + ", target image " + GC_id);
            win = this.util.copyWindowEx(win, GC_id, true);
      }
      console.writeln("GradientCorrection using Smoothness " + this.par.gc_smoothness.val + 
                      ', Automatic convergence ' + this.par.gc_automatic_convergence.val +
                      ", Structure Protection " + this.par.gc_structure_protection.val +
                      ", Protection threshold " + this.par.gc_protection_threshold.val + 
                      ", Protection amount " + this.par.gc_protection_amount.val);

      if (this.global.get_flowchart_data) {
            return GC_id;
      }
      
      var P = new GradientCorrection;
      P.scale = this.par.gc_scale.val;
      P.smoothness = this.par.gc_smoothness.val;
      P.protection = this.par.gc_structure_protection.val;
      P.protectionThreshold = this.par.gc_protection_threshold.val;
      P.protectionAmount = this.par.gc_protection_amount.val;
      P.protectionSmoothingFactor = 16;
      P.automaticConvergence = this.par.gc_automatic_convergence.val;
      P.generateProtectionMasks = false;
      P.useSimplification = this.par.gc_simplified_model.val;
      P.simplificationDegree = this.par.gc_simplified_model_degree.val;
      P.generateGradientModel = this.par.GC_output_background_model.val;

      if (this.par.debug.val) {
            this.util.copyWindowEx(win, win.mainView.id + "_GC_before", true);
      }

      var succp = P.executeOn(win.mainView, false);
      if (!succp) {
            this.util.addCriticalStatus("GradientCorrection failed");
      } else {
            if (this.par.debug.val) {
                  this.util.copyWindowEx(win, win.mainView.id + "_GC_after", true);
            }
      }

      this.printAndSaveProcessValues(P, this.findChannelFromNameIf(win.mainView.id), win.mainView.id);

      this.engine_end_process(node, this.util.findWindow(GC_id), "GradientCorrection");

      return GC_id;
}

runSpectrophotometricFluxCalibration(win)
{
      var node = this.flowchart.flowchartOperation("SpectrophotometricFluxCalibration");

      if (this.global.get_flowchart_data) {
            return;
      }

      var P = new SpectrophotometricFluxCalibration;
      P.narrowbandMode = this.is_narrowband_files && !this.is_rgb_files && !this.is_color_files;
      P.grayFilterTrCurve = "300,0,380,0,400,1,500,1,675,1,710,0,800,0";
      P.grayFilterName = "Astronomik UV-IR Block L-2";
      P.redFilterTrCurve = "400,0.088,402,0.084,404,0.080,406,0.076,408,0.072,410,0.068,412,0.065,414,0.061,416,0.058,418,0.055,420,0.052,422,0.049,424,0.046,426,0.044,428,0.041,430,0.039,432,0.037,434,0.035,436,0.033,438,0.031,440,0.030,442,0.028,444,0.027,446,0.026,448,0.025,450,0.024,452,0.023,454,0.022,456,0.021,458,0.021,460,0.021,462,0.020,464,0.020,466,0.020,468,0.020,470,0.020,472,0.021,474,0.021,476,0.022,478,0.022,480,0.023,482,0.024,484,0.025,486,0.026,488,0.027,490,0.028,492,0.029,494,0.031,496,0.032,498,0.034,500,0.036,502,0.037,504,0.039,506,0.041,508,0.043,510,0.045,512,0.048,514,0.050,516,0.052,518,0.055,520,0.057,522,0.060,524,0.063,526,0.071,528,0.072,530,0.070,532,0.067,534,0.064,536,0.059,538,0.054,540,0.050,542,0.045,544,0.041,546,0.037,548,0.034,550,0.032,552,0.031,554,0.031,556,0.032,558,0.035,560,0.038,562,0.043,564,0.048,566,0.055,568,0.062,570,0.070,572,0.122,574,0.187,576,0.262,578,0.346,580,0.433,582,0.521,584,0.606,586,0.686,588,0.755,590,0.812,592,0.851,594,0.871,596,0.876,598,0.885,600,0.892,602,0.896,604,0.897,606,0.897,608,0.895,610,0.891,612,0.887,614,0.882,616,0.878,618,0.873,620,0.870,622,0.867,624,0.863,626,0.860,628,0.858,630,0.856,632,0.854,634,0.852,636,0.850,638,0.848,640,0.846,642,0.844,644,0.841,646,0.837,648,0.834,650,0.829,652,0.824,654,0.819,656,0.813,658,0.806,660,0.799,662,0.791,664,0.783,666,0.774,668,0.765,670,0.755,672,0.745,674,0.735,676,0.725,678,0.715,680,0.704,682,0.695,684,0.685,686,0.676,688,0.668,690,0.660,692,0.654,694,0.649,696,0.648,698,0.649,700,0.649";
      P.redFilterName = "Sony Color Sensor R-UVIRcut";
      P.greenFilterTrCurve = "400,0.089,402,0.086,404,0.082,406,0.079,408,0.075,410,0.071,412,0.066,414,0.062,416,0.058,418,0.053,420,0.049,422,0.045,424,0.042,426,0.041,428,0.042,430,0.043,432,0.044,434,0.046,436,0.047,438,0.049,440,0.051,442,0.053,444,0.055,446,0.057,448,0.059,450,0.061,452,0.064,454,0.067,456,0.069,458,0.072,460,0.075,462,0.098,464,0.130,466,0.169,468,0.215,470,0.267,472,0.323,474,0.382,476,0.443,478,0.505,480,0.566,482,0.627,484,0.684,486,0.739,488,0.788,490,0.832,492,0.868,494,0.896,496,0.915,498,0.924,500,0.921,502,0.939,504,0.947,506,0.954,508,0.961,510,0.967,512,0.973,514,0.978,516,0.982,518,0.986,520,0.989,522,0.992,524,0.994,526,0.996,528,0.997,530,0.997,532,0.995,534,0.990,536,0.986,538,0.981,540,0.977,542,0.973,544,0.969,546,0.965,548,0.960,550,0.955,552,0.949,554,0.943,556,0.936,558,0.928,560,0.919,562,0.909,564,0.898,566,0.887,568,0.874,570,0.860,572,0.845,574,0.829,576,0.812,578,0.794,580,0.775,582,0.754,584,0.733,586,0.711,588,0.688,590,0.665,592,0.640,594,0.615,596,0.589,598,0.563,600,0.537,602,0.510,604,0.483,606,0.456,608,0.430,610,0.403,612,0.377,614,0.352,616,0.328,618,0.304,620,0.282,622,0.261,624,0.242,626,0.224,628,0.225,630,0.216,632,0.207,634,0.199,636,0.192,638,0.185,640,0.179,642,0.174,644,0.169,646,0.165,648,0.161,650,0.158,652,0.156,654,0.155,656,0.154,658,0.154,660,0.155,662,0.156,664,0.158,666,0.162,668,0.165,670,0.170,672,0.176,674,0.182,676,0.189,678,0.198,680,0.207,682,0.217,684,0.228,686,0.240,688,0.240,690,0.248,692,0.257,694,0.265,696,0.274,698,0.282,700,0.289";
      P.greenFilterName = "Sony Color Sensor G-UVIRcut";
      P.blueFilterTrCurve = "400,0.438,402,0.469,404,0.496,406,0.519,408,0.539,410,0.557,412,0.572,414,0.586,416,0.599,418,0.614,420,0.631,422,0.637,424,0.647,426,0.658,428,0.670,430,0.682,432,0.695,434,0.708,436,0.720,438,0.732,440,0.743,442,0.753,444,0.762,446,0.770,448,0.777,450,0.783,452,0.788,454,0.791,456,0.794,458,0.796,460,0.797,462,0.798,464,0.798,466,0.799,468,0.800,470,0.801,472,0.800,474,0.798,476,0.793,478,0.785,480,0.774,482,0.760,484,0.742,486,0.707,488,0.669,490,0.633,492,0.598,494,0.565,496,0.533,498,0.502,500,0.473,502,0.446,504,0.419,506,0.394,508,0.370,510,0.348,512,0.326,514,0.306,516,0.287,518,0.268,520,0.251,522,0.235,524,0.220,526,0.205,528,0.192,530,0.179,532,0.167,534,0.156,536,0.145,538,0.136,540,0.126,542,0.118,544,0.110,546,0.102,548,0.095,550,0.089,552,0.083,554,0.077,556,0.071,558,0.066,560,0.061,562,0.057,564,0.052,566,0.048,568,0.044,570,0.039,572,0.041,574,0.039,576,0.037,578,0.035,580,0.033,582,0.032,584,0.030,586,0.029,588,0.027,590,0.026,592,0.025,594,0.024,596,0.023,598,0.022,600,0.022,602,0.021,604,0.021,606,0.020,608,0.020,610,0.020,612,0.020,614,0.020,616,0.020,618,0.021,620,0.021,622,0.022,624,0.022,626,0.023,628,0.024,630,0.025,632,0.026,634,0.027,636,0.028,638,0.030,640,0.031,642,0.033,644,0.035,646,0.036,648,0.038,650,0.040,652,0.042,654,0.045,656,0.048,658,0.051,660,0.054,662,0.057,664,0.059,666,0.061,668,0.063,670,0.065,672,0.066,674,0.068,676,0.069,678,0.070,680,0.071,682,0.072,684,0.072,686,0.073,688,0.073,690,0.073,692,0.073,694,0.073,696,0.073,698,0.073,700,0.073";
      P.blueFilterName = "Sony Color Sensor B-UVIRcut";
      P.grayFilterWavelength = 656.3;
      P.grayFilterBandwidth = 3.0;
      P.redFilterWavelength = 656.3;
      P.redFilterBandwidth = 3.0;
      P.greenFilterWavelength = 500.7;
      P.greenFilterBandwidth = 3.0;
      P.blueFilterWavelength = 500.7;
      P.blueFilterBandwidth = 3.0;
      P.deviceQECurve = "1,1.0,500,1.0,1000,1.0,1500,1.0,2000,1.0,2500,1.0";
      P.deviceQECurveName = "Ideal QE curve";
      P.broadbandIntegrationStepSize = 0.50;
      P.narrowbandIntegrationSteps = 10;
      P.rejectionLimit = 0.30;
      P.catalogId = "GaiaDR3SP";
      P.minMagnitude = 0.00;
      P.limitMagnitude = 12.00;
      P.autoLimitMagnitude = true;
      P.psfStructureLayers = 5;
      P.saturationThreshold = 0.75;
      P.saturationRelative = true;
      P.saturationShrinkFactor = 0.10;
      P.psfNoiseLayers = 1;
      P.psfHotPixelFilterRadius = 1;
      P.psfNoiseReductionFilterRadius = 0;
      P.psfMinStructureSize = 0;
      P.psfMinSNR = 40.00;
      P.psfAllowClusteredSources = false;
      P.psfType = SpectrophotometricFluxCalibration.PSFType_Auto;
      P.psfGrowth = 1.75;
      P.psfMaxStars = 24576;
      P.psfSearchTolerance = 4.00;
      P.psfChannelSearchTolerance = 2.00;
      P.generateGraphs = false;
      P.generateStarMaps = false;
      P.generateTextFiles = false;
      P.outputDirectory = "";

      console.writeln("SpectrophotometricFluxCalibration on " + win.mainView.id);
      
      try {
            var succp = P.executeOn(win.mainView, false);
            if (!succp) {
                  this.util.addCriticalStatus("SpectrophotometricFluxCalibration failed on " + win.mainView.id);
            }
      } catch (e) {
            this.util.addCriticalStatus("SpectrophotometricFluxCalibration failed with error: " + e + ", image " + win.mainView.id);
            var succp = false;
      }

      if (succp) {
            console.writeln("SpectrophotometricFluxCalibration completed successfully on " + win.mainView.id);
      }

      this.printAndSaveProcessValues(P, "", win.mainView.id);
      this.engine_end_process(node, win, "SpectrophotometricFluxCalibration");
}

runMultiscaleGradientCorrectionProcess(win)
{
      console.writeln("MultiscaleGradientCorrection using scale " + this.par.mgc_scale.val);

      var node = this.flowchart.flowchartOperation("MultiscaleGradientCorrection");

      if (this.global.get_flowchart_data) {
            return true;
      }
      
      var P = new MultiscaleGradientCorrection;
      // Get MARS database location
      P.command = "set-default-database-files";
      P.executeGlobal();

      // Set other parameters
      P.command = "";
      P.useMARSDatabase = true;
      P.grayMARSFilter = "L";
      P.redMARSFilter = "R";
      P.greenMARSFilter = "G";
      P.blueMARSFilter = "B";
      P.referenceImageId = "";
      P.gradientScale = parseInt(this.par.mgc_scale.val);
      P.structureSeparation = this.par.mgc_structure_separation.val;
      P.modelSmoothness = 1.00;
      P.minFieldRatio = 0.017;
      P.maxFieldRatio = 0.167;
      P.enforceFieldLimits = true;
      P.scaleFactorRK = this.par.mgc_scale_factor.val;
      P.scaleFactorG = this.par.mgc_scale_factor.val;
      P.scaleFactorB = this.par.mgc_scale_factor.val;
      P.showGradientModel = this.par.GC_output_background_model.val;

      if (this.par.debug.val) {
            this.util.copyWindowEx(win, win.mainView.id + "_MGC_before", true);
      }

      var succp = P.executeOn(win.mainView, false);

      if (!succp) {
            console.criticalln("MultiscaleGradientCorrection failed");
      } else {
            if (this.par.debug.val) {
                  this.util.copyWindowEx(win, win.mainView.id + "_MGC_after", true);
            }
      }
      this.printAndSaveProcessValues(P, this.findChannelFromNameIf(win.mainView.id), win.mainView.id);
      this.engine_end_process(node, win, "MultiscaleGradientCorrection");

      return succp;
}

runMultiscaleGradientCorrection(win, replaceTarget, postfix, from_lights)
{
      if (from_lights) {
            this.util.throwFatalError("MultiscaleGradientCorrection not supported for all lights files");
      }
      if (replaceTarget) {
            this.util.addProcessingStepAndStatusInfo("Run MultiscaleGradientCorrection on image " + win.mainView.id);
            var GC_id = win.mainView.id;
      } else {
            var GC_id = this.util.ensure_win_prefix(this.util.replacePostfixOrAppend(win.mainView.id, ["_map", "_combined"], postfix));
            this.util.addProcessingStepAndStatusInfo("Run MultiscaleGradientCorrection from image " + win.mainView.id + ", target image " + GC_id);
            win = this.util.copyWindowEx(win, GC_id, true);
      }


      if (!this.imageSolver.imageIsAlreadySolved(win)) {
#ifdef AUTOINTEGRATE_STANDALONE
            this.util.throwFatalError("Image " + win.mainView.id + " is not plate solved. Please run PlateSolveProcess first.");
#endif
            /* If BlurXTerminator is available, we run it first in correct only mode.
             * Then we run SpectrophotometricFluxCalibration. Actual MultiscaleGradientCorrection
             * is run as the last step.
             */
            if (this.par.use_blurxterminator.val) {
                  this.runBlurXTerminator(win, true);      
            }
            this.imageSolver.runImageSolver(win.mainView.id);
      }
      this.runSpectrophotometricFluxCalibration(win);
      if (this.runMultiscaleGradientCorrectionProcess(win)) {
            return GC_id;
      } else {
            if (!replaceTarget) {
                  if (this.imageSolver.solved_imageId == win.mainView.id) {
                        console.writeln("Set solved image as null");
                        this.imageSolver.solved_imageId = null;
                  }
                  console.criticalln("MultiscaleGradientCorrection failed on image " + win.mainView.id + ", closing window");
                  win.forceClose();
            }
            return null;
      }
}

getGradientCorrectionName()
{
      if (this.par.use_graxpert.val) {
            return "GraXpert";
      } else if (this.par.use_abe.val) {
            return "AutomaticBackgroundExtractor";
      } else if (this.par.use_dbe.val) {
            return "DynamicBackgroundExtraction";
      } else if (this.par.use_multiscalegradientcorrection.val) {
            return "MultiscaleGradientCorrection";
      } else {
            return "GradientCorrection";
      }
}

// Get the default gradient correction method
// If skip_mgc is true, then MultiscaleGradientCorrection is not returned
// as the default method.
// This is used when MultiscaleGradientCorrection fails and we want to try
// some other gradient correction method.
// Note that the order of checking is important so we can return the correct
// default method if multiple methods are checked.
getDefaultGradientCorrectionMethod(skip_mgc = false)
{
      if (this.par.use_multiscalegradientcorrection.val && !skip_mgc) {
            return "MultiscaleGradientCorrection";
      } else if (this.par.use_graxpert.val) {
            return "GraXpert";
      } else if (this.par.use_abe.val) {
            return "ABE";
      } else if (this.par.use_dbe.val) {
            return "DBE";
      } else {
            return "GradientCorrection";
      }
}

runGradientCorrectionEx(win, replaceTarget, postfix, from_lights, gc_method = 'Auto')
{
      if (gc_method == 'Auto') {
            gc_method = this.getDefaultGradientCorrectionMethod();
      }
      if (gc_method == 'GraXpert') {
            var GC_id = this.runGraXpert(win, replaceTarget, postfix, from_lights);
      } else if (gc_method == 'ABE') {
            var GC_id = this.runABEex(win, replaceTarget, postfix, from_lights);
      } else if (gc_method == 'DBE') {
            var GC_id = this.runDBE(win, replaceTarget, postfix, from_lights);
      } else if (gc_method == 'MultiscaleGradientCorrection') {
            var GC_id = this.runMultiscaleGradientCorrection(win, replaceTarget, postfix, from_lights);
            if (GC_id == null) {
                  // MultiscaleGradientCorrection failed, try some other gradient correct.
                  // Since the full sky area is not available for MultiscaleGradientCorrection,
                  // we can try some other gradient correction method.
                  // We recurse back to this with a specific method to try.
                  gc_method = this.getDefaultGradientCorrectionMethod(true);
                  this.util.addCriticalStatus("MultiscaleGradientCorrection failed on image " + win.mainView.id + ", using " + gc_method);
                  var GC_id = this.runGradientCorrectionEx(win, replaceTarget, postfix, from_lights, gc_method);
            }
      } else {
            var GC_id = this.runGCProcess(win, replaceTarget, postfix, from_lights);
      }
      return GC_id;
}

runGradientCorrection(win, replaceTarget, gc_method = 'Auto')
{
      return this.runGradientCorrectionEx(win, replaceTarget, "_processed", false, gc_method);
}

// Run gradient correction and rename windows so that the final result has the same id
runGradientCorrectionBeforeChannelCombination(id)
{
      if (id == null) {
            this.save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
            this.util.throwFatalError("No image for gradient correction, maybe some previous step like star alignment failed");
      }
      var id_win = ImageWindow.windowById(id);
      this.runGradientCorrectionEx(id_win, true, "", false);
      return id;
}

/* this.applyAutoSTF routine is from PixInsight scripts.
 *
 */
applyAutoSTF(view, shadowsClipping, targetBackground, rgbLinked, silent)
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
       * Try to find how many this.channels look as this.channels of an inverted image.
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
       * Unlinked RGB this.channels: Compute automatic stretch functions for
       * individual RGB this.channels separately.
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
   view.beginProcess(UndoFlag.NoSwapFile);

   stf.executeOn(view);

   view.endProcess();

   this.engine_end_process(null);

   if (!silent) {
      console.writeln("<end><cbr/><br/>");
   }
}

/* this.applySTF routine is from PixInsight scripts.
 */
applySTF(imgView, stf, iscolor, save_process = false)
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

      imgView.beginProcess(UndoFlag.NoSwapFile);

      HT.executeOn(imgView, false);

      imgView.endProcess();

      if (save_process) {
            this.printAndSaveProcessValues(HT, "autostf_" + this.findChannelFromNameIf(imgView.id), imgView.id);
      }     
      this.engine_end_process(null);
}

getRgbLinked(win, iscolor)
{
      if (this.par.STF_linking.val == 'Linked') {
            console.writeln("RGB channels linked selected by user");
            return true;  
      } else if (this.par.STF_linking.val == 'Unlinked') {
            console.writeln("RGB channels unlinked selected by user");
            return false;  
      } else {
            // auto, use default
            var rgbLinked;
            if (this.process_narrowband) {
                  let linear_fit_done = this.util.findKeywordName(win, "AutoLinearfit");
                  let spcc_color_calibration_done = this.util.findKeywordName(win, "AutoSPCC");
                  if (linear_fit_done) {
                        console.writeln("Narrowband and linear fit done, use RGB channels linked");
                        rgbLinked = true;
                  } else if (spcc_color_calibration_done && this.H_in_R_channel) {
                        console.writeln("Narrowband, SPCC and H mapped into red channel, use RGB channels linked");
                        rgbLinked = true;
                  } else {
                        console.writeln("Default narrowband, use RGB channels unlinked");
                        rgbLinked = false;
                  }
            } else if (this.is_color_files && iscolor) {
                  // We have color/OSC images and a color file, we use unlinked stretch
                  // to get rid of possible color cast
                  console.writeln("Color file, use RGB channels unlinked");
                  rgbLinked = false;
            } else {
                  // Assume color calibration has balanced the this.channels, use linked stretch
                  console.writeln("Use default RGB channels linked");
                  rgbLinked = true;
            }
            return rgbLinked;
      }
}

runAutoSTFex(GC_win, iscolor, targetBackground, silent, rgbLinked, save_process = false)
{
      if (!silent) {
            this.util.addProcessingStep("Run histogram transform on " + GC_win.mainView.id + " based on autostretch, targetBackground " + targetBackground);
      }

      /* Apply autostretch on image */
      if (rgbLinked == null) {
            // null means undefined, use default
            rgbLinked = this.getRgbLinked(GC_win, iscolor);
      }
      this.applyAutoSTF(GC_win.mainView,
                  this.global.DEFAULT_AUTOSTRETCH_SCLIP,
                  targetBackground,
                  rgbLinked,
                  silent);
      var stf_to_use = GC_win.mainView.stf;

      /* Run histogram transfer based on autostretch */
      this.applySTF(GC_win.mainView, stf_to_use, iscolor, save_process);

      /* Undo autostretch */
      if (!silent) {
            console.writeln("  Undo STF on " + GC_win.mainView.id);
      }
      var stf = new ScreenTransferFunction;

      GC_win.mainView.beginProcess(UndoFlag.NoSwapFile);

      if (!silent) {
            console.writeln(" Execute autostretch on " + GC_win.mainView.id);
      }
      stf.executeOn(GC_win.mainView);

      GC_win.mainView.endProcess();

      this.engine_end_process(null);
}

autoStretch(imgWin, silent = true)
{
      this.runAutoSTFex(
            imgWin, 
            imgWin.mainView.image.isColor, 
            this.global.DEFAULT_AUTOSTRETCH_TBGND, 
            silent, 
            null);     // rgbLinked, null = use default
}

runHistogramTransformAutoSTF(GC_win, iscolor, targetBackground)
{
      return this.runAutoSTFex(
                  GC_win, 
                  iscolor, 
                  targetBackground, 
                  false,      // silent
                  null,       // rgbLinked, null = use default
                  true);      // save_process
}

runHistogramTransformMultiscaleAdaptiveStretch(GC_win, image_stretching)
{
      console.writeln("Execute MultiscaleAdaptiveStretch on " + GC_win.mainView.id);

      if (this.par.MAS_backgroundReference.val) {
            var roi = this.findTrueBackground(GC_win, false);
            if (roi != null) {
                  console.writeln("  Found background reference at ROI: (" + roi.x0 + ", " + roi.y0 + ") - (" + roi.x1 + ", " + roi.y1 + ")");
            } else {
                  console.writeln("  No valid background reference found, proceeding without background ROI");
            }
      } else {
            var roi = null;
      }

      try {
            var P = new MultiscaleAdaptiveStretch;
      } catch (e) {
            this.util.throwFatalError("MultiscaleAdaptiveStretch not available");
      }

      P.aggressiveness = this.par.MAS_aggressiveness.val;
      P.targetBackground = this.par.MAS_targetBackground.val;
      P.dynamicRangeCompression = this.par.MAS_dynamicRangeCompression.val;
      P.contrastRecovery = this.par.MAS_contrastRecovery.val;
      P.scaleSeparation = parseInt(this.par.MAS_scaleSeparation.val);
      P.contrastRecoveryIntensity = this.par.MAS_contrastRecoveryIntensity.val;
      P.previewLargeScale = false;
      P.saturationEnabled = this.par.MAS_colorSaturation.val;
      P.saturationAmount = this.par.MAS_colorSaturation_amount.val;
      P.saturationBoost = this.par.MAS_colorSaturation_boost.val;
      P.saturationLightnessMask = this.par.MAS_colorSaturation_lightness.val;

      if (roi != null) {
            P.backgroundROIEnabled = true;
            P.backgroundROIX0 = roi.x0;
            P.backgroundROIY0 = roi.y0;
            P.backgroundROIWidth = roi.x1 - roi.x0;
            P.backgroundROIHeight = roi.y1 - roi.y0;
      } else {
            P.backgroundROIEnabled = false;
      }

      GC_win.mainView.beginProcess(UndoFlag.NoSwapFile);
      P.executeOn(GC_win.mainView);
      GC_win.mainView.endProcess();

      this.printAndSaveProcessValues(P, "MultiscaleAdaptiveStretch", GC_win.mainView.id);
      this.engine_end_process(null);

      return GC_win;
}

histogramPrestretch(GC_win, target_val)
{
      console.writeln("Execute prestretch using HistogramTransformation on " + GC_win.mainView.id);
      this.adjustHistogram(GC_win, target_val);
      return GC_win;
}

runHistogramTransformMaskedStretch(GC_win, image_stretching, histogram_prestretch)
{
      this.util.addProcessingStepAndStatusInfo("Run histogram transform on " + GC_win.mainView.id + " using " + image_stretching);
      
      if (histogram_prestretch) {
            GC_win = this.histogramPrestretch(GC_win, this.par.MaskedStretch_prestretch_target.val);
      }

      var P = new MaskedStretch;
      P.targetBackground = this.par.MaskedStretch_targetBackground.val;

      GC_win.mainView.beginProcess(UndoFlag.NoSwapFile);

      console.writeln("Execute MaskedStretch on " + GC_win.mainView.id);
      P.executeOn(GC_win.mainView);

      GC_win.mainView.endProcess();

      this.printAndSaveProcessValues(P, this.findChannelFromNameIf(GC_win.mainView.id), GC_win.mainView.id);
      this.engine_end_process(null);

      return GC_win;
}

runHistogramTransformVeraLuxHMS(GC_win, image_stretching)
{
      this.util.addProcessingStepAndStatusInfo("Run histogram transform using VeraLuxHMS on " + GC_win.mainView.id + " using " + image_stretching);

      // Set parameters
      if (this.par.veralux_sensor_profile.val != 'Default') {
            this.veralux.parameters.sensorProfile = this.par.veralux_sensor_profile.val;
      }
      this.veralux.parameters.processingMode = this.par.veralux_processing_mode.val;
      this.veralux.parameters.targetBg = this.par.veralux_target_bg.val;
      this.veralux.parameters.useAdaptiveAnchor = this.par.veralux_adaptive_anchor.val;
      this.veralux.parameters.useAutoD = this.par.veralux_auto_calc_D.val;
      this.veralux.parameters.logD = this.par.veralux_D_value.val;
      this.veralux.parameters.protectB = this.par.veralux_b_value.val;
      this.veralux.parameters.convergencePower = this.par.veralux_convergence_power.val;
      this.veralux.parameters.colorStrategy = this.par.veralux_color_strategy.val;
      this.veralux.parameters.colorGrip = this.par.veralux_color_grip.val;
      this.veralux.parameters.shadowConvergence = this.par.veralux_shadow_convergence.val;

      this.veralux.executeVeraLux(GC_win, this.global, this.util);

      return GC_win;
}

runHistogramTransformArcsinhStretch(GC_win, image_stretching, histogram_poststretch)
{
      this.util.addProcessingStepAndStatusInfo("Run histogram transform on " + GC_win.mainView.id + " using " + image_stretching);

      var stretch = Math.pow(this.par.Arcsinh_stretch_factor.val, 1/this.par.Arcsinh_iterations.val);

      console.writeln("Execute ArcsinhStretch on " + GC_win.mainView.id);

      for (var i = 0; i < this.par.Arcsinh_iterations.val; i++) {

            var P = new ArcsinhStretch;
            P.stretch = stretch;
            P.blackPoint = this.findSymmetryPoint(GC_win, this.par.Arcsinh_black_point.val);
            if (P.blackPoint > 0.20) {
                  P.blackPoint = 0.20;
            }
            P.protectHighlights = false;  // setting to true does not work well

            GC_win.mainView.beginProcess(UndoFlag.NoSwapFile);

            P.executeOn(GC_win.mainView);

            GC_win.mainView.endProcess();

            this.printAndSaveProcessValues(P, this.findChannelFromNameIf(GC_win.mainView.id), GC_win.mainView.id);
            this.engine_end_process(null);
            this.util.runGarbageCollection();

            var peak_val = this.findHistogramPeak(GC_win).normalizedPeakCol;
            console.writeln("Iteration " + i + ", stretch " + stretch + ", black point " + P.blackPoint + ", current peak at " + peak_val);
      }
      if (histogram_poststretch) {
            console.writeln("Execute Histogram stretch on " + GC_win.mainView.id);
            GC_win = this.stretchHistogramTransformIterations(GC_win, GC_win.mainView.image.isColor, 'Histogram stretch', this.par.histogram_stretch_target.val, null);
      }
      return GC_win;
}

/*
stretchHistogramTransformChannel(GC_win, image_stretching, target_value, degree, channel)
{
      var res = { 
            win: GC_win, 
            iteration_number: 1, 
            completed: false, 
            skipped: 0,
            maxskipped: 3,
            clipCount: 0,
            target_value: target_value,
            forward: true,
            degree: degree
      };

      var window_updated = this.stretchHistogramTransformIterationStep(res, image_stretching, channel);
      if (window_updated) {
            this.guiUpdatePreviewWin(res.win);
      }
      this.engine_end_process(null);
      this.util.runGarbageCollection();
      return res.win;
}
*/

stretchHistogramTransformIterationsChannel(GC_win, image_stretching, target_value, channel, degree, copy_window, maxiterations=30)
{
      var res = { 
            win: GC_win, 
            iteration_number: 0, 
            completed: false, 
            skipped: 0,
            maxskipped: 3,
            clipCount: 0,
            target_value: target_value,
            forward: true,
            degree: degree,
            copy_window: copy_window
      };

      var degree_update_count = 0;
      for (var i = 0; i < maxiterations; i++) {
            res.iteration_number = i + 1;
            var window_updated = this.stretchHistogramTransformIterationStep(res, image_stretching, channel);
            if (window_updated) {
                  if (i > 0 && i % 5 == 0) {
                        this.guiUpdatePreviewWin(res.win);
                  }
            } else {
                  degree_update_count++;
                  if (degree_update_count > 10) {
                        console.writeln("Reached max degree change, stop iterations");
                        res.completed = true;
                  }
                  if (image_stretching == 'Histogram stretch') {
                  } else if (image_stretching == 'Logarithmic stretch') {
                        res.degree = degree + (2 * degree_update_count);
                        res.skipped = 0;  // Reset skip counter
                  } else if (image_stretching == 'Square root stretch') {
                        res.degree = degree + 0.1 * degree_update_count;
                        res.skipped = 0;  // Reset skip counter
                  } else if (image_stretching == 'Shadow stretch') {
                        res.degree = degree - 0.1 * degree_update_count;
                        res.skipped = 0;  // Reset skip counter
                  } else if (image_stretching == 'Highlight stretch') {
                        res.degree = degree - 0.1 * degree_update_count;
                        res.skipped = 0;  // Reset skip counter
                  } else {
                        this.util.throwFatalError("Unknown image stretching " + image_stretching);
                  }
            }
            this.engine_end_process(null);
            this.util.runGarbageCollection();
            if (res.completed) {
                  break;
            }
      }

      if (i == maxiterations) {
            console.writeln("Reached max iterations, stop iterations");
      }

      // Do final step to get histogram to the required position
      this.adjustHistogram(res.win, target_value, channel);

      this.guiUpdatePreviewWin(res.win);
      return res.win;
}

stretchHistogramTransformIterations(GC_win, iscolor, image_stretching, target_val, rgbLinked)
{
      this.util.addProcessingStepAndStatusInfo("Run " + image_stretching + " on " + GC_win.mainView.id + " using iterations");

      if (rgbLinked == null) {
            if (GC_win.mainView.image.isColor) {
                  rgbLinked = this.getRgbLinked(GC_win, iscolor);
            } else {
                  rgbLinked = true;
            }
      }
      console.writeln("RGB channels linked " + rgbLinked);

      if (target_val == null) {
            target_val = this.par.histogram_stretch_target.val;
      }
      console.writeln("Target value " + target_val);

      if (rgbLinked) {
            console.writeln("Channel: " + this.channelText(-1));
            return this.stretchHistogramTransformIterationsChannel(GC_win, image_stretching, target_val, null, null, false);
      } else {
            for (var i = 0; i < 3; i++) {
                  console.writeln("Channel: " + this.channelText(i));
                  GC_win = this.stretchHistogramTransformIterationsChannel(GC_win, image_stretching, target_val, i, null, false);
                  this.util.runGarbageCollection();
            }
            return GC_win;
      }
}

stretchFunctionIterations(GC_win, iscolor, image_stretching, stretch_target_val, degree)
{
      var debug = this.par.debug.val;

      if (0) {
            if (!GC_win.mainView.image.isColor) {
                  this.save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
                  this.util.throwFatalError("Stretch " + image_stretching + " only works on color images");
            }
            if (!iscolor) {
                  this.save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
                  this.util.throwFatalError("Stretch " + image_stretching + " only works on color images");
            }
      }
      if (1) {
            // For now, always use linked stretch
            rgbLinked = true;
      } else {
            if (GC_win.mainView.image.isColor) {
                  var rgbLinked = this.getRgbLinked(GC_win, iscolor);
            } else {
                  var rgbLinked = true;
            }
      }
      this.util.addProcessingStepAndStatusInfo("Run " + image_stretching + " on " + GC_win.mainView.id + " using iterations");

      // Run the stretch on the image
      if (rgbLinked) {
            console.writeln("Channel: " + this.channelText(-1));
            GC_win = this.stretchHistogramTransformIterationsChannel(GC_win, image_stretching, stretch_target_val, null, degree, true);
            if (debug) {
                  this.util.copyWindowEx(GC_win, this.util.mapBadWindowNameChars(image_stretching + "_linked_final_debug"), true);
            }
      
      } else {
            this.R_id = this.extractRGBchannel(GC_win.mainView.id, 'R');
            console.writeln("Channel: R");
            var R_win = this.stretchHistogramTransformIterationsChannel(this.util.findWindow(this.R_id), image_stretching, stretch_target_val, 0, degree, true);

            this.G_id = this.extractRGBchannel(GC_win.mainView.id, 'G');
            console.writeln("Channel: G");
            var G_win = this.stretchHistogramTransformIterationsChannel(this.util.findWindow(this.G_id), image_stretching, stretch_target_val, 0, degree, true);

            this.B_id = this.extractRGBchannel(GC_win.mainView.id, 'B');
            console.writeln("Channel: B");
            var B_win = this.stretchHistogramTransformIterationsChannel(this.util.findWindow(this.B_id), image_stretching, stretch_target_val, 0, degree, true);

           this.runPixelMathRGBMapping(null, GC_win, this.R_id, this.G_id, this.B_id);

            this.util.closeOneWindowById(this.R_id);
            this.util.closeOneWindowById(this.G_id);
            this.util.closeOneWindowById(this.B_id);
            this.util.closeOneWindowById(R_win.mainView.id);
            this.util.closeOneWindowById(G_win.mainView.id);
            this.util.closeOneWindowById(B_win.mainView.id);

            this.util.runGarbageCollection();
            if (debug) {
                  this.util.copyWindowEx(GC_win, this.util.mapBadWindowNameChars(image_stretching + "_unlinked_final_debug"), true);
            }
      }
      return GC_win;
}

// Possible options for computeOrFetchProperty:
// Mean, Modulus, SumOfSquares, Median, Variance, StdDev, AvgDev, MAD, BWMV, PBMV, Sn, Qn, Minimum, MinimumPos, Maximum, MaximumPos, Histogram16, Histogram20​
printImageStatistics(win, channel = -1)
{
      var view = win.mainView;
      if (channel >= 0) {
            var med = view.computeOrFetchProperty("Median").at(channel);
            var mean = view.computeOrFetchProperty("Mean").at(channel);
            var stdDev = view.computeOrFetchProperty("StdDev").at(channel);
            var MAD = view.computeOrFetchProperty("MAD").at(channel);
            var min = view.computeOrFetchProperty("Minimum").at(channel);
            var max = view.computeOrFetchProperty("Maximum").at(channel);
      } else {
            var med = win.mainView.image.median();
            var mean = win.mainView.image.mean();
            var MAD = win.mainView.image.MAD();
            var stdDev = win.mainView.image.stdDev();
            var min = win.mainView.image.minimum();
            var max = win.mainView.image.maximum();
      }
      console.writeln("Image statistics for " + view.id + ", channel " + this.channelText(channel));

      console.writeln(this.channelText(channel) + " Median " + med + 
                                             " Mean " + mean +
                                             " MAD " + MAD +
                                             " stdDev " + stdDev +
                                             " min " + min + 
                                             " max " + max);
}

calculateMTFParameter(source, target) 
{
      let tolerance = 0.00000001;
      let maxIterations = 100;
      let low = 0;
      let high = 1;
      let mid;
      let currentMedian = source;
      let iterations = 0;
    
      while (Math.abs(currentMedian - target) > tolerance && iterations < maxIterations) {
            mid = (low + high) / 2;
            if (this.par.debug.val) console.writeln("calculateMTFParameter, mid " + mid + ", low " + low + ", high " + high);
      
            currentMedian = Math.mtf(mid, source); 
            if (this.par.debug.val) console.writeln("calculateMTFParameter, currentMedian " + currentMedian + ", target " + target);
      
            if (currentMedian > target) {
                  low = mid;
            } else {
                  high = mid;
            }
      
            iterations++;
            if (this.par.debug.val) console.writeln("calculateMTFParameter, iterations " + iterations);
      }
    
      if (iterations >= maxIterations) {
            console.writeln("Maximum iterations reached. Could not achieve target median within tolerance.");
      }
    
      return mid;
}

adjustHistogram(win, target_value, channel = -1)
{
      if (channel == null || channel == undefined) {
            channel = -1;
      }
      console.writeln("adjustHistogram, " + this.channelText(channel) + ", target_value " + target_value);
      
      var midtones = [ 0.50000000, 0.50000000, 0.50000000, 0.50000000 ];

      if (channel >= 0) {
            var med = win.mainView.computeOrFetchProperty("Median").at(channel);
      } else {
            var med = win.mainView.image.median();
      }
      console.writeln("adjustHistogram, " + this.channelText(channel) + ", median " + med);

      var new_midtones = this.calculateMTFParameter(med, target_value);
      console.writeln("adjustHistogram, calculateMTFParameter, " + this.channelText(channel) + ", new midtones " + new_midtones);

      if (channel >= 0) {
            midtones[channel] = new_midtones;
      } else {
            midtones[3] = new_midtones;
      }

      var P = new HistogramTransformation;
      P.H = [ // c0, c1, m, r0, r1
            [0.00000000, midtones[0], 1.00000000, 0.00000000, 1.00000000],     // R
            [0.00000000, midtones[1], 1.00000000, 0.00000000, 1.00000000],     // G
            [0.00000000, midtones[2], 1.00000000, 0.00000000, 1.00000000],     // B
            [0.00000000, midtones[3], 1.00000000, 0.00000000, 1.00000000],     // L
            [0.00000000, 0.50000000, 1.00000000, 0.00000000, 1.00000000]
      ];

      win.mainView.beginProcess(UndoFlag.NoSwapFile);
      P.executeOn(win.mainView);
      win.mainView.endProcess();

      this.saveProcessValues(P, this.findChannelFromNameIf(win.mainView.id));
      this.engine_end_process(null);

      if (channel >= 0) {
            med = win.mainView.computeOrFetchProperty("Median").at(channel);
      } else {
            med = win.mainView.image.median();
      }
      console.writeln(this.channelText(channel) + " new median " + med);
}

histogramDirectStretch(win, image_stretching, iscolor, target_value)
{
      this.util.addProcessingStepAndStatusInfo("Run histogram transform on " + win.mainView.id + " using " + image_stretching + " with target value " + target_value);

      if (win.mainView.image.isColor) {
            var rgbLinked = this.getRgbLinked(win, iscolor);
      } else {
            var rgbLinked = true;
      }
      
      var midtones = [ 0.50000000, 0.50000000, 0.50000000, 0.50000000 ];

      if (rgbLinked) {
            var med = win.mainView.image.median();
            console.writeln("histogramDirectStretch, " + this.channelText(-1) + ", median " + med);
            var new_midtones = this.calculateMTFParameter(med, target_value);
            console.writeln("histogramDirectStretch, calculateMTFParameter, " + this.channelText(-1) + ", new midtones " + new_midtones);
            midtones[3] = new_midtones;
      } else {
            for (var i = 0; i < 3; i++) {
                  var med = win.mainView.computeOrFetchProperty("Median").at(i);
                  console.writeln("histogramDirectStretch, " + this.channelText(i) + ", median " + med);
                  var new_midtones = this.calculateMTFParameter(med, target_value);
                  console.writeln("histogramDirectStretch, calculateMTFParameter, " + this.channelText(i) + ", new midtones " + new_midtones);
                  midtones[i] = new_midtones;
            }
      }

      var P = new HistogramTransformation;
      P.H = [ // c0, c1, m, r0, r1
            [0.00000000, midtones[0], 1.00000000, 0.00000000, 1.00000000],     // R
            [0.00000000, midtones[1], 1.00000000, 0.00000000, 1.00000000],     // G
            [0.00000000, midtones[2], 1.00000000, 0.00000000, 1.00000000],     // B
            [0.00000000, midtones[3], 1.00000000, 0.00000000, 1.00000000],     // L
            [0.00000000, 0.50000000, 1.00000000, 0.00000000, 1.00000000]
      ];

      win.mainView.beginProcess(UndoFlag.NoSwapFile);
      P.executeOn(win.mainView);
      win.mainView.endProcess();

      this.saveProcessValues(P, "stretch");
      this.engine_end_process(null);

      if (rgbLinked) {
            var med = win.mainView.image.median();
            console.writeln("histogramDirectStretch, " + this.channelText(-1) + ", new median " + med);
      } else {
            for (var i = 0; i < 3; i++) {
                  var med = win.mainView.computeOrFetchProperty("Median").at(i);
                  console.writeln("histogramDirectStretch, " + this.channelText(i) + ", new median " + med);
            }
      }
}

stretchHistogramTransformAdjustShadows(new_win, channel, use_median)
{
      console.writeln("stretchHistogramTransformAdjustShadows");
      
      var shadows = [ 0.00000000, 0.00000000, 0.00000000, 0.00000000 ];

      var shadows_clip_value = 0;
      var adjust = this.getAdjustPoint(new_win, shadows_clip_value, channel);

      if (adjust.normalizedAdjustPoint == 0) {
            console.writeln("No shadows to adjust");
            return 0;
      }
      
      if (channel >= 0) {
            shadows[channel] = adjust.normalizedAdjustPoint;
      } else {
            shadows[3] = adjust.normalizedAdjustPoint;
      }
      console.writeln("stretchHistogramTransformAdjustShadows, " + this.channelText(channel) + ", shadows " + adjust.normalizedAdjustPoint);

      var P = new HistogramTransformation;
      P.H = [ // c0, c1, m, r0, r1
            [shadows[0], 0.50000000, 1.00000000, 0.00000000, 1.00000000],     // R
            [shadows[1], 0.50000000, 1.00000000, 0.00000000, 1.00000000],     // G
            [shadows[2], 0.50000000, 1.00000000, 0.00000000, 1.00000000],     // B
            [shadows[3], 0.50000000, 1.00000000, 0.00000000, 1.00000000],     // L
            [0.00000000, 0.50000000, 1.00000000, 0.00000000, 1.00000000]
      ];
      new_win.mainView.beginProcess(UndoFlag.NoSwapFile);
      P.executeOn(new_win.mainView);
      new_win.mainView.endProcess();

      this.printAndSaveProcessValues(P, "shadows_" + this.findChannelFromNameIf(new_win.mainView.id), new_win.mainView.id);

      this.engine_end_process(null);

      if (use_median) {
            if (channel >= 0) {
                  var current_value = new_win.mainView.computeOrFetchProperty("Median").at(channel);
            } else {
                  var current_value = new_win.mainView.image.median();
            }
            console.writeln(this.channelText(channel) + " median " + current_value);
      } else {
            var current_value = this.findHistogramPeak(new_win, channel).normalizedPeakCol;
            console.writeln(this.channelText(channel) + " peak " + current_value);
      }
      return adjust.adjustCount;
}

/* Experimenting with stretching, mostly just for fun and to understand
 * some functions and concepts.
 * Works pretty ok on some images with Crop to common area and zero shadow
 * clipping.
 */
stretchHistogramTransformIterationStep(res, image_stretching, channel)
{
      var copy_window = res.copy_window;
      var clipCount = 0;

      if (channel == null || channel == undefined || channel == -1) {
            channel = -1;
      } else if (channel >= 3) {
            this.util.throwFatalError("Invalid channel " + channel + " for stretchHistogramTransformIterationStep");
      }

      console.writeln(image_stretching + " on " + res.win.mainView.id + ", iteration " + res.iteration_number + ", channel " + this.channelText(channel));
      console.writeln("\n****************************************************************");
      console.writeln("*** start iteration " + res.iteration_number + ", " + this.channelText(channel));

      if (res.iteration_number == 1) {
            this.printImageStatistics(res.win, channel);
      }

      var target_value = res.target_value;
      var use_median = this.par.histogram_stretch_type.val == 'Median';

      if (copy_window) {
            var new_win = this.util.copyWindowEx(res.win, "autointegrate_temp_stretch", true);
      } else {
            var new_win = res.win;  // Update original window
      }

      if (res.iteration_number == 1) {
            clipCount = this.stretchHistogramTransformAdjustShadows(new_win, channel, use_median);
      }

      var midtones = [ 0.50000000, 0.50000000, 0.50000000, 0.50000000 ];

      if (use_median) {
            if (channel >= 0) {
                  var current_value = new_win.mainView.computeOrFetchProperty("Median").at(channel);
            } else {
                  var current_value = new_win.mainView.image.median();
            }
            console.writeln(this.channelText(channel) + " median " + current_value);
      } else {
            var current_value =this.findHistogramPeak(new_win, channel).normalizedPeakCol;
            console.writeln(this.channelText(channel) + " peak " + current_value);
      }

      if (current_value > target_value && res.iteration_number == 1) {
            res.forward = false;
      }

      if (!res.forward) {
            var new_midtones = Math.mtf(target_value, current_value);
            if (channel >= 0) {
                  midtones[channel] = new_midtones;
            } else {
                  midtones[3] = new_midtones;
            }
      } else {
            // Iterative method gives maybe a bit better shadows
            var adjust = target_value - current_value;
            var new_midtones = 0.50 - adjust;
            if (channel >= 0) {
                  midtones[channel] = new_midtones;
            } else {
                  midtones[3] = new_midtones;
            }
      }

      console.writeln("New midtones " + new_midtones);

      if (image_stretching == 'Histogram stretch') {
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
                  new_win.mainView.beginProcess(UndoFlag.NoSwapFile);
                  P.executeOn(new_win.mainView);
                  new_win.mainView.endProcess();

                  this.engine_end_process(null);

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
                  P.newImageColorSpace = PixelMath.SameAsTarget;
                  P.newImageSampleFormat = PixelMath.SameAsTarget;
                  console.writeln("Symbols " + P.symbols);
                  new_win.mainView.beginProcess(UndoFlag.NoSwapFile);
                  P.executeOn(new_win.mainView);
                  new_win.mainView.endProcess();
                  this.engine_end_process(null);
            }

      } else if (image_stretching == 'Logarithmic stretch') {

            if (res.forward) {
                  // stretched_pixel = log(1 + pixel * constant) / log(1 + constant)
                  // constant range from 500 to 5000
                  // start with 1000, large values will loose contrast
                  var mapping = "log(1+$T*" + res.degree + ")/log(1+" + res.degree + ")";
            } else {
                  throw new Error("Logarithmic stretch does not support reverse stretching");
            }
            this.runPixelMathSingleMappingEx(new_win.mainView.id, "logarithmic stretch", mapping, false, null, true, true, false);

      } else if (image_stretching == 'Asinh+Histogram stretch') {

            if (res.forward) {
                  // stretched_pixel = scale_factor * arcsinh(pixel / scale_factor)
                  // Typical scale_factor values range from 0.001 to 0.1.
                  // Start with 0.01
                  var mapping = "asinh($T / " + res.degree + ") / asinh(" + res.degree + ")";
            } else {
                  this.save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
                  this.util.throwFatalError("Asinh+Histogram stretch does not support reverse stretching");
            }
            this.runPixelMathSingleMappingEx(new_win.mainView.id, "asinh stretch", mapping, false, null, true, true, false);

      } else if (image_stretching == 'Square root stretch') {

            if (res.forward) {
                  // stretched_pixel = sqrt(pixel)
                  var mapping = "sqrt(" + res.degree + " * $T)";
            } else {
                  throw new Error("Square root stretch does not support reverse stretching");
            }
            this.runPixelMathSingleMappingEx(new_win.mainView.id, "sqrt stretch", mapping, false, null, true, true, false);

      } else if (image_stretching == 'Shadow stretch') {
            if (res.forward) {
                  var x1 = 0.15435;
                  var x2 = 0.36782;
                  var y1 = 0.35200;
                  var y2 = 0.63600;
                  y1 = res.degree * y1;
                  if (y1 <= x1) {
                        y1 = x1;
                  }
                  y2 = res.degree * y2;
                  if (y2 <= x2) {
                        y2 = x2;
                  }
                  if (y1 <= x1 && y2 <= x2) {
                        res.completed = true;
                  } else {
                        var P = new CurvesTransformation;
                        P.K = [ // x, y
                              [0.00000, 0.00000],
                              [x1, y1],
                              [x2, y2],
                              [1.00000, 1.00000]
                        ];
                        P.executeOn(new_win.mainView, false);
                  }
            } else {
                  this.save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
                  this.util.throwFatalError("Shadow stretch does not support reverse stretching");
            }

      } else if (image_stretching == 'Highlight stretch') {
            if (res.forward) {
                  var x1 = 0.15435;
                  var x2 = 0.36782;
                  var y1 = 0.25800;
                  var y2 = 0.62200;
                  y1 = res.degree * y1;
                  if (y1 <= x1) {
                        y1 = x1;
                  }
                  y2 = res.degree * y2;
                  if (y2 <= x2) {
                        y2 = x2;
                  }
                  if (y1 <= x1 && y2 <= x2) {
                        res.completed = true;
                  } else {
                        var P = new CurvesTransformation;
                        P.K = [ // x, y
                              [0.00000, 0.00000],
                              [x1, y1],
                              [x2, y2],
                              [1.00000, 1.00000]
                        ];
                        P.executeOn(new_win.mainView, false);
                  }
            } else {
                  this.save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
                  this.util.throwFatalError("Highlight stretch does not support reverse stretching");
            }

      } else {
            this.util.throwFatalError("Unknown image stretching method: " + image_stretching);
      }

      if (use_median) {
            if (channel >= 0) {
                  current_value = new_win.mainView.computeOrFetchProperty("Median").at(channel);
            } else {
                  current_value = new_win.mainView.image.median();
            }
            console.writeln(this.channelText(channel) + " median " + current_value);
      } else {
            current_value =this.findHistogramPeak(new_win, channel).normalizedPeakCol;
            console.writeln(this.channelText(channel) + " peak " + current_value);
      }

      if (res.iteration_number == 1) {
            // clipCount = stretchHistogramTransformAdjustShadows(new_win, channel, use_median);
      }

      // check where histograms are
      this.printImageStatistics(new_win, channel);

      var window_updated = false;

      if (res.completed) {
            // we are done
            console.writeln("*** Stop, stretch completed, current value " + current_value + ", target value" + target_value);
            window_updated = false;
            if (copy_window) {
                  new_win.forceClose();
            }
      } else if (res.forward && current_value > target_value + 0.1 * target_value) {
            // We are above the target value, ignore this iteration
            res.skipped++;
            if (!copy_window) {
                  res.forward = false;
            }
            // this.util.closeOneWindow(new_win);
            if (res.skipped > res.maxskipped) {
                  console.writeln("*** Stop, we are past the target, skipped " + res.skipped + ", current value " + current_value + ", target value " + target_value);
                  res.completed = true;
            } else {
                  console.writeln("*** Skip, we are past the target, skip this iteration, skipped + " + res.skipped + ", current value " + current_value + ", target value " + target_value);
            }
            if (copy_window) {
                  new_win.forceClose();
            }
      } else if (!res.forward && current_value < target_value + 0.1 * target_value) {
            // We are below the target value, ignore this iteration
            res.skipped++;
            res.forward = true;
            // this.util.closeOneWindow(new_win);
            console.writeln("*** Skip, we are past the target, skipped " + res.skipped + ", current value " + current_value + ", target value " + target_value);
            // res.completed = true;
            if (copy_window) {
                  new_win.forceClose();
            }
      } else {
            window_updated = true;
            if (current_value < target_value - 0.1 * target_value) {
                  console.writeln("*** Continue stretch iteration " + res.iteration_number + ", current value " + current_value + ", target value " + target_value);
            } else {
                  // we are close enough, we are done
                  console.writeln("*** Stop, stretch completed, we are close enough, current value " + current_value + ", target value" + target_value);
                  res.completed = true;
            }
            if (copy_window) {
                  // use new window and copy keywords
                 this.setTargetFITSKeywordsForPixelmath(new_win, this.getTargetFITSKeywordsForPixelmath(res.win));
                  // close old image
                  var image_id = res.win.mainView.id;
                  console.writeln("Close old window " + image_id);
                  res.win.forceClose();
                  // rename new as old
                  console.writeln("Rename new window " + new_win.mainView.id + " to " + image_id);
                  this.util.windowRename(new_win.mainView.id, image_id);
                  res.win = new_win;
            }
            res.clipCount += clipCount;
            console.writeln("*** Clipped total of " + res.clipCount + " pixels");
      }

      console.writeln("*** end iteration " + res.iteration_number + ", " + this.channelText(channel));
      console.writeln("****************************************************************\n");

      return window_updated;
}

runHistogramTransform(GC_win, iscolor, type)
{
      // Check for valid type values
      switch (type) {
            case 'stars':
            case 'mask':
                  var run_adjust_shadows_if = false;
                  break;
            case 'channel':
            case 'RGB':
            case 'R':
            case 'G':
            case 'B':
            case 'L':
            case 'H':
            case 'S':
            case 'O':
            case 'C':
                  var run_adjust_shadows_if = true;
                  break;
            default:
                  this.util.throwFatalError("Bad runHistogramTransform type value " + type);
      }
      console.writeln("runHistogramTransform, type " + type + ", iscolor " + iscolor, ", stretch_adjust_shadows " + this.par.stretch_adjust_shadows.val);

      if (type == 'stars') {
            var image_stretching = this.par.stars_stretching.val;
      } else {
            var image_stretching = this.local_image_stretching;
      }
      if (image_stretching == 'None') {
            if (type == 'mask') {
                  image_stretching = 'Auto STF';
            } else {
                  return GC_win;
            }
      }
      if (run_adjust_shadows_if && (this.par.stretch_adjust_shadows.val == "before" || this.par.stretch_adjust_shadows.val == "both")) {
            console.writeln("runHistogramTransform adjust shadows");
            this.adjustShadows(GC_win, this.par.stretch_adjust_shadows_perc.val);
      }
      if (type == 'mask') {
            console.writeln("runHistogramTransform for a mask using " + image_stretching);
      } else {
            console.writeln("runHistogramTransform using " + image_stretching);
      }
      switch (type) {
            case 'stars':
                  var flowchart_name = ":stars";
                  break;
            case 'mask':
                  var flowchart_name = ":mask";
                  break;
            default:
                  var flowchart_name = "";
                  break;
      }
      var node = this.flowchart.flowchartOperation(image_stretching + flowchart_name);
      if (this.global.get_flowchart_data) {
            return GC_win;
      }

      var stf = null;
      var targetBackground; // to be compatible with 'use strict';
      if (type == 'mask') {
            switch (image_stretching) {
                  case 'Masked+Histogram Stretch':
                  case 'Histogram stretch':
                  case 'Logarithmic stretch':
                  case 'Asinh+Histogram':
                  case 'Square root stretch':
                  case 'Shadow stretch':
                  case 'Highlight stretch':
                        // Iterative stretch for a mask is very slow, just use Auto STF
                        image_stretching = 'Auto STF';
                        break;
                  default:
                        break;
            }
      }
      //if (image_stretching == 'Auto STF' || type == 'mask') {
      if (image_stretching == 'Auto STF') {
            if (type == 'mask') {
                  targetBackground = this.global.DEFAULT_AUTOSTRETCH_TBGND;
            } else {
                  targetBackground = this.par.STF_targetBackground.val;
            }
            this.runHistogramTransformAutoSTF(GC_win, iscolor, targetBackground);

      } else if (image_stretching == 'MultiscaleAdaptiveStretch') {
            GC_win = this.runHistogramTransformMultiscaleAdaptiveStretch(GC_win, image_stretching);

      } else if (image_stretching == 'VeraLuxHMS') {
            GC_win = this.runHistogramTransformVeraLuxHMS(GC_win, image_stretching);

      } else if (image_stretching == 'Masked Stretch') {
            GC_win = this.runHistogramTransformMaskedStretch(GC_win, image_stretching, false);

      } else if (image_stretching == 'Masked+Histogram Stretch') {
            GC_win = this.runHistogramTransformMaskedStretch(GC_win, image_stretching, true);

      } else if (image_stretching == 'Arcsinh Stretch') {
            this.global.skip_process_value_save = true;
            GC_win = this.runHistogramTransformArcsinhStretch(GC_win, image_stretching, false);

      } else if (image_stretching == 'Asinh+Histogram stretch') {
            this.global.skip_process_value_save = true;
            GC_win = this.runHistogramTransformArcsinhStretch(GC_win, image_stretching, true);

      } else if (image_stretching == 'Histogram stretch') {
            this.global.skip_process_value_save = true;
            GC_win = this.stretchHistogramTransformIterations(GC_win, iscolor, image_stretching, this.par.histogram_stretch_target.val, null);

      } else if (image_stretching == 'Logarithmic stretch') {
            this.global.skip_process_value_save = true;
            GC_win = this.stretchFunctionIterations(GC_win, iscolor, image_stretching, this.par.other_stretch_target.val, 10);

      } else if (image_stretching == 'Square root stretch') {
            this.global.skip_process_value_save = true;
            GC_win = this.stretchFunctionIterations(GC_win, iscolor, image_stretching, this.par.other_stretch_target.val, 1);

      } else if (image_stretching == 'Shadow stretch') {
            this.global.skip_process_value_save = true;
            GC_win = this.stretchFunctionIterations(GC_win, iscolor, image_stretching, this.par.other_stretch_target.val, 1);

      } else if (image_stretching == 'Highlight stretch') {
            this.global.skip_process_value_save = true;
            GC_win = this.stretchFunctionIterations(GC_win, iscolor, image_stretching, this.par.other_stretch_target.val, 1);

      } else if (image_stretching == 'Histogram direct') {
            this.histogramDirectStretch(GC_win, image_stretching, iscolor, this.par.other_stretch_target.val);

      } else {
            this.util.throwFatalError("Bad image stretching value " + image_stretching + " with type " + type);
      }
      this.global.skip_process_value_save = false;
      this.util.setFITSKeyword(GC_win, "AutoIntegrateNonLinear", image_stretching, "");
      this.engine_end_process(node, GC_win, image_stretching);

      if (run_adjust_shadows_if && (this.par.stretch_adjust_shadows.val == "after" || this.par.stretch_adjust_shadows.val == "both")) {
            console.writeln("runHistogramTransform adjust shadows");
            this.adjustShadows(GC_win, this.par.stretch_adjust_shadows_perc.val);
      }

      this.guiUpdatePreviewWin(GC_win);
      return GC_win;
}

runACDNRReduceNoise(imgWin, maskWin)
{
      if (!this.par.use_ACDNR_noise_reduction.val 
          || this.par.ACDNR_noise_reduction.val == 0.0 
          || this.par.use_noisexterminator.val
          || this.par.use_graxpert_denoise.val) 
      {
            // Skip if not configured or using AI based noise reduction
            return;
      }
      this.util.addProcessingStepAndStatusInfo("ACDNR noise reduction on " + imgWin.mainView.id + " using mask " + maskWin.mainView.id);
      var node = this.flowchart.flowchartOperation("ACDNR");
      if (this.global.get_flowchart_data) {
            return;
      }

      var P = new ACDNR;
      P.applyToChrominance = false;
      P.sigmaL = this.par.ACDNR_noise_reduction.val;
      P.amountL = 0.50;

      imgWin.mainView.beginProcess(UndoFlag.NoSwapFile);

      if (maskWin != null) {
            /* Remove noise from dark parts of the image. */
            this.setMaskChecked(imgWin, maskWin);
            imgWin.maskInverted = true;
      }

      P.executeOn(imgWin.mainView, false);

      if (maskWin != null) {
            imgWin.removeMask();
      }

      imgWin.mainView.endProcess();

      this.printAndSaveProcessValues(P, "", imgWin.mainView.id);

      this.engine_end_process(node, imgWin, "ACDNR:noise");

      this.guiUpdatePreviewWin(imgWin);
}

noiseSuperStrong()
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

noiseStronger()
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

noiseStrong()
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

noiseMild()
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

noiseVeryMild()
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

noiseSuperMild()
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

runMultiscaleLinearTransformReduceNoise(imgWin, maskWin, strength)
{
      if (strength == 0) {
            return;
      }

      if (maskWin != null) {
            console.writeln("runMultiscaleLinearTransformReduceNoise on " + imgWin.mainView.id + " using mask " + maskWin.mainView.id + ", strength " + strength);
      } else {
            console.writeln("runMultiscaleLinearTransformReduceNoise on " + imgWin.mainView.id + ", strength " + strength);
      }
      var node = this.flowchart.flowchartOperation("MultiscaleLinearTransform:noise");

      if (this.global.get_flowchart_data) {
            return;
      }

      switch (strength) {
            case 1:
                  var P = this.noiseSuperMild();
                  break;
            case 2:
                  var P = this.noiseVeryMild();
                  break;
            case 3:
                  var P = this.noiseMild();
                  break;
            case 4:
                  var P = this.noiseStrong();
                  break;
            case 5:
                  var P = this.noiseStronger();
                  break;
            case 6:
                  var P = this.noiseSuperStrong();
                  break;
            default:
                  this.util.throwFatalError("Bad noise reduction value " + strength);
      } 

      imgWin.mainView.beginProcess(UndoFlag.NoSwapFile);

      if (maskWin != null) {
            /* Remove noise from dark parts of the image. */
            this.setMaskChecked(imgWin, maskWin);
            imgWin.maskInverted = true;
      }

      P.executeOn(imgWin.mainView, false);

      if (maskWin != null) {
            imgWin.removeMask();
      }

      this.printAndSaveProcessValues(P, "noise_" + this.findChannelFromNameIf(imgWin.mainView.id), imgWin.mainView.id);
      this.engine_end_process(node, imgWin, "MultiscaleLinearTransform:noise");

      imgWin.mainView.endProcess();
}

runBlurXTerminator(imgWin, correct_only, for_image_solver = false)
{
      if (for_image_solver) {
            console.writeln("BlurXTerminator for ImageSolver on " + imgWin.mainView.id + " for image solver");
      } else {
            console.writeln("BlurXTerminator on " + imgWin.mainView.id + ", sharpen stars " + this.par.bxt_sharpen_stars.val + 
                        ", adjust star halos " + this.par.bxt_adjust_halo.val + ", sharpen nonstellar " + this.par.bxt_sharpen_nonstellar.val +
                        ", correct only " + correct_only);
      }
      if (correct_only) {
            var node = this.flowchart.flowchartOperation("BlurXTerminator:correct only");
      } else {
            var node = this.flowchart.flowchartOperation("BlurXTerminator");
      }

      if (this.global.get_flowchart_data) {
            return;
      }

      if (for_image_solver) {
            var auto_psf = true;
            var psf = 0.0;
            console.writeln("Using auto PSF with image solver");
      } else if (this.par.bxt_psf.val > 0) {
            var auto_psf = false;
            var psf = this.par.bxt_psf.val;
            console.writeln("Using user given PSF " + psf);
      } else if (this.par.bxt_median_psf.val) {
            var auto_psf = false;
            var psf = this.medianFWHM;
            if (psf == null) {
                  // Get psf from image header
                  psf = this.util.getKeywordValue(imgWin, "AutoIntegrateMEDFWHM");
                  if (psf != null) {
                        // Convert to number
                        psf = parseFloat(psf);
                  }
            }
            if (psf == null) {
                  this.save_images_in_save_id_list(); // Save images so we can return with AutoContinue
                  this.util.throwFatalError("Cannot run BlurXTerminator, AutoIntegrateMEDFWHM is not calculated. Maybe subframe selector was not run, or not using XISF/FITS image with proper header values.");
            }
            console.writeln("Using PSF " + psf + " from AutoIntegrateMEDFWHM value");
      } else if (this.par.bxt_image_psf.val) {
            var auto_psf = false;
            var psf = this.getImagePSF(imgWin);
            console.writeln("BlurXTerminator using PSF " + psf + " calculated from image");
      } else {
            var auto_psf = true;
            var psf = 0.0;
            console.writeln("Using auto PSF");
      }

      try {
            var P = new BlurXTerminator;
            if (for_image_solver) {
                  P.sharpen_stars = 0.7;
                  P.auto_nonstellar_psf = true;
                  P.sharpen_nonstellar = 0;
            } else {
                  P.nonstellar_then_stellar = false;
                  P.sharpen_stars = this.par.bxt_sharpen_stars.val;
                  P.adjust_halos = this.par.bxt_adjust_halo.val;
                  P.nonstellar_psf_diameter = psf;
                  P.auto_nonstellar_psf = auto_psf;
                  P.sharpen_nonstellar = this.par.bxt_sharpen_nonstellar.val;
            }
      } catch(err) {
            this.save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
            console.criticalln("BlurXTerminator failed");
            console.criticalln(err);
            console.criticalln("Maybe BlurXTerminator is not installed, AI is missing or platform is not supported");
            this.util.throwFatalError("BlurXTerminator failed");
      }

      /* Execute on image.
       */
      imgWin.mainView.beginProcess(UndoFlag.NoSwapFile);

      P.executeOn(imgWin.mainView, false);
      
      imgWin.mainView.endProcess();

      this.printAndSaveProcessValues(P, this.findChannelFromNameIf(imgWin.mainView.id), imgWin.mainView.id);
      this.engine_end_process(node, imgWin, "BlurXTerminator");
}

runNoiseXTerminator(imgWin, linear)
{
      var node = this.flowchart.flowchartOperation("NoiseXTerminator");
      if (this.global.get_flowchart_data) {
            return;
      }
      console.writeln("Run NoiseXTerminator using denoise " + this.par.nxt_denoise.val + " and iterations " + this.par.nxt_iterations.val);

      try {
            var P = new NoiseXTerminator;
            P.denoise = this.par.nxt_denoise.val;                      // Both: Denoise HF Intensity, Freq: Denoise HF, Color: Denoise Intensity, Default: Denoise     this.par.nxt_denoise.val
            P.denoise_color = this.par.nxt_denoise_color.val;          // Both: Denoise HF color                        Color: Denoise Color                           this.par.nxt_denoise_color.val
            P.denoise_lf = this.par.nxt_denoise_lf.val;                // Both: Denoise LF Intensity  Freq: Denoise LF                                                 this.par.nxt_denoise_lf.val
            P.denoise_lf_color = this.par.nxt_denoise_lf_color.val;    // Both: Denoise LF color                                                                       this.par.nxt_denoise_lf_color.val
            P.frequency_scale = this.par.nxt_frequency_scale.val;      // Use only when both selected
            P.iterations = this.par.nxt_iterations.val;

            P.detail = this.par.nxt_detail.val;            // Not needed, but keep for old versions
            P.linear = linear;                        // Not needed, but keep for old versions
            /*
            All new settings:
            var P = new NoiseXTerminator;
            P.ai_file = "NoiseXTerminator.3.pb";
            P.enable_color_separation = false;
            P.enable_frequency_separation = false;
            P.denoise = 0.90;             // Both: Denoise HF Intensity, Freq: Denoise HF, Color: Denoise Intensity, Default: Denoise     this.par.nxt_denoise.val
            P.denoise_color = 0.90;       // Both: Denoise HF color                        Color: Denoise Color                           this.par.nxt_denoise_color.val
            P.denoise_lf = 0.9;           // Both: Denoise LF Intensity  Freq: Denoise LF                                                 this.par.nxt_denoise_lf.val
            P.denoise_lf_color = 0.9;     // Both: Denoise LF color                                                                       this.par.nxt_denoise_lf_color.val
            P.frequency_scale = 5.0;
            P.iterations = 2;
            P.detail = 0.15;
            */
      } catch(err) {
            this.save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
            console.criticalln("NoiseXTerminator failed");
            console.criticalln(err);
            console.criticalln("Maybe NoiseXTerminator is not installed, AI is missing or platform is not supported");
            this.util.throwFatalError("NoiseXTerminator failed");
      }

      /* Execute on image.
       */
      imgWin.mainView.beginProcess(UndoFlag.NoSwapFile);

      P.executeOn(imgWin.mainView, false);
      
      imgWin.mainView.endProcess();

      this.printAndSaveProcessValues(P, this.findChannelFromNameIf(imgWin.mainView.id), imgWin.mainView.id);
      this.engine_end_process(node, imgWin, "NoiseXTerminator");
}

runDeepSNR(imgWin, linear)
{
      var node = this.flowchart.flowchartOperation("DeepSNR");
      if (this.global.get_flowchart_data) {
            return;
      }

      console.writeln("Run DeepSNR using amount " + this.par.deepsnr_amount.val);

      try {
            var P = new DeepSNR;
            P.linear = linear;
            P.amount = this.par.deepsnr_amount.val;
            P.shadows_clipping = -2.80;
            P.target_background = 0.25;
      } catch(err) {
            this.save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
            console.criticalln("DeepSNR failed");
            console.criticalln(err);
            console.criticalln("Maybe DeepSNR is not installed, AI is missing or platform is not supported");
            this.util.throwFatalError("DeepSNR failed");
      }

      console.writeln("runDeepSNR on " + imgWin.mainView.id + " using amount " + P.amount + ", linear " + linear);

      /* Execute on image.
       */
      imgWin.mainView.beginProcess(UndoFlag.NoSwapFile);

      P.executeOn(imgWin.mainView, false);
      
      imgWin.mainView.endProcess();

      this.printAndSaveProcessValues(P, this.findChannelFromNameIf(imgWin.mainView.id), imgWin.mainView.id);
      this.engine_end_process(node, imgWin, "DeepSNR");
}

// Note: Text names must match the this.flowchart operation names
getNoiseReductionName()
{
      if (this.par.use_noisexterminator.val) {
            return "NoiseXTerminator";
      } else if (this.par.use_graxpert_denoise.val) {
            return "GraXpert denoise";
      } else if (this.par.use_deepsnr.val) {
            return "DeepSNR";
      } else {
            return "MultiscaleLinearTransform:noise";
      }
}

runNoiseReductionEx(imgWin, maskWin, strength, linear)
{
      console.writeln("runNoiseReductionEx on " + imgWin.mainView.id + ", linear " + linear);

      if (this.global.get_flowchart_data) {
            var node = this.flowchart.flowchartOperation(this.getNoiseReductionName());
            return;
      }
      if (this.par.use_noisexterminator.val) {
            this.runNoiseXTerminator(imgWin, linear);
      } else if (this.par.use_graxpert_denoise.val) {
            this.runGraXpertExternal(imgWin, this.GraXpertCmd.denoise);
      } else if (this.par.use_deepsnr.val) {
            this.runDeepSNR(imgWin, true);
      } else {
            this.runMultiscaleLinearTransformReduceNoise(imgWin, maskWin, strength);
      }
}

runNoiseReduction(imgWin, maskWin, linear)
{
      if (this.par.use_noisexterminator.val) {
            this.util.addProcessingStepAndStatusInfo("Noise reduction using NoiseXTerminator on " + imgWin.mainView.id);
      } else if (this.par.use_graxpert_denoise.val) {
            this.util.addProcessingStepAndStatusInfo("Noise reduction using GraXpert on " + imgWin.mainView.id);
      } else if (this.par.use_deepsnr.val) {
            this.util.addProcessingStepAndStatusInfo("Noise reduction using DeepSNR on " + imgWin.mainView.id);
      } else {
            if (maskWin == null) {
                  this.util.addProcessingStepAndStatusInfo("Noise reduction using MultiscaleLinearTransform on " + imgWin.mainView.id + " without mask");
            } else {
                  this.util.addProcessingStepAndStatusInfo("Noise reduction  using MultiscaleLinearTransform on " + imgWin.mainView.id + " using mask " + maskWin.mainView.id);
            }
      }
      this.runNoiseReductionEx(imgWin, maskWin, this.par.noise_reduction_strength.val, linear);
}

runColorReduceNoise(imgWin)
{
      this.util.addProcessingStepAndStatusInfo("Color noise reduction on " + imgWin.mainView.id);
      var node = this.flowchart.flowchartOperation("TGVDenoise");

      if (this.global.get_flowchart_data) {
            return;
      }

      var P = new TGVDenoise;
      P.rgbkMode = false;
      P.filterEnabledL = false;
      P.filterEnabledC = true;
      P.supportEnabled = true;

      imgWin.mainView.beginProcess(UndoFlag.NoSwapFile);

      /* Remove color noise from the whole image. */
      P.executeOn(imgWin.mainView, false);

      imgWin.mainView.endProcess();

      this.printAndSaveProcessValues(P, this.findChannelFromNameIf(imgWin.mainView.id), imgWin.mainView.id);
      this.engine_end_process(node, imgWin, "TGVDenoise");

      this.guiUpdatePreviewWin(imgWin);
}

starReduceNoise(imgWin)
{
      this.util.addProcessingStepAndStatusInfo("Star noise reduction on " + imgWin.mainView.id);
      var node = this.flowchart.flowchartOperation("TGVDenoise" + (this.util.findKeywordName(imgWin, "AutoIntegrateStars") ? ":stars" : ""));

      if (this.global.get_flowchart_data) {
            return;
      }

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

      imgWin.mainView.beginProcess(UndoFlag.NoSwapFile);

      P.executeOn(imgWin.mainView, false);

      imgWin.mainView.endProcess();

      this.printAndSaveProcessValues(P, "", imgWin.mainView.id);
      this.engine_end_process(node, imgWin, "TGVDenoise");
}

/**
 * Calculate the median of an array of numbers.
 * @param {number[]} data - Array of numbers.
 * @returns {number} The median value.
 */
calculateMedian(data) 
{
      const sorted = data.slice().sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 !== 0
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Function to calculate standard deviation
calculateStdDev(array, median) 
{
      var sumSq = 0;
      for (var i = 0; i < array.length; i++) {
            var diff = array[i] - median;
            sumSq += diff * diff;
      }
      return Math.sqrt(sumSq / array.length);
}

/**
 * Calculate statistics for image background checks.
 * σ is estimated using the Median Absolute Deviation (MAD) scaled for a normal distribution.
 *
 * @param {win} - Image window
 * @returns {object} Object with median, stddev, mad, sigma.
 */
calculateImageStats(win)
{
      const med = win.mainView.image.median();

      // Compute the median absolute deviation (MAD)
      const mad = win.mainView.image.MAD();

      // Convert MAD to an approximation of σ for a normal distribution
      const sigma = mad * 1.4826;

      // Calculate stdandard deviation
      var stdDev = win.mainView.image.stdDev();

      return {
            median: med,
            stdDev: stdDev,
            mad: mad,
            sigma: sigma
      };
}

findBackgroundRegions(w, windowSize, imageStats, testmode)
{
      console.writeln("Finding background regions in " + w.mainView.id + ", window size " + windowSize);

      var image = w.mainView.image;

      // Get image dimensions
      var width = image.width;
      var height = image.height;

      // Array to store background regions
      var backgroundRegions = [];

      // Iterate over the image with the defined window size
      var nchecked = 0;
      var tiles_excluded = 0;
      var scaled_exclusion_areas = this.util.getScaledExclusionAreas(this.global.exclusion_areas, w);
      var polygons = scaled_exclusion_areas.polygons;
      for (var y = windowSize, cnt = 0; y <= height - windowSize; y += 10, cnt++) {
            for (var x = windowSize; x <= width - windowSize; x += 10) {
                  var rect = new Rect(x, y, x + windowSize, y + windowSize);
                  if (polygons.length > 0) {
                        // Check if some part of the tile is inside the exclusion area
                        if (this.isPointExcluded(x, y, polygons)) {
                              tiles_excluded++;
                              continue;
                        }
                        if (this.isPointExcluded(x, y + windowSize, polygons)) {
                              tiles_excluded++;
                              continue;
                        }
                        if (this.isPointExcluded(x + windowSize, y, polygons)) {
                              tiles_excluded++;
                              continue;
                        }
                        if (this.isPointExcluded(x + windowSize, y + windowSize, polygons)) {
                              tiles_excluded++;
                              continue;
                        }
                  }

                  var windowMedian = w.mainView.image.median(rect);
                  var windowStdDev = w.mainView.image.stdDev(rect);

                  // Check if the window meets the background criteria
                  if (windowMedian < imageStats.median
                        && windowMedian > imageStats.median - 2 * imageStats.sigma
                        && windowStdDev < 1.5 * imageStats.stdDev)
                  {
                        backgroundRegions.push({x: x, y: y, median: windowMedian, stdDev: windowStdDev, size: windowSize});
                  }
                  if (0 && windowStdDev <= imageStats.stdDev && windowMedian <= imageStats.median) {
                        backgroundRegions.push({x: x, y: y, median: windowMedian, stdDev: windowStdDev, size: windowSize});
                  }
                  nchecked++;
            }
            if (cnt % 10 == 0) {
                  this.checkCancel();
                  CoreApplication.processEvents();
                  this.util.runGarbageCollection();
            }
            if (testmode && cnt % 10 == 0) {
                  console.writeln("Checking " + x + " " + y + ", median " + windowMedian + ", std dev " + windowStdDev + ", background regions found: " + backgroundRegions.length);
                  console.flush();
            }
      }
      console.writeln("Total Background Regions Found: " + backgroundRegions.length + ", Total regions checked: " + nchecked + ", Excluded regions: " + tiles_excluded);

      return backgroundRegions;
}

// Find a true background area in the image
// Go thgrough the image and find a background area
// We try to find an area of 25x25 pixels
// Code generated by ChatGTP o1-mini
findTrueBackground(w, testmode)
{
      if (this.par.skip_auto_background.val) {
            console.writeln("Do not try to find true background area in " + w.mainView.id);
            return null;
      }
      console.writeln("Finding true background area in " + w.mainView.id);

      var node = this.flowchart.flowchartOperation("findTrueBackground");

      if (this.global.get_flowchart_data) {
            return null;
      }

      if (!testmode) {
            // Try find existing background information
            var bg_image_id = this.autocontinue_prefix + "AutoBackgroundModel";
            var bg_win = this.util.findWindow(bg_image_id);
            if (bg_win != null) {
                  console.writeln("findTrueBackground:Found existing background information in " + bg_win.mainView.id);
                  let preview = bg_win.previewById("background");
                  if (preview.isNull) {
                        this.save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
                        this.util.throwFatalError("Error: background preview not found from " + bg_image_id);
                  }
                  var rect = bg_win.previewRect(preview);
                  this.engine_end_process(node, bg_win, "findTrueBackground");
                  var roi = { x0: rect.x0, y0: rect.y0, x1: rect.x1, y1: rect.y1 };
                  console.writeln("findTrueBackground:Returning background region at " + roi.x0 + ", " + roi.y0 + ", " + roi.x1 + ", " + roi.y1);
                  return roi;
            }
      }
      var image = w.mainView.image;

      // Get image dimensions
      var width = image.width;
      var height = image.height;

      console.writeln("Calculate image stats...");
      console.flush();

      var imageStats = this.calculateImageStats(w);
      
      console.writeln("Find background regions...");
      console.flush();

      // Define initial window size
      var windowSize = 25;
      
      // Find background regions
      var backgroundRegions = this.findBackgroundRegions(w, windowSize, imageStats, testmode);

      // Sort the background regions by median value
      backgroundRegions.sort(function(a, b) {
            return a.median - b.median;
      });

      if (backgroundRegions.length > 0) {
            if (testmode) {
                  // Output the results
                  var n_regions = 10;
                  console.writeln("Coordinates of Background Regions (Top-Left Corner):");
                  for (var i = 0; i < backgroundRegions.length && i < n_regions; i++) {
                        console.writeln(backgroundRegions[i].toSource());
                  }
            } else {
                  n_regions = 1;
            }
            console.writeln("findTrueBackground:Total Background Regions Found: " + backgroundRegions.length);

            var roi = { x0: backgroundRegions[0].x, y0: backgroundRegions[0].y, x1: backgroundRegions[0].x + windowSize, y1: backgroundRegions[0].y + windowSize };
            
            var bw_id = this.util.ensure_win_prefix("AutoBackgroundModel");
            console.writeln("findTrueBackground:create new " + bw_id + " window");
            var bw = this.util.forceCopyWindow(w, bw_id);

            // Optionally, highlight the found region on the image
            // Draw only first region
            if (this.gui) {
                  console.writeln("findTrueBackground:Highlighting background region");
                  var bitmap = this.util.createEmptyBitmap(width, height, 0x00C0C0C0);  // transparent background
                  var graphics = new Graphics(bitmap);
                  graphics.pen = new Pen(0xFFFF0000, 4);
                  graphics.transparentBackground = true;

                  for (var i = 0; i < backgroundRegions.length && i < n_regions; i++) {
                        var region = backgroundRegions[i];
                        var x = region.x;
                        var y = region.y;

                        // Create a rectangle
                        graphics.drawRect(x, y, x + windowSize, y + windowSize);
                  }
                  graphics.end();

                  bw.mainView.beginProcess(UndoFlag.NoSwapFile);
                  bw.mainView.image.blend(bitmap);
                  bw.mainView.endProcess();
                  bitmap.clear();
            }

            console.writeln("findTrueBackground:create preview");
            bw.createPreview( roi.x0, roi.y0, roi.x1, roi.y1, "background" );

            if (0 && !this.util.findKeywordName(w, "AutoIntegrateNonLinear") && this.imageIsLinear(w, imageStats.median, imageStats.stdDev)) {
                  // Autostretch for the convenience of the user
                  // For now keep original forat so pixel values are not changed
                  this.applyAutoSTF(
                        bw.mainView,
                        this.global.DEFAULT_AUTOSTRETCH_SCLIP,
                        this.global.DEFAULT_AUTOSTRETCH_TBGND,
                        false,
                        false);
            }
            this.iconized_image_ids.push(bw_id);

            this.engine_end_process(node, w, "findTrueBackground");

            console.writeln("findTrueBackground:Returning background region at " + roi.x0 + ", " + roi.y0 + ", " + roi.x1 + ", " + roi.y1);
            return roi;
      } else {
            this.util.addCriticalStatus("findTrueBackground:No background regions found matching the criteria in image " + w.mainView.id);
            return null;
      }
}

runBackgroundNeutralization(imgWin, find_true_background = true, skip_flowchart = false)
{
      var imgView = imgWin.mainView;
      this.util.addProcessingStepAndStatusInfo("Background neutralization on " + imgView.id);

      if (find_true_background) {
            var roi = this.findTrueBackground(imgWin, false);
      } else {
            var roi = null;
      }

      if (skip_flowchart) {
            node = null;
      } else {
            var node = this.flowchart.flowchartOperation("BackgroundNeutralization");
            if (this.global.get_flowchart_data) {
                  return null;
            }
      }

      var P = new BackgroundNeutralization;
      if (roi != null) {
            console.writeln("Background neutralization using background region at " + roi.x0 + ", " + roi.y0 + ", " + roi.x1 + ", " + roi.y1);
            P.useROI = true;
            P.roiX0 = roi.x0;
            P.roiY0 = roi.y0;
            P.roiX1 = roi.x1;
            P.roiY1 = roi.y1;
      }

      imgView.beginProcess(UndoFlag.NoSwapFile);

      P.executeOn(imgView, false);

      imgView.endProcess();

      this.printAndSaveProcessValues(P, "", imgView.id);
      this.engine_end_process(node, imgWin, "BackgroundNeutralization");

      this.guiUpdatePreviewId(imgView.id);

      return roi;
}

// Point-in-polygon test using ray casting algorithm
isPointInPolygon(x, y, polygon) {
   var inside = false;
   for (var i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      var xi = polygon[i].x, yi = polygon[i].y;
      var xj = polygon[j].x, yj = polygon[j].y;
      
      var intersect = ((yi > y) != (yj > y)) && 
                      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
   }
   return inside;
}

// Function to check if a point is inside any exclusion area
// This can be used by other scripts to implement exclusion functionality
isPointExcluded(x, y, exclusionAreas) {
   for (var i = 0; i < exclusionAreas.length; i++) {
      if (this.isPointInPolygon(x, y, exclusionAreas[i])) {
         return true;
      }
   }
   return false;
}

findSampleFromTile(tileNumber, x, y, x_size, y_size, backgroundRegions, selectedRegions)
{
      // Find a sample in the background regions
      var foundRegions = [];
      for (var i = 0; i < backgroundRegions.length; i++) {
            var region = backgroundRegions[i];
            if (region.x >= x && region.x < x + x_size && region.y >= y && region.y < y + y_size) {
                  if (foundRegions.length < 3) {
                        let sample = region;
                        // console.writeln("Tile " + tileNumber + ", sample at x " + sample.x + ", y " + sample.y + ", median " + sample.median + ", std dev " + sample.stdDev);
                  }
                  foundRegions.push(region);
            }
      }
      if (foundRegions.length > 0) {
            // Sort the found regions by median value
            foundRegions.sort(function(a, b) {
                  return a.median - b.median;
            });
            // Pick the first region outside of the exclusion area as the sample
            let sample = foundRegions[0];
            selectedRegions.push(sample);
            console.writeln("Tile " + tileNumber + ", " + foundRegions.length + " samples" + ", best sample at x " + sample.x + ", y " + sample.y + ", median " + sample.median + ", std dev " + sample.stdDev);
      } else {
            // No sample found in this area, so we can skip it
            console.writeln("Tile " + tileNumber + ", no samples");
      }
}

runDBEprocess(imgWin, image_samples)
{
      var data = image_samples.data;
      var samples = image_samples.samples;

      console.writeln("DBE on " + imgWin.mainView.id  + ", normalize " + this.par.dbe_normalize.val);
      // console.writeln("data: " + data.toSource());
      // console.writeln("samples: " + samples.toSource());

      var P = new DynamicBackgroundExtraction;
      P.data = data;    // x, y, z0, w0, z1, w1, z2, w2
      P.numberOfChannels = imgWin.mainView.image.numberOfChannels;
      P.derivativeOrder = 2;
      P.smoothing = 0.250;
      P.ignoreWeights = false;
      P.modelId = "";
      P.modelWidth = 0;
      P.modelHeight = 0;
      P.downsample = 2;
      P.modelSampleFormat = DynamicBackgroundExtraction.f32;
      P.targetCorrection = DynamicBackgroundExtraction.Subtract;
      P.normalize = this.par.dbe_normalize.val;
      P.discardModel = this.par.GC_output_background_model.val ? false : true;
      P.replaceTarget = true;
      P.correctedImageId = "";
      P.correctedImageSampleFormat = DynamicBackgroundExtraction.SameAsTarget;
      P.samples = samples;          // x, y, radius, symmetries, axialCount, isFixed, z0, w0, z1, w1, z2, w2
      P.imageWidth = imgWin.mainView.image.width;
      P.imageHeight = imgWin.mainView.image.height;
      P.symmetryCenterX = 0.500000;
      P.symmetryCenterY = 0.500000;
      P.tolerance = 0.500;
      P.shadowsRelaxation = 3.000;
      P.minSampleFraction = 0.050;
      P.defaultSampleRadius = image_samples.radius;
      P.samplesPerRow = 10;
      P.minWeight = 0.750;
      P.sampleColor = 4292927712;
      P.selectedSampleColor = 4278255360;
      P.selectedSampleFillColor = 0;
      P.badSampleColor = 4294901760;
      P.badSampleFillColor = 2164195328;
      P.axisColor = 4292927712;

      imgWin.mainView.beginProcess(UndoFlag.NoSwapFile);

      P.executeOn(imgWin.mainView, false);

      imgWin.mainView.endProcess();

      this.printAndSaveProcessValues(P, this.findChannelFromNameIf(imgWin.mainView.id), imgWin.mainView.id);

      this.engine_end_process(null);

      this.iconized_image_ids.push(imgWin.mainView.id + "_background");
}

/**
 * Calculate the weight for a DBE sample.
 *
 * @param {number} sampleMedian - Sigma-clipped median of the sample region.
 * @param {number} globalBackground - Estimated this.global background level.
 * @param {number} tolerance - Tolerance value controlling weight sensitivity.
 * @returns {number} Weight (between 0 and 1).
 */
calculateSampleWeight(sampleMedian, globalBackground, tolerance) 
{
      // Compute the absolute difference between sample background and this.global background
      var delta = Math.abs(sampleMedian - globalBackground);
      
      // Compute weight using an exponential decay function.
      // A smaller tolerance makes the weight drop off more rapidly.
      var weight = Math.exp(- (delta * delta) / (2 * tolerance * tolerance));
      return weight;
}

/**
 * Calculates the minimum normalized distance from a sample point to any image edge
 * Normalized value [0, 1] where 0 is at the edge and 1 is at the center
 * 
 * @param {Object} region - The region point with x, y coordinates
 * @param {Number} width - Image width in pixels
 * @param {Number} height - Image height in pixels
 * @return {Number} The minimum distance to any edge in range [0, 1]
 */
calculateNormalizedDistanceFromEdge(region, width, height) {
      // Calculate distance to each edge
      const distToLeft = region.x / (width / 2);
      const distToRight = (width - region.x) / (width / 2);
      const distToTop = region.y / (height / 2);
      const distToBottom = (height - region.y) / (height / 2);
      
      // Return the minimum distance
      return Math.min(distToLeft, distToRight, distToTop, distToBottom);
}

/**
 * Outlier factor calculation
 * 
 * @param {Number} value - The sample value
 * @param {Number} median - The median value (this.global or local)
 * @param {Number} stdDev - The standard deviation (this.global or local)
 * @return {Number} Scaled outlier factor between 0.2 and 1.0
 */
calculateOutlierFactor(value, median, stdDev) 
{
      // Only consider values above the median as "bright" outliers
      // If value is below median, no outlier factor (return 1.0 - full weight)
      if (value <= median) {
          return 1.0; // No reduction in factor for values below or equal to median
      }
      
      // Calculate z-score only for values above median (bright outliers)
      const zScore = (value - median) / (stdDev > 0 ? stdDev : 1);
      
      // Use a more gradual scaling function
      // This allows outliers to still contribute, but with reduced weight
      
      // Option 1: Sigmoid-like with minimum threshold
      const minFactor = 0.2;  // Even extreme outliers retain 20% weight
      const scaleFactor = 2.0; // Controls how quickly weight drops off
      
      return minFactor + (1 - minFactor) / (1 + Math.pow(zScore / scaleFactor, 2));
      
      // Option 2: Linear scaling with clamping
      // const minFactor = 0.2;
      // const maxZScore = 3.0;  // z-score at which we reach minimum factor
      // return Math.max(minFactor, 1.0 - (zScore / maxZScore) * (1.0 - minFactor));
}

///**
// * Calculate the optimal weight for a sample based on various factors
// *
// * @param {Object} image - Image window
// * @param {Object} region - The sample point with x, y coordinates
// * @param {Number} channel - The color channel (0, 1, 2 for RGB)
// * @param {Object} channelStats - Channel statistics object for channel containing mean, median, stdDev, etc.
// * @param {Object} regionStats - Statistics object for the reqion containing mean, median, stdDev, etc.
// * @param {Object} firstSample - Boolean indicating if this is the first sample
// * @returns {Number} The calculated weight for the sample
// */
calculateOptimalWeight(image, region, channel, channelStats, regionStats, firstSample)
{
      // Base weight starts at 1.0
      let weight = 1.0;

      // 1. Signal-to-noise ratio factor
      // Higher SNR gets higher weight
      const snr = regionStats.mean / regionStats.stdDev;
      const snrFactor = Math.min(0.5 + 0.5 * Math.min(1.0, snr / 10), 1.0); // Cap at 1.0
      weight *= snrFactor;
      
      // 2. Outlier detection
      const outlierFactor = this.calculateOutlierFactor(
                              regionStats.mean,     // Sample region mean
                              channelStats.median,  // Global median reference
                              channelStats.stdDev   // Global standard deviation
      );
      weight *= outlierFactor;
      
      // 3. Edge proximity factor - adjust weight based on distance from edge

      // Normalized value [0, 1] where 0 is at the edge and 1 is at the center
      const normalizedDist = this.calculateNormalizedDistanceFromEdge(region, image.width, image.height);
      
      // Two possible strategies:
      
      // Option 1: Reduce weight for edge samples
      // This helps prevent edge artifacts from affecting the model
      // const edgeFactor = 0.5 + 0.5 * normalizedDist;
      // weight *= edgeFactor;

      // Option 2: Increase weight for edge samples
      // This helps the model better fit edge vignetting
      const edgeFactor = 0.7 + 0.3 * (1 - normalizedDist);
      weight *= edgeFactor;
      
      // 4. Local gradient strength
      // In areas with strong gradients, we might want higher weights
      // const gradientStrength = regionStats.localGradient / regionStats.mean;
      // const gradientFactor = Math.min(1.0, 0.5 + gradientStrength);
      // weight *= gradientFactor;
      
      // 5. Sample region uniformity
      // More uniform regions are better background samples
      const uniformityFactor = Math.exp(-regionStats.stdDev / regionStats.mean);
      weight *= uniformityFactor;

      if (firstSample) {
            // First region, print header row
            console.writeln("x y ch - median mean stdDev - snrFactor outlierFactor uniformityFactor edgeFactor - Weight");
      }
      if (weight >= this.par.dbe_min_weight.val) {
            var weight_ok = " *";
      } else {
            var weight_ok = "";
      }
      // Print region information formatted to fixed lengths
      console.writeln(region.x + " " + region.y + " " + channel + " - " + 
                      regionStats.median.toFixed(4) + " " + regionStats.mean.toFixed(4) + " " + regionStats.stdDev.toFixed(4) + " - " + 
                      snrFactor.toFixed(4) + " " + outlierFactor.toFixed(4) + " " + 
                      uniformityFactor.toFixed(4) + " " + edgeFactor.toFixed(4) + " - " + 
                      weight.toFixed(4) + weight_ok);

      return weight;
}

findDBEsamples(w)
{
      var image = w.mainView.image;

      console.writeln("Finding DBE samples in " + w.mainView.id);

      var image = w.mainView.image;

      // Get image dimensions
      var width = image.width;
      var height = image.height;

      // Define window size
      var windowSize = 25;
      
      console.writeln("Calculate image stats...");
      console.flush();

      var imageStats = this.calculateImageStats(w);
      
      console.writeln("Find sample regions...");
      console.flush();

      // var adjust_low = this.getAdjustPoint(w, 1);
      // console.writeln("Adjust low: " + adjust_low.normalizedAdjustPoint);
      // var adjust_high = this.getAdjustPoint(w, 80);
      // console.writeln("Adjust high: " + adjust_high.normalizedAdjustPoint);

      // Array to store background regions
      var backgroundRegions = [];

      // Iterate over the image with the defined window size
      var nchecked = 0;
      var stepsize = 10;
      var tileNumber = 0;
      var tile_x_size = Math.floor(width / this.par.dbe_samples_per_row.val);
      var tile_y_size = Math.floor(height / this.par.dbe_samples_per_row.val);
      var print_x = Math.floor(tile_x_size / 2);
      var print_y = Math.floor(tile_y_size / 2);
      var tiles_excluded = 0;
      var scaled_exclusion_areas = this.util.getScaledExclusionAreas(this.global.exclusion_areas, w);
      var polygons = scaled_exclusion_areas.polygons;
      for (var y = windowSize, cnt = 0; y < height - 2 * windowSize - 1; y += stepsize, cnt++) {
            for (var x = windowSize; x < width - 2 * windowSize - 1; x += stepsize) {
                  var rect = new Rect(x, y, x + windowSize, y + windowSize);
                  if (polygons.length > 0) {
                        // Check if some part of the tile is inside the exclusion area
                        if (this.isPointExcluded(x, y, polygons)) {
                              tiles_excluded++;
                              continue;
                        }
                        if (this.isPointExcluded(x, y + windowSize, polygons)) {
                              tiles_excluded++;
                              continue;
                        }
                        if (this.isPointExcluded(x + windowSize, y, polygons)) {
                              tiles_excluded++;
                              continue;
                        }
                        if (this.isPointExcluded(x + windowSize, y + windowSize, polygons)) {
                              tiles_excluded++;
                              continue;
                        }
                  }
                  
                  var windowMedian = image.mean(rect);
                  var windowStdDev = image.stdDev(rect);
                  var windowMean = w.mainView.image.mean(rect);

                  // Check if the window meets the background criteria
                  if (windowMedian < imageStats.median
                      && windowMedian > imageStats.median - 2 * imageStats.sigma
                      && windowStdDev < 1.5 * imageStats.stdDev)
                  {
                        backgroundRegions.push({x: x, y: y, median: windowMedian, stdDev: windowStdDev, mean: windowMean, size: windowSize});
                  }
                  nchecked++;
                  if (x > print_x && y > print_y) {
                        console.writeln("Tile " + tileNumber + ", x " + x + ", y " + y + ", median " + windowMedian + ", std dev " + windowStdDev + ", mean " + windowMean +
                                        ", sample regions found " + backgroundRegions.length + "/" + nchecked);
                        console.flush();
                        print_x += tile_x_size;
                        tileNumber++;
                  }      
            }
            if (y > print_y) {
                  print_y += tile_y_size;
                  print_x = Math.floor(tile_x_size / 2);
            }
            if (cnt % 10 == 0) {
                  this.checkCancel();
                  CoreApplication.processEvents();
                  this.util.runGarbageCollection();
            }
      }
      console.writeln("Total sample regions found: " + backgroundRegions.length + ", Total regions checked: " + nchecked + ", Total tiles excluded: " + tiles_excluded);

      // Split the image to tiles and pick one area from backgroundRegions 
      // for each tile
      console.writeln("Splitting image to " + this.par.dbe_samples_per_row.val + "x" + this.par.dbe_samples_per_row.val + " tiles and picking samples...");
      console.writeln("Image width " + width + ", height " + height);
      console.writeln("Tile width " + tile_x_size + ", height " + tile_y_size);
      var selectedRegions = [];
      var tileNumber = 0;
      var linesX = [];
      var linesY = [];
      for (var y = 0; y < height - tile_y_size / 2; y += tile_y_size) {
            if (y > 0) {
                  linesY.push(y);
            }
            for (var x = 0; x < width - tile_x_size / 2; x += tile_x_size) {
                  // console.writeln("Tile " + tileNumber + ", x " + x + ", y " + y + ", x1 " + (x + tile_x_size) + ", y1 " + (y + tile_y_size));
                  this.findSampleFromTile(tileNumber, x, y, tile_x_size, tile_y_size, backgroundRegions, selectedRegions);
                  if (y == 0 && x > 0) {
                        linesX.push(x);
                  }
                  tileNumber++;
            }
            this.checkCancel();
            CoreApplication.processEvents();
            this.util.runGarbageCollection();
      }

      if (selectedRegions.length > 0) {
            console.writeln("findDBEsamples:Selected Background Regions Found: " + selectedRegions.length);

            // Channel based values
            var channelStats = [];
            for (var j = 0; j < image.numberOfChannels; j++) {
                  channelStats[j] = {
                        median: image.median(new Rect(0), j, j),
                        stdDev: image.stdDev(new Rect(0), j, j)
                  };
                  console.writeln("findDBEsamples:Channel " + j + ", median " + channelStats[j].median + ", std dev " + channelStats[j].stdDev);
            }
            CoreApplication.processEvents();
            // Sort selected regions by x and y coordinates
            selectedRegions.sort(function(a, b) {
                  return a.x - b.x || a.y - b.y;
            });
            // Create data and sample point for DBE
            // x, y, z0, w0, z1, w1, z2, w2
            var data = [];
            // x, y, radius, symmetries, axialCount, isFixed, z0, w0, z1, w1, z2, w2
            var samples = [];
            var firstSample = true;
            CoreApplication.processEvents();
            for (var i = 0; i < selectedRegions.length; i++) {
                  var region = selectedRegions[i];
                  var datarow = [ region.x / width, region.y / height ];      // Normalize x and y to [0, 1]
                  var samplerow = [ Math.floor(region.x + region.size / 2), Math.floor(region.y + region.size / 2) ];   // x, y
                  samplerow.push(Math.floor(region.size / 2), 0, 6, 0);       // radius, symmetries, axialCount, isFixed
                  var rect = new Rect(region.x, region.y, region.x + region.size, region.y + region.size);
                  var min_weight_ok_count = 0;
                  for (var j = 0; j < image.numberOfChannels; j++) {
                        var regionStats = {
                              mean: image.mean(rect, j, j),
                              median: image.median(rect, j, j),
                              stdDev: image.stdDev(rect, j, j)
                        };
                        var sampleWeight = this.calculateOptimalWeight(image, region, j, channelStats[j], regionStats, firstSample);
                        firstSample = false;
                        // Check if minimum weight is reached
                        if (sampleWeight >= this.par.dbe_min_weight.val) {
                              min_weight_ok_count++;
                        }
                        datarow.push(regionStats.mean, sampleWeight, 0, 0, 0, 0);     // z0, w0, z1, w1, z2, w2
                        samplerow.push(regionStats.mean, sampleWeight, 0, 0, 0, 0);   // z0, w0, z1, w1, z2, w2   
                  }
                  // console.writeln("findDBEsamples:Data row: " + datarow.toSource() + ", Sample row: " + samplerow.toSource());
                  // Check if minimum weight is reached for aby channel
                  if (min_weight_ok_count == 0) {
                        // console.writeln("findDBEsamples:Minimum weight not reached for any channel, skipping this sample.");
                        continue;
                  }
                  data.push(datarow);
                  samples.push(samplerow);
                  CoreApplication.processEvents();
            }

            if (data.length == 0) {
                  this.util.addCriticalStatus("findDBEsamples:No samples found matching the criteria in image " + w.mainView.id + ", consider lowering minimum sample weight.");
                  return null;
            }

            console.writeln("findDBEsamples:Total samples accepted: " + data.length + ", Total samples rejected: " + (selectedRegions.length - data.length));

            // Optionally, highlight the found regions on the image
            // Draw regions
            if (this.gui) {
                  console.writeln("findDBEsamples:Highlighting background region");

                  var bw_id = this.util.ensure_win_prefix(w.mainView.id + "_DBEsamples");
                  console.writeln("findDBEsamples:create new " + bw_id + " window for visualizing samples");
                  var bw = this.util.forceCopyWindow(w, bw_id);
      
                  var bitmap = this.util.createEmptyBitmap(width, height, 0x00C0C0C0);  // transparent background
                  var graphics = new Graphics(bitmap);
                  graphics.pen = new Pen(0xFFFFFFFF, 4);
                  graphics.transparentBackground = true;

                  // Draw lines for region boundaries
                  for (var i = 0; i < linesX.length; i++) {
                        var x = linesX[i];
                        graphics.drawLine(x, 0, x, height);
                  }
                  for (var i = 0; i < linesY.length; i++) {
                        var y = linesY[i];
                        graphics.drawLine(0, y, width, y);
                  }
                  // Draw select points
                  graphics.pen = new Pen(0xFFFF0000, 4);
                  for (var i = 0; i < selectedRegions.length; i++) {
                        var region = selectedRegions[i];
                        var x = region.x;
                        var y = region.y;

                        // Create a rectangle
                        graphics.drawRect(x, y, x + windowSize, y + windowSize);
                  }
                  if (this.global.exclusion_areas.polygons.length > 0) {
                        // Draw exclusion areas
                        graphics.pen = new Pen(0xFF00FF00, 4);
                        for (var i = 0; i < this.global.exclusion_areas.polygons.length; i++) {
                              var exclusion_area = this.global.exclusion_areas.polygons[i];
                              for (var j = 1; j < exclusion_area.length; j++) {
                                    var x = exclusion_area[j].x;
                                    var y = exclusion_area[j].y;
                                    var x1 = exclusion_area[j - 1].x;
                                    var y1 = exclusion_area[j - 1].y;
                                    graphics.drawLine(x, y, x1, y1);
                              }
                        }
                  }
                  graphics.end();

                  bw.mainView.beginProcess(UndoFlag.NoSwapFile);
                  bw.mainView.image.blend(bitmap);
                  bw.mainView.endProcess();
                  this.iconized_image_ids.push(bw_id);

                  bitmap.clear();

                  if (0 && !this.util.findKeywordName(w, "AutoIntegrateNonLinear") && this.imageIsLinear(w, imageStats.median, imageStats.stdDev)) {
                        // Autostretch for the convenience of the user
                        // For now keep original forat so pixel values are not changed
                        this.applyAutoSTF(
                              bw.mainView,
                              this.global.DEFAULT_AUTOSTRETCH_SCLIP,
                              this.global.DEFAULT_AUTOSTRETCH_TBGND,
                              false,
                              false);
                  }
            }

            this.engine_end_process(null, w);

            return { data: data, samples: samples, radius: Math.floor(windowSize / 2) };

      } else {
            this.util.addCriticalStatus("findDBEsamples:No selected background regions found matching the criteria in image " + w.mainView.id);
            return null;
      }
}

runDBE(imgWin, replaceTarget, postfix, skip_flowchart)
{
      this.util.addProcessingStepAndStatusInfo("Dynamic background extraction on " + imgWin.mainView.id);

      if (skip_flowchart) {
            var node = null;
      } else {
            var node = this.flowchart.flowchartOperation("DBE");
      }

      if (this.global.get_flowchart_data) {
            return imgWin.mainView.id;
      }

      if (replaceTarget) {
            this.util.addProcessingStepAndStatusInfo("Run DBE on image " + imgWin.mainView.id);
            var GC_id = imgWin.mainView.id;
      } else {
            var GC_id = this.util.ensure_win_prefix(this.util.replacePostfixOrAppend(imgWin.mainView.id, ["_map", "_combined"], postfix));
            this.util.addProcessingStepAndStatusInfo("Run DBE from image " + imgWin.mainView.id + ", target image " + GC_id);
            imgWin = this.util.copyWindowEx(imgWin, GC_id, true);
      }

      if (imgWin.mainView.image.numberOfChannels > 1 && this.par.dbe_use_background_neutralization.val) {
            // Run background neutralization before DBE
            this.runBackgroundNeutralization(imgWin, false, true);
      }

      if (this.par.dbe_use_abe.val) {
            // Run ABE before DBE
            this.runABEex(imgWin, true, "", true, 1, this.par.dbe_normalize.val, 'Subtraction');
      }

      var samples = this.findDBEsamples(imgWin);
      if (samples == null) {
            this.util.addCriticalStatus("DBE: No samples found matching the criteria in image " + imgWin.mainView.id);
            this.engine_end_process(node, imgWin, "DBE");
            return GC_id;
      }

      if (samples.data.length < 3 || samples.samples.length < 3) {
            this.util.addCriticalStatus("DBE: Not enough samples found matching the criteria in image " + imgWin.mainView.id);
            this.engine_end_process(node, imgWin, "DBE");
            return GC_id;
      }


      this.runDBEprocess(imgWin, samples);

      this.engine_end_process(node, imgWin, "DBE");

      console.writeln("Dynamic background extraction completed.");

      return GC_id;
}

runColorCalibrationProcess(imgWin, roi)
{
      var node = this.flowchart.flowchartOperation("ColorCalibration" + (this.util.findKeywordName(imgWin, "AutoIntegrateStars") ? ":stars" : ""));
      if (this.global.get_flowchart_data) {
            return;
      }

      try {
            this.util.addProcessingStepAndStatusInfo("Color calibration on " + imgWin.mainView.id + " using ColorCalibration process");

            var P = new ColorCalibration;
            if (roi) {
                  console.writeln("Color calibration using background region at " + roi.x0 + ", " + roi.y0 + ", " + roi.x1 + ", " + roi.y1);
                  P.backgroundUseROI = true;
                  P.backgroundROIX0 = roi.x0;
                  P.backgroundROIY0 = roi.y0;
                  P.backgroundROIX1 = roi.x1;
                  P.backgroundROIY1 = roi.y1;
            }

            imgWin.mainView.beginProcess(UndoFlag.NoSwapFile);

            P.executeOn(imgWin.mainView, false);

            imgWin.mainView.endProcess();

            this.printAndSaveProcessValues(P, "", imgWin.mainView.id);
            this.engine_end_process(node, imgWin, "ColorCalibration");

            this.guiUpdatePreviewId(imgWin.mainView.id);

      } catch(err) {
            this.save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
            console.criticalln("Color calibration failed");
            console.criticalln(err);
            console.criticalln("Maybe filter files or file format were not recognized correctly");
            this.util.throwFatalError("Color calibration failed");
      }
}

runSPCC(imgWin, phase)
{
      var node = this.flowchart.flowchartOperation("SpectrophotometricColorCalibration" + (this.util.findKeywordName(imgWin, "AutoIntegrateStars") ? ":stars" : ""));
      if (this.global.get_flowchart_data) {
            return;
      }
      try {
            this.util.addProcessingStepAndStatusInfo("Color calibration on " + imgWin.mainView.id + " using SpectrophotometricColorCalibration process");

            console.writeln("Image metadata:");
            if (this.global.pixinsight_version_num >= 1080902) {
                  console.writeln(imgWin.astrometricSolutionSummary());
            }

            var P = new SpectrophotometricColorCalibration;

            /* Need to initialize thse since at least filters are empty of not set here.
                  */
            P.applyCalibration = true;
            P.narrowbandMode = this.spcc_params.narrowband_mode;
            P.narrowbandOptimizeStars = false;
            if (this.spcc_params.white_reference == "Average Spiral Galaxy") {
                  P.whiteReferenceSpectrum = "200.5,0.0715066,201.5,0.0689827,202.5,0.0720216,203.5,0.0685511,204.5,0.0712370,205.5,0.0680646,206.5,0.0683024,207.4,0.0729174,207.8,0.0702124,208.5,0.0727025,209.5,0.0688880,210.5,0.0690528,211.5,0.0697566,212.5,0.0705508,213.5,0.0654581,214.5,0.0676317,215.5,0.0699038,216.5,0.0674922,217.5,0.0668344,218.5,0.0661763,219.5,0.0690803,220.5,0.0670864,221.5,0.0635644,222.5,0.0619833,223.5,0.0668687,224.5,0.0640725,225.5,0.0614358,226.5,0.0628698,227.5,0.0649014,228.5,0.0673391,229.5,0.0638038,230.5,0.0643234,231.5,0.0614849,232.5,0.0493110,233.5,0.0574873,234.5,0.0555616,235.5,0.0609369,236.5,0.0557384,237.5,0.0578991,238.5,0.0536321,239.5,0.0575370,240.5,0.0555389,241.5,0.0571506,242.5,0.0615309,243.5,0.0595363,244.5,0.0634798,245.5,0.0628886,246.5,0.0622975,247.5,0.0600475,248.5,0.0608933,249.5,0.0580972,250.5,0.0653082,251.3,0.0576207,251.8,0.0588533,252.5,0.0566401,253.5,0.0582714,254.5,0.0575809,255.5,0.0633762,256.5,0.0610093,257.5,0.0652874,258.5,0.0642648,259.5,0.0632596,260.5,0.0609384,261.5,0.0600490,262.5,0.0636409,263.5,0.0682040,264.5,0.0754600,265.5,0.0806341,266.5,0.0699754,267.5,0.0739405,268.5,0.0755243,269.5,0.0697483,270.5,0.0736132,271.5,0.0678854,272.5,0.0663086,273.5,0.0709825,274.5,0.0602999,275.5,0.0630128,276.5,0.0669431,277.5,0.0701399,278.5,0.0641577,279.5,0.0511231,280.5,0.0550197,281.5,0.0692974,282.5,0.0753517,283.5,0.0723537,284.5,0.0679725,285.5,0.0634174,286.5,0.0742486,287.5,0.0783316,288.5,0.0771108,289.5,0.0801337,291,0.0914252,293,0.0862422,295,0.0838485,297,0.0858467,299,0.0865643,301,0.0875161,303,0.0893837,305,0.0905257,307,0.0935800,309,0.0934870,311,0.0982195,313,0.0953176,315,0.0961554,317,0.0995933,319,0.0924967,321,0.0978345,323,0.0907337,325,0.1054383,327,0.1143168,329,0.1135342,331,0.1106139,333,0.1119505,335,0.1099062,337,0.0967928,339,0.1022504,341,0.1039447,343,0.1063681,345,0.1091599,347,0.1109753,349,0.1181664,351,0.1232860,353,0.1163073,355,0.1267769,357,0.1035215,359,0.1042786,361,0.1176823,363,0.1219479,364,0.1250342,365,0.1363934,367,0.1407033,369,0.1288466,371,0.1379791,373,0.1127623,375,0.1318217,377,0.1528880,379,0.1670432,381,0.1727864,383,0.1243124,385,0.1639393,387,0.1724457,389,0.1520460,391,0.2043430,393,0.1427526,395,0.1870668,397,0.1244026,399,0.2329267,401,0.2556144,403,0.2542109,405,0.2491356,407,0.2379803,409,0.2541684,411,0.2279309,413,0.2533629,415,0.2557223,417,0.2584198,419,0.2560216,421,0.2587210,423,0.2498130,425,0.2609755,427,0.2495886,429,0.2412927,431,0.2182856,433,0.2579985,435,0.2483036,437,0.2928112,439,0.2713431,441,0.2828921,443,0.2975108,445,0.3012513,447,0.3161393,449,0.3221464,451,0.3585586,453,0.3219299,455,0.3334392,457,0.3568741,459,0.3412296,461,0.3498501,463,0.3424920,465,0.3478877,467,0.3611478,469,0.3560448,471,0.3456585,473,0.3587672,475,0.3690553,477,0.3657369,479,0.3671625,481,0.3666357,483,0.3761265,485,0.3466382,487,0.3121751,489,0.3651561,491,0.3688824,493,0.3627420,495,0.3786295,497,0.3733906,499,0.3510300,501,0.3338136,503,0.3540298,505,0.3527861,507,0.3680833,509,0.3507047,511,0.3597249,513,0.3486136,515,0.3372089,517,0.3152444,519,0.3257755,521,0.3499922,523,0.3744245,525,0.3907778,527,0.3490228,529,0.3972061,531,0.4203442,533,0.3740999,535,0.4084084,537,0.4070036,539,0.3993480,541,0.3942389,543,0.4010466,545,0.4128880,547,0.4055525,549,0.4094232,551,0.4053814,553,0.4201633,555,0.4269231,557,0.4193749,559,0.4105311,561,0.4257824,563,0.4239540,565,0.4310873,567,0.4218358,569,0.4360353,571,0.4229342,573,0.4583894,575,0.4425389,577,0.4481210,579,0.4320856,581,0.4507180,583,0.4645862,585,0.4513373,587,0.4516404,589,0.4033701,591,0.4466167,593,0.4513267,595,0.4524209,597,0.4613319,599,0.4546841,601,0.4499895,603,0.4631190,605,0.4724762,607,0.4724962,609,0.4569794,611,0.4599737,613,0.4363290,615,0.4488329,617,0.4267759,619,0.4545143,621,0.4514890,623,0.4384229,625,0.4256613,627,0.4470943,629,0.4565981,631,0.4458333,633,0.4533333,635,0.4546457,637,0.4535446,639,0.4638791,641,0.4561002,643,0.4617287,645,0.4594083,647,0.4597119,649,0.4517238,651,0.4686735,653,0.4686423,655,0.4544898,657,0.4255737,659,0.4640177,661,0.4711876,663,0.4679153,665,0.4689913,667,0.4592265,669,0.4668144,671,0.4498947,673,0.4629239,675,0.4559567,677,0.4596584,679,0.4549789,681,0.4586439,683,0.4653622,685,0.4543475,687,0.4632128,689,0.4711164,691,0.4709973,693,0.4685415,695,0.4696455,697,0.4769241,699,0.4760169,701,0.4701294,703,0.4815669,705,0.4850302,707,0.4707895,709,0.4570604,711,0.4465777,713,0.4382957,715,0.4379654,717,0.4446168,719,0.4350767,721,0.4466714,723,0.4579113,725,0.4625222,727,0.4669903,729,0.4615551,731,0.4763299,733,0.4793147,735,0.4857778,737,0.4997366,739,0.4915129,741,0.4926212,743,0.5062475,745,0.5072637,747,0.5170334,749,0.5173594,751,0.5244106,753,0.5344788,755,0.5397524,757,0.5387203,759,0.5280215,761,0.5191969,763,0.5085395,765,0.4984095,767,0.4749347,769,0.4878839,771,0.4798119,773,0.4821991,775,0.4799906,777,0.4870453,779,0.4928744,781,0.4934236,783,0.4904677,785,0.4849491,787,0.4947343,789,0.4890020,791,0.4789132,793,0.4822390,795,0.4795733,797,0.4973323,799,0.4988779,801,0.5054210,803,0.5087054,805,0.5103235,807,0.5187602,809,0.5151330,811,0.5223530,813,0.5396030,815,0.5475528,817,0.5543915,819,0.5380259,821,0.5321401,823,0.5366753,825,0.5372011,827,0.5440262,829,0.5390591,831,0.5212784,833,0.5187033,835,0.5197124,837,0.5241092,839,0.5070799,841,0.5253056,843,0.5003658,845,0.4896143,847,0.4910508,849,0.4964088,851,0.4753377,853,0.4986498,855,0.4604553,857,0.5174022,859,0.5105171,861,0.5175606,863,0.5322153,865,0.5335880,867,0.4811849,869,0.5241390,871,0.5458069,873,0.5508025,875,0.5423946,877,0.5580108,879,0.5677047,881,0.5580099,883,0.5649928,885,0.5629494,887,0.5384574,889,0.5523318,891,0.5614248,893,0.5521309,895,0.5550786,897,0.5583751,899,0.5597844,901,0.5394855,903,0.5638478,905,0.5862635,907,0.5877920,909,0.5774965,911,0.5866240,913,0.5989106,915,0.5958623,917,0.5964975,919,0.6041389,921,0.5797449,923,0.5607401,925,0.5640816,927,0.5704267,929,0.5642119,931,0.5694372,933,0.5716141,935,0.5705180,937,0.5618458,939,0.5736730,941,0.5630236,943,0.5796418,945,0.5720721,947,0.5873186,949,0.5896322,951,0.5794164,953,0.5828271,955,0.5692468,957,0.5808756,959,0.5949017,961,0.5875516,963,0.5923656,965,0.5824188,967,0.5838008,969,0.5948942,971,0.5865689,973,0.5818128,975,0.5807992,977,0.5851036,979,0.5775164,981,0.5938626,983,0.5885816,985,0.5943664,987,0.5911885,989,0.5916490,991,0.5868101,993,0.5919505,995,0.5945270,997,0.5960248,999,0.5950870,1003,0.5948938,1007,0.5888742,1013,0.6006343,1017,0.5958836,1022,0.6004154,1028,0.6050616,1032,0.5995678,1038,0.5984462,1043,0.6035475,1048,0.5973678,1052,0.5940806,1058,0.5854267,1063,0.5827191,1068,0.5788137,1072,0.5843356,1078,0.5830553,1082,0.5762549,1087,0.5766769,1092,0.5759526,1098,0.5726978,1102,0.5718654,1108,0.5658845,1113,0.5661672,1117,0.5637793,1122,0.5660178,1128,0.5608876,1133,0.5622964,1138,0.5603359,1143,0.5563605,1147,0.5652205,1153,0.5656560,1157,0.5607483,1162,0.5540304,1167,0.5556068,1173,0.5604768,1177,0.5492890,1183,0.5464411,1187,0.5385652,1192,0.5489344,1198,0.5331419,1203,0.5451093,1207,0.5419047,1212,0.5443417,1218,0.5477119,1223,0.5460783,1227,0.5435469,1232,0.5413216,1237,0.5419156,1243,0.5360791,1248,0.5363784,1253,0.5330056,1258,0.5330475,1262,0.5312735,1267,0.5282075,1272,0.5301258,1278,0.5318302,1283,0.5143390,1288,0.5259125,1292,0.5214670,1298,0.5287547,1302,0.5231621,1308,0.5267800,1313,0.5167545,1318,0.5170787,1323,0.5186867,1328,0.5111090,1332,0.5122823,1338,0.5085013,1343,0.5118057,1347,0.5086671,1352,0.5063367,1357,0.5007655,1363,0.5001648,1367,0.5036531,1373,0.5066053,1377,0.5064235,1382,0.5083958,1388,0.5053201,1393,0.4855558,1397,0.4835752,1402,0.4799809,1408,0.4854351,1412,0.4802711,1418,0.4867642,1423,0.4831264,1428,0.4768633,1433,0.4864127,1438,0.4916220,1442,0.4807589,1448,0.4908799,1452,0.4878666,1457,0.4919060,1462,0.4832121,1467,0.4817380,1472,0.4788120,1477,0.4832511,1483,0.4873623,1488,0.4833546,1492,0.4970729,1498,0.4941945,1503,0.4882672,1507,0.4906435,1512,0.5011545,1517,0.5042579,1522,0.5053326,1528,0.5103188,1533,0.5104235,1537,0.5109443,1543,0.5088747,1548,0.5114602,1552,0.5078479,1557,0.4955375,1562,0.5020681,1567,0.5009384,1572,0.5130484,1578,0.4843262,1583,0.4878957,1587,0.4869790,1593,0.5039261,1598,0.4961504,1605,0.5016433,1615,0.5109383,1625,0.5010374,1635,0.5166810,1645,0.4997573,1655,0.5132085,1665,0.5045445,1675,0.5038381,1685,0.4979366,1695,0.5024966,1705,0.4946397,1715,0.4900714,1725,0.4820987,1735,0.4704836,1745,0.4675962,1755,0.4610580,1765,0.4542064,1775,0.4442880,1785,0.4394009,1795,0.4305704,1805,0.4214249,1815,0.4154385,1825,0.4121445,1835,0.4087068,1845,0.4004347,1855,0.3981439,1865,0.3898276,1875,0.3819086,1885,0.3837946,1895,0.3719080,1905,0.3783857,1915,0.3734775,1925,0.3706359,1935,0.3625896,1945,0.3552610,1955,0.3559292,1965,0.3516581,1975,0.3442642,1985,0.3424439,1995,0.3401458,2005,0.3400624,2015,0.3370426,2025,0.3310865,2035,0.3294150,2045,0.3300824,2055,0.3263510,2065,0.3238343,2075,0.3226433,2085,0.3196882,2095,0.3156795,2105,0.3170735,2115,0.3129192,2125,0.3107151,2135,0.3111934,2145,0.3083829,2155,0.3053164,2165,0.3011248,2175,0.2987932,2185,0.2973707,2195,0.2953015,2205,0.2894185,2215,0.2910636,2225,0.2855524,2235,0.2835412,2245,0.2813240,2255,0.2794243,2265,0.2746838,2275,0.2752567,2285,0.2700351,2295,0.2315953,2305,0.2464873,2315,0.2460988,2325,0.2138361,2335,0.2290047,2345,0.2216595,2355,0.1997312,2365,0.2151513,2375,0.2079374,2385,0.1903472,2395,0.2020694,2405,0.1988067,2415,0.1834113,2425,0.1912983,2435,0.1873909,2445,0.1783537,2455,0.1759682,2465,0.1784857,2475,0.1715942,2485,0.1573562,2495,0.1568707,2505,0.1598265";
                  P.whiteReferenceName = "Average Spiral Galaxy";
            } else if (this.spcc_params.white_reference == "Photon Flux") {
                  P.whiteReferenceSpectrum = "1,1.0,500,1.0,1000,1.0,1500,1.0,2000,1.0,2500,1.0";
                  P.whiteReferenceName = "Photon Flux";
            } else {
                  this.save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
                  this.util.throwFatalError("Unknown SPCC white reference " + this.spcc_params.white_reference);
            }
            console.writeln("SpectrophotometricColorCalibration white reference " + P.whiteReferenceName);
            P.redFilterTrCurve = "400,0.088,402,0.084,404,0.080,406,0.076,408,0.072,410,0.068,412,0.065,414,0.061,416,0.058,418,0.055,420,0.052,422,0.049,424,0.046,426,0.044,428,0.041,430,0.039,432,0.037,434,0.035,436,0.033,438,0.031,440,0.030,442,0.028,444,0.027,446,0.026,448,0.025,450,0.024,452,0.023,454,0.022,456,0.021,458,0.021,460,0.021,462,0.020,464,0.020,466,0.020,468,0.020,470,0.020,472,0.021,474,0.021,476,0.022,478,0.022,480,0.023,482,0.024,484,0.025,486,0.026,488,0.027,490,0.028,492,0.029,494,0.031,496,0.032,498,0.034,500,0.036,502,0.037,504,0.039,506,0.041,508,0.043,510,0.045,512,0.048,514,0.050,516,0.052,518,0.055,520,0.057,522,0.060,524,0.063,526,0.071,528,0.072,530,0.070,532,0.067,534,0.064,536,0.059,538,0.054,540,0.050,542,0.045,544,0.041,546,0.037,548,0.034,550,0.032,552,0.031,554,0.031,556,0.032,558,0.035,560,0.038,562,0.043,564,0.048,566,0.055,568,0.062,570,0.070,572,0.122,574,0.187,576,0.262,578,0.346,580,0.433,582,0.521,584,0.606,586,0.686,588,0.755,590,0.812,592,0.851,594,0.871,596,0.876,598,0.885,600,0.892,602,0.896,604,0.897,606,0.897,608,0.895,610,0.891,612,0.887,614,0.882,616,0.878,618,0.873,620,0.870,622,0.867,624,0.863,626,0.860,628,0.858,630,0.856,632,0.854,634,0.852,636,0.850,638,0.848,640,0.846,642,0.844,644,0.841,646,0.837,648,0.834,650,0.829,652,0.824,654,0.819,656,0.813,658,0.806,660,0.799,662,0.791,664,0.783,666,0.774,668,0.765,670,0.755,672,0.745,674,0.735,676,0.725,678,0.715,680,0.704,682,0.695,684,0.685,686,0.676,688,0.668,690,0.660,692,0.654,694,0.649,696,0.648,698,0.649,700,0.649";
            P.redFilterName = "Sony Color Sensor R-UVIRcut";
            P.greenFilterTrCurve = "400,0.089,402,0.086,404,0.082,406,0.079,408,0.075,410,0.071,412,0.066,414,0.062,416,0.058,418,0.053,420,0.049,422,0.045,424,0.042,426,0.041,428,0.042,430,0.043,432,0.044,434,0.046,436,0.047,438,0.049,440,0.051,442,0.053,444,0.055,446,0.057,448,0.059,450,0.061,452,0.064,454,0.067,456,0.069,458,0.072,460,0.075,462,0.098,464,0.130,466,0.169,468,0.215,470,0.267,472,0.323,474,0.382,476,0.443,478,0.505,480,0.566,482,0.627,484,0.684,486,0.739,488,0.788,490,0.832,492,0.868,494,0.896,496,0.915,498,0.924,500,0.921,502,0.939,504,0.947,506,0.954,508,0.961,510,0.967,512,0.973,514,0.978,516,0.982,518,0.986,520,0.989,522,0.992,524,0.994,526,0.996,528,0.997,530,0.997,532,0.995,534,0.990,536,0.986,538,0.981,540,0.977,542,0.973,544,0.969,546,0.965,548,0.960,550,0.955,552,0.949,554,0.943,556,0.936,558,0.928,560,0.919,562,0.909,564,0.898,566,0.887,568,0.874,570,0.860,572,0.845,574,0.829,576,0.812,578,0.794,580,0.775,582,0.754,584,0.733,586,0.711,588,0.688,590,0.665,592,0.640,594,0.615,596,0.589,598,0.563,600,0.537,602,0.510,604,0.483,606,0.456,608,0.430,610,0.403,612,0.377,614,0.352,616,0.328,618,0.304,620,0.282,622,0.261,624,0.242,626,0.224,628,0.225,630,0.216,632,0.207,634,0.199,636,0.192,638,0.185,640,0.179,642,0.174,644,0.169,646,0.165,648,0.161,650,0.158,652,0.156,654,0.155,656,0.154,658,0.154,660,0.155,662,0.156,664,0.158,666,0.162,668,0.165,670,0.170,672,0.176,674,0.182,676,0.189,678,0.198,680,0.207,682,0.217,684,0.228,686,0.240,688,0.240,690,0.248,692,0.257,694,0.265,696,0.274,698,0.282,700,0.289";
            P.greenFilterName = "Sony Color Sensor G-UVIRcut";
            P.blueFilterTrCurve = "400,0.438,402,0.469,404,0.496,406,0.519,408,0.539,410,0.557,412,0.572,414,0.586,416,0.599,418,0.614,420,0.631,422,0.637,424,0.647,426,0.658,428,0.670,430,0.682,432,0.695,434,0.708,436,0.720,438,0.732,440,0.743,442,0.753,444,0.762,446,0.770,448,0.777,450,0.783,452,0.788,454,0.791,456,0.794,458,0.796,460,0.797,462,0.798,464,0.798,466,0.799,468,0.800,470,0.801,472,0.800,474,0.798,476,0.793,478,0.785,480,0.774,482,0.760,484,0.742,486,0.707,488,0.669,490,0.633,492,0.598,494,0.565,496,0.533,498,0.502,500,0.473,502,0.446,504,0.419,506,0.394,508,0.370,510,0.348,512,0.326,514,0.306,516,0.287,518,0.268,520,0.251,522,0.235,524,0.220,526,0.205,528,0.192,530,0.179,532,0.167,534,0.156,536,0.145,538,0.136,540,0.126,542,0.118,544,0.110,546,0.102,548,0.095,550,0.089,552,0.083,554,0.077,556,0.071,558,0.066,560,0.061,562,0.057,564,0.052,566,0.048,568,0.044,570,0.039,572,0.041,574,0.039,576,0.037,578,0.035,580,0.033,582,0.032,584,0.030,586,0.029,588,0.027,590,0.026,592,0.025,594,0.024,596,0.023,598,0.022,600,0.022,602,0.021,604,0.021,606,0.020,608,0.020,610,0.020,612,0.020,614,0.020,616,0.020,618,0.021,620,0.021,622,0.022,624,0.022,626,0.023,628,0.024,630,0.025,632,0.026,634,0.027,636,0.028,638,0.030,640,0.031,642,0.033,644,0.035,646,0.036,648,0.038,650,0.040,652,0.042,654,0.045,656,0.048,658,0.051,660,0.054,662,0.057,664,0.059,666,0.061,668,0.063,670,0.065,672,0.066,674,0.068,676,0.069,678,0.070,680,0.071,682,0.072,684,0.072,686,0.073,688,0.073,690,0.073,692,0.073,694,0.073,696,0.073,698,0.073,700,0.073";
            P.blueFilterName = "Sony Color Sensor B-UVIRcut";
            P.redFilterWavelength = this.spcc_params.wavelengths[0];         // 656.3;
            P.redFilterBandwidth = this.spcc_params.bandhwidths[0];          // 3.0;
            P.greenFilterWavelength = this.spcc_params.wavelengths[1];       // 500.7;
            P.greenFilterBandwidth = this.spcc_params.bandhwidths[1];        // 3.0;
            P.blueFilterWavelength = this.spcc_params.wavelengths[2];        // 500.7;
            P.blueFilterBandwidth = this.spcc_params.bandhwidths[2];         // 3.0;
            P.deviceQECurve = "1,1.0,500,1.0,1000,1.0,1500,1.0,2000,1.0,2500,1.0";
            P.deviceQECurveName = "Ideal QE curve";
            P.broadbandIntegrationStepSize = 0.50;
            P.narrowbandIntegrationSteps = 10;
            P.catalogId = "GaiaDR3SP";
            if (this.par.spcc_limit_magnitude.val.toUpperCase() == 'AUTO') {
                  console.writeln("SpectrophotometricColorCalibration using Auto limit magnitude.");
                  P.limitMagnitude = 12.00;
                  P.autoLimitMagnitude = true;
            } else {
                  P.autoLimitMagnitude = false;
                  P.limitMagnitude = parseFloat(this.par.spcc_limit_magnitude.val);
                  if (P.limitMagnitude == NaN) {
                        this.save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
                        this.util.throwFatalError("Invalid limit magnitude " + this.par.spcc_limit_magnitude.val);
                  }
                  if (P.limitMagnitude > 30) {
                        console.writeln("SpectrophotometricColorCalibration adjusting limit magnitude from " + P.limitMagnitude  + " to 30.");
                        P.limitMagnitude = 30;
                  }
                  console.writeln("SpectrophotometricColorCalibration using limit magnitude " + P.limitMagnitude);
            }
            P.targetSourceCount = 8000;
            P.psfStructureLayers = this.par.spcc_detection_scales.val;
            P.saturationThreshold = this.par.spcc_saturation_threshold.val;
            P.saturationRelative = true;
            P.saturationShrinkFactor = 0.10;
            P.psfNoiseLayers = this.par.spcc_noise_scales.val;
            P.psfHotPixelFilterRadius = 1;
            P.psfNoiseReductionFilterRadius = 0;
            P.psfMinStructureSize = this.par.spcc_min_struct_size.val;
            P.psfMinSNR = this.par.spcc_min_SNR.val;
            P.psfAllowClusteredSources = true;
            P.psfType = SpectrophotometricColorCalibration.PSFType_Auto;
            P.psfGrowth = 1.25;
            P.psfMaxStars = 24576;
            P.psfSearchTolerance = 4.00;
            P.psfChannelSearchTolerance = 2.00;
            P.neutralizeBackground = this.par.spcc_background_neutralization.val;
            P.backgroundReferenceViewId = "";
            P.backgroundLow = -2.80;
            P.backgroundHigh = 2.00;
            P.backgroundUseROI = false;
            P.backgroundROIX0 = 0;
            P.backgroundROIY0 = 0;
            P.backgroundROIX1 = 0;
            P.backgroundROIY1 = 0;
            P.generateGraphs = false;
            P.generateStarMaps = false;
            P.generateTextFiles = false;
            P.outputDirectory = "";
            
            var succp = P.executeOn(imgWin.mainView);

            if (!succp) {
                  this.save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
                  this.util.throwFatalError("SpectrophotometricColorCalibration failed");
            }

            this.printAndSaveProcessValues(P, "", imgWin.mainView.id);
            this.engine_end_process(node, imgWin, "SpectrophotometricColorCalibration");

            this.guiUpdatePreviewId(imgWin.mainView.id);

            this.util.setFITSKeyword(imgWin, "AutoSPCC", "true", "Spectrophotometric Color Calibration was done by AutoIntegrate");

      } catch(err) {
            this.save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
            console.criticalln("SpectrophotometricColorCalibration failed");
            console.criticalln(err);
            console.noteln("You can try adjusting SpectophotometricColorCalibration parameters and rerun the script.");
            this.util.throwFatalError("SpectrophotometricColorCalibration failed");
      }
}

runColorCalibration(imgWin, phase, is_RGB = false)
{
      if (this.checkRGBfilters(imgWin)) {
            console.writeln("We have RGB filters, run color calibration as RGB image");
            is_RGB = true;
      }

      this.mapSPCCAutoNarrowband(is_RGB);

      console.writeln("runColorCalibration on " + imgWin.mainView.id + " in phase " + phase);
      console.writeln("process_narrowband: " + this.process_narrowband + ", narrowband_mode: " + this.spcc_params.narrowband_mode + ", color_calibration_narrowband: " + this.par.color_calibration_narrowband.val);
      // check for correct phase values
      if (phase != 'linear' && phase != 'nonlinear') {
            this.util.throwFatalError("Incorrect phase value " + phase);
      }

      if (!is_RGB && this.process_narrowband && !(this.spcc_params.narrowband_mode || this.par.color_calibration_narrowband.val)) {
            this.util.addProcessingStep("No color calibration for narrowband");
            return;
      }
      if (this.par.skip_color_calibration.val) {
            this.util.addProcessingStep("Color calibration was disabled");
            return;
      }
      if (this.par.color_calibration_time.val == phase) {
            var run_colorcalibration = true;
      } else if (this.par.color_calibration_time.val == 'auto' && !this.par.use_spcc.val) {
            // var run_colorcalibration = (phase == 'linear'); Seem to get better results when run twice
            var run_colorcalibration = true;
      } else if (this.par.color_calibration_time.val == 'both') {
            var run_colorcalibration = true;
      } else {
            var run_colorcalibration = false;
      }
      if (run_colorcalibration) {
            /* Use ColorCalibration.
             */ 
            this.runColorCalibrationProcess(imgWin);
      }
      if (this.par.use_spcc.val && phase == 'linear') {
            /* Use SPCC. SPCC is run only in linear phase.
             */
            this.runSPCC(imgWin, phase, is_RGB);
      }
}

// This is not used but kept here for possible future use.
runColorSaturation(imgWin, maskWin)
{
      this.util.addProcessingStepAndStatusInfo("Color saturation on " + imgWin.mainView.id + " using mask " + maskWin.mainView.id);
      var node = this.flowchart.flowchartOperation("ColorSaturation");
      if (this.global.get_flowchart_data) {
            return;
      }
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

      imgWin.mainView.beginProcess(UndoFlag.NoSwapFile);

      /* Saturate only light parts of the image. */
      this.setMaskChecked(imgWin, maskWin);
      imgWin.maskInverted = false;
      
      P.executeOn(imgWin.mainView, false);

      imgWin.removeMask();

      imgWin.mainView.endProcess();

      this.printAndSaveProcessValues(P, "colorsaturation", imgWin.mainView.id);
      this.engine_end_process(node);

      this.guiUpdatePreviewWin(imgWin);
}

runCurvesTransformationSaturation(imgWin, maskWin, increase = true)
{
      if (!increase) {
            maskWin = null; // No mask when decreasing saturation
      }

      if (maskWin == null) {
            this.util.addProcessingStepAndStatusInfo("Curves transformation for saturation on " + imgWin.mainView.id);
      } else {
            this.util.addProcessingStepAndStatusInfo("Curves transformation for saturation on " + imgWin.mainView.id + " using mask " + maskWin.mainView.id);
      }
      var node = this.flowchart.flowchartOperation("CurvesTransformation:saturation");
      if (this.global.get_flowchart_data) {
            return;
      }

      var P = new CurvesTransformation;
      if (increase) {
            P.S = [ // x, y
                  [0.00000, 0.00000],
                  [0.68734, 0.83204],
                  [1.00000, 1.00000]
            ];
      } else {
            P.S = [ // x, y
                  [0.00000, 0.00000],
                  [0.49261, 0.41734],
                  [1.00000, 1.00000]
            ];
      }

      imgWin.mainView.beginProcess(UndoFlag.NoSwapFile);

      if (maskWin != null) {
            /* Saturate only light parts of the image. */
            this.setMaskChecked(imgWin, maskWin);
            imgWin.maskInverted = false;
      }
      
      P.executeOn(imgWin.mainView, false);

      if (maskWin != null) {
            imgWin.removeMask();
      }

      imgWin.mainView.endProcess();

      this.printAndSaveProcessValues(P, "saturation", imgWin.mainView.id);
      this.engine_end_process(node, imgWin, "CurvesTransformation:saturation");

      this.guiUpdatePreviewWin(imgWin);
}

runCurvesTransformationChrominance(imgWin, maskWin, increase = true)
{
      if (!increase) {
            maskWin = null; // No mask when decreasing saturation
      }
      if (maskWin == null) {
            this.util.addProcessingStepAndStatusInfo("Curves transformation for chrominance  on " + imgWin.mainView.id);
      } else {
            this.util.addProcessingStepAndStatusInfo("Curves transformation for chrominance on " + imgWin.mainView.id + " using mask " + maskWin.mainView.id);
      }
      var node = this.flowchart.flowchartOperation("CurvesTransformation:chrominance");
      if (this.global.get_flowchart_data) {
            return;
      }

      var P = new CurvesTransformation;
      if (increase) {
            P.c = [ // x, y
                  [0.00000, 0.00000],
                  [0.48604, 0.51200],
                  [1.00000, 1.00000]
            ];
      } else {
            P.c = [ // x, y
                  [0.00000, 0.00000],
                  [0.51396, 0.4880],
                  [1.00000, 1.00000]
            ];
      }
      imgWin.mainView.beginProcess(UndoFlag.NoSwapFile);

      if (maskWin != null) {
            /* Apply chrominance only light parts of the image. */
            this.setMaskChecked(imgWin, maskWin);
            imgWin.maskInverted = false;
      }
      
      P.executeOn(imgWin.mainView, false);

      if (maskWin != null) {
            imgWin.removeMask();
      }

      imgWin.mainView.endProcess();

      this.printAndSaveProcessValues(P, "chrominance", imgWin.mainView.id);
      this.engine_end_process(node, imgWin, "CurvesTransformation:chrominance");

      this.guiUpdatePreviewWin(imgWin);
}

increaseSaturation(imgWin, maskWin)
{
      if (this.par.use_chrominance.val) {
            this.runCurvesTransformationChrominance(imgWin, maskWin);
      } else {
            this.runCurvesTransformationSaturation(imgWin, maskWin);
      }
}

decreaseSaturation(imgWin, maskWin)
{
      if (this.par.use_chrominance.val) {
            this.runCurvesTransformationChrominance(imgWin, maskWin, false);
      } else {
            this.runCurvesTransformationSaturation(imgWin, maskWin, false);
      }
}

// Replace last occurance of oldtxt to newtxt in str.
// If oldtxt is not found then return str + _ + newtxt.
replaceLastString(str, oldtxt, newtxt)
{
      var lstidx = str.lastIndexOf(oldtxt);
      if (lstidx == -1) {
            return str + "-" + newtxt;
      }
      return str.substring(0, lstidx) + newtxt + str.substring(lstidx + oldtxt.length);
}

runLRGBCombination(RGB_id, L_id)
{
      console.writeln("runLRGBCombination using " + RGB_id + " and " + L_id );

      if (this.par.LRGBCombination_linearfit.val) {
            console.writeln("Linear fit of " + RGB_id + " and luminance image " + L_id);
            var referenceWin = this.util.forceCopyWindow(
                                    ImageWindow.windowById(RGB_id), 
                                    this.util.ensure_win_prefix(RGB_id + "GrayScale"));
            this.convert_to_grayscale(referenceWin);
            this.linearFitImage(referenceWin.mainView.id, L_id, true, "L");
            referenceWin.forceClose();
      }

      var targetWin = this.util.copyWindow(
                        ImageWindow.windowById(RGB_id), 
                        this.util.ensure_win_prefix(this.replaceLastString(RGB_id, "RGB", "LRGB")));
      var RGBimgView = targetWin.mainView;
      this.util.addProcessingStepAndStatusInfo("LRGB combination of " + RGB_id + " and luminance image " + L_id + " into " + RGBimgView.id);
      var node = this.flowchart.flowchartOperation("LRGBCombination");
      if (this.global.get_flowchart_data) {
            return RGB_id;
      }

      var P = new LRGBCombination;
      P.channels = [ // enabled, id, k
            [false, "", 1.00000],
            [false, "", 1.00000],
            [false, "", 1.00000],
            [true, L_id, 1.00000]
      ];
      P.mL = this.par.LRGBCombination_lightness.val;
      P.mc = this.par.LRGBCombination_saturation.val;
      P.noiseReduction = true;

      RGBimgView.beginProcess(UndoFlag.NoSwapFile);

      P.executeOn(RGBimgView, false);

      RGBimgView.endProcess();

      this.printAndSaveProcessValues(P, "", RGBimgView.id);
      this.engine_end_process(node, targetWin, "LRGBCombination");

      this.guiUpdatePreviewId(RGBimgView.id);

      this.setAutoIntegrateFilters(RGBimgView.id, [ RGB_id, L_id ]);

      return RGBimgView.id;
}

runSCNR(imgWin, fixing_stars)
{
      var RGBimgView = imgWin.mainView
      if (!fixing_stars) {
            this.util.addProcessingStepAndStatusInfo("SCNR on " + RGBimgView.id);
      }
      var node = this.flowchart.flowchartOperation("SCNR" + (this.util.findKeywordName(imgWin, "AutoIntegrateStars") ? ":stars" : ""));
      if (this.global.get_flowchart_data) {
            return;
      }

      var P = new SCNR;
      if (this.process_narrowband && this.par.leave_some_green.val && !fixing_stars) {
            P.amount = this.par.leave_some_green_amount.val;
            this.util.addProcessingStep("Run SCNR using amount " + P.amount + " to leave some green color");
      } else {
            P.amount = 1.00;
      }

      RGBimgView.beginProcess(UndoFlag.NoSwapFile);

      P.executeOn(RGBimgView, false);

      RGBimgView.endProcess();

      this.printAndSaveProcessValues(P, "", RGBimgView.id);
      this.engine_end_process(node, imgWin, "SCNR");

      this.guiUpdatePreviewId(RGBimgView.id);
}

// Run hue shift on narrowband image to enhance orange.
enhancementsNarrowbandOrangeHueShift(imgView)
{
      this.addEnhancementsStep("Orange hue shift");
      var node = this.flowchart.flowchartOperation("CurvesTransformation:orangehueshift");
      if (this.global.get_flowchart_data) {
            return;
      }

      var P = new CurvesTransformation;
      P.H = [ // x, y
         [0.00000, 0.00000],
         [0.30361, 0.18576],
         [0.47454, 0.47348],
         [1.00000, 1.00000]
      ];
      
      imgView.beginProcess(UndoFlag.NoSwapFile);

      P.executeOn(imgView, false);

      imgView.endProcess();

      this.engine_end_process(node);

      this.guiUpdatePreviewId(imgView.id);
}

runMultiscaleLinearTransformSharpen(imgWin, maskWin)
{
      if (maskWin != null) {
            this.util.addProcessingStepAndStatusInfo("Sharpening on " + imgWin.mainView.id + " using mask " + maskWin.mainView.id);
      } else {
            this.util.addProcessingStepAndStatusInfo("Sharpening on " + imgWin.mainView.id);
      }
      var node = this.flowchart.flowchartOperation("MultiscaleLinearTransform:sharpen" + (this.util.findKeywordName(imgWin, "AutoIntegrateStars") ? ":stars" : ""));
      if (this.global.get_flowchart_data) {
            return;
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
      
      imgWin.mainView.beginProcess(UndoFlag.NoSwapFile);

      if (maskWin != null) {
            /* Sharpen only light parts of the image. */
            this.setMaskChecked(imgWin, maskWin);
            imgWin.maskInverted = false;
      }

      P.executeOn(imgWin.mainView, false);

      if (maskWin != null) {
            imgWin.removeMask();
      }

      imgWin.mainView.endProcess();

      this.printAndSaveProcessValues(P, "sharpen", imgWin.mainView.id);
      this.engine_end_process(node, imgWin, "MultiscaleLinearTransform:sharpen");

      this.guiUpdatePreviewWin(imgWin);
}

writeProcessingStepsAndEndLog(alignedFiles, autocontinue, basename, iserror)
{
      if (basename == null) {
            if (autocontinue) {
                  basename = "AutoContinue";
            } else {
                  basename = "AutoIntegrate";
            }
      }
      this.logfname = basename + this.util.getOptionalUniqueFilenamePart() + ".log";
      if (this.par.win_prefix_to_log_files.val && !this.global.get_flowchart_data) {
            this.logfname = this.util.ensure_win_prefix(this.logfname);
      }

      if (!this.global.write_processing_log_file) {
            console.writeln(basename + " log file not written.");
            return;
      }

      var dialogRet = this.util.ensureDialogFilePath(basename + ".log");
      if (dialogRet == 0) {
            // Canceled, do not save
            return;
      }

      if (dialogRet == 1) {
            // User gave explicit directory
            var processedPath = this.global.outputRootDir;
      } else {
            // Use defaults
            var processedPath = this.util.combinePath(this.global.outputRootDir, this.global.AutoProcessedDir);
      }
      processedPath = this.util.ensurePathEndSlash(processedPath);

      this.global.run_results.processing_steps_file = processedPath + this.logfname;

      console.writeln("Write processing steps to " + this.global.run_results.processing_steps_file);

      let logdata = this.util.endLog();
      if (logdata != null) {
            var file = new File();
            file.createForWriting(this.global.run_results.processing_steps_file);
            file.write(logdata);
            file.outTextLn("======================================");
            if (iserror) {
                  // In case of error write info to log file.
                  // Normally this is written from the console output.
                  if (this.lightFileNames != null) {
                        file.outTextLn("Dialog files:");
                        for (var i = 0; i < this.lightFileNames.length; i++) {
                              file.outTextLn(this.lightFileNames[i]);
                        }
                  }
                  if (alignedFiles != null) {
                        file.outTextLn("Aligned files:");
                        for (var i = 0; i < alignedFiles.length; i++) {
                              file.outTextLn(alignedFiles[i]);
                        }
                  }
                  file.outTextLn(this.global.processing_steps);
                  if (this.global.processing_warnings.length > 0) {
                        file.outTextLn("Processing warnings:");
                        file.outTextLn(this.global.processing_warnings);
                        console.warningln("Processing warnings:");
                        console.warningln(this.global.processing_warnings);
                  }
                  if (this.global.processing_errors.length > 0) {
                        file.outTextLn("Processing errors:");
                        file.outTextLn(this.global.processing_errors);
                        console.criticalln("Processing errors:");
                        console.criticalln(this.global.processing_errors);
                        this.global.processing_errors = "";
                  }
            }
            file.close();
      }
}

writeTestmodeLog(text, fname)
{
      console.writeln("writeTestmodeLog: " + fname);
      fname = this.util.ensure_win_prefix(fname);
      var processedPath = this.util.combinePath(this.global.outputRootDir, this.global.AutoProcessedDir);
      processedPath = this.util.ensurePathEndSlash(processedPath);

      this.global.run_results.testmode_log_name = processedPath + fname;

      var file = new File();
      file.createForWriting(this.global.run_results.testmode_log_name);
      file.outTextLn(text);
      file.close();
}

// Find window and optionally search without a prefix
// Used to find AutoContinue images
findWindowCheckBaseNameIf(id, check_base_name)
{
      // console.writeln("findWindowCheckBaseNameIf: " + id);
      var win = this.util.findWindowOrFile(this.util.ensure_win_prefix(id));
      if (win == null && check_base_name && this.ppar.win_prefix != this.ppar.autocontinue_win_prefix) {
            // Try to find without prefix so we can autocontinue
            // from default run but will have new output
            // file names.
            win = this.util.findWindowOrFile(this.util.ensure_win_prefix_ex(id, this.ppar.autocontinue_win_prefix));
      }
      return win;
}

// Find window id and optionally search without a prefix
// Used to find AutoContinue images
findWindowIdCheckBaseNameIf(name, check_base_name)
{
      var id = this.util.findWindowOrFileId(this.util.ensure_win_prefix(name));
      if (id == null && check_base_name && this.ppar.win_prefix != this.ppar.autocontinue_win_prefix) {
            // Try to find with autocontinue prefix so we can autocontinue
            // from other run but will have new output
            // file names.
            id = this.util.findWindowOrFileId(this.util.ensure_win_prefix_ex(name, this.ppar.autocontinue_win_prefix));
            this.autocontinue_prefix = this.ppar.autocontinue_win_prefix;
      } else {
            this.autocontinue_prefix = this.ppar.win_prefix;
      }
      if (id) {
            console.writeln("findWindowIdCheckBaseNameIf: found " + id);
      }
      return id;
}

// Find window with a prefix. If not found and check_base is true
// then try without prefix
findWindowNoPrefixIf(id, check_base)
{
      var win = this.util.findWindowOrFile(id);
      if (win == null && check_base && this.ppar.win_prefix != '' && id.startsWith(this.ppar.win_prefix)) {
            // Try without prefix
            var win = this.util.findWindowOrFile(id.substring(this.ppar.win_prefix.length));
      }
      if (win == null && check_base && this.ppar.win_prefix != '' && id.startsWith(this.ppar.win_prefix)) {
            // Try with autocontinue prefix
            var basename = id.substring(this.ppar.win_prefix.length);
            var win = this.util.findWindowOrFile(this.ppar.autocontinue_win_prefix + basename);
      }
      return win;
}

// Try to find window with file name. 
// If not found read it.
findOrReadImage(fname, new_id)
{
      console.writeln("findOrReadImage " + fname);

      var id = File.extractName(fname);
      if (this.util.findWindow(id)) {
            // we have already loaded the file into memory
            console.writeln("findOrReadImage, use already loaded image " + id);
            return id;
      }

      // read the file
      console.writeln("findOrReadImage, reading file " + fname);
      var imageWindows = ImageWindow.open(fname);
      if (!imageWindows || imageWindows.length == 0) {
            this.util.throwFatalError("*** findOrReadImage Error: file " + fname + ", imageWindows.length: " + imageWindows.length);
      }
      var imageWindow = imageWindows[0];
      if (imageWindow == null) {
            this.util.throwFatalError("*** findOrReadImage Error: Can't read file: " + fname);
      }
      if (imageWindow.mainView.id != new_id) {
            console.writeln("findOrReadImage, read id " + imageWindow.mainView.id + ", renamed to " + new_id);
            imageWindow.mainView.id = new_id;
      } else {
            console.writeln("findOrReadImage, read id " + imageWindow.mainView.id);
      }
      return imageWindow.mainView.id;
}

// Used to find AutoContinue images
findIntegratedLightImage(channel, filtered_lights, new_id)
{
      for (var i = 0; i < filtered_lights.allfilesarr.length; i++) {
            if (filtered_lights.allfilesarr[i].filter == channel) {
                  if (filtered_lights.allfilesarr[i].files.length == 1) {
                        // Only one file, assume it is the integrated file
                        var id = this.findOrReadImage(filtered_lights.allfilesarr[i].files[0].name, new_id);
                        if (id) {
                              console.writeln("findIntegratedChannelImage: found " + id);
                        }
                        return id;
                  } else {
                        return null;
                  }
            }
      }
      return null;
}

findIntegratedChannelImage(channel, check_base_name, filtered_lights)
{
      var cropextensions = [ '_crop', '' ];
      // First search from memory only
      for (var i = 0; i < cropextensions.length; i++) {
            var id = this.findWindowIdCheckBaseNameIf("Integration_" + channel + cropextensions[i], check_base_name);
            if (id != null) {
                  return id;
            }
      }
      // Try to read from disk
      if (filtered_lights != null) {
            id = this.findIntegratedLightImage(channel, filtered_lights, "Integration_" + channel + "_map");
      } else {
            id = null;
      }
      return id;
}

findIntegratedRGBImage(check_base_name, filtered_lights)
{
      var id = this.findIntegratedChannelImage("RGB", check_base_name, null);
      if (id == null && filtered_lights != null) {
            id = this.findIntegratedLightImage('C', filtered_lights, "Integration_RGB");
      }
      return id;
}

findIntegratedChannelAndRGBImages(check_base_name)
{
      if (this.lightFileNames != null && this.par.integrated_lights.val) {
            var filtered_lights = this.getFilterFiles(this.lightFileNames, this.global.pages.LIGHTS, '');
      } else {
            var filtered_lights = null;
      }

      this.L_id = this.findIntegratedChannelImage("L", check_base_name, filtered_lights);
      this.R_id = this.findIntegratedChannelImage("R", check_base_name, filtered_lights);
      this.G_id = this.findIntegratedChannelImage("G", check_base_name, filtered_lights);
      this.B_id = this.findIntegratedChannelImage("B", check_base_name, filtered_lights);
      this.H_id = this.findIntegratedChannelImage("H", check_base_name, filtered_lights);
      this.S_id = this.findIntegratedChannelImage("S", check_base_name, filtered_lights);
      this.O_id = this.findIntegratedChannelImage("O", check_base_name, filtered_lights);
      this.RGB_color_id = this.findIntegratedRGBImage(check_base_name, filtered_lights);
}

fileNamesFromOutputData(outputFileData)
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

debayerImages(fileNames)
{
      var succ = true;

      this.util.addStatusInfo("Debayer " + fileNames.length + " images");
      this.util.addProcessingStep("debayerImages, fileNames[0] " + fileNames[0]);
      var node = this.flowchart.flowchartOperation("Debayer");
      if (this.global.get_flowchart_data) {
            return fileNames;
      }

      var P = new Debayer;
      P.cfaPattern = this.global.debayerPattern_enums[this.global.debayerPattern_values.indexOf(this.local_debayer_pattern)];
      P.targetItems = this.fileNamesToEnabledPath(fileNames);
      P.outputDirectory = this.global.outputRootDir + this.global.AutoOutputDir;
      P.overwriteExistingFiles = true;

      try {
            succ = P.executeGlobal();
      } catch(err) {
            succ = false;
            this.util.addCriticalStatus(err.toString());
      }

      this.printAndSaveProcessValues(P);
      this.engine_end_process(node);

      if (!succ) {
            console.criticalln("Debayer failed");
            this.util.addProcessingStep("Error, maybe debayer pattern was not correctly selected");
            this.util.throwFatalError("Debayer failed");
      }

      return this.fileNamesFromOutputData(P.outputFileData);
}

runBandingReduction(imageWindow)
{
      console.writeln("runBandingReduction");
      var node = this.flowchart.flowchartOperation("BandingReduction");
      if (this.global.get_flowchart_data) {
            return;
      }

      var bandingEngine = new AutoIntegrateBandingEngine();

      bandingEngine.setAmount(this.par.banding_reduction_amount.val);
      bandingEngine.setHighlightProtect(this.par.banding_reduction_protect_highlights.val);

      bandingEngine.setTargetImage(imageWindow.mainView.image);
      bandingEngine.doit(imageWindow.mainView);
      this.engine_end_process(node);
}

bandingEngineForImages(fileNames)
{
      this.util.addStatusInfo("Banding reduction for " + fileNames.length + " images");
      this.util.addProcessingStep("bandingEngineForImages, fileNames[0] " + fileNames[0]);
      var node = this.flowchart.flowchartOperation("BandingReduction");
      if (this.global.get_flowchart_data) {
            return fileNames;
      }

      var newFileNames = [];
      var outputDir = this.global.outputRootDir + this.global.AutoOutputDir;
      var outputExtension = ".xisf";

      var bandingEngine = new AutoIntegrateBandingEngine();

      bandingEngine.setAmount(this.par.banding_reduction_amount.val);
      bandingEngine.setHighlightProtect(this.par.banding_reduction_protect_highlights.val);

      for (var i = 0; i < fileNames.length; i++) {
            console.writeln("bandingEngineForImages, "+ fileNames[i]);
            var imageWindows = ImageWindow.open(fileNames[i]);
            if (!imageWindows || imageWindows.length == 0) {
                  this.util.throwFatalError("***bandingEngineForImages Error: imageWindows.length: " + imageWindows.length);
            }
            var imageWindow = imageWindows[0];
            if (imageWindow == null) {
                  this.util.throwFatalError("***bandingEngineForImages Error: Can't read file: " + fileNames[i]);
            }

            bandingEngine.setTargetImage(imageWindow.mainView.image);
            bandingEngine.doit(imageWindow.mainView);

            var filePath = this.generateNewFileName(fileNames[i], outputDir, "_cb", outputExtension);

            if (!this.writeImage(filePath, imageWindow)) {
                  this.util.throwFatalError("***bandingEngineForImages Error: Can't write output image: " + filePath);
            }
            newFileNames[newFileNames.length] = filePath;
            this.util.closeOneWindow(imageWindow);
      }
      this.engine_end_process(node);

      return newFileNames;
}

// Extract this.channels from color/OSC/DSLR files. As a result
// we get a new file list with channel files.
extractChannels(fileNames)
{
      var newFileNames = [];
      var outputDir = this.global.outputRootDir + this.global.AutoOutputDir;
      var outputExtension = ".xisf";
      if (this.par.extract_channel_mapping.val == 'LRGB') {
            var channel_map = "RGB";
      } else {
            var channel_map = this.par.extract_channel_mapping.val;
      }

      this.util.addStatusInfo("Extract channels, " + this.par.extract_channel_mapping.val);
      this.util.addProcessingStep("extractChannels, " + this.par.extract_channel_mapping.val + ", fileNames[0] " + fileNames[0]);
      var node = this.flowchart.flowchartOperation("ChannelExtraction");
      
      for (var i = 0; i < fileNames.length; i++) {
            if (this.global.get_flowchart_data) {
                  if (this.par.extract_channel_mapping.val == 'LRGB') {
                        var filePath = this.generateNewFileName(fileNames[i], outputDir, "_L", outputExtension);
                        this.flowchartNewIntegrationImage(fileNames[i], this.util.ensure_win_prefix(File.extractName(filePath)));
                        newFileNames[newFileNames.length] = filePath;
                  }
                  filePath = this.generateNewFileName(fileNames[i], outputDir, "_" + channel_map[0], outputExtension);
                  this.flowchartNewIntegrationImage(fileNames[i], this.util.ensure_win_prefix(File.extractName(filePath)));
                  newFileNames[newFileNames.length] = filePath;

                  filePath = this.generateNewFileName(fileNames[i], outputDir, "_" + channel_map[1], outputExtension);
                  this.flowchartNewIntegrationImage(fileNames[i], this.util.ensure_win_prefix(File.extractName(filePath)));
                  newFileNames[newFileNames.length] = filePath;
                  
                  filePath = this.generateNewFileName(fileNames[i], outputDir, "_" + channel_map[2], outputExtension);
                  newFileNames[newFileNames.length] = filePath;
                  this.flowchartNewIntegrationImage(fileNames[i], this.util.ensure_win_prefix(File.extractName(filePath)));

                  continue;
            }
            // Open source image window from a file
            var imageWindows = ImageWindow.open(fileNames[i]);
            if (!imageWindows || imageWindows.length == 0) {
                  this.save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
                  this.util.throwFatalError("*** extractChannels Error: imageWindows.length: " + imageWindows.length);
            }
            var imageWindow = imageWindows[0];
            if (imageWindow == null) {
                  this.save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
                  this.util.throwFatalError("*** extractChannels Error: Can't read file: " + fileNames[i]);
            }

            // Extract this.channels and save each channel to a separate file.
            if (this.par.extract_channel_mapping.val == 'LRGB') {
                  var targetWindow = this.extractLchannel(imageWindow, true);
                  var filePath = this.generateNewFileName(fileNames[i], outputDir, "_L", outputExtension);
                  this.util.setFITSKeyword(targetWindow, "FILTER", "L", "AutoIntegrate extracted channel")
                  // Save window
                  if (!this.writeImage(filePath, targetWindow)) {
                        this.save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
                        this.util.throwFatalError("*** extractChannels Error: Can't write output image: " + filePath);
                  }
                  newFileNames[newFileNames.length] = filePath;
                  this.util.closeOneWindow(targetWindow);
            }

            var rId = this.extractRGBchannel(imageWindow.mainView.id, 'R', true);
            var rWin = this.util.findWindow(rId);
            var filePath = this.generateNewFileName(fileNames[i], outputDir, "_" + channel_map[0], outputExtension);
            this.util.setFITSKeyword(rWin, "FILTER", channel_map[0], "AutoIntegrate extracted channel")
            if (!this.writeImage(filePath, rWin)) {
                  this.save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
                  this.util.throwFatalError("*** extractChannels Error: Can't write output image: " + filePath);
            }
            newFileNames[newFileNames.length] = filePath;
            this.util.closeOneWindow(rWin);

            var gId = this.extractRGBchannel(imageWindow.mainView.id, 'G', true);
            var gWin = this.util.findWindow(gId);
            var filePath = this.generateNewFileName(fileNames[i], outputDir, "_" + channel_map[1], outputExtension);
            this.util.setFITSKeyword(gWin, "FILTER", channel_map[1], "AutoIntegrate extracted channel")
            if (!this.writeImage(filePath, gWin)) {
                  this.save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
                  this.util.throwFatalError("*** extractChannels Error: Can't write output image: " + filePath);
            }
            newFileNames[newFileNames.length] = filePath;
            this.util.closeOneWindow(gWin);

            var bId = this.extractRGBchannel(imageWindow.mainView.id, 'B', true);
            var bWin = this.util.findWindow(bId);
            var filePath = this.generateNewFileName(fileNames[i], outputDir, "_" + channel_map[2], outputExtension);
            this.util.setFITSKeyword(bWin, "FILTER", channel_map[2], "AutoIntegrate extracted channel")
            if (!this.writeImage(filePath, bWin)) {
                  this.save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
                  this.util.throwFatalError("*** extractChannels Error: Can't write output image: " + filePath);
            }
            newFileNames[newFileNames.length] = filePath;
            this.util.closeOneWindow(bWin);

            // Close window
            this.util.closeOneWindow(imageWindow);
      }
      this.engine_end_process(node);
      return newFileNames;
}

findGCStartWindowCheckBaseNameIf(id, check_base_name)
{
      var cropextensions = [ '_crop', '' ];
      var extensions = [ '_GC', '_ABE', '_DBE', '_GraXpert', '_ADBE' ];

      // console.writeln("findGCStartWindowCheckBaseNameIf: " + id + ", check_base_name: " + check_base_name);

      for (var i = 0; i < cropextensions.length; i++) {
            for (var j = 0; j < extensions.length; j++) {
                  var win = this.findWindowCheckBaseNameIf(id + cropextensions[i] + extensions[j], check_base_name);
                  if (win) {
                        console.writeln("findCGStartWindowCheckBaseNameIf: found " + win.mainView.id);
                        return win;
                  }
            }
      }
      return null;
}

findStartWindowCheckBaseNameIf(id, check_base_name)
{
      var win = this.findWindowCheckBaseNameIf(id, check_base_name);
      if (win) {
            console.writeln("findStartWindowCheckBaseNameIf: found " + win.mainView.id);
      }
      return win;
}

findStartWindowCheckBaseNameArrayIf(idarray, check_base_name)
{
      for (var i = 0; i < idarray.length; i++) {
            var win = this.findWindowCheckBaseNameIf(idarray[i], check_base_name);
            if (win) {
                  console.writeln("findStartWindowCheckBaseNameArrayIf: found " + win.mainView.id);
                  return win;
            }
      }
      return null;
}

findStartImages(auto_continue, check_base_name, can_update_preview)
{
      if (this.global.get_flowchart_data || this.par.generate_masters_only.val) {
            return this.global.start_images.NONE;
      }

      /* Check if we have manually done histogram transformation. */
      this.L_HT_start_win = this.findStartWindowCheckBaseNameIf("L_HT", check_base_name);
      this.RGB_HT_start_win = this.findStartWindowCheckBaseNameIf("RGB_HT", check_base_name);

      /* Check if we have manual gradient corrected files. */
      this.L_GC_start_win = this.findGCStartWindowCheckBaseNameIf("Integration_L", check_base_name);
      this.R_GC_start_win = this.findGCStartWindowCheckBaseNameIf("Integration_R", check_base_name);
      this.G_GC_start_win = this.findGCStartWindowCheckBaseNameIf("Integration_G", check_base_name);
      this.B_GC_start_win = this.findGCStartWindowCheckBaseNameIf("Integration_B", check_base_name);
      this.H_GC_start_win = this.findGCStartWindowCheckBaseNameIf("Integration_H", check_base_name);
      this.S_GC_start_win = this.findGCStartWindowCheckBaseNameIf("Integration_S", check_base_name);
      this.O_GC_start_win = this.findGCStartWindowCheckBaseNameIf("Integration_O", check_base_name);
      this.RGB_GC_start_win = this.findGCStartWindowCheckBaseNameIf("Integration_RGB", check_base_name);

      this.findIntegratedChannelAndRGBImages(check_base_name);

      if (this.util.is_enhancements_option() || this.util.is_narrowband_option()) {
            for (var i = 0; i < this.global.final_windows.length; i++) {
                  this.final_win = this.findWindowNoPrefixIf(this.global.final_windows[i], check_base_name);
                  if (this.final_win != null) {
                        break;
                  }
            }
      }
      if (this.L_GC_start_win != null || this.L_HT_start_win != null || this.L_id != null) {
            this.is_luminance_images = true;
      } else {
            this.is_luminance_images = false;
      }

      var preview_id = null;

      if (this.final_win != null) {
            /*
             * Final image.
             */
            this.util.addProcessingStep("Start from final image " + this.final_win.mainView.id);
            preview_id = this.final_win.mainView.id;
            this.preprocessed_images = this.global.start_images.FINAL;

      } else if (this.checkAutoCont(this.L_HT_start_win) && this.checkAutoCont(this.RGB_HT_start_win)) {
            /* 
             * L,RGB HistogramTransformation / stretched 
             */
            this.util.addProcessingStep("Start from L,RGB HistogramTransformation");
            preview_id = this.L_HT_start_win.mainView.id;
            this.preprocessed_images = this.global.start_images.L_RGB_HT;
            if (this.util.getKeywordValue(this.RGB_HT_start_win, "AutoIntegrateNarrowband") == "true") {
                  this.process_narrowband = true;
            }

      } else if (this.checkAutoCont(this.RGB_HT_start_win)) {
            /* 
             * RGB (color) HistogramTransformation / stretched 
             */
            this.util.addProcessingStep("Start from RGB (color) HistogramTransformation " + this.RGB_HT_start_win.mainView.id);
            preview_id = this.RGB_HT_start_win.mainView.id;
            this.preprocessed_images = this.global.start_images.RGB_HT;
            if (this.util.getKeywordValue(this.RGB_HT_start_win, "AutoIntegrateNarrowband") == "true") {
                  this.process_narrowband = true;
            }

      } else if ((this.checkAutoCont(this.R_GC_start_win) && this.checkAutoCont(this.G_GC_start_win) && this.checkAutoCont(this.B_GC_start_win)) ||
                 (this.checkAutoCont(this.H_GC_start_win) && this.checkAutoCont(this.O_GC_start_win))) 
      {
            /* 
             * L,R,G,B,H,S,O integrated, gradient corrected 
             */
            this.util.addProcessingStep("Start from L,R,G,B,H,S,O integrated, gradient corrected");
            preview_id = this.checkAutoCont(this.R_GC_start_win) ? this.R_GC_start_win.mainView.id : this.H_GC_start_win.mainView.id;
            this.preprocessed_images = this.global.start_images.L_R_G_B_GC;
            this.process_narrowband = this.checkAutoCont(this.H_GC_start_win) || this.checkAutoCont(this.O_GC_start_win);
            this.L_id = null;
            this.R_id = null;
            this.G_id = null;
            this.B_id = null;
            this.H_id = null;
            this.S_id = null;
            this.O_id = null;

      } else if (this.checkAutoCont(this.RGB_GC_start_win)) {
            /* 
             * RGB (color) integrated, gradient corrected 
             */
            this.util.addProcessingStep("Start from RGB (color) integrated, gradient corrected " + this.RGB_GC_start_win.mainView.id);
            preview_id = this.RGB_GC_start_win.mainView.id;
            this.preprocessed_images = this.global.start_images.RGB_GC;
            if (this.util.getKeywordValue(this.RGB_GC_start_win, "AutoIntegrateNarrowband") == "true") {
                  this.process_narrowband = true;
            }
      
      } else if ((this.R_id != null && this.G_id != null && this.B_id != null) ||
                 (this.H_id != null && this.O_id != null)) 
      {
            /* 
             * L,R,G,B,H,S,O integrated images 
             */
            this.util.addProcessingStep("Start from L,R,G,B,H,S,O integrated images");
            preview_id = this.R_id != null ? this.R_id : this.H_id;
            var check_name = this.ppar.win_prefix + "Integration_RGB";
            if (auto_continue && this.util.findWindow(check_name)) {
                  this.util.throwFatalError("Cannot start AutoContinue, processed image " + check_name + " already exists. " +
                                    "Close previously processed images or use a different window prefix.")
            }
            this.checkAutoCont(this.util.findWindow(this.R_id));
            this.checkAutoCont(this.util.findWindow(this.H_id));
            this.is_rgb_files = this.R_id != null && this.G_id != null && this.B_id != null;
            this.is_narrowband_files = this.H_id != null || this.O_id != null;
            this.process_narrowband = this.is_narrowband_files;
            this.preprocessed_images = this.global.start_images.L_R_G_B;

      } else if (this.RGB_color_id != null) {
            /* 
             * RGB (color) integrated image 
             */
            this.util.addProcessingStep("Start from RGB (color) integrated image " + this.RGB_color_id);
            preview_id = this.RGB_color_id;
            if (this.util.getKeywordValue(this.util.findWindow(this.RGB_color_id), "AutoIntegrateNarrowband") == "true") {
                  this.process_narrowband = true;
            }
            this.preprocessed_images = this.global.start_images.RGB;

      } else {
            /*
             * No start image.
             */
            console.writeln("No start image");
            this.preprocessed_images = this.global.start_images.NONE;
      }
      if (preview_id != null && auto_continue && can_update_preview) {
            this.guiUpdatePreviewId(preview_id);
      }
      return this.preprocessed_images;
}

autocontinueHasNarrowband()
{
      this.process_narrowband = false;
      this.findStartImages(true, true, true);
      return this.process_narrowband;
}

getFileProcessedStatusEx(fileNames, postfix, outputDir, outputExtension = ".xisf")
{
      if (!this.par.use_processed_files.val) {
            return { processed: [], unprocessed: fileNames };
      }
      var processed = [];
      var unprocessed = [];
      for (var i = 0; i < fileNames.length; i++) {
            var processedName = this.generateNewFileName(fileNames[i], outputDir, postfix, outputExtension);
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

getFileProcessedStatus(fileNames, postfix)
{
      return this.getFileProcessedStatusEx(fileNames, postfix, this.global.outputRootDir + this.global.AutoOutputDir);
}

preprocessedName(pi)
{
      switch (pi) {
            case this.global.start_images.NONE:
                  return "None";
            case this.global.start_images.L_R_G_B_GC:
                  return "Background extracted and integrated channel images";
            case this.global.start_images.RGB_GC:
                  return "Background extracted and integrated RGB image";
            case this.global.start_images.L_RGB_HT:
                  return "Stretched L and RGB images";
            case this.global.start_images.RGB_HT:
                  return "Stretched RGB image";
            case this.global.start_images.L_R_G_B:
                  return "Integrated channel images";
            case this.global.start_images.RGB:
                  return "Integrated RGB image";
            case this.global.start_images.FINAL:
                  return "Final image";
            case this.global.start_images.CALIBRATE_ONLY:
                  return "Calibrate only";
            default:
                  return "Unknown " + pi;
      }
}

doAutoMapping(channel_list)
{
      // Sotr channel list
      channel_list.sort();

      // Find channel_list from this.global.narrowbandAutoMapping inputs
      for (var i = 0; i < this.global.narrowbandAutoMapping.length; i++) {
            // Sort the input this.channels
            this.global.narrowbandAutoMapping[i].input.sort();
            // Compare with channel_list
            if (this.util.arraysEqual(this.global.narrowbandAutoMapping[i].input, channel_list)) {
                  // We have a match
                  if (this.global.narrowbandAutoMapping[i].check_ha_mapping) {
                        // Check if there is Ha mapping
                        if (this.par.use_RGBHa_Mapping.val || this.par.use_RGBNB_Mapping.val) {
                              // There is special Ha mapping.
                              console.writeln("doAutoMapping: Found Ha mapping for " + channel_list.join(", "));
                              return;
                        }
                  }
                  // Set the output this.channels
                  console.writeln("doAutoMapping: Found auto mapping for " + channel_list.join(", ") + " -> " + this.global.narrowbandAutoMapping[i].output);
                  // Set the output this.channels
                  var palette = this.findNarrowBandPalette(this.global.narrowbandAutoMapping[i].output);
                  this.local_narrowband_mapping = palette.name;
                  this.local_R_mapping = palette.R;
                  this.local_G_mapping = palette.G;
                  this.local_B_mapping = palette.B;
                  // If we have L in channel_list, do L mapping too
                  if (channel_list.indexOf("L") >= 0) {
                        // Set the L mapping
                        this.local_L_mapping = "L";
                  } else {
                        // No L in channel_list, set L mapping to empty
                        this.local_L_mapping = "";
                  }
                  if (this.global.narrowbandAutoMapping[i].rgb_stars) {
                        // Set the RGB stars flag
                        this.local_RGB_stars = true;
                  } else {
                        // No RGB stars, set the flag to false
                        this.local_RGB_stars = false;
                  }
                  return;
            }
      }
      // Auto mapping failed, throw an error
      throw new Error("No auto mapping found for channels " + channel_list.join(", ") + ". Please select the mapping manually.");
}

findAutoMappingForLights(filtered_lights)
{
      // Find the auto mapping for the given filtered lights
      // as returned from this.getFilterFiles()
      if (filtered_lights == null || filtered_lights.allfilesarr.length == 0) {
            console.writeln("findAutoMappingForLights: No filtered lights found");
            return;
      }

      // Find filters for which we have files
      // and create an array of filters.
      var channel_list = [];
      for (var i = 0; i < filtered_lights.allfilesarr.length; i++) {
            if (filtered_lights.allfilesarr[i].files.length == 0) {
                  // console.writeln("findAutoMappingForLights: No files for channel " + filtered_lights.allfilesarr[i].filter);
                  continue;
            }
            channel_list.push(filtered_lights.allfilesarr[i].filter);
      }
      if (channel_list.length == 0) {
            this.util.throwFatalError("findAutoMappingForLights: No channels found, nothing to do");
            return;
      }
      console.writeln("findAutoMappingForLights: auto mapping: " + channel_list.join(", "));
      this.doAutoMapping(channel_list);
}

findAutoMappingForIntegratedImages(preprocessed_images)
{
      // Find the auto mapping for the given preprocessed images
      // preprocessed_images is one of this.global.start_images values
      var channel_list = [];
      switch (preprocessed_images) {
            case this.global.start_images.L_R_G_B_GC:
                  // We have gradien corrected L,R,G,B,H,S,O images
                  if (this.checkAutoCont(this.L_GC_start_win)) {
                        channel_list.push("L");
                  }
                  if (this.checkAutoCont(this.R_GC_start_win)) {
                        channel_list.push("R");
                  }
                  if (this.checkAutoCont(this.G_GC_start_win)) {
                        channel_list.push("G");
                  }
                  if (this.checkAutoCont(this.B_GC_start_win)) {
                        channel_list.push("B");
                  }
                  if (this.checkAutoCont(this.H_GC_start_win)) {
                        channel_list.push("H");
                  }
                  if (this.checkAutoCont(this.S_GC_start_win)) {
                        channel_list.push("S");
                  }
                  if (this.checkAutoCont(this.O_GC_start_win)) {
                        channel_list.push("O");
                  }
                  if (channel_list.length == 0) {
                        this.util.throwFatalError("findAutoMappingForIntegratedImages: No L,R,G,B,H,S,O images found, nothing to do");
                        return;
                  }
                  break;
            case this.global.start_images.L_R_G_B:
                  // We have L,R,G,B,H,S,O images
                  if (this.L_id != null) {
                        channel_list.push("L");
                  }
                  if (this.R_id != null) {
                        channel_list.push("R");
                  }
                  if (this.G_id != null) {
                        channel_list.push("G");
                  }
                  if (this.B_id != null) {
                        channel_list.push("B");
                  }
                  if (this.H_id != null) {
                        channel_list.push("H");
                  }
                  if (this.S_id != null) {
                        channel_list.push("S");
                  }
                  if (this.O_id != null) {
                        channel_list.push("O");
                  }
                  if (channel_list.length == 0) {
                        this.util.throwFatalError("findAutoMappingForIntegratedImages: No L,R,G,B,H,S,O images found, nothing to do");
                        return;
                  }
                  break;
            default:
                  // We do not have L,R,G,B,H,S,O images, nothing to do
                  console.writeln("findAutoMappingForIntegratedImages: No L,R,G,B,H,S,O images found, nothing to do");
                  return;
      }
      console.writeln("findAutoMappingForIntegratedImages: auto mapping: " + channel_list.join(", "));
      this.doAutoMapping(channel_list);
}

isAllRGBImages(filtered_lights)
{
      // Check if we have R,G,B images in filtered_lights
      if (filtered_lights == null || filtered_lights.allfilesarr.length == 0) {
            console.writeln("isAllRGBImages: No filtered lights found");
            return false;
      }
      let rgb_count = 0;
      for (var i = 0; i < filtered_lights.allfilesarr.length; i++) {
            if (filtered_lights.allfilesarr[i].files.length > 0 
                  && (filtered_lights.allfilesarr[i].filter == 'R'
                        || filtered_lights.allfilesarr[i].filter == 'G'
                        || filtered_lights.allfilesarr[i].filter == 'B')) 
            {
                  rgb_count++;
            }
      }
      return rgb_count == 3;
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
 * find files for each L, R, G and B this.channels
 * run image integration to create L, R, G and B images, or color image
 * 
 * Return values:
 *    this.retval.ERROR      - error
 *    this.retval.SUCCESS    - success
 *    this.retval.INCOMPLETE - stopped because of an option
 */
createChannelImages(parent, auto_continue)
{
      this.util.addProcessingStepAndStatusInfo("Find start images");

      this.final_win = null;
      this.global.write_processing_log_file = false;  // do not write the log file if we fail very early

      if (auto_continue) {
            console.writeln("AutoContinue, find start images with prefix " + this.ppar.win_prefix);
            this.preprocessed_images = this.findStartImages(true, false, true);
            if (this.preprocessed_images == this.global.start_images.NONE && this.ppar.win_prefix != this.ppar.autocontinue_win_prefix) {
                  console.writeln("AutoContinue, find start images with prefix '" + this.ppar.autocontinue_win_prefix + "'");
                  this.preprocessed_images = this.findStartImages(true, true, true);
            }
      } else {
            // find old images with prefix
            this.preprocessed_images = this.findStartImages(false, false, true);
      }

      if (auto_continue) {
            if (this.preprocessed_images == this.global.start_images.NONE) {
                  this.util.addProcessingStep("No preprocessed images found, processing not started!");
                  return this.retval.ERROR;
            } else if (this.util.findWindowFromArray(this.global.intermediate_windows)) {
                  this.util.addProcessingStep("There are already preprocessed images, processing not started!");
                  this.util.addProcessingStep("Close or rename old images before continuing.");
                  return this.retval.ERROR;
            }
      } else {
            if (this.preprocessed_images != this.global.start_images.NONE || this.util.findWindowFromArray(this.global.fixed_windows)) {
                  this.util.addProcessingStep("There are already preprocessed images, processing not started!");
                  this.util.addProcessingStep("Close or rename old images before continuing.");
                  return this.retval.ERROR;
            }  
      }

      /* Check if we have manually created mask. */
      this.range_mask_win = null;

      this.global.write_processing_log_file = true;

      if (this.par.null_processing.val) {
            // Null processing option is selected
            console.writeln("Null processing option is selected.");
            return this.retval.SUCCESS;

      } else if (this.preprocessed_images == this.global.start_images.FINAL) {
            return this.retval.SUCCESS;

      } else if (this.preprocessed_images != this.global.start_images.NONE) {
            this.util.addProcessingStep("Using preprocessed images: " + this.preprocessedName(this.preprocessed_images));
            if (this.preprocessed_images == this.global.start_images.RGB_GC ||
                this.preprocessed_images == this.global.start_images.RGB_HT) 
            {
                  if (this.process_narrowband) {
                        this.util.addProcessingStep("Processing as narrowband images");
                  } else {
                        /* No L files, assume color. */
                        this.util.addProcessingStep("Processing as color image from preprocessed RGB image");
                  }
                  this.is_color_files = true;
            }
            if (this.par.force_new_mask.val) {
                  this.setNewMaskWindow(null);
                  this.range_mask_win = null;
            } else {
                  /* Check if we already have a mask. It can be from previous run or manually created. */
                  this.range_mask_win = this.util.findWindow(this.ppar.win_prefix + "AutoMask");
            }
            if (this.process_narrowband && this.local_narrowband_mapping == 'Auto') {
                  this.findAutoMappingForIntegratedImages(this.preprocessed_images);
            }
            if (this.local_RGB_stars) {
                  if (this.R_id == null || this.G_id == null || this.B_id == null) {
                        this.util.throwFatalError("RGB stars option is selected but no R, G, B images found.");
                  }
            }
            return this.retval.SUCCESS;

      } else {
            // Here we have this.preprocessed_images == this.global.start_images.NONE
            this.util.addProcessingStepAndStatusInfo("Create channel images");

            if (this.par.generate_masters_only.val) {
                  // Generate master calibration files only, no lights needed
                  this.util.setOutputRootDir(this.calibrate.getOutputDirFromCalibrationFiles());
                  this.util.ensureDir(this.global.outputRootDir);
                  this.util.ensureDir(this.util.combinePath(this.global.outputRootDir, this.global.AutoOutputDir));       // For temp files during processing
                  this.util.ensureDir(this.util.combinePath(this.global.outputRootDir, this.global.AutoProcessedDir));    // For AutoIntegrate.log
                  this.calibrate.calibrateEngine(null);
                  return this.retval.INCOMPLETE;
            }

            /* Open dialog files and run SubframeSelector on them
             * to assigns SSWEIGHT.
             */
            var fileNames;
            if (this.lightFileNames == null) {
                  this.global.lightFileNames = this.openImageFiles("Lights", true, false, false);
                  this.lightFileNames = this.filterFilesForFastMode(this.global.lightFileNames, false, this.global.pages.LIGHTS);
                  this.util.addProcessingStep("Get files from dialog");
            }
            if (this.lightFileNames == null) {
                  this.global.write_processing_log_file = false;
                  console.writeln("No files to process");
                  return this.retval.ERROR;
            }

            this.guiUpdatePreviewFilename(this.lightFileNames[0]);

            // We keep track of extensions added to the file names
            // If we need to original file names we can subtract
            // added extensions.
            var filename_postfix = '';

            /* Get path to current directory. */
            this.util.setOutputRootDir(this.util.getOutputDir(this.lightFileNames[0]));
            console.writeln("createChannelImages, using outputRootDir ", this.global.outputRootDir);


            this.util.ensureDir(this.global.outputRootDir);
            this.util.ensureDir(this.util.combinePath(this.global.outputRootDir, this.global.AutoOutputDir));
            this.util.ensureDir(this.util.combinePath(this.global.outputRootDir, this.global.AutoProcessedDir));

            if (this.global.get_flowchart_data) {
                  // Filter files for this.global.get_flowchart_data.
                  this.lightFileNames = this.flowchartFilterFiles(this.lightFileNames, this.global.pages.LIGHTS);
            }

            if (!this.par.image_weight_testing.val && this.par.early_PSF_check.val) {
                  /* Remove bad files. */
                  this.lightFileNames = this.filterBadPSFImages(this.lightFileNames);
                  if (!this.par.fast_mode && !this.global.get_flowchart_data) {
                        // We did filtering for real data set, save the list
                        this.global.lightFileNames = this.lightFileNames;
                  }
                  if (this.lightFileNames.length == 0) {
                        this.util.addCriticalStatus("No files to process after filtering bad PSF images");
                        return this.retval.ERROR;
                  }
            }

            var filtered_lights = this.getFilterFiles(this.lightFileNames, this.global.pages.LIGHTS, '', false, true);
            if (!this.par.image_weight_testing.val
                && !this.par.debayer_only.val
                && !this.par.binning_only.val
                && !this.par.extract_channels_only.val
                && !this.par.integrate_only.val
                && !this.par.calibrate_only.val)
            {
                  if (filtered_lights.error_text != "") {
                        this.util.throwFatalError(filtered_lights.error_text);
                  }
                  if (this.isCustomMapping(filtered_lights.narrowband)) {
                        // Do a check round in custom mapping to verify that all needed
                        // this.channels have files.
                        // We exit with fatal error if some files are missing
                        // If we have Auto mapping, find filters available and
                        // try to find a mapping for them
                        if (this.local_narrowband_mapping == 'Auto') {
                              this.findAutoMappingForLights(filtered_lights);
                        }
                        // Check files with the current mapping
                        this.global.write_processing_log_file = false;
                        this.customMapping(null, filtered_lights);
                        this.global.write_processing_log_file = true;
                  }
            }

            if (this.local_RGB_stars) {
                  if (!this.isAllRGBImages(filtered_lights)) {
                        this.util.throwFatalError("RGB stars option is selected but not all RGB channels found.");
                  }
            }

            if (this.par.extract_channels_only.val && this.par.extract_channel_mapping.val == 'None') {
                  this.util.throwFatalError("Extract channels only is selected but Extract channels option is " + this.par.extract_channel_mapping.val);
            }

            if (this.par.comet_align.val) {
                  if (this.firstDateFileInfo == null || this.lastDateFileInfo == null) {
                        this.util.throwFatalError("No first and last images for comet alignment. Maybe DATE-OBS is missing from image metadata.");
                  }
                  if (this.par.comet_first_xy.val == "" || this.par.comet_last_xy.val == "") {
                        this.util.throwFatalError("No first and last image coordinates for comet alignment.");
                  }
            }

            /********************************************************************
             * Calibrate
             *
             * Run image calibration if we have calibration frames.
             *********************************************************************/
            var calibrateInfo = this.calibrate.calibrateEngine(filtered_lights);
            this.lightFileNames = calibrateInfo[0];
            filename_postfix = filename_postfix + calibrateInfo[1];
            this.guiUpdatePreviewFilename(this.lightFileNames[0]);

            if (this.par.calibrate_only.val) {
                  return(this.retval.INCOMPLETE);
            }

            if (filename_postfix != '') {
                  // We did run calibration, filter again with calibrated lights
                  var filtered_files = this.getFilterFiles(this.lightFileNames, this.global.pages.LIGHTS, filename_postfix, false, true);
            } else {
                  // Calibration was not run
                  var filtered_files = filtered_lights;
            }
            if (filtered_files.allfilesarr[this.channels.C].files.length == 0) {
                  this.is_color_files = false;
            } else {
                  this.is_color_files = true;
            }

            fileNames = this.lightFileNames;

            if (this.par.start_from_imageintegration.val 
                || this.par.image_weight_testing.val
                || this.par.cropinfo_only.val) 
            {
                  var skip_early_steps = true;
            } else {
                  var skip_early_steps = false;
            }

            /********************************************************************
             * Binning
             * 
             * Run binning for each file.
             * Output is *_b<n>.xisf files.
             ********************************************************************/
            if (this.par.binning.val > 0 && !skip_early_steps) {
                  if (this.is_color_files) {
                        this.util.addProcessingStep("No binning for color files");
                  } else {
                        var fileProcessedStatus = this.getFileProcessedStatus(fileNames, this.getBinningPostfix());
                        if (fileProcessedStatus.unprocessed.length == 0) {
                              var node = this.flowchart.flowchartOperation("Binning");
                              fileNames = fileProcessedStatus.processed;
                              this.engine_end_process(node);     // Update procesing time
                        } else {
                              let processedFileNames = this.runBinningOnLights(fileProcessedStatus.unprocessed, filtered_files);
                              fileNames = processedFileNames.concat(fileProcessedStatus.processed);
                        }
                        filename_postfix = filename_postfix + this.getBinningPostfix();
                        this.guiUpdatePreviewFilename(fileNames[0]);
                  }
            } else if (this.par.binning_only.val) {
                  this.util.throwFatalError("Binning only set but no binning done, binning " + this.par.binning.val + " binning resample factor " + this.par.binning_resample.val);
            }
            this.util.runGarbageCollection();
            if (this.par.binning_only.val) {
                  console.writeln("Binning only, stop");
                  return this.retval.INCOMPLETE;
            }

            /********************************************************************
             * CosmeticCorrection
             * 
             * Run CosmeticCorrection for each file.
             * Output is *_cc.xisf files.
             ********************************************************************/
            if (this.par.skip_cosmeticcorrection.val) {
                  var do_cosmeticcorrection = false;
            } else if (skip_early_steps) {
                  var do_cosmeticcorrection = false;
            } else if (this.par.use_fastintegration.val && this.par.fastintegration_skip_cosmeticcorrection.val) {
                  var do_cosmeticcorrection = false;
            } else {
                  var do_cosmeticcorrection = true;
            }
            if (do_cosmeticcorrection) {
                  if (this.par.fix_column_defects.val || this.par.fix_row_defects.val) {
                        var ccFileNames = [];
                        var ccInfo = this.runLinearDefectDetection(fileNames);
                        for (var i = 0; i < ccInfo.length; i++) {
                              var fileProcessedStatus = this.getFileProcessedStatus(ccInfo[i].ccFileNames, '_cc');
                              if (fileProcessedStatus.unprocessed.length == 0) {
                                    var node = this.flowchart.flowchartOperation("CosmeticCorrection");
                                    ccFileNames = ccFileNames.concat(fileProcessedStatus.processed);
                                    this.engine_end_process(node);     // Update procesing time
                              } else {
                                    this.util.addProcessingStep("run CosmeticCorrection for linear defect file group " + i + ", " + fileProcessedStatus.unprocessed.length + " files");
                                    let processedFileNames = this.runCosmeticCorrection(fileProcessedStatus.unprocessed, ccInfo[i].ccDefects, this.is_color_files);
                                    ccFileNames = ccFileNames.concat(processedFileNames, fileProcessedStatus.processed);
                              }
                        }
                        fileNames = ccFileNames;
                        this.guiUpdatePreviewFilename(fileNames[0]);
                  } else {
                        var defects = [];
                        /* Run CosmeticCorrection for each file.
                        * Output is *_cc.xisf files.
                        */
                        var fileProcessedStatus = this.getFileProcessedStatus(fileNames, '_cc');
                        if (fileProcessedStatus.unprocessed.length == 0) {
                              var node = this.flowchart.flowchartOperation("CosmeticCorrection");
                              fileNames = fileProcessedStatus.processed;
                              this.engine_end_process(node);     // Update procesing time
                        } else {
                              let processedFileNames = this.runCosmeticCorrection(fileProcessedStatus.unprocessed, defects, this.is_color_files);
                              fileNames = processedFileNames.concat(fileProcessedStatus.processed);
                        }
                        this.guiUpdatePreviewFilename(fileNames[0]);
                  }
                  filename_postfix = filename_postfix + '_cc';
            }
            this.util.runGarbageCollection();

            /********************************************************************
             * Debayer
             * 
             * Debayer OSC/RAW images
             * Output is *_d.xisf files.
             ********************************************************************/
            if (this.is_color_files && this.local_debayer_pattern != 'None' && !skip_early_steps) {
                  /* After cosmetic correction we need to debayer
                   * OSC/RAW images
                   */
                  var fileProcessedStatus = this.getFileProcessedStatus(fileNames, '_d');
                  if (fileProcessedStatus.unprocessed.length == 0) {
                        var node = this.flowchart.flowchartOperation("Debayer");
                        fileNames = fileProcessedStatus.processed;
                        this.engine_end_process(node);     // Update procesing time
                  } else {
                        let processedFileNames = this.debayerImages(fileProcessedStatus.unprocessed);
                        fileNames = processedFileNames.concat(fileProcessedStatus.processed);
                  }
                  filename_postfix = filename_postfix + '_d';
                  this.guiUpdatePreviewFilename(fileNames[0]);
            }
            this.util.runGarbageCollection();

            /********************************************************************
             * Banding reduction
             * 
             * Banding reduction for color/OSC/DSLR files.
             * Output is *_cb.xisf files.
             ********************************************************************/
            if (this.par.banding_reduction.val) {
                  var fileProcessedStatus = this.getFileProcessedStatus(fileNames, '_cb');
                  if (fileProcessedStatus.unprocessed.length == 0) {
                        var node = this.flowchart.flowchartOperation("BandingReduction");
                        fileNames = fileProcessedStatus.processed;
                        this.engine_end_process(node);     // Update procesing time
                  } else {
                        let processedFileNames = this.bandingEngineForImages(fileProcessedStatus.unprocessed);
                        fileNames = processedFileNames.concat(fileProcessedStatus.processed);
                  }
                  filename_postfix = filename_postfix + '_cb';
                  this.guiUpdatePreviewFilename(fileNames[0]);
            }
            this.util.runGarbageCollection();

            if (this.is_color_files && this.par.debayer_only.val) {
                  return this.retval.INCOMPLETE;
            }

            /********************************************************************
             * Extract this.channels
             * 
             * Extract this.channels from color/OSC/DSLR files. As a result
             * we get a new file list with channel files.
             ********************************************************************/
            if (this.par.extract_channel_mapping.val != 'None' && this.is_color_files && !skip_early_steps) {
                  // Extract this.channels from color/OSC/DSLR files. As a result
                  // we get a new file list with channel files.
                  fileNames = this.extractChannels(fileNames);
                  this.guiUpdatePreviewFilename(fileNames[0]);

                  // We extracted channels, filter again with extracted channels
                  console.writeln("Filter again with extracted channels")
                  filename_postfix = '';
                  this.is_color_files = false;
                  filtered_files = this.getFilterFiles(fileNames, this.global.pages.LIGHTS, filename_postfix);
                  console.writeln("Continue with mono processing")
            }
            this.util.runGarbageCollection();
            if (this.par.extract_channels_only.val) {
                  return this.retval.INCOMPLETE;
            }

            /********************************************************************
             * GradientCorrection
             * 
             * Run GradientCorrection for each file.
             * Output is *_GC.xisf files.
             ********************************************************************/
            if (this.par.GC_on_lights.val && !skip_early_steps) {
                  let postfix = '_GC';
                  var fileProcessedStatus = this.getFileProcessedStatus(fileNames, postfix);

                  if (fileProcessedStatus.unprocessed.length == 0) {
                        var node = this.flowchart.flowchartOperation(this.getGradientCorrectionName());
                        fileNames = fileProcessedStatus.processed;
                        this.engine_end_process(node);     // Update procesing time
                  } else {
                        let processedFileNames = this.runGradientCorrectionOnLights(fileProcessedStatus.unprocessed);
                        fileNames = processedFileNames.concat(fileProcessedStatus.processed);
                  }
                  filename_postfix = filename_postfix + postfix;
                  this.guiUpdatePreviewFilename(fileNames[0]);
            }

            /********************************************************************
             * SubframeSelector
             * 
             * Run SubframeSelector that assigns SSWEIGHT for each file.
             * We overwite existing .xisf files (old: Output is *_a.xisf files.)
             ********************************************************************/
            if (!this.par.skip_subframeselector.val 
                && !this.par.start_from_imageintegration.val
                && !this.par.cropinfo_only.val) 
            {
                  /* Run SubframeSelector that assigns SSWEIGHT for each file.
                   * We overwite existing .xisf files (old: Output is *_a.xisf files.)
                   */
                  if (this.par.image_weight_testing.val) {
                        var names_and_weights = this.runSubframeSelector(fileNames);
                  } else {
                        if (this.par.use_fastintegration.val && this.par.fastintegration_fast_subframeselector.val) {
                              // Cannot use previously processed files.
                              var fileProcessedStatus = { processed: [], unprocessed: fileNames };
                        } else {
                              var fileProcessedStatus = this.getFileProcessedStatus(fileNames, '' /* '_a' */);
                        }
                        if (fileProcessedStatus.unprocessed.length == 0) {
                              var node = this.flowchart.flowchartOperation("SubframeSelector");
                              var names_and_weights = { filenames: fileProcessedStatus.processed, ssweights: [], postfix: '' /* '_a' */ };
                              this.engine_end_process(node);     // Update procesing time
                        } else {
                              var names_and_weights = this.runSubframeSelector(fileProcessedStatus.unprocessed);
                              names_and_weights.filenames = names_and_weights.filenames.concat(fileProcessedStatus.processed);
                        }
                  }
                  filename_postfix = filename_postfix + names_and_weights.postfix;
            } else {
                  var names_and_weights = { filenames: fileNames, ssweights: [], postfix: '' };
            }
            this.util.runGarbageCollection();

            /********************************************************************
             * Find file with best SSWEIGHT to be used
             * as a reference image in StarAlign.
             * Also possible file list filtering is done.
             ********************************************************************/
            var retarr = this.findBestSSWEIGHT(parent, names_and_weights, filename_postfix);
            if (this.par.use_processed_files.val && this.global.star_alignment_image != null) {
                  console.writeln("Switching best image to already used star alignment image " + this.global.star_alignment_image);
                  this.global.best_image = this.global.star_alignment_image;
            } else {
                  this.global.best_image = retarr[0];
            }
            fileNames = retarr[1];
            this.util.runGarbageCollection();

            if (this.gui && !this.global.get_flowchart_data) {
                  this.gui.setBestImageInTreeBox(parent, parent.treeBox[this.global.pages.LIGHTS], this.global.best_image, filename_postfix);
            }

            if (this.par.image_weight_testing.val) {
                  return this.retval.INCOMPLETE;
            }

            /********************************************************************
             * StarAlignment
             * 
             * Run StarAlignment for each file.
             * Output is *_r.xisf files.
             ********************************************************************/
            if (!this.par.start_from_imageintegration.val
                && !this.par.cropinfo_only.val
                && !this.par.comet_align.val
                && !this.par.use_fastintegration.val) 
            {
                  var fileProcessedStatus = this.getFileProcessedStatus(fileNames, '_r');
                  if (fileProcessedStatus.unprocessed.length == 0) {
                        var node = this.flowchart.flowchartOperation("StarAlignment");
                        this.alignedFiles = fileProcessedStatus.processed;
                        this.engine_end_process(node);     // Update procesing time
                  } else {
                        let processedFileNames = this.runStarAlignment(fileProcessedStatus.unprocessed, this.global.best_image);
                        this.alignedFiles = processedFileNames.concat(fileProcessedStatus.processed);
                  }
                  filename_postfix = filename_postfix + '_r';
                  this.guiUpdatePreviewFilename(this.alignedFiles[0]);
            } else {
                  this.alignedFiles = fileNames;
            }
            this.util.runGarbageCollection();

            /********************************************************************
             * Remove stars from lights
             * 
             * Remove stars from light files.
             * Output is *_starless.xisf files.
             ********************************************************************/
            if (this.par.remove_stars_light.val
                && !this.par.start_from_imageintegration.val
                && !this.par.cropinfo_only.val)
            {
                  var fileProcessedStatus = this.getFileProcessedStatus(this.alignedFiles, '_starless');
                  if (fileProcessedStatus.unprocessed.length == 0) {
                        var node = this.flowchart.flowchartOperation("Remove stars");
                        this.alignedFiles = fileProcessedStatus.processed;
                        this.engine_end_process(node);     // Update procesing time
                  } else {
                        let processedFileNames = this.removeStarsFromLights(fileProcessedStatus.unprocessed);
                        this.alignedFiles = processedFileNames.concat(fileProcessedStatus.processed);
                  }
                  filename_postfix = filename_postfix + '_starless';
                  this.guiUpdatePreviewFilename(this.alignedFiles[0]);
            }

            /********************************************************************
             * CometAlignment
             * 
             * Run CometAlignment for each file.
             * Output is *_ca.xisf files.
             ********************************************************************/
            if (!this.par.start_from_imageintegration.val
                && !this.par.cropinfo_only.val
                && this.par.comet_align.val) 
            {
                  this.alignedFiles = this.runCometAlignment(this.alignedFiles, filename_postfix);
                  filename_postfix = filename_postfix + '_ca';
                  this.guiUpdatePreviewFilename(this.alignedFiles[0]);
                  this.util.runGarbageCollection();
            }

            /********************************************************************
             *  Find files for each L, R, G, B, H, O and S this.channels, or color files.
             ********************************************************************/
            this.findLRGBchannels(parent, this.alignedFiles, filename_postfix);

            if (this.par.start_from_imageintegration.val || this.par.cropinfo_only.val) {
                  /* We start from *_r.xisf files that are normally in AutoOutput
                   * subdirectory. So in the this.global.outputRootDir we replace AutoOutput
                   * with . (dot). In normal setup this will put output files
                   * to a correct AutoProcessed subdirectory.
                   */
                  console.writeln("Option start_from_imageintegration or cropinfo_only selected, fix output directory");
                  console.writeln("Current outputRootDir " + this.global.outputRootDir);

                  this.util.setOutputRootDir(this.util.normalizePath(this.global.outputRootDir.replace("AutoOutput", ".")));

                  console.writeln("Fixes outputRootDir " + this.global.outputRootDir);
            }
            if (this.par.cropinfo_only.val) {
                  return this.retval.INCOMPLETE;
            }

            /********************************************************************
             * ImageIntegration
             * 
             * Run ImageIntegration for each channel.
             * Output is Integration_*.xisf files.
             ********************************************************************/
            if (this.C_images.images.length == 0) {
                  /* We have LRGB files. */
                  if (!this.par.monochrome_image.val) {
                        if (this.is_luminance_images) {
                              this.util.addProcessingStepAndStatusInfo("Processing as LRGB files");
                        } else {
                              this.util.addProcessingStepAndStatusInfo("Processing as RGB files");
                        }
                  } else {
                        this.util.addProcessingStepAndStatusInfo("Processing as monochrome files");
                  }
                  this.is_color_files = false;


                  this.flowchart.flowchartParentBegin("Channels");
                  if (this.is_luminance_images) {
                        this.L_id = this.runImageIntegration(this.L_images, 'L', true);
                        // Make a copy of the luminance image so we do not
                        // change the original image. Original image may be
                        // needed in AutoContinue.
                        this.luminance_id = this.copyToMapIf(this.L_id);
                        this.cropImageIf(this.luminance_id);
                  }

                  if (!this.par.monochrome_image.val) {
                        this.R_id = this.runImageIntegration(this.R_images, 'R', true);
                        this.G_id = this.runImageIntegration(this.G_images, 'G', true);
                        this.B_id = this.runImageIntegration(this.B_images, 'B', true);
                        this.H_id = this.runImageIntegration(this.H_images, 'H', true);
                        this.S_id = this.runImageIntegration(this.S_images, 'S', true);
                        this.O_id = this.runImageIntegration(this.O_images, 'O', true);

                        this.util.windowShowif(this.R_id);
                        this.util.windowShowif(this.G_id);
                        this.util.windowShowif(this.B_id);
                        this.util.windowShowif(this.H_id);
                        this.util.windowShowif(this.S_id);
                        this.util.windowShowif(this.O_id);
                  }
                  this.flowchart.flowchartParentEnd("Channels");

            } else {
                  /* We have color files. */
                  this.util.addProcessingStepAndStatusInfo("Processing as color files");
                  this.flowchart.flowchartParentBegin("RGB");
                  this.RGB_color_id = this.runImageIntegration(this.C_images, 'RGB', true);
                  this.flowchart.flowchartParentEnd("RGB");
            }
            return this.retval.SUCCESS;
      }
}

/* Create  a mask from linear image. This function
 * used to create temporary masks.
 */
createNewTempMaskFromLinearWin(imgWin, is_color)
{
      console.writeln("createNewTempMaskFromLinearWin from " + imgWin.mainView.id);
      this.flowchart.flowchartMaskBegin("New mask");
      this.global.creating_mask = true;

      var winCopy = this.util.copyWindowEx(imgWin, imgWin.mainView.id + "_tmp", true);

      /* Run HistogramTransform based on auto stretch because mask should be non-linear. */
      winCopy = this.runHistogramTransform(winCopy, is_color, 'mask');

      /* Create mask.
       */
      var maskWin = this.newMaskWindow(winCopy, imgWin.mainView.id + "_mask", true);

      this.util.closeOneWindow(winCopy);
      this.flowchart.flowchartMaskEnd("New mask");
      this.global.creating_mask = false;

      return maskWin;
}

/* Ensure we have a mask to be used for LRGB processing. Used for example
 * for noise reduction and sharpening. We use luminance image as
 * mask.
 */
LRGBEnsureMaskEx(L_id_for_mask, stretched)
{
      this.util.addProcessingStepAndStatusInfo("LRGB ensure mask");

      if (L_id_for_mask != null) {
            this.range_mask_win = null;
            this.setNewMaskWindow(null);
      }
      if (this.winIsValid(this.range_mask_win)) {
            /* We already have a mask. */
            this.util.addProcessingStep("Use existing mask " + this.range_mask_win.mainView.id);
            this.setNewMaskWindow(this.range_mask_win);
      } else {
            var L_win;
            this.flowchart.flowchartMaskBegin("New mask");
            this.global.creating_mask = true;
            if (L_id_for_mask != null) {
                  this.util.addProcessingStep("Using image " + L_id_for_mask + " for a mask");
                  L_win = this.util.copyWindowEx(ImageWindow.windowById(L_id_for_mask), this.ppar.win_prefix + "L_win_mask", true);
                  if (!stretched) {
                        L_win = this.runHistogramTransform(L_win, false, 'mask');
                  }
            } else if (this.preprocessed_images == this.global.start_images.L_RGB_HT) {
                  /* We have run HistogramTransformation. */
                  this.util.addProcessingStep("Using image " + this.L_HT_start_win.mainView.id + " for a mask");
                  L_win = this.util.copyWindow(this.L_HT_start_win, this.ppar.win_prefix + "L_win_mask");
            } else {
                  if (this.preprocessed_images == this.global.start_images.L_R_G_B_GC) {
                        /* We have gradient corrected from L. */
                        this.util.addProcessingStep("Using image " + this.L_GC_start_win.mainView.id + " for a mask");
                        L_win = ImageWindow.windowById(this.L_GC_start_win.mainView.id);
                  } else {
                        if (this.luminance_id) {
                              this.util.addProcessingStep("Using image " + this.luminance_id + " for a mask");
                              L_win = ImageWindow.windowById(this.luminance_id);
                        } else {
                              this.save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
                              this.util.throwFatalError("No luminance image id for a mask");
                        }
                  }
                  L_win = this.util.copyWindowEx(L_win, this.ppar.win_prefix + "L_win_mask", true);

                  /* Run HistogramTransform based on auto stretch because mask should be non-linear. */
                  L_win = this.runHistogramTransform(L_win, false, 'mask');
            }
            /* Create mask.
             */
            this.setNewMaskWindow(this.newMaskWindow(L_win, this.ppar.win_prefix + "AutoMask", false));
            this.util.closeOneWindowById(L_win.mainView.id);
            this.flowchart.flowchartMaskEnd("New mask");
            this.global.creating_mask = false;
      }
}

LRGBEnsureMask(L_id_for_mask)
{
      this.LRGBEnsureMaskEx(L_id_for_mask, false);
}

/* Ensure we have mask for color processing. Mask is needed also in non-linear
 * so we do a separate this.runHistogramTransform here.
 */
colorEnsureMask(color_img_id, RGBstretched, force_new_mask)
{
      this.util.addProcessingStepAndStatusInfo("Color ensure mask");

      if (force_new_mask) {
            this.range_mask_win = null;
            this.setNewMaskWindow(null);
      }

      if (this.winIsValid(this.range_mask_win)) {
            /* We already have a mask. */
            this.util.addProcessingStep("Use existing mask " + this.range_mask_win.mainView.id);
            this.setNewMaskWindow(this.range_mask_win);
      } else {
            this.flowchart.flowchartMaskBegin("New mask");
            this.global.creating_mask = true;
            var color_win = ImageWindow.windowById(color_img_id);
            this.util.addProcessingStep("Using image " + color_img_id + " for a mask");
            var color_win_copy = this.util.copyWindowEx(color_win, "color_win_mask", true);

            if (!RGBstretched) {
                  /* Run HistogramTransform based on autostretch because mask should be non-linear. */
                  color_win_copy = this.runHistogramTransform(color_win_copy, true, 'mask');
            }

            /* Create mask.
             */
            this.setNewMaskWindow(this.newMaskWindow(color_win_copy, this.ppar.win_prefix + "AutoMask", false));
            this.util.closeOneWindowById(color_win_copy.mainView.id);
            this.flowchart.flowchartMaskEnd("New mask");
            this.global.creating_mask = false;
      }
      console.writeln("colorEnsureMask done");
}

delinearizeImage(imgWin, txt)
{
      var median = imgWin.mainView.computeOrFetchProperty("Median");
      console.writeln("delinearizeImage, median " + median.at(0));
      this.runPixelMathSingleMappingEx(imgWin.mainView.id, txt != null ? txt : "delinearize", "mtf(" + median.at(0) + ", $T)", false, null, false, true);
      var median2 = imgWin.mainView.computeOrFetchProperty("Median");
      console.writeln("delinearizeImage, median after delinearize " + median2.at(0));
      return median;
}

relinearizeImage(imgWin, median, txt)
{
      console.writeln("relinearizeImage, median " + median.at(0));
      this.runPixelMathSingleMappingEx(imgWin.mainView.id, txt != null ? txt : "relinearize", "mtf(" + (1 - median.at(0)) + ", $T)", false, null, false, true);
}

// Optionally smoothen background after stretch and before gradient correction
smoothBackgroundBeforeGC(win, val_perc, linear_data)
{
      var delinearize = false;

      if (val_perc == 0) {
            return;
      }
      if (val_perc < 1) {
            console.writeln("smoothBackgroundBeforeGC, value " + val_perc + " is below 1 so using it as an absolute value");
            if (linear_data) {
                  console.writeln("smoothBackgroundBeforeGC, linear data so delinearize to use absolute value");
                  var delinearize = true;
            }
            val = val_perc;
      } else {
            console.writeln("smoothBackgroundBeforeGC, percentage " + val_perc);
            let adjust = this.getAdjustPoint(win, val_perc);
            var val = adjust.normalizedAdjustPoint;
            console.writeln("smoothBackgroundBeforeGC, value " + val);
      }
      if (delinearize) {
            this.util.add_test_image(win.mainView.id, "smoothBackgroundBeforeGC_before_delinearize", this.par.debug.val);
            /* Smoothing value is in scale 0..1 so use linear image for smoothing. */
            var median = this.delinearizeImage(win);
            this.util.add_test_image(win.mainView.id, "smoothBackgroundBeforeGC_after_delinearize", this.par.debug.val);
      }
      this.smoothBackground(win, val, 0.5);
      if (delinearize) {
            this.util.add_test_image(win.mainView.id, "smoothBackgroundBeforeGC_after_smoothing", this.par.debug.val);
            this.relinearizeImage(win, median);
            this.util.add_test_image(win.mainView.id, "smoothBackgroundBeforeGC_after_redelinearize", this.par.debug.val);
      }
}

/* Process L image
 *
 * optionally run GC on L image
 * by default run noise reduction on L image using a mask
 * run histogram transformation on L to make in non-linear
 * by default run noise reduction on L image using a mask
 */
processLimage(RGBmapping)
{
      this.util.addProcessingStepAndStatusInfo("Process L image");

      /* LRGB files */
      if (this.preprocessed_images == this.global.start_images.L_RGB_HT) {
            /* We have run HistogramTransformation. */
            this.util.addProcessingStep("Start from image " + this.L_HT_start_win.mainView.id);
            this.L_processed_HT_win = this.util.copyWindow(this.L_HT_start_win, this.ppar.win_prefix + "Integration_L_HT");
            this.L_processed_HT_id = this.L_processed_HT_win.mainView.id;
      } else {
            if (this.preprocessed_images == this.global.start_images.L_R_G_B_GC) {
                  /* We have gradient corrected from L. */
                  this.util.addProcessingStep("Start from image " + this.L_processed_id);
                  let win = this.util.copyWindow(this.L_GC_start_win, this.ppar.win_prefix + "Integration_L_processed");
                  this.L_processed_id = win.mainView.id;
            } else {
                  var L_win = ImageWindow.windowById(this.luminance_id);
                  if (!RGBmapping.stretched) {
                        /* Optionally run GC on L
                        */
                        if (this.par.GC_before_channel_combination.val) {
                              // GC already done
                              this.L_processed_id = this.noGradientCorrectionCopyWin(L_win);
                        } else if (this.par.use_GC_on_L_RGB.val) {
                              // run GC
                              console.writeln("GC L");
                              if (this.par.smoothbackground.val > 0) {
                                    this.smoothBackgroundBeforeGC(L_win, this.par.smoothbackground.val, true);
                              }
                              this.L_processed_id = this.runGradientCorrection(L_win, false);
                        } else {
                              // no GC
                              this.L_processed_id = this.noGradientCorrectionCopyWin(L_win);
                        }
                  }
                  if (this.par.use_RGBNB_Mapping.val) {
                        this.flowchart.flowchartParentBegin("RGB Narrowband mapping");
                        var mapped_L_GC_id = this.RGBNB_Channel_Mapping(this.L_processed_id, 'L', this.par.RGBNB_L_bandwidth.val, this.par.RGBNB_L_mapping.val, this.par.RGBNB_L_BoostFactor.val);
                        mapped_L_GC_id = this.util.windowRename(mapped_L_GC_id, this.util.replacePostfixOrAppend(this.L_processed_id, ["_processed"], "_NB_processed"));
                        this.util.closeOneWindowById(this.L_processed_id);
                        this.L_processed_id = mapped_L_GC_id;
                        this.flowchart.flowchartParentEnd("RGB Narrowband mapping");
                  }
            }

            if (!RGBmapping.combined && !RGBmapping.channel_noise_reduction) {
                  if (this.checkNoiseReduction('L', 'channel')) {
                        /* Noise reduction for L. */
                        this.luminanceNoiseReduction(ImageWindow.windowById(this.L_processed_id), this.mask_win);
                  }
            }
            /* On L image run HistogramTransform to stretch image to non-linear
            */
            this.L_processed_HT_id = this.util.ensure_win_prefix(this.util.replacePostfixOrAppend(this.L_processed_id, ["_processed"], "_HT"));
            if (!RGBmapping.stretched) {
                  if (this.checkNoiseReduction('L', 'combined')) {
                        this.luminanceNoiseReduction(ImageWindow.windowById(this.L_processed_id), this.mask_win);
                  }
                  if (!this.par.skip_sharpening.val) {
                        if (this.par.use_blurxterminator.val) {
                              this.runBlurXTerminator(ImageWindow.windowById(this.L_processed_id), false);
                        } else if (this.par.use_graxpert_deconvolution.val) {
                              this.runGraXpertDeconvolution(ImageWindow.windowById(this.L_processed_id));
                        }
                  }
                  if (this.checkNoiseReduction('L', 'processed')) {
                        this.luminanceNoiseReduction(ImageWindow.windowById(this.L_processed_id), this.mask_win);
                  }
                  if (this.par.remove_stars_before_stretch.val || this.remove_stars_for_RGB_stars()) {
                        this.removeStars(
                              ImageWindow.windowById(this.L_processed_id), 
                              true,
                              false,
                              null,
                              null,
                              this.par.unscreen_stars.val);
                        // use starless L image as mask
                        this.LRGBEnsureMask(this.L_processed_id);
                  }
                  if (this.par.bxt_correct_channels.val && this.par.use_blurxterminator.val) {
                        // Run BlurXTerminator on L channel
                        this.runBlurXTerminator(ImageWindow.windowById(this.L_processed_id), true);
                  }
                  if (this.save_processed_images) {
                        this.saveProcessedImage(this.L_processed_id, this.L_processed_id);
                  }
                  if (this.par.save_stretched_starless_channel_images.val) {
                        this.createStarlessChannelImages([this.L_processed_id]);
                  }
                  this.runHistogramTransform(
                              this.util.copyWindow(ImageWindow.windowById(this.L_processed_id), this.L_processed_HT_id), 
                              false,
                              'L');
                  if (this.par.remove_stars_stretched.val) {
                        this.removeStars(
                              ImageWindow.windowById(this.L_processed_HT_id), 
                              false,
                              false,
                              null,
                              null,
                              this.par.unscreen_stars.val);
                        // use starless L image as mask
                        this.LRGBEnsureMaskEx(this.L_processed_HT_id, true);
                  }
            } else {
                  if (this.checkNoiseReduction('L', 'processed')) {
                        this.luminanceNoiseReduction(ImageWindow.windowById(this.L_processed_id), this.mask_win);
                  }
                  this.util.copyWindow(ImageWindow.windowById(this.L_processed_id), this.L_processed_HT_id);
            }

            this.L_processed_HT_win = ImageWindow.windowById(this.L_processed_HT_id);
      }
      if (this.par.use_GC_on_L_RGB_stretched.val) {
            console.writeln("GC L stretched");
            if (this.par.smoothbackground.val > 0) {
                  this.smoothBackgroundBeforeGC(this.L_processed_HT_win, this.par.smoothbackground.val, false);
            }
            this.runGradientCorrection(this.L_processed_HT_win, true);
      }
      if (this.checkNoiseReduction('L', 'nonlinear')) {
            this.runNoiseReduction(this.L_processed_HT_win, this.mask_win, false);
      }
}

copyLinearFitReferenceImage(id)
{
      this.linear_fit_rerefence_id = this.util.ensure_win_prefix(id + "_linear_fit_reference");
      this.util.closeOneWindowById(this.linear_fit_rerefence_id);
      this.util.copyWindow(this.util.findWindow(id), this.linear_fit_rerefence_id);
      this.global.temporary_windows[this.global.temporary_windows.length] = this.linear_fit_rerefence_id;
}

/* Run linear fit in L, R, G and B images based on options set by user.
 */
linearFitLRGBchannels()
{
      var use_linear_fit = this.par.use_linear_fit.val;
      if (use_linear_fit == 'No linear fit') {
            this.util.addProcessingStep("No linear fit");
            return;
      }

      this.util.addProcessingStepAndStatusInfo("Linear fit LRGB channels");
      var node = this.flowchart.flowchartOperation("LinearFit");
      if (this.global.get_flowchart_data) {
            return;
      }

      var linear_fit_luminance_id = null;

      switch (use_linear_fit) {
            case 'Auto':
            case 'Min RGB':
                  var refimage = this.findReferenceImageForLinearFit([ this.red_id, this.green_id, this.blue_id ], 'Min');
                  break;
            case 'Max RGB':
                  var refimage = this.findReferenceImageForLinearFit([ this.red_id, this.green_id, this.blue_id ], 'Max');
                  break;
            case 'Min LRGB':
                  var refimage = this.findReferenceImageForLinearFit([ this.luminance_id, this.red_id, this.green_id, this.blue_id ], 'Min');
                  linear_fit_luminance_id = this.luminance_id;
                  break;
            case 'Max LRGB':
                  var refimage = this.findReferenceImageForLinearFit([ this.luminance_id, this.red_id, this.green_id, this.blue_id ], 'Max');
                  linear_fit_luminance_id = this.luminance_id;
                  break;
            case 'Red':
                  var refimage = this.red_id;
                  break;
            case 'Green':
                  var refimage = this.green_id;
                  break;
            case 'Blue':
                  var refimage = this.blue_id;
                  break;
            case 'Luminance':
                  if (this.luminance_id == null) {
                        this.util.throwFatalError("No luminance image for linear fit");
                  }
                  var refimage = this.luminance_id;
                  linear_fit_luminance_id = this.luminance_id;
                  break;
            default:
                  this.util.throwFatalError("Unknown linear fit option " + use_linear_fit);
      }

      if (refimage == null) {
            this.util.throwFatalError("No reference image for linear fit using " + use_linear_fit + " option.  Check possible incorrect combination of options.");
      }

      this.util.addProcessingStep("Linear fit using " + refimage);
      this.copyLinearFitReferenceImage(refimage);

      this.linearFitArray(refimage, [ linear_fit_luminance_id, this.red_id, this.green_id, this.blue_id ], false);

      this.engine_end_process(node);
}

/* Combine R, G and B images into one RGB image.
 *
 * optionally reduce noise on each separate R, G and B images using a mask
 * run channel combination to create RGB image
 */
combineRGBimageEx(target_name, images)
{
      this.util.addProcessingStepAndStatusInfo("Combine RGB image");

      if (this.checkNoiseReduction('RGB', 'channel') && !this.process_narrowband) {
            this.util.addProcessingStep("Noise reduction on channel images");
            this.flowchart.flowchartParentBegin("Channels");
            for (var i = 0; i < images.length; i++) {
                  this.flowchart.flowchartChildBegin(this.findChannelFromName(images[i]));
                  this.channelNoiseReduction(images[i]);
                  this.flowchart.flowchartChildEnd(this.findChannelFromName(images[i]));
            }
            this.flowchart.flowchartParentEnd("Channels");
      }

      if (this.par.bxt_correct_channels.val && this.par.use_blurxterminator.val) {
            // Run BlurXTerminator on all this.channels
            this.flowchart.flowchartParentBegin("Channels");
            for (var i = 0; i < images.length; i++) {
                  this.flowchart.flowchartChildBegin(this.findChannelFromName(images[i]));
                  this.runBlurXTerminator(ImageWindow.windowById(images[i]), true);
                  this.flowchart.flowchartChildEnd(this.findChannelFromName(images[i]));
            }
            this.flowchart.flowchartParentEnd("Channels");
      }
      if (this.par.save_processed_channel_images.val) {
            // Save processed channel images before we combine them
            for (var i = 0; i < images.length; i++) {
                  this.saveProcessedImage(images[i], images[i]);
            }
      }
      if (this.par.save_stretched_starless_channel_images.val) {
            this.createStarlessChannelImages(images);
      }

      /* ChannelCombination
       */
      this.util.addProcessingStep("Channel combination using images " + images[0] + "," + images[1] + "," + images[2]);
      var node = this.flowchart.flowchartOperation("ChannelCombination");

      if (images[0] == null || images[1] == null || images[2] == null) {
            this.util.throwFatalError("Cannot combine RGB images, one of the images is null. Check possible incorrect combination of options.");
      }

      var P = new ChannelCombination;
      P.colorSpace = ChannelCombination.RGB;
      P.channels = [ // enabled, id
            [true, images[0]],
            [true, images[1]],
            [true, images[2]]
      ];

      var model_win = ImageWindow.windowById(images[0]);
      var rgb_name = this.util.ensure_win_prefix(target_name);

      console.writeln("combineRGBimageEx, rgb_name " + rgb_name + ", model_win " + images[0]);

      var win = new ImageWindow(
                        model_win.mainView.image.width,     // int width
                        model_win.mainView.image.height,    // int height
                        3,                                  // int numberOfChannels=1
                        32,                                 // int bitsPerSample=32
                        true,                               // bool floatSample=true
                        true,                               // bool color=false
                        rgb_name);                          // const IsoString &id=IsoString()

      this.util.addExecutedProcessScriptAction("newWindow", [model_win.mainView.image.width, model_win.mainView.image.height, 3, 32, true, true, rgb_name]);
      
      if (win.mainView.id != rgb_name) {
            if (this.global.get_flowchart_data) {
                  this.global.flowchartWindows[this.global.flowchartWindows.length] = win.mainView.id;
            } else {
                  this.util.fatalWindowNameFailed("Failed to create window with name " + rgb_name + ", window name is " + win.mainView.id);
            }
      }

      this.copySelectedFITSKeywords(model_win, win);
                  
      win.mainView.beginProcess(UndoFlag.NoSwapFile);
      P.executeOn(win.mainView);
      win.mainView.endProcess();

      this.printAndSaveProcessValues(P, "", win.mainView.id);
      this.engine_end_process(node, win, "ChannelCombination");

      if (this.global.pixinsight_version_num >= 1080902) {
            win.copyAstrometricSolution(model_win);
      }

      this.setAutoIntegrateVersionIfNeeded(win);
      this.setImagetypKeyword(win, "Master light");
      this.setAutoIntegrateFilters(win.mainView.id, images);

      this.guiUpdatePreviewWin(win);

      return win;
}

/* Combine stars from channel images stored into RGB_stars_image_ids.
 * we use three first images in the array. In case of less than
 * three images the last image is copied to make three images.
 */
combineRGBStars(RGB_stars_image_ids)
{
      while (RGB_stars_image_ids.length < 3) {
            RGB_stars_image_ids[RGB_stars_image_ids.length] = RGB_stars_image_ids[RGB_stars_image_ids.length-1];
      }
      return this.combineRGBimageEx("Integration_RGB_stars", RGB_stars_image_ids);
}

/* Combine RGB image from this.global this.red_id, this.green_id and this.blue_id images
 * Image is set into this.global variables this.RGB_win and this.RGB_win_id.
 */
combineRGBimage()
{
      this.RGB_win = this.combineRGBimageEx("Integration_RGB_combined", [this.red_id, this.green_id, this.blue_id]);

      this.RGB_win_id = this.RGB_win.mainView.id;
      this.util.addScriptWindow(this.RGB_win_id);
      this.RGB_win.show();

      return this.RGB_win;
}

extractRGBchannel(RGB_id, channel, from_lights)
{
      this.util.addProcessingStepAndStatusInfo("Extract " + channel + " from " + RGB_id);
      if (!from_lights) {
            var node = this.flowchart.flowchartOperation("ChannelExtraction " + channel);
      } else {
            var node = null;
      }

      var sourceWindow = this.util.findWindow(RGB_id);
      var P = new ChannelExtraction;
      P.colorSpace = ChannelExtraction.RGB;
      P.sampleFormat = ChannelExtraction.SameAsSource;
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

      sourceWindow.mainView.beginProcess(UndoFlag.NoSwapFile);
      P.executeOn(sourceWindow.mainView);
      var targetWindow = ImageWindow.activeWindow;
      sourceWindow.mainView.endProcess();

      this.engine_end_process(node, targetWindow, "ChannelExtraction " + channel, false);

      return targetWindow.mainView.id;
}

/* Map narrowband this.channels to RGB image. We try to remove continuum from
 * narrowband image before mapping.
 */
RGBNB_Channel_Mapping(RGB_id, channel, channel_bandwidth, mapping, BoostFactor)
{
      console.writeln("RGBNB channel " + channel + " mapping " + RGB_id);
      this.flowchart.flowchartChildBegin(channel);

      if (channel == 'L') {
            var L_win_copy = this.util.copyWindow(this.util.findWindow(RGB_id), this.util.ensure_win_prefix(RGB_id + "_RGBNBcopy"));
            var channelId = L_win_copy.mainView.id;
      } else {
            var channelId = this.extractRGBchannel(RGB_id, channel);
      }

      switch (mapping) {
            case 'H':
                  var NB_id = this.H_id;
                  var NB_bandwidth = this.par.RGBNB_H_bandwidth.val;
                  break;
            case 'S':
                  var NB_id = this.S_id;
                  var NB_bandwidth = this.par.RGBNB_S_bandwidth.val;
                  break;
            case 'O':
                  var NB_bandwidth = this.par.RGBNB_O_bandwidth.val;
                  var NB_id = this.O_id;
                  break;
            case '':
                  console.writeln("RGBNB, no mapping for channel " + channel);
                  this.flowchart.flowchartChildEnd(channel);
                  return channelId;
            default:
                  this.util.throwFatalError("Invalid NB mapping " + mapping);
      }
      if (NB_id == null) {
            this.util.throwFatalError("Could not find " + mapping + " image for mapping to " + channel);
      }

      this.flowchart.flowchartParentBegin("Mapping");
      this.flowchart.flowchartChildBegin(mapping);

      var NB_images = [ NB_id ];

      this.copyToMapImages(NB_images);
      NB_id = NB_images[0];

      this.cropImageIf(NB_id);

      if (this.par.RGBNB_gradient_correction.val) {
            if (this.par.smoothbackground.val > 0) {
                  this.smoothBackgroundBeforeGC(this.util.findWindow(NB_id), this.par.smoothbackground.val, true);
            }
            NB_id = this.runGradientCorrection(this.util.findWindow(NB_id), true);
      }
      if (this.par.RGBNB_linear_fit.val) {
            var node = this.flowchart.flowchartOperation("LinearFit");
            this.linearFitImage(channelId, NB_id);
            this.engine_end_process(node);
      }
      if (this.par.use_starxterminator.val || this.par.use_starnet2.val) {
            // this.removeStars(this.util.findWindow(NB_id), true, false, null, null, false);
      }

      this.flowchart.flowchartChildEnd(mapping);
      this.flowchart.flowchartParentEnd("Mapping");

      if (this.par.RGBNB_use_RGB_image.val) {
            var sourceChannelId = RGB_id;
            channel_bandwidth = this.par.RGBNB_R_bandwidth.val;
      } else {
            var sourceChannelId = channelId;
      }

      this.util.addProcessingStepAndStatusInfo("Run " + channel + " mapping using " + NB_id + ", " + 
                        channel + " bandwidth " + channel_bandwidth + ", " + 
                        mapping + " bandwidth " + NB_bandwidth + 
                        " and boost factor " + BoostFactor);
      console.writeln("RGBNB_Channel_Mapping, runPixelMathSingleMapping " + sourceChannelId);
      var mappedChannelId = this.runPixelMathSingleMapping(
                              channelId,
                              "RGBNB:enhanced",
                              "((" + NB_id + " * " + channel_bandwidth + ") - " + 
                              "("+ sourceChannelId + " * " + NB_bandwidth + "))" +
                              " / (" + channel_bandwidth + " - " +  NB_bandwidth + ")");
      mappedChannelId = this.util.windowRename(mappedChannelId, this.ppar.win_prefix + "Integration_" + channel + "_NB_enhanced");
      this.util.findWindow(mappedChannelId).show();
      
      console.writeln("RGBNB_Channel_Mapping, runPixelMathSingleMapping " + mappedChannelId);
      var mappedChannelId2 = this.runPixelMathSingleMapping(
                              mappedChannelId,
                              "RGBNB:combine",
                              channelId + " + ((" + mappedChannelId + " - Med(" + mappedChannelId + ")) * " + 
                              BoostFactor + ")");
      mappedChannelId2 = this.util.windowRename(mappedChannelId2, this.ppar.win_prefix + "Integration_" + channel + "_NB_combine");
      this.util.findWindow(mappedChannelId2).show();
      
      if (this.par.RGBNB_linear_fit.val) {
            var node = this.flowchart.flowchartOperation("LinearFit");
            this.linearFitImage(mappedChannelId2, mappedChannelId);
            this.engine_end_process(node);
      }

      console.writeln("RGBNB_Channel_Mapping, runPixelMathSingleMapping " + mappedChannelId2);
      var mappedChannelId3 = this.runPixelMathSingleMapping(
                                    mappedChannelId2,
                                    "RGBNB:max",
                                    "max(" + mappedChannelId + ", " + mappedChannelId2 + ")");
      console.writeln("RGBNB_Channel_Mapping, runPixelMathSingleMapping " + mappedChannelId3);

      this.util.closeOneWindowById(channelId);
      this.util.closeOneWindowById(NB_id);

      this.iconized_debug_image_ids.push(mappedChannelId);
      this.iconized_debug_image_ids.push(mappedChannelId2);

      this.flowchart.flowchartChildEnd(channel);
      this.util.findWindow(mappedChannelId3).show();

      return mappedChannelId3;
}

doRGBNBmapping(RGB_id)
{
      this.util.addProcessingStepAndStatusInfo("Create mapped channel images from " + RGB_id);
      this.flowchart.flowchartParentBegin("RGB Narrowband mapping");
      var R_mapped = this.RGBNB_Channel_Mapping(RGB_id, 'R', this.par.RGBNB_R_bandwidth.val, this.par.RGBNB_R_mapping.val, this.par.RGBNB_R_BoostFactor.val);
      var G_mapped = this.RGBNB_Channel_Mapping(RGB_id, 'G', this.par.RGBNB_G_bandwidth.val, this.par.RGBNB_G_mapping.val, this.par.RGBNB_G_BoostFactor.val);
      var B_mapped = this.RGBNB_Channel_Mapping(RGB_id, 'B', this.par.RGBNB_B_bandwidth.val, this.par.RGBNB_B_mapping.val, this.par.RGBNB_B_BoostFactor.val);
      this.flowchart.flowchartParentEnd("RGB Narrowband mapping");

      R_mapped = this.util.windowRename(R_mapped, this.ppar.win_prefix + "Integration_R_NB");
      G_mapped = this.util.windowRename(G_mapped, this.ppar.win_prefix + "Integration_G_NB");
      B_mapped = this.util.windowRename(B_mapped, this.ppar.win_prefix + "Integration_B_NB");

      /* Combine RGB image from mapped channel images. */
      this.util.addProcessingStep("Combine mapped channel images to an RGB image");
      var RGB_mapped_id = this.runPixelMathRGBMapping(
                              this.util.replacePostfixOrAppend(RGB_id, ["_processed"], "_NB_processed"),
                              this.util.findWindow(RGB_id),
                              R_mapped,
                              G_mapped,
                              B_mapped);

      this.iconized_debug_image_ids.push(R_mapped);
      this.iconized_debug_image_ids.push(G_mapped);
      this.iconized_debug_image_ids.push(B_mapped);
      this.util.closeOneWindowById(RGB_id);

      return RGB_mapped_id;
}

testRGBNBmapping()
{
      var test_RGB_color_id = null;

      this.flowchart.flowchartReset();
      this.flowchart.flowchartInit();

      this.util.beginLog();

      this.util.addProcessingStep("Test narrowband mapping to RGB");

      this.findIntegratedChannelAndRGBImages(false);

      if (this.RGB_color_id == null) {
            // Try to create color image from channel images
            console.writeln("TestRGBNBmapping, create color image from channel images");
            if (this.R_id != null && this.G_id != null && this.B_id != null) {
                  var images = [this.R_id, this.G_id, this.B_id];
                  this.copyToMapImages(images);
                  this.linearFitArray(images[0], images);
                  if (this.par.use_GC_on_L_RGB.val) {
                        for (var i = 0; i < images.length; i++) {
                              if (this.par.smoothbackground.val > 0) {
                                    this.smoothBackgroundBeforeGC(this.util.findWindow(images[i]), this.par.smoothbackground.val, true);
                              }
                              images[i] = this.runGradientCorrection(this.util.findWindow(images[i]), true);
                        }
                  }
                  var color_win = this.combineRGBimageEx(this.util.ensure_win_prefix("RGBNB_RGB_original"), images);
                  color_win.show();
                  var test_RGB_color_id = color_win.mainView.id;
                  if (this.par.use_background_neutralization.val) {
                        this.runBackgroundNeutralization(color_win);
                  }
                  this.runColorCalibration(color_win, 'linear');
            } else {
                  this.util.throwFatalError("Could not find or create RGB image");
            }
      } else {
            console.writeln("TestRGBNBmapping, use existing color image " + this.RGB_color_id);
            var images = [];
            var test_RGB_color_id = this.RGB_color_id;
            var color_win = this.util.findWindow(test_RGB_color_id);
      }

      this.checkWinFilePathForOutputDir(color_win);

      var test_win = this.util.copyWindow(color_win, this.util.ensure_win_prefix("RGBNB_RGB_mapped"));

      this.doRGBNBmapping(test_win.mainView.id);

      this.util.closeWindowsFromArray(images);

      this.util.addProcessingStep("Narrowband mapping to RGB processing completed");
      this.writeProcessingStepsAndEndLog(null, true, this.ppar.win_prefix + "AutoRGBNB");

      this.flowchart.flowchartDone();
}

RGBHaFindLinearFitReferenceImage(RGB_id)
{
      if (this.linear_fit_rerefence_id != null) {
            return this.linear_fit_rerefence_id;
      } else {
            var id = this.extractRGBchannel(RGB_id, 'R');
            this.global.temporary_windows[this.global.temporary_windows.length] = id;
      }     return id;
}

RGBHaPrepareHa(rgb_is_linear, testmode)
{
      var nb_channel_id = this.H_id;
      if (nb_channel_id == null) {
            this.util.throwFatalError("Could not find Ha image for mapping to R");
      }
      console.writeln("RGBHaPrepareHa, Ha image " + nb_channel_id);

      /* Make a copy of narrowband image so we do not change the original image.
       */
      console.writeln("RGBHaPrepareHa, copy to map images");
      var mapimages = [ nb_channel_id ];
      this.copyToMapImages(mapimages);
      nb_channel_id = mapimages[0];
      this.util.add_test_image(nb_channel_id, "nb_channel_id_init", testmode);

      /* Optionally crop narrowband image.
       * Normally this should be already done.
       */
      if (this.par.crop_to_common_area.val) {
            console.writeln("RGBHaPrepareHa, crop image " + nb_channel_id);
            this.cropImageIf(nb_channel_id);
      }

      /* Optionally smoothen background. In extreme cases coulod be useful for example when using ABE.
       */
      if (this.par.RGBHa_smoothen_background.val) {
            console.writeln("RGBHaPrepareHa, smoothen background on " + nb_channel_id);
            this.smoothBackgroundBeforeGC(this.util.findWindow(nb_channel_id), this.par.RGBHa_smoothen_background_value.val, rgb_is_linear);
            this.util.add_test_image(nb_channel_id, "nb_channel_id_crop", testmode);
      }

      /* Optionally remove gradients.
       */
      if (this.par.RGBHa_gradient_correction.val) {
            if (!this.par.GC_on_lights.val) {
                  console.writeln("RGBHaPrepareHa, gradient correction on " + nb_channel_id);
                  nb_channel_id = this.runGradientCorrection(this.util.findWindow(nb_channel_id), true);
                  this.util.add_test_image(nb_channel_id, "nb_channel_id_gc", testmode);
            } else {
                  // We have already done gradient correction on lights
                  console.writeln("RGBHaPrepareHa, gradient correction on " + nb_channel_id + " skipped because GC_on_lights is enabled");
            }
      }

      /* If RGB is stretched (non-linear) then stretch also narrowband image.
       * Normally we should use linear images here.
       */
      if (!rgb_is_linear) {
            console.writeln("RGBHaPrepareHa, runHistogramTransform on " + nb_channel_id);
            var win = this.runHistogramTransform(this.util.findWindow(nb_channel_id), false, 'RGB');
            nb_channel_id = win.mainView.id;
            this.util.add_test_image(nb_channel_id, "nb_channel_id_stretched", testmode);
      }     

      return nb_channel_id;
}

RGBHa_max_Ha(RGB_id, nb_channel_id)
{
      var testmode = this.par.debug.val;

      this.util.addProcessingStepAndStatusInfo("RGBHa max(Ha, R) channel on image " + RGB_id + " using using boost factor " + this.par.RGBHa_Combine_BoostFactor.val);

      this.flowchart.flowchartParentBegin("RGBHa_max_Ha");
      this.flowchart.flowchartChildBegin("RGBHa max");

      console.writeln("RGBHa_max_Ha, create boosted Ha");
      var H_boost = this.runPixelMathSingleMapping(
                        nb_channel_id,
                        "RGBHa:H boost",
                        nb_channel_id + " * " + this.par.RGBHa_Combine_BoostFactor.val);
      H_boost = this.util.windowRename(H_boost, nb_channel_id + "_boosted");
      this.util.findWindow(H_boost).show();
      this.util.add_test_image(H_boost, "RGBHa_max_Ha_boosted", testmode);

      // This formula is from VisibleDark YouTube channel
      console.writeln("RGBHa_max_Ha, runPixelMathRGBMapping");
      this.runPixelMathRGBMapping(
            null, 
            this.util.findWindow(RGB_id), 
            "max($T[0], " + H_boost + ")",
            "$T[1]", 
            "iif($T[0]<"+ H_boost + ",$T[2]+0.05*" + H_boost + ",$T[2])");

      this.util.closeOneWindowById(nb_channel_id);
      this.util.closeOneWindowById(H_boost);

      this.flowchart.flowchartChildEnd("RGBHa max");
      this.flowchart.flowchartParentEnd("RGBHa_max_Ha");
}

RGBHa_screen_Ha(RGB_id, nb_channel_id)
{
      var testmode = this.par.debug.val;

      this.util.addProcessingStepAndStatusInfo("RGBHa screen(Ha, R) channel on image " + RGB_id + " using using boost factor " + this.par.RGBHa_Combine_BoostFactor.val);

      this.flowchart.flowchartParentBegin("RGBHa_screen_Ha");
      this.flowchart.flowchartChildBegin("RGBHa max");

      console.writeln("RGBHa_screen_Ha, create boosted Ha");
      var H_boost = this.runPixelMathSingleMapping(
                        nb_channel_id,
                        "RGBHa:H boost",
                        nb_channel_id + " * " + this.par.RGBHa_Combine_BoostFactor.val);
      H_boost = this.util.windowRename(H_boost, nb_channel_id + "_boosted");
      this.util.findWindow(H_boost).show();
      this.util.add_test_image(H_boost, "RGBHa_screen_Ha_boosted", testmode);

      // This formula is from VisibleDark YouTube channel
      console.writeln("RGBHa_screen_Ha, runPixelMathRGBMapping");
      this.runPixelMathRGBMapping(
            null, 
            this.util.findWindow(RGB_id), 
            "combine($T[0], " + H_boost + ", op_screen())",
            "$T[1]", 
            "iif($T[0]<"+ H_boost + ",$T[2]+0.05*" + H_boost + ",$T[2])");

      this.util.closeOneWindowById(nb_channel_id);
      this.util.closeOneWindowById(H_boost);

      this.flowchart.flowchartChildEnd("RGBHa max");
      this.flowchart.flowchartParentEnd("RGBHa_screen_Ha");
}

create_HRR(nb_channel_id, rgb_channel_id)
{
      var P = new ChannelCombination;
      P.colorSpace = ChannelCombination.RGB;
      P.channels = [ // enabled, id
            [true, nb_channel_id],
            [true, rgb_channel_id],
            [true, rgb_channel_id]
      ];

      P.executeGlobal();
      this.printAndSaveProcessValues(P, "HRR");
      
      return ImageWindow.activeWindow;
}

create_continuum_subtracted_image(hrr_win)
{
      var P = new PixelMath;
      P.expression = "$T[0] - ($T[1] - med($T[1]))";
      P.expression1 = "";
      P.expression2 = "";
      P.expression3 = "";
      P.useSingleExpression = true;
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
      P.createNewImage = false;
      P.showNewImage = true;
      P.newImageId = "";
      P.newImageWidth = 0;
      P.newImageHeight = 0;
      P.newImageAlpha = false;
      P.newImageColorSpace = PixelMath.Gray;
      P.newImageSampleFormat = PixelMath.SameAsTarget;

      P.executeOn(hrr_win.mainView);
      this.printAndSaveProcessValues(P, "continuum_subtracted", hrr_win.mainView.id);
}

normalize_image(imgWin)
{
      var P = new PixelMath;
      P.expression = "($T - med($T)) / ~med($T)";
      P.expression1 = "";
      P.expression2 = "";
      P.expression3 = "";
      P.useSingleExpression = true;
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
      P.createNewImage = false;
      P.showNewImage = true;
      P.newImageId = "";
      P.newImageWidth = 0;
      P.newImageHeight = 0;
      P.newImageAlpha = false;
      P.newImageColorSpace = PixelMath.SameAsTarget;
      P.newImageSampleFormat = PixelMath.SameAsTarget;

      P.executeOn(imgWin.mainView);
      this.printAndSaveProcessValues(P, "normalize", imgWin.mainView.id);
}

convert_to_grayscale(imgWin)
{
      var P = new ConvertToGrayscale;

      P.executeOn(imgWin.mainView);
      this.printAndSaveProcessValues(P, "", imgWin.mainView.id);
}

boost_Ha(imgWin, boost_factor)
{
      var P = new ExponentialTransformation;
      P.functionType = ExponentialTransformation.PIP;
      P.order = this.par.RGBHa_boost.val;
      P.sigma = 0.00;
      P.useLightnessMask = true;

      P.executeOn(imgWin.mainView);
      this.printAndSaveProcessValues(P, "boostHA", imgWin.mainView.id);
}

HRR_stretch(imgWin, targetBackground)
{
      this.runAutoSTFex(
            imgWin, 
            false,                  // iscolor
            targetBackground, 
            false,                  // silent
            true,                   // rgbLinked
            false                   // save_process
      );
}

// Continuum Subtract for linear images
// Sort of support non-linear too bvut I guess result are no good
// For the meyhod is describe in website https://www.nightphotons.com/guides/advanced-narrowband-combination
// Some help and ideas also from ContinuumSubtraction.js script by Franklin Marek
RGBHa_ContinuumSubtract(nb_channel_id, rgb_channel_id, rgb_is_linear, testmode)
{
      var nb_channel_win = this.util.findWindow(nb_channel_id);
      var rgb_channel_win = this.util.findWindow(rgb_channel_id);
      var nb_channel_nonlinear = this.util.getKeywordValue(nb_channel_win, "AutoIntegrateNonLinear");
      var rgb_channel_nonlinear = this.util.getKeywordValue(rgb_channel_win, "AutoIntegrateNonLinear");

      if (rgb_is_linear && nb_channel_nonlinear != null) {
            console.writeln("RGBHa_ContinuumSubtract, rgb_channel_nonlinear is " + rgb_channel_nonlinear + ", nb_channel_nonlinear is " + nb_channel_nonlinear);
            this.save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
            this.util.throwFatalError("RGBHa_ContinuumSubtract, no AutoIntegrateNonLinear keyword found for Ha channel");
      }
      if (rgb_is_linear && rgb_channel_nonlinear != null) {
            console.writeln("RGBHa_ContinuumSubtract, rgb_channel_nonlinear is " + rgb_channel_nonlinear + ", nb_channel_nonlinear is " + nb_channel_nonlinear);
            this.save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
            this.util.throwFatalError("RGBHa_ContinuumSubtract, RGB channel is linear but no AutoIntegrateNonLinear keyword found");
      }
      if ((nb_channel_nonlinear == null) != (rgb_channel_nonlinear == null)) {
            console.writeln("RGBHa_ContinuumSubtract, rgb_channel_nonlinear is " + rgb_channel_nonlinear + ", nb_channel_nonlinear is " + nb_channel_nonlinear);
            this.save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
            this.util.throwFatalError("RGBHa_ContinuumSubtract, Ha and RGB images are not in the same state");
      }

      /* Check for smoothing for RGB channel.
       * It is already checked for Ha channel.
       */
      if (this.par.RGBHa_smoothen_background.val) {
            if (this.par.smoothbackground.val == 0) {
                  console.writeln("RGBHa_ContinuumSubtract, smoothen background on " + rgb_channel_id);
                  this.smoothBackgroundBeforeGC(this.util.findWindow(rgb_channel_id), this.par.RGBHa_smoothen_background_value.val), rgb_is_linear;
            } else {
                  console.writeln("RGBHa_ContinuumSubtract, smoothen background on " + rgb_channel_id + " skipped because smoothbackground is " + this.par.smoothbackground.val);
            }
      }

      /* Check for gradient correction  for RGB channel.
       * It is already checked for Ha channel.
       */
      if (this.par.RGBHa_gradient_correction.val) {
            if (!this.par.GC_on_lights.val) {
                  console.writeln("RGBHa_ContinuumSubtract, gradient correction on " + rgb_channel_id);
                  rgb_channel_id = this.runGradientCorrection(rgb_channel_win, true);
                  this.util.add_test_image(rgb_channel_id, "rgb_channel_id_gc", testmode);
            } else {
                  // We have already done gradient correction on lights
                  console.writeln("RGBHa_ContinuumSubtract, gradient correction on " + rgb_channel_id + " skipped because GC_on_lights is enabled");
            }
      }

      /* Create HRR.
       */
      console.writeln("RGBHa_ContinuumSubtract, create HRR");
      var hrr_win = this.create_HRR(nb_channel_id, rgb_channel_id);

      var hrr_id = this.ppar.win_prefix + "Integration_HRR";
      hrr_win.mainView.id = hrr_id;
      if (!rgb_is_linear) {
            this.util.setFITSKeyword(hrr_win, "AutoIntegrateNonLinear", rgb_channel_nonlinear, "");
      }
      this.util.add_test_image(hrr_id, "Integration_HRR_uncalibrated", testmode);

      /* Do BackgroundNeutralization.
       */
      console.writeln("RGBHa_ContinuumSubtract, HRR, background neutralization on " + hrr_id);
      var roi = this.runBackgroundNeutralization(hrr_win);
      this.util.add_test_image(hrr_id, "Integration_HRR_bn", testmode);

      /* Do color calibration.
       */
      console.writeln("RGBHa_ContinuumSubtract, HRR, color calibration on " + hrr_id);
      this.runColorCalibrationProcess(hrr_win, roi);
      this.util.add_test_image(hrr_id, "Integration_HRR_cc", testmode);

      /* Now we have calibrated HRR image.
       */
      this.util.add_test_image(hrr_id, "Integration_HRR_calibrated", testmode);

      /* Optionally remove stars.
       */
      if (this.par.RGBHa_remove_stars.val && !this.RGBHa_H_enhanced_info.starless) {
            if (!this.par.use_starxterminator.val && !this.par.use_starnet2.val) {
                  this.save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
                  this.util.throwFatalError("RGBHa_remove_stars is set but neither StarNet nor StarXterminator is enabled");
            }
            console.writeln("RGBHa_ContinuumSubtract, remove stars on " + hrr_id);
            this.removeStars(hrr_win, true, false, null, null, false);
            this.util.add_test_image(hrr_id, "Integration_HRR_starless", testmode);
            this.RGBHa_H_enhanced_info.starless = true;
      }

      /* Do continuum subtraction.
       */
      var node = this.flowchart.flowchartOperation("Pixelmath:RGBHa, HRR continuum subtract");
      console.writeln("RGBHa_ContinuumSubtract, continuum subtraction using PixelMath");
      var enhanced_channel_id = this.ppar.win_prefix + "Integration_H_NB_enhanced";

      this.create_continuum_subtracted_image(hrr_win);

      /* Convert to grayscale.
       */
      console.writeln("RGBHa_ContinuumSubtract, convert enhanced H image to grayscale" + enhanced_channel_id);
      this.convert_to_grayscale(hrr_win);

      var enhanced_channel_win = hrr_win;
      enhanced_channel_win.mainView.id = enhanced_channel_id;

      this.util.add_test_image(enhanced_channel_id, "Integration_H_NB_enhanced_linear", testmode);

      if (this.par.RGBHa_combine_time.val != 'SPCC linear') {
            /* Stretch image to make it non-linear.
             */
            if (rgb_is_linear) {
                  // Stretch image to make it non-linear
                  console.writeln("RGBHa_ContinuumSubtract, linked AutoSTF on " + enhanced_channel_id);
                  this.HRR_stretch(enhanced_channel_win, this.par.STF_targetBackground.val);
                  rgb_channel_nonlinear = "Auto STF";
                  rgb_is_linear = false;
                  this.util.setFITSKeyword(enhanced_channel_win, "AutoIntegrateNonLinear", rgb_channel_nonlinear, "");
                  this.util.add_test_image(enhanced_channel_id, "Integration_H_NB_enhanced_nonlinear", testmode);
            }

            /* Normalize image.
             */
            console.writeln("RGBHa_ContinuumSubtract, normalize image using PixelMath");
            this.normalize_image(enhanced_channel_win);

            // It is totally unclear to me why this needs to be done twice to get proper results???
            // When running on desktop it works with only one run.
            this.util.add_test_image(enhanced_channel_id, "Integration_H_NB_enhanced_normalized_1st", testmode);
            this.normalize_image(enhanced_channel_win);

            this.util.add_test_image(enhanced_channel_id, "Integration_H_NB_enhanced_normalized", testmode);

            /* Optionally do noise reduction.
             */
            if (this.par.RGBHa_noise_reduction.val) {
                  console.writeln("RGBHa_ContinuumSubtract, remove noise");
                  this.runNoiseReduction(enhanced_channel_win, null, true);
                  this.util.add_test_image(nb_channel_id, "Integration_H_NB_enhanced_denoise", testmode);
            }

            /* Optionally boost image.
             */
            if (this.par.RGBHa_boost.val > 0) {
                  console.writeln("RGBHa_ContinuumSubtract, boost image using value " + this.par.RGBHa_boost.val);
                  this.boost_Ha(enhanced_channel_win, this.par.RGBHa_boost.val);

                  this.util.add_test_image(enhanced_channel_id, "Integration_H_NB_enhanced_boostHa", testmode);
            }
      }

      this.engine_end_process(node);

      console.writeln("RGBHa_ContinuumSubtract, enhanced H image " + enhanced_channel_id);

      return enhanced_channel_id;
}

// Create Ha image in linear stage
// Subtract R channel from Ha
RGBHa_init(RGB_id, rgb_is_linear, testmode)
{
      if (this.par.debug.val) {
            testmode = true;
      }

      this.RGB_win = this.util.findWindow(RGB_id);
      var RGB_nonlinear = this.util.getKeywordValue(this.RGB_win, "AutoIntegrateNonLinear");

      if (rgb_is_linear && RGB_nonlinear != null) {
            this.save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
            this.util.throwFatalError("RGBHa_init, no AutoIntegrateNonLinear keyword found for RGB image");
      }

      this.RGBHa_H_enhanced_info.starless = false;
      this.RGBHa_H_enhanced_info.mapping_done = false;

      this.util.addProcessingStepAndStatusInfo("Run Ha mapping init using " + this.local_RGBHa_prepare_method);

      if (this.par.RGBHa_combine_time.val == 'SPCC linear') {
            if (!rgb_is_linear) {
                  this.save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
                  this.util.throwFatalError("RGBHa_combine_time is SPCC linear but RGB image is not linear");
            }
            if (!this.par.use_spcc.val) {
                  this.save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
                  this.util.throwFatalError("RGBHa_combine_time is SPCC linear but SPCC is not enabled");
            }
      }

      var node = null;
      this.flowchart.flowchartParentBegin("RGBHa init");
      this.flowchart.flowchartChildBegin("RGBHa prepare H");

      console.writeln("RGBHa_init, prepare Ha");
      var nb_channel_id = this.RGBHaPrepareHa(rgb_is_linear, testmode);

      console.writeln("RGBHa_init, " + this.local_RGBHa_prepare_method);

      switch (this.local_RGBHa_prepare_method) {
            case 'Continuum Subtract':
                  if (this.RGB_win.mainView.image.isColor) {
                        console.writeln("RGBHa_init, extract R channel from " + RGB_id);
                        var rgb_channel_id = this.extractRGBchannel(RGB_id, 'R');
                  } else {
                        console.writeln("RGBHa_init, use channel image " + RGB_id);
                        var rgb_channel_id = this.util.copyWindow(this.util.findWindow("Integration_R"), this.util.ensure_win_prefix("Integration_R_RGBHa")).mainView.id;
                  }
                  this.global.temporary_windows[this.global.temporary_windows.length] = rgb_channel_id;
                  this.util.add_test_image(rgb_channel_id, "rgb_channel_id_init", testmode);
            
                  var enhanced_channel_id = this.RGBHa_ContinuumSubtract(nb_channel_id, rgb_channel_id, rgb_is_linear, testmode);

                  var enhanced_channel_win = this.util.findWindow(enhanced_channel_id);

                  this.util.closeOneWindowById(nb_channel_id);
                  this.util.closeOneWindowById(rgb_channel_id);
                  break;

            default:
                  if (this.par.RGBHa_remove_stars.val && !this.RGBHa_H_enhanced_info.starless) {
                        if (!this.par.use_starxterminator.val && !this.par.use_starnet2.val) {
                              this.save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
                              this.util.throwFatalError("RGBHa_remove_stars is set but neither StarNet nor StarXterminator is enabled");
                        }
                        console.writeln("RGBHa_init, remove stars on " + nb_channel_id);
                        this.removeStars(this.util.findWindow(nb_channel_id), true, false, null, null, false);
                        this.util.add_test_image(nb_channel_id, "nb_channel_id_starless", testmode);
                        this.RGBHa_H_enhanced_info.starless = true;
                  }
                  var enhanced_channel_id = nb_channel_id;
                  var enhanced_channel_win = this.util.findWindow(enhanced_channel_id);
                  if (rgb_is_linear && this.par.RGBHa_combine_time.val != 'SPCC linear') {
                        enhanced_channel_win = this.runHistogramTransform(enhanced_channel_win, false, 'H');
                        enhanced_channel_id = enhanced_channel_win.mainView.id;
                  }
                  break;
      }

      console.writeln("RGBHa_init, created enhanced H image " + enhanced_channel_id);

      this.guiUpdatePreviewWin(enhanced_channel_win);
      enhanced_channel_win.show();

      this.iconized_image_ids.push(enhanced_channel_id);

      this.flowchart.flowchartChildEnd("RGBHa prepare H");
      this.flowchart.flowchartParentEnd("RGBHa init");

      this.engine_end_process(node);

      this.RGBHa_H_enhanced_info.nb_channel_id = enhanced_channel_id; // Set Ha for this.RGBHa_mapping

      if (this.par.RGBHa_combine_time.val == 'SPCC linear') {
            console.writeln("RGBHa_init, " + this.par.RGBHa_combine_time.val + ", do RGBHa_mapping");
            this.RGBHa_mapping(RGB_id);
      }
}

// Do the actual mapping using combined non-linear image
// unless 'SPCC linear' is selected
RGBHa_mapping(RGB_id)
{
      if (this.RGBHa_H_enhanced_info.mapping_done) {
            return;
      }
      this.RGBHa_H_enhanced_info.mapping_done = true;

      this.RGB_win = this.util.findWindow(RGB_id);
      var RGB_nonlinear = this.util.getKeywordValue(this.RGB_win, "AutoIntegrateNonLinear");

      var testmode = this.par.debug.val;
      var nb_channel_id = this.RGBHa_H_enhanced_info.nb_channel_id; // Ha

      var nb_channel_win = this.util.findWindow(nb_channel_id);
      var nb_channel_nonlinear = this.util.getKeywordValue(nb_channel_win, "AutoIntegrateNonLinear");

      if ((nb_channel_nonlinear == null) != (RGB_nonlinear == null) && !this.global.get_flowchart_data) {
            console.writeln("nb_channel_nonlinear " + nb_channel_nonlinear + ", RGB_nonlinear " + RGB_nonlinear); 
            this.save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
            this.util.throwFatalError("RGBHa_mapping, Ha and RGB images are not in the same linear/non-linear state");
      }
      if (this.par.RGBHa_combine_time.val == 'SPCC linear' && nb_channel_nonlinear != null && !this.global.get_flowchart_data) {
            this.save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
            this.util.throwFatalError("RGBHa_mapping, Ha image is not linear but RGBHa_combine_time is SPCC linear");
      }

      this.util.addProcessingStepAndStatusInfo("Run Ha mapping " + this.local_RGBHa_combine_method + " on R using " + nb_channel_id);
      
      this.flowchart.flowchartParentBegin("RGBHa mapping");
      this.flowchart.flowchartChildBegin("RGBHa combine");

      console.writeln("RGBHa_mapping, " + this.local_RGBHa_combine_method);

      this.util.add_test_image(RGB_id, "rgb_channel_id_before_mapping", testmode);

      switch (this.local_RGBHa_combine_method) {
            case 'Add':
                  console.writeln("RGBHa_mapping, runPixelMathRGBMapping");
                  this.runPixelMathRGBMapping(
                        null, 
                        this.util.findWindow(RGB_id), 
                        "$T * " + (1 - this.par.RGBHa_Add_BoostFactor.val) + " + " + nb_channel_id + " * " + this.par.RGBHa_Add_BoostFactor.val,
                        "$T", 
                        "$T");
                  break;

            case 'Bright structure add':
                  var R = this.par.RGBHa_Combine_BoostFactor.val;
                  var G = 0.0;
                  var B = 0.05 * this.par.RGBHa_Combine_BoostFactor.val;
                  var m = 0.999;

                  // This formula is from Night Photons web site
                  console.writeln("RGBHa_mapping, runPixelMathRGBMapping");
                  this.runPixelMathRGBMapping(
                        null, 
                        this.util.findWindow(RGB_id), 
                        "$T[0] * ~"+ R + " + "+ R + " * mtf(~" + m + ", (mtf(" + m + ", $T[0]) + mtf(" + m + ", " + nb_channel_id + ")))",
                        "$T[1] * ~"+ G + " + "+ G + " * mtf(~" + m + ", (mtf(" + m + ", $T[1]) + mtf(" + m + ", " + nb_channel_id + ")))", 
                        "$T[2] * ~"+ B + " + "+ B + " * mtf(~" + m + ", (mtf(" + m + ", $T[2]) + mtf(" + m + ", " + nb_channel_id + ")))");
                  break;

            case 'Max':
                  console.writeln("RGBHa_mapping, RGBHa_max_Ha");
                  this.RGBHa_max_Ha(RGB_id, nb_channel_id);
                  break;

            case 'Screen':
                  console.writeln("RGBHa_mapping, RGBHa_screen_Ha");
                  this.RGBHa_screen_Ha(RGB_id, nb_channel_id);
                  break;

            case 'Med subtract add':
                  console.writeln("RGBHa_mapping, runPixelMathRGBMapping");
                  this.runPixelMathRGBMapping(
                        null, 
                        this.util.findWindow(RGB_id), 
                        "$T[0] + " + this.par.RGBHa_Combine_BoostFactor.val + " * (" + nb_channel_id + " - Med(" + nb_channel_id + "))",
                        "$T[1]", 
                        "$T[2] + " + (this.par.RGBHa_Combine_BoostFactor.val * 0.2) + " * (" + nb_channel_id + " - Med(" + nb_channel_id + "))");
                  break;

            case 'None':
                  break;

            default:
                  this.util.throwFatalError("Invalid RGBHa method " + this.local_RGBHa_combine_method + " for RGBHa mapping");
      }

      if (this.par.RGBHa_combine_time.val == 'SPCC linear') {
            console.writeln("RGBHa_mapping, " + this.par.RGBHa_combine_time.val + ", do color calibration");
            this.runColorCalibration(this.util.findWindow(RGB_id), 'linear');
      }

      this.setAutoIntegrateFilters(RGB_id, [ RGB_id, nb_channel_id ]);

      this.flowchart.flowchartChildEnd("RGBHa add H");
      this.flowchart.flowchartParentEnd("RGBHa mapping");
}

testRGBHaMapping1(savelog)
{
      if (savelog) {
            this.util.beginLog();
      }

      this.util.addProcessingStep("Test Ha mapping to RGB");

      this.global.is_processing = this.global.processing_state.enhancements_processing;

      this.util.closeOneWindowById(this.ppar.win_prefix + "Integration_HRR");
      this.util.closeOneWindowById(this.ppar.win_prefix + "Integration_HRR_uncalibrated");
      this.util.closeOneWindowById(this.ppar.win_prefix + "Integration_HRR_calibrated");
      this.util.closeOneWindowById(this.ppar.win_prefix + "Integration_HRR_background");
      this.util.closeOneWindowById(this.ppar.win_prefix + "Integration_H_NB_enhanced");
      this.util.closeOneWindowById(this.ppar.win_prefix + "RGBHa_ContinuumSubtractTemp");
      this.util.closeOneWindowById(this.ppar.win_prefix + "IntegratiIntegration_HRR_starlessT_medT");
      this.util.closeOneWindowById(this.ppar.win_prefix + "Integration_H_NB_enhanced_linear");
      this.util.closeOneWindowById(this.ppar.win_prefix + "Integration_H_NB_enhanced_nonlinear");
      this.util.closeOneWindowById(this.ppar.win_prefix + "Integration_H_NB_enhanced_normalized");
      this.util.closeOneWindowById(this.ppar.win_prefix + "Integration_H_NB_enhanced_normalized_1st");
      this.util.closeOneWindowById(this.ppar.win_prefix + "Integration_H_NB_enhanced_boostHa");
      this.util.closeOneWindowById(this.ppar.win_prefix + "Integration_H_NB_enhanced_denoise");
      this.util.closeOneWindowById(this.ppar.win_prefix + "RGBHa_RGB_mapped");
      this.util.closeOneWindowById(this.ppar.win_prefix + "RGBHa_RGB_original_HT");
      this.util.closeOneWindowById(this.ppar.win_prefix + "Integration_H_NB_med");
      this.util.closeOneWindowById(this.ppar.win_prefix + "Integration_R_NB_med");
      this.util.closeOneWindowById(this.ppar.win_prefix + "Integration_R_RGBHa");
      this.util.closeOneWindowById(this.ppar.win_prefix + "nb_channel_id_prepared");
      this.util.closeOneWindowById(this.ppar.win_prefix + "nb_channel_id_starless");
      this.util.closeOneWindowById(this.ppar.win_prefix + "rgb_channel_id_gc");
      this.util.closeOneWindowById(this.ppar.win_prefix + "rgb_channel_id_stretched");
      this.util.closeOneWindowById(this.ppar.win_prefix + "nb_channel_id_init");
      this.util.closeOneWindowById(this.ppar.win_prefix + "nb_channel_id_crop");
      this.util.closeOneWindowById(this.ppar.win_prefix + "nb_channel_id_linearfit");
      this.util.closeOneWindowById(this.ppar.win_prefix + "nb_channel_id_gc");
      this.util.closeOneWindowById(this.ppar.win_prefix + "nb_channel_id_denoise");
      this.util.closeOneWindowById(this.ppar.win_prefix + "nb_channel_id_stretched");
      this.util.closeOneWindowById(this.ppar.win_prefix + "rgb_channel_id_init");
      this.util.closeOneWindowById(this.ppar.win_prefix + "Integration_HRR_bn");
      this.util.closeOneWindowById(this.ppar.win_prefix + "Integration_HRR_cc");
      this.util.closeOneWindowById(this.ppar.win_prefix + "Integration_HRR_stretched");
      this.util.closeOneWindowById(this.ppar.win_prefix + "RGBHa_max_Ha_boosted");
      this.util.closeOneWindowById(this.ppar.win_prefix + "RGBHa_screen_Ha_boosted");
      this.util.closeOneWindowById(this.ppar.win_prefix + "rgb_channel_id_gc");
      this.util.closeOneWindowById(this.ppar.win_prefix + "H_to_R_boost");
      this.util.closeOneWindowById(this.ppar.win_prefix + "H_to_B_boost");
      this.util.closeOneWindowById(this.ppar.win_prefix + "Integration_H_map");
      this.util.closeOneWindowById(this.ppar.win_prefix + "Integration_R_map");
      this.util.closeOneWindowById(this.ppar.win_prefix + "Integration_G_map");
      this.util.closeOneWindowById(this.ppar.win_prefix + "Integration_B_map");
      
      this.flowchart.flowchartReset();
      this.flowchart.flowchartInit();

      this.findIntegratedChannelAndRGBImages(false);

      if (this.par.RGBHa_test_value.val == 'Continuum') {
            this.RGBHa_ContinuumSubtract(this.H_id, this.R_id, true, true);

      } else {
            if (this.par.use_spcc.val) {
                  this.initSPCCvalues();
            }
      
            if (this.par.crop_to_common_area.val) {
                  this.findCropInformationAutoContinue();
            }
            var color_win = this.util.findWindow(this.ppar.win_prefix + "RGBHa_RGB_original");

            if (this.R_id != null && this.G_id != null && this.B_id != null) {
                  var images = [this.R_id, this.G_id, this.B_id];
                  console.writeln("testRGBHaMapping, create _map images");
                  this.copyToMapImages(images);
                  if (this.par.crop_to_common_area.val) {
                        for (var i = 0; i < images.length; i++) {
                              this.cropImageIf(images[i]);
                        }
                  }
                  this.linear_fit_rerefence_id = images[0];
            }
            if (color_win == null) {
                  if (this.RGB_color_id == null) {
                        // Try to create color image from channel images
                        console.writeln("testRGBHaMapping, create color image from channel images");
                        if (this.R_id != null && this.G_id != null && this.B_id != null) {
                              console.writeln("testRGBHaMapping, create RGB image from " + images);
                              this.linearFitArray(this.linear_fit_rerefence_id, images);
                              if (this.par.use_GC_on_L_RGB.val) {
                                    for (var i = 0; i < images.length; i++) {
                                          if (this.par.smoothbackground.val > 0) {
                                                this.smoothBackgroundBeforeGC(this.util.findWindow(images[i]), this.par.smoothbackground.val, true);
                                          }
                                          images[i] = this.runGradientCorrection(this.util.findWindow(images[i]), true);
                                    }
                              }
                              color_win = this.combineRGBimageEx(this.ppar.win_prefix + "RGBHa_RGB_original", images);
                              color_win.show();
                              if (this.par.use_background_neutralization.val) {
                                    this.runBackgroundNeutralization(color_win);
                              }
                              if (this.par.use_spcc.val) {
                                    this.imageSolver.runImageSolver(color_win.mainView.id);
                              }
                              this.runColorCalibration(color_win, 'linear');
                        } else {
                              this.util.throwFatalError("Could not find or create RGB image");
                        }
                  } else {
                        console.writeln("testRGBHaMapping, use existing color image " + this.RGB_color_id);
                        color_win = this.util.copyWindow(this.util.findWindow(this.RGB_color_id), this.ppar.win_prefix + "RGBHa_RGB_original");
                  }
            }

            this.checkWinFilePathForOutputDir(color_win);

            var color_win_HT = this.util.copyWindow(color_win, this.ppar.win_prefix + "RGBHa_RGB_original_HT");
            console.writeln("testRGBHaMapping, stretch image " + color_win_HT.mainView.id);
            color_win_HT = this.runHistogramTransform(color_win_HT, false, 'RGB');

            var test_win = this.util.copyWindow(color_win, this.ppar.win_prefix + "RGBHa_RGB_mapped");

            this.RGBHa_init(test_win.mainView.id, true, true);

            test_win = this.runHistogramTransform(test_win, false, 'RGB');
            
            this.RGBHa_mapping(test_win.mainView.id);

            this.util.closeWindowsFromArray(images);
      }

      this.util.addProcessingStep("Ha mapping to RGB processing completed");
      if (savelog) {
            this.writeProcessingStepsAndEndLog(null, true, this.ppar.win_prefix + "AutoRGBHa");
      }

      for (var i = 0; i < this.iconized_image_ids.length; i++) {
            this.util.windowIconizeAndKeywordif(this.iconized_image_ids[i]);
      }
      for (var i = 0; i < this.global.test_image_ids.length; i++) {
            this.util.windowIconizeAndKeywordif(this.global.test_image_ids[i]);
      }
      
      this.flowchart.flowchartDone();

      this.global.is_processing = this.global.processing_state.none;

      console.noteln("Testing completed");
}

testRGBHaMapping()
{
      if (this.par.RGBHa_test_value.val == 'All mappings') {
            this.util.beginLog();
            for (var i = 0; i < this.gui.RGBHa_prepare_method_values.length; i++) {
                  this.local_RGBHa_prepare_method = this.gui.RGBHa_prepare_method_values[i];
                  for (var j = 0; j < this.gui.RGBHa_combine_method_values.length; j++) {
                        this.local_RGBHa_combine_method = this.gui.RGBHa_combine_method_values[j];
                        console.noteln("Testing RGBHa mapping with prepare method " + this.local_RGBHa_prepare_method + " and combine method " + this.local_RGBHa_combine_method);
                        // Run test
                        this.testRGBHaMapping1(false);
                        // Rename final result based on methods
                        var test_win = this.util.findWindow(this.ppar.win_prefix + "RGBHa_RGB_mapped");
                        test_win.mainView.id = this.ppar.win_prefix + "RGBHa_RGB_mapped_" + this.util.mapBadWindowNameChars(this.local_RGBHa_prepare_method) + "_" + this.util.mapBadWindowNameChars(this.local_RGBHa_combine_method);
                        this.checkCancel();
                  }
            }
            this.writeProcessingStepsAndEndLog(null, true, this.ppar.win_prefix + "AutoRGBHa_AllMappings");
      } else {
            this.testRGBHaMapping1(true);
      }
}

enhancementsHaMapping(enhancementsWin)
{
      this.H_id = this.findIntegratedChannelImage("H", true, null);
      if (this.H_id == null) {
            this.save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
            this.util.throwFatalError("Could not find integrated H image");
      }

      this.RGBHa_init(enhancementsWin.mainView.id, false, false);
      this.RGBHa_mapping(enhancementsWin.mainView.id);
      if (!this.par.debug.val) {
            for (var i = 0; i < this.iconized_image_ids.length; i++) {
                  this.util.closeOneWindowById(this.iconized_image_ids[i]);
            }
      }
}

// This is called when we have this.local_RGB_stars set to true.
// It creates this.RGB_stars_win_HT (assigned by the caller) and returns it.
createRGBstars()
{
      if (this.R_id == null || this.G_id == null || this.B_id == null) {
            this.util.throwFatalError("RGB stars option is selected but no R, G, B images found.");
      }

      console.writeln("RGB stars, combine RGB stars from " + this.R_id + ", " + this.G_id + ", " + this.B_id);

      // Make copies of original images
      console.writeln("RGB stars, force copy of channel images");
      let channel_wins = [ this.util.forceCopyWindow(this.util.findWindow(this.R_id), this.util.ensure_win_prefix(this.R_id + "_for_stars")),
                           this.util.forceCopyWindow(this.util.findWindow(this.G_id), this.util.ensure_win_prefix(this.G_id + "_for_stars")),
                           this.util.forceCopyWindow(this.util.findWindow(this.B_id), this.util.ensure_win_prefix(this.B_id + "_for_stars")) ];
      this.flowchart.flowchartParentBegin("Channels");
      for (let i = 0; i < channel_wins.length; i++) {
            if (channel_wins[i] == null) {
                  this.util.throwFatalError("Could not find channel image " + [this.R_id, this.G_id, this.B_id][i] + " for RGB stars creation.");
            }
            this.flowchart.flowchartChildBegin(this.findChannelFromName(channel_wins[i].mainView.id));

            this.cropImageIf(channel_wins[i].mainView.id, true);
            
            this.flowchart.flowchartChildEnd(this.findChannelFromName(channel_wins[i].mainView.id));
      }
      this.flowchart.flowchartParentEnd("Channels");

      console.writeln("RGB stars, linear fit");
      this.linearFitArray(channel_wins[0].mainView.id, [ channel_wins[1].mainView.id, channel_wins[2].mainView.id ], true);

      // Combine RGB image
      console.writeln("RGB stars, combine RGB image from channel images");
      let win = this.combineRGBStars([ channel_wins[0].mainView.id, channel_wins[1].mainView.id, channel_wins[2].mainView.id ]);
      let tmp_id = this.ppar.win_prefix + "Integration_RGB_stars_tmp";
      this.util.closeOneWindowById(tmp_id);
      win.mainView.id = tmp_id;

      console.writeln("RGB stars, color calibration on RGB stars image " + win.mainView.id);
      this.runColorCalibration(win, 'linear', true);

      console.writeln("RGB stars, saturation on RGB stars image " + win.mainView.id);
      this.runCurvesTransformationSaturation(win, null);

      if (this.par.use_blurxterminator.val) {
            console.writeln("RGB stars, run BlurXTerminator on RGB stars image " + win.mainView.id);
            this.runBlurXTerminator(win, false);
      } else if (this.par.use_graxpert_deconvolution.val) {
            console.writeln("RGB stars, run GraXpert deconvolution on RGB stars image " + win.mainView.id);
            this.runGraXpertDeconvolution(win);
      }

      console.writeln("RGB stars, run noise reduction on RGB stars image " + win.mainView.id);
      this.runNoiseReduction(win, null, true);

      // Save a copy of the RGB image before streching
      let win2 = this.util.forceCopyWindow(win, this.util.ensure_win_prefix("Integration_RGB_for_stars"));
      this.iconized_image_ids.push(win2.mainView.id);

      // Run HistogramTransform to stretch image to non-linear
      console.writeln("RGB stars, stretching on RGB stars image " + win.mainView.id);
      this.runHistogramTransform(win, true, 'stars');

      // Save a copy of the RGB image before we remove stars
      win2 = this.util.forceCopyWindow(win, this.util.ensure_win_prefix("Integration_RGB_for_stars_HT"));
      this.iconized_image_ids.push(win2.mainView.id);

      // Remove stars and get the stars image
      console.writeln("RGB stars, remove stars from image " + win.mainView.id);
      let stars_win_HT = this.removeStars(win, true, true, null, null, this.par.unscreen_stars.val);
      if (stars_win_HT == null) {
            this.util.throwFatalError("Could not create RGB stars image, removeStars failed.");
      }
      this.util.windowRename(stars_win_HT.mainView.id, this.ppar.win_prefix + "Integration_RGB_stars");
      console.writeln("Created RGB stars image " + stars_win_HT.mainView.id);

      // Close temporary channel windows
      for (let i = 0; i < channel_wins.length; i++) {
            this.util.closeOneWindow(channel_wins[i]);
      }
      this.util.closeOneWindow(win);

      console.noteln("RGB stars, completed, created image " + stars_win_HT.mainView.id);

      return stars_win_HT;
}

/* Process RGB image
 *
 * optionally run background neutralization on RGB image
 * by default run color calibration on RGB image
 * optionally run GC on RGB image
 * by default run noise reduction on RGB image using a mask
 * run histogram transformation on RGB image to make in non-linear
 * optionally increase saturation
 */
processRGBimage(RGBmapping)
{
      this.util.addProcessingStepAndStatusInfo("Process RGB image, RGB stretched is " + RGBmapping.stretched);

      var RGB_processed_HT_id;

      if (this.preprocessed_images == this.global.start_images.L_RGB_HT ||
            this.preprocessed_images == this.global.start_images.RGB_HT) 
      {
            /* We already have run HistogramTransformation. */
            this.util.addProcessingStep("Start from image " + this.RGB_HT_start_win.mainView.id);
            let win = this.util.copyWindow(this.RGB_HT_start_win, this.ppar.win_prefix + "Integration_RGB_HT");
            RGB_processed_HT_id = win.mainView.id;
            if (this.preprocessed_images == this.global.start_images.RGB_HT) {
                  this.colorEnsureMask(RGB_processed_HT_id, true, false);
            }
            RGBmapping.stretched = true;
      } else {
            var gc_done;
            if (this.preprocessed_images == this.global.start_images.RGB_GC) {
                  /* We have gradient corrected integrated image. */
                  this.util.addProcessingStep("Start from image " + this.RGB_GC_start_win.mainView.id);
                  let win = this.util.copyWindow(this.RGB_GC_start_win, this.ppar.win_prefix + "Integration_RGB_processed");
                  this.RGB_processed_id = win.mainView.id;
                  if (this.par.solve_image.val || this.par.use_spcc.val) {
                        this.imageSolver.runImageSolver(this.RGB_processed_id);
                  }
                  gc_done = false;
            } else {
                  if (this.preprocessed_images == this.global.start_images.RGB) {
                        // start from combined RGB image
                        this.util.addProcessingStep("Start from image " + this.RGB_color_id);
                        this.RGB_win = this.util.copyWindow(this.util.findWindow(this.RGB_color_id), this.ppar.win_prefix + "Integration_RGB_map");
                  }
                  if (this.checkNoiseReduction(this.is_color_files ? 'color' : 'RGB', 'combined')) {
                        this.runNoiseReduction(this.RGB_win, this.mask_win, !RGBmapping.stretched);
                  }
                  if (this.par.bxt_correct_only_before_cc.val && this.par.use_blurxterminator.val) {
                        this.runBlurXTerminator(this.RGB_win, true);
                  }
                  if (this.par.solve_image.val || this.par.use_spcc.val) {
                        this.imageSolver.runImageSolver(this.RGB_win.mainView.id);
                  }
                  if (this.par.use_GC_on_L_RGB.val
                      || (this.is_color_files && this.par.GC_before_channel_combination.val && !this.par.use_GC_on_L_RGB_stretched.val)) 
                  {
                        console.writeln("GC RGB");
                        if (this.par.smoothbackground.val > 0) {
                              this.smoothBackgroundBeforeGC(this.RGB_win, this.par.smoothbackground.val, true);
                        }
                        this.RGB_processed_id = this.runGradientCorrection(this.RGB_win, false);
                  } else {
                        console.writeln("No GC for RGB");
                        this.RGB_processed_id = this.noGradientCorrectionCopyWin(this.RGB_win);
                  }
                  gc_done = true;
            }

            if (this.par.use_background_neutralization.val && !this.par.use_spcc.val) {
                  /* Without SPCC, run background neutralization before CC. */
                  this.runBackgroundNeutralization(ImageWindow.windowById(this.RGB_processed_id));
            }
            if (!gc_done && this.par.bxt_correct_only_before_cc.val && this.par.use_blurxterminator.val) {
                  this.runBlurXTerminator(this.RGB_win, true);
            }
            /* Color calibration on RGB
            */
            this.runColorCalibration(ImageWindow.windowById(this.RGB_processed_id), 'linear');
            if (this.par.use_background_neutralization.val && this.par.use_spcc.val) {
                  /* With SPCC, run background neutralization after CC. */
                  this.runBackgroundNeutralization(ImageWindow.windowById(this.RGB_processed_id));
            }

            if (this.par.use_RGBNB_Mapping.val) {
                  /* Do RGBNB mapping on combined and color calibrated RGB image. */
                  this.RGB_processed_id = this.doRGBNBmapping(this.RGB_processed_id);
            }

            if (this.is_color_files || !this.is_luminance_images) {
                  /* Color or narrowband or RGB. */
                  this.colorEnsureMask(this.RGB_processed_id, RGBmapping.stretched, false);
            }
            if (this.process_narrowband && this.par.linear_increase_saturation.val > 0) {
                  /* Default 1 means no increase with narrowband. */
                  var linear_increase_saturation = this.par.linear_increase_saturation.val - 1;
            } else {
                  var linear_increase_saturation = this.par.linear_increase_saturation.val;
            }
            if (linear_increase_saturation > 0 && !RGBmapping.stretched) {
                  /* Add saturation linear RGB
                  */
                  console.writeln("Add saturation to linear RGB, " + linear_increase_saturation + " steps");
                  for (var i = 0; i < linear_increase_saturation; i++) {
                        this.increaseSaturation(ImageWindow.windowById(this.RGB_processed_id), this.mask_win);
                  }
            }

            if (!RGBmapping.stretched) {
                  if (!this.par.skip_sharpening.val) {
                        if (this.par.use_blurxterminator.val) {
                              this.runBlurXTerminator(ImageWindow.windowById(this.RGB_processed_id), false);
                        } else if (this.par.use_graxpert_deconvolution.val) {
                              this.runGraXpertDeconvolution(ImageWindow.windowById(this.RGB_processed_id));
                        }
                  }
                  /* Check noise reduction only after BlurXTerminator. */
                  if (this.checkNoiseReduction(this.is_color_files ? 'color' : 'RGB', 'processed')) {
                        this.runNoiseReduction(ImageWindow.windowById(this.RGB_processed_id), this.mask_win, !RGBmapping.stretched);
                  }
                  if (this.par.use_RGBHa_Mapping.val) {
                        /* Initialize RGBHa mapping using combined and color calibrated linear RGB image. */
                        this.RGBHa_init(this.RGB_processed_id, true, false);
                  }

                  if (this.par.remove_stars_before_stretch.val || this.remove_stars_for_RGB_stars()) {
                        let win = this.removeStars(this.util.findWindow(this.RGB_processed_id), true, !this.local_RGB_stars, null, null, this.par.unscreen_stars.val);
                        if (win != null && !this.local_RGB_stars) {
                              this.RGB_stars_win = win;
                              this.util.windowRename(this.RGB_stars_win.mainView.id, this.ppar.win_prefix + "Integration_RGB_stars");
                        }
                        if (!this.is_luminance_images) {
                              // use starless RGB image as mask
                              this.colorEnsureMask(this.RGB_processed_id, false, true);
                        }
                  }

                  if (this.save_processed_images) {
                        this.saveProcessedImage(this.RGB_processed_id, this.RGB_processed_id);
                  }
                  if (this.par.save_stretched_starless_channel_images.val && this.is_color_files) {
                        this.extractChannelsAndSaveStarlessImages(this.RGB_processed_id);
                  }
            
                  /* On RGB image run HistogramTransform to stretch image to non-linear
                  */
                  RGB_processed_HT_id = this.util.ensure_win_prefix(this.util.replacePostfixOrAppend(this.RGB_processed_id, ["_processed"], "_HT"));
                  this.runHistogramTransform(
                              this.util.copyWindow(
                                    ImageWindow.windowById(this.RGB_processed_id), 
                                    RGB_processed_HT_id), 
                              true,
                              'RGB');
                  RGBmapping.stretched = true;

                  if (this.par.remove_stars_stretched.val) {
                        let win = this.removeStars(this.util.findWindow(RGB_processed_HT_id), false, true, null, null, this.par.unscreen_stars.val);
                        if (win != null && !this.local_RGB_stars) {
                              this.RGB_stars_win_HT = win;
                        }
                        if (!this.is_luminance_images) {
                              // use starless RGB image as mask
                              this.colorEnsureMask(RGB_processed_HT_id, true, true);
                        }
                  }
            } else {
                  /* Image is not really linear any more but anyway check for noise reduction. */
                  if (this.checkNoiseReduction(this.is_color_files ? 'color' : 'RGB', 'processed')) {
                        this.runNoiseReduction(ImageWindow.windowById(this.RGB_processed_id), this.mask_win, !RGBmapping.stretched);
                  }
                  RGB_processed_HT_id = this.RGB_processed_id;
                 
            }
      }
      if (this.par.use_GC_on_L_RGB_stretched.val) {
            if (this.par.smoothbackground.val > 0) {
                  this.smoothBackgroundBeforeGC(this.util.findWindow(RGB_processed_HT_id), this.par.smoothbackground.val, false);
            }
            this.runGradientCorrection(this.util.findWindow(RGB_processed_HT_id), true);
      }
      /* If we have non-stretched stars image stretch it.
       */
      if (this.RGB_stars_win != null)  {
            let stars_id = this.util.ensure_win_prefix(RGB_processed_HT_id + "_stars");
            this.runHistogramTransform(
                  this.util.copyWindow(this.RGB_stars_win, stars_id), 
                  true,
                  'stars');
            this.RGB_stars_win_HT = this.util.findWindow(stars_id);
      } else if (this.RGB_stars_win_HT != null)  {
            this.RGB_stars_win_HT.mainView.id =  RGB_processed_HT_id + "_stars";
      }

      if (this.process_narrowband && this.par.non_linear_increase_saturation.val > 0) {
            /* Default 1 means no increase with narrowband. */
            var non_linear_increase_saturation = this.par.non_linear_increase_saturation.val - 1;
      } else {
            var non_linear_increase_saturation = this.par.non_linear_increase_saturation.val;
      }
      if (non_linear_increase_saturation > 0) {
            /* Add saturation on RGB
            */
            for (var i = 0; i < non_linear_increase_saturation; i++) {
                  this.increaseSaturation(ImageWindow.windowById(RGB_processed_HT_id), this.mask_win);
            }
      }
      console.writeln("processRGBimage done");
      return RGB_processed_HT_id;
}

invertImage(targetView)
{
      console.writeln("invertImage");
      var node = this.flowchart.flowchartOperation("Invert");

      var P = new Invert;

      targetView.beginProcess(UndoFlag.NoSwapFile);
      P.executeOn(targetView, true);
      targetView.endProcess();

      this.printAndSaveProcessValues(P, this.findChannelFromNameIf(targetView.id), targetView.id);
      this.engine_end_process(node);
}

// Mask used when fixing star colors in narrowband images.
createStarFixMask(imgView)
{
      if (!this.par.enhancements_force_new_mask.val) {
            if (this.star_fix_mask_win == null) {
                  this.star_fix_mask_win = this.util.findWindow(this.ppar.win_prefix + "star_fix_mask");
            }
            if (this.star_fix_mask_win == null) {
                  this.star_fix_mask_win = this.util.findWindow(this.ppar.win_prefix + "AutoStarFixMask");
            }
            if (this.star_fix_mask_win != null) {
                  // Use already created start mask
                  console.writeln("Use existing star mask " + this.star_fix_mask_win.mainView.id);
                  this.star_fix_mask_win_id = this.star_fix_mask_win.mainView.id;
                  return;
            }
      }
      this.util.closeOneWindowById("AutoStarFixMask");
      var node = this.flowchart.flowchartOperation("StarMask");

      var P = new StarMask;
      P.midtonesBalance = 0.80000;        // default: 0.50000
      P.waveletLayers = 8;
      P.smoothness = 8;

      imgView.beginProcess(UndoFlag.NoSwapFile);
      P.executeOn(imgView, false);
      imgView.endProcess();

      this.printAndSaveProcessValues(P, "", imgView.mainView.id);
      this.engine_end_process(node);

      this.star_fix_mask_win = ImageWindow.activeWindow;

      this.util.windowRenameKeepif(this.star_fix_mask_win.mainView.id, this.ppar.win_prefix + "AutoStarFixMask", true);
      this.star_fix_mask_win_id = this.star_fix_mask_win.mainView.id;

      this.util.addProcessingStep("Created star fix mask " + this.star_fix_mask_win.mainView.id);
}

enhancementsRemoveMagentaColor(targetWin)
{
      this.addEnhancementsStep("Remove magenta color");

      this.invertImage(targetWin.mainView);
      this.runSCNR(targetWin, true);
      this.invertImage(targetWin.mainView);

      this.guiUpdatePreviewWin(targetWin);
}

/* Do a rough fix on magenta stars by inverting the image, applying
 * SCNR to remove the now green cast on stars and then inverting back.
 * If we are not removing all green case we use mask to protect
 * other areas than stars.
 */
enhancementsFixNarrowbandStarColor(targetWin)
{
      var use_mask;

      if (this.par.skip_star_fix_mask.val || this.global.get_flowchart_data) {
            use_mask = false;
      } else if (!this.par.run_narrowband_SCNR.val || this.par.leave_some_green.val) {
            // If we do not remove all green we use mask protect
            // other than stars.
            use_mask = true;
      } else {
            // We want all green removed, do not use mask on stars either.
            use_mask = false;
      }

      this.addEnhancementsStep("Fix narrowband star color");

      if (use_mask) {
            this.createStarFixMask(targetWin.mainView);
      }

      this.invertImage(targetWin.mainView);

      if (use_mask) {
            /* Use mask to change only star colors. */
            this.util.addProcessingStep("Using mask " + this.star_fix_mask_win.mainView.id + " when fixing star colors");
            this.setMaskChecked(targetWin, this.star_fix_mask_win);
            targetWin.maskInverted = false;
      }      

      this.runSCNR(targetWin, true);

      if (use_mask) {
            targetWin.removeMask();
      }

      this.invertImage(targetWin.mainView);

      this.guiUpdatePreviewWin(targetWin);
}

addEnhancementsStep(txt)
{
      this.global.enhancements_info.push(txt);
      this.util.addProcessingStepAndStatusInfo("Processing: " + txt);
}

enhancementsFixStarCores(targetWin)
{
      console.writeln("enhancementsFixStarCores:create star mask");

      // Create mask for star cores
      var P = new StarMask;
      P.shadowsClipping = 0.00000;
      P.midtonesBalance = 0.80000;
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
      P.mode = StarMask.StarMask;

      P.executeOn(targetWin.mainView, false);

      this.printAndSaveProcessValues(P, "", targetWin.mainView.id);

      console.writeln("enhancementsFixStarCores:set star mask");

      this.star_fix_mask_win = ImageWindow.activeWindow;

      this.setMaskChecked(targetWin, this.star_fix_mask_win);
      targetWin.maskInverted = false;

      // Blur star cores
      console.writeln("enhancementsFixStarCores:blur star cores");
      var P = new Convolution;
      P.mode = Convolution.Parametric;
      P.sigma = 2.00;
      P.shape = 2.00;
      P.aspectRatio = 1.00;
      P.rotationAngle = 0.00;
      P.filterSource = "SeparableFilter {\n" +
      "   name { Gaussian (5) }\n" +
      "   row-vector {  0.010000  0.316228  1.000000  0.316228  0.010000 }\n" +
      "   col-vector {  0.010000  0.316228  1.000000  0.316228  0.010000 }\n" +
      "}\n";
      P.rescaleHighPass = false;
      P.viewId = "";

      P.executeOn(targetWin.mainView, false);

      this.printAndSaveProcessValues(P, "", targetWin.mainView.id);
           
      // Cleanup
      targetWin.removeMask();
      this.star_fix_mask_win.forceClose();
}

// When start removal is run we do some things differently
// - We make a copy of the starless image
// - We make a copy of the stars image
// - Operations like HDMT and LHE are run on the starless image
// - Star reduction is done on the stars image
// - Optionally in the end starless and stars images are combined together
enhancementsRemoveStars(parent, imgWin, apply_directly)
{
      this.addEnhancementsStep("Remove stars, unscreen " + this.par.enhancements_unscreen_stars.val);

      /* Close old star mask. If needed we create a new one from
       * the stars image.
       */
      this.util.closeOneWindowById(this.util.ensure_win_prefix("AutoStarMask"));

      let stars_win = this.removeStars(imgWin, false, true, null, this.util.ensure_win_prefix(imgWin.mainView.id + "_stars_tmp"), this.par.enhancements_unscreen_stars.val);
      let stars_win_id = this.util.ensure_win_prefix(imgWin.mainView.id + "_stars");
      if (stars_win.mainView.id != stars_win_id) {
            console.writeln("enhancementsRemoveStars, rename " + stars_win.mainView.id + " to " + stars_win_id);
            stars_win.mainView.id = stars_win_id;
      }
      stars_win.show();

      var FITSkeywords = this.getTargetFITSKeywordsForPixelmath(imgWin);
     this.setTargetFITSKeywordsForPixelmath(stars_win, FITSkeywords);

      this.util.ensureDir(this.global.outputRootDir);

      this.setFinalImageKeyword(stars_win);
      this.util.addProcessingStep("Stars image " + stars_win_id);

      if (this.par.enhancements_combine_stars.val || !apply_directly) {
            /* Make a copy of the starless image.
            */
            console.writeln("enhancementsRemoveStars copy " + imgWin.mainView.id + " to " + imgWin.mainView.id + "_starless");
            var copywin = this.util.copyWindow(imgWin, this.util.ensure_win_prefix(imgWin.mainView.id + "_starless"));
      } else {
            /* We do not combine images so just rename old image.
             */
            var copywin = imgWin;
            copywin.mainView.id = this.util.ensure_win_prefix(copywin.mainView.id + "_starless");
            this.global.enhancements_target_image_id = copywin.mainView.id;
      }
      this.setFinalImageKeyword(copywin);
      this.util.addProcessingStep("Starless image " + copywin.mainView.id);
      copywin.show();

      // this.guiUpdatePreviewWin(copywin);

      if (this.gui) {
            this.gui.update_enhancements_target_image_window_list(this.global.enhancements_target_image_id);
      }

      // return possibly new starless image for further processing
      return { starless_win: copywin, stars_id: stars_win_id };
}

enhancementsDarkerBackground(imgWin, maskWin)
{
      this.addEnhancementsStep("Darker background");
      var node = this.flowchart.flowchartOperation("CurvesTransformation");

      var P = new CurvesTransformation;
      P.K = [ // x, y
         [0.00000, 0.00000],
         [0.53564, 0.46212],
         [1.00000, 1.00000]
      ];

      imgWin.mainView.beginProcess(UndoFlag.NoSwapFile);

      /* Darken only dark parts (background) of the image. */
      this.setMaskChecked(imgWin, maskWin);
      imgWin.maskInverted = true;
      
      P.executeOn(imgWin.mainView, false);

      imgWin.removeMask();

      imgWin.mainView.endProcess();

      this.printAndSaveProcessValues(P, "", imgWin.mainView.id);
      this.engine_end_process(node);

      // this.guiUpdatePreviewWin(imgWin);
}

enhancementsDarkerHighlights(imgWin, maskWin)
{
      this.addEnhancementsStep("Darker highlights");
      var node = this.flowchart.flowchartOperation("CurvesTransformation");

      var P = new CurvesTransformation;
      P.K = [ // x, y
            [0.00000, 0.00000],
            [0.53366, 0.44200],
            [0.80952, 0.69400],
            [1.00000, 1.00000]
      ];

      imgWin.mainView.beginProcess(UndoFlag.NoSwapFile);

      /* Darken only bright parts of the image. */
      this.setMaskChecked(imgWin, maskWin);
      imgWin.maskInverted = false;

      P.executeOn(imgWin.mainView, false);

      imgWin.removeMask();

      imgWin.mainView.endProcess();

      this.printAndSaveProcessValues(P, "", imgWin.mainView.id);
      this.engine_end_process(node);

      // this.guiUpdatePreviewWin(imgWin);
}

enhancementsAdjustChannels(imgWin)
{
      if (this.par.enhancements_adjust_channels_only_k.val) {
            this.addEnhancementsStep("Adjust all channels, K " + this.par.enhancements_adjust_R.val);
      } else {
            this.addEnhancementsStep("Adjust channels, R " + this.par.enhancements_adjust_R.val + ", G " + this.par.enhancements_adjust_G.val + ", B " + this.par.enhancements_adjust_B.val);
      }
      var node = this.flowchart.flowchartOperation("PixelMath:adjust channels");

      var P = new PixelMath;

      if (this.par.enhancements_adjust_channels_only_k.val || (this.par.enhancements_adjust_G.val == 0 && this.par.enhancements_adjust_B.val == 0)) {
            P.expression = "$T * " + this.par.enhancements_adjust_R.val;
            P.useSingleExpression = true;
      } else {
            P.expression = "$T[0] * " + this.par.enhancements_adjust_R.val;
            P.expression1 = "$T[1] * " + this.par.enhancements_adjust_G.val;
            P.expression2 = "$T[2] * " + this.par.enhancements_adjust_B.val;
            P.useSingleExpression = false;
      }
      P.showNewImage = false;
      P.createNewImage = false;
      P.newImageId = "";
      P.newImageColorSpace = PixelMath.RGB;

      imgWin.mainView.beginProcess(UndoFlag.NoSwapFile);
      P.executeOn(imgWin.mainView);
      imgWin.mainView.endProcess();

      this.printAndSaveProcessValues(P, "", imgWin.mainView.id);
      this.engine_end_process(node);
}

enhancementsHDRMultiscaleTransform(imgWin, maskWin)
{
      this.addEnhancementsStep("HDRMultiscaleTransform, color " + this.par.enhancements_HDRMLT_color.val + ", layers " + this.par.enhancements_HDRMLT_layers.val + ", iterations " + this.par.enhancements_HDRMLT_iterations.val + ", overdrive " + this.par.enhancements_HDRMLT_overdrive.val);

      var failed = false;
      var hsChannels = null;
      var iChannel = null;

      var node = this.flowchart.flowchartOperation("HDRMultiscaleTransform");

      try {
            var P = new HDRMultiscaleTransform;
            P.numberOfLayers = this.par.enhancements_HDRMLT_layers.val;
            P.medianTransform = true;
            P.numberOfIterations = this.par.enhancements_HDRMLT_iterations.val;
            P.overdrive = this.par.enhancements_HDRMLT_overdrive.val;
            P.deringing = false;
            P.toLightness = true;
            P.luminanceMask = true;
            if (this.par.enhancements_HDRMLT_color.val == 'Preserve hue') {
                  P.preserveHue = true;
            } else {
                  P.preserveHue = false;
            }

            if (this.par.enhancements_HDRMLT_color.val == 'Color corrected') {
                  if (this.global.pixinsight_version_num < 1080812) {
                        hsChannels = this.extractHSchannels(imgWin);
                  } else {
                        P.toIntensity = true;
                        P.toLightness = false;
                  }
            }

            imgWin.mainView.beginProcess(UndoFlag.NoSwapFile);

            /* Transform only light parts of the image. */
            this.setMaskChecked(imgWin, maskWin);
            imgWin.maskInverted = false;
            
            P.executeOn(imgWin.mainView, false);

            imgWin.removeMask();

            imgWin.mainView.endProcess();

            this.printAndSaveProcessValues(P, "", imgWin.mainView.id);
            this.engine_end_process(node);

            if (this.par.enhancements_HDRMLT_color.val == 'Color corrected'
                && this.global.pixinsight_version_num < 1080812) 
            {
                  iChannel = this.extractIchannel(imgWin);

                  var P = new ChannelCombination;
                  P.colorSpace = ChannelCombination.HSI;
                  P.channels = [ // enabled, id
                        [true, hsChannels[0].mainView.id],
                        [true, hsChannels[1].mainView.id],
                        [true, iChannel.mainView.id]
                  ];

                  var win = imgWin;

                  win.mainView.beginProcess(UndoFlag.NoSwapFile);
                  P.executeOn(win.mainView);
                  win.mainView.endProcess();
                  this.engine_end_process(null);
            }
            // this.guiUpdatePreviewWin(imgWin);
      } catch (err) {
            failed = true;
            this.util.addCriticalStatus(err.toString());
      }
      if (hsChannels != null) {
            this.util.closeOneWindow(hsChannels[0]);
            this.util.closeOneWindow(hsChannels[1]);
      }
      if (iChannel != null) {
            this.util.closeOneWindow(iChannel);
      }
      if (failed) {
            this.util.throwFatalError("HDRMultiscaleTransform failed");
      }
}

enhancementsLocalHistogramEqualization(imgWin, maskWin)
{
      this.addEnhancementsStep("LocalHistogramEqualization, radius " + this.par.enhancements_LHE_kernelradius.val);
      var node = this.flowchart.flowchartOperation("LocalHistogramEqualization");

      var P = new LocalHistogramEqualization;
      P.radius = this.par.enhancements_LHE_kernelradius.val;
      P.slopeLimit = this.par.enhancements_LHE_contrastlimit.val;
      P.amount = 1.000;
      
      imgWin.mainView.beginProcess(UndoFlag.NoSwapFile);

      var adjusttype = this.par.enhancements_LHE_adjusttype.val;
      if (this.par.enhancements_range_mask.val) {
            adjusttype = 'range_mask';
      }

      switch (adjusttype) {
            case 'All':
                  /* Transform whole image. */
                  break;
            case 'Lights':
                  /* Transform only light parts of the image. */
                  this.setMaskChecked(imgWin, maskWin);
                  imgWin.maskInverted = false;
                  break;
            case 'Darks':
                  /* Transform only dark parts of the image. */
                  this.setMaskChecked(imgWin, maskWin);
                  imgWin.maskInverted = true;
                  break;
            case 'range_mask':
                  /* User created mask. */
                  this.setMaskChecked(imgWin, maskWin);
                  imgWin.maskInverted = false;
                  break;
            default:
                  this.util.throwFatalError("Invalid LocalHistogramEqualization mask type " + this.par.enhancements_LHE_adjusttype.val);
      }
      
      P.executeOn(imgWin.mainView, false);

      if (this.par.enhancements_LHE_adjusttype.val != 'All') {
            imgWin.removeMask();
      }

      imgWin.mainView.endProcess();

      this.printAndSaveProcessValues(P, "", imgWin.mainView.id);
      this.engine_end_process(node);

      // this.guiUpdatePreviewWin(imgWin);
}

enhancementsExponentialTransformation(imgWin, maskWin)
{
      this.addEnhancementsStep("ExponentialTransformation, order " + this.par.enhancements_ET_order.val);
      var node = this.flowchart.flowchartOperation("ExponentialTransformation");

      var P = new ExponentialTransformation;
      P.functionType = ExponentialTransformation.PIP;
      P.order = this.par.enhancements_ET_order.val;
      P.sigma = 0.00;
      
      imgWin.mainView.beginProcess(UndoFlag.NoSwapFile);

      var adjusttype = this.par.enhancements_ET_adjusttype.val;
      if (this.par.enhancements_range_mask.val) {
            adjusttype = 'range_mask';
      }

      switch (adjusttype) {
            case 'All':
                  /* Transform whole image. */
                  break;
            case 'Lights':
                  /* Transform only light parts of the image. */
                  this.setMaskChecked(imgWin, maskWin);
                  imgWin.maskInverted = false;
                  P.useLightnessMask = true;
                  break;
            case 'Darks':
                  /* Transform only dark parts of the image. */
                  this.setMaskChecked(imgWin, maskWin);
                  imgWin.maskInverted = true;
                  P.useLightnessMask = false;
                  break;
            case 'range_mask':
                  /* User created mask. */
                  this.setMaskChecked(imgWin, maskWin);
                  imgWin.maskInverted = false;
                  break;
            default:
                  this.util.throwFatalError("Invalid ExponentialTransformation mask type " + this.par.enhancements_LHE_adjusttype.val);
      }

      P.executeOn(imgWin.mainView, false);

      if (this.par.enhancements_ET_adjusttype.val != 'All') {
            imgWin.removeMask();
      }

      imgWin.mainView.endProcess();

      this.printAndSaveProcessValues(P, "", imgWin.mainView.id);
      this.engine_end_process(node);

      // this.guiUpdatePreviewWin(imgWin);
}

createNewStarMaskWin(imgWin)
{
      var node = this.flowchart.flowchartOperation("StarMask");

      var P = new StarMask;
      P.midtonesBalance = 0.80000;        // default: 0.50000
      P.waveletLayers = 5;                // default: 5
      P.largeScaleGrowth = 1;             //  default: 2
      P.smoothness = 8;                   // default: 16

      imgWin.mainView.beginProcess(UndoFlag.NoSwapFile);
      P.executeOn(imgWin.mainView, false);
      imgWin.mainView.endProcess();

      this.printAndSaveProcessValues(P, "", imgWin.mainView.id);
      this.engine_end_process(node);

      return ImageWindow.activeWindow;
}

createStarMaskIf(imgWin)
{
      if (!this.par.enhancements_force_new_mask.val) {
            this.star_mask_win = this.maskIsCompatible(imgWin, this.star_mask_win);
            if (this.star_mask_win == null) {
                  this.star_mask_win = this.maskIsCompatible(imgWin, this.util.findWindow(this.ppar.win_prefix + "star_mask"));
            }
            if (this.star_mask_win == null) {
                  this.star_mask_win = this.maskIsCompatible(imgWin, this.util.findWindow(this.ppar.win_prefix + "AutoStarMask"));
            }
            if (this.star_mask_win != null) {
                  // Use already created start mask
                  console.writeln("Use existing star mask " + this.star_mask_win.mainView.id);
                  this.star_mask_win_id = this.star_mask_win.mainView.id;
                  return;
            }
      }
      this.util.closeOneWindowById("AutoStarMask");

      this.star_mask_win = this.createNewStarMaskWin(imgWin);

      this.util.windowRenameKeepif(this.star_mask_win.mainView.id, "AutoStarMask", true);

      this.util.addProcessingStep("Created star mask " + this.star_mask_win.mainView.id);
      this.star_mask_win_id = this.star_mask_win.mainView.id;
}

/* Star Reduction using PixelMath, by Bill Blanshan
 */
smallerStarsBillsPixelmathMethod(combined_id, starless_id)
{
      this.util.addProcessingStepAndStatusInfo("Reduce stars using " + this.par.enhancements_combine_stars_reduce.val + " method");

      switch (this.par.enhancements_combine_stars_reduce.val) {
            case 'Transfer':
                  /* 1. Transfer Method - V2
                   */
                  var expression = 
                  "S=" + this.par.enhancements_combine_stars_reduce_S.val + ";\n" + // To reduce stars size more, lower S value
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
                  "S=" + this.par.enhancements_combine_stars_reduce_S.val + ";\n" + // To reduce stars size more, lower S value
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
                  "M=" + this.par.enhancements_combine_stars_reduce_M.val + ";\n" + // Method mode; 1=Strong; 2=Moderate; 3=Soft reductions
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
                  this.util.throwFatalError("Invalid star reduce mode " + this.par.enhancements_combine_stars_reduce.val);
                  break;
      }

      this.runPixelMathSingleMappingEx(combined_id, "combine stars+starless", expression, false, symbols);
}

enhancementsSmallerStars(imgWin, is_star_image)
{
      var use_mask = true;
      var targetWin = imgWin;

      if (this.global.get_flowchart_data) {
            use_mask = false;
      }
      if (use_mask) {
            this.createStarMaskIf(imgWin);
      }

      this.addEnhancementsStep("Smaller stars on stars image using " + this.par.enhancements_smaller_stars_iterations.val + " iterations");
      var node = this.flowchart.flowchartOperation("MorphologicalTransformation");

      if (this.global.get_flowchart_data) {
            return;
      }

      if (this.par.enhancements_smaller_stars_iterations.val == 0) {
            var P = new MorphologicalTransformation;
            P.operator = MorphologicalTransformation.Erosion;
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
            P.operator = MorphologicalTransformation.Selection;
            P.numberOfIterations = this.par.enhancements_smaller_stars_iterations.val;
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
      
      targetWin.mainView.beginProcess(UndoFlag.NoSwapFile);

      if (use_mask) {
            /* Use a star mask to target operation only on 
             * selected stars. Star mask leaves out biggest stars.
             */
            this.setMaskChecked(targetWin, this.star_mask_win);
            targetWin.maskInverted = false;
      }
      
      P.executeOn(targetWin.mainView, false);

      if (use_mask) {
            targetWin.removeMask();
      }

      targetWin.mainView.endProcess();

      this.printAndSaveProcessValues(P, "", targetWin.mainView.id);
      this.engine_end_process(node);

      // this.guiUpdatePreviewWin(targetWin);
}

enhancementsContrast(imgWin)
{
      console.writeln("Increase contrast");
      var node = this.flowchart.flowchartOperation("CurvesTransformation:contrast");

      var P = new CurvesTransformation;
      P.K = [ // x, y
            [0.00000, 0.00000],
            [0.26884, 0.24432],
            [0.74542, 0.77652],
            [1.00000, 1.00000]
         ];

      imgWin.mainView.beginProcess(UndoFlag.NoSwapFile);

      P.executeOn(imgWin.mainView, false);

      imgWin.mainView.endProcess();

      this.printAndSaveProcessValues(P, "", imgWin.mainView.id);
      this.engine_end_process(node);

      // this.guiUpdatePreviewWin(imgWin);
}

enhancementsStretch(win)
{
      this.addEnhancementsStep("Stretch image using " + this.local_image_stretching);

      win = this.runHistogramTransform(win, win.mainView.image.isColor, 'RGB');
      return win;
}

// Run unlinked AUtoSTF to image
enhancementsAutoSTF(win)
{
      this.addEnhancementsStep("AutoSTF on image");

      this.runAutoSTFex(
            win, 
            win.mainView.image.isColor, 
            this.global.DEFAULT_AUTOSTRETCH_TBGND, 
            true,       // silent
            true);      // rgbLinked

      return win;
}

enhancementsAdjustShadows(win, perc)
{
      this.addEnhancementsStep("Adjust shadows, " + perc + "%");

      this.adjustShadows(win, perc);

      // this.guiUpdatePreviewWin(win);
}

smoothBackground(win, val, factor)
{
      var mapping = "iif($T<" + val + "," + val + "-(" + val + "-$T)*" + factor + ",$T)";

      this.runPixelMathSingleMappingEx(win.mainView.id, "smooth background", mapping, false, null);
}

enhancementsSmoothBackground(win, val, factor)
{
      this.addEnhancementsStep("Background smoothing with value " + val + " and factor " + factor);

      this.smoothBackground(win, val, factor);

      // this.guiUpdatePreviewWin(win);
}

enhancementsEnhanceShadows(win)
{
      this.addEnhancementsStep("Enhance shadows");

      var mapping = "ln(1+$T)";

      this.runPixelMathSingleMappingEx(win.mainView.id, "enhance shadows", mapping, false, null, true);
}

enhancementsEnhanceHighlights(win)
{
      this.addEnhancementsStep("Enhance highlights");

      var mapping = "exp($T)";

      this.runPixelMathSingleMappingEx(win.mainView.id, "enhance highlights", mapping, false, null, true);
}

enhancementsGamma(win)
{
      this.addEnhancementsStep("Gamma correction with value " + this.par.enhancements_gamma_value.val);

      var mapping = "$T ^ " + this.par.enhancements_gamma_value.val;

      this.runPixelMathSingleMappingEx(win.mainView.id, "gamma correction", mapping, false, null, false);
}

autoContrast(win, contrast_limit_low, contrast_limit_high)
{
      console.writeln("autoContrast: image " + win.mainView.id + ", low limit " + contrast_limit_low + ", high limit " + contrast_limit_high);

      if (this.global.get_flowchart_data) {
            var node = this.flowchart.flowchartOperation("PixelMath:autocontrast");
            return;
      }

      var low_adjust = this.getAdjustPoint(win, contrast_limit_low);
      var high_adjust = this.getAdjustPoint(win, contrast_limit_high);

      var mapping = "($T-" + low_adjust.normalizedAdjustPoint + ")*(1/(" + high_adjust.normalizedAdjustPoint + "-" + low_adjust.normalizedAdjustPoint + "))";
      console.writeln("autoContrast: mapping " + mapping);

      this.runPixelMathSingleMappingEx(win.mainView.id, "autocontrast", mapping, false, null);
}

enhancementsAutoContrastChannel(imgWin, channel, contrast_limit_low, contrast_limit_high)
{
      console.writeln("Auto contrast on channel " + channel + ", low limit " + contrast_limit_low + ", high limit " + contrast_limit_high);

      // extract channel data
      var ch_id = this.extractRGBchannel(imgWin.mainView.id, channel);
      var ch_win = this.util.findWindow(ch_id);

      this.autoContrast(ch_win, contrast_limit_low, contrast_limit_high);

      return ch_id;
}

enhancementsAutoContrast(win, contrast_limit_low, contrast_limit_high, channels)
{
      if (channels) {
            this.addEnhancementsStep("Auto contrast channels with low limit " + contrast_limit_low + ", high limit " + contrast_limit_high);

            this.R_id = this.enhancementsAutoContrastChannel(win, 'R', contrast_limit_low, contrast_limit_high);
            this.G_id = this.enhancementsAutoContrastChannel(win, 'G', contrast_limit_low, contrast_limit_high);
            this.B_id = this.enhancementsAutoContrastChannel(win, 'B', contrast_limit_low, contrast_limit_high);

            this.runPixelMathRGBMapping(null, win, this.R_id, this.G_id, this.B_id);

            this.util.closeOneWindowById(this.R_id);
            this.util.closeOneWindowById(this.G_id);
            this.util.closeOneWindowById(this.B_id);

      } else {
            this.addEnhancementsStep("Auto contrast with low limit " + contrast_limit_low + ", high limit " + contrast_limit_high);

            this.autoContrast(win, contrast_limit_low, contrast_limit_high);
      }
}

enhancementsNoiseReduction(win, mask_win)
{
      this.addEnhancementsStep("Noise reduction using " + this.getNoiseReductionName());

      this.runNoiseReductionEx(
            win, 
            mask_win, 
            this.par.noise_reduction_strength.val,
            false);

      // this.guiUpdatePreviewWin(win);
}

enhancementsACDNR(enhancementsWin, mask_win)
{
      this.addEnhancementsStep("ACDNR noise reduction");
      if (!this.par.use_ACDNR_noise_reduction.val || this.par.ACDNR_noise_reduction.val == 0.0) {
            this.util.addProcessingStep("Extra ACDNR noise reduction not enabled");
            return;
      }

      this.runACDNRReduceNoise(enhancementsWin, mask_win);

      // this.guiUpdatePreviewWin(enhancementsWin);
}

enhancementsColorNoise(enhancementsWin)
{
      this.addEnhancementsStep("Color noise reduction");
      this.runColorReduceNoise(enhancementsWin);
}

combineLowPassandHighPass(enhancementsWin, low_pass_win, high_pass_win)
{
      var node = this.flowchart.flowchartOperation("PixelMath:combine high pass and low pass");

      console.writeln("combineLowPassandHighPass: run PixelMath on " + enhancementsWin.mainView.id + "to create high pass sharpened image");
      var P = new PixelMath;
      P.expression = low_pass_win.mainView.id + " + " + high_pass_win.mainView.id + " - 0.5"; // Subtract 0.5 we added earlier
      P.useSingleExpression = true;
      P.createNewImage = false;
      // P.rescale = false;
      // P.truncate = false;

      P.executeOn(enhancementsWin.mainView, false);

      this.printAndSaveProcessValues(P, "", enhancementsWin.mainView.id);
      this.engine_end_process(node);
}

enhancementsHighPassSharpen(enhancementsWin, mask_win)
{
      this.addEnhancementsStep("High pass sharpening");

      if (this.par.enhancements_highpass_sharpen_combine_only.val) {
            console.writeln("enhancementsHighPassSharpen: only combine high pass and low pass images into " + enhancementsWin.mainView.id);
            var str = enhancementsWin.mainView.id;
            if (str.indexOf("_lowpass") != -1) {
                  var low_pass_id = str.split("_lowpass")[0] + "_lowpass";
                  var high_pass_id = low_pass_id.replace("_lowpass", "_highpass");
            } else if (str.indexOf("_highpass") != -1) {
                  var high_pass_id = str.split("_highpass")[0] + "_highpass";
                  var low_pass_id = high_pass_id.replace("_highpass", "_lowpass");
            } else {
                  this.util.throwFatalError("Invalid image name " + str + ", name should include _lowpass or _highpass");
            }
            var high_pass_win = this.util.findWindow(high_pass_id);
            if (high_pass_win == null) {
                  this.util.throwFatalError("High pass image " + high_pass_id + " not found");
            }
            var low_pass_win = this.util.findWindow(low_pass_id);
            if (low_pass_win == null) {
                  this.util.throwFatalError("Low pass image " + low_pass_id + " not found");
            }
            this.combineLowPassandHighPass(enhancementsWin, low_pass_win, high_pass_win)
            return;
      }

      // ---------------------------------------------
      // Generate low pass filtered image
      // ---------------------------------------------
      var node = this.flowchart.flowchartOperation("PixelMath:low pass image");

      console.writeln("enhancementsHighPassSharpen: copy low pass image from " + enhancementsWin.mainView.id + " to " + this.util.ensure_win_prefix(enhancementsWin.mainView.id + "_lowpass"));
      var low_pass_win = this.util.forceCopyWindow(enhancementsWin, this.util.ensure_win_prefix(enhancementsWin.mainView.id + "_lowpass"));

      console.writeln("enhancementsHighPassSharpen: run ATrousWaveletTransform on " + low_pass_win.mainView.id + ", layers " + this.par.enhancements_highpass_sharpen_layers.val);

      var layers = [ // enabled, biasEnabled, bias, noiseReductionEnabled, noiseReductionThreshold, noiseReductionAmount, noiseReductionIterations
            [true, true, 0.000, false, 3.000, 1.00, 1],
            [true, true, 0.000, false, 3.000, 1.00, 1],
            [true, true, 0.000, false, 3.000, 1.00, 1],
            [true, true, 0.000, false, 3.000, 1.00, 1],
            [true, true, 0.000, false, 3.000, 1.00, 1],
            [true, true, 0.000, false, 3.000, 1.00, 1],
            [true, true, 0.000, false, 3.000, 1.00, 1],
            [true, true, 0.000, false, 3.000, 1.00, 1]
      ];
      for (var i = 0; i < this.par.enhancements_highpass_sharpen_layers.val; i++) {
            layers[i][0] = false;
      }

      var P = new ATrousWaveletTransform;
      P.layers = layers; // enabled, biasEnabled, bias, noiseReductionEnabled, noiseReductionThreshold, noiseReductionAmount, noiseReductionIterations

      P.executeOn(low_pass_win.mainView, false);

      this.printAndSaveProcessValues(P, "", low_pass_win.mainView.id);
      this.engine_end_process(node);

      // ---------------------------------------------
      // Generate high pass filtered image by subtract low pass from original image
      // ---------------------------------------------
      var node = this.flowchart.flowchartOperation("PixelMath:high pass image");

      console.writeln("enhancementsHighPassSharpen: copy low pass image from " + enhancementsWin.mainView.id + " to " + this.util.ensure_win_prefix(enhancementsWin.mainView.id + "_highpass"));
      var high_pass_win = this.util.forceCopyWindow(enhancementsWin, this.util.ensure_win_prefix(enhancementsWin.mainView.id + "_highpass"));

      console.writeln("enhancementsHighPassSharpen: run PixelMath on " + high_pass_win.mainView.id + " to create high pass image");
      var P = new PixelMath;
      P.expression = "$T - " + low_pass_win.mainView.id + " + 0.5"; // Add 0.5 so it looks the same as in photoshop
      P.useSingleExpression = true;
      P.createNewImage = false;
      // P.rescale = false;
      // P.truncate = false;

      P.executeOn(high_pass_win.mainView, false);

      this.printAndSaveProcessValues(P, "", high_pass_win.mainView.id);
      this.engine_end_process(node);

      if (this.par.enhancements_highpass_sharpen_noise_reduction.val) {
            console.writeln("enhancementsHighPassSharpen: run noise reduction on " + high_pass_win.mainView.id);
            this.enhancementsNoiseReduction(high_pass_win, null);
      }

      // ---------------------------------------------
      // Sharpen the high pass image
      // ---------------------------------------------
      if (this.par.enhancements_highpass_sharpen_method.val == 'MLT' || this.par.enhancements_highpass_sharpen_method.val == 'Default') {
            console.writeln("enhancementsHighPassSharpen: use MultiscaleLinearTransform to sharpen " + high_pass_win.mainView.id);
            for (var i = 0; i < this.par.enhancements_sharpen_iterations.val; i++) {
                  this.runMultiscaleLinearTransformSharpen(high_pass_win, mask_win);
            }
      } else if (this.par.enhancements_highpass_sharpen_method.val == 'UnsharpMask') {
            console.writeln("enhancementsHighPassSharpen: use UnsharpMask to sharpen " + high_pass_win.mainView.id);
            this.enhancementsUnsharpMask(high_pass_win, mask_win);
      } else if (this.par.enhancements_highpass_sharpen_method.val == 'BlurXTerminator') {
            console.writeln("enhancementsHighPassSharpen: use BlurXTerminator to sharpen " + high_pass_win.mainView.id);
            this.runBlurXTerminator(high_pass_win, false);
      } else if (this.par.enhancements_highpass_sharpen_method.val == 'None') {
            console.writeln("enhancementsHighPassSharpen: no sharpening on " + high_pass_win.mainView.id);
      } else {
            this.util.throwFatalError("Invalid high pass sharpening method " + this.par.enhancements_highpass_sharpen_method.val);
      }

      // ---------------------------------------------
      // Create new image by combining high pass and low pass images
      // ---------------------------------------------'
      this.combineLowPassandHighPass(enhancementsWin, low_pass_win, high_pass_win);

      // Cleanup
      if (!this.par.enhancements_highpass_sharpen_keep_images.val) {
            this.util.closeOneWindow(low_pass_win);
            this.util.closeOneWindow(high_pass_win);
      }
}

enhancementsUnsharpMask(enhancementsWin, mask_win)
{
      this.addEnhancementsStep("UnsharpMask using StdDev " + this.par.enhancements_unsharpmask_stddev.val + ", amount " + this.par.enhancements_unsharpmask_amount.val);
      var node = this.flowchart.flowchartOperation("UnsharpMask:sharpen");

      var P = new UnsharpMask;
      P.sigma = this.par.enhancements_unsharpmask_stddev.val;
      P.amount = this.par.enhancements_unsharpmask_amount.val;
      P.useLuminance = true;

      if (mask_win != null) {
            /* Sharpen only light parts of the image. */
            this.setMaskChecked(enhancementsWin, mask_win);
            enhancementsWin.maskInverted = false;
      }

      enhancementsWin.mainView.beginProcess(UndoFlag.NoSwapFile);
      P.executeOn(enhancementsWin.mainView, false);
      enhancementsWin.mainView.endProcess();

      this.printAndSaveProcessValues(P, "", enhancementsWin.mainView.id);
      this.engine_end_process(node);

      if (this.mask_win != null) {
            enhancementsWin.removeMask();
      }

      // this.guiUpdatePreviewWin(enhancementsWin);
}

enhancementsClarity(enhancementsWin, mask_win)
{
      this.addEnhancementsStep("Clarity using StdDev " + this.par.enhancements_clarity_stddev.val + ", amount " + this.par.enhancements_clarity_amount.val + (this.par.enhancements_clarity_mask.val ? " using a mask" : ""));

      if (!this.par.enhancements_clarity_mask.val) {
            mask_win = null;
      }
      var node = this.flowchart.flowchartOperation("UnsharpMask:clarity");

      var P = new UnsharpMask;
      P.sigma = this.par.enhancements_clarity_stddev.val;
      P.amount = this.par.enhancements_clarity_amount.val;
      P.useLuminance = true;

      if (mask_win != null) {
            /* Sharpen only light parts of the image. */
            this.setMaskChecked(enhancementsWin, mask_win);
            enhancementsWin.maskInverted = false;
      }

      enhancementsWin.mainView.beginProcess(UndoFlag.NoSwapFile);
      P.executeOn(enhancementsWin.mainView, false);
      enhancementsWin.mainView.endProcess();

      this.printAndSaveProcessValues(P, "", enhancementsWin.mainView.id);
      this.engine_end_process(node);

      if (mask_win != null) {
            enhancementsWin.removeMask();
      }

      // this.guiUpdatePreviewWin(enhancementsWin);
}

enhancementsSharpen(enhancementsWin, mask_win)
{
      if (this.par.use_blurxterminator.val) {
            this.addEnhancementsStep("Sharpening using BlurXTerminator");
            this.runBlurXTerminator(enhancementsWin, false);
      } else if (this.par.use_graxpert_deconvolution.val) {
            this.runGraXpertDeconvolution(enhancementsWin);
      } else {
            this.addEnhancementsStep("Sharpening using MLT with " + this.par.enhancements_sharpen_iterations.val + " iterations");
            for (var i = 0; i < this.par.enhancements_sharpen_iterations.val; i++) {
                  this.runMultiscaleLinearTransformSharpen(enhancementsWin, mask_win);
            }
      }
      // this.guiUpdatePreviewWin(enhancementsWin);
}

enhancementsSaturation(enhancementsWin, mask_win)
{
      if (this.par.enhancements_less_saturation.val) {
            this.addEnhancementsStep("Decrease saturation using " + this.par.enhancements_saturation_iterations.val + " iterations");
      } else {
            this.addEnhancementsStep("Increase saturation using " + this.par.enhancements_saturation_iterations.val + " iterations");
      }

      for (var i = 0; i < this.par.enhancements_saturation_iterations.val; i++) {
            if (this.par.enhancements_less_saturation.val) {
                  this.decreaseSaturation(enhancementsWin, mask_win);
            } else {
                  this.increaseSaturation(enhancementsWin, mask_win);
            }
      }
      // this.guiUpdatePreviewWin(enhancementsWin);
}

enhancementsBandingReduction(enhancementsWin)
{
      this.addEnhancementsStep("Banding reduction");

      this.runBandingReduction(enhancementsWin);
}

enhancementsBackgroundNeutralization(enhancementsWin)
{
      this.addEnhancementsStep("Background neutralization");

      this.runBackgroundNeutralization(enhancementsWin);
}

enhancementsGradientCorrection(enhancementsWin)
{
      if (this.par.enhancements_GC_method.val == 'Auto') {
            var gc_method = this.getDefaultGradientCorrectionMethod();
      } else {
            var gc_method = this.par.enhancements_GC_method.val;
      }
      if (gc_method == 'GraXpert') {
            this.addEnhancementsStep("Extract background using GraXpert, correction " + this.par.graxpert_correction.val + ', smoothing ' + this.par.graxpert_smoothing.val);
      } else if (gc_method == 'ABE') {
            this.addEnhancementsStep("Extract background using ABE, degree " + this.par.ABE_degree.val + ", correction " + this.par.ABE_correction.val);
      } else if (gc_method == 'DBE') {
            this.addEnhancementsStep("Extract background using DBE, bn " + this.par.dbe_use_background_neutralization.val + ", ABE " + this.par.dbe_use_abe.val + 
                                    ", normalize " + this.par.dbe_normalize.val + ", samples " + this.par.dbe_samples_per_row.val + ", min weight " + this.par.dbe_min_weight.val);
      } else if (gc_method == 'MultiscaleGradientCorrection') {
            this.addEnhancementsStep("Extract background using MultiscaleGradientCorrection");
      } else {
            this.addEnhancementsStep("Extract background using GradientCorrection" +
                                    (this.par.gc_smoothness.val != this.par.gc_smoothness.def ? ", Smoothness " + this.par.gc_smoothness.val : "") + 
                                    (this.par.gc_automatic_convergence.val != this.par.gc_automatic_convergence.def ? ', Automatic convergence ' + this.par.gc_automatic_convergence.val : "") +
                                    (this.par.gc_structure_protection.val != this.par.gc_structure_protection.def ? ", Structure Protection " + this.par.gc_structure_protection.val : "") +
                                    (this.par.gc_protection_threshold.val != this.par.gc_protection_threshold.def ? ", Protection threshold " + this.par.gc_protection_threshold.val : "") + 
                                    (this.par.gc_protection_amount.val != this.par.gc_protection_amount.def ? ", Protection amount " + this.par.gc_protection_amount.val : ""));
      }
      var id = this.runGradientCorrection(enhancementsWin, true, gc_method);
      // this.guiUpdatePreviewWin(enhancementsWin);
      return id;
}

enhancementsSHOHueShift(imgWin)
{
      this.addEnhancementsStep("SHO hue shift");
      var node = this.flowchart.flowchartOperation("CurvesTransformation:SHOhueshift");

      // Hue 1
      var P = new CurvesTransformation;
      P.ct = CurvesTransformation.AkimaSubsplines;
      P.H = [ // x, y
      [0.00000, 0.00000],
      [0.42857, 0.53600],
      [1.00000, 1.00000]
      ];

      imgWin.mainView.beginProcess(UndoFlag.NoSwapFile);
      P.executeOn(imgWin.mainView, false);
      imgWin.mainView.endProcess();

      this.engine_end_process(null);

      // Hue 2
      var P = new CurvesTransformation;
      P.ct = CurvesTransformation.AkimaSubsplines;
      P.H = [ // x, y
      [0.00000, 0.00000],
      [0.25944, 0.17200],
      [0.49754, 0.50600],
      [0.77176, 0.68400],
      [1.00000, 1.00000]
      ];

      imgWin.mainView.beginProcess(UndoFlag.NoSwapFile);
      P.executeOn(imgWin.mainView, false);
      imgWin.mainView.endProcess();

      this.engine_end_process(null);

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

      imgWin.mainView.beginProcess(UndoFlag.NoSwapFile);
      P.executeOn(imgWin.mainView, false);
      imgWin.mainView.endProcess();
      this.engine_end_process(node);
      // this.guiUpdatePreviewWin(imgWin);
}

enhancementsSelectiveColor(imgWin)
{
      this.addEnhancementsStep("Selective Color");
      this.selectiveColor.apply(imgWin.mainView);
      this.engine_end_process(null);
}

findNarrowBandPalette(name)
{
      for (var i = 0; i < this.global.narrowBandPalettes.length; i++) {
            if (this.global.narrowBandPalettes[i].name == name) {
                  return this.global.narrowBandPalettes[i];
            }
      }
      this.util.throwFatalError("Could not find narrowband palette " + name);
      return null;
}

useStretchedNarrowBandData(name)
{
      for (var i = 0; i < this.global.narrowBandPalettes.length; i++) {
            if (this.global.narrowBandPalettes[i].name == name) {
                  return this.global.narrowBandPalettes[i].stretched;
            }
      }
      return false;
}

// Run hue shift on narrowband image to shift red more to yellow/orange.
narrowbandRedToOrangeHueShift(imgWin)
{
      this.util.addProcessingStepAndStatusInfo("Red hue shift to orange on " + imgWin.mainView.id);
      
      var P = new CurvesTransformation;
      P.H = [ // x, y
            [0.00000, 0.00000],
            [0.14614, 0.17400],
            [0.33990, 0.33400],
            [0.50082, 0.49800],
            [0.74713, 0.75000],
            [1.00000, 1.00000]
      ];
      
      imgWin.mainView.beginProcess(UndoFlag.NoSwapFile);

      P.executeOn(imgWin.mainView, false);

      imgWin.mainView.endProcess();

      this.engine_end_process(null);
}

// increase saturation on yellow/orange and blue
narrowbandOrangeBlueSaturation(imgWin)
{
      this.util.addProcessingStepAndStatusInfo("Orange and blue color saturation on " + imgWin.mainView.id);

      var P = new ColorSaturation;
      P.HS = [ // x, y
            [0.00000, 0.00000],
            [0.19444, 0.51542],
            [0.32639, -0.01322],
            [0.69097, 0.77974],
            [0.88194, 0.01322],
            [1.00000, 0.00000]
      ];

      imgWin.mainView.beginProcess(UndoFlag.NoSwapFile);

      P.executeOn(imgWin.mainView, false);

      imgWin.mainView.endProcess();

      this.engine_end_process(null);
}

enhancementsOrangeBlueColors(imgWin)
{
      this.addEnhancementsStep("Orange/blue colors");
      this.narrowbandRedToOrangeHueShift(imgWin);
      this.narrowbandOrangeBlueSaturation(imgWin);
}

runEnhancementsNarrowbandMappingChannels(imgWin, target_palette, mappings)
{
      console.writeln("runEnhancementsNarrowbandMappingChannels, mappings " + JSON.stringify(mappings));

      var RGBNB_R_mapping = target_palette.R;
      for (var i = 0; i < mappings.length; i++) {
            RGBNB_R_mapping = this.replaceMappingImageNamesExt(RGBNB_R_mapping, mappings[i][0], mappings[i][1], "", null, null);
      }
      var RGBNB_G_mapping = target_palette.G;
      for (var i = 0; i < mappings.length; i++) {
            RGBNB_G_mapping = this.replaceMappingImageNamesExt(RGBNB_G_mapping, mappings[i][0], mappings[i][1], "", null, null);
      }
      var RGBNB_B_mapping = target_palette.B;
      for (var i = 0; i < mappings.length; i++) {
            RGBNB_B_mapping = this.replaceMappingImageNamesExt(RGBNB_B_mapping, mappings[i][0], mappings[i][1], "", null, null);
      }

      this.runPixelMathRGBMapping(null, imgWin, RGBNB_R_mapping, RGBNB_G_mapping, RGBNB_B_mapping);
}

runEnhancementsNarrowbandMappingRGB(imgWin, source_palette_name, target_palette)
{
      console.writeln("runEnhancementsNarrowbandMappingRGB, from " + source_palette_name + " to " + target_palette.name);

      switch (source_palette_name) {
            case 'HOO':
                  var mappings = [
                        [ 'H', this.extractRGBchannel(imgWin.mainView.id, 'R') ], 
                        [ 'O', this.extractRGBchannel(imgWin.mainView.id, 'G') ]
                  ];
                  break;
            case 'SHO':
                  var mappings = [
                        [ 'S', this.extractRGBchannel(imgWin.mainView.id, 'R') ], 
                        [ 'H', this.extractRGBchannel(imgWin.mainView.id, 'G') ], 
                        [ 'O', this.extractRGBchannel(imgWin.mainView.id, 'B') ]
                  ];
                  break;
            default:
                  this.util.throwFatalError("Invalid source palette " + source_palette_name);
      }

      this.runEnhancementsNarrowbandMappingChannels(imgWin, target_palette, mappings);

      for (var i = 0; i < mappings.length; i++) {
            this.util.closeOneWindowById(mappings[i][1]);
      }
      this.util.addProcessingStepAndStatusInfo("runEnhancementsNarrowbandMappingRGB, mapping complete");
}

enhancementsForaxx(imgWin, source_palette_name)
{
      this.addEnhancementsStep("Foraxx mapping using " + source_palette_name + " palette");

      switch (source_palette_name) {
            case 'HOO':
                  var dynamic_palette = this.findNarrowBandPalette("Dynamic HOO");
                  break;
            case 'SHO':
                  var dynamic_palette = this.findNarrowBandPalette("Dynamic SHO");
                  break;
            default:
                  this.util.throwFatalError("Invalid Foraxx palette " + source_palette_name);
      }

      this.runEnhancementsNarrowbandMappingRGB(imgWin, source_palette_name, dynamic_palette);

      if (source_palette_name == 'SHO') {
            this.runSCNR(imgWin, false);
            this.enhancementsOrangeBlueColors(imgWin);
      }
}

enhancementsNarrowbandMappingRGB(imgWin, source_palette_name, target_palette_name)
{
      this.addEnhancementsStep("Narrowband mapping from " + source_palette_name + " to " + target_palette_name);

      var target_palette = this.findNarrowBandPalette(target_palette_name);

      this.runEnhancementsNarrowbandMappingRGB(imgWin, source_palette_name, target_palette);
}

// Rename and save palette batch image
narrowbandPaletteBatchFinalImage(palette_name, winId, enhancements)
{
      // rename and save image using palette name
      console.writeln("narrowbandPaletteBatchFinalImage:rename " + winId + " using " + palette_name);
      var palette_image = this.util.mapBadChars(palette_name);
      palette_image = this.ppar.win_prefix + "Auto_" + palette_image;
      if (enhancements) {
            palette_image = palette_image + "_enh";
      }
      palette_image = this.util.windowRenameKeepifEx(winId, palette_image, true, true);
      console.writeln("narrowbandPaletteBatchFinalImage:new name " + palette_image);
      // set final image keyword so it easy to save all file e.g. as 16 bit TIFF
      console.writeln("narrowbandPaletteBatchFinalImage:set final image keyword");
      this.setFinalImageKeyword(ImageWindow.windowById(palette_image));
      // save image
      console.writeln("narrowbandPaletteBatchFinalImage:save image " + palette_image);
      this.saveProcessedWindow(palette_image);
      this.util.addProcessingStep("Narrowband palette batch final image " + palette_image);
      return palette_image;
}

// Run through all narrowband palette options
autointegrateNarrowbandPaletteBatch(parent, auto_continue)
{
      console.writeln("autointegrateNarrowbandPaletteBatch");
      if (this.par.use_narrowband_multiple_mappings.val) {
            var current_mappings = this.par.narrowband_multiple_mappings_list.val.split(",");
            for (var i = 0; i < current_mappings.length; i++) {
                  var found = false;
                  for (var j = 0; j < this.global.narrowBandPalettes.length; j++) {
                        if (current_mappings[i].trim() == this.global.narrowBandPalettes[j].name) {
                              found = true;
                              break;
                        }
                  }
                  if (!found) {
                        this.util.throwFatalError("Unknow narrowband mapping " + current_mappings[i].trim());
                  }
            }
      }
      var batch_image_cnt = 0;
      for (var i = 0; i < this.global.narrowBandPalettes.length; i++) {
            console.writeln("autointegrateNarrowbandPaletteBatch loop ", i);
            var run_this = false;
            if (this.par.use_narrowband_multiple_mappings.val) {
                  for (var j = 0; j < current_mappings.length; j++) {
                        if (this.global.narrowBandPalettes[i].name == current_mappings[j].trim()) {
                              run_this = true;
                              break;
                        }
                  }
            } else {
                  run_this = this.global.narrowBandPalettes[i].all;
            }
            if (run_this) {
                  if (auto_continue) {
                        this.util.ensureDialogFilePath("narrowband batch result files");
                        var txt = "Narrowband palette " + this.global.narrowBandPalettes[i].name + " batch autocontinue";
                  } else {
                        var txt = "Narrowband palette " + this.global.narrowBandPalettes[i].name + " batch run";
                  }
                  this.par.narrowband_mapping.val = this.global.narrowBandPalettes[i].name;
                  this.par.custom_R_mapping.val = this.global.narrowBandPalettes[i].R;
                  this.par.custom_G_mapping.val = this.global.narrowBandPalettes[i].G;
                  this.par.custom_B_mapping.val = this.global.narrowBandPalettes[i].B;
                  this.util.addProcessingStepAndStatusInfo("Narrowband palette " + this.global.narrowBandPalettes[i].name + " batch using " + this.par.custom_R_mapping.val + ", " + this.par.custom_G_mapping.val + ", " + this.par.custom_B_mapping.val);

                  this.flowchart.flowchartReset();

                  var finalImageId = this.autointegrateProcessingEngine(parent, auto_continue, this.util.is_narrowband_option(), txt);
                  if (finalImageId == null) {
                        this.util.throwFatalError("Narrowband palette batch could not process all palettes");
                  }
                  // rename and save the final image
                  var image_name = this.narrowbandPaletteBatchFinalImage(this.global.narrowBandPalettes[i].name, this.util.ensure_win_prefix(finalImageId), false);
                  this.util.batchWindowSetPosition(image_name, batch_image_cnt);
                  batch_image_cnt++;
                  if (this.util.findWindow(this.ppar.win_prefix + finalImageId + "_enh") != null) {
                        image_name = this.narrowbandPaletteBatchFinalImage(this.global.narrowBandPalettes[i].name, this.util.ensure_win_prefix(finalImageId) + "_enh", true);
                        this.util.batchWindowSetPosition(image_name, batch_image_cnt);
                        batch_image_cnt++;
                  }
                  // next runs are always auto_continue
                  console.writeln("autointegrateNarrowbandPaletteBatch:set auto_continue = true");
                  auto_continue = true;
                  // close all but integrated images
                  console.writeln("autointegrateNarrowbandPaletteBatch:close all windows, keep integrated images");
                  this.util.closeAllWindows(true, true);
            }
            if (this.global.cancel_processing) {
                  console.writeln("Processing cancelled!");
                  break;
            }
      }
      this.util.addProcessingStep("Narrowband palette batch completed");
}

findStarImageIdEx(starless_id, stars_id, use_re)
{
      if (stars_id != starless_id) {
            console.writeln("findStarImageId try " + stars_id)
            if (use_re) {
                  var w = this.util.findWindowRe(stars_id);
            } else {
                  var w = this.util.findWindow(stars_id);
            }
            if (w != null) {
                  return w.mainView.id;
            }
      }
      return null;
}

findStarImageId(starless_id, original_id)
{
      console.noteln("Try to find stars image for starless image " + starless_id)
      var stars_id = this.findStarImageIdEx(starless_id, starless_id.replace("starless", "stars"), false);
      if (stars_id != null) {
            return stars_id;
      }
      stars_id = this.findStarImageIdEx(starless_id, starless_id + "_stars", false);
      if (stars_id != null) {
            return stars_id;
      }
      stars_id = this.findStarImageIdEx(starless_id, starless_id.replace(/starless_edit[1-9]*/g, "stars"), false);
      if (stars_id != null) {
            return stars_id;
      }
      stars_id = this.findStarImageIdEx(starless_id, starless_id.replace(/starless_[1-9]*/g, "stars"), false);
      if (stars_id != null) {
            return stars_id;
      }
      stars_id = this.findStarImageIdEx(starless_id, starless_id.replace(/starless$/g, "stars"), false);
      if (stars_id != null) {
            return stars_id;
      }
      stars_id = this.findStarImageIdEx(starless_id, starless_id.replace(/starless.*/g, "stars"), false);
      if (stars_id != null) {
            return stars_id;
      }
      const find_id = starless_id.replace(/starless.*/g, "stars");
      if (find_id != starless_id) {
            const re = new RegExp(find_id + ".*");
            stars_id = this.findStarImageIdEx(starless_id, re, true);
            if (stars_id != null) {
                  return stars_id;
            }
      }
      return null;
}

combineStarsAndStarless(stars_combine, starless_id, stars_id)
{
      var createNewImage = true;

      /* Restore stars by combining starless image and stars. */
      this.util.addProcessingStepAndStatusInfo("Combining starless and star images using " + stars_combine);
      if (stars_id == null) {
            if (this.par.enhancements_combine_stars_image.val != "" && this.par.enhancements_combine_stars_image.val != 'Auto') {
                  stars_id = this.par.enhancements_combine_stars_image.val;           
            } else {
                  stars_id = this.findStarImageId(starless_id);
            }
      }
      if (stars_id == null) {
            this.util.throwFatalError("Could not find starless image for star image " + starless_id);
      }
      this.util.addProcessingStepAndStatusInfo("Combining " + starless_id + " and " + stars_id + " using " + stars_combine);
      switch (stars_combine) {
            case 'Screen':
                  var new_id = this.runPixelMathSingleMappingEx(
                                    starless_id, 
                                    "combine stars+starless",
                                    "combine(" + starless_id + ", " + stars_id + ", op_screen())",
                                    createNewImage);
                  break;
            case 'Lighten':
                  var new_id = this.runPixelMathSingleMappingEx(
                                    starless_id, 
                                    "combine stars+starless",
                                    "max(" + starless_id + ", " + stars_id + ")",
                                    createNewImage);
                  break;
            case 'Add':
            default:
                  var new_id = this.runPixelMathSingleMappingEx(
                                    starless_id, 
                                    "combine stars+starless",
                                    starless_id + " + " + stars_id,
                                    createNewImage);
                  break;
      }

      if (this.par.enhancements_combine_stars_reduce.val != 'None') {
            this.smallerStarsBillsPixelmathMethod(new_id, starless_id);
      }

      return new_id;
}

enhancementsAnnotateImage(enhancementsWin, apply_directly)
{
      this.addEnhancementsStep("Annotate image " + enhancementsWin.mainView.id);

      let annotationengine = new AnnotationEngine;
      annotationengine.Init(enhancementsWin);
      annotationengine.graphicsScale = this.par.enhancements_annotate_image_scale.val;
      if (apply_directly) {
            annotationengine.outputMode = Output_Overlay;
      }
      try {
            annotationengine.Render();
      } catch (ex) {
            this.util.throwFatalError( "*** Annotate image error: " + ex.toString() );
      }

      var annotatedImgWin = this.util.findWindow(enhancementsWin.mainView.id + "_Annotated");
      
      if (apply_directly) {
            enhancementsWin.mainView.beginProcess(UndoFlag.NoSwapFile);
            var bitmap = this.util.getWindowBitmap(annotatedImgWin);
            enhancementsWin.mainView.image.blend(bitmap);
            enhancementsWin.mainView.endProcess();
            this.util.closeOneWindow(annotatedImgWin);
            bitmap.clear();
      }

      return annotatedImgWin;
}

enhancementsAddSignature(enhancementsWin)
{
      this.addEnhancementsStep("Add signature " + this.par.enhancements_signature_path.val + " to image " + enhancementsWin.mainView.id);

      if (this.par.enhancements_signature_path.val == "") {
            this.util.throwFatalError("No signature path specified");
      }

      var signatureWin = this.util.openImageWindowFromFile(this.par.enhancements_signature_path.val, true);

      var enhancements_bitmap = this.util.getWindowBitmap(enhancementsWin);
      console.writeln("enhancementsAddSignature: enhancements_bitmap " + enhancements_bitmap.width + "x" + enhancements_bitmap.height);
      var enhancements_height = enhancementsWin.mainView.image.height;
      var signature_height = signatureWin.mainView.image.height;
      var signature_width = signatureWin.mainView.image.width;
      if (this.par.enhancements_signature_scale.val != 0) {
            var scale = (this.par.enhancements_signature_scale.val / 100) * enhancements_height / signature_height;
      } else {
            var scale = 1;
      }
      console.writeln("enhancementsAddSignature: scale " + scale);
      var signature_bitmap = this.util.getWindowBitmap(signatureWin).scaledTo(scale * signature_width, scale * signature_height);
      console.writeln("enhancementsAddSignature: scaled signature_bitmap " + signature_bitmap.width + "x" + signature_bitmap.height);

      var graphics = new Graphics(enhancements_bitmap);
      switch (this.par.enhancements_signature_position.val) {
            case 'Top left':
                  var signature_x = 0;
                  var signature_y = 0;
                  break;
            case 'Top middle':
                  var signature_x = (enhancements_bitmap.width - signature_bitmap.width) / 2;
                  var signature_y = 0;
                  break;
            case 'Top right':
                  var signature_x = enhancements_bitmap.width - signature_bitmap.width;
                  var signature_y = 0;
                  break;
            case 'Bottom left':
                  var signature_x = 0;
                  var signature_y = enhancements_height - signature_bitmap.height;
                  break;
            case 'Bottom middle':
                  var signature_x = (enhancements_bitmap.width - signature_bitmap.width) / 2;
                  var signature_y = enhancements_height - signature_bitmap.height;
                  break;
            case 'Bottom right':
                  var signature_x = enhancements_bitmap.width - signature_bitmap.width;
                  var signature_y = enhancements_height - signature_bitmap.height;
                  break;
            default:
                  this.util.throwFatalError("Invalid signature position " + this.par.enhancements_signature_position.val);
                  break;
      }
      graphics.drawBitmap(signature_x, signature_y, signature_bitmap);
      console.writeln("enhancementsAddSignature: drawBitmap " + signature_bitmap.width + "x" + signature_bitmap.height + " at 0, " + (enhancements_height - signature_bitmap.height));
      graphics.end();

      enhancementsWin.mainView.beginProcess(UndoFlag.NoSwapFile);
      enhancementsWin.mainView.image.blend(enhancements_bitmap);
      enhancementsWin.mainView.endProcess();

      enhancements_bitmap.clear();
      signature_bitmap.clear();
      this.util.closeOneWindow(signatureWin);

      return enhancementsWin;
}

enhancementsRotate(imgWin)
{
      this.addEnhancementsStep("Rotate image " + imgWin.mainView.id + " " + this.par.enhancements_rotate_degrees.val + " degrees");

      var P = new FastRotation;
      switch (this.par.enhancements_rotate_degrees.val) {
            case '90':
                  P.mode = FastRotation.Rotate90CW;
                  break;
            case '180':
                  P.mode = FastRotation.Rotate180;
                  break;
            case '-90':
                  P.mode = FastRotation.Rotate90CCW;
                  break;
            default:
                  this.util.throwFatalError("Invalid rotate degrees " + this.par.enhancements_rotate_degrees.val);
                  break;
      }
      P.noGUIMessages = true;

      imgWin.mainView.beginProcess(UndoFlag.NoSwapFile);

      P.executeOn(imgWin.mainView, false);

      imgWin.mainView.endProcess();
}

find_range_mask()
{
      this.setNewMaskWindow(this.util.findWindow('range_mask'));
      if (this.mask_win == null) {
            this.util.throwFatalError("Could not find range_mask");
      }
      return this.mask_win;
}

enhancementsOptionCompleted(param)
{
      console.writeln("enhancementsOptionCompleted " + param.name);
      if (this.par.enhancements_auto_reset.val && this.enhancementsApply) {
            if (param.reset != undefined) {
                  console.writeln("enhancementsOptionCompleted reset " + param.name);
                  param.val = false;
                  param.reset();
            }
      }
      this.util.addProcessingStepAndStatusInfo("Completed: " + this.global.enhancements_info[this.global.enhancements_info.length - 1]);
      this.checkCancel();
}

enhancementsProcessing(parent, id, apply_directly)
{
      console.noteln("Enhancements processing " + id + ", apply directly " + apply_directly + ", process_narrowband " + this.process_narrowband);

      this.global.enhancements_info = [];

      var enhancements_image_id = id;
      var enhancements_stars_image_id = null;
      var enhancements_starless_image_id = null;
      var need_L_mask = this.par.enhancements_darker_background.val || 
                        this.par.enhancements_darker_highlights.val ||
                        this.par.enhancements_ET.val || 
                        this.par.enhancements_HDRMLT.val || 
                        this.par.enhancements_LHE.val ||
                        (this.par.enhancements_noise_reduction.val && !(this.par.use_noisexterminator.val || this.par.use_graxpert_denoise.val || this.par.use_deepsnr.val)) ||
                        this.par.enhancements_ACDNR.val ||
                        (this.par.enhancements_sharpen.val && !this.par.use_blurxterminator.val && !this.par.use_graxpert_deconvolution.val) ||
                        this.par.enhancements_unsharpmask.val ||
                        (this.par.enhancements_highpass_sharpen.val && !this.par.enhancements_highpass_sharpen_combine_only.val) ||
                        this.par.enhancements_saturation.val ||
                        (this.par.enhancements_clarity.val && this.par.enhancements_clarity_mask.val);

      var enhancementsWin = ImageWindow.windowById(id);

      enhancements_stars_image_id = null;

      this.checkWinFilePathForOutputDir(enhancementsWin);
      this.util.ensureDir(this.global.outputRootDir);
      this.util.ensureDir(this.util.combinePath(this.global.outputRootDir, this.global.AutoOutputDir));
      this.util.ensureDir(this.util.combinePath(this.global.outputRootDir, this.global.AutoProcessedDir));

      if (!apply_directly) {
            enhancements_image_id = this.util.ensure_win_prefix(id + "_enh");
            enhancementsWin = this.util.copyWindow(enhancementsWin, enhancements_image_id);
      }

      if (this.par.enhancements_rotate.val) {
            this.enhancementsRotate(enhancementsWin);
            this.enhancementsOptionCompleted(this.par.enhancements_rotate);
      }

      if (this.par.enhancements_stretch.val) {
            enhancementsWin = this.enhancementsStretch(enhancementsWin);
            this.enhancementsOptionCompleted(this.par.enhancements_stretch);
      }
      if (this.par.enhancements_autostf.val) {
            enhancementsWin = this.enhancementsAutoSTF(enhancementsWin);
            this.enhancementsOptionCompleted(this.par.enhancements_autostf);
      }
      if (this.process_narrowband) {
            if (this.par.run_foraxx_mapping.val) {
                  this.enhancementsForaxx(enhancementsWin, this.par.foraxx_palette.val);
                  this.enhancementsOptionCompleted(this.par.run_foraxx_mapping);
            }
            if (this.par.run_enhancements_narrowband_mapping.val) {
                  this.enhancementsNarrowbandMappingRGB(enhancementsWin, this.par.enhancements_narrowband_mapping_source_palette.val, this.par.enhancements_narrowband_mapping_target_palette.val);
                  this.enhancementsOptionCompleted(this.par.run_enhancements_narrowband_mapping);
            }
            if (this.standalone_narrowband_mappings != null) {
                  this.runEnhancementsNarrowbandMappingChannels(enhancementsWin, this.standalone_narrowband_mappings.target_palette, this.standalone_narrowband_mappings.mappings);
                  this.standalone_narrowband_mappings = null;
            }
            if (this.par.run_orangeblue_colors.val) {
                  this.enhancementsOrangeBlueColors(enhancementsWin);
                  this.enhancementsOptionCompleted(this.par.run_orangeblue_colors);
            }
            if (this.par.run_orange_hue_shift.val) {
                  this.enhancementsNarrowbandOrangeHueShift(enhancementsWin.mainView);
                  this.enhancementsOptionCompleted(this.par.run_orange_hue_shift);
            }
            if (this.par.run_hue_shift.val) {
                  this.enhancementsSHOHueShift(enhancementsWin);
                  this.enhancementsOptionCompleted(this.par.run_hue_shift);
            }
            if (this.par.leave_some_green.val) {
                  this.addEnhancementsStep("Leave some green, amount " + this.par.leave_some_green_amount.val);
                  this.runSCNR(enhancementsWin, false);
                  this.enhancementsOptionCompleted(this.par.run_narrowband_SCNR);
                  this.enhancementsOptionCompleted(this.par.leave_some_green);
            } else if (this.par.run_narrowband_SCNR.val) {
                  this.addEnhancementsStep("Remove green cast");
                  this.runSCNR(enhancementsWin, false);
                  this.enhancementsOptionCompleted(this.par.run_narrowband_SCNR);
                  this.enhancementsOptionCompleted(this.par.leave_some_green);
            }
            if (this.par.remove_magenta_color.val) {
                  this.enhancementsRemoveMagentaColor(enhancementsWin);
                  this.enhancementsOptionCompleted(this.par.remove_magenta_color);
            }
            if (this.par.fix_narrowband_star_color.val) {
                  this.enhancementsFixNarrowbandStarColor(enhancementsWin);
                  this.enhancementsOptionCompleted(this.par.fix_narrowband_star_color);
            }
      }
      if (this.par.enhancements_selective_color.val) {
            this.enhancementsSelectiveColor(enhancementsWin);
            this.enhancementsOptionCompleted(this.par.enhancements_selective_color);
      }
      if (this.par.enhancements_remove_stars.val) {
            let res = this.enhancementsRemoveStars(parent, enhancementsWin, apply_directly);
            enhancementsWin = res.starless_win;
            enhancements_starless_image_id = enhancementsWin.mainView.id;
            enhancements_stars_image_id = res.stars_id;
            console.writeln("enhancements_starless_image_id " + enhancements_starless_image_id + ", enhancements_stars_image_id " + enhancements_stars_image_id);
            this.enhancementsOptionCompleted(this.par.enhancements_remove_stars);
      }
      if (this.par.enhancements_fix_star_cores.val) {
            this.addEnhancementsStep("Fix star cores");
            this.enhancementsFixStarCores(enhancementsWin);
            this.enhancementsOptionCompleted(this.par.enhancements_fix_star_cores);
      }
      if (this.par.enhancements_ha_mapping.val) {
            this.addEnhancementsStep("Ha mapping");
            this.enhancementsHaMapping(enhancementsWin);
            this.enhancementsOptionCompleted(this.par.enhancements_ha_mapping);
      }
      if (this.par.enhancements_smoothbackground.val) {
            this.enhancementsSmoothBackground(enhancementsWin, this.par.enhancements_smoothbackgroundval.val, this.par.enhancements_smoothbackgroundfactor.val);
            this.enhancementsOptionCompleted(this.par.enhancements_smoothbackground);
      }
      if (this.par.enhancements_banding_reduction.val) {
            this.enhancementsBandingReduction(enhancementsWin);
            this.enhancementsOptionCompleted(this.par.enhancements_banding_reduction);
      }
      if (this.par.enhancements_backgroundneutralization.val) {
            this.enhancementsBackgroundNeutralization(enhancementsWin);
            this.enhancementsOptionCompleted(this.par.enhancements_backgroundneutralization);
      }
      if (this.par.enhancements_GC.val) {
            let abe_id = this.enhancementsGradientCorrection(enhancementsWin);
            enhancementsWin = ImageWindow.windowById(abe_id);
            this.enhancementsOptionCompleted(this.par.enhancements_GC);
      }
      if (need_L_mask) {
            // Try find mask window
            // If we need to create a mask do it after we
            // have removed the stars
            if (this.par.enhancements_range_mask.val) {
                  this.setNewMaskWindow(this.find_range_mask());
            } else if (this.par.enhancements_force_new_mask.val) {
                  this.setNewMaskWindow(null);
            } else {
                  this.setNewMaskWindow(this.maskIsCompatible(enhancementsWin, this.mask_win));
                  if (this.mask_win == null) {
                        this.setNewMaskWindow(this.maskIsCompatible(enhancementsWin, this.util.findWindow(this.ppar.win_prefix +"AutoMask")));
                  }
            }
            if (this.mask_win == null) {
                  this.flowchart.flowchartMaskBegin("New mask:enhancements");
                  this.global.creating_mask = true;
                  this.setNewMaskWindow(this.newMaskWindow(enhancementsWin, this.ppar.win_prefix + "AutoMask", false));
                  this.flowchart.flowchartMaskEnd("New mask:enhancements");
                  this.global.creating_mask = false;
            }
            console.writeln("Use mask " + this.mask_win.mainView.id);
      }
      if (this.par.enhancements_shadowclipping.val) {
            this.enhancementsAdjustShadows(enhancementsWin, this.par.enhancements_shadowclippingperc.val);
            this.enhancementsOptionCompleted(this.par.enhancements_shadowclipping);
      }
      if (this.par.enhancements_darker_background.val) {
            this.enhancementsDarkerBackground(enhancementsWin, this.mask_win);
            this.enhancementsOptionCompleted(this.par.enhancements_darker_background);
      }
      if (this.par.enhancements_darker_highlights.val) {
            this.enhancementsDarkerHighlights(enhancementsWin, this.mask_win);
            this.enhancementsOptionCompleted(this.par.enhancements_darker_highlights);
      }
      if (this.par.enhancements_shadow_enhance.val) {
            this.enhancementsEnhanceShadows(enhancementsWin);
            this.enhancementsOptionCompleted(this.par.enhancements_shadow_enhance);
      }
      if (this.par.enhancements_highlight_enhance.val) {
            this.enhancementsEnhanceHighlights(enhancementsWin);
            this.enhancementsOptionCompleted(this.par.enhancements_highlight_enhance);
      }
      if (this.par.enhancements_gamma.val) {
            this.enhancementsGamma(enhancementsWin);
            this.enhancementsOptionCompleted(this.par.enhancements_gamma);
      }
      if (this.par.enhancements_normalize_channels.val) {
            this.enhancementsNormalizeImage(enhancementsWin);
            this.enhancementsOptionCompleted(this.par.enhancements_normalize_channels);
      }
      if (this.par.enhancements_adjust_channels.val) {
            this.enhancementsAdjustChannels(enhancementsWin);
            this.enhancementsOptionCompleted(this.par.enhancements_adjust_channels);
      }
      if (this.par.enhancements_ET.val) {
            this.enhancementsExponentialTransformation(enhancementsWin, this.mask_win);
            this.enhancementsOptionCompleted(this.par.enhancements_ET);
      }
      if (this.par.enhancements_HDRMLT.val) {
            this.enhancementsHDRMultiscaleTransform(enhancementsWin, this.mask_win);
            this.enhancementsOptionCompleted(this.par.enhancements_HDRMLT);
      }
      if (this.par.enhancements_LHE.val) {
            this.enhancementsLocalHistogramEqualization(enhancementsWin, this.mask_win);
            this.enhancementsOptionCompleted(this.par.enhancements_LHE);
      }
      if (this.par.enhancements_contrast.val) {
            this.addEnhancementsStep("Increase contrast, iterations " + this.par.enhancements_contrast_iterations.val);
            for (var i = 0; i < this.par.enhancements_contrast_iterations.val; i++) {
                  this.enhancementsContrast(enhancementsWin);
            }
            this.enhancementsOptionCompleted(this.par.enhancements_contrast);
      }
      if (this.par.enhancements_auto_contrast.val) {
            this.enhancementsAutoContrast(enhancementsWin, this.par.enhancements_auto_contrast_limit_low.val, this.par.enhancements_auto_contrast_limit_high.val, this.par.enhancements_auto_contrast_channels.val);
            this.enhancementsOptionCompleted(this.par.enhancements_auto_contrast);
      }
      if (this.par.enhancements_noise_reduction.val) {
            this.enhancementsNoiseReduction(enhancementsWin, this.mask_win);
            this.enhancementsOptionCompleted(this.par.enhancements_noise_reduction);
      }
      if (this.par.enhancements_ACDNR.val) {
            this.enhancementsACDNR(enhancementsWin, this.mask_win);
            this.enhancementsOptionCompleted(this.par.enhancements_ACDNR);
      }
      if (this.par.enhancements_color_noise.val) {
            this.enhancementsColorNoise(enhancementsWin);
            this.enhancementsOptionCompleted(this.par.enhancements_color_noise);
      }
      if (this.par.enhancements_unsharpmask.val) {
            this.enhancementsUnsharpMask(enhancementsWin, this.mask_win);
            this.enhancementsOptionCompleted(this.par.enhancements_unsharpmask);
      }
      if (this.par.enhancements_sharpen.val) {
            this.enhancementsSharpen(enhancementsWin, this.mask_win);
            this.enhancementsOptionCompleted(this.par.enhancements_sharpen);
      }
      if (this.par.enhancements_highpass_sharpen.val) {
            this.enhancementsHighPassSharpen(enhancementsWin, this.mask_win);
            this.enhancementsOptionCompleted(this.par.enhancements_highpass_sharpen);
      }
      if (this.par.enhancements_saturation.val) {
            this.enhancementsSaturation(enhancementsWin, this.mask_win);
            this.enhancementsOptionCompleted(this.par.enhancements_saturation);
      }
      if (this.par.enhancements_clarity.val) {
            this.enhancementsClarity(enhancementsWin, this.mask_win);
            this.enhancementsOptionCompleted(this.par.enhancements_clarity);
      }
      if (this.par.enhancements_smaller_stars.val) {
            if (this.par.enhancements_remove_stars.val) {
                  this.enhancementsSmallerStars(ImageWindow.windowById(enhancements_stars_image_id), true);
            } else {
                  this.enhancementsSmallerStars(enhancementsWin, false);
            }
            this.enhancementsOptionCompleted(this.par.enhancements_smaller_stars);
      }
      if (this.par.enhancements_star_noise_reduction.val) {
            this.addEnhancementsStep("Star noise reduction");
            if (this.par.enhancements_remove_stars.val) {
                  this.starReduceNoise(ImageWindow.windowById(enhancements_stars_image_id));
            } else {
                  this.starReduceNoise(enhancementsWin);
            }
            this.enhancementsOptionCompleted(this.par.enhancements_star_noise_reduction);
      }
      if (this.par.enhancements_combine_stars.val) {
            /* Restore stars by combining starless image and stars. */
            this.addEnhancementsStep("Combine stars and starless images using " + this.par.enhancements_combine_stars_mode.val + ", reduce stars by " + this.par.enhancements_combine_stars_reduce.val);
            var new_image_id = this.combineStarsAndStarless(
                                    this.par.enhancements_combine_stars_mode.val,
                                    enhancementsWin.mainView.id, // starless
                                    enhancements_stars_image_id);
            // Close original window that was created before stars were removed
            this.util.closeOneWindowById(enhancements_image_id);
            // restore original final image name
            var new_name = enhancements_image_id;
            console.writeln("Rename " + new_image_id + " as " + new_name);
            this.util.windowRename(new_image_id, new_name);
            enhancementsWin = ImageWindow.windowById(new_name);
            enhancementsWin.show();
            this.enhancementsOptionCompleted(this.par.enhancements_combine_stars);
      }
      if (this.par.enhancements_color_calibration.val) {
            this.addEnhancementsStep("Color calibration");
            this.runColorCalibrationProcess(enhancementsWin);
            this.enhancementsOptionCompleted(this.par.enhancements_color_calibration);
      }
      if (this.par.enhancements_solve_image.val) {
            this.addEnhancementsStep("Image solver");
            this.imageSolver.runImageSolver(enhancementsWin.mainView.id);
            this.enhancementsOptionCompleted(this.par.enhancements_solve_image);
      }
      if (this.par.enhancements_annotate_image.val) {
            this.addEnhancementsStep("Annotate image");
            let autoIntegrateAnnotateImage = new AutoIntegrateAnnotateImage(this.util, this);
            let annotatedImgWin = autoIntegrateAnnotateImage.annotateImage(enhancementsWin, apply_directly);
            if (!apply_directly) {
                  // There is a new window with the annotated image
                  enhancementsWin = annotatedImgWin;
            }
            this.enhancementsOptionCompleted(this.par.enhancements_annotate_image);
      }
      if (this.par.enhancements_signature.val) {
            this.addEnhancementsStep("Add signature");
            this.enhancementsAddSignature(enhancementsWin);
            this.enhancementsOptionCompleted(this.par.enhancements_signature);
      }
      enhancements_image_id = enhancementsWin.mainView.id;
      if (apply_directly) {
            this.final_win = ImageWindow.windowById(enhancementsWin.mainView.id);
            this.guiUpdatePreviewWin(this.final_win);
            this.saveEnhancementsHistoryToImage(this.final_win);
            this.setFinalImageKeyword(this.final_win);
      } else {
            this.final_win = ImageWindow.windowById(enhancements_image_id);
            this.guiUpdatePreviewWin(this.final_win);
            this.saveEnhancementsHistoryToImage(this.final_win);
            this.setFinalImageKeyword(this.final_win);
            this.saveProcessedWindow(enhancements_image_id); /* Enhancements window */
            if (this.par.enhancements_remove_stars.val) {
                  this.saveProcessedWindow(enhancements_starless_image_id);      /* Enhancements starless window */
                  this.saveProcessedWindow(enhancements_stars_image_id);         /* Enhancements stars window */
            }
      }
      console.writeln("Enhancements processing done " + enhancements_image_id);

      return [ enhancements_image_id, enhancements_starless_image_id, enhancements_stars_image_id ];

}

/* Copy gradient corrected channel images to map images.
 */
copyGCtoMapImage(win, base_id)
{
      var map_id = this.ppar.win_prefix + base_id + "_map";
      console.writeln("copyGCtoMapImage: " + win.mainView.id + " to " + map_id);
      this.util.copyWindow(win, map_id);
      this.global.temporary_windows[this.global.temporary_windows.length] = map_id;
      return map_id;
}

/* Map gradient corrected channel images to start images.
 */
mapGCchannels()
{
      if (this.L_GC_start_win != null) {
            this.L_id = this.copyGCtoMapImage(this.L_GC_start_win, "Integration_L");
      }
      if (this.R_GC_start_win != null) {
            this.R_id = this.copyGCtoMapImage(this.R_GC_start_win, "Integration_R");
      }
      if (this.G_GC_start_win != null) {
            this.G_id = this.copyGCtoMapImage(this.G_GC_start_win, "Integration_G");
      }
      if (this.B_GC_start_win != null) {
            this.B_id = this.copyGCtoMapImage(this.B_GC_start_win, "Integration_B");
      }
      if (this.H_GC_start_win != null) {
            this.H_id = this.copyGCtoMapImage(this.H_GC_start_win, "Integration_H");
      }
      if (this.S_GC_start_win != null) {
            this.S_id = this.copyGCtoMapImage(this.S_GC_start_win, "Integration_S");
      }
      if (this.O_GC_start_win != null) {
            this.O_id = this.copyGCtoMapImage(this.O_GC_start_win, "Integration_O");
      }
      if (this.RGB_GC_start_win != null) {
            this.RGB_id = this.copyGCtoMapImage(this.RGB_GC_start_win, "Integration_RGB");
      }
}

// Support functions of automatic crop
make_full_image_list()
{
      let All_images = this.init_images();
      if (this.L_images.images.length > 0) {
            All_images.images = All_images.images.concat(this.L_images.images)
      }
      if (this.R_images.images.length > 0) {
            All_images.images = All_images.images.concat(this.R_images.images);
      }
      if (this.G_images.images.length > 0) {
            All_images.images = All_images.images.concat(this.G_images.images);
      }
      if (this.B_images.images.length > 0) {
            All_images.images = All_images.images.concat(this.B_images.images);
      }
      if (this.H_images.images.length > 0) {
            All_images.images = All_images.images.concat(this.H_images.images);
      }
      if (this.S_images.images.length > 0) {
            All_images.images = All_images.images.concat(this.S_images.images);
      }
      if (this.O_images.images.length > 0) {
            All_images.images = All_images.images.concat(this.O_images.images);
      }
      if (this.C_images.images.length > 0) {
            All_images.images = All_images.images.concat(this.C_images.images);
      }
      return All_images;
}

pointIsValidCrop(p)
{
      if (this.par.crop_use_rejection_low.val) {
            return p <= this.par.crop_rejection_low_limit.val;
      } else {
            return p > 0.0;
      }
}

// Find borders starting from a mid point and going up/down
find_up_down(image,col)
{
      let row_mid = Math.floor(image.height / 2);
      let row_up = 0;
      let cnt = 0;
      for (let row=row_mid; row>=0; row--) {
            let p = image.sample(col, row);
            if (!this.pointIsValidCrop(p)) {
                  cnt++;
                  console.writeln("find up: non-valid pixel at col ", col, " row ", row, " cnt ", cnt, " p ", p);
            } else {
                  cnt = 0;
            }
            if (cnt > this.par.crop_tolerance.val) {
                  row_up = row+1;
                  console.writeln("find up: over tolerance value ", this.par.crop_tolerance.val, " crop edge at row ", row_up, " (", row_up, " pixels from top)");
                  break;
            }
      }
      let row_down = image.height-1;
      cnt = 0;
      for (let row=row_mid; row<image.height; row++) {
            let p = image.sample(col, row);
            if (!this.pointIsValidCrop(p)) {
                  cnt++;
                  console.writeln("find down: non-valid pixel at col ", col, " row ", row, " cnt ", cnt, " p ", p);
            } else {
                  cnt = 0;
            }
            if (cnt > this.par.crop_tolerance.val) {
                  row_down = row-1;
                  console.writeln("find down: over tolerance value ", this.par.crop_tolerance.val, " crop edge at row ", row_down, " (", image.height-1-row_down, " pixels from bottom)");
                  break;
            }
      }
      if (this.par.debug.val) console.writeln("DEBUG find_up_down: at col ", col," extent up=", row_up, ", down=", row_down);
      return [row_up, row_down];
}

// Find borders starting from a mid point and going left/right
find_left_right(image,row)
{
      let col_mid = Math.floor(image.width / 2);
      let col_left = 0;
      let cnt = 0;
      for (let col=col_mid; col>=0; col--) {
            let p = image.sample(col, row);
            if (!this.pointIsValidCrop(p)) {
                  cnt++;
                  console.writeln("find left: non-valid pixel at col ", col, " row ", row, " cnt ", cnt, " p ", p);
            } else {
                  cnt = 0;
            }
            if (cnt > this.par.crop_tolerance.val) {
                  console.writeln("find left: over tolerance value ", this.par.crop_tolerance.val, " crop edge at col ", col_left, " (", col_left, " pixels from left)");
                  col_left = col+1;
                  break;
            }
      }
      let col_right = image.width-1;
      for (let col=col_mid; col<image.width; col++) {
            let p= image.sample(col, row);
            if (!this.pointIsValidCrop(p)) {
                  cnt++;
                  console.writeln("find right: non-valid pixel at col ", col, " row ", row, " cnt ", cnt);
            } else {
                  cnt = 0;
            }
            if (cnt > this.par.crop_tolerance.val) {
                  col_right = col-1;
                  console.writeln("find right: over tolerance value ", this.par.crop_tolerance.val, " crop edge at col ", col_right, " (", image.width-1-col_right, " pixels from right)");
                  break;
            }
      }
      if (this.par.debug.val) console.writeln("DEBUG find_left_right: at row ", row," extent left=", col_left, ", right=", col_right);
      return [col_left, col_right];
}

findMaximalBoundingBox(lowClipImage)
{
      let col_mid = Math.floor(lowClipImage.width / 2);
      let row_mid = Math.floor(lowClipImage.height / 2);
      if (this.par.debug.val) {
            console.writeln("DEBUG findMaximalBoundingBox col_mid=",col_mid,",row_mid=",row_mid);
      }

      // Check that the starting point is valid
      let p = lowClipImage.sample(col_mid, row_mid);
      if (!this.pointIsValidCrop(p)) {
            col_mid = Math.floor(lowClipImage.width / 2) + 10;
            row_mid = Math.floor(lowClipImage.height / 2) + 10;
            p = lowClipImage.sample(col_mid, row_mid);
      }
      if (!this.pointIsValidCrop(p)) {
            col_mid = Math.floor(lowClipImage.width / 2) - 10;
            row_mid = Math.floor(lowClipImage.height / 2) - 10;
            p = lowClipImage.sample(col_mid, row_mid);
      }
      if (p > this.par.crop_rejection_low_limit.val) {
            // Could also accept a % of rejection
            return { box: null, crop_errors: "Middle pixel not valid in integration of lowest value for Crop, possibly not enough overlap" };
      }

      // Find extent of black area at mid points (the black points nearest to the border)
      var [top,bottom] = this.find_up_down(lowClipImage,col_mid);
      var [left,right] = this.find_left_right(lowClipImage,row_mid);

      if (this.par.debug.val) {
            console.writeln("DEBUG findMaximalBoundingBox top=",top,",bottom=",bottom,",left=",left,",right=",right);
      }

      return { box: [top,bottom,left,right], crop_errors: '' };
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
 * (think of an image inside a circle of valid points), the algorithm assumes that the valid area is 
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
findBounding_box(lowClipImageWindow)
{
      let image = lowClipImageWindow.mainView.image;
      let crop_success = true;
      let crop_errors = "";

      console.noteln("Finding valid bounding box for image ", lowClipImageWindow.mainView.id, 
            " (", image.width, "x" , image.height + ")");

      let res = this.findMaximalBoundingBox(image);
      let box = res.box;
      if (box == null) {
            return { success: false, box: [0, image.width-1, 0, image.height-1], crop_errors: res.crop_errors };
      }
      let [top_row,bottom_row,left_col,right_col] = box;

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

      left_top_valid = this.pointIsValidCrop(image.sample(left_top));
      right_top_valid =  this.pointIsValidCrop(image.sample(right_top));
      left_bottom_valid =  this.pointIsValidCrop(image.sample(left_bottom));
      right_bottom_valid =  this.pointIsValidCrop(image.sample(right_bottom));

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
                                    left_top_valid = this.pointIsValidCrop(image.sample(left_top)); 
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
                                    right_bottom_valid = this.pointIsValidCrop(image.sample(right_bottom)); 
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
                                    left_bottom_valid = this.pointIsValidCrop(image.sample(left_bottom)); 
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
                                    right_top_valid = this.pointIsValidCrop(image.sample(right_top)); 
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

      // Show the valid points for this.par.debug.val - NOTE: The borders may be smaller as once a point is found as valid, it is not
      // recalculated.
      if (this.par.debug.val) console.writeln("DEBUG findBounding_box - valid points LT=",left_top,",RT=",right_top,",LB=",left_bottom,",RB=",right_bottom)

      // Check that the while line at the border is valid, in case the border is wiggly
      let [original_left_col, original_right_col, original_top_row, original_bottom_row] = [left_col, right_col, top_row, bottom_row];

      let number_cycle = 0;
      let any_border_inwards = false;
      for (;;) {
            // Ensure that we terminate in case of unreasonable borders
            number_cycle += 1;
            if (number_cycle>100) 
            {
                  crop_errors = "Crop failed, borders too wiggly for crop after " + number_cycle + " cycles."; 
                  crop_success = false;
                  break;
            }

            let all_valid = true;
            let non_valid_count_limit = 1;

            // Check if left most column is entirely valid
            let left_col_valid = true;
            let non_valid_count = 0;
            for (let i=top_row; i<=bottom_row; i++)
            {
                  left_col_valid = left_col_valid && this.pointIsValidCrop(image.sample(left_col,i));
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
                  right_col_valid = right_col_valid && this.pointIsValidCrop(image.sample(right_col,i));
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
                  top_row_valid = top_row_valid && this.pointIsValidCrop(image.sample(i,top_row));
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
                  bottom_row_valid = bottom_row_valid && this.pointIsValidCrop(image.sample(i,bottom_row));
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
      return { success: crop_success, box: [left_col, right_col, top_row, bottom_row], crop_errors: crop_errors };
}

// We negate the crop amount here to match the requirement of the process Crop
createCrop(left,top,right,bottom)
{
      var P = new Crop;
      P.leftMargin = -left;
      P.topMargin = -top;
      P.rightMargin = -right;
      P.bottomMargin = -bottom;
      P.mode = Crop.AbsolutePixels;
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
cropImageIf(id, show_in_flowchart = true)
{
      if (this.par.debug.val) console.writeln("cropImageIf ", id);
      var window = this.util.findWindow(id);
      var truncate_amount = this.crop_truncate_amount;
      if (window == null) { 
            console.writeln("cropImageIf, window == null");
            return false;
      }
      if (truncate_amount == null) {
            console.writeln("cropImageIf, truncate_amount == null");
            return false;
      }
      if (this.util.findKeywordName(window, "AutoCrop")) {
            console.writeln("Image ", window.mainView.id, " already cropped, skipping crop");
            return true;
      }
      if (show_in_flowchart) {
            var node = this.flowchart.flowchartOperation("Crop");
      } else {
            var node = null;
      }
      if (this.global.get_flowchart_data) {
            console.writeln("cropImageIf, flowchart data, mark as done");
            this.util.setFITSKeyword(window, "AutoCrop", "true", "Image cropped by AutoIntegrate");
            return true;
      }

      let [left_truncate,top_truncate,right_truncate,bottom_truncate] = truncate_amount;
      console.writeln("Truncate image ", window.mainView.id, " by: top ", top_truncate, ", bottom, ", 
            bottom_truncate, ", left ", left_truncate, ", right ",right_truncate);
      
      let crop = this.createCrop(left_truncate,top_truncate,right_truncate,bottom_truncate);

      window.mainView.beginProcess(UndoFlag.NoSwapFile);  
      crop.executeOn(window.mainView, false);  
      window.mainView.endProcess();

      // Add keyword to indicate that the image has been cropped
      this.util.setFITSKeyword(window, "AutoCrop", "true", "Image cropped by AutoIntegrate");

      this.printAndSaveProcessValues(crop, this.findChannelFromNameIf(window.mainView.id), window.mainView.id);
      this.engine_end_process(node, window, "Crop");

      if (this.par.save_cropped_images.val) {
            var win_id = window.mainView.id;
            var crop_id = this.util.replacePostfixOrAppend(win_id, ["_map"], "_crop");
            console.writeln("Save cropped image " + win_id + " as " + crop_id);
            this.util.copyWindowEx(window, crop_id, true);
            this.save_id_list.push([win_id, crop_id]);
      }

      return true;
}

calculate_crop_amount(lowClipImageName, integratedImageName, crop_auto_continue)
{
      let crop_errors = "";
      let lowClipImageWindow = this.util.findWindowOrFile(lowClipImageName);
      if (lowClipImageWindow == null) {
            this.util.throwFatalError("Crop failed to find image " + lowClipImageName);
      }
      let integratedImageWindow = this.util.findWindow(integratedImageName);
      if (integratedImageWindow == null) {
            this.util.throwFatalError("Crop failed to find image " + integratedImageWindow);
      }

      if (crop_auto_continue && !this.par.cropinfo_only.val) {
            let preview = lowClipImageWindow.previewById("crop");
            if (preview.isNull) {
                  this.util.throwFatalError("Error: crop preview not found from " + lowClipImageWindow.mainView.id);
            }
            var rect = lowClipImageWindow.previewRect(preview);
            var success = true;
            var bounding_box = [ rect.x0, rect.x1, rect.y0, rect.y1 ];
            console.writeln("Using crop preview bounding box " + JSON.stringify(bounding_box));
      } else {
            var res = this.findBounding_box(lowClipImageWindow);
            var success = res.success;
            var bounding_box = res.box;
            crop_errors = res.crop_errors;
            console.writeln("Calculated crop preview bounding box " + JSON.stringify(bounding_box));
      }
      let [left_col, right_col, top_row, bottom_row] = bounding_box;
      
      if (!crop_auto_continue) {
            // Preview for information to the user only
            // with auto continue we assume that the preview is already there
            // We use integrated image for crop info as it better shows the actual cropping in the image
            console.writeln("Creating crop preview");
            integratedImageWindow.createPreview( left_col, top_row, right_col, bottom_row, "crop" );
            if (this.par.cropinfo_only.val && lowClipImageName != integratedImageName) {
                  // For information  purposes, add preview also to a separate rejection_low image.
                  lowClipImageWindow.createPreview( left_col, top_row, right_col, bottom_row, "crop" );
            }
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
      var txt = "Truncate percentages: width by " + x_truncate_percent.toFixed(1) +"%, height by " + y_truncate_percent.toFixed(1) + 
                "%, area by " + area_truncate_percent.toFixed(1) + "%";
      if (x_truncate_percent > this.par.crop_check_limit.val || y_truncate_percent > this.par.crop_check_limit.val || area_truncate_percent > this.par.crop_check_limit.val) {
            if (crop_errors != "") {
                  crop_errors = crop_errors + "\n";
            }      
            crop_errors = crop_errors + "Warning: Cropped more than " + this.par.crop_check_limit.val + "% of the image, please check the crop preview. " + this.crop_suggestion_txt;
            crop_errors = crop_errors + "\n" + "Warning: " + txt;
      } else {
            console.noteln(txt);
      }

      return { success: success,  truncate_amount: truncate_amount, crop_errors: crop_errors };
}

// Find the crop area and crop all channel images
createCropInformationEx()
{
      // Make integration low
      let all_images = this.make_full_image_list();
      console.noteln("Finding common area for ",all_images.images.length, " images (all channels) ")
      let images = all_images.images;
      if (images == null || images.length == 0) {
            return;
      }
      if (this.global.get_flowchart_data) {
            this.crop_truncate_amount = "Yes";
            this.crop_lowClipImageName = this.ppar.win_prefix + "LowRejectionMap_ALL";
            return;
      }

      var res = this.runImageIntegrationForCrop(images);

      if (this.par.crop_use_rejection_low.val && !this.global.get_flowchart_data) {
            /* Use low rejection map to calculate crop. 
             */
            let integratedImageName = res.integrated_image_id;
            let integratedImageWindow = this.util.findWindow(integratedImageName);
            if (integratedImageWindow == null) {
                  this.util.throwFatalError("Crop failed to find image " + integratedImageName);
            }
            let lowClipImageName = res.rejection_map_id;
            let lowClipImageWindow = this.util.findWindow(lowClipImageName);
            if (lowClipImageWindow == null) {
                  this.util.throwFatalError("Crop failed to find image " + lowClipImageName);
            }
            var res = this.calculate_crop_amount(lowClipImageName, integratedImageName, false);
            if (res.success) {
                  this.util.addWarningStatus(res.crop_errors);
            } else {      
                  this.util.addCriticalStatus(res.crop_errors);
                  this.util.addCriticalStatus("No cropping done. "+ this.crop_suggestion_txt); 
            }

            if (!this.par.cropinfo_only.val) {
                  // Close low rejection map window
                  this.util.closeOneWindow(lowClipImageWindow);
            }

            this.crop_truncate_amount = res.truncate_amount;
            this.crop_lowClipImageName = integratedImageName; // crop info is saved to integrated image

      } else {
            /* Use integrated image to calculate crop. 
             */
            let lowClipImageName = res.integrated_image_id;
            let lowClipImageWindow = this.util.findWindow(lowClipImageName);
            if (lowClipImageWindow == null) {
                  this.util.throwFatalError("Crop failed to find image " + lowClipImageName);
            }

            // Make a copy of the integrated image
            let lowClipImageWindowCopy = this.util.copyWindowEx(lowClipImageWindow, this.util.ensure_win_prefix(lowClipImageName + "_tmp"), true);

            var res = this.calculate_crop_amount(lowClipImageWindowCopy.mainView.id, lowClipImageWindowCopy.mainView.id, false);
            if (!res.success) {
                  // Try with noise reduction
                  console.noteln("Crop failed, trying with noise reduction for cropped image");
                  // Close copy image since we have added crop preview into image
                  this.util.closeOneWindow(lowClipImageWindowCopy);
                  // Make a new copy
                  lowClipImageWindowCopy = this.util.copyWindowEx(lowClipImageWindow, this.util.ensure_win_prefix(lowClipImageName + "_tmp2"), true);
                  // Run noise reduction
                  this.runMultiscaleLinearTransformReduceNoise(lowClipImageWindowCopy, null, 4);
                  // Crop again
                  res = this.calculate_crop_amount(lowClipImageWindowCopy.mainView.id, lowClipImageWindowCopy.mainView.id, false);
                  if (res.success) {
                        this.util.addWarningStatus("Crop succeeded after noise reduction but please check the crop amount in file " + lowClipImageName + ". If needed, adjust the crop manually and rerun the script using AutoContinue.");
                  }
            }
            if (res.success) {
                  this.util.addWarningStatus(res.crop_errors);
            } else {      
                  this.util.addCriticalStatus(res.crop_errors);
                  this.util.addCriticalStatus("No cropping done. " + this.crop_suggestion_txt); 
            }

            // Close original window
            this.util.closeOneWindow(lowClipImageWindow);

            // Rename copy to original name
            lowClipImageWindowCopy.mainView.id = lowClipImageName;

            this.crop_truncate_amount = res.truncate_amount;
            this.crop_lowClipImageName = lowClipImageName;       // save the name for saving to disk
      }
      // Autostretch for the convenience of the user
      this.applyAutoSTF(
            this.util.findWindow(this.crop_lowClipImageName).mainView,
            this.global.DEFAULT_AUTOSTRETCH_SCLIP,
            this.global.DEFAULT_AUTOSTRETCH_TBGND,
            false,
            false);
      
      this.save_id_list.push([this.crop_lowClipImageName, this.crop_lowClipImageName]);  /* LowRejectionMap_ALL */
      this.crop_lowClipImage_changed = false;

      console.noteln("Generated data for cropping");
}

createCropInformation()
{
      this.util.addProcessingStepAndStatusInfo("Cropping all channel images to fully integrated area");

      this.createCropInformationEx();

      /* Luminance image may have been copied earlier in this.createChannelImages()
       * so we try to crop it here.
       */
      if (this.luminance_id != null) {
            this.flowchart.flowchartParentBegin("L");
            this.flowchart.flowchartChildBegin("L");
            if (this.cropImageIf(this.luminance_id)) {
                  if (0) {
                        // Do not save cropped luminance image, it can be saved with Save cropped images option.
                        // For stretching, it is better to use _processed images.
                        let L_win_crop = this.util.copyWindow(this.util.findWindow(this.luminance_id), this.util.ensure_win_prefix("Integration_L_crop"));
                        this.luminance_crop_id = L_win_crop.mainView.id;
                  }
            }
            this.flowchart.flowchartChildEnd("L");
            this.flowchart.flowchartParentEnd("L");
      }
}

findCropInformationAutoContinue()
{
      this.util.addProcessingStepAndStatusInfo("Cropping all channel images to fully integrated area in AutoContinue");
      let lowClipImageName = this.autocontinue_prefix + "LowRejectionMap_ALL";
      this.crop_lowClipImageName = lowClipImageName;       // save the name for minimizing
      var res = this.calculate_crop_amount(lowClipImageName, lowClipImageName, true);
      this.crop_truncate_amount = res.truncate_amount;
      if (res.success) {
            this.util.addWarningStatus(res.crop_errors);
      } else {
            this.util.addCriticalStatus(res.crop_errors);
      }
}

createCropInformationAutoContinue()
{
      if (this.preprocessed_images != this.global.start_images.RGB
          && this.preprocessed_images != this.global.start_images.L_R_G_B)
      {
            console.writeln("Crop ignored in AutoContinue, only integrated channel images can be cropped.") ;
            return;
      }
      this.findCropInformationAutoContinue();
}
 
/***************************************************************************
 * 
 *    enhancementsProcessingEngine
 * 
 */
enhancementsProcessingEngine(parent, enhancements_target_image, enhancements_narrowband)
{
       this.get_local_copies_of_parameters();

       this.engineInit();
       this.flowchart.flowchartReset();

       this.global.is_processing = this.global.processing_state.enhancements_processing;
       this.global.cancel_processing = false;
       this.medianFWHM = null;

       this.process_narrowband = enhancements_narrowband;

       this.setNewMaskWindow(null);
       this.star_mask_win_id = null;
       this.star_fix_mask_win = null;
       this.star_fix_mask_win_id = null;
       this.global.processing_steps = "";
       this.global.processing_warnings = "";

       this.iconized_image_ids = [];
       this.save_id_list = [];

       this.global.test_image_ids = [];

       console.noteln("");
       console.noteln("Start enhancements processing...");
       this.guiUpdatePreviewId(enhancements_target_image);
 
       var enhancements_wins = this.enhancementsProcessing(parent, enhancements_target_image, true);
 
       console.noteln("enhancementsProcessingEngine " + enhancements_target_image + " completed.");
 
       this.util.windowIconizeAndKeywordif(this.mask_win_id, false, true);             /* AutoMask window */
       this.util.windowIconizeAndKeywordif(this.star_mask_win_id, false, true);        /* AutoStarMask or star_mask window */
       this.util.windowIconizeAndKeywordif(this.star_fix_mask_win_id, false, true);    /* AutoStarFixMask or star_fix_mask window */

       for (var i = 0; i < enhancements_wins.length; i++) {
            this.util.windowIconizeFindPosition(enhancements_wins[i]);
       }

       if (this.global.processing_steps != "") {
            console.noteln("Processing steps:");
            console.writeln(this.global.processing_steps);
            console.writeln("");
       }
       if (this.global.processing_warnings.length > 0) {
            console.warningln("Processing warnings:");
            console.warningln(this.global.processing_warnings);
            console.writeln("");
       }
       if (this.global.processing_errors.length > 0) {
            console.criticalln("Processing errors:");
            console.criticalln(this.global.processing_errors);
            console.writeln("");
            this.global.processing_errors = "";
       }
       this.util.closeTempWindows();
       console.noteln("Enhancements processing completed.");

       this.global.is_processing = this.global.processing_state.none;
 
       this.util.runGarbageCollection();
}

engineInit()
{
      if (this.global.debug) console.writeln("engineInit");
      this.util.init_pixinsight_version();
      if (this.global.AutoOutputDir == null) {
            this.util.setDefaultDirs();
      }
      this.initSPCCvalues();
      this.global.creating_mask = false;
      this.global.skip_process_value_save = false;
}

// Check possible conflicting settings before stating the processing
// Nete that checkOptions does similar things a bit later
check_engine_processing()
{
      if (this.global.debug) console.writeln("check_engine_processing");
      if (this.global.enhancements_target_image_id != "Auto" && this.global.enhancements_target_image_id != null) {
            console.criticalln("Enhancements target image can be used only with Apply button!");
            return false;
      }
      if (this.util.findWindowStartsWith("FastIntegrationMaster") != null) {
            console.criticalln("FastIntegrationMaster window found, please close it before running AutoIntegrate.");
            return false;
      }
      return true;
}

save_images_in_save_id_list()
{
      for (var i = 0; i < this.save_id_list.length; i++) {
            if (this.save_id_list[i][0] != this.save_id_list[i][1]) {
                  // We have made a copy of the image to this.save_id_list[i][1]
                  this.saveProcessedWindow(this.save_id_list[i][1]);
                  this.util.closeOneWindowById(this.save_id_list[i][1]);
            } else {
                  this.saveProcessedWindow(this.save_id_list[i][0], this.save_id_list[i][1]);
            }
       }
       this.save_id_list = [];
}

get_local_copies_of_parameters()
{
      this.local_RGB_stars = this.par.create_RGB_stars.val;
      this.local_narrowband_mapping = this.par.narrowband_mapping.val;
      this.local_L_mapping = this.par.custom_L_mapping.val;
      this.local_R_mapping = this.par.custom_R_mapping.val;
      this.local_G_mapping = this.par.custom_G_mapping.val;
      this.local_B_mapping = this.par.custom_B_mapping.val;
      this.local_image_stretching = this.par.image_stretching.val;
      this.local_debayer_pattern = this.par.debayer_pattern.val;
      this.local_RGBHa_prepare_method = this.par.RGBHa_prepare_method.val;
      this.local_RGBHa_combine_method = this.par.RGBHa_combine_method.val;
}

// V8 limitations for now
check_available_processes()
{
      if (this.global.debug) console.writeln("check_engine_processing");
      let P;
      if (this.par.use_starxterminator.val) {
            try {
                  P = new StarXTerminator;
            } catch (e) {
                  this.util.addWarningStatus("StarXTerminator not available");
                  this.par.use_starxterminator.val = false;
            }
      }
      if (this.par.use_noisexterminator.val) {
            try {
                  P = new NoiseXTerminator;
            } catch (e) {
                  this.util.addWarningStatus("NoiseXTerminator not available");
                  this.par.use_noisexterminator.val = false;
            }
      }
      if (this.par.use_blurxterminator.val) {
            try {
                  P = new BlurXTerminator;
            } catch (e) {
                  this.util.addWarningStatus("BlurXTerminator not available");
                  this.par.use_blurxterminator.val = false;
            }
      }
      if (this.par.use_starnet2.val) {
            try {
                  P = new StarNet2;
            } catch (e) {
                  this.util.addWarningStatus("StarNet2 not available");
                  this.par.use_starnet2.val = false;
            }
      }
      if (this.par.use_deepsnr.val) {
            try {
                  P = new DeepSNR;
            } catch (e) {
                  this.util.addWarningStatus("DeepSNR not available");
                  this.par.use_deepsnr.val = false;
            }
      }
}

/***************************************************************************
 * 
 *    autointegrateProcessingEngine
 * 
 * Main processing for AutoIntegrate.
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
 *          this.global.lightFileNames
 *                Array if light file names
 * 
 *          this.global.biasFileNames
 *                Optional array if bias file names for calibrate.
 * 
 *          this.global.darkFileNames
 *                Optional array if dark file names for calibrate.
 * 
 *          this.global.flatFileNames
 *                Optional array if flat file names for calibrate.
 * 
 *          this.global.flatdarkFileNames
 *                Optional array if flat dark file names for calibrate.
 * 
 *          this.global.par.*
 *                Processing parameters.
 * 
 * Return value:
 * 
 *          null if processing was cancelled or failed.
 *          final image id if processing was successful.
 * 
 */
autointegrateProcessingEngine(parent, auto_continue, autocontinue_narrowband, txt)
{
       console.writeln("autointegrateProcessingEngine");
       console.writeln("gllobal.outputRootDir: " + this.global.outputRootDir);
       
       this.get_local_copies_of_parameters();

       if (!this.check_engine_processing()) {
            return null;
       }

       if (!this.global.get_flowchart_data) {
            this.util.beginLog();
       }
       console.show();

      console.writeln("Start AutoIntegrate processing...");
      this.util.printMemoryStatus("Start processing");

       this.stepno = 1;
       this.global.subframeselector_call_count = 0;

       if (this.par.fast_mode.val) {
            if (this.ppar.win_prefix == "")  {
                  this.ppar.win_prefix = "fast_";
            }
       }

      // Save file list locally. In case of this.par.fast_mode we make a new copy of the list
      this.lightFileNames = this.filterFilesForFastMode(this.global.lightFileNames, auto_continue, this.global.pages.LIGHTS);
      this.darkFileNames = this.filterFilesForFastMode(this.global.darkFileNames, auto_continue, this.global.pages.DARKS);
      this.biasFileNames = this.filterFilesForFastMode(this.global.biasFileNames, auto_continue, this.global.pages.BIAS);
      this.flatdarkFileNames = this.filterFilesForFastMode(this.global.flatdarkFileNames, auto_continue, this.global.pages.FLAT_DARKS);
      this.flatFileNames = this.filterFilesForFastMode(this.global.flatFileNames, auto_continue, this.global.pages.FLATS);

      this.flowchart.flowchartInit("AutoIntegrate");

       this.util.runGarbageCollection();
 
       this.global.is_processing = this.global.processing_state.processing;
       this.global.cancel_processing = false;
       this.global.flowchart_image = null;
 
       var LRGB_processed_HT_id = null;
       var RGB_processed_HT_id = null;
       var LRGB_Combined = null;
 
       this.util.executed_processes = [];
       this.is_rgb_files = false;
       this.is_narrowband_files = false;
       this.is_color_files = false;
       this.luminance_id = null;
       this.red_id = null;
       this.green_id = null;
       this.blue_id = null;
       this.L_id = null;
       this.R_id = null;
       this.G_id = null;
       this.B_id = null;
       this.H_id = null;
       this.S_id = null;
       this.O_id = null;
       this.astrobin_info = null;
       this.iconized_debug_image_ids = [];
       this.iconized_image_ids = [];
       this.RGB_color_id = null;
       this.RGB_win_id = null;
       this.script_start_time = Date.now();
       this.setNewMaskWindow(null);
       this.star_mask_win = null;
       this.star_fix_mask_win = null;
       this.ssweight_set = false;
       this.crop_truncate_amount = null;
       this.crop_lowClipImageName = null;
       this.crop_lowClipImage_changed = false;
       this.autocontinue_prefix = "";
       this.medianFWHM = null;
       this.linear_fit_rerefence_id = null;
       this.imageSolver.solved_imageId = null;

       this.check_available_processes();
 
       this.RGB_stars_win = null;        // linear combined RGB/narrowband/OSC stars
       this.RGB_stars_win_HT = null;     // stretched/non-linear RGB stars win
       this.RGB_stars_channel_ids = [];  // linear RGB channel star image ids

       var starless_id = null;
       var RGB_stars_id = null;

       this.save_id_list = [];
 
       this.global.processed_channel_images = [];
       this.global.test_image_ids = [];
 
       this.luminance_crop_id = null;
       
       this.engineInit();
 
       this.global.processingDate = new Date;
       this.global.processing_steps = "";
       this.global.processing_errors = "";
       this.global.processing_warnings = "";
       this.global.all_windows = [];
       this.global.iconPoint = null;
       this.H_in_R_channel = false;
       this.process_narrowband = autocontinue_narrowband;
       this.is_luminance_images = false;
 
       console.noteln("--------------------------------------");
       var processing_info = this.getProcessingInfo();
       for (var i = 0; i < processing_info.header.length; i++) {
            this.util.addProcessingStep(processing_info.header[i]);
       }
       for (var i = 0; i < processing_info.options.length; i++) {
            this.util.addProcessingStep(processing_info.options[i]);
       }
       if (this.global.user_selected_best_image != null) {
             this.util.addProcessingStep("User selected best image: " + this.global.user_selected_best_image);
       }
       for (var i = 0; i < this.global.user_selected_reference_image.length; i++) {
             this.util.addProcessingStep("User selected reference image for filter " + this.global.user_selected_reference_image[i][1] + 
             " : " + this.global.user_selected_reference_image[i][0]);
       }
       console.noteln("--------------------------------------");
       this.util.addProcessingStepAndStatusInfo("Start processing : " + txt);
       console.writeln("auto_continue : " + auto_continue + ", autocontinue_narrowband : " + autocontinue_narrowband);
 
       if (this.gui) {
            this.gui.close_undo_images();
       }
 
       this.targetTypeSetup();
       this.checkOptions();
 
      /********************************************************************
       * createChannelImages
       * 
       * Create images for each L, R, G and B this.channels, or Color image. 
       ********************************************************************/
       let create_channel_images_ret = this.createChannelImages(parent, auto_continue);
       if (create_channel_images_ret == this.retval.ERROR) {
             console.criticalln("Failed!");
             this.util.endLog();
             this.global.is_processing = this.global.processing_state.none;
             return null;
       }
 
       /********************************************************************
        * Crop information
        * 
        * Crop all channel support images (the *_map images) to an area
        * covered by all source images.
        ********************************************************************/
       if (!this.par.null_processing.val && 
           (create_channel_images_ret == this.retval.SUCCESS || 
            (this.par.cropinfo_only.val && create_channel_images_ret == this.retval.INCOMPLETE)))
       {
             /* If requested, we crop all channel support images (the *_map images)
              * to an area covered by all source images.
              */ 
             if (! auto_continue) {
                   if (this.par.crop_to_common_area.val || this.par.cropinfo_only.val) {
                         this.createCropInformation();
                   } else {
                         console.warningln("Images are not cropped to common area, borders may be of lower quality");
                   }
             } else  {
                   if (this.par.crop_to_common_area.val || this.par.cropinfo_only.val) {
                         this.createCropInformationAutoContinue();
                   } else {
                         console.writeln("Crop ignored in AutoContinue, use images as is (possibly already cropped)") ;
                   }
             }
       }
 
      /********************************************************************
       * Now we have integrated L (Gray) and R, G and B images, or 
       * just RGB image in case of color files.
       *
       * We keep integrated L and RGB images so it is
       * possible to continue manually if automatic
       * processing is not good enough.
       ********************************************************************/
 
       var do_enhancements = false;
       if (this.par.null_processing.val) {
             this.util.addProcessingStep("Null processing, skip to enhancements");
       } else if (this.par.calibrate_only.val || this.par.generate_masters_only.val) {
             this.preprocessed_images = this.global.start_images.CALIBRATE_ONLY;
       } else if (this.preprocessed_images == this.global.start_images.FINAL) {
            /********************************************************************
             * We have a final image, just run run possible enhancements steps
             ********************************************************************/
             do_enhancements = true;
             LRGB_processed_HT_id = this.final_win.mainView.id;
             this.guiUpdatePreviewId(LRGB_processed_HT_id);
       } else if (!this.par.image_weight_testing.val 
                  && !this.par.debayer_only.val 
                  && !this.par.binning_only.val
                  && !this.par.extract_channels_only.val
                  && !this.par.integrate_only.val 
                  && !this.par.cropinfo_only.val 
                  && this.preprocessed_images != this.global.start_images.FINAL) 
       {
            /********************************************************************
             * Process RGB image.
             ********************************************************************/
             do_enhancements = true;
             /* processRGB flag means we have channel images from LRGBHSO */
             var processRGB = !this.is_color_files && 
                              !this.par.monochrome_image.val &&
                              (this.preprocessed_images == this.global.start_images.NONE ||
                               this.preprocessed_images == this.global.start_images.L_R_G_B_GC ||
                               this.preprocessed_images == this.global.start_images.L_R_G_B);
             var RGBmapping = { combined: false, stretched: false, channel_noise_reduction: false, channels_from_mappings: "" };
 
             this.util.runGarbageCollection();

             if (this.is_color_files) {
                  if (this.par.GC_before_channel_combination.val) {
                        this.util.addCriticalStatus("Option <i>Gradient correction on channel images</i> is not supported for color images."); 
                  }
             }
 
             if (this.preprocessed_images == this.global.start_images.L_R_G_B_GC) {
                   this.mapGCchannels();
             }
             if (processRGB) {
                   /* Do possible channel mapping. After that we 
                    * have this.red_id, this.green_id and this.blue_id.
                    * We may also have this.luminance_id.
                    * We may have a mapped RGB image in case of
                    * narrowband/custom mapping where RGB is created in
                    * this.mapLRGBchannels -> customMapping.
                    */
                   this.mapLRGBchannels(RGBmapping);
                   if (!RGBmapping.combined) {
                         // We have not yet combined the RGB image
                         this.linearFitLRGBchannels();
                   }
             } else if (this.is_color_files && 
                        (this.preprocessed_images == this.global.start_images.NONE ||
                         this.preprocessed_images == this.global.start_images.RGB))
            {
                   this.mapColorImage("Integration_RGB", "Integration_RGB_map");
                   this.cropImageIf(this.RGB_win_id);
             }
 
             if (!this.is_color_files && this.is_luminance_images) {
                   /* Process and stretch L image from linear to non-linear.
                    * This need to be run early as we create a mask from
                    * L image.
                    */
                   this.flowchart.flowchartParentBegin("LRGB");
                   this.flowchart.flowchartChildBegin("L");

                   this.LRGBEnsureMask(null);
                   this.processLimage(RGBmapping);
                   
                   this.flowchart.flowchartChildEnd("L");
                   if (this.local_RGB_stars) {
                        // Maybe not a very good idea but running RGB stars
                        // creation here also for LRGB data
                        this.flowchart.flowchartChildBegin("RGB stars");

                        this.RGB_stars_win_HT = this.createRGBstars();

                        this.flowchart.flowchartChildEnd("RGB stars");
                   }
                   var flowchart_parent_begin = "RGB";
                   this.flowchart.flowchartChildBegin(flowchart_parent_begin);

             } else if (this.local_RGB_stars) {
                  // Create a separate stars image from RGB this.channels
                  this.flowchart.flowchartParentBegin("LRGB");
                  this.flowchart.flowchartChildBegin("RGB stars");

                  this.RGB_stars_win_HT = this.createRGBstars();

                  this.flowchart.flowchartChildEnd("RGB stars");
                  var flowchart_parent_begin = "Starless";
                  if (RGBmapping.channels_from_mappings != "") {
                        flowchart_parent_begin += RGBmapping.channels_from_mappings;
                  }
                  this.flowchart.flowchartChildBegin(flowchart_parent_begin);

             } else {
                  var flowchart_parent_begin = null;
             }

             if (processRGB && !RGBmapping.combined) {
                   this.combineRGBimage(RGB_processed_HT_id);
                   RGBmapping.combined = true;
             }
             if (this.RGB_stars_channel_ids.length > 0) {
                   this.RGB_stars_win = this.combineRGBStars(this.RGB_stars_channel_ids);
             }
 
             if (this.par.monochrome_image.val) {
                   console.writeln("Monochrome image, rename windows")
                   LRGB_processed_HT_id = this.util.windowRename(this.L_processed_HT_win.mainView.id, this.ppar.win_prefix + "AutoMono");
                   this.guiUpdatePreviewId(LRGB_processed_HT_id);
                   if (flowchart_parent_begin) {
                        this.flowchart.flowchartChildEnd(flowchart_parent_begin);
                        this.flowchart.flowchartParentEnd("LRGB");
                   }
 
             } else if (!this.par.channelcombination_only.val) {
 
                   /* Process and stretch RGB image from linear to non-linear.
                    */
                   RGB_processed_HT_id = this.processRGBimage(RGBmapping);

                   if (this.checkNoiseReduction(this.is_color_files ? 'color' : 'RGB', 'nonlinear')) {
                         this.runNoiseReduction(ImageWindow.windowById(RGB_processed_HT_id), this.mask_win, false);
                   }
                   if (flowchart_parent_begin) {
                        this.flowchart.flowchartChildEnd(flowchart_parent_begin);
                        this.flowchart.flowchartParentEnd("LRGB");
                   }
       
                   if (this.is_color_files || !this.is_luminance_images) {
                         /* Keep RGB_processed_HT_id separate from LRGB_processed_HT_id which
                          * will be the final result file.
                          */
                         console.writeln("Color file or no luminance, make a copy of " + RGB_processed_HT_id);
                         LRGB_processed_HT_id = "copy_" + RGB_processed_HT_id;
                         this.util.copyWindow(
                               ImageWindow.windowById(RGB_processed_HT_id), 
                               LRGB_processed_HT_id);
                   } else {
                         /* LRGB files. Combine L and RGB images.
                         */
                         LRGB_processed_HT_id = this.runLRGBCombination(
                                                      RGB_processed_HT_id,
                                                      this.L_processed_HT_id);
                         LRGB_Combined = LRGB_processed_HT_id;
                         this.util.copyWindow(
                               ImageWindow.windowById(LRGB_processed_HT_id), 
                               "copy_" + LRGB_processed_HT_id);
                         LRGB_processed_HT_id = "copy_" + LRGB_processed_HT_id;
                   }
                   if (this.RGB_stars_win_HT != null) {
                         RGB_stars_id = this.RGB_stars_win_HT.mainView.id;
                   }
             
                   /* Optional ACDNR noise reduction for RGB. Used mostly to reduce black
                    * spots left from previous noise reduction.
                    */
                   this.runACDNRReduceNoise(ImageWindow.windowById(LRGB_processed_HT_id), this.mask_win);
 
                   /* Optional color noise reduction for RGB.
                    */
                   if (this.par.use_color_noise_reduction.val) {
                         this.runColorReduceNoise(ImageWindow.windowById(LRGB_processed_HT_id));
                   }
 
                   if (RGB_stars_id != null && !this.par.skip_star_noise_reduction.val) {
                         this.starReduceNoise(ImageWindow.windowById(RGB_stars_id));
                   }
 
                   if (!this.process_narrowband && !this.par.use_RGBNB_Mapping.val  && !this.par.skip_SCNR.val && !this.par.comet_align.val) {
                         /* Remove green cast, run SCNR
                          */
                         this.runSCNR(ImageWindow.windowById(LRGB_processed_HT_id), false);
                   }
                   if (RGB_stars_id != null) {
                        if ((!this.process_narrowband || this.local_RGB_stars) && !this.par.use_RGBNB_Mapping.val  && !this.par.skip_SCNR.val && !this.par.comet_align.val) {
                              this.runSCNR(ImageWindow.windowById(RGB_stars_id), false);
                        }
                  }
           
                   /* Sharpen image, use mask to sharpen mostly the light parts of image.
                   */
                   if (this.par.skip_sharpening.val) {
                         console.writeln("No sharpening on " + LRGB_processed_HT_id);
                   } else if (this.par.use_blurxterminator.val || this.par.use_graxpert_deconvolution.val) {
                        /* We have already applied BlurXTerminator on linear image. */
                  } else {
                         this.runMultiscaleLinearTransformSharpen(
                               ImageWindow.windowById(LRGB_processed_HT_id),
                               this.mask_win);
                         if (RGB_stars_id != null) {
                               this.runMultiscaleLinearTransformSharpen(
                                     ImageWindow.windowById(RGB_stars_id),
                                     null);
                         }
                   }
 
                  if (!this.par.use_RGBNB_Mapping.val) {
                        /* Color calibration on RGB
                         */
                        this.runColorCalibration(ImageWindow.windowById(LRGB_processed_HT_id), 'nonlinear');
                        if (RGB_stars_id != null) {
                              this.runColorCalibration(ImageWindow.windowById(RGB_stars_id), 'nonlinear');
                        }
                  } 

                  if (this.par.use_RGBHa_Mapping.val) {
                        this.RGBHa_mapping(LRGB_processed_HT_id);
                  }

                   /* Rename some windows. Need to be done before iconize.
                   */
                   if (!this.is_color_files && this.is_luminance_images) {
                         /* LRGB files */
                         if (this.par.RRGB_image.val) {
                               LRGB_processed_HT_id = this.util.windowRename(LRGB_processed_HT_id, this.ppar.win_prefix + "AutoRRGB");
                         } else {
                               LRGB_processed_HT_id = this.util.windowRename(LRGB_processed_HT_id, this.ppar.win_prefix + "AutoLRGB");
                         }
                   } else {
                         /* Color or narrowband or RGB files */
                         LRGB_processed_HT_id = this.util.windowRename(LRGB_processed_HT_id, this.ppar.win_prefix + "AutoRGB");
                   }
                   this.guiUpdatePreviewId(LRGB_processed_HT_id);
                   this.setIntegrationInfoKeywords(LRGB_processed_HT_id);
             } else {
                   if (flowchart_parent_begin) {
                        this.flowchart.flowchartChildEnd(flowchart_parent_begin);
                        this.flowchart.flowchartParentEnd("LRGB");
                   }
            }
             if (RGB_stars_id != null) {
                   console.writeln("Stars image is " + RGB_stars_id);
                   this.setFinalImageKeyword(ImageWindow.windowById(RGB_stars_id));
                   RGB_stars_id = this.util.windowRename(RGB_stars_id, LRGB_processed_HT_id + "_stars");
       
                   starless_id = LRGB_processed_HT_id + "_starless";
                   console.writeln("Rename " + LRGB_processed_HT_id + " as " + starless_id);
                   this.util.windowRename(LRGB_processed_HT_id, starless_id);
                   var new_image = this.combineStarsAndStarless(
                                     this.par.stars_combine.val,
                                     starless_id, 
                                     RGB_stars_id);
                   // restore original final image name
                   console.writeln("Rename " + new_image + " as " + LRGB_processed_HT_id);
                   this.util.windowRename(new_image, LRGB_processed_HT_id);
                   ImageWindow.windowById(LRGB_processed_HT_id).show();
       
                   this.setFinalImageKeyword(ImageWindow.windowById(starless_id));
       
                   this.saveProcessedWindow(RGB_stars_id);
                   this.saveProcessedWindow(starless_id);

                   this.guiUpdatePreviewId(LRGB_processed_HT_id);
             }
             if (this.par.save_stretched_starless_channel_images.val) {
                  this.createStarsImageFromFinalImage(LRGB_processed_HT_id);
             }
       }
 
       console.writeln("Basic processing completed");
       this.flowchart.flowchartDone();

       this.save_images_in_save_id_list();
 
       if (do_enhancements && (this.util.is_enhancements_option() || this.util.is_narrowband_option())) {
             this.enhancementsProcessing(parent, LRGB_processed_HT_id, false);
       }
 
       this.util.ensureDialogFilePath("processed files");
 
       if (this.global.substack_number > 0) {
            console.writeln("Substack number " + this.global.substack_number);
            /* Rename image based on substack number. */
            let numstr = this.global.substack_number.toString();
            while (numstr.length < 3) {
                  numstr = "0" + numstr;
            }
            let stackname = this.util.ensure_win_prefix("Stack_" + numstr + "_" + this.RGB_color_id);
            this.util.addProcessingStep("Substack mode, rename " + this.RGB_color_id + " to " + stackname);
            this.RGB_color_id = this.util.windowRenameKeepifEx(this.RGB_color_id, stackname, true, true);
            this.saveProcessedWindow(this.RGB_color_id);          /* Final renamed substack integrated image. */
       }
       if (this.crop_lowClipImage_changed) {
             this.saveProcessedWindow(this.crop_lowClipImageName);  /* LowRejectionMap_ALL */
       }
       if (this.preprocessed_images < this.global.start_images.L_R_G_B_GC) {
             // We have generated integrated images, save them
             console.writeln("Save processed windows");
             this.saveProcessedWindow(this.L_id);                    /* Integration_L */
             this.saveProcessedWindow(this.R_id);                    /* Integration_R */
             this.saveProcessedWindow(this.G_id);                    /* Integration_G */
             this.saveProcessedWindow(this.B_id);                    /* Integration_B */
             this.saveProcessedWindow(this.H_id);                    /* Integration_H */
             this.saveProcessedWindow(this.S_id);                    /* Integration_S */
             this.saveProcessedWindow(this.O_id);                    /* Integration_O */
             this.saveProcessedWindow(this.RGB_color_id);            /* Integration_RGB */
             if (this.luminance_crop_id != null) {
                   this.saveProcessedWindow(this.luminance_crop_id); /* Integration_L_crop */
             }
       }
       if (this.preprocessed_images <= this.global.start_images.L_R_G_B_GC && this.RGB_win_id != null && !this.RGB_win_id.endsWith("_map")) {
             // We have generated RGB image, save it
             console.writeln("Save generated RGB image");
             this.saveProcessedWindow(this.RGB_win_id);              /* Integration_RGB_combined */
       }
       if (this.preprocessed_images < this.global.start_images.FINAL && LRGB_processed_HT_id != null) {
             console.writeln("Save final image");
             // set final image keyword so it easy to save all file e.g. as 16 bit TIFF
             this.setFinalImageKeyword(ImageWindow.windowById(LRGB_processed_HT_id));
             // save processing options
             this.saveProcessingHistoryToImage(ImageWindow.windowById(LRGB_processed_HT_id));
             // We have generated final image, save it
             this.global.run_results.final_image_file = this.saveProcessedWindow(LRGB_processed_HT_id);  /* Final image. */
             if (this.global.get_flowchart_data) {
                  this.util.closeOneWindowById(LRGB_processed_HT_id);
             }
             var iconize_final_image = true;
       } else {
            var iconize_final_image = false;
      }
 
       /* All done, do cleanup on windows on screen 
        */
       this.util.addProcessingStepAndStatusInfo("Engine processing completed");
 
       this.util.closeTempWindows();
       if (!this.par.calibrate_only.val && !this.par.generate_masters_only.val) {
             this.util.closeAllWindowsFromArray(this.global.calibrate_windows);
       }
 
       this.util.windowIconizeAndKeywordif(this.L_id);                    /* Integration_L */
       this.util.windowIconizeAndKeywordif(this.R_id);                    /* Integration_R */
       this.util.windowIconizeAndKeywordif(this.G_id);                    /* Integration_G */
       this.util.windowIconizeAndKeywordif(this.B_id);                    /* Integration_B */
       this.util.windowIconizeAndKeywordif(this.H_id);                    /* Integration_H */
       this.util.windowIconizeAndKeywordif(this.S_id);                    /* Integration_S */
       this.util.windowIconizeAndKeywordif(this.O_id);                    /* Integration_O */
       this.util.windowIconizeAndKeywordif(this.RGB_color_id);            /* Integration_RGB */
       if (this.crop_lowClipImageName != null) {
             this.util.windowIconizeif(this.crop_lowClipImageName);       /* LowRejectionMap_ALL */
       }
       if (this.RGB_win_id != null && this.RGB_win_id.endsWith("_map")) {
            // close map window
            this.util.closeOneWindowById(this.RGB_win_id);
            this.RGB_win_id = null;
       } else {
            this.util.windowIconizeAndKeywordif(this.RGB_win_id);         /* Integration_RGB_combined */
       }
       this.util.windowIconizeAndKeywordif(this.luminance_crop_id);       /* Integration_L_crop */
 
       if (this.RGB_stars_win != null) {
             this.util.windowIconizeAndKeywordif(this.RGB_stars_win.mainView.id); /* Integration_RGB_stars (linear) */
       }
       if (this.RGB_stars_win_HT != null) {
             this.setFinalImageKeyword(ImageWindow.windowById(this.RGB_stars_win_HT.mainView.id));   /* Integration_RGB_stars (non-linear) */
       }

       for (var i = 0; i < this.iconized_debug_image_ids.length; i++) {
            if (this.par.debug.val) {
                  this.util.windowIconizeAndKeywordif(this.iconized_debug_image_ids[i]);
            } else {
                  this.util.closeOneWindowById(this.iconized_debug_image_ids[i]);
            }
      }
      for (var i = 0; i < this.iconized_image_ids.length; i++) {
            this.util.windowIconizeAndKeywordif(this.iconized_image_ids[i]);
      }
      for (var i = 0; i < this.global.test_image_ids.length; i++) {
            this.util.windowIconizeAndKeywordif(this.global.test_image_ids[i]);
      }
 
       for (var i = 0; i < this.global.processed_channel_images.length; i++) {
             this.util.windowIconizeAndKeywordif(this.global.processed_channel_images[i]);
       }
 
       this.util.windowIconizeAndKeywordif(this.L_processed_id);
       this.util.windowIconizeAndKeywordif(this.RGB_processed_id);
 
       this.util.closeAllWindowsFromArray(this.RGB_stars_channel_ids);
 
       this.util.windowIconizeAndKeywordif(RGB_processed_HT_id);
       this.util.windowIconizeAndKeywordif(this.L_processed_HT_id);
       this.util.windowIconizeAndKeywordif(LRGB_Combined);           /* LRGB Combined image */
       this.util.windowIconizeAndKeywordif(this.mask_win_id);             /* AutoMask window */
       this.util.windowIconizeAndKeywordif(this.star_mask_win_id);        /* AutoStarMask or star_mask window */
       this.util.windowIconizeAndKeywordif(this.star_fix_mask_win_id);    /* AutoStarFixMask or star_fix_mask window */

       if (iconize_final_image) {
            this.util.windowIconizeif(LRGB_processed_HT_id, true);
       }
       if (RGB_stars_id != null) {
            this.util.windowIconizeif(RGB_stars_id, true);
       }
       if (starless_id != null) {
            this.util.windowIconizeif(starless_id, true);
       }

       if (this.par.batch_mode.val) {
             /* Rename image based on first file directory name. 
              * First check possible device in Windows (like c:)
              */
             var fname = this.lightFileNames[0];
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
             fname = this.util.ensure_win_prefix(fname);
             this.util.addProcessingStep("Batch mode, rename " + LRGB_processed_HT_id + " to " + fname);
             LRGB_processed_HT_id = this.util.windowRenameKeepifEx(LRGB_processed_HT_id, fname, true, true);
             this.saveProcessedWindow(LRGB_processed_HT_id);          /* Final renamed batch image. */
       }

       this.writeAstrobinInfo();
 
       if (this.preprocessed_images == this.global.start_images.NONE
           && !this.par.image_weight_testing.val
           && !this.par.calibrate_only.val
           && !this.par.generate_masters_only.val
           && !this.par.binning_only.val
           && !this.par.debayer_only.val
           && !this.par.extract_channels_only.val
           && !this.par.null_processing.val)
       {
             /* Output some info of files.
             */
             this.util.addProcessingStep("* All data files *");
             this.util.addProcessingStep(this.alignedFiles.length + " files accepted");
             this.util.addProcessingStep("best_ssweight="+this.global.best_ssweight);
             this.util.addProcessingStep("best_image="+this.global.best_image);
             var totalexptime = this.L_images.exptime + this.R_images.exptime + this.G_images.exptime +
                                this.B_images.exptime + this.C_images.exptime;
             this.util.addProcessingStep("total exptime="+totalexptime);
             
             console.writeln("");
 
             if (!this.is_color_files) {
                   /* LRGB files */
                   if (this.is_luminance_images) {
                         this.printImageInfo(this.L_images, "L");
                   }
 
                   if (!this.par.monochrome_image.val) {
                         this.printImageInfo(this.R_images, "R");
                         this.printImageInfo(this.G_images, "G");
                         this.printImageInfo(this.B_images, "B");
                         this.printImageInfo(this.H_images, "H");
                         this.printImageInfo(this.S_images, "S");
                         this.printImageInfo(this.O_images, "O");
                   }
             } else {
                   /* Color files */
                   this.printImageInfo(this.C_images, "Color");
             }
             var full_run = true;
       } else {
             var full_run = false;
       }
       var end_time = Date.now();
       this.util.printMemoryStatus("End processing");
       console.noteln("======================================");
       this.util.addProcessingStepAndStatusInfo("Script completed, time "+(end_time-this.script_start_time)/1000+" sec");
       console.noteln("======================================");


       console.writeln("--------------------------------------");
       if (this.global.flowchartData != null) {
            // Print this.flowchart
            this.flowchart.flowchartPrint(this.global.flowchartData);
            if (this.global.testmode) {
                  this.flowchart.flowchartPrint(this.global.flowchartData, true);
            }
            if (this.par.flowchart_saveimage.val && this.global.flowchart_image != null && this.gui) {
                  // Save this.flowchart image
                  var flowchart_imagename = this.util.ensure_win_prefix("AutoIntegrateFlowchart");
                  var bitmap = this.global.flowchart_image.render();
                  var flowchart_win = this.util.createWindowFromBitmap(bitmap, flowchart_imagename);
                  this.saveProcessedWindow(flowchart_win.mainView.id, null, ".jpg");
                  this.util.closeOneWindow(flowchart_win);
                  bitmap.clear();
                  this.global.flowchart_image = null;
            }
       }
 
       if (this.preprocessed_images != this.global.start_images.FINAL
           && this.par.autosave_setup.val 
           && full_run
           && create_channel_images_ret == this.retval.SUCCESS
           && !this.global.get_flowchart_data)
       {
             let json_file = "AutosaveSetup.json";
             if (this.par.win_prefix_to_log_files.val) {
                   json_file = this.util.ensure_win_prefix(json_file);
             }
             this.util.saveJsonFileEx(parent, true, json_file);
       }
       if (this.alignedFiles != null) {
            console.writeln("--------------------------------------");
            console.noteln("Aligned files:");
            for (var i = 0; i < this.alignedFiles.length; i++) {
                  console.writeln(this.alignedFiles[i]);
            }
      }

       console.writeln("--------------------------------------");
       console.noteln("Processing steps:");
       console.writeln(this.global.processing_steps);
       console.writeln("--------------------------------------");
       var processingOptions = this.getChangedProcessingOptions();
       if (processingOptions.length > 0) {
             console.writeln("Processing options:");
             for (var i = 0; i < processingOptions.length; i++) {
                   console.writeln(processingOptions[i][0] + " " + processingOptions[i][1]);
             }
       } else {
             this.util.addProcessingStep("Default processing options were used");
 
       }
       console.writeln("--------------------------------------");
       if (this.global.processing_warnings.length > 0) {
            console.warningln("Processing warnings:");
            console.warningln(this.global.processing_warnings);
            console.writeln("");
       }
       if (this.global.processing_errors.length > 0) {
            console.criticalln("Processing errors:");
            console.criticalln(this.global.processing_errors);
       }

       this.imageSolver.solved_imageId = null;

       this.lightFileNames = null;
       this.darkFileNames = null;
       this.biasFileNames = null;
       this.flatdarkFileNames = null;
       this.flatFileNames = null;
 
       console.writeln("Run Garbage Collection");
       this.util.runGarbageCollection();
 
       if (this.global.debug) console.writeln("global.testmode " + this.global.testmode);
       if (this.global.testmode || this.global.debug) {
            this.global.testmode_log += "\n" + this.global.processing_steps;
            this.writeTestmodeLog(this.global.testmode_log, "TestMode.log");
            this.global.testmode_log = "";
       }

       console.noteln("Engine processing completed.");

       if (!this.global.get_flowchart_data && this.preprocessed_images != this.global.start_images.FINAL) {
            this.writeProcessingStepsAndEndLog(this.alignedFiles, auto_continue, null, false);
            console.noteln("Console output is written into file " + this.logfname);
      }

      if (this.util.executed_processes.length > 0) {
            if (this.par.create_process_icons.val) {
                  let filename = this.util.ensure_win_prefix("ExecutedProcesses.xpsm");
                  console.writeln("Write executed processes as process icons");
                  this.util.writeExecutedProcessesToXPSM(this.util.ensurePathEndSlash(this.global.outputRootDir) + filename);
            }
            if (this.par.create_executed_processes_js.val || this.global.debug) {
                  let filename = this.util.ensure_win_prefix("ExecutedProcesses.js");
                  console.writeln("Write executed processes as JavaScript file");
                  this.util.writeExecutedProcessesToScript(this.util.ensurePathEndSlash(this.global.outputRootDir) + filename);
            }
      }
      this.global.is_processing = this.global.processing_state.none;

       return LRGB_processed_HT_id; // end: autointegrateProcessingEngine
}
 
printProcessValues(obj, txt = "")
{
      if (this.par.print_process_values.val 
          && !this.global.get_flowchart_data
          && this.global.is_processing != this.global.processing_state.none)
      {
            if (this.global.debug) console.writeln("printProcessValues");
            console.writeln(obj.toSource());
      }
}

saveProcessValues(obj, txt = "", imageId = null)
{
      if (this.global.debug) console.writeln("saveProcessValues");
      this.util.addExecutedProcess(obj, txt, imageId);
}

printAndSaveProcessValues(obj, txt = "", imageId = null)
{
      if (this.global.debug) console.writeln("printAndSaveProcessValues");
      this.printProcessValues(obj, txt);
      this.saveProcessValues(obj, txt, imageId);
}

printProcessDefaultValues(name, obj)
{
      console.writeln("Default values for " + name);
      console.writeln(obj.toSource());
}


getProcessDefaultValues()
{
      this.util.beginLog();

      this.global.write_processing_log_file = true;
      console.writeln("PixInsight process default values");
      console.writeln("PixInsight version " + this.global.pixinsight_version_str);

      this.printProcessDefaultValues("new ChannelExtraction", new ChannelExtraction);
      this.printProcessDefaultValues("new ImageIntegration", new ImageIntegration);
      this.printProcessDefaultValues("new Superbias", new Superbias);
      this.printProcessDefaultValues("new ImageCalibration", new ImageCalibration);
      this.printProcessDefaultValues("new IntegerResample", new IntegerResample);
      this.printProcessDefaultValues("new CosmeticCorrection", new CosmeticCorrection);
      this.printProcessDefaultValues("new SubframeSelector", new SubframeSelector);
      this.printProcessDefaultValues("new PixelMath", new PixelMath);
      if (this.par.use_starnet2.val) {
            try {
                  this.printProcessDefaultValues("new StarNet2", new StarNet2);
            } catch (e) {
                  console.criticalln("StarNet2 not available");
            }
      }
      this.printProcessDefaultValues("new StarAlignment", new StarAlignment);
      this.printProcessDefaultValues("new LocalNormalization", new LocalNormalization);
      this.printProcessDefaultValues("new LinearFit", new LinearFit);
      this.printProcessDefaultValues("new DrizzleIntegration", new DrizzleIntegration);
      this.printProcessDefaultValues("new AutomaticBackgroundExtractor", new AutomaticBackgroundExtractor);
      this.printProcessDefaultValues("new DynamicBackgroundExtraction", new DynamicBackgroundExtraction);
      this.printProcessDefaultValues("new ScreenTransferFunction", new ScreenTransferFunction);
      this.printProcessDefaultValues("new HistogramTransformation", new HistogramTransformation);
      this.printProcessDefaultValues("new MaskedStretch", new MaskedStretch);
      this.printProcessDefaultValues("new ACDNR", new ACDNR);
      this.printProcessDefaultValues("new MultiscaleLinearTransform", new MultiscaleLinearTransform);
      this.printProcessDefaultValues("new TGVDenoise", new TGVDenoise);
      this.printProcessDefaultValues("new BackgroundNeutralization", new BackgroundNeutralization);
      this.printProcessDefaultValues("new ColorCalibration", new ColorCalibration);
      this.printProcessDefaultValues("new ColorSaturation", new ColorSaturation);
      this.printProcessDefaultValues("new CurvesTransformation", new CurvesTransformation);
      this.printProcessDefaultValues("new LRGBCombination", new LRGBCombination);
      this.printProcessDefaultValues("new SCNR", new SCNR);
      this.printProcessDefaultValues("new Debayer", new Debayer);
      this.printProcessDefaultValues("new ChannelCombination", new ChannelCombination);
      this.printProcessDefaultValues("new ChannelExtraction", new ChannelExtraction);
      this.printProcessDefaultValues("new Invert", new Invert);
      this.printProcessDefaultValues("new StarMask", new StarMask);
      this.printProcessDefaultValues("new HDRMultiscaleTransform", new HDRMultiscaleTransform);
      this.printProcessDefaultValues("new LocalHistogramEqualization", new LocalHistogramEqualization);
      this.printProcessDefaultValues("new MorphologicalTransformation", new MorphologicalTransformation);
      this.printProcessDefaultValues("new ArcsinhStretch", new ArcsinhStretch);
      try {
            this.printProcessDefaultValues("new StarXTerminator", new StarXTerminator);
      } catch (e) {
            console.criticalln("StarXTerminator not available");
      }
      try {
            this.printProcessDefaultValues("new NoiseXTerminator", new NoiseXTerminator);
      } catch (e) {
            console.criticalln("NoiseXTerminator not available");
      }
      try {
            this.printProcessDefaultValues("new BlurXTerminator", new BlurXTerminator);
      } catch (e) {
            console.criticalln("BlurXTerminator not available");
      }
      this.printProcessDefaultValues("new SpectrophotometricColorCalibration", new SpectrophotometricColorCalibration);
      this.printProcessDefaultValues("new GradientCorrection", new GradientCorrection);
      this.printProcessDefaultValues("new FastIntegration", new FastIntegration);
      this.printProcessDefaultValues("new SpectrophotometricFluxCalibration", new SpectrophotometricFluxCalibration);
      this.printProcessDefaultValues("new MultiscaleGradientCorrection", new MultiscaleGradientCorrection);
      try {
            this.printProcessDefaultValues("new MultiscaleAdaptiveStretch", new MultiscaleAdaptiveStretch);
      } catch (e) {
            console.criticalln("MultiscaleAdaptiveStretch not available");
      }

      this.writeProcessingStepsAndEndLog(null, false, "AutoProcessDefaults_" + this.global.pixinsight_version_str, false);
}

/* Interface functions.

// Setup
this.setGUI = setGUI;

// Main interface functions
this.autointegrateProcessingEngine = autointegrateProcessingEngine;
this.autointegrateNarrowbandPaletteBatch = autointegrateNarrowbandPaletteBatch;
this.enhancementsProcessingEngine = this.enhancementsProcessingEngine;

// Utility processing functions
this.subframeSelectorMeasure = subframeSelectorMeasure;
this.getFilterValues = getFilterValues;
this.getMetricsFilteredOut = getMetricsFilteredOut;
this.measurementTextForFilename = measurementTextForFilename;

this.autoStretch = autoStretch;
this.imageIsLinear = imageIsLinear;
this.targetTypeToStretching = targetTypeToStretching;

this.openImageFiles = openImageFiles;
this.openDirectoryFiles = openDirectoryFiles;
this.getFilterFiles = getFilterFiles;
this.getFilterHigh = getFilterHigh;
this.getImagetypFiles = getImagetypFiles;
this.getExptimeFromFile = (filePath) => this.calibrate.getExptimeFromFile(filePath);
this.runResample = runResample;

this.writeProcessingStepsAndEndLog = writeProcessingStepsAndEndLog;
this.getProcessDefaultValues = getProcessDefaultValues;
this.getChangedProcessingOptions = getChangedProcessingOptions;
this.autocontinueHasNarrowband = autocontinueHasNarrowband;

this.testRGBNBmapping = testRGBNBmapping;
this.testRGBHaMapping = testRGBHaMapping;

 */

}  /* AutoIntegrateEngine*/

#endif  /* AUTOINTEGRATEENGINE_JS */
