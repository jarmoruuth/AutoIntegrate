/*
      AutoIntegrate Engine.

This is the main engine for AutoIntegrate script.

Interface functions, see at the end of the module.

Copyright (c) 2018-2025 Jarmo Ruuth.

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

#ifndef NO_SOLVER_LIBRARY
/* Settings to ImageSolver script. This is copied from WBPP script. */
#define USE_SOLVER_LIBRARY true
#define USE_ANNOTATE_LIBRARY true
#define SETTINGS_MODULE "AutoIntegrateSolver"
#define STAR_CSV_FILE   File.systemTempDirectory + "/stars.csv"
#include "../AdP/CommonUIControls.js"
#include "../AdP/AstronomicalCatalogs.jsh"
#include "../AdP/WCSmetadata.jsh"
#include "../AdP/ImageSolver.js"
#include "../AdP/SearchCoordinatesDialog.js"
#include "../AdP/AnnotateImage.js"
#endif

function AutoIntegrateEngine(global, util)
{

this.__base__ = Object;
this.__base__();

var autointegrateLDD = new AutoIntegrateLDD(util);

var gui;
var par = global.par;
var ppar = global.ppar;
var engine = this;

// Copy of files grom glolobal object
this.lightFileNames = null;
this.darkFileNames = null;
this.biasFileNames = null;
this.flatdarkFileNames = null;
this.flatFileNames = null;

var flowchart_active = false;
var flowchartCurrent = null;
var flowchartStack = [];
var flowchartOperationList = [];
var flowchart_operation_level = 0;

/* Set optional GUI object to update GUI components.
 */
function setGUI(aigui) {
      gui = aigui;
}

var ssweight_set = false;
var run_HT = true;
var linear_fit_done = false;
var spcc_color_calibration_done = false;
var H_in_R_channel = false;
var is_luminance_images = false;    // Do we have luminance files from autocontinue or FITS
var autocontinue_prefix = "";       // prefix used to find base files for autocontinue
var creating_mask = false;          // flag for creating mask

var crop_truncate_amount = null;       // used when cropping channel images
var crop_lowClipImageName = null;      // integrated image used to calculate crop_truncate_amount
var crop_lowClipImage_changed = false; // changed flag for saving to disk

var save_processed_images = true;     // save processed L+RGB images to disk while they still are linear

var crop_suggestion_txt = "Adjust crop parameters, or adjust the crop manually and run again using AutoContinue."; 

this.extraApply = false;

this.firstDateFileInfo = null;
this.lastDateFileInfo = null;

var medianFWHM = null;

var L_images;
var R_images;
var G_images;
var B_images;
var H_images;
var S_images;
var O_images;
var C_images;

// SPCC parameters that may be changed with spcc_auto_narrowband
// so they are used from here.
var spcc_params = {
      wavelengths: [],        // R, G, B
      bandhwidths: [],        // R, G, B
      white_reference: "",
      narrowband_mode: false
};

var process_narrowband;

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
var L_processed_id;
var L_processed_HT_win;
var L_processed_HT_id;
var RGB_processed_id;

var is_color_files = false;    // Are we processing color/OSC files
var is_rgb_files = false;
var is_narrowband_files = false;
var preprocessed_images;

var save_id_list = []; // list of images to save to disk

var luminance_id = null;      // These are working images and copies of 
var red_id = null;            // original integrated images
var green_id = null;
var blue_id = null;

var luminance_crop_id = null; // Not used for now, use Save cropped images

var L_id;                     // Original integrated images
var R_id;                     // We make copies of these images during processing
var G_id;
var B_id;
var H_id;
var S_id;
var O_id;
var RGB_color_id;              // Integrated RGB from OSC/DSLR data

var RGBHa_H_enhanced_info = {  // Ha RGB image info
                              nb_channel_id: null,    // Enhanced Ha channel image id
                              starless: false, 
                              mapping_done: false
                         };    

var iconized_image_ids = [];        // Random images that are iconized at the end of processing
var iconized_debug_image_ids = [];  // Random images that are iconized or closed at the end of processing

var RGB_stars_win = null;     // linear combined RGB/narrowband/OSC stars
var RGB_stars_HT_win = null;  // stretched/non-linear RGB stars win
var RGB_stars = [];           // linear RGB channel star image ids

var script_start_time;

var L_GC_start_win;           // Gradient corrected and integrated start images for AutoContinue
var R_GC_start_win;
var G_GC_start_win;
var B_GC_start_win;
var H_GC_start_win;
var S_GC_start_win;
var O_GC_start_win;
var RGB_GC_start_win;

var L_HT_start_win;           // HT images for AutoContinue
var RGB_HT_start_win;

var range_mask_win;
var final_win;
var solved_imageId;           // successfully solved image, used to copy astrometric solution
var current_telescope_name = "";

var linear_fit_rerefence_id = null;

var stepno = 1;

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

var GraXpertCmd = {
      background: 0,
      denoise: 1,
      deconvolution_stars: 2,
      deconvolution_object: 3,
};

var telescope_info = [
      [ 'AUS-2-CMOS', 382, 3.76 ],
      [ 'SPA-1-CMOS', 382, 3.76 ],
      [ 'SPA-2-CMOS', 5600, 3.76 ],
      [ 'SPA-3-CMOS', 382, 3.76 ],
      [ 'CHI-1-CMOS', 3962, 3.76 ],
      [ 'CHI-2-CMOS', 1900, 3.76 ],
      [ 'CHI-3-CMOS', 6800, 3.76 ],
      [ 'CHI-4-CMOS', 1900, 3.76 ],
      [ 'CHI-5-CMOS', 200, 3.76 ],
      [ 'CHI-6-CMOS', 600, 3.76 ]
];


// Binning value for par.fast_mode
function getFastModeBinning(imgWin)
{
      switch (par.fast_mode_opt.val) {
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
                  util.throwFatalError("getFastModeBinning, unknown fast_mode_opt " + par.fast_mode_opt.val);
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

// Filtering for par.fast_mode
function filterFilesForFastMode(fileNames, auto_continue, filetype)
{
      if (fileNames == null || fileNames.length == 0) {
            return fileNames;
      }
      if (auto_continue) {
            return fileNames;
      } else if (par.fast_mode.val) {
            // Get a subset of images for fast mode
            var original_len = fileNames.length;
            switch (filetype) {
                  case global.pages.FLATS:
                  case global.pages.LIGHTS:
                        // For each filter, get 10%, or at least 3 images from the list
                        var fast_mode_filtered_files = engine.getFilterFiles(fileNames, filetype, '', false);
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
                                    fileNames[fileNames.length] = allfilesarr[i].files[j * nth].name;
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
            util.closeOneWindowById("AutoIntegrateFastModeTemp");
            var imgWin = util.openImageWindowFromFile(fileNames[0], false, true);
            imgWin.mainView.id = "AutoIntegrateFastModeTemp";
            var binning = getFastModeBinning(imgWin);
            util.closeOneWindow(imgWin);
            console.writeln("filterFilesForFastMode, binning " + binning);

            if (binning > 1) {
                  fileNames = runBinningOnFiles(fileNames, 2, 2, null, null, "_fb" + binning);
            }
            return fileNames;
      } else {
            return fileNames;
      }
}

// Filter files for global.get_flowchart_data.
// Pick just one or two files for each channel
// (Binning skipped for now: and use IntegerResample to make files really small.)
function flowchartFilterFiles(fileNames, filetype)
{
      if (filetype == global.pages.FLATS) {
            console.writeln("flowchartFilterFiles, " + fileNames.length + " flats");
            var stop_on_image = 1;  // Pick two flats for each channel
      } else if (filetype == global.pages.LIGHTS) {
            console.writeln("flowchartFilterFiles, " + fileNames.length + " lights");
            var stop_on_image = 0;  // Pick one light for each channel
      } else {
            util.throwFatalError("flowchartFilterFiles, unknown filetype " + filetype);
      }
      console.flush();

      var flowchar_filtered_files = engine.getFilterFiles(fileNames, filetype, '', true);
      var allfilesarr = flowchar_filtered_files.allfilesarr;
      var newFileNames = [];
      var renamedFileNames = [];
      var maxsize = Math.max(flowchar_filtered_files.maxwidth, flowchar_filtered_files.maxheigth);

      // Pick first files for each channel
      console.writeln("flowchartFilterFiles, " + allfilesarr.length + " channels");
      console.flush();
      for (var i = 0; i < allfilesarr.length; i++) {
            console.writeln("flowchartFilterFiles, " + allfilesarr[i].filter + ", " + allfilesarr[i].files.length);
            for (var j = 0; j < allfilesarr[i].files.length; j++) {
                  console.writeln("flowchartFilterFiles, " + allfilesarr[i].filter + ", " + allfilesarr[i].files[j].name);
                  var name = allfilesarr[i].files[j].name;
                  newFileNames[newFileNames.length] = name;
                  console.writeln("flowchartFilterFiles, " + allfilesarr[i].filter + ", " + name);
                  if (j == stop_on_image) {
                        break;
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
            newFileNames = runBinningOnFiles(newFileNames, 2, binning, null, renamedFileNames, "");
      }
      return newFileNames;
}

function flowchartNewIntegrationImage(fileName, targetImageName)
{
      targetImageName = util.mapBadWindowNameChars(targetImageName);
      console.writeln("flowchartNewIntegrationImage: " + fileName + ", " + targetImageName);
      // read image file
      var imgWin = util.openImageWindowFromFile(fileName, true);
      if (imgWin == null) {
            var viewname = util.ensure_win_prefix((util.mapBadWindowNameChars(File.extractName(fileName))));
            console.writeln("flowchartNewIntegrationImage, cannot open image file " + fileName + ", trying to find view " + viewname);
            imgWin = util.findWindow(viewname);
      }
      if (imgWin == null) {
            util.throwFatalError("flowchartNewIntegrationImage, cannot open image file " + fileName);
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
      console.writeln("flowchartFilterFiles, binning " + binning);
      runBinning(imgWin, binning);

      return targetImageName;
}

function flowchartNewImage(imgWin, targetImageName)
{
      console.writeln("flowchartNewIntegrationImage");

      // copy image file
      util.copyWindow(imgWin, targetImageName);

      return targetImageName;
}

function flowchartUpdated()
{
      if (par.flowchart_debug.val) console.writeln("flowchartUpdated");
      if (gui) {
            gui.flowchartUpdated();
      }
}

function flowchartNewNode(type, txt)
{
      return { type: type, txt: txt, list: [], id: global.flowchartActiveId, start_time: null, end_time: null };
}

function flowchartCheckOperationList(type, txt)
{
      var node = null;
      var nodepos = global.flowchartActiveId;
      global.flowchartActiveId++;
      if (global.flowchartOperationList.length > 0) {
            if (nodepos < global.flowchartOperationList.length
                && txt == global.flowchartOperationList[nodepos].txt) 
            {
                  if (par.flowchart_debug.val) console.writeln("flowchartCheckOperationList:match " + txt + ", global.flowchartOperationList[" + global.flowchartActiveId + "] " + global.flowchartOperationList[global.flowchartActiveId]);
                  // Use previously created node
                  node = global.flowchartOperationList[nodepos];
            } else {
                  if (par.flowchart_debug.val) console.writeln("flowchartCheckOperationList:mismatch " + txt + ", global.flowchartOperationList[" + global.flowchartActiveId + "] " + global.flowchartOperationList[global.flowchartActiveId]);
            }
      } else {
            if (par.flowchart_debug.val) console.writeln("flowchartCheckOperationList:flowchartOperationList is empty, txt " + txt);
      }
      if (node == null) {
            node = flowchartNewNode(type, txt);
      }
      flowchartOperationList.push(node);

      return node;
}

function flowchartOperation(txt)
{
      if (!flowchart_active) {
            return null;
      }
      flowchart_operation_level++;
      if (par.flowchart_debug.val) console.writeln("flowchartOperation " + txt + ", flowchart_operation_level: " + flowchart_operation_level);
      var node = flowchartCheckOperationList("process", txt);
      flowchartCurrent.list.push( node );
      flowchartUpdated();
      node.start_time = Date.now();
      return node;
}

// Special handling for new mask since we want to
// hide suboperations when creating a mask.
function flowchartMaskBegin(txt)
{
      creating_mask = true;

      if (!flowchart_active) {
            return;
      }
      if (global.get_flowchart_data) {
            if (par.flowchart_debug.val) console.writeln("flowchartMaskBegin " + txt);
      }
      var node = flowchartCheckOperationList("mask", txt);
      flowchartStack.push(flowchartCurrent);
      var newFlowchartCurrent = node;
      flowchartCurrent.list.push(newFlowchartCurrent);
      flowchartCurrent = newFlowchartCurrent;
}

function flowchartMaskEnd(txt)
{
      creating_mask = false;

      if (!flowchart_active) {
            return;
      }
      if (global.get_flowchart_data) {
            if (par.flowchart_debug.val) console.writeln("flowchartMaskEnd " + (txt != null ? txt : "null"));
      }
      flowchartCurrent = flowchartStack.pop();
}

function flowchartParentBegin(txt)
{
      if (!flowchart_active) {
            return;
      }
      if (global.get_flowchart_data) {
            if (par.flowchart_debug.val) console.writeln("flowchartParentBegin " + txt);
      }
      flowchartStack.push(flowchartCurrent);
      var newFlowchartCurrent = flowchartNewNode("parent", txt);
      flowchartCurrent.list.push(newFlowchartCurrent);
      flowchartCurrent = newFlowchartCurrent;
}

function flowchartParentEnd(txt)
{
      if (!flowchart_active) {
            return;
      }
      if (global.get_flowchart_data) {
            if (par.flowchart_debug.val) console.writeln("flowchartParentEnd " + (txt != null ? txt : "null"));
      }
      if (flowchartCurrent.type != "parent") {
            util.addWarningStatus("flowchartParentEnd, current node type " + flowchartCurrent.type + " is not parent, node txt:" + flowchartCurrent.txt);
            flowchartCancel();
            return;
      }
      flowchartCurrent = flowchartStack.pop();
      flowchartCleanup(flowchartCurrent);
}

function flowchartChildBegin(txt)
{
      if (!flowchart_active) {
            return;
      }
      if (global.get_flowchart_data) {
            if (par.flowchart_debug.val) console.writeln("flowchartChildBegin " + txt);
      }
      if (flowchartCurrent.type != "parent" && flowchartCurrent.type != "child") {
            util.addWarningStatus("flowchartChildBegin, current node type " + flowchartCurrent.type + " is not parent or child, node txt:" + flowchartCurrent.txt);
            flowchartCancel();
            return;
      }
      flowchartStack.push(flowchartCurrent);
      var newFlowchartCurrent = flowchartNewNode("child", txt);
      flowchartCurrent.list.push(newFlowchartCurrent);
      flowchartCurrent = newFlowchartCurrent;
      flowchartUpdated();
}

function flowchartChildEnd(txt)
{
      if (!flowchart_active) {
            return;
      }
      if (global.get_flowchart_data) {
            if (par.flowchart_debug.val) console.writeln("flowchartChildEnd " + (txt != null ? txt : "null"));
      }
      if (flowchartCurrent.type != "child") {
            util.addWarningStatus("flowchartChildEnd, current node type " + flowchartCurrent.type + " is not child, node txt:" + flowchartCurrent.txt);
            flowchartCancel();
            return;
      }
      flowchartCurrent = flowchartStack.pop();
      flowchartUpdated();
}

// Remove empty nodes
function flowchartCleanupChilds(parent)
{
      var removed = false;
      var list = parent.list;
      var newlist = [];

      // filter list first
      for (var i = 0; i < list.length; i++) {
            var node = list[i];
            if (par.debug.val) {
                  console.writeln("flowchartCleanupChilds: " + node.txt);
            }
            if (node.type != "child") {
                  util.addWarningStatus("flowchartCleanupChilds: node.type " + node.type + " is not child, node txt:" + node.txt);
                  parent.list = [];
                  return false;
            }
            if (node.list.length == 0) {
                  if (node.type == "process") {
                        util.addWarningStatus("flowchartCleanupChilds: node.type == process, node txt:" + node.txt);
                        parent.list = [];
                        return false;
                  }
                  removed = true;
                  continue;
            }
            newlist.push(node);
      }
      parent.list = newlist;
      list = newlist;
      
      // cleanup child nodes
      for (var i = 0; i < list.length; i++) {
            var node = list[i];
            if (flowchartCleanup(node)) {
                  removed = true;
            }
      }
      return removed;
}

// Remove empty nodes
function flowchartCleanup(parent)
{
      var removed = false;
      var list = parent.list;

      // filter list first
      var newlist = [];
      for (var i = 0; i < list.length; i++) {
            var node = list[i];
            if (node.type == "header" && node.list.length == 0) {
                  removed = true;
                  continue;
            } else if (node.type == "parent" && node.list.length == 0) {
                  removed = true;
                  continue;
            } else if (node.type == "mask" && node.list.length == 0) {
                  removed = true;
                  continue;
            }
            newlist.push(node);
      }
      parent.list = newlist;
      list = newlist;

      // cleanup child nodes
      for (var i = 0; i < list.length; i++) {
            var node = list[i];
            if (node.type == "header") {
                  if (flowchartCleanup(node)) {
                        removed = true;
                  }
            } else if (node.type == "parent") {
                  if (flowchartCleanupChilds(node)) {
                        removed = true;
                  }
            } else if (node.type == "mask") {
                  if (flowchartCleanup(node)) {
                        removed = true;
                  }
            }
      }
      return removed;
}

function flowchartPrintList(list, indent)
{
      for (var i = 0; i < list.length; i++) {
            var item = list[i];
            if (item.type == "header") {
                  console.writeln(indent + item.txt + util.get_node_execute_time_str(item));
                  flowchartPrintList(item.list, indent + "  ");
            } else if (item.type == "child") {
                  console.writeln(indent + item.txt + util.get_node_execute_time_str(item));
                  flowchartPrintList(item.list, indent + "  ");
            } else if (item.type == "parent") {
                  console.writeln(indent + item.txt + util.get_node_execute_time_str(item));
                  flowchartPrintList(item.list, indent + "  ");
            } else if (item.type == "mask") {
                  console.writeln(indent + item.txt + util.get_node_execute_time_str(item));
                  flowchartPrintList(item.list, indent + "  ");
            } else {
                  console.writeln(indent + item.txt + util.get_node_execute_time_str(item));
            }
      }
}

function flowchartPrint(rootnode)
{
      if (rootnode == null) {
            console.writeln("No flowchart");
            return;
      }
      console.noteln("Flowchart:");      
      flowchartPrintList(rootnode.list, "  ");
}

function flowchartReset()
{
      console.writeln("flowchartReset");
      flowchart_active = false;
      flowchartCurrent = null;
      flowchartStack = [];
      flowchartOperationList = [];

      global.flowchartData = null;
      global.flowchartActiveId = 0;
      global.flowchartOperationList = [];

      flowchart_operation_level = 0;
}

function flowchartCancel()
{
      console.writeln("flowchartCancel");
      engine.flowchartReset();
}

function flowchartInit(txt)
{
      console.writeln("flowchartInit");
      flowchartCurrent = flowchartNewNode("header", txt);
      flowchartStack = [];
      flowchartOperationList = [];
      if (global.flowchartOperationList.length == 0) {
            // No previous flowchart data, use current flowchart
            console.writeln("flowchartInit, no previous flowchart data");
            global.flowchartData = flowchartCurrent;
      } else {
            // Use previous flowchart data
            console.writeln("flowchartInit, use previous flowchart data");
      }

      global.flowchartActiveId = 0;
      flowchart_operation_level = 0;

      flowchart_active = true;
}

function flowchartDone()
{
      if (!flowchart_active) {
            return;
      }
      console.writeln("flowchartDone");
      flowchart_active = false;
      global.flowchartActiveId = 0;
      global.flowchartData = flowchartCurrent;
      global.flowchartOperationList = flowchartOperationList;

      // Iterate cleanup to remove empty nodes
      for (var i = 0; i < 10; i++) {
            if (!flowchartCleanup(global.flowchartData)) {
                  break;
            }
      }
      
      flowchartUpdated();
}

// Find focal length using telescope name saved into variable current_telescope_name
function find_focal_length()
{
      for (var i = 0; i < telescope_info.length; i++) {
            if (current_telescope_name.indexOf(telescope_info[i][0]) != -1) {
                  console.writeln("Telescope " + telescope_info[i][0] + " focal length " + telescope_info[i][1]);
                  return telescope_info[i][1];
            }
      }
      return 0;
}

// Find pixel size using telescope name saved into variable current_telescope_name
function find_pixel_size()
{
      for (var i = 0; i < telescope_info.length; i++) {
            if (current_telescope_name.indexOf(telescope_info[i][0]) != -1) {
                  console.writeln("Telescope " + telescope_info[i][0] + " pixel size " + telescope_info[i][2]);
                  return telescope_info[i][2];
            }
      }
      return 0;
}

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
      if (par.target_type.val == 'Galaxy') {
            par.image_stretching.val = 'Masked Stretch';
            console.writeln("Galaxy target using " + par.image_stretching.val);
      } else if (par.target_type.val == 'Nebula') {
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
function closeAllWindowsFromArray(arr, keep_base_image = false, print_names = false)
{
      for (var i = 0; i < arr.length; i++) {
            if (print_names) {
                  console.writeln("closeAllWindowsFromArray: " + arr[i]);
            }
            if (util.findWindowStartsWith(arr[i])) {
                  util.closeOneWindowById(arr[i]+"_stars");
                  util.closeOneWindowById(arr[i]+"_starless");
                  util.closeOneWindowById(arr[i]+"_map");
                  util.closeOneWindowById(arr[i]+"_MGC_gradient_model");
                  util.closeOneWindowById(arr[i]+"_model");
                  util.closeOneWindowById(arr[i]+"_highpass");
                  util.closeOneWindowById(arr[i]+"_lowpass");
                  if (!keep_base_image) {
                        util.closeOneWindowById(arr[i]);
                  }
                  if (arr[i].indexOf("Integration_") != -1) {
                        // For possible old images
                        util.closeOneWindowById(arr[i] + "_NB_enhanced");
                        util.closeOneWindowById(arr[i] + "_NB_combine");
                        util.closeOneWindowById(arr[i] + "_NB_max");
                        util.closeOneWindowById(arr[i] + "_processed_starless");
                        util.closeOneWindowById(arr[i] + "_background");
                  }
            }
      }
}

this.closeAllWindowsFromArray = closeAllWindowsFromArray;

// close all windows created by this script
function closeAllWindows(keep_integrated_imgs, force_close)
{
      util.closeTempWindows();

      if (keep_integrated_imgs) {
            var isLRGB = false;
            for (var i = 0; i < global.integration_LRGB_windows.length; i++) {
                  if (util.findWindow(global.integration_LRGB_windows[i]) != null) {
                        // we have LRGB images
                        isLRGB = true;
                        break;
                  }
            }
            if (isLRGB) {
                  closeAllWindowsFromArray(global.integration_LRGB_windows, true);        // keep_base_image = true
                  closeAllWindowsFromArray(global.integration_color_windows, false);
                  var integration_windows = global.integration_LRGB_windows;
            } else {
                  closeAllWindowsFromArray(global.integration_color_windows, true);       // keep_base_image = true
                  closeAllWindowsFromArray(global.integration_LRGB_windows, false);
                  var integration_windows = global.integration_color_windows;
            }
            for (var i = 0; i < global.all_windows.length; i++) {
                  // check that we do not close integration windows
                  if (!util.findFromArray(integration_windows, global.all_windows[i]) &&
                      !util.findFromArray(global.integration_data_windows, global.all_windows[i]))
                  {
                        util.closeOneWindowById(global.all_windows[i]);
                  }
            }
      } else {
            closeAllWindowsFromArray(global.all_windows);
            closeAllWindowsFromArray(global.integration_LRGB_windows);
            closeAllWindowsFromArray(global.integration_color_windows);
            closeAllWindowsFromArray(global.integration_data_windows);
      }
      closeAllWindowsFromArray(global.fixed_windows);
      closeAllWindowsFromArray(global.calibrate_windows);

      util.closeFinalWindowsFromArray(global.final_windows, force_close);

      util.runGarbageCollection();
}

function saveProcessedImage(id, save_id)
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
            util.copyWindow(util.findWindow(id), save_id);
            global.processed_channel_images[global.processed_channel_images.length] = save_id;
      }

      console.writeln("Save processed image " + id + " as " + save_id);

      save_id_list.push([save_id, save_id]);
}

function saveProcessedWindow(id, optional_save_id, optional_extension)
{
      if (id == null) {
            return null;
      }
      if (global.get_flowchart_data) {
            return null;
      }
      if (global.outputRootDir == "") {
            // Ask for a save location
            util.ensureDialogFilePath(optional_save_id ? optional_save_id : id);
            if (global.outputRootDir == "") {
                  util.addCriticalStatus("No output directory, cannot save image " + (optional_save_id ? optional_save_id : id));
                  return null;
            }
            var processedPath = global.outputRootDir;
      } else {
            var processedPath = util.combinePath(global.outputRootDir, global.AutoProcessedDir);
            util.ensureDir(processedPath);
      }
      return util.saveWindowEx(util.ensurePathEndSlash(processedPath), id, util.getOptionalUniqueFilenamePart(), optional_save_id, optional_extension);
}

function saveOutputWindow(id, save_id)
{
      console.writeln("saveOutputWindow, id " + id + " as " + save_id);

      if (id == null) {
            return null;
      }
      var path = global.outputRootDir;
      if (path == "") {
            util.addCriticalStatus("No output directory, cannot save image "+ id);
            return null;
      }

      util.copyWindow(util.findWindow(id), save_id);

      var outputPath = util.combinePath(path, global.AutoOutputDir);
      util.ensureDir(outputPath);

      var saved_name = util.saveWindowEx(util.ensurePathEndSlash(outputPath), save_id, util.getOptionalUniqueFilenamePart());

      util.closeOneWindowById(save_id);

      return saved_name;
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

// Check options for possible conflicting settings
// Nete that function check_engine_processing does similar things a bit earlier
function checkOptions()
{
      var intval = boolToInteger(par.remove_stars_before_stretch.val) + boolToInteger(par.remove_stars_channel.val) + 
                   boolToInteger(par.remove_stars_stretched.val);
      if (intval > 1) {
            util.throwFatalError("Only one remove stars option can be selected.")
      }
      if (par.extra_combine_stars.val && !par.extra_remove_stars.val) {
            util.throwFatalError("Extra combine stars cannot be used during processing if extra remove stars is not set.");
      }
      if (par.local_normalization.val && par.use_fastintegration.val) {
            util.throwFatalError("Local normalization and fast integration cannot be used together.");
      }
}

function setMaskChecked(imgWin, maskWin)
{
      try {
            imgWin.setMask(maskWin);
      } catch(err) {
            console.criticalln("setMask failed: " + err.toString());
            console.criticalln("Image:" + imgWin.mainView.id + ", mask:" + maskWin.mainView.id);
            console.criticalln("Maybe mask is from different data set, different image size/binning or different crop to common areas setting.");
            save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
            util.throwFatalError("Error setting the mask.");
      }
}

function getChangedProcessingOptions()
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

function checkCancel()
{
      if (global.cancel_processing) {
            global.cancel_processing = false;
            util.addProcessingStep("Processing canceled");
            util.throwFatalError("Processing canceled");
      }
}

function copy_processed_image(imgWin, process_name)
{
      if (par.keep_processed_images.val 
          && imgWin 
          && !creating_mask
          && global.is_processing == global.processing_state.processing) 
      {
            // Copy window to new window with process name
            var copy_name = util.ensure_win_prefix(util.mapBadWindowNameChars(process_name) + "_" + imgWin.mainView.id);
            console.writeln("Copy processed image " + imgWin.mainView.id + " to " + copy_name);
            util.copyWindow(imgWin, copy_name);
      }
}

function engine_end_process(node, imgWin = null, process_name = null, copy_image = true)
{
      if (node && !global.get_flowchart_data) {
            if (par.flowchart_debug.val) console.writeln("engine_end_process " + node.txt + ", flowchart_operation_level: " + flowchart_operation_level);
            flowchart_operation_level--;
            node.end_time = Date.now();
      }
      if (imgWin && global.is_processing == global.processing_state.processing) {
            saveProcessingStepToImage(imgWin, "Step " + stepno + ": " + process_name);
            stepno++;
      }
      if (copy_image) {
            copy_processed_image(imgWin, process_name);
      }
      checkCancel();
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

      engine_end_process(null);

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

      engine_end_process(null);

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

      engine_end_process(null);

      return intensityWindow;
}

function extractLchannel(sourceWindow, from_lights)
{
      if (!from_lights) {
            var node = flowchartOperation("ChannelExtraction L");
      } else {
            var node = null;
      }
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

      engine_end_process(node);
      return targetWindow;
}

function extraRescaleImage(imgWin)
{
      addExtraProcessingStep("Rescale image");
      var node = flowchartOperation("PixelMath:rescale");

      if (global.get_flowchart_data) {
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
      P.newImageColorSpace = PixelMath.prototype.RGB;

      imgWin.mainView.beginProcess(UndoFlag_NoSwapFile);

      P.executeOn(imgWin.mainView);

      imgWin.mainView.endProcess();

      engine_end_process(node);
}

function extraNormalizeImage(imgWin)
{
      addExtraProcessingStep("Normalize image");
      var node = flowchartOperation("PixelMath:normalize");

      if (global.get_flowchart_data) {
            return;
      }

      /* Normalize black point and brightness on all channels based on a reference channel.
       * Normalization uses similar PixelMath expressions as Bill Blanshan in his 
       * Narrowband Normalization using Pixnsight Pixelmath script. See more information 
       * in his YouTube channel AnotherAstroChannel.
       */
      switch (par.extra_normalize_channels_reference.val) {
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
                  util.throwFatalError("Invalid extra_normalize_channels_reference value: " + par.extra_normalize_channels_reference.val);
                  break;
      }

      if (par.extra_normalize_channels_mask.val) {
            util.closeOneWindowById("AutoNormalizeMask");
            var mask_win = newMaskWindow(imgWin, "AutoNormalizeMask", false, true);
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
      P.newImageColorSpace = PixelMath.prototype.RGB;
      if (par.extra_normalize_channels_rescale.val) {
            P.rescale = true;
            P.truncate = false;
      }

      imgWin.mainView.beginProcess(UndoFlag_NoSwapFile);

      if (par.extra_normalize_channels_mask.val) {
            setMaskChecked(imgWin, mask_win);
            /* Normalize only light parts of the image. */
            imgWin.maskInverted = false;
      }

      P.executeOn(imgWin.mainView);

      if (par.extra_normalize_channels_mask.val) {
            imgWin.removeMask();
            util.closeOneWindow(mask_win);
      }
      imgWin.mainView.endProcess();

      engine_end_process(node);
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

      printProcessValues(P);
      engine_end_process(null);
}

function findHistogramPeak(win, channel = -1)
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

function getAdjustPoint(win, perc, channel = -1)
{
      // Get image histogram
      var view = win.mainView;
	var histogramMatrix = view.computeOrFetchProperty("Histogram16");

      var pixelCount = 0;
      if (channel >= 0) {
            pixelCount += countPixels(histogramMatrix, channel);
      } else {
            // Count pixels for all channels
            console.writeln("getAdjustPoint, all channels, histogramMatrix.rows " + histogramMatrix.rows);
            for (var i = 0; i < histogramMatrix.rows; i++) {
                  pixelCount += countPixels(histogramMatrix, i);
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
            if (adjustCount > adjustPoint && col != 0 && coladjustCount > 0) {
                  adjustCount = adjustCount - coladjustCount;
                  break;
            }
      }
      var normalizedAdjustPoint = col / histogramMatrix.cols;
      console.writeln(channelText(channel) + " normalized adjust value is " + normalizedAdjustPoint + ", pixel count " + adjustCount);

      return { normalizedAdjustPoint : normalizedAdjustPoint, rows : histogramMatrix.rows, adjustCount : adjustCount };
}

function adjustShadows(win, perc)
{
      console.writeln("Adjust " + perc + "% of shadows from image " + win.mainView.id);

      var node = flowchartOperation("Adjust shadows");
      if (global.get_flowchart_data) {
            return;
      }

      printImageStatistics(win);
      
      var view = win.mainView;

      var adjust = getAdjustPoint(win, perc, -1);
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
      view.beginProcess(UndoFlag_NoSwapFile);

      P.executeOn(view, false);

      view.endProcess();

      printProcessValues(P);
      engine_end_process(node, win, "HistogramTransformation:adjust shadows");

      printImageStatistics(win);
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
            case -1:
                  return 'All';
            default:
                  util.throwFatalError("Invalid channel value: " + channel);
                  return 'unknown';
      }
}

// Find symmetry point as percentage of clipped pixels
function findSymmetryPoint(win, perc, channel = -1)
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
      var normalizedAdjustPoint = col / histogramMatrix.cols;
      console.writeln(channelText(channel) + " symmetry point is " + normalizedAdjustPoint);

      return normalizedAdjustPoint;
}

function newMaskWindow(sourceWindow, name, allow_duplicate_name, clip_shadows_more)
{
      var targetWindow;

      if (sourceWindow.mainView.image.colorSpace != ColorSpace_Gray) {
            /* If we have color files we extract lightness component and
               use it as a mask.
            */
            util.addProcessingStepAndStatusInfo("Create mask by extracting lightness component from color image " + sourceWindow.mainView.id);

            targetWindow = extractLchannel(sourceWindow);

            if (par.force_new_mask.val) {
                  util.closeOneWindowById(name);
            }
      
            util.windowRenameKeepifEx(targetWindow.mainView.id, name, true, allow_duplicate_name);
      } else {
            /* Default mask is the same as stretched image. */
            util.addProcessingStepAndStatusInfo("Create mask from image " + sourceWindow.mainView.id);
            targetWindow = util.copyWindowEx(sourceWindow, name, allow_duplicate_name);
      }

      // addMildBlur(targetWindow); Not sure if this actually helps

      targetWindow.show();

      if (clip_shadows_more) {
            autoContrast(targetWindow, 10, 99.9);
      } else if (!par.skip_mask_contrast.val) {
            autoContrast(targetWindow, 0.1, 99.9);
      }

      runMultiscaleLinearTransformReduceNoise(targetWindow, null, 3);

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
function openImageFiles(filetype, lights_only, json_only, filetype_is_full_caption)
{
      var ofd = new OpenFileDialog;

      ofd.multipleSelections = true;
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

function openDirectoryFiles(filetype, file_filter, lights_only, filetype_is_full_caption)
{
      console.writeln("openDirectoryFiles: " + filetype + " " + file_filter);

      var gdd = new GetDirectoryDialog;

      gdd.initialPath = ppar.lastDir;
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
            var filelist = searchDirectory(gdd.directory + "/" + file_filter_array[i], false /*recursive*/ );
            fileNames = fileNames.concat(filelist);
      }
      if (fileNames.length < 1) {
            console.writeln("No '" + file_filter + "' files found in directory " + gdd.directory);
            return null;
      }
      console.writeln("openDirectoryFiles: fileNames[0]=" + fileNames[0]);

      util.saveLastDir(gdd.directory);

      if (lights_only) {
            return fileNames;
      } else {
            return [ fileNames ];
      }
}

function findMin(arr, idx)
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

function findMax(arr, idx)
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
            if (keyword.name != 'FILTER')  {
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

function copySelectedFITSKeywords(sourceWindow, targetWindow)
{
      var keywords = sourceWindow.keywords;
      for (var i = 0; i < keywords.length; i++) {
            var keyword = keywords[i];
            if (keyword.name == 'AutoIntegrateDrizzle'
                || keyword.name == 'AutoIntegrateMEDFWHM') 
            {
                  // copy keyword
                  console.writeln("Copy keyword " + keyword.name + " to " + targetWindow.mainView.id);
                  targetWindow.keywords = targetWindow.keywords.concat([keyword]);
            }
      }
}

function setSSWEIGHTkeyword(imageWindow, SSWEIGHT) 
{
      var oldKeywords = util.filterKeywords(imageWindow, "SSWEIGHT");
      imageWindow.keywords = oldKeywords.concat([
         new FITSKeyword(
            "SSWEIGHT",
            SSWEIGHT.toFixed(10),
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

function getProcessingInfo()
{
      var header = [];
      var options = [];

      header.push("PixInsight version " + global.pixinsight_version_str);
      header.push(global.autointegrate_version);
      var d = new Date();
      header.push("Processing date " + d.toString());
      var processingOptions = getChangedProcessingOptions();
      if (processingOptions.length > 0) {
            header.push("Processing options:");
            for (var i = 0; i < processingOptions.length; i++) {
                  options.push(processingOptions[i][0] + ": " + processingOptions[i][1]);
            }
      } else {
            header.push("Using default processing options");
      }
      return { header : header, options : options };
}

function saveProcessingStepToImage(imageWindow, step) 
{
      console.writeln("saveProcessingStepToImage to " + imageWindow.mainView.id + ", step " + step);
      util.appenFITSKeyword(
            imageWindow,
            "HISTORY",
            step,
            "AutoIntegrate processing");
}

function saveProcessingHistoryToImage(imageWindow) 
{
      console.writeln("saveProcessingHistoryToImage to " + imageWindow.mainView.id);
      var processing_info = getProcessingInfo();
      for (var i = 0; i < processing_info.header.length; i++) {
            util.appenFITSKeyword(
                  imageWindow,
                  "HISTORY",
                  processing_info.header[i],
                  "AutoIntegrate processing info");
      }
      for (var i = 0; i < processing_info.options.length; i++) {
            util.appenFITSKeyword(
                  imageWindow,
                  "HISTORY",
                  processing_info.options[i],
                  "AutoIntegrate processing option " + (i + 1));
      }
}

function saveExtraProcessingHistoryToImage(imageWindow) 
{
      console.writeln("saveExtraProcessingHistoryToImage to " + imageWindow.mainView.id);
      var extracount = util.getKeywordValue(imageWindow, "AutoIntegrateExtraCount");
      if (extracount == null) {
            extracount = 0;
      } else {
            extracount = parseInt(extracount);
      }
      for (var i = 0; i < global.extra_processing_info.length; i++) {
            util.appenFITSKeyword(
                  imageWindow,
                  "HISTORY",
                  global.extra_processing_info[i],
                  "AutoIntegrate extra processing option " + (extracount + i + 1));
      }
      util.setFITSKeyword(
            imageWindow, 
            "AutoIntegrateExtraCount", 
            (extracount + global.extra_processing_info.length).toString(), 
            "AutoIntegrate extra processing step count");
}

function setDrizzleKeyword(imageWindow, val) 
{
      console.writeln("setDrizzleKeyword to " + val);
      util.setFITSKeyword(
            imageWindow,
            "AutoIntegrateDrizzle",
            val.toString(),
            "AutoIntegrate drizzle scale");
}

function setMEDFWHMKeyword(imageWindow, val) 
{
      console.writeln("setMEDFWHMKeyword to " + val);
      util.setFITSKeyword(
            imageWindow,
            "AutoIntegrateMEDFWHM",
            val.toString(),
            "Median FWHM of images");
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
function runImageIntegrationBiasDarks(images, name, type)
{
      console.writeln("runImageIntegrationBiasDarks, images[0] " + images[0][1] + ", name " + name);
      var node = flowchartOperation("ImageIntegration:" + type);

      if (global.get_flowchart_data) {
            return flowchartNewIntegrationImage(images[0][1], name);
      }

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
      P.subtractPedestals = false;

      P.executeGlobal();

      util.closeOneWindowById(P.highRejectionMapImageId);
      util.closeOneWindowById(P.lowRejectionMapImageId);
      util.closeOneWindowById(P.slopeMapImageId);

      var new_name = util.windowRename(P.integrationImageId, name);

      printProcessValues(P);
      engine_end_process(node);

      console.writeln("runImageIntegrationBiasDarks, integrated image " + new_name);

      return new_name;
}

// Generate SuperBias from integrated bias image
function runSuberBias(biasWin)
{
      console.writeln("runSuberBias, bias " + biasWin.mainView.id);
      var node = flowchartOperation("Superbias");

      if (global.get_flowchart_data) {
            return flowchartNewImage(biasWin, ppar.win_prefix + "AutoMasterSuperBias");
      }

      var P = new Superbias;

      biasWin.mainView.beginProcess(UndoFlag_NoSwapFile);

      P.executeOn(biasWin.mainView, false);

      biasWin.mainView.endProcess();

      var targetWindow = ImageWindow.activeWindow;

      util.windowRenameKeepif(targetWindow.mainView.id, ppar.win_prefix + "AutoMasterSuperBias", true);

      printProcessValues(P);
      engine_end_process(node, biasWin, "Superbias", false);
      
      return targetWindow.mainView.id
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
      var imageWin = util.openImageWindowFromFile(images[0][1]);
      console.writeln("matchMasterToImages, images[0][1] " + images[0][1]);
      console.writeln("matchMasterToImages, imageWin.width " + imageWin.mainView.image.width + ", imageWin.height "+ imageWin.mainView.image.height);

      /* Loop through master files and pick the matching one.
       */
      var matchingMaster = null;
      for (var i = 0; i < masterPath.length; i++) {
            var masterWin = util.openImageWindowFromFile(masterPath[i]);
            console.writeln("matchMasterToImages, check masterPath[ " + i + "] " + masterPath[i]);
            console.writeln("matchMasterToImages, masterWin.width " + masterWin.mainView.image.width + ", masterWin.height " + masterWin.mainView.image.height);
            if (masterWin.mainView.image.width == imageWin.mainView.image.width 
                && masterWin.mainView.image.height == imageWin.mainView.image.height)
            {
                  /* We have a match. */
                  matchingMaster = masterPath[i];
                  console.writeln("matchMasterToImages, found match " + matchingMaster);
            }
            util.closeOneWindow(masterWin);
            if (matchingMaster != null) {
                  break;
            }
      }
      util.closeOneWindow(imageWin);

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
      var node = flowchartOperation("ImageCalibration:darks");

      if (global.get_flowchart_data) {
            return fileNames;
      }

      var P = new ImageCalibration;
      P.targetFrames = fileNamesToEnabledPath(fileNames); // [ enabled, path ];
      P.outputPedestalMode = ImageCalibration.prototype.OutputPedestal_Auto;
      P.enableCFA = is_color_files && par.debayer_pattern.val != 'None';
      P.cfaPattern = global.debayerPattern_enums[global.debayerPattern_values.indexOf(par.debayer_pattern.val)];
      P.masterBiasEnabled = true;
      P.masterBiasPath = matchMasterToImages(P.targetFrames, masterbiasPath);
      P.masterDarkEnabled = false;
      P.masterFlatEnabled = false;
      P.outputDirectory = global.outputRootDir + global.AutoOutputDir;
      P.overwriteExistingFiles = true;

      P.executeGlobal();

      printProcessValues(P);
      engine_end_process(node);

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
      var node = flowchartOperation("ImageCalibration:flats");

      if (global.get_flowchart_data) {
            return imagesEnabledPathToFileList(images);
      }

      var P = new ImageCalibration;
      P.targetFrames = images; // [ // enabled, path ];
      P.outputPedestalMode = ImageCalibration.prototype.OutputPedestal_Auto;
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

      printProcessValues(P);
      engine_end_process(node);

      return fileNamesFromOutputData(P.outputData);
}

// Run image integration on flat frames
// If you have stars in flat frames, set
// P.pcClipLow and P.pcClipHigh to a 
// tiny value like 0.010
function runImageIntegrationFlats(images, name)
{
      console.writeln("runImageIntegrationFlats, images[0] " + images[0][1] + ", name " + name);
      var node = flowchartOperation("ImageIntegration:flats");

      if (global.get_flowchart_data) {
            return flowchartNewIntegrationImage(images[0][1], name);
      }

      var P = new ImageIntegration;
      switch (par.integration_combination.val) {
            case 'Average':
                  P.combination = ImageIntegration.prototype.Average;
                  break;
            case 'Median':
                  P.combination = ImageIntegration.prototype.Median;
                  break;
            case 'Minimum':
                  P.combination = ImageIntegration.prototype.Minimum;
                  break;
            case 'Maximum':
                  P.combination = ImageIntegration.prototype.Maximum;
                  break;
            default:
                  util.throwError("runImageIntegrationFlats, unknown combination " + par.integration_combination.val);
      }
            
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
      P.subtractPedestals = false;

      P.executeGlobal();

      util.closeOneWindowById(P.highRejectionMapImageId);
      util.closeOneWindowById(P.lowRejectionMapImageId);
      util.closeOneWindowById(P.slopeMapImageId);

      var new_name = util.windowRename(P.integrationImageId, name);

      printProcessValues(P);
      engine_end_process(node);

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
      var node = flowchartOperation("ImageCalibration:lights");

      if (global.get_flowchart_data) {
            return imagesEnabledPathToFileList(images);
      }

      var P = new ImageCalibration;
      P.targetFrames = images; // [ enabled, path ];
      P.enableCFA = is_color_files && par.debayer_pattern.val != 'None';
      P.cfaPattern = global.debayerPattern_enums[global.debayerPattern_values.indexOf(par.debayer_pattern.val)];
      if (par.auto_output_pedestal.val) {
            console.writeln("runCalibrateLights, auto output pedestal");
            P.outputPedestalMode = ImageCalibration.prototype.OutputPedestal_Auto;
      } else {
            console.writeln("runCalibrateLights, literal output pedestal " + par.output_pedestal.val);
            P.outputPedestalMode = ImageCalibration.prototype.OutputPedestal_Literal;
            P.outputPedestal = par.output_pedestal.val;
      }
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

      printProcessValues(P);
      engine_end_process(node);

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
function getDefectInfo(fileNames, groupname)
{
      console.writeln("getDefectInfo, fileNames[0]=" + fileNames[0] + ", groupname=" + groupname);
      var LDD_images = init_images();
      for (var i = 0; i < fileNames.length; i++) {
            append_image_for_integrate(LDD_images.images, fileNames[i]);
      }
      // Run image integration as-is to make line defects more visible
      console.writeln("getDefectInfo, runImageIntegration");

      flowchartParentBegin("Fix linear defects " + groupname);
      var LDD_id = runImageIntegration(LDD_images, "LDD", false, groupname ? "Group " + groupname : null);
      flowchartParentEnd("Fix linear defects " + groupname);

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

      util.closeOneWindowById(LDD_id);

      return { ccFileNames: fileNames, ccDefects: defects };
}

function runLinearDefectDetection(fileNames)
{
      util.addProcessingStepAndStatusInfo("Run Linear Defect Detection");
      var node = flowchartOperation("LinearDefectDetection");
      console.writeln("runLinearDefectDetection, fileNames[0]=" + fileNames[0]);

      if (global.get_flowchart_data) {
            return [ { ccFileNames: fileNames, ccDefects: null } ];
      }
      var ccInfo = [];

      // Group images by telescope and resolution
      var LDD_groups = getLDDgroups(fileNames);

      if (LDD_groups.length > 4) {
            util.throwFatalError("too many LDD groups: " + LDD_groups.length);
      }

      // For each group, generate own defect information
      for (var i = 0; i < LDD_groups.length; i++) {
            console.writeln("runLinearDefectDetection, group " + i + ", " + LDD_groups[i].groupname);
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
                  var ccGroupInfo = getDefectInfo(LDD_groups[i].groupfiles, LDD_groups.length > 1 ? LDD_groups[i].groupname : null);
                  global.LDDDefectInfo[global.LDDDefectInfo.length] = { groupname: LDD_groups[i].groupname, defects: ccGroupInfo.ccDefects }
            } else {
                  // use existing defect info
                  var ccGroupInfo = { ccFileNames: LDD_groups[i].groupfiles, ccDefects: global.LDDDefectInfo[j].defects };
            }
            ccInfo[ccInfo.length] = ccGroupInfo;
      }
      engine_end_process(node);

      return ccInfo;
}

function addNewPostfixToFileName(fileName, postfix)
{
      return File.extractDrive(fileName) + File.extractDirectory(fileName) + File.extractName(fileName) + postfix + File.extractExtension(fileName);
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

// resample_val is scale factor to get the desired dimension
function runResample(imageWindow, resample_val)
{
      var P = new Resample;
      P.xSize = resample_val;
      P.ySize = resample_val;
      P.mode = Resample.prototype.RelativeDimensions;
      P.absoluteMode = Resample.prototype.ForceWidthAndHeight;
      P.xResolution = 72.000;
      P.yResolution = 72.000;
      P.metric = false;
      P.forceResolution = false;
      P.interpolation = Resample.prototype.Auto;
      P.clampingThreshold = 0.30;
      P.smoothness = 1.50;
      P.gammaCorrection = false;
      P.noGUIMessages = true;

      imageWindow.mainView.beginProcess(UndoFlag_NoSwapFile);

      P.executeOn(imageWindow.mainView, false);
      
      imageWindow.mainView.endProcess();
}

function runBinning(imageWindow, resample_val)
{
      var P = new IntegerResample;
      P.zoomFactor = -resample_val;
      P.noGUIMessages = true;

      imageWindow.mainView.beginProcess(UndoFlag_NoSwapFile);

      P.executeOn(imageWindow.mainView, false);
      
      imageWindow.mainView.endProcess();
}

// binning_values_index: 1 color, 2 = L + color (0 = None but not checked here)
function runBinningOnFiles(fileNames, binning_values_index, resample_val, filtered_files, renamedFileNames, postfix)
{
      if (global.outputRootDir == "" || util.pathIsRelative(global.outputRootDir)) {
            /* Get path to current directory. */
            var outputRootDir = util.parseNewOutputDir(fileNames[0], global.outputRootDir);
            console.writeln("runBinningOnFiles, outputRootDir ", outputRootDir);
      } else {
            var outputRootDir = global.outputRootDir;
      }
      var newFileNames = [];
      var outputDir = outputRootDir + global.AutoOutputDir;
      var outputExtension = ".xisf";

      if (postfix == null) {
            postfix = getBinningPostfix();
      }
      
      console.writeln("runBinningOnFiles input[0] " + fileNames[0]);

      for (var i = 0; i < fileNames.length; i++) {
            var do_binning = true;
            if (binning_values_index == 1) {
                  // Binning is done only for color channels, check if this is luminance file
                  if (isLuminanceFile(filtered_files, fileNames[i])) {
                        do_binning = false;
                  }
            }
            if (do_binning) {
                  // Open source image window from a file
                  var imageWindows = ImageWindow.open(fileNames[i]);
                  if (!imageWindows || imageWindows.length == 0) {
                        util.throwFatalError("*** runBinningOnFiles Error: imageWindows.length: " + imageWindows.length);
                  }
                  var imageWindow = imageWindows[0];
                  if (imageWindow == null) {
                        util.throwFatalError("*** runBinningOnFiles Error: Can't read file: " + fileNames[i]);
                  }

                  runBinning(imageWindow, resample_val);

                  engine_end_process(null, imageWindow, "Binning", false);

                  updateBinningKeywords(imageWindow, resample_val);
            
                  if (renamedFileNames == null) {
                        var filePath = generateNewFileName(fileNames[i], outputDir, postfix, outputExtension);
                  } else {
                        var filePath = renamedFileNames[i];
                  }

                  // Save window
                  if (!writeImage(filePath, imageWindow)) {
                        util.throwFatalError("*** runBinningOnFiles Error: Can't write output image: " + imageWindow.mainView.id + ", file: " + filePath);
                  }
                  // Close window
                  util.closeOneWindow(imageWindow);   
            } else {
                  // keep the old file name
                  var filePath = fileNames[i];
            }

            newFileNames[newFileNames.length] = filePath;
      }

      console.writeln("runBinningOnFiles output[0] " + newFileNames[0]);

      return newFileNames;
}

function runBinningOnLights(fileNames, filtered_files)
{
      util.addStatusInfo("Do " + par.binning_resample.val + "x" + par.binning_resample.val + " binning using IntegerResample on light files");
      util.addProcessingStep("Do " + par.binning_resample.val + "x" + par.binning_resample.val + " binning using IntegerResample on light files, output *" + getBinningPostfix() + ".xisf");
      var node = flowchartOperation("Binning");

      var newFileNames = runBinningOnFiles(fileNames, par.binning.val, par.binning_resample.val, filtered_files);

      engine_end_process(node);

      return newFileNames;
}

function runGradientCorrectionOnLights(fileNames)
{
      var newFileNames = [];
      var outputDir = global.outputRootDir + global.AutoOutputDir;
      var postfix = "_GC";
      var outputExtension = ".xisf";

      util.addProcessingStepAndStatusInfo("Run gradient correction on light files using " + getGradientCorrectionName());
      var node = flowchartOperation(getGradientCorrectionName());

      if (global.get_flowchart_data) {
            return fileNames;
      }

      console.writeln("runGradientCorrectionOnLights output *" + postfix + ".xisf");
      console.writeln("runGradientCorrectionOnLights input[0] " + fileNames[0]);

      for (var i = 0; i < fileNames.length; i++) {
            // Open source image window from a file
            var imageWindows = ImageWindow.open(fileNames[i]);
            if (!imageWindows || imageWindows.length == 0) {
                  util.throwFatalError("*** runGradientCorrectionOnLights Error: imageWindows.length: " + imageWindows.length);
            }
            var imageWindow = imageWindows[0];
            if (imageWindow == null) {
                  util.throwFatalError("*** runGradientCorrectionOnLights Error: Can't read file: " + fileNames[i]);
            }
            
            // Run gradient correction which creates a new window with postfix extension

            var new_id = runGradientCorrectionEx(imageWindow, false, postfix, true);
            var new_win = util.findWindow(new_id);
            if (new_win == null) {
                  util.throwFatalError("*** runGradientCorrectionOnLights Error: could not find window: " + new_id);
            }
            
            // Source image window is not needed any more
            util.closeOneWindow(imageWindow);

            var filePath = generateNewFileName(fileNames[i], outputDir, postfix, outputExtension);

            // Save GC window
            if (!writeImage(filePath, new_win)) {
                  util.throwFatalError("*** runGradientCorrectionOnLights Error: Can't write output image: " + new_id);
            }
            // Close GC window
            util.closeOneWindow(new_win);

            newFileNames[newFileNames.length] = filePath;
      }

      console.writeln("runGradientCorrectionOnLights output[0] " + newFileNames[0]);

      engine_end_process(node);

      return newFileNames;
}

function runCosmeticCorrection(fileNames, defects, color_images)
{
      if (defects && defects.length > 0) {
            util.addStatusInfo("Run CosmeticCorrection, number of line defects to fix is " + defects.length);
            util.addProcessingStep("Run CosmeticCorrection, output *_cc.xisf, number of line defects to fix is " + defects.length);
      } else {
            util.addStatusInfo("Run CosmeticCorrection");
            util.addProcessingStep("Run CosmeticCorrection, output *_cc.xisf, no line defects to fix");
      }
      console.writeln("fileNames[0] " + fileNames[0]);
      var node = flowchartOperation("CosmeticCorrection");

      if (global.get_flowchart_data) {
            return fileNames;
      }

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
            console.criticalln(err.toString());
            util.throwFatalError("CosmeticCorrection failed, maybe a problem in some of the files or in output directory´" + P.outputDir);
      }
      
      printProcessValues(P);
      engine_end_process(node);

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
            if (par.outliers_method.val == 'Two sigma') {
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
            if (isNaN(measurements[i][index])) {
                  console.writeln(name + " NaN value, setting zero value in file " + measurements[i][fileindex]);
                  measurements[i][index] = 0;
            }
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

function filterLimit(measurements, name, index_info, limit_val, fileindex, filtered_files)
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

function getSubframeSelectorMeasurements(fileNames)
{
      console.writeln("run SubframeSelector on " + fileNames.length + " files");
      if (par.use_fastintegration.val && par.fastintegration_fast_subframeselector.val) {
            var node = flowchartOperation("Fast SubframeSelector");
      } else {
            var node = flowchartOperation("SubframeSelector");
      }

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

      console.writeln("SubframeSelector completed");

      printProcessValues(P);
      engine_end_process(node);

      return P.measurements;
}

function filterBadPSFImages(fileNames)
{
      var newFileNames = [];
      var indexPSFSignal = 7;

      util.addProcessingStep("Filter bad PSF images");
      console.writeln("fileNames[0]=" + fileNames[0]);

      var measurements = getSubframeSelectorMeasurements(fileNames);

      for (var i = 0; i < measurements.length; i++) {
            if (measurements[i][indexPSFSignal] >= par.ssweight_limit.val && !isNaN(measurements[i][indexPSFSignal])) {
                  newFileNames[newFileNames.length] = fileNames[i];
            } else {
                  console.noteln("Skipped bad PSF " + measurements[i][indexPSFSignal] +  " in image " + fileNames[i]);
            }
      }

      console.noteln("Accepted " + newFileNames.length + "/" + fileNames.length + " images");

      return newFileNames;
}

function getImagePSF(imgWin)
{
      var indexFWHM = 5;

      console.writeln("Calculate PSF from image " + imgWin.mainView.id);

      var copy_win = util.copyWindowEx(imgWin, "AutoIntegrateTemp", true);

      var fname = File.systemTempDirectory + "/AutoIntegrateTemp.xisf";
      console.writeln("getImagePSF input file " + fname);
      if (!copy_win.saveAs(fname, false, false, false, false)) {
            util.closeOneWindowById(copy_win.mainView.id);
            save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
            util.throwFatalError("Failed to save image to get image PSF: " + fname);
      }
      util.closeOneWindowById(copy_win.mainView.id);

      console.writeln("Using saved image " + fname);

      var measurements = getSubframeSelectorMeasurements([ fname ]);

      return measurements[0][indexFWHM];
}

function findFilterIndex(name)
{
      switch (name) {
            case 'FWHM':
                  return [ 5, true ];
            case 'Eccentricity':
                  return [ 6, true ];;
            case 'PSFSignal':
                  return [ 7, false ];
            case 'PSFPower':
                  return [ 8, false ];
            case 'SNR':
                  return [ 9, false ];
            case 'Stars':
                  return [ 14, false ];
            default:
                  util.throwFatalError("Unknown measure filtering name " + name);
                  return [ 0, false ];
      }
}

// If weight_filtering == true and treebox_filtering == true
//    returns array of [ filename, checked, weight ]
// else
//    returns array of [ filename, weight ]
function subframeSelectorMeasure(fileNames, weight_filtering, treebox_filtering)
{
      console.writeln("subframeSelectorMeasure, input[0] " + fileNames[0]);

      var indexPath = 3;
      var indexWeight = 4;
      var indexFWHM = 5;
      var indexEccentricity = 6;
      var indexPSFSignal = 7;
      var indexPSFPower = 8;
      var indexStars = 14;

      if (global.get_flowchart_data) {
            if (par.use_fastintegration.val && par.fastintegration_fast_subframeselector.val) {
                  var node = flowchartOperation("Fast SubframeSelector");
            } else {
                  var node = flowchartOperation("SubframeSelector");
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
                        var saved_name = File.extractName(global.saved_measurements[j][indexPath]);
                        var new_name = File.extractName(fileNames[i]);
                        if (saved_name.startsWith(new_name)) {
                              measurements[measurements.length] = global.saved_measurements[j];
                              measurements[measurements.length-1][indexPath] = fileNames[i];
                              found = true;
                              break;
                        }
                  }
                  if (!found) {
                        // something went wrong, list are not compatible, generate new ones
                        console.writeln("subframeSelectorMeasure, global.saved_measurements[0][indexPath] " + global.saved_measurements[0][indexPath]);
                        console.writeln("subframeSelectorMeasure, saved measurements not found for " + fileNames[i]);
                        measurements = null;
                        break;
                  }
            }
      }
      if (measurements == null) {
            // collect new measurements
            console.writeln("subframeSelectorMeasure, collect measurements");
            global.saved_measurements = getSubframeSelectorMeasurements(fileNames);
            measurements = global.saved_measurements;
      } else {
            if (par.use_fastintegration.val && par.fastintegration_fast_subframeselector.val) {
                  var node = flowchartOperation("Fast SubframeSelector");
            } else {
                  var node = flowchartOperation("SubframeSelector");
            }
            engine_end_process(node);     // Update procesing time
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
                        SSWEIGHT = measurements[i][indexPSFSignal];
                        if (isNaN(SSWEIGHT)) {
                              SSWEIGHT = 0;
                              measurements[i][indexPSFSignal] = 0;
                        }
                        break;
                  case 'PSF Signal scaled':
                        if (global.pixinsight_version_num < 1080810) {
                              util.throwFatalError("Option " + par.use_weight.val + " is not supported in this version of PixInsight");
                        }
                        SSWEIGHT = 99 * getScaledValPos(measurements[i][indexPSFSignal], PSFSignalMin, PSFSignalMax) + 1;
                        break;
                  case 'FWHM scaled':
                        SSWEIGHT = 99 * getScaledValNeg(measurements[i][indexFWHM], FWHMMin, FWHMMax) + 1;
                        filter_high = true;
                        break;
                  case 'Eccentricity scaled':
                        SSWEIGHT = 99 * getScaledValNeg(measurements[i][indexEccentricity], EccentricityMin, EccentricityMax) + 1;
                        filter_high = true;
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
            if (isNaN(SSWEIGHT)) {
                  SSWEIGHT = 0;
            }
            util.addProcessingStep("SSWEIGHT " + SSWEIGHT + ", FWHM " + FWHM + ", Ecc " + Eccentricity + ", SNR " + SNRWeight + 
                              ", Stars " + measurements[i][indexStars] + ", PSFSignal " + measurements[i][indexPSFSignal] + ", PSFPower " + measurements[i][indexPSFPower] +
                              ", " + measurements[i][indexPath]);
            // set SSWEIGHT to indexWeight column
            measurements[i][indexWeight] = SSWEIGHT;
      }
      console.writeln("SSWEIGHTMin " + findMin(measurements, indexWeight) + " SSWEIGHTMax " + findMax(measurements, indexWeight));
      measurements = filterOutliers(measurements, "SSWEIGHT", indexWeight, 'min', par.outliers_ssweight.val, indexPath, filtered_files);
      measurements = filterLimit(measurements, "SSWEIGHT", [ indexWeight, filter_high ], par.ssweight_limit.val, indexPath, filtered_files);
      if (par.filter_limit1_type.val != 'None') {
            measurements = filterLimit(measurements, par.filter_limit1_type.val, findFilterIndex(par.filter_limit1_type.val), par.filter_limit1_val.val, indexPath, filtered_files);
      }
      if (par.filter_limit2_type.val != 'None') {
            measurements = filterLimit(measurements, par.filter_limit2_type.val, findFilterIndex(par.filter_limit2_type.val), par.filter_limit2_val.val, indexPath, filtered_files);
      }

      /* Collect FWHM values to a separat array to find median FWHM.*/
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
            medianFWHM = FWHMValues[medianIndex];
      } else if (FWHMValues.length > 0) {
            medianFWHM = FWHMValues[0];
      } else {
            medianFWHM = null;
      }

      if (medianFWHM != null) {
            console.writeln("AutoIntegrateMEDFWHM " + medianFWHM);
      } else {
            console.writeln("AutoIntegrateMEDFWHM not available, measurements.length " + measurements.length + ", FWHMValues.length " + FWHMValues.length);
      }

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
      if (par.use_fastintegration.val && par.fastintegration_fast_subframeselector.val) {
            util.addProcessingStepAndStatusInfo("Run SubframeSelector on subset of files");
            var fast_measure = true;
            // Measure only 10 first images
            var measured_files = fileNames.slice(0, 10);
            // save rest of files
            var rest_files = fileNames.slice(10);
      } else {
            util.addProcessingStepAndStatusInfo("Run SubframeSelector");
            var fast_measure = false;
            var measured_files = fileNames;
      }
      console.writeln("input[0] " + fileNames[0]);

      var ssWeights = engine.subframeSelectorMeasure(measured_files, par.image_weight_testing.val, false);
      // SubframeSelectorOutput(P.measurements); Does not write weight keyword

      if (global.get_flowchart_data) {
            var names_and_weights = { filenames: fileNames, ssweights: ssWeights, postfix: "_a" };
            return names_and_weights;
      }

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
                        if (!imageWindows || imageWindows.length == 0) {
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
                              util.closeOneWindow(imageWindow);
                              console.writeln(
                              "*** Error: Can't write output image: ", newFilePath
                              );
                              continue;
                        }         
                        util.closeOneWindow(imageWindow);
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

      if (par.use_fastintegration.val && par.fastintegration_fast_subframeselector.val) {
            var ssweight_limit = 0;
      } else {
            var ssweight_limit = par.ssweight_limit.val;
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
            if (0) {
                  // Why this piece of code to disable HT?
                  var ext = '.' + filePath.split('.').pop();
                  console.writeln("File " +  filePath + " ext " +  ext);
                  if (ext.toUpperCase() == '.FIT' || ext.toUpperCase() == '.XISF') {
                        run_HT = true;
                  } else {
                        run_HT = false;
                  }
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
                  if (ssweight >= ssweight_limit) {
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
                  } else {
                        console.writeln("below ssweight limit " + par.ssweight_limit.val + ", skip image");
                        accept_file = false;
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
function updateFilesInfo(parent, files, filearr, filter, filename_postfix)
{
      console.writeln("updateFilesInfo, " + filearr.length + " " + filter + " files");

      // Check if we have user selected reference image for the channel.
      var refImage = null;
      for (var i = 0; i < global.user_selected_reference_image.length && !global.get_flowchart_data; i++) {
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
                  insert_image_for_integrate(files.images, filearr[i].name, filearr[i].ssweight);
            } else {
                  append_image_for_integrate(files.images, filearr[i].name, filearr[i].ssweight);
            }
            files.exptime += filearr[i].exptime;
      }
      if (automatic_reference_image != null && gui && !global.get_flowchart_data) {
            console.writeln("Set automatic reference image " + automatic_reference_image + " for filter " + filter + ", ssweight=" + files.best_ssweight);
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

      if (global.get_flowchart_data && !File.exists(filePath)) {
            return [];
      }

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
      if (info == null) {
            util.throwFatalError("Unable to open input file: " + filePath);
      }
      if (info.length <= 0) {
            util.throwFatalError("Unable to open input file: " + filePath);
      }
      if (F.canStoreKeywords) {
            keywords = f.keywords;
      }
      f.close();

      return keywords;
}

// Get filter keywpord for image. If filter is not found from FILTER keyword
// or file name, default to color files.
// Parameters:
// filter: FILTER keyword value or null
// filePath: file path
// filename_postfix: file name postfix
function getFilterKeywordForImage(filter, filePath, filename_postfix)
{
      /* 1. Check Hubble filter
       */
      if (filter != null && filter.trim().substring(0, 1) == 'F') {
            // Hubble FILTER starts with F, force using file name
            filter = null;
      }
      /* 2. No filter keyword, check file name
       */
      if (filter == null || par.force_file_name_filter.val) {
            // No filter keyword. Try mapping based on file name.
            filter = filterByFileName(filePath, filename_postfix);
            if (filter == null  && global.get_flowchart_data) {
                  filter = filterByFileName(filePath, '');
            }
      }
      /* 3. No filter keyword or name found, default to color files
       */
      if (filter == null) {
            filter = 'Color';
      }
      /* 4. With monochrome settings, set all as luminance
       */
      if (par.monochrome_image.val) {
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

// Filter files based on filter keyword/file name.
// files array can be either simple file name array
// or treeboxfiles array having [ filename, checked, weight ] members
function getFilterFiles(files, pageIndex, filename_postfix, flochart_files = false)
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
      var maxwidth = 0;
      var maxheigth = 0;
      var firstDate = null;
      var lastDate = null;

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
            var date_obs = null;
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

            /* Go through keywords in the file.
             */
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
                              current_telescope_name = value;
                              break;
                        case "NAXIS1":
                              console.writeln("NAXIS1=" + value);
                              var imgwidth = parseFloat(value);
                              if (minwidth == 0 || imgwidth < minwidth) {
                                    minwidth = imgwidth;
                              }
                              if (imgwidth > maxwidth) {
                                    maxwidth = imgwidth;
                              }
                              break;
                        case "NAXIS2":
                              console.writeln("NAXIS2=" + value);
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
                              console.writeln(keywords[j].name + "=" + value);
                              exptime = parseFloat(value);
                              break;
                        case "DATE-OBS":
                              console.writeln(keywords[j].name + "=" + value);
                              date_obs = value;
                              break;
                        default:
                              break;
                  }
            }

            /* Resolve image filter.
             */
            var filter_keyword = getFilterKeywordForImage(filter, filePath, filename_postfix);

            var file_info = { name: filePath, ssweight: ssweight, exptime: exptime, filter: filter, checked: checked,
                              best_image: treebox_best_image, reference_image: treebox_reference_image,
                              width: imgwidth, heigth: imgheigth, date_obs: date_obs, isFirstDate: false, isLastDate: false };
            if (date_obs != null) {
                  if (firstDate == null || date_obs < firstDate) {
                        console.writeln("firstDate " + date_obs);
                        firstDate = date_obs;
                        engine.firstDateFileInfo = file_info;
                  }
                  if (lastDate == null || date_obs > lastDate) {
                        console.writeln("lastDate " + date_obs);
                        lastDate = date_obs;
                        engine.lastDateFileInfo = file_info;
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
                  // Stop as soon as we have collected enough files for flowchart
                  if (allfiles.C.length >= 3) {
                        break;
                  }
                  // Harder for channel files as we may have random order
                  // We just select all files
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
      } else if (luminance && (!rgb && !narrowband && !par.monochrome_image.val)) {
            error_text = "Error, with luminance files RGB or narrowband channels must be given";
      }

      return { allfilesarr : allfilesarr,
               luminance : luminance, 
               rgb : rgb, 
               narrowband : narrowband,
               color_files : color_files,
               ssweight_set : ssweight_set,
               error_text: error_text,
               firstDateFileInfo: engine.firstDateFileInfo,
               lastDateFileInfo: engine.lastDateFileInfo,
               minwidth : minwidth,
               minheigth : minheigth,
               maxwidth : maxwidth,
               maxheigth : maxheigth
      };
}

function getImagetypFiles(files)
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
      is_narrowband_files = filter_info.narrowband;
      is_rgb_files = filter_info.rgb;
      process_narrowband = is_narrowband_files;
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

function printMissingNarrowbandMappingError()
{
      if (is_rgb_files && is_narrowband_files) {
            console.criticalln("There are both RGB and narrowband files");
            console.criticalln("Specify narrowband mapping or use Ha or Narrowband to RGB mapping");
      } else {
            console.criticalln("There are narrowband files so narrowband mapping is used");
      }
      console.criticalln("Selected narrowband mapping is: " + par.narrowband_mapping.val);
      console.criticalln("- R: " + par.custom_R_mapping.val);
      console.criticalln("- G: " + par.custom_G_mapping.val);
      console.criticalln("- B: " + par.custom_B_mapping.val);
}

function ensureLightImages(ch, check_allfilesarr)
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
            util.closeTempWindows();
            printMissingNarrowbandMappingError();
            console.criticalln("There are no " + ch + " images, but there are " + filter_files + " images");
            util.throwFatalError("There are no " + ch + " images that are needed for PixelMath mapping");
      }
}

function findWindowAutoContinuePrefix(to_id, check_basename)
{
      if (ppar.autocontinue_win_prefix != "" 
            && ppar.autocontinue_win_prefix != ppar.win_prefix)
      {
            // Try replacing autocontinue prefix with normal prefix
            if (to_id.startsWith(ppar.autocontinue_win_prefix)) {
                  var basename = to_id.substring(ppar.autocontinue_win_prefix.length);
                  var win = util.findWindow(ppar.win_prefix + basename);
                  if (win != null) {
                        return win;
                  }
            }
            // Try replacing normal prefix with autocontinue prefix
            if (to_id.startsWith(ppar.win_prefix)) {
                  var basename = to_id.substring(ppar.win_prefix.length);
                  var win = util.findWindow(ppar.autocontinue_win_prefix + basename);
                  if (win != null) {
                        return win;
                  }
            }
      }
      return null;
}

function ensureLightImageWindow(to_id, ext)
{
      console.writeln("ensureLightImageWindow " + to_id + ", ext " + ext);
      if (findWindowNoPrefixIf(to_id, global.run_auto_continue) == null
          && findWindowAutoContinuePrefix(to_id, global.run_auto_continue) == null
          && findWindowNoPrefixIf(to_id + ext, global.run_auto_continue) == null)
      {
            util.closeTempWindows();
            printMissingNarrowbandMappingError();
            util.throwFatalError("Could not find image window " + to_id + " that is needed for PixelMath mapping");
      }
}

/* Replace tag "from" with real image name "to" with "ext" added to the end (H -> Integration_H_map) . 
 * Images names listed in the mapping are put into images array without _map added (Integration_H).
 */
function replaceMappingImageNamesExt(mapping, from, to, ext, images, check_allfilesarr)
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
            } else if (images != null) {
                  ensureLightImageWindow(to, ext);
                  add_missing_image(images, to);
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
                              } else if (images != null) {
                                    var to_id = to;
                                    ensureLightImageWindow(to_id, ext);
                                    add_missing_image(images, to_id);
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
function replaceMappingImageNames(mapping, from, to, images, check_allfilesarr)
{
      var new_mapping = replaceMappingImageNamesExt(mapping.mapping, from, to, "_map", images, check_allfilesarr);
      if (new_mapping != mapping.mapping) {
            // We added filter "from" to the mapping
            mapping.filters += from;
      }
      mapping.mapping = new_mapping;
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
                  var mapping = { mapping: par.custom_R_mapping.val, filters: "" };
                  break;
            case 'G':
                  var mapping = { mapping: par.custom_G_mapping.val, filters: "" };
                  break;
            case 'B':
                  var mapping = { mapping: par.custom_B_mapping.val, filters: "" };
                  break;
            case 'L':
                  var mapping = { mapping: par.custom_L_mapping.val, filters: "" };
                  break;
            default:
                  console.writeln("ERROR: mapCustomAndReplaceImageNames " + targetChannel);
                  return null;
      }
      if (check_allfilesarr == null && !global.get_flowchart_data) {
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

      if (check_allfilesarr == null && !global.get_flowchart_data) {
            console.writeln("mapCustomAndReplaceImageNames:converted mapping " + mapping.mapping + ", filters " + mapping.filters);
      }

      return mapping;
}

/* Run single expression PixelMath and optionally create new image. */
function runPixelMathSingleMappingEx(id, reason, mapping, createNewImage, symbols, rescale, no_status_info, show_flowchart = true)
{
      if (!no_status_info) {
            util.addProcessingStepAndStatusInfo("Run PixelMath single mapping");
      }
      console.writeln("runPixelMathSingleMapping " + mapping);

      var idWin = util.findWindow(id);
      if (idWin == null) {
            console.writeln("ERROR: No reference window found for PixelMath");
      }

      if (createNewImage) {
            var targetFITSKeywords = getTargetFITSKeywordsForPixelmath(idWin);
      }
      if (reason != "from_lights") {
            var node = flowchartOperation("PixelMath:" + reason);
      } else {
            var node = null;
      }

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

      idWin.mainView.beginProcess(UndoFlag_NoSwapFile);
      P.executeOn(idWin.mainView);
      idWin.mainView.endProcess();

      if (createNewImage) {
            var new_win = util.findWindow(P.newImageId);
            setTargetFITSKeywordsForPixelmath(new_win, targetFITSKeywords);
      } else {
            var new_win = idWin;
      }
      printProcessValues(P);
      engine_end_process(node, new_win, "PixelMath:" + reason, false);


      return P.newImageId;
}

/* Run single expression PixelMath and create new image. */
function runPixelMathSingleMapping(id, reason, mapping)
{
      return runPixelMathSingleMappingEx(id, reason, mapping, true);
}

/* Run RGB channel combination using PixelMath. 
   If we have newId we create a new image. If newId is null we
   replace target image.
*/
function runPixelMathRGBMapping(newId, idWin, mapping_R, mapping_G, mapping_B)
{
      util.addProcessingStepAndStatusInfo("Run PixelMath RGB mapping");
      console.writeln("runPixelMathRGBMapping R " + mapping_R + " G " + mapping_G + " B " + mapping_B);

      if (idWin == null) {
            console.writeln("ERROR: runPixelMathRGBMapping, no image window found for PixelMath");
      }

      if (newId != null) {
            var targetFITSKeywords = getTargetFITSKeywordsForPixelmath(idWin);
      }
      var node = flowchartOperation("PixelMath:combine RGB");

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
      P.newImageSampleFormat = PixelMath.prototype.SameAsTarget;

      idWin.mainView.beginProcess(UndoFlag_NoSwapFile);
      P.executeOn(idWin.mainView);
      idWin.mainView.endProcess();

      printProcessValues(P);
      if (newId != null) {
            var new_win = util.findWindow(newId);
      } else {
            var new_win = idWin;
      }
      if (newId != null) {
            setTargetFITSKeywordsForPixelmath(new_win, targetFITSKeywords);
      }
      engine_end_process(node, new_win, "PixelMath:combine RGB");

      return newId;
}

/* Run RGB channel combination using PixelMath. 
   We find reference image from existing images.
   We always create a new image.
*/
function runPixelMathRGBMappingFindRef(newId, mapping_R, mapping_G, mapping_B)
{
      util.addProcessingStepAndStatusInfo("Run PixelMath RGB mapping");

      var idWin = null;

      var reference_images = [ "Integration_H", "Integration_S", "Integration_O" ];

      for (var i = 0; i < reference_images.length && idWin == null; i++) {
            // Try to find idWin from reference images
            var refId = reference_images[i];
            refId = refId + "_map";
            idWin = findWindowCheckBaseNameIf(refId, global.run_auto_continue);
      }
      if (idWin == null) {
            console.writeln("ERROR: No reference window found for PixelMath");
      }
      var node = flowchartOperation("PixelMath:combine RGB");

      var targetFITSKeywords = getTargetFITSKeywordsForPixelmath(idWin);

      var P = new PixelMath;
      P.expression = mapping_R;
      P.expression1 = mapping_G;
      P.expression2 = mapping_B;
      P.useSingleExpression = false;
      P.showNewImage = true;
      P.createNewImage = true;
      P.newImageId = newId;
      P.newImageColorSpace = PixelMath.prototype.RGB;

      idWin.mainView.beginProcess(UndoFlag_NoSwapFile);
      P.executeOn(idWin.mainView);
      idWin.mainView.endProcess();

      printProcessValues(P);
      var new_win = util.findWindow(newId);
      setTargetFITSKeywordsForPixelmath(new_win, targetFITSKeywords);
      engine_end_process(node, new_win, "PixelMath:combine RGB");

      return newId;
}

function linearFitArray(refimage, targetimages, add_to_flowchart = false)
{
      console.writeln("linearFitArray");
      if (add_to_flowchart) {
            var node = flowchartOperation("LinearFit");
      } else {
            var node = null;
      }
      for (var i = 0; i < targetimages.length; i++) {
            if (targetimages[i] != null && targetimages[i] != refimage) {
                  runLinearFit(refimage, targetimages[i]);
            }
      }
      engine_end_process(node, null, "", false);
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

function findReferenceImageForLinearFit(images, suggestion)
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
            util.throwFatalError("Unknown linear fit reference image suggestion " + suggestion);
      }
      console.writeln("findReferenceImageForLinearFit: refimage " + refimage);
      return refimage;
}

function findLinearFitHSOMapRefimage(images, suggestion)
{
      var refimage;
      console.writeln("findLinearFitHSOMapRefimage");
      if (suggestion == "Auto") {
            suggestion = "Min";
      }
      if (suggestion == "Min" || suggestion == "Max") {
            refimage = findReferenceImageForLinearFit(images, suggestion);
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
      if (par.GC_before_channel_combination.val) {
            if (par.smoothbackground.val > 0) {
                  smoothBackgroundBeforeGC(image_id, par.smoothbackground.val, true);
            }
            // Optionally do GC on channel images
            runGradientCorrectionBeforeChannelCombination(image_id);
      }

      if (par.remove_stars_channel.val) {
            if (is_luminance) {
                  removeStars(util.findWindow(image_id), true, false, null, null, par.unscreen_stars.val);
            } else {
                  removeStars(util.findWindow(image_id), true, true, RGB_stars, null, par.unscreen_stars.val);
            }
      }
}

function findChannelFromName3(name)
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
function findChannelFromName2(name)
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
            return findChannelFromName3(name);
      }
}

function findChannelFromName(name)
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
            return findChannelFromName2(name);
      }
}

/* Copy images with _map name so we do not change the original
 * images (Integration_H -> Integration_H_map).
 */
function copyToMapImages(images)
{
      console.writeln("copyToMapImages");
      var update_preview = false;
      for (var i = 0; i < images.length; i++) {
            if (ppar.win_prefix != '' && images[i].startsWith(ppar.win_prefix)) {
                  var basename = images[i].substring(ppar.win_prefix.length);
            } else if (ppar.autocontinue_win_prefix != '' && images[i].startsWith(ppar.autocontinue_win_prefix)) {
                  var basename = images[i].substring(ppar.autocontinue_win_prefix.length);
            } else {
                  var basename = images[i];
            }
            if (basename.endsWith("_crop")) {
                  var copyname = util.ensure_win_prefix(util.replacePostfixOrAppend(basename, ["_crop"], "_map"));
            } else {
                  var copyname = util.ensure_win_prefix(basename + "_map");
            }
            if (!copyname.endsWith("_map")) {
                  util.throwFatalError("copyToMapImages bad copyname " + copyname);
            }
            if (util.findWindow(copyname) == null) {
                  if (!global.get_flowchart_data) {
                        console.writeln("copy from " + images[i] + " to " + copyname);
                  }
                  var imgWin = util.copyWindow(
                                    findWindowNoPrefixIf(images[i], global.run_auto_continue), 
                                    copyname);
                  global.temporary_windows[global.temporary_windows.length] = copyname;
                  if (par.fast_mode.val) {
                        var binning = getFastModeBinning(imgWin);
                        if (binning > 1) {
                              console.writeln("copyToMapImages, binning " + binning + " for " + copyname);
                              runBinning(imgWin, binning);
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
                        guiUpdatePreviewId(images[i]);
                        update_preview = false;
                        break;
                  }
            }
            if (update_preview) {
                  // Update preview to the first image
                  guiUpdatePreviewId(images[0]);
            }
      }
}

function copyOneProcessedToMapImage(id)
{
      if (id == null) {
            return null;
      }

      var copyname = util.ensure_win_prefix(util.replacePostfixOrAppend(id, ["_processed"], "_map"));

      util.copyWindow(util.findWindow(id), copyname);
      global.temporary_windows[global.temporary_windows.length] = copyname;

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

function mapRGBchannel(images, refimage, mapping, is_luminance, name)
{
      console.writeln("mapRGBchannel, refimage " + refimage + ", mapping " + mapping);
      // Copy files to _map names to avoid changing original files.
      // We close these images at the end as next call may want to use the
      // same image names.

      flowchartChildBegin(name);

      copyToMapImages(images);

      if (images.length > 1) {
            // we have multiple channels in images array
            flowchartParentBegin(name);
      }

      for (var i = 0; i < images.length; i++) {
            if (images.length > 1) {
                  flowchartChildBegin(findChannelFromName(images[i]));
            }
            CropImageIf(images[i]);
            processChannelImage(images[i], is_luminance);
            if (images.length > 1) {
                  flowchartChildEnd(findChannelFromName(images[i]));
            }
      }

      if (images.length > 1) {
            flowchartParentEnd(name);
      }

      refimage = refimage + "_map";
      console.writeln("mapRGBchannel, new refimage " + refimage);
      if (util.findWindow(refimage) == null) {
            refimage = images[0];
            console.writeln("mapRGBchannel, refimage from images[0] " + refimage);
      }
      if (images.length > 1) {
            // Run linear fit to match images before PixelMath
            // This done for each channel to match images before PixelMath
            var node = flowchartOperation("LinearFit");
            linearFitArray(refimage, images);
            copyLinearFitReferenceImage(refimage);
            engine_end_process(node);
      }
      // create combined image
      var target_image = runPixelMathSingleMapping(refimage, "map " + name, mapping);

      // close all copied images as we may want use the same names in the next RGB round
      closeAllWindowsFromArray(images);

      flowchartChildEnd(name);

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
                  if (is_color_files) {
                        save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
                        util.throwFatalError("checkNoiseReduction bad combination, L+color/OSC");
                  }
                  if (par.luminance_noise_reduction_strength.val == 0) {
                        console.writeln("checkNoiseReduction, " + image + ", " + phase, ", luminance_noise_reduction_strength == 0");
                        return false;
                  }
                  switch (phase) {
                        case 'channel':
                              noise_reduction = par.channel_noise_reduction.val ||
                                                (par.auto_noise_reduction.val && 
                                                      (!par.use_blurxterminator.val && !par.use_graxpert_deconvolution.val));
                              break;
                        case 'integrated':
                              noise_reduction = par.integrated_image_noise_reduction.val;
                              break;
                        case 'processed':
                              noise_reduction = par.processed_image_noise_reduction.val ||
                                                (par.auto_noise_reduction.val && 
                                                      (par.use_blurxterminator.val || par.use_graxpert_deconvolution.val));
                              break;
                        case 'nonlinear':
                              noise_reduction = par.non_linear_noise_reduction.val;
                              break;
                        default:
                              util.throwFatalError("checkNoiseReduction bad phase '" + phase + "' for " + image + " image");
                  }
                  break;
            case 'RGB':
                  if (is_color_files) {
                        save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
                        util.throwFatalError("checkNoiseReduction bad combination, RGB+color/OSC");
                  }
                  if (par.noise_reduction_strength.val == 0) {
                        console.writeln("checkNoiseReduction, " + image + ", " + phase, ", noise_reduction_strength == 0");
                        return false;
                  }
                  switch (phase) {
                        case 'channel':
                              if (par.channel_noise_reduction.val) {
                                    noise_reduction = true;
                              } else if (par.auto_noise_reduction.val) {
                                    // Auto select noise reduction
                                    if (par.use_blurxterminator.val || par.use_graxpert_deconvolution.val) {
                                          // Skip noise reduction on channel images if BlurXterminator is used
                                          noise_reduction = false;
                                    } else {
                                          // Do noise reduction on channel images if BlurXterminator is not used
                                          noise_reduction = true;
                                    }
                              }
                              break;
                        case 'integrated':
                              noise_reduction = par.integrated_image_noise_reduction.val;
                              break;
                        case 'processed':
                              if (par.processed_image_noise_reduction.val) {
                                    noise_reduction = true;
                              } else if (par.auto_noise_reduction.val) {
                                    // Auto select noise reduction
                                    if (par.use_blurxterminator.val || par.use_graxpert_deconvolution.val) {
                                          // Do noise reduction on combined images if BlurXterminator is used
                                          noise_reduction = true;
                                    } else {
                                          // Skip noise reduction on combined images if BlurXterminator is not used
                                          noise_reduction = false;
                                    }
                              }
                              break;
                        case 'nonlinear':
                              noise_reduction = par.non_linear_noise_reduction.val;
                              break;
                        default:
                              save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
                              util.throwFatalError("checkNoiseReduction bad phase '" + phase + "' for " + image + " image");
                  }
                  break;
            case 'color':
                  if (!is_color_files) {
                        save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
                        util.throwFatalError("checkNoiseReduction bad combination, color/OSC and nor color files");
                  }
                  if (par.noise_reduction_strength.val == 0) {
                        console.writeln("checkNoiseReduction, " + image + ", " + phase, ", noise_reduction_strength == 0");
                        return false;
                  }
                  switch (phase) {
                        case 'integrated':
                              noise_reduction = par.integrated_image_noise_reduction.val;
                              break;
                        case 'processed':
                              noise_reduction = par.processed_image_noise_reduction.val || par.auto_noise_reduction.val;
                              break;
                        case 'nonlinear':
                              noise_reduction = par.non_linear_noise_reduction.val;
                              break;
                        default:
                              save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
                              util.throwFatalError("checkNoiseReduction bad phase '" + phase + "' for " + image + " image");
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

      if (maskWin == null && !(par.use_noisexterminator.val || par.use_graxpert_denoise.val|| par.use_deepsnr.val)) {
            /* Create a temporary mask. */
            var temp_mask_win = CreateNewTempMaskFromLinearWin(imgWin, false);
            maskWin = temp_mask_win;
      } else {
            var temp_mask_win = null;
      }

      runNoiseReductionEx(imgWin, maskWin, par.luminance_noise_reduction_strength.val, true);
      guiUpdatePreviewWin(imgWin);

      if (temp_mask_win != null) {
            util.closeOneWindow(temp_mask_win);
      }
}

function channelNoiseReduction(image_id)
{
      util.addProcessingStepAndStatusInfo("Reduce noise on channel image " + image_id);

      var image_win = util.findWindow(image_id);

      if (!(par.use_noisexterminator.val || par.use_graxpert_denoise.val || par.use_deepsnr.val)) {
            /* Create a temporary mask. */
            var temp_mask_win = CreateNewTempMaskFromLinearWin(image_win, false);
      } else {
            var temp_mask_win = null;
      }

      runNoiseReductionEx(image_win, temp_mask_win, par.noise_reduction_strength.val, true);

      guiUpdatePreviewWin(image_win);

      if (temp_mask_win != null) {
            util.closeOneWindow(temp_mask_win);
      }
}

function createNewStarXTerminator(star_mask, linear_data, from_lights, use_unscreen)
{
      if (!from_lights) {
            var node = flowchartOperation("StarXTerminator");
      } else {
            var node = null;
      }
      try {
            console.writeln("createNewStarXTerminator, linear_data " + linear_data + ", star_mask "+ star_mask + ", use_unscreen " + use_unscreen);
            var P = new StarXTerminator;
            // P.linear = linear_data;    Not needed in v2.0.0
            P.stars = star_mask;
            if (par.starxterminator_ai_model.val != "") {
                  console.writeln("createNewStarXTerminator, AI model " + par.starxterminator_ai_model.val);
                  P.ai_file = par.starxterminator_ai_model.val;
            } else {
                  console.writeln("createNewStarXTerminator, default AI model " + P.ai_file);
            }
            if (par.starxterminator_large_overlap.val) {
                  console.writeln("createNewStarXTerminator, large overlap");
                  P.overlap = 0.50;
            }
            if (use_unscreen) {
                  P.unscreen = true;
            } else {
                  P.unscreen = false;
            }
            engine_end_process(node);
      } catch(err) {
            save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
            console.criticalln("StarXTerminator failed");
            console.criticalln(err);
            util.addProcessingStep("Maybe StarXTerminator is not installed, AI is missing or platform is not supported");
            util.throwFatalError("StarXTerminator failed");
      }
      return P;
}

function createNewStarNet(star_mask, from_lights)
{
      if (!from_lights) {
            var node = flowchartOperation("StarNet");
      } else {
            var node = null;
      }
      try {
            var P = new StarNet;
            P.stride = StarNet.prototype.Stride_128;
            P.mask = star_mask;
            engine_end_process(node);
      } catch(err) {
            save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
            console.criticalln("StarNet failed");
            console.criticalln(err);
            util.addProcessingStep("Maybe weight files are missing or platform is not supported");
            util.throwFatalError("StarNet failed");
      }
      return P;
}

function createNewStarNet2(star_mask, from_lights)
{
      if (!from_lights) {
            var node = flowchartOperation("StarNet2");
      } else {
            var node = null;
      }
      try {
            var P = new StarNet2;
            P.mask = star_mask;
            engine_end_process(node);
      } catch(err) {
            save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
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
                  save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
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
function removeStars(imgWin, linear_data, save_stars, save_array, stars_image_name, use_unscreen, from_lights)
{
      if (linear_data) {
            util.addProcessingStepAndStatusInfo("Remove stars from linear image " + imgWin.mainView.id);
      } else {
            util.addProcessingStepAndStatusInfo("Remove stars from non-linear image " + imgWin.mainView.id);
      }

      if (!from_lights) {
            var node = flowchartOperation("Remove stars");
      } else {
            var node = null;
      }

      if (linear_data && use_unscreen) {
            console.writeln("Not using unscreen for linear data");
      }

      var create_star_mask = save_stars;
      if (save_stars && use_unscreen && !par.use_starxterminator.val) {
            var originalwin_copy = util.copyWindow(imgWin, util.ensure_win_prefix(imgWin.mainView.id + "_tmp_original"));
            create_star_mask = false;
      }

      if (par.use_starxterminator.val) {
            util.addProcessingStep("Run StarXTerminator on " + imgWin.mainView.id);
            var P = createNewStarXTerminator(create_star_mask, linear_data, from_lights, use_unscreen);
            var process_name = "StarXTerminator";
      } else if (par.use_starnet2.val) {
            util.addProcessingStep("Run StarNet2 on " + imgWin.mainView.id);
            var P = createNewStarNet2(create_star_mask, from_lights);
            var process_name = "StarNet2";
      } else {
            save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
            util.throwFatalError("StarNet2 or StarXTerminator must be selected to remove stars.");
      }

      if (par.use_starnet2.val && linear_data) {
            var median = delinearizeImage(imgWin, from_lights ? "from_lights" : "delinearize");
      }

      if (!global.get_flowchart_data) {
            /* Execute on image.
             */
            imgWin.mainView.beginProcess(UndoFlag_NoSwapFile);

            var succp = P.executeOn(imgWin.mainView, false);
            
            imgWin.mainView.endProcess();
            printProcessValues(P);
      } else {
            var succp = true;
      }

      if (par.use_starnet2.val && linear_data) {
            relinearizeImage(imgWin, median, from_lights ? "from_lights" : "relinearize");
      }

      engine_end_process(node, imgWin, process_name);

      if (!succp) {
            save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
            util.throwFatalError("Failed to remove stars!");
      }

      if (par.use_starxterminator.val) {
            console.writeln("StarXTerminator completed");
      }

      if (global.get_flowchart_data) {
            return  null;
      }

      guiUpdatePreviewWin(imgWin);

      if (save_stars) {
            if (stars_image_name == null) {
                  stars_image_name = imgWin.mainView.id + "_stars";
            }
            if (use_unscreen && !par.use_starxterminator.val) {
                  // Use unscreen method to get stars image as described by Russell Croman
                  console.writeln("removeStars use unscreen to get star image");
                  var id = runPixelMathSingleMappingEx(
                              imgWin.mainView.id,
                              "combine stars+starless",
                              "~((~" + originalwin_copy.mainView.id + ")/(~" + imgWin.mainView.id + "))",
                              true);
                  var star_win = util.findWindow(id);
                  console.writeln("removeStars, rename " + id + " to " + stars_image_name);
                  util.windowRename(id, stars_image_name);
                  util.closeOneWindow(originalwin_copy);
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

function removeStarsFromLights(fileNames)
{
      var newFileNames = [];
      var outputDir = global.outputRootDir + global.AutoOutputDir;
      var postfix = "_starless";
      var outputExtension = ".xisf";

      var node = flowchartOperation("Remove stars");
      if (global.get_flowchart_data) {
            return fileNames;
      }

      for (var i = 0; i < fileNames.length; i++) {
            console.writeln("Remove stars from image " + fileNames[i]);

            // Open source image window from a file
            var imageWindows = ImageWindow.open(fileNames[i]);
            if (!imageWindows || imageWindows.length == 0) {
                  util.throwFatalError("*** removeStarsFromLights Error: imageWindows.length: " + imageWindows.length);
            }
            var imageWindow = imageWindows[0];
            if (imageWindow == null) {
                  util.throwFatalError("*** removeStarsFromLights Error: Can't read file: " + fileNames[i]);
            }

            removeStars(
                  imageWindow,      // imgWin
                  true,             // linear_data
                  false,            // save_stars
                  null,             // save_array
                  null,             // stars_image_name
                  false,            // use_unscreen
                  true);            // from_lights
            
            var filePath = generateNewFileName(fileNames[i], outputDir, postfix, outputExtension);

            // Save window
            console.writeln("Save starless image as " + filePath);
            if (!writeImage(filePath, imageWindow)) {
                  util.throwFatalError("*** removeStarsFromLights Error: Can't write output image: " + imageWindow.mainView.id + ", file: " + filePath);
            }
            // Close window
            util.closeOneWindow(imageWindow);   

            newFileNames[newFileNames.length] = filePath;
      }
      console.writeln("removeStarsFromLights output[0] " + newFileNames[0]);
      engine_end_process(node);

      return newFileNames;
}

function initSPCCvalues()
{
      if (par.use_spcc.val) {
            spcc_params.wavelengths = [ par.spcc_red_wavelength.val, par.spcc_green_wavelength.val, par.spcc_blue_wavelength.val ];
            spcc_params.bandhwidths = [ par.spcc_red_bandwidth.val, par.spcc_green_bandwidth.val, par.spcc_blue_bandwidth.val ];
            spcc_params.white_reference = par.spcc_white_reference.val;
            spcc_params.narrowband_mode = par.spcc_narrowband_mode.val;
      } else {
            spcc_params.wavelengths = [ ];
            spcc_params.bandhwidths = [ ];
            spcc_params.white_reference = "";
            spcc_params.narrowband_mode = false;
      }
}

// Return default Wavelength and BandWidth for SPCC
// We use Astrodon LRGB 2GEN filter values
function getSPCCWavelengthBandWidth(filter, channel)
{
      if (filter.indexOf('H') != -1) {
            // There is H filter
            if (channel == 'R') {
                  H_in_R_channel = true;
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

function mapSPCCAutoNarrowband()
{
      if (!par.use_spcc.val || 
          par.skip_color_calibration.val ||
          !par.spcc_auto_narrowband) 
      {
            return;
      }
      if (process_narrowband) {
            spcc_params.narrowband_mode = true;
            console.writeln("SPCC auto narrowband using SPCC narrowband mode");
            spcc_params.white_reference = "Photon Flux";
      } else {
            spcc_params.narrowband_mode = false;
            console.writeln("SPCC narrowband auto mode not using SPCC narrowband mode");
            spcc_params.white_reference = "Average Spiral Galaxy";
      }
      console.writeln("SPCC auto narrowband using " + spcc_params.white_reference + " white reference");

      var values = getSPCCWavelengthBandWidth(par.custom_R_mapping.val, 'R');
      if (values) {
            spcc_params.wavelengths[0] = values[0];
            spcc_params.bandhwidths[0] = values[1];
            console.writeln("SPCC auto narrowband for R mapping with filter " + par.custom_R_mapping.val + " use wavelength " + values[0] + " and bandwidth " + values[1]);
      } else {
            console.writeln("SPCC auto narrowband for R mapping with filter " + par.custom_R_mapping.val + " use default wavelength " + spcc_params.wavelengths[0] + " and default bandwidth " + spcc_params.bandhwidths[0]);
      }
      var values = getSPCCWavelengthBandWidth(par.custom_G_mapping.val, 'G');
      if (values) {
            spcc_params.wavelengths[1] = values[0];
            spcc_params.bandhwidths[1] = values[1];
            console.writeln("SPCC auto narrowband for G mapping with filter " + par.custom_G_mapping.val + " use wavelength " + values[0] + " and bandwidth " + values[1]);
      } else {
            console.writeln("SPCC auto narrowband for G mapping with filter " + par.custom_G_mapping.val + " use default wavelength " + spcc_params.wavelengths[1] + " and default bandwidth " + spcc_params.bandhwidths[1]);
      }
      var values = getSPCCWavelengthBandWidth(par.custom_B_mapping.val, 'B');
      if (values) {
            spcc_params.wavelengths[2] = values[0];
            spcc_params.bandhwidths[2] = values[1];
            console.writeln("SPCC auto narrowband for B mapping with filter " + par.custom_B_mapping.val + " use wavelength " + values[0] + " and bandwidth " + values[1]);
      } else {
            console.writeln("SPCC auto narrowband for B mapping with filter " + par.custom_B_mapping.val + " use default wavelength " + spcc_params.wavelengths[2] + " and default bandwidth " + spcc_params.bandhwidths[2]);
      }
}

// basename should not have an extension
function save_id_as_xisf_and_tif(id, basename)
{
      if (global.get_flowchart_data) {
            return;
      }

      // Find source window
      var image_win = util.findWindow(id);
      if (image_win == null) {
            util.throwFatalError("save_id_as_xisf_and_tif:could not find image " + id);
      }

      // Copy image to temporary name
      console.writeln("save_id_as_xisf_and_tif, copy image " + id);
      image_win = util.copyWindow(image_win, id + "_tmp");

      var filePath = util.combinePath(global.outputRootDir, global.AutoProcessedDir);
      filePath = util.ensurePathEndSlash(filePath) + basename;

      // Save as .xisf
      console.writeln("createStarlessChannelImages, save starless image " + filePath + ".xisf");
      if (!image_win.saveAs(filePath + ".xisf", false, false, false, false)) {
            util.throwFatalError("createStarlessChannelImages:failed to save image: " + filePath + ".xisf");
      }
      
      // Save as .tif
      console.writeln("createStarlessChannelImages, save starless image " + filePath + ".tif");
      if (image_win.bitsPerSample != 16) {
            console.writeln("createStarlessChannelImages:set bits to 16");
            image_win.setSampleFormat(16, false);
      }
      if (!image_win.saveAs(filePath + ".tif", false, false, false, false)) {
            util.throwFatalError("createStarlessChannelImages:failed to save image: " + filePath + ".tif");
      }

      util.closeOneWindow(image_win);
}

// Stretch channel images, remove stars and save images
// Called when par.save_stretched_starless_channel_images.val is true
function createStarlessChannelImages(images, basenames = null)
{
      flowchartParentBegin("Starless channels");

      if (basenames == null) {
            basenames = images;
      }

      for (var i = 0; i < images.length; i++) {
            flowchartChildBegin(findChannelFromName(basenames[i]));

            var id = images[i];
            console.writeln("createStarlessChannelImages, image " + id);
            var image_win = util.findWindow(id);
            if (image_win == null) {
                  save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
                  util.throwFatalError("createStarlessChannelImages:could not find image " + id);
            }

            // Copy image to temporary name
            var copy_id = id + "_tmp";
            console.writeln("createStarlessChannelImages, copy image " + images[i]);
            image_win = util.copyWindow(image_win, copy_id);
            
            // Stretch image
            image_win = runHistogramTransform(image_win, null, false, 'channel').win;

            // Remove stars
            removeStars(image_win, false, false, null, null, false, false);

            // Rename starless image
            var new_name = util.ensure_win_prefix(basenames[i].replace(/_map.*/g, "_processed") + "_starless")
            console.writeln("createStarlessChannelImages, rename image " + image_win.mainView.id + " to " + new_name);
            image_win.mainView.id = new_name;

            if (par.stretched_channel_auto_contrast.val) {
                  autoContrast(image_win, 0.1, 100);
            }

            // Save image in .xisf and .tif format
            save_id_as_xisf_and_tif(image_win.mainView.id, image_win.mainView.id);

            global.processed_channel_images[global.processed_channel_images.length] = image_win.mainView.id;

            if (copy_id != image_win.mainView.id) {
                  util.closeOneWindowById(copy_id);
            }

            flowchartChildEnd(findChannelFromName(basenames[i]));
      }
      flowchartParentEnd("Starless channels");
}

function createStarsImageFromFinalImage(id)
{
      var starless_name = id + "_stars";
      var image_win = util.findWindow(starless_name);
      if (image_win != null) {
            // We already have starless image
            console.writeln("createStarsImageFromFinalImage, already stars image " + id);
            return;
      }

      console.writeln("createStarsImageFromFinalImage, image " + id);

      // Create temporary copy of image
      var image_win = util.findWindow(id);
      image_win = util.copyWindow(image_win, id + "_tmp");

      // Create starless image
      var stars_win = removeStars(image_win, false, true, null, null, true, false);

      if (stars_win != null) {
            stars_win.mainView.id = starless_name;

            // Save stars image in .xisf and .tif format
            save_id_as_xisf_and_tif(stars_win.mainView.id, starless_name);

            // Add to channel images as this is often used with channel images
            global.processed_channel_images[global.processed_channel_images.length] = starless_name;
      } else {
            if (!global.get_flowchart_data) {
                  util.throwFatalError("createStarsImageFromFinalImage:failed to create stars image " + id);
            }
      }

      if (!global.get_flowchart_data) {
            guiUpdatePreviewWin(util.findWindow(id)); // Undo preview update from removeStars
      }

      util.closeOneWindow(image_win);
}

// Extract channels to separate images and save stretched starless images
// Called when par.save_stretched_starless_channel_images.val is true
function extractChannelsAndSaveStarlessImages(RGB_win_id)
{
      let channels = [ "R", "G", "B" ];
      let images = [];
      flowchartParentBegin("Extract channels");
      for (var i = 0; i < channels.length; i++) {
            flowchartChildBegin(channels[i]);
            let id = extractRGBchannel(RGB_win_id, channels[i], false);
            images[images.length] = id;
            flowchartChildEnd(channels[i]);
      }
      flowchartParentEnd("Extract channels");

      createStarlessChannelImages(images, [ 'Integration_R_processed', 'Integration_G_processed', 'Integration_B_processed' ]);
      
      for (var i = 0; i < images.length; i++) {
            util.closeOneWindowById(images[i]);
      }
}

/* Do custom mapping of channels to RGB image. We do some of the same 
 * stuff here as in CombineRGBimage.
 * We process one of the global.narrowBandPalettes here to
 * create narrowband mapping.
 * If filtered_lights != null we do not do any processing, just check
 * that all files exist.
 */
function customMapping(RGBmapping, filtered_lights)
{
      if (filtered_lights != null) {
            util.addProcessingStep("Check custom mapping");
            is_rgb_files = filtered_lights.rgb;
            is_narrowband_files = filtered_lights.narrowband;
            var check_allfilesarr = filtered_lights.allfilesarr;
      } else {
            util.addProcessingStepAndStatusInfo("Custom mapping");
            var check_allfilesarr = null;
      }

      if (check_allfilesarr == null) {
            mapSPCCAutoNarrowband();
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
      if (!process_narrowband) {
            var luminance_mapping = mapCustomAndReplaceImageNames('L', L_images, check_allfilesarr);
      }
      var red_mapping = mapCustomAndReplaceImageNames('R', R_images, check_allfilesarr);
      var green_mapping = mapCustomAndReplaceImageNames('G', G_images, check_allfilesarr);
      var blue_mapping = mapCustomAndReplaceImageNames('B', B_images, check_allfilesarr);

      if (check_allfilesarr != null) {
            /* Just checking that all files exist. */
            return null;
      }

      if (process_narrowband) {
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

            /* Make a copy so we do not change the original integrated images.
             * Here we create image with _map added to the end 
             * (Integration_H -> Integration_H_map).
             */
            var images = [];

            arrayAppendCheckDuplicates(images, R_images);
            arrayAppendCheckDuplicates(images, G_images);
            arrayAppendCheckDuplicates(images, B_images);

            if (par.debug.val) console.writeln('customMapping: copyToMapImages(images)');
            copyToMapImages(images);

            if (par.debug.val) console.writeln('customMapping: flowchartParentBegin("Channels")');
            flowchartParentBegin("Channels");
            for (var i = 0; i < images.length; i++) {
                  if (par.debug.val) console.writeln('customMapping: flowchartChildBegin(findChannelFromName(images[i]))');
                  flowchartChildBegin(findChannelFromName(images[i]));

                  CropImageIf(images[i]);
                  processChannelImage(images[i], false);
                  
                  if (par.debug.val) console.writeln('customMapping: flowchartChildEnd(findChannelFromName(images[i]))');
                  flowchartChildEnd(findChannelFromName(images[i]));
            }
            if (par.debug.val) console.writeln('customMapping: flowchartParentEnd("Channels")');
            flowchartParentEnd("Channels");

            var narrowband_linear_fit = par.narrowband_linear_fit.val;
            if (narrowband_linear_fit == "Auto") {
                  /* By default we do not do linear fit
                   * if we stretch with Auto STF or Histogram stretch. 
                   * If we stretch with MaskedStretch we use linear
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

            // Narrowband mapping name is stored into par.narrowband_mapping.val
            // Some predefined mapping work best with linear data, some with stretched data.
            // For example Dynamic Foraxx palettes should be used with stretched data
            // so we check if we should use stretched data for mapping.

            if (useStretchedNarrowBandData(par.narrowband_mapping.val)) {
                  console.writeln("Narrowband mapping using stretched data with palette " + par.narrowband_mapping.val);
                  var mapping_on_nonlinear_data = true;
            } else {
                  var mapping_on_nonlinear_data = par.mapping_on_nonlinear_data.val;
            }

            if (narrowband_linear_fit != "None") {
                  /* Do a linear fit of images before PixelMath and before possible
                  * stretching. We do this on both cases, linear and stretched.
                  */
                  var refimage = findLinearFitHSOMapRefimage(images, narrowband_linear_fit);
                  util.addProcessingStep("Linear fit using " + refimage);
                  linearFitArray(refimage, images, true);
                  copyLinearFitReferenceImage(refimage);
            }
            if (checkNoiseReduction('RGB', 'channel')) {
                  // Do noise reduction after linear fit.
                  flowchartParentBegin("Channels");
                  for (var i = 0; i < images.length; i++) {
                        flowchartChildBegin(findChannelFromName(images[i]));
                        channelNoiseReduction(images[i]);
                        flowchartChildEnd(findChannelFromName(images[i]));
                  }
                  flowchartParentEnd("Channels");
                  RGBmapping.channel_noise_reduction = true;
            }

            var bxt_run = false;
            if (!mapping_on_nonlinear_data) {
                  /* We run PixelMath using linear images. 
                   */
                  util.addProcessingStep("Custom mapping, linear narrowband images");
            } else {
                  /* Stretch images to non-linear before combining with PixelMath.
                   */
                  util.addProcessingStep("Custom mapping, stretched narrowband images");
                  if (par.remove_stars_before_stretch.val) {
                        save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
                        util.throwFatalError("Narrowband mapping using non-linear data is not compatible with Remove stars early");
                  }
                  flowchartParentBegin("Stretch channels");
                  for (var i = 0; i < images.length; i++) {
                        flowchartChildBegin(findChannelFromName(images[i]));
                        if (!par.skip_sharpening.val) {
                               if (par.use_blurxterminator.val) {
                                    /* Run BlurXTerminator separately for each channel since
                                     * we want to run it on linear data.
                                     */
                                    runBlurXTerminator(ImageWindow.windowById(images[i]), false);
                                    bxt_run = true;
                               } else if (par.use_graxpert_deconvolution.val) {
                                    runGraXpertDeconvolution(ImageWindow.windowById(images[i]));
                              }
                        }
                        runHistogramTransform(util.findWindow(images[i]), null, false, findChannelFromName(images[i]));
                        flowchartChildEnd(findChannelFromName(images[i]));
                  }
                  flowchartParentEnd("Stretch channels");
                  RGBmapping.stretched = true;
            }

            if (par.bxt_correct_channels.val && !bxt_run && par.use_blurxterminator.val) {
                  // Run BlurXTerminator on all channels if we did not run it earlier
                  flowchartParentBegin("Channels");
                  for (var i = 0; i < images.length; i++) {
                        flowchartChildBegin(findChannelFromName(images[i]));
                        runBlurXTerminator(ImageWindow.windowById(images[i]), true);
                        flowchartChildEnd(findChannelFromName(images[i]));
                  }
                  flowchartParentEnd("Channels");
            }
            if (par.save_processed_channel_images.val) {
                  // Save processed channel images before we combine them
                  for (var i = 0; i < images.length; i++) {
                        saveProcessedImage(images[i], images[i]);
                  }
            }
            if (par.save_stretched_starless_channel_images.val) {
                  createStarlessChannelImages(images);
            }
      
            /* Run PixelMath to create a combined RGB image.
             */
            RGB_win_id = runPixelMathRGBMappingFindRef(
                              ppar.win_prefix + "Integration_RGB_combined", 
                              red_mapping.mapping, 
                              green_mapping.mapping, 
                              blue_mapping.mapping);

            RGBmapping.combined = true;

            RGB_win = util.findWindow(RGB_win_id);
            guiUpdatePreviewWin(RGB_win);

            util.setFITSKeywordNoOverwrite(RGB_win, "AutoIntegrateNarrowband", "true", "If true then this is a narrowband image");
            util.setFITSKeyword(
                  RGB_win, 
                  "AutoIntegrateFilters", 
                  red_mapping.filters + ',' + green_mapping.filters + ',' + blue_mapping.filters, 
                  "Filters used");

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
            flowchartParentBegin("RGB+Narroband");
            util.addProcessingStep("RGB and narrowband mapping, create LRGB channel images and continue with RGB workflow");
            if (par.custom_L_mapping.val != '') {
                  luminance_id = mapRGBchannel(L_images, ppar.win_prefix + "Integration_L", luminance_mapping, true, 'L');
                  guiUpdatePreviewId(luminance_id);
                  is_luminance_images = true;
            }

            red_id = mapRGBchannel(R_images, ppar.win_prefix + "Integration_R", red_mapping, false, 'R');
            green_id = mapRGBchannel(G_images, ppar.win_prefix + "Integration_G", green_mapping, false, 'G');
            blue_id = mapRGBchannel(B_images, ppar.win_prefix + "Integration_B", blue_mapping, false, 'B');

            flowchartParentEnd("RGB+Narroband");
      }

      return RGBmapping;
}

function isCustomMapping(narrowband)
{
      return narrowband && !par.use_RGBNB_Mapping.val && !par.use_RGBHa_Mapping.val;
}

/* Copy id to _map name if id not null. This is done to avoid
 * modifying the original image.
 */
function copyToMapIf(id)
{
      if (id != null) {
            if (id.endsWith("_map")) {
                  new_id = id;
            } else {
                  var new_id = util.remove_autocontinue_prefix(id);
                  new_id = util.ensure_win_prefix(new_id + "_map");
                  if (util.findWindow(new_id) == null) {
                        util.copyWindow(util.findWindow(id), new_id);
                  }
            }
            global.temporary_windows[global.temporary_windows.length] = new_id;
            return new_id;
      } else {
            return id;
      }
}

/* Copy integration_RGB to Integration_RGB_map so we do not
 * modify the original image.
 * Global variable RGB_win_id is set to the new image id and
 * RGB_win is set to the new image window.
 */ 
function mapColorImage(oldname, newname)
{
      console.writeln("mapColorImage " + oldname + " to " + newname);
      RGB_win_id = util.ensure_win_prefix(newname);
      util.copyWindow(util.findWindow(RGB_color_id), RGB_win_id);
      RGB_win = ImageWindow.windowById(RGB_win_id);
      RGB_win.show();
}

function RGBcopyToMapIf(ch, id)
{
      flowchartChildBegin(ch);

      var mapped_id = copyToMapIf(id);
      CropImageIf(mapped_id);
      processChannelImage(mapped_id, false);

      flowchartChildEnd(ch);

      return mapped_id;
}

/* Map RGB channels. We do PixelMath mapping here if we have narrowband images.
 */
function mapLRGBchannels(RGBmapping)
{
      is_rgb_files = R_id != null || G_id != null || B_id != null;
      is_narrowband_files = H_id != null || S_id != null || O_id != null;
      var rgb = is_rgb_files;
      process_narrowband = is_narrowband_files || 
                           par.force_narrowband_mapping.val;
      var custom_mapping = isCustomMapping(process_narrowband);

      if (H_id != null) {
            console.writeln("mapLRGBchannels, H_id " + H_id);
      } else if (R_id != null) {
            console.writeln("mapLRGBchannels, R_id " + R_id);
      } else if (L_id != null) {
            console.writeln("mapLRGBchannels, L_id " + L_id);
      }


      if (rgb && process_narrowband && !par.force_narrowband_mapping.val) {
            util.addProcessingStep("There are both RGB and narrowband data, processing as RGB image");
            process_narrowband = false;
      }
      if (process_narrowband) {
            util.addProcessingStep("Processing as narrowband image");
      }

      util.addProcessingStepAndStatusInfo("Map LRGB channels");

      if (custom_mapping) {
            util.addProcessingStep("Narrowband files, use custom mapping");
            RGBmapping = customMapping(RGBmapping, null);

      } else {
            util.addProcessingStep("Normal RGB processing");
            console.writeln("Make a copies of original windows.");
            
            flowchartParentBegin("Channels");

            flowchartChildBegin("L");
            if (luminance_id == null) {
                  // We may already have copied L_id so we do it
                  // here only if it is not copied yet.
                  luminance_id = copyToMapIf(L_id);
                  CropImageIf(luminance_id);
            }
            processChannelImage(luminance_id, true, 'L');
            flowchartChildEnd("L");

            red_id = RGBcopyToMapIf("R", R_id);
            green_id = RGBcopyToMapIf("G", G_id);
            blue_id = RGBcopyToMapIf("B", B_id);

            flowchartParentEnd("Channels");
      }
      return RGBmapping;
}

// add as a first item, first item should be the best image
function insert_image_for_integrate(images, new_image, ssweight)
{
      console.writeln("insert_image_for_integrate " + new_image + ", ssweight=" + ssweight);
      images.unshift(new Array(2));
      images[0][0] = true;                // enabled
      images[0][1] = new_image;           // path
}

// add to the end
function append_image_for_integrate(images, new_image, ssweight)
{
      console.writeln("append_image_for_integrate " + new_image + ", ssweight=" + ssweight);
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
      var node = flowchartOperation("StarAlignment");

      if (global.get_flowchart_data) {
            return imagetable;
      }

      var targets = [];

      for (var i = 0; i < imagetable.length; i++) {
            targets[targets.length] = [ true, true, imagetable[i] ];    // enabled, isFile, image
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
      // P.onError = StarAlignment.prototype.Continue;
      /*
       * Read-only properties
       *
       P.outputData = [ // outputImage, outputMask, totalPairMatches, inliers, overlapping, regularity, quality, rmsError, rmsErrorDev, peakErrorX, peakErrorY, H11, H12, H13, H21, H22, H23, H31, H32, H33, frameAdaptationBiasRK, frameAdaptationBiasG, frameAdaptationBiasB, frameAdaptationSlopeRK, frameAdaptationSlopeG, frameAdaptationSlopeB, frameAdaptationAvgDevRK, frameAdaptationAvgDevG, frameAdaptationAvgDevB, referenceStarX, referenceStarY, targetStarX, targetStarY, outputDistortionMap
       ];
       */
      P.executeGlobal();
      printProcessValues(P);

      engine_end_process(node);

      alignedFiles = fileNamesFromOutputData(P.outputData);

      util.addProcessingStep("runStarAlignment, " + alignedFiles.length + " files");
      console.writeln("output[0] " + alignedFiles[0]);

      global.star_alignment_image = refImage;

      return alignedFiles;
}

function runCometAlignment(filenames, filename_postfix)
{
      console.writeln("Comet alignment, get metadata for images.");
      var node = flowchartOperation("CometAlignment");

      if (global.get_flowchart_data) {
            return filenames;
      }

      var filter_files = engine.getFilterFiles(filenames, global.pages.LIGHTS, '');

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
                  save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
                  util.throwFatalError("Comet alignment failed, equal DATE-OBS " + a.date_obs + " in files " + a.name + " and " + b.name);
                  return 0;
            }
      });

      /* Generate targetFrames.
       */
      console.writeln("Comet alignment, generate target frame info.");
      var splt = par.comet_first_xy.val.split(",");
      if (splt.length != 2) {
            save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
            util.throwFatalError("Comet alignment failed, incorrect first image X,Y format " + par.comet_first_xy.val);
      }
      var first_x = parseInt(splt[0]);
      var first_y = parseInt(splt[1]);
      var splt = par.comet_last_xy.val.split(",");
      if (splt.length != 2) {
            save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
            util.throwFatalError("Comet alignment failed, incorrect last image X,Y format " + par.comet_last_xy.val);
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
                  par.use_drizzle.val ? file_info_list[i].name.replace(".xisf", ".xdrz") : ""   // 7 drizzlePath
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
      P.pixelInterpolation = CometAlignment.prototype.Lanczos4;
      P.linearClampingThreshold = 0.30;
      P.inputHints = "";
      P.outputHints = "";
      P.outputDirectory = global.outputRootDir + global.AutoOutputDir;
      P.outputExtension = ".xisf";
      P.outputPrefix = "";
      P.outputPostfix = "_ca";
      P.overwriteExistingFiles = true;
      P.generateCometPathMap = true;
      P.onError = CometAlignment.prototype.OnError_Continue;
      P.useFileThreads = true;
      P.fileThreadOverload = 1.00;
      P.maxFileReadThreads = 0;
      P.maxFileWriteThreads = 0;

      P.executeGlobal();

      printProcessValues(P);
      engine_end_process(node);

      var alignedFiles = [];
      for (var i = 0; i < filenames.length; i++) {
            alignedFiles[alignedFiles.length] = filenames[i].replace(filename_postfix + ".", filename_postfix + "_ca.");
      }

      util.addProcessingStep("Comet alignment, " + alignedFiles.length + " files");
      console.writeln("output[0] " + alignedFiles[0]);

      return alignedFiles;
}

function getWindowSizeFromFilename(filename)
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
      var node = flowchartOperation("LocalNormalization");

      if (imagetable.length == 1 || global.get_flowchart_data) {
            console.writeln("runLocalNormalization, only one file or flowchart, no need for local normalization");
            return;
      }

      if (par.use_processed_files.val) {
            var fileNames = [];
            for (var i = 0; i < imagetable.length; i++) {
                  fileNames[i] = imagetable[i][1];
            }
            var fileProcessedStatus = getFileProcessedStatusEx(fileNames, "", global.outputRootDir + global.AutoOutputDir, ".xnml");
            if (fileProcessedStatus.processed.length == fileNames.length) {
                  util.addProcessingStep("Using existing local normalization files");
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
      if (par.use_localnormalization_multiscale.val) {
            console.writeln("runLocalNormalization, use multiscale analysis");
            P.scaleEvaluationMethod = LocalNormalization.prototype.ScaleEvaluationMethod_MultiscaleAnalysis;
      } else {
            // use default: P.scaleEvaluationMethod = LocalNormalization.prototype.ScaleEvaluationMethod_PSFSignal;
      }
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

      printProcessValues(P);
      engine_end_process(node);
}

function runLinearFit(refViewId, targetId, add_to_flowchart = false)
{
      if (refViewId == targetId) {
            return;
      }
      util.addProcessingStepAndStatusInfo("Run linear fit on " + targetId + " using " + refViewId + " as reference");
      if (refViewId == null || targetId == null) {
            save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
            util.throwFatalError("No image for linear fit, maybe some previous step like star alignment failed");
      }

      if (add_to_flowchart) {
            var node = flowchartOperation("LinearFit");
      } else {
            var node = null;
      }
      linear_fit_done = true;

      if (global.get_flowchart_data) {
            return;
      }

      var targetWin = ImageWindow.windowById(targetId);
      var P = new LinearFit;
      P.referenceViewId = refViewId;

      targetWin.mainView.beginProcess(UndoFlag_NoSwapFile);
      P.executeOn(targetWin.mainView);
      targetWin.mainView.endProcess();

      printProcessValues(P);
      engine_end_process(node, targetWin, "LinearFit", false);
}

function runDrizzleIntegration(integrationImageId, images, name, local_normalization, drizzle_extension)
{
      util.addProcessingStepAndStatusInfo("Run DrizzleIntegration");
      var node = flowchartOperation("DrizzleIntegration");

      if (global.get_flowchart_data) {
            return flowchartNewIntegrationImage(images[0][1], ppar.win_prefix + "Integration_" + name);
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

      var P = new DrizzleIntegration;
      P.inputData = drizzleImages; // [ enabled, path, localNormalizationDataPath ]
      P.enableLocalNormalization = local_normalization;
      P.scale = par.drizzle_scale.val;
      if (is_color_files) {
            P.dropShrink = 1.0;
      } else {
            P.dropShrink = 0.9;
      }
      // P.enableCFA = is_color_files && par.debayer_pattern.val != 'None';

      P.executeGlobal();

      printProcessValues(P);
      engine_end_process(node);

      util.closeOneWindowById(P.weightImageId);

      var new_name = util.windowRename(P.integrationImageId, ppar.win_prefix + "Integration_" + name);
      var new_win = ImageWindow.windowById(new_name);

      util.copyKeywordsFromWindow(new_win, ImageWindow.windowById(integrationImageId));
      setDrizzleKeyword(new_win, par.drizzle_scale.val);
      if (medianFWHM) {
            setMEDFWHMKeyword(new_win, medianFWHM * par.drizzle_scale.val);
      }

      guiUpdatePreviewId(new_name);
      //util.addScriptWindow(new_name);
      console.writeln("runDrizzleIntegration new_name " + new_name);
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
            } else if (numimages < 20) {
                  util.addProcessingStep("Auto2 using Sigma clip for rejection");
                  return ImageIntegration.prototype.SigmaClip;
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

function runFastIntegration(integration_images, name, refImage)
{
      if (global.pixinsight_version_num < 1080902) {
            util.throwFatalError("FastIntegration requires PixInsight 1.8.9-2 or later");
      }
      util.addProcessingStepAndStatusInfo("FastIntegration reference image " + refImage);
      console.writeln("runFastIntegration input[0] " + integration_images[0][1]);
      var node = flowchartOperation("FastIntegration");

      if (global.get_flowchart_data) {
            return flowchartNewIntegrationImage(integration_images[0][1], ppar.win_prefix + "Integration_" + name);
      }

      var targets = [];
      for (var i = 0; i < integration_images.length; i++) {
            targets[targets.length] = [ true, integration_images[i][1] ];    // enabled, image
      }

      var P = new FastIntegration;
      P.referenceImage = refImage;
      P.targets = targets;
      if (par.use_drizzle.val) {
            console.writeln("generate drizzle data");
            P.generateDrizzleData = true; /* Generate .xdrz files. */
      } else {
            P.generateDrizzleData = false;
      }
      P.generateRejectionMaps = false;
      P.outputDirectory = global.outputRootDir + global.AutoOutputDir;
      P.outputPostfix = "_r";
      P.overwriteExistingFiles = true;
      // Defaults from FBPP
      P.preciseAlignmentEnabled = false;
      P.useROI = false;

      // Other useful settings
      // P.weightingEnabled = true; // default false

      // Configuration settings
      P.rejectionFluxRatio = par.fastintegration_max_flux.val;          // default 0.5, AutoIntegrate default changed from 0.35 to 0.5
      P.maxStarSearchIterations = par.fastintegration_iterations.val;   // default 1, AutoIntegrate default 1
      P.medianErrorTolerance = par.fastintegration_errortolerance.val;  // default 1.5, AutoIntegrate default 1.5

      /*
       * Read-only properties
       *
       P.outputData = [ // outputImage, outputMask, totalPairMatches, inliers, overlapping, regularity, quality, rmsError, rmsErrorDev, peakErrorX, peakErrorY, H11, H12, H13, H21, H22, H23, H31, H32, H33, referenceStarX, referenceStarY, targetStarX, targetStarY
       ];
       */

      var succ = P.executeGlobal();

      if (par.debug.val) {
            console.writeln("P.outputData = [ // registeredImage, outputDrizzleFile, fastAlignment, totalPairMatches, medianError, peakError, H11, H12, H13, H21, H22, H23, H31, H32, H33, referenceStarX, referenceStarY, targetStarX, targetStarY, targetStarFlux ]");
            console.writeln("P.outputData = " + JSON.stringify(P.outputData));
      }

      printProcessValues(P);
      engine_end_process(node);

      if (!succ) {
            util.throwFatalError("FastIntegration failed at executeGlobal");
      }

      var w = util.findWindowStartsWith("FastIntegrationMaster");
      if (w != null) {
            var master_name = w.mainView.id;
      } else {
            util.throwFatalError("FastIntegration failed, no output window found");
      }

      console.writeln("Rename FastIntegration master " + master_name + " to " + ppar.win_prefix + "Integration_" + name);  

      var new_name = util.windowRename(master_name, ppar.win_prefix + "Integration_" + name);

      util.addProcessingStep("runFastIntegration, " + targets.length + " files");
      console.writeln("output " + new_name);

      util.copyKeywordsFromFile(new_name, refImage);

      return new_name;
}

function runFastIntegrationEx(integration_images, name, refImage)
{
      var id = runFastIntegration(integration_images, name, refImage)
      if (par.use_drizzle.val && name != 'LDD') {
            guiUpdatePreviewId(id);
            id = util.windowRename(id, id + "_tmp");
            var new_id = runDrizzleIntegration(id, integration_images, name, false, "_r.xdrz");
            util.closeOneWindowById(id);
            id = new_id;
      }
      return id;
}

function runBasicIntegration(images, name, local_normalization)
{
      var node = flowchartOperation("ImageIntegration");

      if (global.get_flowchart_data) {
            return flowchartNewIntegrationImage(images[0][1], "Integration");
      }

      var P = new ImageIntegration;

      P.images = images; // [ enabled, path, drizzlePath, localNormalizationDataPath ]
      if (ssweight_set && par.use_imageintegration_ssweight.val) {
            util.addProcessingStep("Using SSWEIGHT for ImageIntegration weightMode");
            P.weightMode = ImageIntegration.prototype.KeywordWeight;
            P.weightKeyword = "SSWEIGHT";
      }
      P.minWeight = par.ssweight_limit.val;     /* Default: 0.005, we use the value from the script parameter */
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

      P.largeScaleClipHigh = par.large_scale_pixel_rejection_high.val;
      if (par.large_scale_pixel_rejection_high.val) {
            console.writeln("Using large scale pixel rejection high");
      }
      P.largeScaleClipLow = par.large_scale_pixel_rejection_low.val;
      if (par.large_scale_pixel_rejection_low.val) {
            console.writeln("Using large scale pixel rejection low");
      }

      // P.esdLowRelaxation = par.ESD_lowrelaxation.val; deprecated, use default for old version

      if (local_normalization) {
            // With local normalization the pedestal is already subtracted
            P.subtractPedestals = false;
      } else {
            P.subtractPedestals = true;
      }

      try {
            var succ = P.executeGlobal();
            if (!succ) {
                  util.throwFatalError("ImageIntegration failed");
            }
      } catch (e) {
            console.criticalln("ImageIntegration failed, " + e.toString());
            throw e;
      }

      util.closeOneWindowById(P.highRejectionMapImageId);
      util.closeOneWindowById(P.lowRejectionMapImageId);
      util.closeOneWindowById(P.slopeMapImageId);

      printProcessValues(P);
      engine_end_process(node);

      util.copyKeywordsFromFile(P.integrationImageId, images[0][1]);

      /* Set the filter keyword for the integration image.
       */
      setAutoIntegrateFilters(P.integrationImageId, [ P.integrationImageId ]);
      if (medianFWHM) {
            setMEDFWHMKeyword(ImageWindow.windowById(P.integrationImageId), medianFWHM);
      }

      return P.integrationImageId;
}

function setAutoIntegrateFilters(target_id, idlist)
{
      console.writeln("setAutoIntegrateFilters, target_id " + target_id + ", idlist " + idlist);
      var filter_keywords = "";
      for (var i = 0; i < idlist.length; i++) {
            var win = ImageWindow.windowById(idlist[i]);
            var filter_keyword = util.getKeywordValue(win, "AutoIntegrateFilters");
            if (filter_keyword == null) {
                  var filter = util.getKeywordValue(win, "FILTER");
                  filter_keyword = getFilterKeywordForImage(filter, target_id, '');
            }
            if (filter_keyword) {
                  if (filter_keywords.length > 0) {
                        filter_keywords += ",";
                  }
                  filter_keywords += filter_keyword;
            }
      }
      var win = ImageWindow.windowById(target_id);
      util.setFITSKeyword(win, "AutoIntegrateFilters", filter_keywords, "Filters used");
      console.writeln("setAutoIntegrateFilters, target_id " + target_id + ", filter_keywords " + filter_keywords);
}

function runImageIntegrationEx(images, name, local_normalization)
{
      var integrationImageId = runBasicIntegration(images, name, local_normalization);

      if (par.use_drizzle.val && name != 'LDD') {
            guiUpdatePreviewId(integrationImageId);
            integrationImageId = util.windowRename(integrationImageId, integrationImageId + "_tmp");
            var new_id = runDrizzleIntegration(integrationImageId, images, name, local_normalization, ".xdrz");
            console.writeln("runImageIntegrationEx completed, new name " + new_id);
            util.closeOneWindowById(integrationImageId);
            return new_id;
      } else {
            var new_name = util.windowRename(integrationImageId, ppar.win_prefix + "Integration_" + name);
            console.writeln("runImageIntegrationEx completed, new name " + new_name);
            guiUpdatePreviewId(new_name);
            return new_name
      }
}

function checkFilesExist(imagearray)
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

function runImageIntegrationNormalized(images, best_image, name)
{
      util.addProcessingStepAndStatusInfo("ImageIntegration with LocalNormalization");

      runLocalNormalization(images, best_image, name);

      console.writeln("Using local normalized data in image integration, " + images.length + " files");
      
      var norm_images = [];
      for (var i = 0; i < images.length; i++) {
            var oneimage = [];
            var imagearray = [];
            oneimage[0] = true;                                   // enabled
            oneimage[1] = images[i][1];                           // path
            imagearray[imagearray.length] = oneimage[1];
            if (par.use_drizzle.val) {
                  oneimage[2] = images[i][1].replace(".xisf", ".xdrz"); // drizzlePath
                  imagearray[imagearray.length] = oneimage[2];
            } else {
                  oneimage[2] = "";                                     // drizzlePath
            }
            oneimage[3] = images[i][1].replace(".xisf", ".xnml");    // localNormalizationDataPath
            imagearray[imagearray.length] = oneimage[3];
            if (global.get_flowchart_data || checkFilesExist(imagearray)) {
                  norm_images[norm_images.length] = oneimage;
            } else {
                  util.addWarningStatus("ImageIntegration with LocalNormalization skipping image " + imagearray[0]);
            }
      }
      console.writeln("runImageIntegrationNormalized, " + norm_images[0][1] + ", " + norm_images[0][3]);

      return runImageIntegrationEx(norm_images, name, true);
}

function runImageIntegration(channel_images, name, save_to_file, flowchartname)
{
      var images = channel_images.images;
      if (images == null || images.length == 0) {
            return null;
      }
      util.addProcessingStepAndStatusInfo("Image " + name + " integration on " + images.length + " files");
      flowchartChildBegin(flowchartname ? flowchartname : name);
      if (!global.get_flowchart_data) {
            ensureThreeImages(images);
      }

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

            if (par.use_fastintegration.val) {
                  var image_id = runFastIntegrationEx(integration_images, name, global.best_image);
            } else {
                  var image_id = runImageIntegrationEx(integration_images, name, false);
            }

      } else {
            var image_id = runImageIntegrationNormalized(images, channel_images.best_image, name);
      }
      if (save_to_file) {
            save_id_list.push([image_id, image_id]);
      }
      util.runGarbageCollection();
      flowchartChildEnd(flowchartname ? flowchartname : name);
      console.writeln("runImageIntegration completed, new name " + image_id);
      return image_id;
}

function cropHandleDrizzle(name)
{
      console.writeln("Drizzle is used, expand the crop source image by " + par.drizzle_scale.val + "x for Crop");
      var win = ImageWindow.windowById(name);
      var P = new IntegerResample;
      P.zoomFactor = par.drizzle_scale.val;
      P.noGUIMessages = true;
      win.mainView.beginProcess(UndoFlag_NoSwapFile);
      P.executeOn(win.mainView, false);
      win.mainView.endProcess();
}

function runImageIntegrationForCrop(images)
{
      console.noteln("ImageIntegration to find area common to all images");
      console.writeln("images[0]=" + images[0][1]);

      if (global.get_flowchart_data) {
            // we should have par.crop_use_rejection_low.val == false here
            var id = flowchartNewIntegrationImage(images[0][1], ppar.win_prefix + "LowRejectionMap_ALL");
            return { integrated_image_id: id, rejection_map_id: id };
      }

      var P = new ImageIntegration;

      // The commented properties are normally defaults, not set because the defaults could
      // be changed by the developer of ImageIntegration and should not impact this process
      // (hopefully).
      P.images = images; // [ enabled, path, drizzlePath, localNormalizationDataPath ]
      // P.inputHints = "fits-keywords normalize raw cfa signed-is-physical"; //Default, maybe should force normalize
      P.combination = ImageIntegration.prototype.Minimum;
      // P.weightMode = ImageIntegration.prototype.PSFSignalWeight;
      // P.weightKeyword = "";
      // P.weightScale = ImageIntegration.prototype.WeightScale_BWMV;
      // P.csvWeights = "";
      // P.adaptiveGridSize = 16;
      // P.adaptiveNoScale = false;
      P.minWeight = par.ssweight_limit.val;  /* Default: 0.005, we use the value from the script parameter */
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
      if (par.crop_use_rejection_low.val) {
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
      if (par.cropinfo_only.val || par.crop_use_rejection_low.val) {
            P.generateRejectionMaps = true;
      } else {
            P.generateRejectionMaps = false;
      }
      // P.generateIntegratedImage = true;
      // P.generateDrizzleData = false;
      if (par.cropinfo_only.val || par.crop_use_rejection_low.val) {
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
      if (par.debug.val || par.cropinfo_only.val || par.crop_use_rejection_low.val) {
            util.windowShowif(P.lowRejectionMapImageId);
      } else {
            util.closeOneWindowById(P.lowRejectionMapImageId);
      }
      if (par.debug.val || par.cropinfo_only.val) {
            util.windowShowif(P.highRejectionMapImageId);
      } else {
            util.closeOneWindowById(P.highRejectionMapImageId);
      }
      if (par.debug.val || par.cropinfo_only.val) {
            util.windowShowif(P.slopeMapImageId);
      } else {
            util.closeOneWindowById(P.slopeMapImageId);
      }
      // KEEP (P.integrationImageId);

      engine_end_process(null);

      //console.writeln("Integration for CROP complete, \n", JSON.stringify(P, null, 2));

      //   console.writeln("highRejectionMapImageId ", P.highRejectionMapImageId)
      //   console.writeln("slopeMapImageId ", P.slopeMapImageId) 
      //   console.writeln("integrationImageId ", P.integrationImageId)
      //   console.writeln("lowRejectionMapImageId ", P.lowRejectionMapImageId)

      //console.writeln("Rename '",P.integrationImageId,"' to ",ppar.win_prefix + "LowRejectionMap_ALL")
      var new_name = util.windowRename(P.integrationImageId, ppar.win_prefix + "LowRejectionMap_ALL");

      if (par.use_drizzle.val && par.drizzle_scale.val > 1) {
            cropHandleDrizzle(new_name);
            if (par.crop_use_rejection_low.val) {
                  cropHandleDrizzle(P.lowRejectionMapImageId);
            }
      }
      engine_end_process(null);

      if (par.crop_use_rejection_low.val) {
            // We use the low rejection map to find the area common to all images
            return { integrated_image_id: new_name, rejection_map_id: P.lowRejectionMapImageId };
      } else {
            return { integrated_image_id: new_name, rejection_map_id: new_name };
      }
}

/* Do not run gradient correction so just make copy of the source window as
 * is done by AutomaticBackgroundExtractor or GraXpert.
 */
function noGradientCorrectionCopyWin(win)
{
      var new_win_id = win.mainView.id;
      var fix_postfix = "_map_pm";
      if (new_win_id.endsWith(fix_postfix)) {
            new_win_id = new_win_id.substring(0, new_win_id.length - fix_postfix.length);
      }
      var noGC_id = util.ensure_win_prefix(util.replacePostfixOrAppend(new_win_id, ["_map", "_combined"], "_processed"));
      util.addProcessingStep("No gradient correction for " + win.mainView.id + ", copy to " + noGC_id);
      util.addScriptWindow(noGC_id);
      util.copyWindow(win, noGC_id);
      return noGC_id;
}

// Run GraXpert deconvolution
function runGraXpertDeconvolution(win)
{
      var node = flowchartOperation("GraXpert deconvolution");
      if (global.get_flowchart_data) {
            return;
      }

      if (par.graxpert_median_psf.val || par.graxpert_deconvolution_stellar_psf.val > 0) {
            console.writeln("GraXpert deconvolution stars");
            runGraXpertExternal(win, GraXpertCmd.deconvolution_stars);
      }
      if (par.graxpert_median_psf.val || par.graxpert_deconvolution_nonstellar_psf.val > 0) {
            console.writeln("GraXpert deconvolution object");
            runGraXpertExternal(win, GraXpertCmd.deconvolution_object);
      }
      engine_end_process(node, win, "GraXpert deconvolution");
}


// Run GraXpert as an external process.
// With option GraXpertCmd.background we return a new image.
// Other options update the input image directly.
// With option GraXpertCmd.denoise we do flowchart operations here.
function runGraXpertExternal(win, cmd)
{
      switch (cmd) {
            case GraXpertCmd.background:
            case GraXpertCmd.deconvolution_stars:
            case GraXpertCmd.deconvolution_object:
                  // Flowchart is handled in upper levels
                  var node = null;
                  break;
            case GraXpertCmd.denoise:
                  var node = flowchartOperation("GraXpert denoise");
                  break;
            default:
                  util.throwFatalError("Unknown GraXpert command " + cmd);
      }

      if (par.graxpert_path.val == "") {
            save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
            util.throwFatalError("GraXpert path is empty, please add path to GraXpert binary in Gradient correction section");
      }
      if (!File.exists(par.graxpert_path.val)) {
            console.noteln("GraXpert path does not exist: " + par.graxpert_path.val);
      }

      var copy_win = util.copyWindowEx(win, "AutoIntegrateTemp", true);

      var image_id_name = "AutoIntegrateImageId";
      var image_id = Date.now().toString();

      util.setFITSKeyword(copy_win, image_id_name, image_id, "Image processing id.");

      var fname = File.systemTempDirectory + "/AutoIntegrateTemp.xisf";
      console.writeln("GraXpert input file " + fname);
      if (!copy_win.saveAs(fname, false, false, false, false)) {
            util.closeOneWindowById(copy_win.mainView.id);
            save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
            util.throwFatalError("Failed to save image for GraXpert: " + fname);
      }

      util.closeOneWindowById(copy_win.mainView.id);

      if (cmd == GraXpertCmd.deconvolution_stars || cmd == GraXpertCmd.deconvolution_object) {
            if (par.graxpert_median_psf.val) {
                  var psf = medianFWHM;
                  if (psf == null) {
                        // Get psf from image header
                        psf = util.getKeywordValue(win, "AutoIntegrateMEDFWHM");
                        if (psf != null) {
                              // Convert to number
                              psf = parseFloat(psf);
                        }
                  }
                  if (psf == null) {
                        save_images_in_save_id_list(); // Save images so we can return with AutoContinue
                        util.throwFatalError("Cannot run GraXpert deconvolution, AutoIntegrateMEDFWHM is not calculated. Maybe subframe selector was not run, or not using XISF/FITS image with proper header values.");
                  }
                  console.writeln("Using PSF " + psf + " from AutoIntegrateMEDFWHM value");
            } else if (cmd == GraXpertCmd.deconvolution_stars) {
                  var psf = par.graxpert_deconvolution_stellar_psf.val;
            } else {
                  var psf = par.graxpert_deconvolution_nonstellar_psf.val;
            }
      } 

      switch (cmd) {
            case GraXpertCmd.background:
                  var command = '"' + par.graxpert_path.val + '"' + " -cli -cmd background-extraction " + '"' + fname + '"' + 
                                " -correction " + par.graxpert_correction.val + " -smoothing " + par.graxpert_smoothing.val;
                  break;
            case GraXpertCmd.denoise:
                  var command = '"' + par.graxpert_path.val + '"' + " -cli -cmd denoising -strength " + par.graxpert_denoise_strength.val + 
                                " -batch_size " + par.graxpert_denoise_batch_size.val + ' "' + fname + '"';
                  break;
            case GraXpertCmd.deconvolution_stars:
                  var command = '"' + par.graxpert_path.val + '"' + " -cli -cmd deconv-stellar -strength " + par.graxpert_deconvolution_stellar_strength.val + 
                                " -psfsize " + psf + ' "' + fname + '"';
                  break;
            case GraXpertCmd.deconvolution_object:
                  var command = '"' + par.graxpert_path.val + '"' + " -cli -cmd deconv-obj -strength " + par.graxpert_deconvolution_nonstellar_strength.val + 
                                 " -psfsize " + psf + ' "' + fname + '"';
                  break;
            default:
                  util.throwFatalError("Unknown GraXpert command " + cmd);
      }

      console.writeln("GraXpert command " + command);

      var P = new ExternalProcess();
      console.writeln("GraXpert processing...");
      P.start(command);
      while (P.isStarting) {
            processEvents();
      }
      while (P.isRunning) {
            processEvents();
      }
      console.writeln("GraXpert finished");

      var graxpert_fname = fname.replace(".xisf", "_GraXpert.xisf");
      console.writeln("GraXpert output file " + graxpert_fname);

      var imgWin = util.openImageWindowFromFile(graxpert_fname, true);

      if (imgWin != null) {
            imgWin.show();
            var processed_image_id = util.getKeywordValue(imgWin, image_id_name);
      }
      if (imgWin == null || processed_image_id != image_id) {
            if (imgWin != null) {
                  util.closeOneWindowById(imgWin.mainView.id);
            }
            console.criticalln("GraXpert failed to run, possible reasons could be");
            console.criticalln("- GraXpert path is incorrect.");
            console.criticalln("- GraXpert version is not compatible with selected options.");
            console.criticalln("- GraXpert AI model is not loaded. To load the AI model, run GraXpert manually once and close it. AutoIntegrate uses the default model.");
            save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
            if (imgWin == null) {
                  util.throwFatalError("GraXpert did not run, failed to open processed image: " + graxpert_fname);
            } else {
                  util.throwFatalError("GraXpert did not run, processed image id mismatch: " + processed_image_id + " != " + image_id);
            }
      }

      if (cmd == GraXpertCmd.background) {
            console.writeln("GraXpert output window " + imgWin.mainView.id);
            imgWin.copyAstrometricSolution(win);
      } else {
            win.mainView.beginProcess(UndoFlag_NoSwapFile);
            win.mainView.image.assign(imgWin.mainView.image);
            win.mainView.endProcess();
            imgWin.forceClose();
            imgWin = win;
      }
      if (cmd == GraXpertCmd.denoise) {
            engine_end_process(node, imgWin, "GraXpert denoise");
      }

      return imgWin;
}

// Run GraXpert on an image
function runGraXpert(win, replaceTarget, postfix, from_lights)
{
      if (from_lights) {
            var node = null;
      } else {
            var node = flowchartOperation("GraXpert");
      }
      if (replaceTarget) {
            if (!global.get_flowchart_data || par.debug.val) {
                  util.addProcessingStepAndStatusInfo("Run GraXpert on image " + win.mainView.id);
            }
            var GC_id = win.mainView.id;
      } else {
            var GC_id = util.ensure_win_prefix(util.replacePostfixOrAppend(win.mainView.id, ["_map", "_combined"], postfix));
            if (!global.get_flowchart_data || par.debug.val) {
                  util.addProcessingStepAndStatusInfo("Run GraXpert from image " + win.mainView.id + ", target image " + GC_id);
            }
      }
      if (!global.get_flowchart_data) {
            console.writeln("GraXpert using correction " + par.graxpert_correction.val + ' and smoothing ' + par.graxpert_smoothing.val);
      }

      if (global.get_flowchart_data) {
            var imgWin = util.copyWindowEx(win, "AutoIntegrateTemp", true);
      } else {
            var imgWin = runGraXpertExternal(win, GraXpertCmd.background);
      }

      if (replaceTarget) {
            if (!global.get_flowchart_data || par.debug.val) {
                  console.writeln("GraXpert replace target " + GC_id);
            }
            util.closeOneWindowById(win.mainView.id);
            var copyWin = util.copyWindowEx(imgWin, GC_id, true);
      } else {
            if (!global.get_flowchart_data || par.debug.val) {
                  console.writeln("GraXpert create target " + GC_id);
            }
            var copyWin = util.copyWindowEx(imgWin, GC_id, true);
      }
      util.closeOneWindowById(imgWin.mainView.id);
      copyWin.show();

      if (!global.get_flowchart_data || par.debug.val) {
            console.writeln("GraXpert output window " + copyWin.mainView.id);
      }
      engine_end_process(node, util.findWindow(GC_id), "GraXpert");

      return GC_id;
}

function runABEex(win, replaceTarget, postfix, from_lights)
{
      if (from_lights) {
            var node = null;
      } else {
            var node = flowchartOperation("AutomaticBackgroundExtractor");
      }
      if (replaceTarget) {
            util.addProcessingStepAndStatusInfo("Run ABE on image " + win.mainView.id);
            var GC_id = win.mainView.id;
      } else {
            var GC_id = util.ensure_win_prefix(util.replacePostfixOrAppend(win.mainView.id, ["_map", "_combined"], postfix));
            util.addProcessingStepAndStatusInfo("Run ABE from image " + win.mainView.id + ", target image " + GC_id);
      }
      console.writeln("ABE using function degree " + par.ABE_degree.val + ' and correction ' + par.ABE_correction.val);

      var P = new AutomaticBackgroundExtractor;
      P.correctedImageId = GC_id;
      P.replaceTarget = replaceTarget;
      P.discardModel = true;
      if (par.ABE_correction.val == 'Subtraction') {
            P.targetCorrection = AutomaticBackgroundExtractor.prototype.Subtract;
      } else if (par.ABE_correction.val == 'Division') {
            P.targetCorrection = AutomaticBackgroundExtractor.prototype.Divide;
      } else {
            save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
            util.throwFatalError("Unknown ABE correction " + par.ABE_correction.val);
      }
      P.polyDegree = par.ABE_degree.val;

      if (par.debug.val) {
            console.writeln("DEBUG: ABE parameters:");
            console.writeln(P.toSource());
      }

      win.mainView.beginProcess(UndoFlag_NoSwapFile);

      P.executeOn(win.mainView, false);

      win.mainView.endProcess();

      printProcessValues(P);
      engine_end_process(null);

      util.addScriptWindow(GC_id);

      if (!replaceTarget) {
            if (global.pixinsight_version_num >= 1080902) {
                  var targetWindow = util.findWindow(GC_id);
                  if (targetWindow != null) {
                        targetWindow.copyAstrometricSolution(win);
                  }
            }
      }
      engine_end_process(node, util.findWindow(GC_id), "AutomaticBackgroundExtractor");

      return GC_id;
}

function runGCProcess(win, replaceTarget, postfix, from_lights)
{
      if (from_lights) {
            var node = null;
      } else {
            var node = flowchartOperation("GradientCorrection");
      }
      if (replaceTarget) {
            util.addProcessingStepAndStatusInfo("Run GradientCorrection on image " + win.mainView.id);
            var GC_id = win.mainView.id;
      } else {
            var GC_id = util.ensure_win_prefix(util.replacePostfixOrAppend(win.mainView.id, ["_map", "_combined"], postfix));
            util.addProcessingStepAndStatusInfo("Run GradientCorrection from image " + win.mainView.id + ", target image " + GC_id);
            win = util.copyWindowEx(win, GC_id, true);
      }
      console.writeln("GradientCorrection using Smoothness " + par.gc_smoothness.val + 
                      ', Automatic convergence ' + par.gc_automatic_convergence.val +
                      ", Structure Protection " + par.gc_structure_protection.val +
                      ", Protection threshold " + par.gc_protection_threshold.val + 
                      ", Protection amount " + par.gc_protection_amount.val);

      if (global.get_flowchart_data) {
            return GC_id;
      }
      
      var P = new GradientCorrection;
      P.scale = par.gc_scale.val;
      P.smoothness = par.gc_smoothness.val;
      P.protection = par.gc_structure_protection.val;
      P.protectionThreshold = par.gc_protection_threshold.val;
      P.protectionAmount = par.gc_protection_amount.val;
      P.protectionSmoothingFactor = 16;
      P.automaticConvergence = par.gc_automatic_convergence.val;
      P.generateProtectionMasks = false;
      P.useSimplification = par.gc_simplified_model.val;
      P.simplificationDegree = par.gc_simplified_model_degree.val;
      P.generateGradientModel = par.gc_output_background_model.val;

      if (par.debug.val) {
            util.copyWindowEx(win, win.mainView.id + "_GC_before", true);
      }

      var succp = P.executeOn(win.mainView, false);
      if (!succp) {
            util.addCriticalStatus("GradientCorrection failed");
      } else {
            if (par.debug.val) {
                  util.copyWindowEx(win, win.mainView.id + "_GC_after", true);
            }
      }

      printProcessValues(P);

      engine_end_process(node, util.findWindow(GC_id), "GradientCorrection");

      return GC_id;
}

function runSpectrophotometricFluxCalibration(win)
{
      var node = flowchartOperation("SpectrophotometricFluxCalibration");

      if (global.get_flowchart_data) {
            return;
      }

      var P = new SpectrophotometricFluxCalibration;
      P.narrowbandMode = is_narrowband_files && !is_rgb_files && !is_color_files;
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
      P.psfType = SpectrophotometricFluxCalibration.prototype.PSFType_Auto;
      P.psfGrowth = 1.75;
      P.psfMaxStars = 24576;
      P.psfSearchTolerance = 4.00;
      P.psfChannelSearchTolerance = 2.00;
      P.generateGraphs = false;
      P.generateStarMaps = false;
      P.generateTextFiles = false;
      P.outputDirectory = "";
      
      var succp = P.executeOn(win.mainView, false);
      if (!succp) {
            util.addCriticalStatus("SpectrophotometricFluxCalibration failed");
      }

      printProcessValues(P);
      engine_end_process(node, win, "SpectrophotometricFluxCalibration");
}

function runMultiscaleGradientCorrectionProcess(win)
{
      console.writeln("MultiscaleGradientCorrection using scale " + par.mgc_scale.val);

      var node = flowchartOperation("MultiscaleGradientCorrection");

      if (global.get_flowchart_data) {
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
      P.gradientScale = parseInt(par.mgc_scale.val);
      P.structureSeparation = par.mgc_structure_separation.val;
      P.modelSmoothness = 1.00;
      P.minFieldRatio = 0.017;
      P.maxFieldRatio = 0.167;
      P.enforceFieldLimits = true;
      P.scaleFactorRK = par.mgc_scale_factor.val;
      P.scaleFactorG = par.mgc_scale_factor.val;
      P.scaleFactorB = par.mgc_scale_factor.val;
      P.showGradientModel = par.mgc_output_background_model.val;

      if (par.debug.val) {
            util.copyWindowEx(win, win.mainView.id + "_MGC_before", true);
      }

      var succp = P.executeOn(win.mainView, false);

      if (!succp) {
            console.criticalln("MultiscaleGradientCorrection failed");
      } else {
            if (par.debug.val) {
                  util.copyWindowEx(win, win.mainView.id + "_MGC_after", true);
            }
      }
      printProcessValues(P);
      engine_end_process(node, win, "MultiscaleGradientCorrection");

      return succp;
}

function runMultiscaleGradientCorrection(win, replaceTarget, postfix, from_lights)
{
      if (from_lights) {
            util.throwFatalError("MultiscaleGradientCorrection not supported for all lights files");
      }
      if (replaceTarget) {
            util.addProcessingStepAndStatusInfo("Run MultiscaleGradientCorrection on image " + win.mainView.id);
            var GC_id = win.mainView.id;
      } else {
            var GC_id = util.ensure_win_prefix(util.replacePostfixOrAppend(win.mainView.id, ["_map", "_combined"], postfix));
            util.addProcessingStepAndStatusInfo("Run MultiscaleGradientCorrection from image " + win.mainView.id + ", target image " + GC_id);
            win = util.copyWindowEx(win, GC_id, true);
      }

      /* If BlurXTerminator is available, we run it first in correct only mode.
       * Then we run SpectrophotometricFluxCalibration. Actual MultiscaleGradientCorrection
       * is run as the last step.
       */
      if (par.use_blurxterminator.val) {
            runBlurXTerminator(win, true);      
      }
      runImageSolver(win.mainView.id);
      runSpectrophotometricFluxCalibration(win);
      if (runMultiscaleGradientCorrectionProcess(win)) {
            return GC_id;
      } else {
            if (!replaceTarget) {
                  if (solved_imageId == win.mainView.id) {
                        console.writeln("Set solved image as null");
                        solved_imageId = null;
                  }
                  console.criticalln("MultiscaleGradientCorrection failed on image " + win.mainView.id + ", closing window");
                  win.forceClose();
            }
            return null;
      }
}

function getGradientCorrectionName()
{
      if (par.use_graxpert.val) {
            return "GraXpert";
      } else if (par.use_abe.val) {
            return "AutomaticBackgroundExtractor";
      } else if (par.use_multiscalegradientcorrection.val) {
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
function getDefaultGradientCorrectionMethod(skip_mgc = false)
{
      if (par.use_multiscalegradientcorrection.val && !skip_mgc) {
            return "MultiscaleGradientCorrection";
      } else if (par.use_graxpert.val) {
            return "GraXpert";
      } else if (par.use_abe.val) {
            return "ABE";
      } else {
            return "GradientCorrection";
      }
}

function runGradientCorrectionEx(win, replaceTarget, postfix, from_lights, gc_method = 'Auto')
{
      if (gc_method == 'Auto') {
            gc_method = getDefaultGradientCorrectionMethod();
      }
      if (gc_method == 'GraXpert') {
            var GC_id = runGraXpert(win, replaceTarget, postfix, from_lights);
      } else if (gc_method == 'ABE') {
            var GC_id = runABEex(win, replaceTarget, postfix, from_lights);
      } else if (gc_method == 'MultiscaleGradientCorrection') {
            var GC_id = runMultiscaleGradientCorrection(win, replaceTarget, postfix, from_lights);
            if (GC_id == null) {
                  // MultiscaleGradientCorrection failed, try some other gradient correct.
                  // Since the full sky area is not available for MultiscaleGradientCorrection,
                  // we can try some other gradient correction method.
                  // We recurse back to this function with a specific method to try.
                  gc_method = getDefaultGradientCorrectionMethod(true);
                  util.addCriticalStatus("MultiscaleGradientCorrection failed on image " + win.mainView.id + ", using " + gc_method);
                  var GC_id = runGradientCorrectionEx(win, replaceTarget, postfix, from_lights, gc_method);
            }
      } else {
            var GC_id = runGCProcess(win, replaceTarget, postfix, from_lights);
      }
      return GC_id;
}

function runGradientCorrection(win, replaceTarget, gc_method = 'Auto')
{
      return runGradientCorrectionEx(win, replaceTarget, "_processed", false, gc_method);
}

// Run gradient correction and rename windows so that the final result has the same id
function runGradientCorrectionBeforeChannelCombination(id)
{
      if (id == null) {
            save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
            util.throwFatalError("No image for gradient correction, maybe some previous step like star alignment failed");
      }
      var id_win = ImageWindow.windowById(id);
      runGradientCorrectionEx(id_win, true, "", false);
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

   engine_end_process(null);

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

      engine_end_process(null);
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
            if (process_narrowband) {
                  if (linear_fit_done) {
                        console.writeln("Narrowband and linear fit done, use RGB channels linked");
                        rgbLinked = true;
                  } else if (spcc_color_calibration_done && H_in_R_channel) {
                        console.writeln("Narrowband, SPCC and H mapped into red channel, use RGB channels linked");
                        rgbLinked = true;
                  } else {
                        console.writeln("Default narrowband, use RGB channels unlinked");
                        rgbLinked = false;
                  }
            } else if (is_color_files && iscolor) {
                  // We have color/OSC images and a color file, we use unlinked stretch
                  // to get rid of possible color cast
                  console.writeln("Color file, use RGB channels unlinked");
                  rgbLinked = false;
            } else {
                  // Assume color calibration has balanced the channels, use linked stretch
                  console.writeln("Use default RGB channels linked");
                  rgbLinked = true;
            }
            return rgbLinked;
      }
}

function runHistogramTransformSTFex(GC_win, stf_to_use, iscolor, targetBackground, silent, rgbLinked)
{
      if (!silent) {
            util.addProcessingStep("Run histogram transform on " + GC_win.mainView.id + " based on autostretch, targetBackground " + targetBackground);
      }

      if (stf_to_use == null) {
            /* Apply autostretch on image */
            if (rgbLinked == null) {
                  rgbLinked = getRgbLinked(iscolor);
            }
            ApplyAutoSTF(GC_win.mainView,
                        DEFAULT_AUTOSTRETCH_SCLIP,
                        targetBackground,
                        rgbLinked,
                        silent);
            stf_to_use = GC_win.mainView.stf;
      }

      /* Run histogram transfer function based on autostretch */
      applySTF(GC_win.mainView, stf_to_use, iscolor);

      /* Undo autostretch */
      if (!silent) {
            console.writeln("  Undo STF on " + GC_win.mainView.id);
      }
      var stf = new ScreenTransferFunction;

      GC_win.mainView.beginProcess(UndoFlag_NoSwapFile);

      if (!silent) {
            console.writeln(" Execute autostretch on " + GC_win.mainView.id);
      }
      stf.executeOn(GC_win.mainView);

      GC_win.mainView.endProcess();

      engine_end_process(null);

      return stf_to_use;
}

function autoStretch(imgWin, silent = true)
{
      engine.runHistogramTransformSTFex(imgWin, null, imgWin.mainView.image.isColor, DEFAULT_AUTOSTRETCH_TBGND, silent, null);
}

function runHistogramTransformSTF(GC_win, stf_to_use, iscolor, targetBackground)
{
      return engine.runHistogramTransformSTFex(GC_win, stf_to_use, iscolor, targetBackground, false, null);
}

function histogramPrestretch(GC_win, target_val)
{
      console.writeln("Execute prestretch using HistogramTransformation on " + GC_win.mainView.id);
      adjustHistogram(GC_win, target_val);
      return GC_win;
}

function runHistogramTransformMaskedStretch(GC_win, image_stretching, histogram_prestretch)
{
      util.addProcessingStepAndStatusInfo("Run histogram transform on " + GC_win.mainView.id + " using " + image_stretching);
      
      if (histogram_prestretch) {
            GC_win = histogramPrestretch(GC_win, par.MaskedStretch_prestretch_target.val);
      }

      var P = new MaskedStretch;
      P.targetBackground = par.MaskedStretch_targetBackground.val;

      GC_win.mainView.beginProcess(UndoFlag_NoSwapFile);

      console.writeln("Execute MaskedStretch on " + GC_win.mainView.id);
      P.executeOn(GC_win.mainView);

      GC_win.mainView.endProcess();

      printProcessValues(P);
      engine_end_process(null);

      return GC_win;
}

function runHistogramTransformArcsinhStretch(GC_win, image_stretching, histogram_poststretch)
{
      util.addProcessingStepAndStatusInfo("Run histogram transform on " + GC_win.mainView.id + " using " + image_stretching);

      var stretch = Math.pow(par.Arcsinh_stretch_factor.val, 1/par.Arcsinh_iterations.val);

      console.writeln("Execute ArcsinhStretch on " + GC_win.mainView.id);

      for (var i = 0; i < par.Arcsinh_iterations.val; i++) {

            var P = new ArcsinhStretch;
            P.stretch = stretch;
            P.blackPoint = findSymmetryPoint(GC_win, par.Arcsinh_black_point.val);
            if (P.blackPoint > 0.20) {
                  P.blackPoint = 0.20;
            }
            P.protectHighlights = false;  // setting to true does not work well

            GC_win.mainView.beginProcess(UndoFlag_NoSwapFile);

            P.executeOn(GC_win.mainView);

            GC_win.mainView.endProcess();

            printProcessValues(P);
            engine_end_process(null);
            util.runGarbageCollection();

            var peak_val = findHistogramPeak(GC_win).normalizedPeakCol;
            console.writeln("Iteration " + i + ", stretch " + stretch + ", black point " + P.blackPoint + ", current peak at " + peak_val);
      }
      if (histogram_poststretch) {
            console.writeln("Execute Histogram stretch on " + GC_win.mainView.id);
            GC_win = stretchHistogramTransformIterations(GC_win, GC_win.mainView.image.isColor, 'Histogram stretch', par.histogram_stretch_target.val, null);
      }
      return GC_win;
}

function runHistogramTransformHyperbolicIterations(GC_win, iscolor, use_GHS_process)
{
      if (use_GHS_process) {
            util.addProcessingStepAndStatusInfo("Run histogram transform on " + GC_win.mainView.id + " using Generalized Hyperbolic Stretching process");
      } else {
            util.addProcessingStepAndStatusInfo("Run histogram transform on " + GC_win.mainView.id + " using Generalized Hyperbolic Stretching PixelMath formulas");
      }
      console.writeln("Start values D = " + par.Hyperbolic_D.val + ", b = " + par.Hyperbolic_b.val + ", SP = " + par.Hyperbolic_SP.val);

      var res = { 
                  win: GC_win, 
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
            var window_updated = runHistogramTransformHyperbolic(res, iscolor, use_GHS_process, par.Hyperbolic_iterations.val);
            if (window_updated && i > 0 && i % 5 == 0) {
                  guiUpdatePreviewWin(res.win);
            }
            engine_end_process(null);
            util.runGarbageCollection();
            if (res.completed) {
                  break;
            }
      }
      guiUpdatePreviewWin(res.win);
      return res.win;
}

/*
function stretchHistogramTransformChannel(GC_win, image_stretching, target_value, degree, channel)
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

      var window_updated = stretchHistogramTransformIterationStep(res, image_stretching, channel);
      if (window_updated) {
            guiUpdatePreviewWin(res.win);
      }
      engine_end_process(null);
      util.runGarbageCollection();
      return res.win;
}
*/

function stretchHistogramTransformIterationsChannel(GC_win, image_stretching, target_value, channel, degree, copy_window, maxiterations=20)
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
            var window_updated = stretchHistogramTransformIterationStep(res, image_stretching, channel);
            if (window_updated) {
                  if (i > 0 && i % 5 == 0) {
                        guiUpdatePreviewWin(res.win);
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
                        util.throwFatalError("Unknown image stretching " + image_stretching);
                  }
            }
            engine_end_process(null);
            util.runGarbageCollection();
            if (res.completed) {
                  break;
            }
      }

      // Do final step to get histogram to the required position
      adjustHistogram(res.win, target_value, channel);

      guiUpdatePreviewWin(res.win);
      return res.win;
}

function stretchHistogramTransformIterations(GC_win, iscolor, image_stretching, target_val, rgbLinked)
{
      util.addProcessingStepAndStatusInfo("Run " + image_stretching + " on " + GC_win.mainView.id + " using iterations");

      if (rgbLinked == null) {
            if (GC_win.mainView.image.isColor) {
                  rgbLinked = getRgbLinked(iscolor);
            } else {
                  rgbLinked = true;
            }
      }
      console.writeln("RGB channels linked " + rgbLinked);

      if (target_val == null) {
            target_val = par.histogram_stretch_target.val;
      }
      console.writeln("Target value " + target_val);

      if (rgbLinked) {
            console.writeln("Channel: " + channelText(-1));
            return stretchHistogramTransformIterationsChannel(GC_win, image_stretching, target_val, null, null, false);
      } else {
            for (var i = 0; i < 3; i++) {
                  console.writeln("Channel: " + channelText(i));
                  GC_win = stretchHistogramTransformIterationsChannel(GC_win, image_stretching, target_val, i, null, false);
                  util.runGarbageCollection();
            }
            return GC_win;
      }
}

function stretchFunctionIterations(GC_win, iscolor, image_stretching, stretch_target_val, degree)
{
      var debug = par.debug.val;

      if (0) {
            if (!GC_win.mainView.image.isColor) {
                  save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
                  util.throwFatalError("Stretch function " + image_stretching + " only works on color images");
            }
            if (!iscolor) {
                  save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
                  util.throwFatalError("Stretch function " + image_stretching + " only works on color images");
            }
      }
      if (1) {
            // For now, always use linked stretch
            rgbLinked = true;
      } else {
            if (GC_win.mainView.image.isColor) {
                  var rgbLinked = getRgbLinked(iscolor);
            } else {
                  var rgbLinked = true;
            }
      }
      util.addProcessingStepAndStatusInfo("Run " + image_stretching + " on " + GC_win.mainView.id + " using iterations");

      // Run the stretch function on the image
      if (rgbLinked) {
            console.writeln("Channel: " + channelText(-1));
            GC_win = stretchHistogramTransformIterationsChannel(GC_win, image_stretching, stretch_target_val, null, degree, true);
            if (debug) {
                  util.copyWindowEx(GC_win, util.mapBadWindowNameChars(image_stretching + "_linked_final_debug"), true);
            }
      
      } else {
            var R_id = extractRGBchannel(GC_win.mainView.id, 'R');
            console.writeln("Channel: R");
            var R_win = stretchHistogramTransformIterationsChannel(util.findWindow(R_id), image_stretching, stretch_target_val, 0, degree, true);

            var G_id = extractRGBchannel(GC_win.mainView.id, 'G');
            console.writeln("Channel: G");
            var G_win = stretchHistogramTransformIterationsChannel(util.findWindow(G_id), image_stretching, stretch_target_val, 0, degree, true);

            var B_id = extractRGBchannel(GC_win.mainView.id, 'B');
            console.writeln("Channel: B");
            var B_win = stretchHistogramTransformIterationsChannel(util.findWindow(B_id), image_stretching, stretch_target_val, 0, degree, true);

            runPixelMathRGBMapping(null, GC_win, R_id, G_id, B_id);

            util.closeOneWindowById(R_id);
            util.closeOneWindowById(G_id);
            util.closeOneWindowById(B_id);
            util.closeOneWindowById(R_win.mainView.id);
            util.closeOneWindowById(G_win.mainView.id);
            util.closeOneWindowById(B_win.mainView.id);

            util.runGarbageCollection();
            if (debug) {
                  util.copyWindowEx(GC_win, util.mapBadWindowNameChars(image_stretching + "_unlinked_final_debug"), true);
            }
      }
      return GC_win;
}

// Possible options for computeOrFetchProperty:
// Mean, Modulus, SumOfSquares, Median, Variance, StdDev, AvgDev, MAD, BWMV, PBMV, Sn, Qn, Minimum, MinimumPos, Maximum, MaximumPos, Histogram16, Histogram20​
function printImageStatistics(win, channel = -1)
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
      console.writeln("Image statistics for " + view.id + ", channel " + channelText(channel));

      console.writeln(channelText(channel) + " Median " + med + 
                                             " Mean " + mean +
                                             " MAD " + MAD +
                                             " stdDev " + stdDev +
                                             " min " + min + 
                                             " max " + max);
}

function calculateMTFParameter(source, target) 
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
            if (par.debug.val) console.writeln("calculateMTFParameter, mid " + mid + ", low " + low + ", high " + high);
      
            currentMedian = Math.mtf(mid, source); 
            if (par.debug.val) console.writeln("calculateMTFParameter, currentMedian " + currentMedian + ", target " + target);
      
            if (currentMedian > target) {
                  low = mid;
            } else {
                  high = mid;
            }
      
            iterations++;
            if (par.debug.val) console.writeln("calculateMTFParameter, iterations " + iterations);
      }
    
      if (iterations >= maxIterations) {
            console.writeln("Maximum iterations reached. Could not achieve target median within tolerance.");
      }
    
      return mid;
}

function adjustHistogram(win, target_value, channel = -1)
{
      if (channel == null || channel == undefined) {
            channel = -1;
      }
      console.writeln("adjustHistogram, " + channelText(channel) + ", target_value " + target_value);
      
      var midtones = [ 0.50000000, 0.50000000, 0.50000000, 0.50000000 ];

      if (channel >= 0) {
            var med = win.mainView.computeOrFetchProperty("Median").at(channel);
      } else {
            var med = win.mainView.image.median();
      }
      console.writeln("adjustHistogram, " + channelText(channel) + ", median " + med);

      var new_midtones = calculateMTFParameter(med, target_value);
      console.writeln("adjustHistogram, calculateMTFParameter, " + channelText(channel) + ", new midtones " + new_midtones);

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

      win.mainView.beginProcess(UndoFlag_NoSwapFile);
      P.executeOn(win.mainView);
      win.mainView.endProcess();

      engine_end_process(null);

      if (channel >= 0) {
            med = win.mainView.computeOrFetchProperty("Median").at(channel);
      } else {
            med = win.mainView.image.median();
      }
      console.writeln(channelText(channel) + " new median " + med);
}

function histogramDirectStretch(win, image_stretching, iscolor, target_value)
{
      util.addProcessingStepAndStatusInfo("Run histogram transform on " + win.mainView.id + " using " + image_stretching + " with target value " + target_value);

      if (win.mainView.image.isColor) {
            var rgbLinked = getRgbLinked(iscolor);
      } else {
            var rgbLinked = true;
      }
      
      var midtones = [ 0.50000000, 0.50000000, 0.50000000, 0.50000000 ];

      if (rgbLinked) {
            var med = win.mainView.image.median();
            console.writeln("histogramDirectStretch, " + channelText(-1) + ", median " + med);
            var new_midtones = calculateMTFParameter(med, target_value);
            console.writeln("histogramDirectStretch, calculateMTFParameter, " + channelText(-1) + ", new midtones " + new_midtones);
            midtones[3] = new_midtones;
      } else {
            for (var i = 0; i < 3; i++) {
                  var med = win.mainView.computeOrFetchProperty("Median").at(i);
                  console.writeln("histogramDirectStretch, " + channelText(i) + ", median " + med);
                  var new_midtones = calculateMTFParameter(med, target_value);
                  console.writeln("histogramDirectStretch, calculateMTFParameter, " + channelText(i) + ", new midtones " + new_midtones);
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

      win.mainView.beginProcess(UndoFlag_NoSwapFile);
      P.executeOn(win.mainView);
      win.mainView.endProcess();

      engine_end_process(null);

      if (rgbLinked) {
            var med = win.mainView.image.median();
            console.writeln("histogramDirectStretch, " + channelText(-1) + ", new median " + med);
      } else {
            for (var i = 0; i < 3; i++) {
                  var med = win.mainView.computeOrFetchProperty("Median").at(i);
                  console.writeln("histogramDirectStretch, " + channelText(i) + ", new median " + med);
            }
      }
}

function stretchHistogramTransformAdjustShadows(new_win, channel, use_median)
{
      console.writeln("stretchHistogramTransformAdjustShadows");
      
      var shadows = [ 0.00000000, 0.00000000, 0.00000000, 0.00000000 ];

      var shadows_clip_value = 0;
      var adjust = getAdjustPoint(new_win, shadows_clip_value, channel);

      if (adjust.normalizedAdjustPoint == 0) {
            console.writeln("No shadows to adjust");
            return 0;
      }
      
      if (channel >= 0) {
            shadows[channel] = adjust.normalizedAdjustPoint;
      } else {
            shadows[3] = adjust.normalizedAdjustPoint;
      }
      console.writeln("stretchHistogramTransformAdjustShadows, " + channelText(channel) + ", shadows " + adjust.normalizedAdjustPoint);

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

      engine_end_process(null);

      if (use_median) {
            if (channel >= 0) {
                  var current_value = new_win.mainView.computeOrFetchProperty("Median").at(channel);
            } else {
                  var current_value = new_win.mainView.image.median();
            }
            console.writeln(channelText(channel) + " median " + current_value);
      } else {
            var current_value = findHistogramPeak(new_win, channel).normalizedPeakCol;
            console.writeln(channelText(channel) + " peak " + current_value);
      }
      return adjust.clipCount;
}

/* Experimenting with stretching, mostly just for fun and to understand
 * some functions and concepts.
 * Works pretty ok on some images with Crop to common area and zero shadow
 * clipping.
 */
function stretchHistogramTransformIterationStep(res, image_stretching, channel)
{
      var copy_window = res.copy_window;
      var clipCount = 0;

      if (channel == null || channel == undefined || channel == -1) {
            channel = -1;
      } else if (channel >= 3) {
            util.throwFatalError("Invalid channel " + channel + " for stretchHistogramTransformIterationStep");
      }

      console.writeln(image_stretching + " on " + res.win.mainView.id + ", iteration " + res.iteration_number + ", channel " + channelText(channel));
      console.writeln("\n****************************************************************");
      console.writeln("*** start iteration " + res.iteration_number + ", " + channelText(channel));

      if (res.iteration_number == 1) {
            printImageStatistics(res.win, channel);
      }

      var target_value = res.target_value;
      var use_median = par.histogram_stretch_type.val == 'Median';

      if (copy_window) {
            var new_win = util.copyWindowEx(res.win, "autointegrate_temp_stretch", true);
      } else {
            var new_win = res.win;  // Update original window
      }

      if (res.iteration_number == 1) {
            clipCount = stretchHistogramTransformAdjustShadows(new_win, channel, use_median);
      }

      var midtones = [ 0.50000000, 0.50000000, 0.50000000, 0.50000000 ];

      if (use_median) {
            if (channel >= 0) {
                  var current_value = new_win.mainView.computeOrFetchProperty("Median").at(channel);
            } else {
                  var current_value = new_win.mainView.image.median();
            }
            console.writeln(channelText(channel) + " median " + current_value);
      } else {
            var current_value = findHistogramPeak(new_win, channel).normalizedPeakCol;
            console.writeln(channelText(channel) + " peak " + current_value);
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
                  new_win.mainView.beginProcess(UndoFlag_NoSwapFile);
                  P.executeOn(new_win.mainView);
                  new_win.mainView.endProcess();

                  engine_end_process(null);

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
                  engine_end_process(null);
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
            runPixelMathSingleMappingEx(new_win.mainView.id, "logarithmic stretch", mapping, false, null, true, true, false);

      } else if (image_stretching == 'Asinh+Histogram stretch') {

            if (res.forward) {
                  // stretched_pixel = scale_factor * arcsinh(pixel / scale_factor)
                  // Typical scale_factor values range from 0.001 to 0.1.
                  // Start with 0.01
                  var mapping = "asinh($T / " + res.degree + ") / asinh(" + res.degree + ")";
            } else {
                  save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
                  util.throwFatalError("Asinh+Histogram stretch does not support reverse stretching");
            }
            runPixelMathSingleMappingEx(new_win.mainView.id, "asinh stretch", mapping, false, null, true, true, false);

      } else if (image_stretching == 'Square root stretch') {

            if (res.forward) {
                  // stretched_pixel = sqrt(pixel)
                  var mapping = "sqrt(" + res.degree + " * $T)";
            } else {
                  throw new Error("Square root stretch does not support reverse stretching");
            }
            runPixelMathSingleMappingEx(new_win.mainView.id, "sqrt stretch", mapping, false, null, true, true, false);

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
                  save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
                  util.throwFatalError("Shadow stretch does not support reverse stretching");
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
                  save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
                  util.throwFatalError("Highlight stretch does not support reverse stretching");
            }

      } else {
            util.throwFatalError("Unknown image stretching method: " + image_stretching);
      }

      if (use_median) {
            if (channel >= 0) {
                  current_value = new_win.mainView.computeOrFetchProperty("Median").at(channel);
            } else {
                  current_value = new_win.mainView.image.median();
            }
            console.writeln(channelText(channel) + " median " + current_value);
      } else {
            current_value = findHistogramPeak(new_win, channel).normalizedPeakCol;
            console.writeln(channelText(channel) + " peak " + current_value);
      }

      if (res.iteration_number == 1) {
            // clipCount = stretchHistogramTransformAdjustShadows(new_win, channel, use_median);
      }

      // check where histograms are
      printImageStatistics(new_win, channel);

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
            // util.closeOneWindow(new_win);
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
            // util.closeOneWindow(new_win);
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
                  setTargetFITSKeywordsForPixelmath(new_win, getTargetFITSKeywordsForPixelmath(res.win));
                  // close old image
                  var image_id = res.win.mainView.id;
                  console.writeln("Close old window " + image_id);
                  res.win.forceClose();
                  // rename new as old
                  console.writeln("Rename new window " + new_win.mainView.id + " to " + image_id);
                  util.windowRename(new_win.mainView.id, image_id);
                  res.win = new_win;
            }
            res.clipCount += clipCount;
            console.writeln("*** Clipped total of " + res.clipCount + " pixels");
      }

      console.writeln("*** end iteration " + res.iteration_number + ", " + channelText(channel));
      console.writeln("****************************************************************\n");

      return window_updated;
}

function runHistogramTransformHyperbolic(res, iscolor, use_GHS_process, max_iterations)
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
                  // var new_win = util.copyWindow(res.win, res.win.mainView.id + "_GHStmp");
                  var new_win = res.win;  // We now update original window

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
                  engine_end_process(null);
            } catch(err) {
                  console.criticalln("GeneralizedHyperbolicStretch failed");
                  console.criticalln(err);
                  util.addProcessingStep("Maybe GeneralizedHyperbolicStretch is not installed");
                  // util.closeOneWindowById(new_win.mainView.id);
                  save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
                  util.throwFatalError("GeneralizedHyperbolicStretch failed to run");
            }
      
      } else {
            save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
            util.throwFatalError("Only GHS process is supported");      

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

            engine_end_process(null);

            var new_win = util.findWindow(P.newImageId);
      }

      // util.copyWindowEx(new_win, image_id+"_iteration_"+iteration_number+"_D_"+parseInt(Hyperbolic_D_val)+"_b_"+parseInt(Hyperbolic_b_val), true);

      var median = findSymmetryPoint(new_win, 50);
      var peak_val = findHistogramPeak(new_win).normalizedPeakCol;
      console.writeln("peak_val " + peak_val + ", median "+ median);

      var window_updated = false;
      var keep_image = false;

      if (max_iterations == 1) {
            console.writeln("Stretch completed, single iteration, current=" + peak_val + ", target=" + par.Hyperbolic_target.val);
            keep_image = true;
      } else if (median >= 0.5 && max_iterations) {
            // We are past the median limit value, ignore this iteration and keep old image
            console.writeln("We are past median limit of 0.5, skip this iteration, median=" + median);
            // util.closeOneWindowById(new_win.mainView.id);
            res.skipped++;
      } else if (peak_val > par.Hyperbolic_target.val + 0.1 * par.Hyperbolic_target.val) {
            // We are past the target value, ignore this iteration and keep old image
            console.writeln("We are past the target, skip this iteration, current=" + peak_val + ", target=" + par.Hyperbolic_target.val);
            // util.closeOneWindowById(new_win.mainView.id);
            res.skipped++;
      } else if (peak_val < res.peak_val) {
            console.writeln("Histogram peak moved to left from " + res.peak_val + " to " + peak_val + ", skip this iteration");
            // util.closeOneWindowById(new_win.mainView.id);
            res.skipped++;
      } else {
            // we are close enough, we are done
            console.writeln("Stretch completed, we are close enough, current=" + peak_val + ", target=" + par.Hyperbolic_target.val);
            keep_image = true;
      }
      if (keep_image) {
            res.completed = true;
            window_updated = true;
            if (0) {
                  // we now update directly to the original window
                  // find new window and copy keywords
                  setTargetFITSKeywordsForPixelmath(new_win, getTargetFITSKeywordsForPixelmath(res.win));
                  // close old image
                  util.closeOneWindowById(image_id);
                  // rename new as old
                  util.windowRename(new_win.mainView.id, image_id);
            }
            res.win = new_win;
            res.peak_val = peak_val;
      }
      return window_updated;
}

function runHistogramTransform(GC_win, stf_to_use, iscolor, type)
{
      // Check for valid type values
      switch (type) {
            case 'stars':
            case 'mask':
                  var run_adjust_shadows = false;
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
                  var run_adjust_shadows = true;
                  break;
            default:
                  util.throwFatalError("Bad runHistogramTransform type value " + type);
      }
      if (!run_HT) {
            util.addProcessingStep("Do not run histogram transform on " + GC_win.mainView.id);
            return { win: GC_win, stf: null };
      }
      console.writeln("runHistogramTransform, type " + type + ", iscolor " + iscolor, ", run_adjust_shadows " + run_adjust_shadows + ", stretch_adjust_shadows " + par.stretch_adjust_shadows.val);

      if (type == 'stars') {
            var image_stretching = par.stars_stretching.val;
      } else {
            var image_stretching = par.image_stretching.val;
      }
      if (image_stretching == 'None') {
            if (type == 'mask') {
                  image_stretching = 'Auto STF';
            } else {
                  return { win: GC_win, stf: null };
            }
      }
      if (run_adjust_shadows && (par.stretch_adjust_shadows.val == "before" || par.stretch_adjust_shadows.val == "both")) {
            console.writeln("runHistogramTransform adjust shadows");
            adjustShadows(GC_win, par.stretch_adjust_shadows_perc.val);
      }
      if (type == 'mask') {
            console.writeln("runHistogramTransform for a mask using " + image_stretching);
      } else {
            console.writeln("runHistogramTransform using " + image_stretching);
      }
      var node = flowchartOperation(image_stretching + (type == 'mask' ? ':mask' : ''));
      if (global.get_flowchart_data) {
            return { win: GC_win, stf: null };
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
                  targetBackground = DEFAULT_AUTOSTRETCH_TBGND;
            } else {
                  targetBackground = par.STF_targetBackground.val;
            }
            stf = runHistogramTransformSTF(GC_win, stf_to_use, iscolor, targetBackground);

      } else if (image_stretching == 'Masked Stretch') {
            GC_win = runHistogramTransformMaskedStretch(GC_win, image_stretching, false);

      } else if (image_stretching == 'Masked+Histogram Stretch') {
            GC_win = runHistogramTransformMaskedStretch(GC_win, image_stretching, true);

      } else if (image_stretching == 'Arcsinh Stretch') {
            GC_win = runHistogramTransformArcsinhStretch(GC_win, image_stretching, false);

      } else if (image_stretching == 'Asinh+Histogram stretch') {
            GC_win = runHistogramTransformArcsinhStretch(GC_win, image_stretching, true);

      } else if (image_stretching == 'Hyperbolic formulas not used') {
            GC_win = runHistogramTransformHyperbolicIterations(GC_win, iscolor, false);

      } else if (image_stretching == 'Hyperbolic') {
            GC_win = runHistogramTransformHyperbolicIterations(GC_win, iscolor, true);

      } else if (image_stretching == 'Histogram stretch') {
            GC_win = stretchHistogramTransformIterations(GC_win, iscolor, image_stretching, par.histogram_stretch_target.val, null);

      } else if (image_stretching == 'Logarithmic stretch') {
            GC_win = stretchFunctionIterations(GC_win, iscolor, image_stretching, par.other_stretch_target.val, 10);

      } else if (image_stretching == 'Square root stretch') {
            GC_win = stretchFunctionIterations(GC_win, iscolor, image_stretching, par.other_stretch_target.val, 1);

      } else if (image_stretching == 'Shadow stretch') {
            GC_win = stretchFunctionIterations(GC_win, iscolor, image_stretching, par.other_stretch_target.val, 1);

      } else if (image_stretching == 'Highlight stretch') {
            GC_win = stretchFunctionIterations(GC_win, iscolor, image_stretching, par.other_stretch_target.val, 1);

      } else if (image_stretching == 'Histogram direct') {
            histogramDirectStretch(GC_win, image_stretching, iscolor, par.other_stretch_target.val);

      } else {
            util.throwFatalError("Bad image stretching value " + image_stretching + " with type " + type);
      }
      util.setFITSKeyword(GC_win, "AutoIntegrateNonLinear", image_stretching, "");
      engine_end_process(node, GC_win, image_stretching);

      if (run_adjust_shadows && (par.stretch_adjust_shadows.val == "after" || par.stretch_adjust_shadows.val == "both")) {
            console.writeln("runHistogramTransform adjust shadows");
            adjustShadows(GC_win, par.stretch_adjust_shadows_perc.val);
      }

      guiUpdatePreviewWin(GC_win);
      return { win: GC_win, stf: stf };
}

function runACDNRReduceNoise(imgWin, maskWin)
{
      if (par.ACDNR_noise_reduction.val == 0.0) {
            return;
      }
      util.addProcessingStepAndStatusInfo("ACDNR noise reduction on " + imgWin.mainView.id + " using mask " + maskWin.mainView.id);
      var node = flowchartOperation("ACDNR");
      if (global.get_flowchart_data) {
            return;
      }

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

      engine_end_process(node, imgWin, "ACDNR:noise");

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

      if (maskWin != null) {
            console.writeln("runMultiscaleLinearTransformReduceNoise on " + imgWin.mainView.id + " using mask " + maskWin.mainView.id + ", strength " + strength);
      } else {
            console.writeln("runMultiscaleLinearTransformReduceNoise on " + imgWin.mainView.id + ", strength " + strength);
      }
      var node = flowchartOperation("MultiscaleLinearTransform:noise");

      if (global.get_flowchart_data) {
            return;
      }

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

      printProcessValues(P);
      engine_end_process(node, imgWin, "MultiscaleLinearTransform:noise");

      imgWin.mainView.endProcess();
}

function runBlurXTerminator(imgWin, correct_only, for_image_solver = false)
{
      if (for_image_solver) {
            console.writeln("BlurXTerminator for ImageSolver on " + imgWin.mainView.id + " for image solver");
      } else {
            console.writeln("BlurXTerminator on " + imgWin.mainView.id + ", sharpen stars " + par.bxt_sharpen_stars.val + 
                        ", adjust star halos " + par.bxt_adjust_halo.val + ", sharpen nonstellar " + par.bxt_sharpen_nonstellar.val +
                        ", correct only " + correct_only);
      }
      if (correct_only) {
            var node = flowchartOperation("BlurXTerminator:correct only");
      } else {
            var node = flowchartOperation("BlurXTerminator");
      }

      if (global.get_flowchart_data) {
            return;
      }

      if (for_image_solver) {
            var auto_psf = true;
            var psf = 0.0;
            console.writeln("Using auto PSF with image solver");
      } else if (par.bxt_psf.val > 0) {
            var auto_psf = false;
            var psf = par.bxt_psf.val;
            console.writeln("Using user given PSF " + psf);
      } else if (par.bxt_median_psf.val) {
            var auto_psf = false;
            var psf = medianFWHM;
            if (psf == null) {
                  // Get psf from image header
                  psf = util.getKeywordValue(imgWin, "AutoIntegrateMEDFWHM");
                  if (psf != null) {
                        // Convert to number
                        psf = parseFloat(psf);
                  }
            }
            if (psf == null) {
                  save_images_in_save_id_list(); // Save images so we can return with AutoContinue
                  util.throwFatalError("Cannot run BlurXTerminator, AutoIntegrateMEDFWHM is not calculated. Maybe subframe selector was not run, or not using XISF/FITS image with proper header values.");
            }
            console.writeln("Using PSF " + psf + " from AutoIntegrateMEDFWHM value");
      } else if (par.bxt_image_psf.val) {
            var auto_psf = false;
            var psf = getImagePSF(imgWin);
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
                  P.sharpen_stars = par.bxt_sharpen_stars.val;
                  P.adjust_halos = par.bxt_adjust_halo.val;
                  P.nonstellar_psf_diameter = psf;
                  P.auto_nonstellar_psf = auto_psf;
                  P.sharpen_nonstellar = par.bxt_sharpen_nonstellar.val;
            }
      } catch(err) {
            save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
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

      printProcessValues(P);
      engine_end_process(node, imgWin, "BlurXTerminator");
}

function runNoiseXTerminator(imgWin, strength, linear)
{
      var node = flowchartOperation("NoiseXTerminator");
      if (global.get_flowchart_data) {
            return;
      }
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
            save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
            console.criticalln("NoiseXTerminator failed");
            console.criticalln(err);
            console.criticalln("Maybe NoiseXTerminator is not installed, AI is missing or platform is not supported");
            util.throwFatalError("NoiseXTerminator failed");
      }

      console.writeln("runNoiseXTerminator on " + imgWin.mainView.id + " using denoise " + denoise + ", detail " + detail + ", linear " + linear);

      /* Execute on image.
       */
      imgWin.mainView.beginProcess(UndoFlag_NoSwapFile);

      P.executeOn(imgWin.mainView, false);
      
      imgWin.mainView.endProcess();

      printProcessValues(P);
      engine_end_process(node, imgWin, "NoiseXTerminator");
}

function runDeepSNR(imgWin, strength, linear)
{
      var node = flowchartOperation("DeepSNR");
      if (global.get_flowchart_data) {
            return;
      }
      switch (strength) {
            case 1:
                  var amount = 1.00;
                  break;
            case 2:
                  var amount = 0.90;
                  break;
            case 3:
                  var amount = 0.80;
                  break;
            case 4:
                  var amount = 0.70;
                  break;
            case 5:
                  var amount = 0.60;
                  break;
            case 6:
                  var amount = 0.50;
                  break;
            default:
                  util.throwFatalError("Bad noise reduction value " + strength);
      }

      console.writeln("Run DeepSNR using amount " + amount);

      try {
            var P = new DeepSNR;
            P.linear = linear;
            P.amount = amount;
            P.shadows_clipping = -2.80;
            P.target_background = 0.25;
      } catch(err) {
            save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
            console.criticalln("DeepSNR failed");
            console.criticalln(err);
            console.criticalln("Maybe DeepSNR is not installed, AI is missing or platform is not supported");
            util.throwFatalError("DeepSNR failed");
      }

      console.writeln("runDeepSNR on " + imgWin.mainView.id + " using amount " + amount + ", linear " + linear);

      /* Execute on image.
       */
      imgWin.mainView.beginProcess(UndoFlag_NoSwapFile);

      P.executeOn(imgWin.mainView, false);
      
      imgWin.mainView.endProcess();

      printProcessValues(P);
      engine_end_process(node, imgWin, "DeepSNR");
}

function runNoiseReductionEx(imgWin, maskWin, strength, linear)
{
      if (maskWin != null) {
            console.writeln("runNoiseReductionEx on " + imgWin.mainView.id + " using mask " + maskWin.mainView.id + ", strength " + strength + ", linear " + linear);
      } else {
            console.writeln("runNoiseReductionEx on " + imgWin.mainView.id + ", strength " + strength + ", linear " + linear);
      }
      if (global.get_flowchart_data) {
            if (par.use_noisexterminator.val) {
                  var node = flowchartOperation("NoiseXTerminator");
            } else if (par.use_graxpert_denoise.val) {
                  var node = flowchartOperation("GraXpert denoise");
            } else if (par.use_deepsnr.val) {
                  var node = flowchartOperation("DeepSNR");
            } else {
                  var node = flowchartOperation("MultiscaleLinearTransform:noise");
            }
            return;
      }
      if (strength == 0) {
            return;
      }
      if (par.use_noisexterminator.val) {
            runNoiseXTerminator(imgWin, strength, linear);
      } else if (par.use_graxpert_denoise.val) {
            runGraXpertExternal(imgWin, GraXpertCmd.denoise);
      } else if (par.use_deepsnr.val) {
            runDeepSNR(imgWin, strength, true);
      } else {
            runMultiscaleLinearTransformReduceNoise(imgWin, maskWin, strength);
      }
}

function runNoiseReduction(imgWin, maskWin, linear)
{
      if (par.use_noisexterminator.val) {
            util.addProcessingStepAndStatusInfo("Noise reduction using NoiseXTerminator on " + imgWin.mainView.id);
      } else if (par.use_graxpert_denoise.val) {
            util.addProcessingStepAndStatusInfo("Noise reduction using GraXpert on " + imgWin.mainView.id);
      } else if (par.use_deepsnr.val) {
            util.addProcessingStepAndStatusInfo("Noise reduction using DeepSNR on " + imgWin.mainView.id);
      } else {
            if (maskWin == null) {
                  util.addProcessingStepAndStatusInfo("Noise reduction using MultiscaleLinearTransform on " + imgWin.mainView.id + " without mask");
            } else {
                  util.addProcessingStepAndStatusInfo("Noise reduction  using MultiscaleLinearTransform on " + imgWin.mainView.id + " using mask " + maskWin.mainView.id);
            }
      }
      runNoiseReductionEx(imgWin, maskWin, par.noise_reduction_strength.val, linear);
}

function runColorReduceNoise(imgWin)
{
      util.addProcessingStepAndStatusInfo("Color noise reduction on " + imgWin.mainView.id);
      var node = flowchartOperation("TGVDenoise");

      if (global.get_flowchart_data) {
            return;
      }

      var P = new TGVDenoise;
      P.rgbkMode = false;
      P.filterEnabledL = false;
      P.filterEnabledC = true;
      P.supportEnabled = true;

      imgWin.mainView.beginProcess(UndoFlag_NoSwapFile);

      /* Remove color noise from the whole image. */
      P.executeOn(imgWin.mainView, false);

      imgWin.mainView.endProcess();

      printProcessValues(P);
      engine_end_process(node, imgWin, "TGVDenoise");

      guiUpdatePreviewWin(imgWin);
}

function starReduceNoise(imgWin)
{
      util.addProcessingStepAndStatusInfo("Star noise reduction on " + imgWin.mainView.id);
      var node = flowchartOperation("TGVDenoise");

      if (global.get_flowchart_data) {
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

      imgWin.mainView.beginProcess(UndoFlag_NoSwapFile);

      P.executeOn(imgWin.mainView, false);

      imgWin.mainView.endProcess();

      printProcessValues(P);
      engine_end_process(node, imgWin, "TGVDenoise");
}

// Find a true background area in the image
// Go thgrough the image and find a background area
// We try to find an area of 25x25 pixels
// Code generated by ChatGTP o1-mini
function findTrueBackground(w, testmode)
{
      if (par.skip_auto_background.val) {
            console.writeln("Do not try to find true background area in " + w.mainView.id);
            return null;
      }
      console.writeln("Finding true background area in " + w.mainView.id);

      var node = flowchartOperation("findTrueBackground");

      if (global.get_flowchart_data) {
            return null;
      }

      // Try find existing background information
      var bg_image_id = autocontinue_prefix + "AutoBackgroundModel";
      var bg_win = util.findWindow(bg_image_id);
      if (bg_win != null) {
            console.writeln("findTrueBackground:Found existing background information in " + bg_win.mainView.id);
            let preview = bg_win.previewById("background");
            if (preview.isNull) {
                  save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
                  util.throwFatalError("Error: background preview not found from " + bg_image_id);
            }
            var rect = bg_win.previewRect(preview);
            engine_end_process(node, bg_win, "findTrueBackground");
            var roi = { x0: rect.x0, y0: rect.y0, x1: rect.x1, y1: rect.y1 };
            console.writeln("findTrueBackground:Returning background region at " + roi.x0 + ", " + roi.y0 + ", " + roi.x1 + ", " + roi.y1);
            return roi;
      }

      var image = w.mainView.image;

      // Get image dimensions
      var width = image.width;
      var height = image.height;

      // Define window size
      var windowSize = 25;
      
      // Define background criteria thresholds
      var MAX_STD_DEV = 5; // Maximum standard deviation for background
      var MAX_MEDIAN_DIFF = 10; // Maximum difference from overall median

      // Function to calculate median
      function calculateMedian(array) {
            array.sort(function(a, b) { return a - b; });
            var middle = Math.floor(array.length / 2);
            if (array.length % 2 === 0) {
                  return (array[middle - 1] + array[middle]) / 2;
            } else {
                  return array[middle];
            }
      }

      // Get all pixel samples to calculate overall median
      var allPixels = [];
      for (var y = 0; y < height; y++) {
            for (var x = 0; x < width; x++) {
                  var pixel = image.sample(x, y);
                  // Assuming single-channel image; modify if multi-channel
                  allPixels.push(pixel);
            }
      }

      var overallMedian = calculateMedian(allPixels);

      // Function to calculate standard deviation
      function calculateStdDev(array, median) {
            var sumSq = 0;
            for (var i = 0; i < array.length; i++) {
                  var diff = array[i] - median;
                  sumSq += diff * diff;
            }
            return Math.sqrt(sumSq / array.length);
      }

      // Array to store background regions
      var backgroundRegions = [];

      // Iterate over the image with the defined window size
      for (var y = windowSize, cnt = 0; y <= height - windowSize; y += 10, cnt++) {
            for (var x = windowSize; x <= width - windowSize; x += 10) {
                  var windowPixels = [];
                  for (var wy = 0; wy < windowSize; wy++) {
                        for (var wx = 0; wx < windowSize; wx++) {
                              var pixel = image.sample(x + wx, y + wy);
                              windowPixels.push(pixel);
                        }
                  }

                  var windowMedian = calculateMedian(windowPixels);
                  var medianDiff = Math.abs(windowMedian - overallMedian);
                  var windowStdDev = calculateStdDev(windowPixels, windowMedian);

                  // Check if the window meets the background criteria
                  if (windowStdDev <= MAX_STD_DEV && medianDiff <= MAX_MEDIAN_DIFF) {
                        backgroundRegions.push({x: x, y: y, median: windowMedian, stdDev: windowStdDev, size: windowSize});
                  }
            }
            if (cnt % 10 == 0) {
                  checkCancel()
                  processEvents();
            }
            if (testmode && cnt % 100 == 0) {
                  console.writeln("Checking " + x + " " + y + ", median " + windowMedian + ", std dev " + windowStdDev + ", median diff " + medianDiff);
                  console.writeln("Total Background Regions Found: " + backgroundRegions.length);
                  console.flush();
            }
      }

      // Sort the background regions by median value
      backgroundRegions.sort(function(a, b) {
            return a.median - b.median;
      });

      if (backgroundRegions.length > 0) {
            if (testmode) {
                  // Output the results
                  console.writeln("Coordinates of Background Regions (Top-Left Corner):");
                  for (var i = 0; i < backgroundRegions.length && i < 10; i++) {
                        console.writeln("Region " + (i + 1) + ": (" + backgroundRegions[i].x + ", " + backgroundRegions[i].y + ")");
                  }
            }
            console.writeln("findTrueBackground:Total Background Regions Found: " + backgroundRegions.length);

            var roi = { x0: backgroundRegions[0].x, y0: backgroundRegions[0].y, x1: backgroundRegions[0].x + windowSize, y1: backgroundRegions[0].y + windowSize };
            
            var bw_id = util.ensure_win_prefix("AutoBackgroundModel");
            console.writeln("findTrueBackground:create new " + bw_id + " window");
            var bw = util.copyWindow(w, bw_id);

            // Optionally, highlight the found regions on the image
            // Draw only first region
            if (gui) {
                  console.writeln("findTrueBackground:Highlighting background region");
                  var bitmap = gui.createEmptyBitmap(width, height, 0x00C0C0C0);  // transparent background
                  var graphics = new Graphics(bitmap);
                  graphics.pen = new Pen(0xFFFF0000, 4);
                  graphics.transparentBackground = true;

                  for (var i = 0; i < backgroundRegions.length && i < 1; i++) {
                        var region = backgroundRegions[i];
                        var x = region.x;
                        var y = region.y;

                        // Create a rectangle
                        graphics.drawRect(x, y, x + windowSize, y + windowSize);
                  }
                  graphics.end();

                  bw.mainView.beginProcess(UndoFlag_NoSwapFile);
                  bw.mainView.image.blend(bitmap);
                  bw.mainView.endProcess();
            }

            console.writeln("findTrueBackground:create preview");
            bw.createPreview( roi.x0, roi.y0, roi.x1, roi.y1, "background" );

            // Autostretch for the convenience of the user
            ApplyAutoSTF(
                  bw.mainView,
                  DEFAULT_AUTOSTRETCH_SCLIP,
                  DEFAULT_AUTOSTRETCH_TBGND,
                  false,
                  false);

            save_id_list.push([bw_id, bw_id]);  /* AutoBackgroundModel */
            iconized_image_ids.push(bw_id);

            engine_end_process(node, w, "findTrueBackground");

            console.writeln("findTrueBackground:Returning background region at " + roi.x0 + ", " + roi.y0 + ", " + roi.x1 + ", " + roi.y1);
            return roi;
      } else {
            util.addCriticalStatus("findTrueBackground:No background regions found matching the criteria.");
            return null;
      }
}

function runBackgroundNeutralization(imgWin)
{
      var imgView = imgWin.mainView;
      util.addProcessingStepAndStatusInfo("Background neutralization on " + imgView.id);

      var roi = findTrueBackground(imgWin, false);

      var node = flowchartOperation("BackgroundNeutralization");
      if (global.get_flowchart_data) {
            return null;
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

      imgView.beginProcess(UndoFlag_NoSwapFile);

      P.executeOn(imgView, false);

      imgView.endProcess();

      printProcessValues(P);
      engine_end_process(node, imgWin, "BackgroundNeutralization");

      guiUpdatePreviewId(imgView.id);

      return roi;
}

function findCurrentTelescope(imgWin)
{
      for (var i = 0; i < imgWin.keywords.length; i++) {
            switch (imgWin.keywords[i].name) {
                  case "TELESCOP":
                        current_telescope_name = imgWin.keywords[i].strippedValue.trim();
                        console.writeln("TELESCOP=" +  current_telescope_name);
                        return;
                  default:
                        break;
            }
      }
}

function findDrizzle(imgWin)
{
      for (var i = 0; i < imgWin.keywords.length; i++) {
            switch (imgWin.keywords[i].name) {
                  case "AutoIntegrateDrizzle":
                        var value = imgWin.keywords[i].strippedValue.trim();
                        console.writeln("AutoIntegrateDrizzle=" + value);
                        var drizzle = parseInt(value);
                        return drizzle;
                  default:
                        break;
            }
      }
      var scale = util.findDrizzleScale(imgWin);
      if (scale > 1) {
            console.writeln("Using image metadata drizzle scale " + scale);
            return scale;
      }

      return 1;
}

function findBinning(imgWin)
{
      for (var i = 0; i < imgWin.keywords.length; i++) {
            switch (imgWin.keywords[i].name) {
                  case "XBINNING":
                        var value = imgWin.keywords[i].strippedValue.trim();
                        console.writeln("XBINNING=" + value);
                        var binning = parseInt(value);
                        return binning;
                  default:
                        break;
            }
      }
      return 1;
}

function printImageSolverMetadata(solver)
{
      console.writeln("Image metadata for SolveImage:");

      console.writeln("solver.metadata.focal: " + solver.metadata.focal);
      console.writeln("solver.metadata.useFocal: " + solver.metadata.useFocal);
      console.writeln("solver.metadata.xpixsz: " + solver.metadata.xpixsz);
      console.writeln("solver.metadata.resolution: " + solver.metadata.resolution);
      console.writeln("solver.metadata.referenceSystem: " + solver.metadata.referenceSystem);
      console.writeln("solver.metadata.ra: " + solver.metadata.ra);
      console.writeln("solver.metadata.dec: " + solver.metadata.dec);
      console.writeln("solver.metadata.epoch: " + solver.metadata.epoch);
      console.writeln("solver.metadata.observationTime: " + solver.metadata.observationTime);
      console.writeln("solver.metadata.topocentric: " + solver.metadata.topocentric);

      console.writeln("solverCfg.version: " + solver.solverCfg.version);
      console.writeln("solverCfg.magnitude: " + solver.solverCfg.magnitude);
      console.writeln("solverCfg.autoMagnitude: " + solver.solverCfg.autoMagnitude);
      console.writeln("solverCfg.generateErrorImg: " + solver.solverCfg.generateErrorImg);
      console.writeln("solverCfg.structureLayers: " + solver.solverCfg.structureLayers);
      console.writeln("solverCfg.minStructureSize: " + solver.solverCfg.minStructureSize);
      console.writeln("solverCfg.hotPixelFilterRadius: " + solver.solverCfg.hotPixelFilterRadius);
      console.writeln("solverCfg.noiseReductionFilterRadius: " + solver.solverCfg.noiseReductionFilterRadius);
      console.writeln("solverCfg.sensitivity: " + solver.solverCfg.sensitivity);
      console.writeln("solverCfg.peakResponse: " + solver.solverCfg.peakResponse); // row 20
      console.writeln("solverCfg.brightThreshold: " + solver.solverCfg.brightThreshold);
      console.writeln("solverCfg.maxStarDistortion: " + solver.solverCfg.maxStarDistortion);
      console.writeln("solverCfg.autoPSF: " + solver.solverCfg.autoPSF);
      console.writeln("solverCfg.catalogMode: " + solver.solverCfg.catalogMode);
      console.writeln("solverCfg.vizierServer: " + solver.solverCfg.vizierServer);
      console.writeln("solverCfg.showStars: " + solver.solverCfg.showStars);
      console.writeln("solverCfg.showStarMatches: " + solver.solverCfg.showStarMatches);
      console.writeln("solverCfg.showSimplifiedSurfaces: " + solver.solverCfg.showSimplifiedSurfaces);
      console.writeln("solverCfg.showDistortion: " + solver.solverCfg.showDistortion);
      console.writeln("solverCfg.generateDistortModel: " + solver.solverCfg.generateDistortModel); // row 30
      console.writeln("solverCfg.catalog: " + solver.solverCfg.catalog);
      console.writeln("solverCfg.distortionCorrection: " + solver.solverCfg.distortionCorrection);
      console.writeln("solverCfg.splineOrder: " + solver.solverCfg.splineOrder);
      console.writeln("solverCfg.splineSmoothing: " + solver.solverCfg.splineSmoothing);
      console.writeln("solverCfg.enableSimplifier: " + solver.solverCfg.enableSimplifier);
      console.writeln("solverCfg.simplifierRejectFraction: " + solver.solverCfg.simplifierRejectFraction);
      console.writeln("solverCfg.outlierDetectionRadius: " + solver.solverCfg.outlierDetectionRadius);
      console.writeln("solverCfg.outlierDetectionMinThreshold: " + solver.solverCfg.outlierDetectionMinThreshold);
      console.writeln("solverCfg.outlierDetectionSigma: " + solver.solverCfg.outlierDetectionSigma);
      console.writeln("solverCfg.useActive: " + solver.solverCfg.useActive);
      console.writeln("solverCfg.outSuffix: " + solver.solverCfg.outSuffix);
      console.writeln("solverCfg.projection: " + solver.solverCfg.projection);
      console.writeln("solverCfg.projectionOriginMode: " + solver.solverCfg.projectionOriginMode);
      console.writeln("solverCfg.restrictToHQStars: " + solver.solverCfg.restrictToHQStars);
      console.writeln("solverCfg.tryApparentCoordinates: " + solver.solverCfg.tryApparentCoordinates);
      console.writeln("solverCfg.tryExhaustiveInitialAlignment: " + solver.solverCfg.tryExhaustiveInitialAlignment);
}

function runImageSolverEx(id, use_defaults, use_dialog, xpixsz_multiplier)
{
      console.writeln("runImageSolverEx: image " + id + ", use default info " + use_defaults + ", use dialog " + use_dialog);

      var imgWin = ImageWindow.windowById(id);

      var metadata = new ImageMetadata();
      metadata.ExtractMetadata(imgWin);
      if ((metadata.projection && metadata.ref_I_G_linear) || imgWin.astrometricSolutionSummary().length > 0) {
            if (par.target_forcesolve.val) {
                  console.writeln("runImageSolverEx: image " + id + " already has been plate solved, but we are resolving it again.");
            } else {
                  util.addProcessingStep("Image " + id + " was already plate solved.");
                  if (global.pixinsight_version_num < 1080902) {
                        metadata.Print();
                  } else {
                        console.writeln(imgWin.astrometricSolutionSummary());
                  }
                  if (!solved_imageId) {
                        console.writeln("runImageSolverEx: save already solved image image " + imgWin.mainView.id);
                        solved_imageId = imgWin.mainView.id;
                  }
                  console.writeln("runImageSolverEx: image " + id + " already has been plate solved.");
                  return true;
            }
      }
      if (!par.target_forcesolve.val && solved_imageId) {
            let solved_imageWin = ImageWindow.windowById(solved_imageId);
            if (solved_imageWin != null && solved_imageWin.astrometricSolutionSummary().length > 0) {
                  // Image does not have astrometric solution but we have already solved an image.
                  // Copy the astrometric solution from the solved image.
                  console.writeln("runImageSolverEx: copy astrometric solution from an already solved image image " + solved_imageId + " to " + imgWin.mainView.id);
                  imgWin.copyAstrometricSolution(solved_imageWin);
                  return true;
            }
      }

      util.addProcessingStepAndStatusInfo("ImageSolver on image " + imgWin.mainView.id);

      var succ = false;

      try {
            var solver = new ImageSolver();
            
            solver.Init(imgWin);

            if (!current_telescope_name || current_telescope_name == "") {
                  findCurrentTelescope(imgWin);
            } else {
                  console.writeln("Using current telescope " + current_telescope_name);
            }

            /* 
             * Initialize solver.metadata values with the current image metadata.
             *
             * The following fields are set:
             *    solver.metadata.ra
             *    solver.metadata.dec 
             *    solver.metadata.focal
             *    solver.metadata.xpixsz
             *    solver.metadata.resolution
             *    solver.metadata.referenceSystem
             *    solver.metadata.useFocal
             */ 

            console.writeln("Telescope: " + current_telescope_name);
            console.writeln("Image metadata");
            console.writeln("  coordinates RA DEC: " + solver.metadata.ra + " " + solver.metadata.dec);
            console.writeln("  focal length: " + solver.metadata.focal);
            console.writeln("  resolution: " + solver.metadata.resolution);
            console.writeln("  xpixsz: " + solver.metadata.xpixsz);
            console.writeln("  referenceSystem: " + solver.metadata.referenceSystem);
            console.writeln("  useFocal: " + solver.metadata.useFocal);
            console.writeln("  topocentric: " + solver.metadata.topocentric);

            console.writeln("  solver.metadata: " + JSON.stringify(solver.metadata, null, 2));

            if (!use_defaults) {
                  solver.metadata.referenceSystem = "ICRS";
                  solver.metadata.useFocal = true;
                  solver.metadata.topocentric = false;
            }
            if (par.target_radec.val != '') {
                  let radec = par.target_radec.val.trim().split(/\s+/);
                  if (radec.length != 2) {
                        util.throwFatalError("Incorrect RA DEC value " + par.target_radec.val);
                  }
                  solver.metadata.ra = parseFloat(radec[0]) * 15;
                  solver.metadata.dec = parseFloat(radec[1]);
                  console.writeln("Using user given coordinates RA DEC: " + solver.metadata.ra + " " + solver.metadata.dec);
            } else {
                  console.writeln("Using image metadata coordinates RA DEC: " + solver.metadata.ra + " " + solver.metadata.dec);
            }
            var metadata_changed = false;
            if (par.target_focal.val != '') {
                  var focal_len = parseFloat(par.target_focal.val);
                  console.writeln("Using user given focal length: " + focal_len);
                  solver.metadata.focal = focal_len;
                  metadata_changed = true;
            } else if (!use_defaults) {
                  var focal_len = find_focal_length();
                  if (focal_len != 0) {
                        console.writeln("Using telescope name based focal length: " + focal_len);
                        solver.metadata.focal = focal_len;
                        metadata_changed = true;
                  }
            } else {
                  var focal_len = 0;
            }
            if (focal_len == 0) {
                  console.writeln("Using image metadata focal length: " + solver.metadata.focal);
            }
            if (par.target_pixel_size.val != '') {
                  var pixel_size = parseFloat(par.target_pixel_size.val);
                  console.writeln("Using user given pixel size: " + pixel_size);
                  solver.metadata.xpixsz = pixel_size;
                  metadata_changed = true;
            } else if (!use_defaults) {
                  var pixel_size = find_pixel_size();
                  if (pixel_size != 0) {
                        console.writeln("Using telescope name based pixel size: " + pixel_size);
                        solver.metadata.xpixsz = pixel_size;
                        metadata_changed = true;
                  }
            } else {
                  var pixel_size = 0;
            }
            if (pixel_size == 0) {
                  console.writeln("Using image metadata pixel size: " + solver.metadata.xpixsz);
                  pixel_size = solver.metadata.xpixsz;
            }
            if (pixel_size != 0) {
                  if (par.target_binning.val != 'None') {
                        if (par.target_binning.val == 'Auto') {
                              if (!use_defaults) {
                                    var binning = findBinning(imgWin);
                                    pixel_size = binning * pixel_size;
                                    console.writeln("Using auto binning " + binning + ", adjusted pixel size: " + pixel_size);
                              } else {
                                    console.writeln("Auto binning, using metadata pixel size: " + pixel_size);
                              }
                        } else {
                              var binning = parseInt(par.target_binning.val);
                              pixel_size = binning * pixel_size;
                              console.writeln("Using user given binning " + par.target_binning.val + ", adjusted pixel size: " + pixel_size);
                        }
                  }
                  if (par.target_drizzle.val != 'None') {
                        if (par.target_drizzle.val == 'Auto') {
                              var scale = findDrizzle(imgWin);
                              if (scale > 1) {
                                    pixel_size = pixel_size / scale;
                                    console.writeln("Using drizzle scale " + scale + ", adjusted pixel size: " + pixel_size);
                              }
                        } else {
                              var scale = parseInt(par.target_drizzle.val);
                              if (scale > 1) {
                                    pixel_size = pixel_size / scale;
                                    console.writeln("Using user given drizzle scale " + par.target_drizzle.val + ", adjusted pixel size: " + pixel_size);
                              }
                        }
                  }
                  if (solver.metadata.xpixsz != pixel_size) {
                        solver.metadata.xpixsz = pixel_size;
                        metadata_changed = true;
                  }
            }
            if (xpixsz_multiplier != 1) {
                  solver.metadata.xpixsz = solver.metadata.xpixsz * xpixsz_multiplier;
                  console.writeln("Using adjusted pixel size: " + solver.metadata.xpixsz + " (multiplier " + xpixsz_multiplier + ")");
                  metadata_changed = true;
            }
            if (solver.metadata.xpixsz && solver.metadata.focal && metadata_changed) {
                  solver.metadata.resolution = solver.metadata.xpixsz / solver.metadata.focal * 0.18 / Math.PI;
                  console.writeln("Using calculated resolution: " + solver.metadata.resolution);
            } else {
                  console.writeln("Using metadata resolution: " + solver.metadata.resolution);
            }

            printImageSolverMetadata(solver);

            if (use_dialog) {
                  //imgWin.show();
                  //console.hide();
                  imgWin.bringToFront();
                  let dialog = new ImageSolverDialog( solver.solverCfg, solver.metadata, false /*showTargetImage*/ );
                  succ = dialog.execute();
                  if (0 && !global.console_hidden) {
                        console.show();
                  }
                  if (!succ) {
                        console.writeln("ImageSolver dialog cancelled");
                        return false;
                  }
                  solver.solverCfg = dialog.solverCfg;
                  solver.metadata = dialog.metadata;

                  console.writeln("Image metadata from dialog:");
                  printImageSolverMetadata(solver);
            }         
            /*
             * Solve image
             */

            console.writeln("runImageSolverEx: call SolveImage");
            if (!solver.SolveImage(imgWin)) {
                  console.writeln("runImageSolverEx: SolveImage failed on image " + id);
                  succ = false;
            } else {
                  succ = true;
                  if (global.pixinsight_version_num < 1080902) {
                        solver.metadata.Print();
                  } else {
                        console.writeln(imgWin.astrometricSolutionSummary());
                  }
                  solver.solverCfg.SaveSettings();
                  solver.solverCfg.SaveParameters();
                  solver.metadata.SaveSettings();
                  solver.metadata.SaveParameters();
      
                  console.writeln("runImageSolverEx: SolveImage succeeded on image "+ id);
            }
      } catch (err) {
            console.writeln("runImageSolverEx: exception error, SolveImage failed on image " + id);
            util.addCriticalStatus(err.toString());
      }

      if (!succ) {
            console.writeln("solver.metadata.focal: " + solver.metadata.focal);
            console.writeln("solver.metadata.xpixsz: " + solver.metadata.xpixsz);
            console.writeln("solver.metadata.resolution: " + solver.metadata.resolution);
            console.writeln("solver.metadata.ra: " + solver.metadata.ra);
            console.writeln("solver.metadata.dec: " + solver.metadata.dec);
            console.writeln("ImageSolver failed on image " + id);
            return false
      } else {
            solved_imageId = imgWin.mainView.id;
            console.writeln("runImageSolverEx: save already solved image image " + imgWin.mainView.id);
            return true;
      }
}

function runImageSolverVariations(id)
{
      var solved = runImageSolverEx(id, true, false, 1);
      if (!solved) {
            console.writeln("runImageSolver: retrying with smaller xpixsz");
            solved = runImageSolverEx(id, true, false, 0.5);
      }
      if (!solved) {
            console.writeln("runImageSolver: retrying with bigger xpixsz");
            solved = runImageSolverEx(id, true, false, 2);
      }
      if (!solved) {
            console.writeln("runImageSolver: retrying with telescope info");
            solved = runImageSolverEx(id, false, false, 1);
      }
      return solved;
}

function runImageSolver(id)
{
      console.writeln("runImageSolver on image " + id);
      var node = flowchartOperation("ImageSolver");
      if (global.get_flowchart_data) {
            return;
      }
      var solved = runImageSolverVariations(id);
      if (!solved) {
            // Delete possible old copy windows
            let copyWin = util.findWindow("AutoIntegrateImageSolverCopy");
            if (copyWin) {
                  copyWin.forceClose();
            }
            // Make a copy of image and try with noise reducted image
            console.writeln("runImageSolver: copy image and try with noise reducted image");
            let imgWin = ImageWindow.windowById(id);
            copyWin = util.copyWindow(imgWin, "AutoIntegrateImageSolverCopy");
            if (par.use_blurxterminator.val) {
                  console.writeln("runImageSolver: runBlurXTerminator on " + copyWin.mainView.id);
                  runBlurXTerminator(imgWin, false, true);
            }
            console.writeln("runImageSolver: runNoiseReduction on " + copyWin.mainView.id);
            runNoiseReductionEx(imgWin, null, 3, true);
            console.writeln("runImageSolver: runImageSolverVariations on " + copyWin.mainView.id);
            solved = runImageSolverVariations(id);
            if (solved) {
                  imgWin.copyAstrometricSolution(copyWin);
            }
            copyWin.forceClose();
      }
      if (!solved && par.target_interactivesolve.val) {
            do {
                  solved = runImageSolverEx(id, true, true, 1);
                  if (!solved) {
                        var txt = "ImageSolver failed. Do you want to retry?";
                        var response = new MessageBox(txt, "AutoIntegrate", StdIcon_Question, StdButton_Yes, StdButton_No ).execute();
                        if (response != StdButton_Yes) {
                              break;
                        }
                  }
            } while (!solved);
      }
      engine_end_process(node);
      if (!solved) {
            save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
            util.throwFatalError("ImageSolver failed on image " + id);
      }
}

function runColorCalibrationProcess(imgWin, roi)
{
      var node = flowchartOperation("ColorCalibration");
      if (global.get_flowchart_data) {
            return;
      }

      try {
            util.addProcessingStepAndStatusInfo("Color calibration on " + imgWin.mainView.id + " using ColorCalibration process");

            var P = new ColorCalibration;
            if (roi) {
                  console.writeln("Color calibration using background region at " + roi.x0 + ", " + roi.y0 + ", " + roi.x1 + ", " + roi.y1);
                  P.backgroundUseROI = true;
                  P.backgroundROIX0 = roi.x0;
                  P.backgroundROIY0 = roi.y0;
                  P.backgroundROIX1 = roi.x1;
                  P.backgroundROIY1 = roi.y1;
            }

            imgWin.mainView.beginProcess(UndoFlag_NoSwapFile);

            P.executeOn(imgWin.mainView, false);

            imgWin.mainView.endProcess();

            printProcessValues(P);
            engine_end_process(node, imgWin, "ColorCalibration");

            guiUpdatePreviewId(imgWin.mainView.id);

      } catch(err) {
            save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
            console.criticalln("Color calibration failed");
            console.criticalln(err);
            console.criticalln("Maybe filter files or file format were not recognized correctly");
            util.throwFatalError("Color calibration failed");
      }
}

function runColorCalibration(imgWin, phase)
{
      console.writeln("runColorCalibration on " + imgWin.mainView.id + " in phase " + phase);
      console.writeln("  process_narrowband: " + process_narrowband + ", narrowband_mode: " + spcc_params.narrowband_mode + ", color_calibration_narrowband: " + par.color_calibration_narrowband.val);
      // check for correct phase values
      if (phase != 'linear' && phase != 'nonlinear') {
            util.throwFatalError("Incorrect phase value " + phase);
      }
      if (process_narrowband && !(spcc_params.narrowband_mode || par.color_calibration_narrowband.val)) {
            util.addProcessingStep("No color calibration for narrowband");
            return;
      }
      if (par.skip_color_calibration.val) {
            util.addProcessingStep("Color calibration was disabled");
            return;
      }
      if (par.use_spcc.val) {
            /* Use SPCC.
             */
            if (phase != 'linear') {
                  /* SPCC is run only in linear phase. */
                  return;
            }
            var node = flowchartOperation("SpectrophotometricColorCalibration");
            if (global.get_flowchart_data) {
                  return;
            }
            try {
                  util.addProcessingStepAndStatusInfo("Color calibration on " + imgWin.mainView.id + " using SpectrophotometricColorCalibration process");

                  console.writeln("Image metadata:");
                  if (global.pixinsight_version_num >= 1080902) {
                        console.writeln(imgWin.astrometricSolutionSummary());
                  }

                  var P = new SpectrophotometricColorCalibration;

                  /* Need to initialize thse since at least filters are empty of not set here.
                   */
                  P.applyCalibration = true;
                  P.narrowbandMode = spcc_params.narrowband_mode;
                  P.narrowbandOptimizeStars = false;
                  if (spcc_params.white_reference == "Average Spiral Galaxy") {
                        P.whiteReferenceSpectrum = "200.5,0.0715066,201.5,0.0689827,202.5,0.0720216,203.5,0.0685511,204.5,0.0712370,205.5,0.0680646,206.5,0.0683024,207.4,0.0729174,207.8,0.0702124,208.5,0.0727025,209.5,0.0688880,210.5,0.0690528,211.5,0.0697566,212.5,0.0705508,213.5,0.0654581,214.5,0.0676317,215.5,0.0699038,216.5,0.0674922,217.5,0.0668344,218.5,0.0661763,219.5,0.0690803,220.5,0.0670864,221.5,0.0635644,222.5,0.0619833,223.5,0.0668687,224.5,0.0640725,225.5,0.0614358,226.5,0.0628698,227.5,0.0649014,228.5,0.0673391,229.5,0.0638038,230.5,0.0643234,231.5,0.0614849,232.5,0.0493110,233.5,0.0574873,234.5,0.0555616,235.5,0.0609369,236.5,0.0557384,237.5,0.0578991,238.5,0.0536321,239.5,0.0575370,240.5,0.0555389,241.5,0.0571506,242.5,0.0615309,243.5,0.0595363,244.5,0.0634798,245.5,0.0628886,246.5,0.0622975,247.5,0.0600475,248.5,0.0608933,249.5,0.0580972,250.5,0.0653082,251.3,0.0576207,251.8,0.0588533,252.5,0.0566401,253.5,0.0582714,254.5,0.0575809,255.5,0.0633762,256.5,0.0610093,257.5,0.0652874,258.5,0.0642648,259.5,0.0632596,260.5,0.0609384,261.5,0.0600490,262.5,0.0636409,263.5,0.0682040,264.5,0.0754600,265.5,0.0806341,266.5,0.0699754,267.5,0.0739405,268.5,0.0755243,269.5,0.0697483,270.5,0.0736132,271.5,0.0678854,272.5,0.0663086,273.5,0.0709825,274.5,0.0602999,275.5,0.0630128,276.5,0.0669431,277.5,0.0701399,278.5,0.0641577,279.5,0.0511231,280.5,0.0550197,281.5,0.0692974,282.5,0.0753517,283.5,0.0723537,284.5,0.0679725,285.5,0.0634174,286.5,0.0742486,287.5,0.0783316,288.5,0.0771108,289.5,0.0801337,291,0.0914252,293,0.0862422,295,0.0838485,297,0.0858467,299,0.0865643,301,0.0875161,303,0.0893837,305,0.0905257,307,0.0935800,309,0.0934870,311,0.0982195,313,0.0953176,315,0.0961554,317,0.0995933,319,0.0924967,321,0.0978345,323,0.0907337,325,0.1054383,327,0.1143168,329,0.1135342,331,0.1106139,333,0.1119505,335,0.1099062,337,0.0967928,339,0.1022504,341,0.1039447,343,0.1063681,345,0.1091599,347,0.1109753,349,0.1181664,351,0.1232860,353,0.1163073,355,0.1267769,357,0.1035215,359,0.1042786,361,0.1176823,363,0.1219479,364,0.1250342,365,0.1363934,367,0.1407033,369,0.1288466,371,0.1379791,373,0.1127623,375,0.1318217,377,0.1528880,379,0.1670432,381,0.1727864,383,0.1243124,385,0.1639393,387,0.1724457,389,0.1520460,391,0.2043430,393,0.1427526,395,0.1870668,397,0.1244026,399,0.2329267,401,0.2556144,403,0.2542109,405,0.2491356,407,0.2379803,409,0.2541684,411,0.2279309,413,0.2533629,415,0.2557223,417,0.2584198,419,0.2560216,421,0.2587210,423,0.2498130,425,0.2609755,427,0.2495886,429,0.2412927,431,0.2182856,433,0.2579985,435,0.2483036,437,0.2928112,439,0.2713431,441,0.2828921,443,0.2975108,445,0.3012513,447,0.3161393,449,0.3221464,451,0.3585586,453,0.3219299,455,0.3334392,457,0.3568741,459,0.3412296,461,0.3498501,463,0.3424920,465,0.3478877,467,0.3611478,469,0.3560448,471,0.3456585,473,0.3587672,475,0.3690553,477,0.3657369,479,0.3671625,481,0.3666357,483,0.3761265,485,0.3466382,487,0.3121751,489,0.3651561,491,0.3688824,493,0.3627420,495,0.3786295,497,0.3733906,499,0.3510300,501,0.3338136,503,0.3540298,505,0.3527861,507,0.3680833,509,0.3507047,511,0.3597249,513,0.3486136,515,0.3372089,517,0.3152444,519,0.3257755,521,0.3499922,523,0.3744245,525,0.3907778,527,0.3490228,529,0.3972061,531,0.4203442,533,0.3740999,535,0.4084084,537,0.4070036,539,0.3993480,541,0.3942389,543,0.4010466,545,0.4128880,547,0.4055525,549,0.4094232,551,0.4053814,553,0.4201633,555,0.4269231,557,0.4193749,559,0.4105311,561,0.4257824,563,0.4239540,565,0.4310873,567,0.4218358,569,0.4360353,571,0.4229342,573,0.4583894,575,0.4425389,577,0.4481210,579,0.4320856,581,0.4507180,583,0.4645862,585,0.4513373,587,0.4516404,589,0.4033701,591,0.4466167,593,0.4513267,595,0.4524209,597,0.4613319,599,0.4546841,601,0.4499895,603,0.4631190,605,0.4724762,607,0.4724962,609,0.4569794,611,0.4599737,613,0.4363290,615,0.4488329,617,0.4267759,619,0.4545143,621,0.4514890,623,0.4384229,625,0.4256613,627,0.4470943,629,0.4565981,631,0.4458333,633,0.4533333,635,0.4546457,637,0.4535446,639,0.4638791,641,0.4561002,643,0.4617287,645,0.4594083,647,0.4597119,649,0.4517238,651,0.4686735,653,0.4686423,655,0.4544898,657,0.4255737,659,0.4640177,661,0.4711876,663,0.4679153,665,0.4689913,667,0.4592265,669,0.4668144,671,0.4498947,673,0.4629239,675,0.4559567,677,0.4596584,679,0.4549789,681,0.4586439,683,0.4653622,685,0.4543475,687,0.4632128,689,0.4711164,691,0.4709973,693,0.4685415,695,0.4696455,697,0.4769241,699,0.4760169,701,0.4701294,703,0.4815669,705,0.4850302,707,0.4707895,709,0.4570604,711,0.4465777,713,0.4382957,715,0.4379654,717,0.4446168,719,0.4350767,721,0.4466714,723,0.4579113,725,0.4625222,727,0.4669903,729,0.4615551,731,0.4763299,733,0.4793147,735,0.4857778,737,0.4997366,739,0.4915129,741,0.4926212,743,0.5062475,745,0.5072637,747,0.5170334,749,0.5173594,751,0.5244106,753,0.5344788,755,0.5397524,757,0.5387203,759,0.5280215,761,0.5191969,763,0.5085395,765,0.4984095,767,0.4749347,769,0.4878839,771,0.4798119,773,0.4821991,775,0.4799906,777,0.4870453,779,0.4928744,781,0.4934236,783,0.4904677,785,0.4849491,787,0.4947343,789,0.4890020,791,0.4789132,793,0.4822390,795,0.4795733,797,0.4973323,799,0.4988779,801,0.5054210,803,0.5087054,805,0.5103235,807,0.5187602,809,0.5151330,811,0.5223530,813,0.5396030,815,0.5475528,817,0.5543915,819,0.5380259,821,0.5321401,823,0.5366753,825,0.5372011,827,0.5440262,829,0.5390591,831,0.5212784,833,0.5187033,835,0.5197124,837,0.5241092,839,0.5070799,841,0.5253056,843,0.5003658,845,0.4896143,847,0.4910508,849,0.4964088,851,0.4753377,853,0.4986498,855,0.4604553,857,0.5174022,859,0.5105171,861,0.5175606,863,0.5322153,865,0.5335880,867,0.4811849,869,0.5241390,871,0.5458069,873,0.5508025,875,0.5423946,877,0.5580108,879,0.5677047,881,0.5580099,883,0.5649928,885,0.5629494,887,0.5384574,889,0.5523318,891,0.5614248,893,0.5521309,895,0.5550786,897,0.5583751,899,0.5597844,901,0.5394855,903,0.5638478,905,0.5862635,907,0.5877920,909,0.5774965,911,0.5866240,913,0.5989106,915,0.5958623,917,0.5964975,919,0.6041389,921,0.5797449,923,0.5607401,925,0.5640816,927,0.5704267,929,0.5642119,931,0.5694372,933,0.5716141,935,0.5705180,937,0.5618458,939,0.5736730,941,0.5630236,943,0.5796418,945,0.5720721,947,0.5873186,949,0.5896322,951,0.5794164,953,0.5828271,955,0.5692468,957,0.5808756,959,0.5949017,961,0.5875516,963,0.5923656,965,0.5824188,967,0.5838008,969,0.5948942,971,0.5865689,973,0.5818128,975,0.5807992,977,0.5851036,979,0.5775164,981,0.5938626,983,0.5885816,985,0.5943664,987,0.5911885,989,0.5916490,991,0.5868101,993,0.5919505,995,0.5945270,997,0.5960248,999,0.5950870,1003,0.5948938,1007,0.5888742,1013,0.6006343,1017,0.5958836,1022,0.6004154,1028,0.6050616,1032,0.5995678,1038,0.5984462,1043,0.6035475,1048,0.5973678,1052,0.5940806,1058,0.5854267,1063,0.5827191,1068,0.5788137,1072,0.5843356,1078,0.5830553,1082,0.5762549,1087,0.5766769,1092,0.5759526,1098,0.5726978,1102,0.5718654,1108,0.5658845,1113,0.5661672,1117,0.5637793,1122,0.5660178,1128,0.5608876,1133,0.5622964,1138,0.5603359,1143,0.5563605,1147,0.5652205,1153,0.5656560,1157,0.5607483,1162,0.5540304,1167,0.5556068,1173,0.5604768,1177,0.5492890,1183,0.5464411,1187,0.5385652,1192,0.5489344,1198,0.5331419,1203,0.5451093,1207,0.5419047,1212,0.5443417,1218,0.5477119,1223,0.5460783,1227,0.5435469,1232,0.5413216,1237,0.5419156,1243,0.5360791,1248,0.5363784,1253,0.5330056,1258,0.5330475,1262,0.5312735,1267,0.5282075,1272,0.5301258,1278,0.5318302,1283,0.5143390,1288,0.5259125,1292,0.5214670,1298,0.5287547,1302,0.5231621,1308,0.5267800,1313,0.5167545,1318,0.5170787,1323,0.5186867,1328,0.5111090,1332,0.5122823,1338,0.5085013,1343,0.5118057,1347,0.5086671,1352,0.5063367,1357,0.5007655,1363,0.5001648,1367,0.5036531,1373,0.5066053,1377,0.5064235,1382,0.5083958,1388,0.5053201,1393,0.4855558,1397,0.4835752,1402,0.4799809,1408,0.4854351,1412,0.4802711,1418,0.4867642,1423,0.4831264,1428,0.4768633,1433,0.4864127,1438,0.4916220,1442,0.4807589,1448,0.4908799,1452,0.4878666,1457,0.4919060,1462,0.4832121,1467,0.4817380,1472,0.4788120,1477,0.4832511,1483,0.4873623,1488,0.4833546,1492,0.4970729,1498,0.4941945,1503,0.4882672,1507,0.4906435,1512,0.5011545,1517,0.5042579,1522,0.5053326,1528,0.5103188,1533,0.5104235,1537,0.5109443,1543,0.5088747,1548,0.5114602,1552,0.5078479,1557,0.4955375,1562,0.5020681,1567,0.5009384,1572,0.5130484,1578,0.4843262,1583,0.4878957,1587,0.4869790,1593,0.5039261,1598,0.4961504,1605,0.5016433,1615,0.5109383,1625,0.5010374,1635,0.5166810,1645,0.4997573,1655,0.5132085,1665,0.5045445,1675,0.5038381,1685,0.4979366,1695,0.5024966,1705,0.4946397,1715,0.4900714,1725,0.4820987,1735,0.4704836,1745,0.4675962,1755,0.4610580,1765,0.4542064,1775,0.4442880,1785,0.4394009,1795,0.4305704,1805,0.4214249,1815,0.4154385,1825,0.4121445,1835,0.4087068,1845,0.4004347,1855,0.3981439,1865,0.3898276,1875,0.3819086,1885,0.3837946,1895,0.3719080,1905,0.3783857,1915,0.3734775,1925,0.3706359,1935,0.3625896,1945,0.3552610,1955,0.3559292,1965,0.3516581,1975,0.3442642,1985,0.3424439,1995,0.3401458,2005,0.3400624,2015,0.3370426,2025,0.3310865,2035,0.3294150,2045,0.3300824,2055,0.3263510,2065,0.3238343,2075,0.3226433,2085,0.3196882,2095,0.3156795,2105,0.3170735,2115,0.3129192,2125,0.3107151,2135,0.3111934,2145,0.3083829,2155,0.3053164,2165,0.3011248,2175,0.2987932,2185,0.2973707,2195,0.2953015,2205,0.2894185,2215,0.2910636,2225,0.2855524,2235,0.2835412,2245,0.2813240,2255,0.2794243,2265,0.2746838,2275,0.2752567,2285,0.2700351,2295,0.2315953,2305,0.2464873,2315,0.2460988,2325,0.2138361,2335,0.2290047,2345,0.2216595,2355,0.1997312,2365,0.2151513,2375,0.2079374,2385,0.1903472,2395,0.2020694,2405,0.1988067,2415,0.1834113,2425,0.1912983,2435,0.1873909,2445,0.1783537,2455,0.1759682,2465,0.1784857,2475,0.1715942,2485,0.1573562,2495,0.1568707,2505,0.1598265";
                        P.whiteReferenceName = "Average Spiral Galaxy";
                  } else if (spcc_params.white_reference == "Photon Flux") {
                        P.whiteReferenceSpectrum = "1,1.0,500,1.0,1000,1.0,1500,1.0,2000,1.0,2500,1.0";
                        P.whiteReferenceName = "Photon Flux";
                  } else {
                        save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
                        util.throwFatalError("Unknown SPCC white reference " + spcc_params.white_reference);
                  }
                  console.writeln("SpectrophotometricColorCalibration white reference " + P.whiteReferenceName);
                  P.redFilterTrCurve = "400,0.088,402,0.084,404,0.080,406,0.076,408,0.072,410,0.068,412,0.065,414,0.061,416,0.058,418,0.055,420,0.052,422,0.049,424,0.046,426,0.044,428,0.041,430,0.039,432,0.037,434,0.035,436,0.033,438,0.031,440,0.030,442,0.028,444,0.027,446,0.026,448,0.025,450,0.024,452,0.023,454,0.022,456,0.021,458,0.021,460,0.021,462,0.020,464,0.020,466,0.020,468,0.020,470,0.020,472,0.021,474,0.021,476,0.022,478,0.022,480,0.023,482,0.024,484,0.025,486,0.026,488,0.027,490,0.028,492,0.029,494,0.031,496,0.032,498,0.034,500,0.036,502,0.037,504,0.039,506,0.041,508,0.043,510,0.045,512,0.048,514,0.050,516,0.052,518,0.055,520,0.057,522,0.060,524,0.063,526,0.071,528,0.072,530,0.070,532,0.067,534,0.064,536,0.059,538,0.054,540,0.050,542,0.045,544,0.041,546,0.037,548,0.034,550,0.032,552,0.031,554,0.031,556,0.032,558,0.035,560,0.038,562,0.043,564,0.048,566,0.055,568,0.062,570,0.070,572,0.122,574,0.187,576,0.262,578,0.346,580,0.433,582,0.521,584,0.606,586,0.686,588,0.755,590,0.812,592,0.851,594,0.871,596,0.876,598,0.885,600,0.892,602,0.896,604,0.897,606,0.897,608,0.895,610,0.891,612,0.887,614,0.882,616,0.878,618,0.873,620,0.870,622,0.867,624,0.863,626,0.860,628,0.858,630,0.856,632,0.854,634,0.852,636,0.850,638,0.848,640,0.846,642,0.844,644,0.841,646,0.837,648,0.834,650,0.829,652,0.824,654,0.819,656,0.813,658,0.806,660,0.799,662,0.791,664,0.783,666,0.774,668,0.765,670,0.755,672,0.745,674,0.735,676,0.725,678,0.715,680,0.704,682,0.695,684,0.685,686,0.676,688,0.668,690,0.660,692,0.654,694,0.649,696,0.648,698,0.649,700,0.649";
                  P.redFilterName = "Sony Color Sensor R-UVIRcut";
                  P.greenFilterTrCurve = "400,0.089,402,0.086,404,0.082,406,0.079,408,0.075,410,0.071,412,0.066,414,0.062,416,0.058,418,0.053,420,0.049,422,0.045,424,0.042,426,0.041,428,0.042,430,0.043,432,0.044,434,0.046,436,0.047,438,0.049,440,0.051,442,0.053,444,0.055,446,0.057,448,0.059,450,0.061,452,0.064,454,0.067,456,0.069,458,0.072,460,0.075,462,0.098,464,0.130,466,0.169,468,0.215,470,0.267,472,0.323,474,0.382,476,0.443,478,0.505,480,0.566,482,0.627,484,0.684,486,0.739,488,0.788,490,0.832,492,0.868,494,0.896,496,0.915,498,0.924,500,0.921,502,0.939,504,0.947,506,0.954,508,0.961,510,0.967,512,0.973,514,0.978,516,0.982,518,0.986,520,0.989,522,0.992,524,0.994,526,0.996,528,0.997,530,0.997,532,0.995,534,0.990,536,0.986,538,0.981,540,0.977,542,0.973,544,0.969,546,0.965,548,0.960,550,0.955,552,0.949,554,0.943,556,0.936,558,0.928,560,0.919,562,0.909,564,0.898,566,0.887,568,0.874,570,0.860,572,0.845,574,0.829,576,0.812,578,0.794,580,0.775,582,0.754,584,0.733,586,0.711,588,0.688,590,0.665,592,0.640,594,0.615,596,0.589,598,0.563,600,0.537,602,0.510,604,0.483,606,0.456,608,0.430,610,0.403,612,0.377,614,0.352,616,0.328,618,0.304,620,0.282,622,0.261,624,0.242,626,0.224,628,0.225,630,0.216,632,0.207,634,0.199,636,0.192,638,0.185,640,0.179,642,0.174,644,0.169,646,0.165,648,0.161,650,0.158,652,0.156,654,0.155,656,0.154,658,0.154,660,0.155,662,0.156,664,0.158,666,0.162,668,0.165,670,0.170,672,0.176,674,0.182,676,0.189,678,0.198,680,0.207,682,0.217,684,0.228,686,0.240,688,0.240,690,0.248,692,0.257,694,0.265,696,0.274,698,0.282,700,0.289";
                  P.greenFilterName = "Sony Color Sensor G-UVIRcut";
                  P.blueFilterTrCurve = "400,0.438,402,0.469,404,0.496,406,0.519,408,0.539,410,0.557,412,0.572,414,0.586,416,0.599,418,0.614,420,0.631,422,0.637,424,0.647,426,0.658,428,0.670,430,0.682,432,0.695,434,0.708,436,0.720,438,0.732,440,0.743,442,0.753,444,0.762,446,0.770,448,0.777,450,0.783,452,0.788,454,0.791,456,0.794,458,0.796,460,0.797,462,0.798,464,0.798,466,0.799,468,0.800,470,0.801,472,0.800,474,0.798,476,0.793,478,0.785,480,0.774,482,0.760,484,0.742,486,0.707,488,0.669,490,0.633,492,0.598,494,0.565,496,0.533,498,0.502,500,0.473,502,0.446,504,0.419,506,0.394,508,0.370,510,0.348,512,0.326,514,0.306,516,0.287,518,0.268,520,0.251,522,0.235,524,0.220,526,0.205,528,0.192,530,0.179,532,0.167,534,0.156,536,0.145,538,0.136,540,0.126,542,0.118,544,0.110,546,0.102,548,0.095,550,0.089,552,0.083,554,0.077,556,0.071,558,0.066,560,0.061,562,0.057,564,0.052,566,0.048,568,0.044,570,0.039,572,0.041,574,0.039,576,0.037,578,0.035,580,0.033,582,0.032,584,0.030,586,0.029,588,0.027,590,0.026,592,0.025,594,0.024,596,0.023,598,0.022,600,0.022,602,0.021,604,0.021,606,0.020,608,0.020,610,0.020,612,0.020,614,0.020,616,0.020,618,0.021,620,0.021,622,0.022,624,0.022,626,0.023,628,0.024,630,0.025,632,0.026,634,0.027,636,0.028,638,0.030,640,0.031,642,0.033,644,0.035,646,0.036,648,0.038,650,0.040,652,0.042,654,0.045,656,0.048,658,0.051,660,0.054,662,0.057,664,0.059,666,0.061,668,0.063,670,0.065,672,0.066,674,0.068,676,0.069,678,0.070,680,0.071,682,0.072,684,0.072,686,0.073,688,0.073,690,0.073,692,0.073,694,0.073,696,0.073,698,0.073,700,0.073";
                  P.blueFilterName = "Sony Color Sensor B-UVIRcut";
                  P.redFilterWavelength = spcc_params.wavelengths[0];         // 656.3;
                  P.redFilterBandwidth = spcc_params.bandhwidths[0];          // 3.0;
                  P.greenFilterWavelength = spcc_params.wavelengths[1];       // 500.7;
                  P.greenFilterBandwidth = spcc_params.bandhwidths[1];        // 3.0;
                  P.blueFilterWavelength = spcc_params.wavelengths[2];        // 500.7;
                  P.blueFilterBandwidth = spcc_params.bandhwidths[2];         // 3.0;
                  P.deviceQECurve = "1,1.0,500,1.0,1000,1.0,1500,1.0,2000,1.0,2500,1.0";
                  P.deviceQECurveName = "Ideal QE curve";
                  P.broadbandIntegrationStepSize = 0.50;
                  P.narrowbandIntegrationSteps = 10;
                  P.catalogId = "GaiaDR3SP";
                  if (par.spcc_limit_magnitude.val.toUpperCase() == 'AUTO') {
                        console.writeln("SpectrophotometricColorCalibration using Auto limit magnitude.");
                        P.limitMagnitude = 12.00;
                        P.autoLimitMagnitude = true;
                  } else {
                        P.autoLimitMagnitude = false;
                        P.limitMagnitude = parseFloat(par.spcc_limit_magnitude.val);
                        if (P.limitMagnitude == NaN) {
                              save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
                              util.throwFatalError("Invalid limit magnitude " + par.spcc_limit_magnitude.val);
                        }
                        if (P.limitMagnitude > 30) {
                              console.writeln("SpectrophotometricColorCalibration adjusting limit magnitude from " + P.limitMagnitude  + " to 30.");
                              P.limitMagnitude = 30;
                        }
                        console.writeln("SpectrophotometricColorCalibration using limit magnitude " + P.limitMagnitude);
                  }
                  P.targetSourceCount = 8000;
                  P.psfStructureLayers = par.spcc_detection_scales.val;
                  P.saturationThreshold = par.spcc_saturation_threshold.val;
                  P.saturationRelative = true;
                  P.saturationShrinkFactor = 0.10;
                  P.psfNoiseLayers = par.spcc_noise_scales.val;
                  P.psfHotPixelFilterRadius = 1;
                  P.psfNoiseReductionFilterRadius = 0;
                  P.psfMinStructureSize = par.spcc_min_struct_size.val;
                  P.psfMinSNR = par.spcc_min_SNR.val;
                  P.psfAllowClusteredSources = true;
                  P.psfType = SpectrophotometricColorCalibration.prototype.PSFType_Auto;
                  P.psfGrowth = 1.25;
                  P.psfMaxStars = 24576;
                  P.psfSearchTolerance = 4.00;
                  P.psfChannelSearchTolerance = 2.00;
                  P.neutralizeBackground = par.spcc_background_neutralization.val;
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
                        save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
                        util.throwFatalError("SpectrophotometricColorCalibration failed");
                  }

                  printProcessValues(P);
                  engine_end_process(node, imgWin, "SpectrophotometricColorCalibration");

                  guiUpdatePreviewId(imgWin.mainView.id);

                  spcc_color_calibration_done = true;

            } catch(err) {
                  save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
                  console.criticalln("SpectrophotometricColorCalibration failed");
                  console.criticalln(err);
                  console.noteln("You can try adjusting SpectophotometricColorCalibration parameters and rerun the script.");
                  util.throwFatalError("SpectrophotometricColorCalibration failed");
            }

      } else {
            if (par.color_calibration_time.val == phase) {
                  var run_colorcalibration = true;
            } else if (par.color_calibration_time.val == 'auto') {
                  // var run_colorcalibration = (phase == 'linear'); Seem to get better results when run twice
                  var run_colorcalibration = true;
            } else if (par.color_calibration_time.val == 'both') {
                  var run_colorcalibration = true;
            } else {
                  var run_colorcalibration = false;
            }
            if (run_colorcalibration) {
                  /* Use ColorCalibration.
                   */
                  runColorCalibrationProcess(imgWin);
            }
      }
}

// This function is not used but kept here for possible future use.
function runColorSaturation(imgWin, maskWin)
{
      util.addProcessingStepAndStatusInfo("Color saturation on " + imgWin.mainView.id + " using mask " + maskWin.mainView.id);
      var node = flowchartOperation("ColorSaturation");
      if (global.get_flowchart_data) {
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

      imgWin.mainView.beginProcess(UndoFlag_NoSwapFile);

      /* Saturate only light parts of the image. */
      setMaskChecked(imgWin, maskWin);
      imgWin.maskInverted = false;
      
      P.executeOn(imgWin.mainView, false);

      imgWin.removeMask();

      imgWin.mainView.endProcess();

      printProcessValues(P);
      engine_end_process(node);

      guiUpdatePreviewWin(imgWin);
}

function runCurvesTransformationSaturation(imgWin, maskWin)
{
      if (maskWin == null) {
            util.addProcessingStepAndStatusInfo("Curves transformation for saturation on " + imgWin.mainView.id);
      } else {
            util.addProcessingStepAndStatusInfo("Curves transformation for saturation on " + imgWin.mainView.id + " using mask " + maskWin.mainView.id);
      }
      var node = flowchartOperation("CurvesTransformation:saturation");
      if (global.get_flowchart_data) {
            return;
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

      printProcessValues(P);
      engine_end_process(node, imgWin, "CurvesTransformation:saturation");

      guiUpdatePreviewWin(imgWin);
}

function runCurvesTransformationChrominance (imgWin, maskWin)
{
      if (maskWin == null) {
            util.addProcessingStepAndStatusInfo("Curves transformation for chrominance  on " + imgWin.mainView.id);
      } else {
            util.addProcessingStepAndStatusInfo("Curves transformation for chrominance on " + imgWin.mainView.id + " using mask " + maskWin.mainView.id);
      }
      var node = flowchartOperation("CurvesTransformation:chrominance");
      if (global.get_flowchart_data) {
            return;
      }

      var P = new CurvesTransformation;
      P.c = [ // x, y
            [0.00000, 0.00000],
            [0.48604, 0.51200],
            [1.00000, 1.00000]
         ];
      imgWin.mainView.beginProcess(UndoFlag_NoSwapFile);

      if (maskWin != null) {
            /* Apply chrominance only light parts of the image. */
            setMaskChecked(imgWin, maskWin);
            imgWin.maskInverted = false;
      }
      
      P.executeOn(imgWin.mainView, false);

      if (maskWin != null) {
            imgWin.removeMask();
      }

      imgWin.mainView.endProcess();

      printProcessValues(P);
      engine_end_process(node, imgWin, "CurvesTransformation:chrominance");

      guiUpdatePreviewWin(imgWin);
}

function increaseSaturation(imgWin, maskWin)
{
      if (par.use_chrominance.val) {
            runCurvesTransformationChrominance(imgWin, maskWin);
      } else {
            runCurvesTransformationSaturation(imgWin, maskWin);
      }
}

// Replace last occurance of oldtxt to newtxt in str.
// If oldtxt is not found then return str + _ + newtxt.
function replaceLastString(str, oldtxt, newtxt)
{
      var lstidx = str.lastIndexOf(oldtxt);
      if (lstidx == -1) {
            return str + "-" + newtxt;
      }
      return str.substring(0, lstidx) + newtxt + str.substring(lstidx + oldtxt.length);
}

function runLRGBCombination(RGB_id, L_id)
{
      console.writeln("runLRGBCombination using " + RGB_id + " and " + L_id );

      if (par.LRGBCombination_linearfit.val) {
            console.writeln("Linear fit of " + RGB_id + " and luminance image " + L_id);
            var referenceWin = util.forceCopyWindow(
                                    ImageWindow.windowById(RGB_id), 
                                    util.ensure_win_prefix(RGB_id + "GrayScale"));
            convert_to_grayscale(referenceWin);
            runLinearFit(referenceWin.mainView.id, L_id, true);
            referenceWin.forceClose();
      }

      var targetWin = util.copyWindow(
                        ImageWindow.windowById(RGB_id), 
                        util.ensure_win_prefix(replaceLastString(RGB_id, "RGB", "LRGB")));
      var RGBimgView = targetWin.mainView;
      util.addProcessingStepAndStatusInfo("LRGB combination of " + RGB_id + " and luminance image " + L_id + " into " + RGBimgView.id);
      var node = flowchartOperation("LRGBCombination");
      if (global.get_flowchart_data) {
            return RGB_id;
      }

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

      printProcessValues(P);
      engine_end_process(node, targetWin, "LRGBCombination");

      guiUpdatePreviewId(RGBimgView.id);

      setAutoIntegrateFilters(RGBimgView.id, [ RGB_id, L_id ]);

      return RGBimgView.id;
}

function runSCNR(imgWin, fixing_stars)
{
      var RGBimgView = imgWin.mainView
      if (!fixing_stars) {
            util.addProcessingStepAndStatusInfo("SCNR on " + RGBimgView.id);
      }
      var node = flowchartOperation("SCNR");
      if (global.get_flowchart_data) {
            return;
      }

      var P = new SCNR;
      if (process_narrowband && par.leave_some_green.val && !fixing_stars) {
            P.amount = par.leave_some_green_amount.val;
            util.addProcessingStep("Run SCNR using amount " + P.amount + " to leave some green color");
      } else {
            P.amount = 1.00;
      }

      RGBimgView.beginProcess(UndoFlag_NoSwapFile);

      P.executeOn(RGBimgView, false);

      RGBimgView.endProcess();

      printProcessValues(P);
      engine_end_process(node, imgWin, "SCNR");

      guiUpdatePreviewId(RGBimgView.id);
}

// Run hue shift on narrowband image to enhance orange.
function extraNarrowbandOrangeHueShift(imgView)
{
      addExtraProcessingStep("Orange hue shift");
      var node = flowchartOperation("CurvesTransformation:orangehueshift");
      if (global.get_flowchart_data) {
            return;
      }

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

      engine_end_process(node);

      guiUpdatePreviewId(imgView.id);
}

function runMultiscaleLinearTransformSharpen(imgWin, maskWin)
{
      if (maskWin != null) {
            util.addProcessingStepAndStatusInfo("Sharpening on " + imgWin.mainView.id + " using mask " + maskWin.mainView.id);
      } else {
            util.addProcessingStepAndStatusInfo("Sharpening on " + imgWin.mainView.id);
      }
      var node = flowchartOperation("MultiscaleLinearTransform:sharpen");
      if (global.get_flowchart_data) {
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

      printProcessValues(P);
      engine_end_process(node, imgWin, "MultiscaleLinearTransform:sharpen");

      guiUpdatePreviewWin(imgWin);
}

function writeProcessingStepsAndEndLog(alignedFiles, autocontinue, basename, iserror)
{
      if (basename == null) {
            if (autocontinue) {
                  basename = "AutoContinue";
            } else {
                  basename = "AutoIntegrate";
            }
      }
      logfname = basename + util.getOptionalUniqueFilenamePart() + ".log";
      if (par.win_prefix_to_log_files.val && !global.get_flowchart_data) {
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
      if (iserror) {
            // In case of error write info to log file.
            // Normally this is written from the console output.
            if (engine.lightFileNames != null) {
                  file.outTextLn("Dialog files:");
                  for (var i = 0; i < engine.lightFileNames.length; i++) {
                        file.outTextLn(engine.lightFileNames[i]);
                  }
            }
            if (alignedFiles != null) {
                  file.outTextLn("Aligned files:");
                  for (var i = 0; i < alignedFiles.length; i++) {
                        file.outTextLn(alignedFiles[i]);
                  }
            }
            file.outTextLn(global.processing_steps);
            if (global.processing_warnings.length > 0) {
                  file.outTextLn("Processing warnings:");
                  file.outTextLn(global.processing_warnings);
                  console.warningln("Processing warnings:");
                  console.warningln(global.processing_warnings);
            }
            if (global.processing_errors.length > 0) {
                  file.outTextLn("Processing errors:");
                  file.outTextLn(global.processing_errors);
                  console.criticalln("Processing errors:");
                  console.criticalln(global.processing_errors);
                  global.processing_errors = "";
            }
      }
      file.close();
}

// Find window and optionally search without a prefix
// Used to find AutoContinue images
function findWindowCheckBaseNameIf(id, check_base_name)
{
      // console.writeln("findWindowCheckBaseNameIf: " + id);
      var win = util.findWindowOrFile(util.ensure_win_prefix(id));
      if (win == null && check_base_name && ppar.win_prefix != ppar.autocontinue_win_prefix) {
            // Try to find without prefix so we can autocontinue
            // from default run but will have new output
            // file names.
            win = util.findWindowOrFile(util.ensure_win_prefix_ex(id, ppar.autocontinue_win_prefix));
      }
      return win;
}

// Find window id and optionally search without a prefix
// Used to find AutoContinue images
function findWindowIdCheckBaseNameIf(name, check_base_name)
{
      var id = util.findWindowOrFileId(util.ensure_win_prefix(name));
      if (id == null && check_base_name && ppar.win_prefix != ppar.autocontinue_win_prefix) {
            // Try to find with autocontinue prefix so we can autocontinue
            // from other run but will have new output
            // file names.
            id = util.findWindowOrFileId(util.ensure_win_prefix_ex(name, ppar.autocontinue_win_prefix));
            autocontinue_prefix = ppar.autocontinue_win_prefix;
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
      var win = util.findWindowOrFile(id);
      if (win == null && check_base && ppar.win_prefix != '' && id.startsWith(ppar.win_prefix)) {
            // Try without prefix
            var win = util.findWindowOrFile(id.substring(ppar.win_prefix.length));
      }
      if (win == null && check_base && ppar.win_prefix != '' && id.startsWith(ppar.win_prefix)) {
            // Try with autocontinue prefix
            var basename = id.substring(ppar.win_prefix.length);
            var win = util.findWindowOrFile(ppar.autocontinue_win_prefix + basename);
      }
      return win;
}

// Try to find window with file name. 
// If not found read it.
function findOrReadImage(fname, new_id)
{
      console.writeln("findOrReadImage " + fname);

      var id = File.extractName(fname);
      if (util.findWindow(id)) {
            // we have already loaded the file into memory
            console.writeln("findOrReadImage, use already loaded image " + id);
            return id;
      }

      // read the file
      console.writeln("findOrReadImage, reading file " + fname);
      var imageWindows = ImageWindow.open(fname);
      if (!imageWindows || imageWindows.length == 0) {
            util.throwFatalError("*** findOrReadImage Error: file " + fname + ", imageWindows.length: " + imageWindows.length);
      }
      var imageWindow = imageWindows[0];
      if (imageWindow == null) {
            util.throwFatalError("*** findOrReadImage Error: Can't read file: " + fname);
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
function findIntegratedLightImage(channel, filtered_lights, new_id)
{
      for (var i = 0; i < filtered_lights.allfilesarr.length; i++) {
            if (filtered_lights.allfilesarr[i].filter == channel) {
                  if (filtered_lights.allfilesarr[i].files.length == 1) {
                        // Only one file, assume it is the integrated file
                        var id = findOrReadImage(filtered_lights.allfilesarr[i].files[0].name, new_id);
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

function findIntegratedChannelImage(channel, check_base_name, filtered_lights)
{
      var cropextensions = [ '_crop', '' ];
      for (var i = 0; i < cropextensions.length; i++) {
            var id = findWindowIdCheckBaseNameIf("Integration_" + channel + cropextensions[i], check_base_name);
            if (id == null && filtered_lights != null) {
                  id = findIntegratedLightImage(channel, filtered_lights, "Integration_" + channel + cropextensions[i]);
            }
            if (id != null) {
                  return id;
            }
      }
      return null;
}

function findIntegratedRGBImage(check_base_name, filtered_lights)
{
      var id = findIntegratedChannelImage("RGB", check_base_name, null);
      if (id == null && filtered_lights != null) {
            id = findIntegratedLightImage('C', filtered_lights, "Integration_RGB");
      }
      return id;
}

function findIntegratedChannelAndRGBImages(check_base_name)
{
      if (engine.lightFileNames != null && par.integrated_lights.val) {
            var filtered_lights = engine.getFilterFiles(engine.lightFileNames, global.pages.LIGHTS, '');
      } else {
            var filtered_lights = null;
      }

      L_id = findIntegratedChannelImage("L", check_base_name, filtered_lights);
      R_id = findIntegratedChannelImage("R", check_base_name, filtered_lights);
      G_id = findIntegratedChannelImage("G", check_base_name, filtered_lights);
      B_id = findIntegratedChannelImage("B", check_base_name, filtered_lights);
      H_id = findIntegratedChannelImage("H", check_base_name, filtered_lights);
      S_id = findIntegratedChannelImage("S", check_base_name, filtered_lights);
      O_id = findIntegratedChannelImage("O", check_base_name, filtered_lights);
      RGB_color_id = findIntegratedRGBImage(check_base_name, filtered_lights);
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
      var node = flowchartOperation("Debayer");
      if (global.get_flowchart_data) {
            return fileNames;
      }

      var P = new Debayer;
      P.cfaPattern = global.debayerPattern_enums[global.debayerPattern_values.indexOf(par.debayer_pattern.val)];
      P.targetItems = fileNamesToEnabledPath(fileNames);
      P.outputDirectory = global.outputRootDir + global.AutoOutputDir;
      P.overwriteExistingFiles = true;

      try {
            succ = P.executeGlobal();
      } catch(err) {
            succ = false;
            util.addCriticalStatus(err.toString());
      }

      printProcessValues(P);
      engine_end_process(node);

      if (!succ) {
            console.criticalln("Debayer failed");
            util.addProcessingStep("Error, maybe debayer pattern was not correctly selected");
            util.throwFatalError("Debayer failed");
      }

      return fileNamesFromOutputData(P.outputFileData);
}

function runBandingReduction(imageWindow)
{
      console.writeln("runBandingReduction");
      var node = flowchartOperation("BandingReduction");
      if (global.get_flowchart_data) {
            return;
      }

      var bandingEngine = new AutoIntegrateBandingEngine();

      bandingEngine.setAmount(par.banding_reduction_amount.val);
      bandingEngine.setHighlightProtect(par.banding_reduction_protect_highlights.val);

      bandingEngine.setTargetImage(imageWindow.mainView.image);
      bandingEngine.doit(imageWindow.mainView);
      engine_end_process(node);
}

function bandingEngineForImages(fileNames)
{
      util.addStatusInfo("Banding reduction for " + fileNames.length + " images");
      util.addProcessingStep("bandingEngineForImages, fileNames[0] " + fileNames[0]);
      var node = flowchartOperation("BandingReduction");
      if (global.get_flowchart_data) {
            return fileNames;
      }

      var newFileNames = [];
      var outputDir = global.outputRootDir + global.AutoOutputDir;
      var outputExtension = ".xisf";

      var bandingEngine = new AutoIntegrateBandingEngine();

      bandingEngine.setAmount(par.banding_reduction_amount.val);
      bandingEngine.setHighlightProtect(par.banding_reduction_protect_highlights.val);

      for (var i = 0; i < fileNames.length; i++) {
            console.writeln("bandingEngineForImages, "+ fileNames[i]);
            var imageWindows = ImageWindow.open(fileNames[i]);
            if (!imageWindows || imageWindows.length == 0) {
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
            util.closeOneWindow(imageWindow);
      }
      engine_end_process(node);

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
      var node = flowchartOperation("ChannelExtraction");
      
      for (var i = 0; i < fileNames.length; i++) {
            if (global.get_flowchart_data) {
                  if (par.extract_channel_mapping.val == 'LRGB') {
                        var filePath = generateNewFileName(fileNames[i], outputDir, "_L", outputExtension);
                        flowchartNewIntegrationImage(fileNames[i], util.ensure_win_prefix(File.extractName(filePath)));
                        newFileNames[newFileNames.length] = filePath;
                  }
                  filePath = generateNewFileName(fileNames[i], outputDir, "_" + channel_map[0], outputExtension);
                  flowchartNewIntegrationImage(fileNames[i], util.ensure_win_prefix(File.extractName(filePath)));
                  newFileNames[newFileNames.length] = filePath;

                  filePath = generateNewFileName(fileNames[i], outputDir, "_" + channel_map[1], outputExtension);
                  flowchartNewIntegrationImage(fileNames[i], util.ensure_win_prefix(File.extractName(filePath)));
                  newFileNames[newFileNames.length] = filePath;
                  
                  filePath = generateNewFileName(fileNames[i], outputDir, "_" + channel_map[2], outputExtension);
                  newFileNames[newFileNames.length] = filePath;
                  flowchartNewIntegrationImage(fileNames[i], util.ensure_win_prefix(File.extractName(filePath)));

                  continue;
            }
            // Open source image window from a file
            var imageWindows = ImageWindow.open(fileNames[i]);
            if (!imageWindows || imageWindows.length == 0) {
                  save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
                  util.throwFatalError("*** extractChannels Error: imageWindows.length: " + imageWindows.length);
            }
            var imageWindow = imageWindows[0];
            if (imageWindow == null) {
                  save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
                  util.throwFatalError("*** extractChannels Error: Can't read file: " + fileNames[i]);
            }

            // Extract channels and save each channel to a separate file.
            if (par.extract_channel_mapping.val == 'LRGB') {
                  var targetWindow = extractLchannel(imageWindow, true);
                  var filePath = generateNewFileName(fileNames[i], outputDir, "_L", outputExtension);
                  util.setFITSKeyword(targetWindow, "FILTER", "L", "AutoIntegrate extracted channel")
                  // Save window
                  if (!writeImage(filePath, targetWindow)) {
                        save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
                        util.throwFatalError("*** extractChannels Error: Can't write output image: " + filePath);
                  }
                  newFileNames[newFileNames.length] = filePath;
                  util.closeOneWindow(targetWindow);
            }

            var rId = extractRGBchannel(imageWindow.mainView.id, 'R', true);
            var rWin = util.findWindow(rId);
            var filePath = generateNewFileName(fileNames[i], outputDir, "_" + channel_map[0], outputExtension);
            util.setFITSKeyword(rWin, "FILTER", channel_map[0], "AutoIntegrate extracted channel")
            if (!writeImage(filePath, rWin)) {
                  save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
                  util.throwFatalError("*** extractChannels Error: Can't write output image: " + filePath);
            }
            newFileNames[newFileNames.length] = filePath;
            util.closeOneWindow(rWin);

            var gId = extractRGBchannel(imageWindow.mainView.id, 'G', true);
            var gWin = util.findWindow(gId);
            var filePath = generateNewFileName(fileNames[i], outputDir, "_" + channel_map[1], outputExtension);
            util.setFITSKeyword(gWin, "FILTER", channel_map[1], "AutoIntegrate extracted channel")
            if (!writeImage(filePath, gWin)) {
                  save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
                  util.throwFatalError("*** extractChannels Error: Can't write output image: " + filePath);
            }
            newFileNames[newFileNames.length] = filePath;
            util.closeOneWindow(gWin);

            var bId = extractRGBchannel(imageWindow.mainView.id, 'B', true);
            var bWin = util.findWindow(bId);
            var filePath = generateNewFileName(fileNames[i], outputDir, "_" + channel_map[2], outputExtension);
            util.setFITSKeyword(bWin, "FILTER", channel_map[2], "AutoIntegrate extracted channel")
            if (!writeImage(filePath, bWin)) {
                  save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
                  util.throwFatalError("*** extractChannels Error: Can't write output image: " + filePath);
            }
            newFileNames[newFileNames.length] = filePath;
            util.closeOneWindow(bWin);

            // Close window
            util.closeOneWindow(imageWindow);
      }
      engine_end_process(node);
      return newFileNames;
}

function findGCStartWindowCheckBaseNameIf(id, check_base_name)
{
      var cropextensions = [ '_crop', '' ];
      var extensions = [ '_GC', '_ABE', '_DBE', '_GraXpert' ];

      // console.writeln("findGCStartWindowCheckBaseNameIf: " + id + ", check_base_name: " + check_base_name);

      for (var i = 0; i < cropextensions.length; i++) {
            for (var j = 0; j < extensions.length; j++) {
                  var win = findWindowCheckBaseNameIf(id + cropextensions[i] + extensions[j], check_base_name);
                  if (win) {
                        console.writeln("findCGStartWindowCheckBaseNameIf: found " + win.mainView.id);
                        return win;
                  }
            }
      }
      return null;
}

function findStartWindowCheckBaseNameIf(id, check_base_name)
{
      var win = findWindowCheckBaseNameIf(id, check_base_name);
      if (win) {
            console.writeln("findStartWindowCheckBaseNameIf: found " + win.mainView.id);
      }
      return win;
}

function findStartWindowCheckBaseNameArrayIf(idarray, check_base_name)
{
      for (var i = 0; i < idarray.length; i++) {
            var win = findWindowCheckBaseNameIf(idarray[i], check_base_name);
            if (win) {
                  console.writeln("findStartWindowCheckBaseNameArrayIf: found " + win.mainView.id);
                  return win;
            }
      }
      return null;
}

function findStartImages(auto_continue, check_base_name, can_update_preview)
{
      if (global.get_flowchart_data) {
            return global.start_images.NONE;
      }

      /* Check if we have manually done histogram transformation. */
      L_HT_start_win = findStartWindowCheckBaseNameIf("L_HT", check_base_name);
      RGB_HT_start_win = findStartWindowCheckBaseNameIf("RGB_HT", check_base_name);

      /* Check if we have manual gradient corrected files. */
      L_GC_start_win = findGCStartWindowCheckBaseNameIf("Integration_L", check_base_name);
      R_GC_start_win = findGCStartWindowCheckBaseNameIf("Integration_R", check_base_name);
      G_GC_start_win = findGCStartWindowCheckBaseNameIf("Integration_G", check_base_name);
      B_GC_start_win = findGCStartWindowCheckBaseNameIf("Integration_B", check_base_name);
      H_GC_start_win = findGCStartWindowCheckBaseNameIf("Integration_H", check_base_name);
      S_GC_start_win = findGCStartWindowCheckBaseNameIf("Integration_S", check_base_name);
      O_GC_start_win = findGCStartWindowCheckBaseNameIf("Integration_O", check_base_name);
      RGB_GC_start_win = findGCStartWindowCheckBaseNameIf("Integration_RGB", check_base_name);

      findIntegratedChannelAndRGBImages(check_base_name);

      if (util.is_extra_option() || util.is_narrowband_option()) {
            for (var i = 0; i < global.final_windows.length; i++) {
                  final_win = findWindowNoPrefixIf(global.final_windows[i], check_base_name);
                  if (final_win != null) {
                        break;
                  }
            }
      }
      if (L_GC_start_win != null || L_HT_start_win != null || L_id != null) {
            is_luminance_images = true;
      } else {
            is_luminance_images = false;
      }

      var preview_id = null;

      if (final_win != null) {
            /*
             * Final image.
             */
            util.addProcessingStep("Start from final image " + final_win.mainView.id);
            preview_id = final_win.mainView.id;
            preprocessed_images = global.start_images.FINAL;

      } else if (checkAutoCont(L_HT_start_win) && checkAutoCont(RGB_HT_start_win)) {
            /* 
             * L,RGB HistogramTransformation / stretched 
             */
            util.addProcessingStep("Start from L,RGB HistogramTransformation");
            preview_id = L_HT_start_win.mainView.id;
            preprocessed_images = global.start_images.L_RGB_HT;
            if (util.getKeywordValue(RGB_HT_start_win, "AutoIntegrateNarrowband") == "true") {
                  process_narrowband = true;
            }

      } else if (checkAutoCont(RGB_HT_start_win)) {
            /* 
             * RGB (color) HistogramTransformation / stretched 
             */
            util.addProcessingStep("Start from RGB (color) HistogramTransformation " + RGB_HT_start_win.mainView.id);
            preview_id = RGB_HT_start_win.mainView.id;
            preprocessed_images = global.start_images.RGB_HT;
            if (util.getKeywordValue(RGB_HT_start_win, "AutoIntegrateNarrowband") == "true") {
                  process_narrowband = true;
            }

      } else if ((checkAutoCont(R_GC_start_win) && checkAutoCont(G_GC_start_win) && checkAutoCont(B_GC_start_win)) ||
                 (checkAutoCont(H_GC_start_win) && checkAutoCont(O_GC_start_win))) 
      {
            /* 
             * L,R,G,B,H,S,O integrated, gradient corrected 
             */
            util.addProcessingStep("Start from L,R,G,B,H,S,O integrated, gradient corrected");
            preview_id = checkAutoCont(R_GC_start_win) ? R_GC_start_win.mainView.id : H_GC_start_win.mainView.id;
            preprocessed_images = global.start_images.L_R_G_B_GC;
            process_narrowband = checkAutoCont(H_GC_start_win) || checkAutoCont(O_GC_start_win);
            L_id = null;
            R_id = null;
            G_id = null;
            B_id = null;
            H_id = null;
            S_id = null;
            O_id = null;

      } else if (checkAutoCont(RGB_GC_start_win)) {
            /* 
             * RGB (color) integrated, gradient corrected 
             */
            util.addProcessingStep("Start from RGB (color) integrated, gradient corrected " + RGB_GC_start_win.mainView.id);
            preview_id = RGB_GC_start_win.mainView.id;
            preprocessed_images = global.start_images.RGB_GC;
            if (util.getKeywordValue(RGB_GC_start_win, "AutoIntegrateNarrowband") == "true") {
                  process_narrowband = true;
            }
      
      } else if ((R_id != null && G_id != null && B_id != null) ||
                 (H_id != null && O_id != null)) 
      {
            /* 
             * L,R,G,B,H,S,O integrated images 
             */
            util.addProcessingStep("Start from L,R,G,B,H,S,O integrated images");
            preview_id = R_id != null ? R_id : H_id;
            var check_name = ppar.win_prefix + "Integration_RGB";
            if (auto_continue && util.findWindow(check_name)) {
                  util.throwFatalError("Cannot start AutoContinue, processed image " + check_name + " already exists. " +
                                    "Close previously processed images or use a different window prefix.")
            }
            checkAutoCont(util.findWindow(R_id));
            checkAutoCont(util.findWindow(H_id));
            is_rgb_files = R_id != null && G_id != null && B_id != null;
            is_narrowband_files = H_id != null || O_id != null;
            process_narrowband = is_narrowband_files;
            preprocessed_images = global.start_images.L_R_G_B;

      } else if (RGB_color_id != null) {
            /* 
             * RGB (color) integrated image 
             */
            util.addProcessingStep("Start from RGB (color) integrated image " + RGB_color_id);
            preview_id = RGB_color_id;
            if (util.getKeywordValue(util.findWindow(RGB_color_id), "AutoIntegrateNarrowband") == "true") {
                  process_narrowband = true;
            }
            preprocessed_images = global.start_images.RGB;

      } else {
            /*
             * No start image.
             */
            console.writeln("No start image");
            preprocessed_images = global.start_images.NONE;
      }
      if (preview_id != null && auto_continue && can_update_preview) {
            guiUpdatePreviewId(preview_id);
      }
      return preprocessed_images;
}

function autocontinueHasNarrowband()
{
      process_narrowband = false;
      findStartImages(true, true, true);
      return process_narrowband;
}

function getFileProcessedStatusEx(fileNames, postfix, outputDir, outputExtension = ".xisf")
{
      if (!par.use_processed_files.val) {
            return { processed: [], unprocessed: fileNames };
      }
      var processed = [];
      var unprocessed = [];
      for (var i = 0; i < fileNames.length; i++) {
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
            case global.start_images.L_R_G_B_GC:
                  return "Background extracted and integrated channel images";
            case global.start_images.RGB_GC:
                  return "Background extracted and integrated RGB image";
            case global.start_images.L_RGB_HT:
                  return "Stretched L and RGB images";
            case global.start_images.RGB_HT:
                  return "Stretched RGB image";
            case global.start_images.L_R_G_B:
                  return "Integrated channel images";
            case global.start_images.RGB:
                  return "Integrated RGB image";
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
      util.addProcessingStepAndStatusInfo("Find start images");

      final_win = null;
      global.write_processing_log_file = false;  // do not write the log file if we fail very early

      if (auto_continue) {
            console.writeln("AutoContinue, find start images with prefix " + ppar.win_prefix);
            preprocessed_images = findStartImages(true, false, true);
            if (preprocessed_images == global.start_images.NONE && ppar.win_prefix != ppar.autocontinue_win_prefix) {
                  console.writeln("AutoContinue, find start images with prefix '" + ppar.autocontinue_win_prefix + "'");
                  preprocessed_images = findStartImages(true, true, true);
            }
      } else {
            // find old images with prefix
            preprocessed_images = findStartImages(false, false, true);
      }

      if (auto_continue) {
            if (preprocessed_images == global.start_images.NONE) {
                  util.addProcessingStep("No preprocessed images found, processing not started!");
                  return retval.ERROR;
            } else if (util.findWindowFromArray(global.intermediate_windows)) {
                  util.addProcessingStep("There are already preprocessed images, processing not started!");
                  util.addProcessingStep("Close or rename old images before continuing.");
                  return retval.ERROR;
            }
      } else {
            if (preprocessed_images != global.start_images.NONE || util.findWindowFromArray(global.fixed_windows)) {
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
            if (preprocessed_images == global.start_images.RGB_GC ||
                preprocessed_images == global.start_images.RGB_HT) 
            {
                  if (process_narrowband) {
                        util.addProcessingStep("Processing as narrowband images");
                  } else {
                        /* No L files, assume color. */
                        util.addProcessingStep("Processing as color image from preprocessed RGB image");
                  }
                  is_color_files = true;
            }
            if (par.force_new_mask.val) {
                  util.closeOneWindowById(ppar.win_prefix + "AutoMask");
                  mask_win_id = null;
                  range_mask_win = null;
            } else {
                  /* Check if we already have a mask. It can be from previous run or manually created. */
                  mask_win_id = ppar.win_prefix + "AutoMask";
                  range_mask_win = util.findWindow(mask_win_id);
            }
      } else {
            util.addProcessingStepAndStatusInfo("Create channel images");

            /* Open dialog files and run SubframeSelector on them
             * to assigns SSWEIGHT.
             */
            var fileNames;
            if (engine.lightFileNames == null) {
                  global.lightFileNames = engine.openImageFiles("Lights", true, false, false);
                  engine.lightFileNames = filterFilesForFastMode(global.lightFileNames, false, global.pages.LIGHTS);
                  util.addProcessingStep("Get files from dialog");
            }
            if (engine.lightFileNames == null) {
                  global.write_processing_log_file = false;
                  console.writeln("No files to process");
                  return retval.ERROR;
            }

            guiUpdatePreviewFilename(engine.lightFileNames[0]);

            // We keep track of extensions added to the file names
            // If we need to original file names we can subtract
            // added extensions.
            var filename_postfix = '';

            if (global.outputRootDir == "" || util.pathIsRelative(global.outputRootDir)) {
                  /* Get path to current directory. */
                  global.outputRootDir = util.parseNewOutputDir(engine.lightFileNames[0], global.outputRootDir);
                  console.writeln("CreateChannelImages, set global.outputRootDir ", global.outputRootDir);
            }

            util.ensureDir(global.outputRootDir);
            util.ensureDir(util.combinePath(global.outputRootDir, global.AutoOutputDir));
            util.ensureDir(util.combinePath(global.outputRootDir, global.AutoProcessedDir));

            if (global.get_flowchart_data) {
                  // Filter files for global.get_flowchart_data.
                  engine.lightFileNames = flowchartFilterFiles(engine.lightFileNames, global.pages.LIGHTS);
            }

            if (!par.image_weight_testing.val && par.early_PSF_check.val) {
                  /* Remove bad files. */
                  engine.lightFileNames = filterBadPSFImages(engine.lightFileNames);
                  if (!par.fast_mode && !global.get_flowchart_data) {
                        // We did filtering for real data set, save the list
                        global.lightFileNames = engine.lightFileNames;
                  }
                  if (engine.lightFileNames.length == 0) {
                        util.addCriticalStatus("No files to process after filtering bad PSF images");
                        return retval.ERROR;
                  }
            }

            var filtered_lights = engine.getFilterFiles(engine.lightFileNames, global.pages.LIGHTS, '');
            if (!par.image_weight_testing.val
                && !par.debayer_only.val
                && !par.binning_only.val
                && !par.extract_channels_only.val
                && !par.integrate_only.val
                && !par.calibrate_only.val)
            {
                  if (filtered_lights.error_text != "") {
                        util.throwFatalError(filtered_lights.error_text);
                  }
                  if (isCustomMapping(filtered_lights.narrowband)) {
                        // Do a check round in custom mapping to verify that all needed
                        // channels have files.
                        // We exit with fatal error if some files are missing
                        global.write_processing_log_file = false;
                        customMapping(null, filtered_lights);
                        global.write_processing_log_file = true;
                  }
            }

            if (par.extract_channels_only.val && par.extract_channel_mapping.val == 'None') {
                  util.throwFatalError("Extract channels only is selected but Extract channels option is " + par.extract_channel_mapping.val);
            }

            if (par.comet_align.val) {
                  if (engine.firstDateFileInfo == null || engine.lastDateFileInfo == null) {
                        util.throwFatalError("No first and last images for comet alignment. Maybe DATE-OBS is missing from image metadata.");
                  }
                  if (par.comet_first_xy.val == "" || par.comet_last_xy.val == "") {
                        util.throwFatalError("No first and last image coordinates for comet alignment.");
                  }
            }

            /********************************************************************
             * Calibrate
             *
             * Run image calibration if we have calibration frames.
             *********************************************************************/
            var calibrateInfo = calibrateEngine(filtered_lights);
            engine.lightFileNames = calibrateInfo[0];
            filename_postfix = filename_postfix + calibrateInfo[1];
            guiUpdatePreviewFilename(engine.lightFileNames[0]);

            if (par.calibrate_only.val) {
                  return(retval.INCOMPLETE);
            }

            if (filename_postfix != '') {
                  // We did run calibration, filter again with calibrated lights
                  var filtered_files = engine.getFilterFiles(engine.lightFileNames, global.pages.LIGHTS, filename_postfix);
            } else {
                  // Calibration was not run
                  var filtered_files = filtered_lights;
            }
            if (filtered_files.allfilesarr[channels.C].files.length == 0) {
                  is_color_files = false;
            } else {
                  is_color_files = true;
            }

            fileNames = engine.lightFileNames;

            if (par.start_from_imageintegration.val 
                || par.image_weight_testing.val
                || par.cropinfo_only.val) 
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
            if (par.binning.val > 0 && !skip_early_steps) {
                  if (is_color_files) {
                        util.addProcessingStep("No binning for color files");
                  } else {
                        var fileProcessedStatus = getFileProcessedStatus(fileNames, getBinningPostfix());
                        if (fileProcessedStatus.unprocessed.length == 0) {
                              var node = flowchartOperation("Binning");
                              fileNames = fileProcessedStatus.processed;
                              engine_end_process(node);     // Update procesing time
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
            util.runGarbageCollection();
            if (par.binning_only.val) {
                  console.writeln("Binning only, stop");
                  return retval.INCOMPLETE;
            }

            /********************************************************************
             * CosmeticCorrection
             * 
             * Run CosmeticCorrection for each file.
             * Output is *_cc.xisf files.
             ********************************************************************/
            if (par.skip_cosmeticcorrection.val) {
                  var do_cosmeticcorrection = false;
            } else if (skip_early_steps) {
                  var do_cosmeticcorrection = false;
            } else if (par.use_fastintegration.val && par.fastintegration_skip_cosmeticcorrection.val) {
                  var do_cosmeticcorrection = false;
            } else {
                  var do_cosmeticcorrection = true;
            }
            if (do_cosmeticcorrection) {
                  if (par.fix_column_defects.val || par.fix_row_defects.val) {
                        var ccFileNames = [];
                        var ccInfo = runLinearDefectDetection(fileNames);
                        for (var i = 0; i < ccInfo.length; i++) {
                              var fileProcessedStatus = getFileProcessedStatus(ccInfo[i].ccFileNames, '_cc');
                              if (fileProcessedStatus.unprocessed.length == 0) {
                                    var node = flowchartOperation("CosmeticCorrection");
                                    ccFileNames = ccFileNames.concat(fileProcessedStatus.processed);
                                    engine_end_process(node);     // Update procesing time
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
                              var node = flowchartOperation("CosmeticCorrection");
                              fileNames = fileProcessedStatus.processed;
                              engine_end_process(node);     // Update procesing time
                        } else {
                              let processedFileNames = runCosmeticCorrection(fileProcessedStatus.unprocessed, defects, is_color_files);
                              fileNames = processedFileNames.concat(fileProcessedStatus.processed);
                        }
                        guiUpdatePreviewFilename(fileNames[0]);
                  }
                  filename_postfix = filename_postfix + '_cc';
            }
            util.runGarbageCollection();

            /********************************************************************
             * Debayer
             * 
             * Debayer OSC/RAW images
             * Output is *_d.xisf files.
             ********************************************************************/
            if (is_color_files && par.debayer_pattern.val != 'None' && !skip_early_steps) {
                  /* After cosmetic correction we need to debayer
                   * OSC/RAW images
                   */
                  var fileProcessedStatus = getFileProcessedStatus(fileNames, '_d');
                  if (fileProcessedStatus.unprocessed.length == 0) {
                        var node = flowchartOperation("Debayer");
                        fileNames = fileProcessedStatus.processed;
                        engine_end_process(node);     // Update procesing time
                  } else {
                        let processedFileNames = debayerImages(fileProcessedStatus.unprocessed);
                        fileNames = processedFileNames.concat(fileProcessedStatus.processed);
                  }
                  filename_postfix = filename_postfix + '_d';
                  guiUpdatePreviewFilename(fileNames[0]);
            }
            util.runGarbageCollection();

            /********************************************************************
             * Banding reduction
             * 
             * Banding reduction for color/OSC/DSLR files.
             * Output is *_cb.xisf files.
             ********************************************************************/
            if (par.banding_reduction.val) {
                  var fileProcessedStatus = getFileProcessedStatus(fileNames, '_cb');
                  if (fileProcessedStatus.unprocessed.length == 0) {
                        var node = flowchartOperation("BandingReduction");
                        fileNames = fileProcessedStatus.processed;
                        engine_end_process(node);     // Update procesing time
                  } else {
                        let processedFileNames = bandingEngineForImages(fileProcessedStatus.unprocessed);
                        fileNames = processedFileNames.concat(fileProcessedStatus.processed);
                  }
                  filename_postfix = filename_postfix + '_cb';
                  guiUpdatePreviewFilename(fileNames[0]);
            }
            util.runGarbageCollection();

            if (is_color_files && par.debayer_only.val) {
                  return retval.INCOMPLETE;
            }

            /********************************************************************
             * Extract channels
             * 
             * Extract channels from color/OSC/DSLR files. As a result
             * we get a new file list with channel files.
             ********************************************************************/
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
            util.runGarbageCollection();
            if (par.extract_channels_only.val) {
                  return retval.INCOMPLETE;
            }

            /********************************************************************
             * GradientCorrection
             * 
             * Run GradientCorrection for each file.
             * Output is *_GC.xisf files.
             ********************************************************************/
            if (par.GC_on_lights.val && !skip_early_steps) {
                  let postfix = '_GC';
                  var fileProcessedStatus = getFileProcessedStatus(fileNames, postfix);

                  if (fileProcessedStatus.unprocessed.length == 0) {
                        var node = flowchartOperation(getGradientCorrectionName());
                        fileNames = fileProcessedStatus.processed;
                        engine_end_process(node);     // Update procesing time
                  } else {
                        let processedFileNames = runGradientCorrectionOnLights(fileProcessedStatus.unprocessed);
                        fileNames = processedFileNames.concat(fileProcessedStatus.processed);
                  }
                  filename_postfix = filename_postfix + postfix;
                  guiUpdatePreviewFilename(fileNames[0]);
            }

            /********************************************************************
             * SubframeSelector
             * 
             * Run SubframeSelector that assigns SSWEIGHT for each file.
             * Output is *_a.xisf files.
             ********************************************************************/
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
                        if (par.use_fastintegration.val && par.fastintegration_fast_subframeselector.val) {
                              // Cannot use previously processed files.
                              var fileProcessedStatus = { processed: [], unprocessed: fileNames };
                        } else {
                              var fileProcessedStatus = getFileProcessedStatus(fileNames, '_a');
                        }
                        if (fileProcessedStatus.unprocessed.length == 0) {
                              var node = flowchartOperation("SubframeSelector");
                              var names_and_weights = { filenames: fileProcessedStatus.processed, ssweights: [], postfix: '_a' };
                              engine_end_process(node);     // Update procesing time
                        } else {
                              var names_and_weights = runSubframeSelector(fileProcessedStatus.unprocessed);
                              names_and_weights.filenames = names_and_weights.filenames.concat(fileProcessedStatus.processed);
                        }
                  }
                  filename_postfix = filename_postfix + names_and_weights.postfix;
            } else {
                  var names_and_weights = { filenames: fileNames, ssweights: [], postfix: '' };
            }
            util.runGarbageCollection();

            /********************************************************************
             * Find file with best SSWEIGHT to be used
             * as a reference image in StarAlign.
             * Also possible file list filtering is done.
             ********************************************************************/
            var retarr = findBestSSWEIGHT(parent, names_and_weights, filename_postfix);
            if (par.use_processed_files.val && global.star_alignment_image != null) {
                  console.writeln("Switching best image to already used star alignment image " + global.star_alignment_image);
                  global.best_image = global.star_alignment_image;
            } else {
                  global.best_image = retarr[0];
            }
            fileNames = retarr[1];
            util.runGarbageCollection();

            if (gui && !global.get_flowchart_data) {
                  gui.setBestImageInTreeBox(parent, parent.treeBox[global.pages.LIGHTS], global.best_image, filename_postfix);
            }

            if (par.image_weight_testing.val) {
                  return retval.INCOMPLETE;
            }

            /********************************************************************
             * StarAlignment
             * 
             * Run StarAlignment for each file.
             * Output is *_r.xisf files.
             ********************************************************************/
            if (!par.start_from_imageintegration.val
                && !par.cropinfo_only.val
                && !par.comet_align.val
                && !par.use_fastintegration.val) 
            {
                  var fileProcessedStatus = getFileProcessedStatus(fileNames, '_r');
                  if (fileProcessedStatus.unprocessed.length == 0) {
                        var node = flowchartOperation("StarAlignment");
                        alignedFiles = fileProcessedStatus.processed;
                        engine_end_process(node);     // Update procesing time
                  } else {
                        let processedFileNames = runStarAlignment(fileProcessedStatus.unprocessed, global.best_image);
                        alignedFiles = processedFileNames.concat(fileProcessedStatus.processed);
                  }
                  filename_postfix = filename_postfix + '_r';
                  guiUpdatePreviewFilename(alignedFiles[0]);
            } else {
                  alignedFiles = fileNames;
            }
            util.runGarbageCollection();

            /********************************************************************
             * Remove stars from lights
             * 
             * Remove stars from light files.
             * Output is *_starless.xisf files.
             ********************************************************************/
            if (par.remove_stars_light.val
                && !par.start_from_imageintegration.val
                && !par.cropinfo_only.val)
            {
                  var fileProcessedStatus = getFileProcessedStatus(alignedFiles, '_starless');
                  if (fileProcessedStatus.unprocessed.length == 0) {
                        var node = flowchartOperation("Remove stars");
                        alignedFiles = fileProcessedStatus.processed;
                        engine_end_process(node);     // Update procesing time
                  } else {
                        let processedFileNames = removeStarsFromLights(fileProcessedStatus.unprocessed);
                        alignedFiles = processedFileNames.concat(fileProcessedStatus.processed);
                  }
                  filename_postfix = filename_postfix + '_starless';
                  guiUpdatePreviewFilename(alignedFiles[0]);
            }

            /********************************************************************
             * CometAlignment
             * 
             * Run CometAlignment for each file.
             * Output is *_ca.xisf files.
             ********************************************************************/
            if (!par.start_from_imageintegration.val
                && !par.cropinfo_only.val
                && par.comet_align.val) 
            {
                  alignedFiles = runCometAlignment(alignedFiles, filename_postfix);
                  filename_postfix = filename_postfix + '_ca';
                  guiUpdatePreviewFilename(alignedFiles[0]);
                  util.runGarbageCollection();
            }

            /********************************************************************
             *  Find files for each L, R, G, B, H, O and S channels, or color files.
             ********************************************************************/
            findLRGBchannels(parent, alignedFiles, filename_postfix);

            if (par.start_from_imageintegration.val || par.cropinfo_only.val) {
                  /* We start from *_r.xisf files that are normally in AutoOutput
                   * subdirectory. So in the global.outputRootDir we replace AutoOutput
                   * with . (dot). In normal setup this will put output files
                   * to a correct AutoProcessed subdirectory.
                   */
                  console.writeln("Option start_from_imageintegration or cropinfo_only selected, fix output directory");
                  console.writeln("Current global.outputRootDir " + global.outputRootDir);

                  global.outputRootDir = util.normalizePath(global.outputRootDir.replace("AutoOutput", "."));

                  console.writeln("Fixes global.outputRootDir " + global.outputRootDir);
            }
            if (par.cropinfo_only.val) {
                  return retval.INCOMPLETE;
            }

            /********************************************************************
             * ImageIntegration
             * 
             * Run ImageIntegration for each channel.
             * Output is Integration_*.xisf files.
             ********************************************************************/
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


                  flowchartParentBegin("Channels");
                  if (is_luminance_images) {
                        L_id = runImageIntegration(L_images, 'L', true);
                        // Make a copy of the luminance image so we do not
                        // change the original image. Original image may be
                        // needed in AutoContinue.
                        luminance_id = copyToMapIf(L_id);
                        CropImageIf(luminance_id);
                  }

                  if (!par.monochrome_image.val) {
                        R_id = runImageIntegration(R_images, 'R', true);
                        G_id = runImageIntegration(G_images, 'G', true);
                        B_id = runImageIntegration(B_images, 'B', true);
                        H_id = runImageIntegration(H_images, 'H', true);
                        S_id = runImageIntegration(S_images, 'S', true);
                        O_id = runImageIntegration(O_images, 'O', true);

                        util.windowShowif(R_id);
                        util.windowShowif(G_id);
                        util.windowShowif(B_id);
                        util.windowShowif(H_id);
                        util.windowShowif(S_id);
                        util.windowShowif(O_id);
                  }
                  flowchartParentEnd("Channels");

            } else {
                  /* We have color files. */
                  util.addProcessingStepAndStatusInfo("Processing as color files");
                  flowchartParentBegin("RGB");
                  RGB_color_id = runImageIntegration(C_images, 'RGB', true);
                  flowchartParentEnd("RGB");
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
      flowchartMaskBegin("New mask");

      var winCopy = util.copyWindowEx(imgWin, imgWin.mainView.id + "_tmp", true);

      /* Run HistogramTransform based on auto stretch because mask should be non-linear. */
      winCopy = runHistogramTransform(winCopy, null, is_color, 'mask').win;

      /* Create mask.
       */
      var maskWin = newMaskWindow(winCopy, imgWin.mainView.id + "_mask", true);

      util.closeOneWindow(winCopy);
      flowchartMaskEnd("New mask");

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
            util.closeOneWindowById(mask_win_id);
      }
      if (winIsValid(range_mask_win)) {
            /* We already have a mask. */
            util.addProcessingStep("Use existing mask " + range_mask_win.mainView.id);
            mask_win = range_mask_win;
      } else {
            var L_win;
            flowchartMaskBegin("New mask");
            if (L_id_for_mask != null) {
                  util.addProcessingStep("Using image " + L_id_for_mask + " for a mask");
                  L_win = util.copyWindowEx(ImageWindow.windowById(L_id_for_mask), ppar.win_prefix + "L_win_mask", true);
                  if (!stretched) {
                        L_win = runHistogramTransform(L_win, null, false, 'mask').win;
                  }
            } else if (preprocessed_images == global.start_images.L_RGB_HT) {
                  /* We have run HistogramTransformation. */
                  util.addProcessingStep("Using image " + L_HT_start_win.mainView.id + " for a mask");
                  L_win = util.copyWindow(L_HT_start_win, ppar.win_prefix + "L_win_mask");
            } else {
                  if (preprocessed_images == global.start_images.L_R_G_B_GC) {
                        /* We have gradient corrected from L. */
                        util.addProcessingStep("Using image " + L_GC_start_win.mainView.id + " for a mask");
                        L_win = ImageWindow.windowById(L_GC_start_win.mainView.id);
                  } else {
                        if (luminance_id) {
                              util.addProcessingStep("Using image " + luminance_id + " for a mask");
                              L_win = ImageWindow.windowById(luminance_id);
                        } else {
                              save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
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
            util.closeOneWindowById(L_win.mainView.id);
            flowchartMaskEnd("New mask");
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
            util.closeOneWindowById(mask_win_id);
      }

      if (winIsValid(range_mask_win)) {
            /* We already have a mask. */
            util.addProcessingStep("Use existing mask " + range_mask_win.mainView.id);
            mask_win = range_mask_win;
      } else {
            flowchartMaskBegin("New mask");
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
            util.closeOneWindowById(color_win_copy.mainView.id);
            flowchartMaskEnd("New mask");
      }
      console.writeln("ColorEnsureMask done");
}

function delinearizeImage(imgWin, txt)
{
      var median = imgWin.mainView.computeOrFetchProperty("Median");
      console.writeln("delinearizeImage, median " + median.at(0));
      runPixelMathSingleMappingEx(imgWin.mainView.id, txt != null ? txt : "delinearize", "mtf(" + median.at(0) + ", $T)", false, null, false, true);
      var median2 = imgWin.mainView.computeOrFetchProperty("Median");
      console.writeln("delinearizeImage, median after delinearize " + median2.at(0));
      return median;
}

function relinearizeImage(imgWin, median, txt)
{
      console.writeln("relinearizeImage, median " + median.at(0));
      runPixelMathSingleMappingEx(imgWin.mainView.id, txt != null ? txt : "relinearize", "mtf(" + (1 - median.at(0)) + ", $T)", false, null, false, true);
}

// Optionally smoothen background after stretch and before gradient correction
function smoothBackgroundBeforeGC(win, val_perc, linear_data)
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
            var adjust = getAdjustPoint(win, val_perc);
            var val = adjust.normalizedAdjustPoint;
            console.writeln("smoothBackgroundBeforeGC, value " + val);
      }
      if (delinearize) {
            util.add_test_image(win.mainView.id, "smoothBackgroundBeforeGC_before_delinearize", par.debug.val);
            /* Smoothing value is in scale 0..1 so use linear image for smoothing. */
            var median = delinearizeImage(win);
            util.add_test_image(win.mainView.id, "smoothBackgroundBeforeGC_after_delinearize", par.debug.val);
      }
      smoothBackground(win, val, 0.5);
      if (delinearize) {
            util.add_test_image(win.mainView.id, "smoothBackgroundBeforeGC_after_smoothing", par.debug.val);
            relinearizeImage(win, median);
            util.add_test_image(win.mainView.id, "smoothBackgroundBeforeGC_after_redelinearize", par.debug.val);
      }
}

/* Process L image
 *
 * optionally run GC on L image
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
            util.addProcessingStep("Start from image " + L_HT_start_win.mainView.id);
            L_processed_HT_win = util.copyWindow(L_HT_start_win, ppar.win_prefix + "Integration_L_HT");
            L_processed_HT_id = L_processed_HT_win.mainView.id;
      } else {
            if (preprocessed_images == global.start_images.L_R_G_B_GC) {
                  /* We have gradient corrected from L. */
                  util.addProcessingStep("Start from image " + L_processed_id);
                  let win = util.copyWindow(L_GC_start_win, ppar.win_prefix + "Integration_L_processed");
                  L_processed_id = win.mainView.id;
            } else {
                  var L_win = ImageWindow.windowById(luminance_id);
                  if (!RGBmapping.stretched) {
                        /* Optionally run GC on L
                        */
                        if (par.GC_before_channel_combination.val) {
                              // GC already done
                              L_processed_id = noGradientCorrectionCopyWin(L_win);
                        } else if (par.use_GC_on_L_RGB.val) {
                              // run GC
                              console.writeln("GC L");
                              if (par.smoothbackground.val > 0) {
                                    smoothBackgroundBeforeGC(L_win, par.smoothbackground.val, true);
                              }
                              L_processed_id = runGradientCorrection(L_win, false);
                        } else {
                              // no GC
                              L_processed_id = noGradientCorrectionCopyWin(L_win);
                        }
                  }
                  if (par.use_RGBNB_Mapping.val) {
                        flowchartParentBegin("RGB Narrowband mapping");
                        var mapped_L_GC_id = RGBNB_Channel_Mapping(L_processed_id, 'L', par.RGBNB_L_bandwidth.val, par.RGBNB_L_mapping.val, par.RGBNB_L_BoostFactor.val);
                        mapped_L_GC_id = util.windowRename(mapped_L_GC_id, util.replacePostfixOrAppend(L_processed_id, ["_processed"], "_NB_processed"));
                        util.closeOneWindowById(L_processed_id);
                        L_processed_id = mapped_L_GC_id;
                        flowchartParentEnd("RGB Narrowband mapping");
                  }
            }

            if (!RGBmapping.combined && !RGBmapping.channel_noise_reduction) {
                  if (checkNoiseReduction('L', 'channel')) {
                        /* Noise reduction for L. */
                        luminanceNoiseReduction(ImageWindow.windowById(L_processed_id), mask_win);
                  }
            }
            /* On L image run HistogramTransform to stretch image to non-linear
            */
            L_processed_HT_id = util.ensure_win_prefix(util.replacePostfixOrAppend(L_processed_id, ["_processed"], "_HT"));
            if (!RGBmapping.stretched) {
                  if (checkNoiseReduction('L', 'integrated')) {
                        luminanceNoiseReduction(ImageWindow.windowById(L_processed_id), mask_win);
                  }
                  if (!par.skip_sharpening.val) {
                        if (par.use_blurxterminator.val) {
                              runBlurXTerminator(ImageWindow.windowById(L_processed_id), false);
                        } else if (par.use_graxpert_deconvolution.val) {
                              runGraXpertDeconvolution(ImageWindow.windowById(L_processed_id));
                        }
                  }
                  if (checkNoiseReduction('L', 'processed')) {
                        luminanceNoiseReduction(ImageWindow.windowById(L_processed_id), mask_win);
                  }
                  if (par.remove_stars_before_stretch.val) {
                        removeStars(
                              ImageWindow.windowById(L_processed_id), 
                              true,
                              false,
                              null,
                              null,
                              par.unscreen_stars.val);
                        // use starless L image as mask
                        LRGBEnsureMask(L_processed_id);
                  }
                  if (par.bxt_correct_channels.val && par.use_blurxterminator.val) {
                        // Run BlurXTerminator on L channel
                        runBlurXTerminator(ImageWindow.windowById(L_processed_id), true);
                  }
                  if (save_processed_images) {
                        saveProcessedImage(L_processed_id, L_processed_id);
                  }
                  if (par.save_stretched_starless_channel_images.val) {
                        createStarlessChannelImages([L_processed_id]);
                  }
                  runHistogramTransform(
                              util.copyWindow(ImageWindow.windowById(L_processed_id), L_processed_HT_id), 
                              null,
                              false,
                              'L');
                  if (par.remove_stars_stretched.val) {
                        removeStars(
                              ImageWindow.windowById(L_processed_HT_id), 
                              false,
                              false,
                              null,
                              null,
                              par.unscreen_stars.val);
                        // use starless L image as mask
                        LRGBEnsureMaskEx(L_processed_HT_id, true);
                  }
            } else {
                  if (checkNoiseReduction('L', 'processed')) {
                        luminanceNoiseReduction(ImageWindow.windowById(L_processed_id), mask_win);
                  }
                  util.copyWindow(ImageWindow.windowById(L_processed_id), L_processed_HT_id);
            }

            L_processed_HT_win = ImageWindow.windowById(L_processed_HT_id);
      }
      if (par.use_GC_on_L_RGB_stretched.val) {
            console.writeln("GC L stretched");
            if (par.smoothbackground.val > 0) {
                  smoothBackgroundBeforeGC(L_processed_HT_win, par.smoothbackground.val, false);
            }
            runGradientCorrection(L_processed_HT_win, true);
      }
      if (checkNoiseReduction('L', 'nonlinear')) {
            runNoiseReduction(L_processed_HT_win, mask_win, false);
      }
}

function copyLinearFitReferenceImage(id)
{
      linear_fit_rerefence_id = util.ensure_win_prefix(id + "_linear_fit_reference");
      util.closeOneWindowById(linear_fit_rerefence_id);
      util.copyWindow(util.findWindow(id), linear_fit_rerefence_id);
      global.temporary_windows[global.temporary_windows.length] = linear_fit_rerefence_id;
}

/* Run linear fit in L, R, G and B images based on options set by user.
 */
function LinearFitLRGBchannels()
{
      var use_linear_fit = par.use_linear_fit.val;
      if (use_linear_fit == 'No linear fit') {
            util.addProcessingStep("No linear fit");
            return;
      }

      util.addProcessingStepAndStatusInfo("Linear fit LRGB channels");
      var node = flowchartOperation("LinearFit");
      if (global.get_flowchart_data) {
            return;
      }

      var linear_fit_luminance_id = null;

      switch (use_linear_fit) {
            case 'Min RGB':
                  var refimage = findReferenceImageForLinearFit([ red_id, green_id, blue_id ], 'Min');
                  break;
            case 'Max RGB':
                  var refimage = findReferenceImageForLinearFit([ red_id, green_id, blue_id ], 'Max');
                  break;
            case 'Min LRGB':
                  var refimage = findReferenceImageForLinearFit([ luminance_id, red_id, green_id, blue_id ], 'Min');
                  linear_fit_luminance_id = luminance_id;
                  break;
            case 'Auto':
            case 'Max LRGB':
                  var refimage = findReferenceImageForLinearFit([ luminance_id, red_id, green_id, blue_id ], 'Max');
                  linear_fit_luminance_id = luminance_id;
                  break;
            case 'Red':
                  var refimage = red_id;
                  break;
            case 'Green':
                  var refimage = green_id;
                  break;
            case 'Blue':
                  var refimage = blue_id;
                  break;
            case 'Luminance':
                  if (luminance_id == null) {
                        util.throwFatalError("No luminance image for linear fit");
                  }
                  var refimage = luminance_id;
                  linear_fit_luminance_id = luminance_id;
                  break;
            default:
                  util.throwFatalError("Unknown linear fit option " + use_linear_fit);
      }

      if (refimage == null) {
            util.throwFatalError("No reference image for linear fit using " + use_linear_fit);
      }

      util.addProcessingStep("Linear fit using " + refimage);
      copyLinearFitReferenceImage(refimage);

      linearFitArray(refimage, [ linear_fit_luminance_id, red_id, green_id, blue_id ], false);

      engine_end_process(node);
}

/* Combine R, G and B images into one RGB image.
 *
 * optionally reduce noise on each separate R, G and B images using a mask
 * run channel combination to create RGB image
 */
function CombineRGBimageEx(target_name, images)
{
      util.addProcessingStepAndStatusInfo("Combine RGB image");

      if (checkNoiseReduction('RGB', 'channel') && !process_narrowband) {
            util.addProcessingStep("Noise reduction on channel images");
            flowchartParentBegin("Channels");
            for (var i = 0; i < images.length; i++) {
                  flowchartChildBegin(findChannelFromName(images[i]));
                  channelNoiseReduction(images[i]);
                  flowchartChildEnd(findChannelFromName(images[i]));
            }
            flowchartParentEnd("Channels");
      }

      if (par.bxt_correct_channels.val && par.use_blurxterminator.val) {
            // Run BlurXTerminator on all channels
            flowchartParentBegin("Channels");
            for (var i = 0; i < images.length; i++) {
                  flowchartChildBegin(findChannelFromName(images[i]));
                  runBlurXTerminator(ImageWindow.windowById(images[i]), true);
                  flowchartChildEnd(findChannelFromName(images[i]));
            }
            flowchartParentEnd("Channels");
      }
      if (par.save_processed_channel_images.val) {
            // Save processed channel images before we combine them
            for (var i = 0; i < images.length; i++) {
                  saveProcessedImage(images[i], images[i]);
            }
      }
      if (par.save_stretched_starless_channel_images.val) {
            createStarlessChannelImages(images);
      }

      /* ChannelCombination
       */
      util.addProcessingStep("Channel combination using images " + images[0] + "," + images[1] + "," + images[2]);
      var node = flowchartOperation("ChannelCombination");

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
            if (global.get_flowchart_data) {
                  global.flowchartWindows[global.flowchartWindows.length] = win.mainView.id;
            } else {
                  util.fatalWindowNameFailed("Failed to create window with name " + rgb_name + ", window name is " + win.mainView.id);
            }
      }

      copySelectedFITSKeywords(model_win, win);
                  
      win.mainView.beginProcess(UndoFlag_NoSwapFile);
      P.executeOn(win.mainView);
      win.mainView.endProcess();

      printProcessValues(P);
      engine_end_process(node, win, "ChannelCombination");

      setAutoIntegrateFilters(win.mainView.id, images);

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
      RGB_win = CombineRGBimageEx("Integration_RGB_combined", [red_id, green_id, blue_id]);

      RGB_win_id = RGB_win.mainView.id;
      util.addScriptWindow(RGB_win_id);
      RGB_win.show();

      return RGB_win;
}

function extractRGBchannel(RGB_id, channel, from_lights)
{
      util.addProcessingStepAndStatusInfo("Extract " + channel + " from " + RGB_id);
      if (!from_lights) {
            var node = flowchartOperation("ChannelExtraction " + channel);
      } else {
            var node = null;
      }

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

      engine_end_process(node, targetWindow, "ChannelExtraction " + channel, false);

      return targetWindow.mainView.id;
}

/* Map narrowband channels to RGB image. We try to remove continuum from
 * narrowband image before mapping.
 */
function RGBNB_Channel_Mapping(RGB_id, channel, channel_bandwidth, mapping, BoostFactor)
{
      console.writeln("RGBNB channel " + channel + " mapping " + RGB_id);
      flowchartChildBegin(channel);

      if (channel == 'L') {
            var L_win_copy = util.copyWindow(util.findWindow(RGB_id), util.ensure_win_prefix(RGB_id + "_RGBNBcopy"));
            var channelId = L_win_copy.mainView.id;
      } else {
            var channelId = extractRGBchannel(RGB_id, channel);
      }

      switch (mapping) {
            case 'H':
                  var NB_id = H_id;
                  var NB_bandwidth = par.RGBNB_H_bandwidth.val;
                  break;
            case 'S':
                  var NB_id = S_id;
                  var NB_bandwidth = par.RGBNB_S_bandwidth.val;
                  break;
            case 'O':
                  var NB_bandwidth = par.RGBNB_O_bandwidth.val;
                  var NB_id = O_id;
                  break;
            case '':
                  console.writeln("RGBNB, no mapping for channel " + channel);
                  flowchartChildEnd(channel);
                  return channelId;
            default:
                  util.throwFatalError("Invalid NB mapping " + mapping);
      }
      if (NB_id == null) {
            util.throwFatalError("Could not find " + mapping + " image for mapping to " + channel);
      }

      flowchartParentBegin("Mapping");
      flowchartChildBegin(mapping);

      var NB_images = [ NB_id ];

      copyToMapImages(NB_images);
      NB_id = NB_images[0];

      CropImageIf(NB_id);

      if (par.RGBNB_gradient_correction.val) {
            if (par.smoothbackground.val > 0) {
                  smoothBackgroundBeforeGC(util.findWindow(NB_id), par.smoothbackground.val, true);
            }
            NB_id = runGradientCorrection(util.findWindow(NB_id), true);
      }
      if (par.RGBNB_linear_fit.val) {
            var node = flowchartOperation("LinearFit");
            runLinearFit(channelId, NB_id);
            engine_end_process(node);
      }
      if (par.use_starxterminator.val || par.use_starnet2.val) {
            // removeStars(util.findWindow(NB_id), true, false, null, null, false);
      }

      flowchartChildEnd(mapping);
      flowchartParentEnd("Mapping");

      if (par.RGBNB_use_RGB_image.val) {
            var sourceChannelId = RGB_id;
            channel_bandwidth = par.RGBNB_R_bandwidth.val;
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
                              "RGBNB:enhanced",
                              "((" + NB_id + " * " + channel_bandwidth + ") - " + 
                              "("+ sourceChannelId + " * " + NB_bandwidth + "))" +
                              " / (" + channel_bandwidth + " - " +  NB_bandwidth + ")");
      mappedChannelId = util.windowRename(mappedChannelId, ppar.win_prefix + "Integration_" + channel + "_NB_enhanced");
      util.findWindow(mappedChannelId).show();
      
      console.writeln("RGBNB_Channel_Mapping, runPixelMathSingleMapping " + mappedChannelId);
      var mappedChannelId2 = runPixelMathSingleMapping(
                              mappedChannelId,
                              "RGBNB:combine",
                              channelId + " + ((" + mappedChannelId + " - Med(" + mappedChannelId + ")) * " + 
                              BoostFactor + ")");
      mappedChannelId2 = util.windowRename(mappedChannelId2, ppar.win_prefix + "Integration_" + channel + "_NB_combine");
      util.findWindow(mappedChannelId2).show();
      
      if (par.RGBNB_linear_fit.val) {
            var node = flowchartOperation("LinearFit");
            runLinearFit(mappedChannelId2, mappedChannelId);
            engine_end_process(node);
      }

      console.writeln("RGBNB_Channel_Mapping, runPixelMathSingleMapping " + mappedChannelId2);
      var mappedChannelId3 = runPixelMathSingleMapping(
                                    mappedChannelId2,
                                    "RGBNB:max",
                                    "max(" + mappedChannelId + ", " + mappedChannelId2 + ")");

      util.closeOneWindowById(channelId);
      util.closeOneWindowById(NB_id);

      iconized_debug_image_ids.push(mappedChannelId);
      iconized_debug_image_ids.push(mappedChannelId2);

      flowchartChildEnd(channel);
      util.findWindow(mappedChannelId3).show();

      return mappedChannelId3;
}

function doRGBNBmapping(RGB_id)
{
      util.addProcessingStepAndStatusInfo("Create mapped channel images from " + RGB_id);
      flowchartParentBegin("RGB Narrowband mapping");
      var R_mapped = RGBNB_Channel_Mapping(RGB_id, 'R', par.RGBNB_R_bandwidth.val, par.RGBNB_R_mapping.val, par.RGBNB_R_BoostFactor.val);
      var G_mapped = RGBNB_Channel_Mapping(RGB_id, 'G', par.RGBNB_G_bandwidth.val, par.RGBNB_G_mapping.val, par.RGBNB_G_BoostFactor.val);
      var B_mapped = RGBNB_Channel_Mapping(RGB_id, 'B', par.RGBNB_B_bandwidth.val, par.RGBNB_B_mapping.val, par.RGBNB_B_BoostFactor.val);
      flowchartParentEnd("RGB Narrowband mapping");

      R_mapped = util.windowRename(R_mapped, ppar.win_prefix + "Integration_R_NB");
      G_mapped = util.windowRename(G_mapped, ppar.win_prefix + "Integration_G_NB");
      B_mapped = util.windowRename(B_mapped, ppar.win_prefix + "Integration_B_NB");

      /* Combine RGB image from mapped channel images. */
      util.addProcessingStep("Combine mapped channel images to an RGB image");
      var RGB_mapped_id = runPixelMathRGBMapping(
                              util.replacePostfixOrAppend(RGB_id, ["_processed"], "_NB_processed"),
                              util.findWindow(RGB_id),
                              R_mapped,
                              G_mapped,
                              B_mapped);

      iconized_debug_image_ids.push(R_mapped);
      iconized_debug_image_ids.push(G_mapped);
      iconized_debug_image_ids.push(B_mapped);
      util.closeOneWindowById(RGB_id);

      return RGB_mapped_id;
}

function testRGBNBmapping()
{
      var test_RGB_color_id = null;

      engine.flowchartReset();
      flowchartInit();

      console.beginLog();

      util.addProcessingStep("Test narrowband mapping to RGB");

      findIntegratedChannelAndRGBImages(false);

      if (RGB_color_id == null) {
            // Try to create color image from channel images
            console.writeln("TestRGBNBmapping, create color image from channel images");
            if (R_id != null && G_id != null && B_id != null) {
                  var images = [R_id, G_id, B_id];
                  copyToMapImages(images);
                  linearFitArray(images[0], images);
                  if (par.use_GC_on_L_RGB.val) {
                        for (var i = 0; i < images.length; i++) {
                              if (par.smoothbackground.val > 0) {
                                    smoothBackgroundBeforeGC(util.findWindow(images[i]), par.smoothbackground.val, true);
                              }
                              images[i] = runGradientCorrection(util.findWindow(images[i]), true);
                        }
                  }
                  var color_win = CombineRGBimageEx(util.ensure_win_prefix("RGBNB_RGB_original"), images);
                  color_win.show();
                  var test_RGB_color_id = color_win.mainView.id;
                  if (par.use_background_neutralization.val) {
                        runBackgroundNeutralization(color_win);
                  }
                  runColorCalibration(color_win, 'linear');
            } else {
                  util.throwFatalError("Could not find or create RGB image");
            }
      } else {
            console.writeln("TestRGBNBmapping, use existing color image " + RGB_color_id);
            var images = [];
            var test_RGB_color_id = RGB_color_id;
            var color_win = util.findWindow(test_RGB_color_id);
      }

      checkWinFilePath(color_win);

      var test_win = util.copyWindow(color_win, util.ensure_win_prefix("RGBNB_RGB_mapped"));

      doRGBNBmapping(test_win.mainView.id);

      util.closeWindowsFromArray(images);

      util.addProcessingStep("Narrowband mapping to RGB processing completed");
      engine.writeProcessingStepsAndEndLog(null, true, ppar.win_prefix + "AutoRGBNB");

      flowchartDone();
}

function RGBHaFindLinearFitReferenceImage(RGB_id)
{
      if (linear_fit_rerefence_id != null) {
            return linear_fit_rerefence_id;
      } else {
            var id = extractRGBchannel(RGB_id, 'R');
            global.temporary_windows[global.temporary_windows.length] = id;
      }     return id;
}

function RGBHaPrepareHa(rgb_is_linear, testmode)
{
      var nb_channel_id = H_id;
      if (nb_channel_id == null) {
            util.throwFatalError("Could not find Ha image for mapping to R");
      }
      console.writeln("RGBHaPrepareHa, Ha image " + nb_channel_id);

      /* Make a copy of narrowband image so we do not change the original image.
       */
      console.writeln("RGBHaPrepareHa, copy to map images");
      var mapimages = [ nb_channel_id ];
      copyToMapImages(mapimages);
      nb_channel_id = mapimages[0];
      util.add_test_image(nb_channel_id, "nb_channel_id_init", testmode);

      /* Optionally crop narrowband image.
       * Normally this should be already done.
       */
      if (par.crop_to_common_area.val) {
            console.writeln("RGBHaPrepareHa, crop image " + nb_channel_id);
            CropImageIf(nb_channel_id);
      }

      /* Optionally smoothen background. In extreme cases coulod be useful for example when using ABE.
       */
      if (par.RGBHa_smoothen_background.val) {
            console.writeln("RGBHaPrepareHa, smoothen background on " + nb_channel_id);
            smoothBackgroundBeforeGC(util.findWindow(nb_channel_id), par.RGBHa_smoothen_background_value.val, rgb_is_linear);
            util.add_test_image(nb_channel_id, "nb_channel_id_crop", testmode);
      }

      /* Optionally remove gradients.
       */
      if (par.RGBHa_gradient_correction.val) {
            if (!par.GC_on_lights.val) {
                  console.writeln("RGBHaPrepareHa, gradient correction on " + nb_channel_id);
                  nb_channel_id = runGradientCorrection(util.findWindow(nb_channel_id), true);
                  util.add_test_image(nb_channel_id, "nb_channel_id_gc", testmode);
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
            var win = runHistogramTransform(util.findWindow(nb_channel_id), null, false, 'RGB').win;
            nb_channel_id = win.mainView.id;
            util.add_test_image(nb_channel_id, "nb_channel_id_stretched", testmode);
      }     

      return nb_channel_id;
}

function RGBHa_max_Ha(RGB_id, nb_channel_id)
{
      var testmode = par.debug.val;

      util.addProcessingStepAndStatusInfo("RGBHa max(Ha, R) channel on image " + RGB_id + " using using boost factor " + par.RGBHa_Combine_BoostFactor.val);

      flowchartParentBegin("RGBHa_max_Ha");
      flowchartChildBegin("RGBHa max");

      console.writeln("RGBHa_max_Ha, create boosted Ha");
      var H_boost = runPixelMathSingleMapping(
                        nb_channel_id,
                        "RGBHa:H boost",
                        nb_channel_id + " * " + par.RGBHa_Combine_BoostFactor.val);
      H_boost = util.windowRename(H_boost, nb_channel_id + "_boosted");
      util.findWindow(H_boost).show();
      util.add_test_image(H_boost, "RGBHa_max_Ha_boosted", testmode);

      // This formula is from VisibleDark YouTube channel
      console.writeln("RGBHa_max_Ha, runPixelMathRGBMapping");
      runPixelMathRGBMapping(
            null, 
            util.findWindow(RGB_id), 
            "max($T[0], " + H_boost + ")",
            "$T[1]", 
            "iif($T[0]<"+ H_boost + ",$T[2]+0.05*" + H_boost + ",$T[2])");

      util.closeOneWindowById(nb_channel_id);
      util.closeOneWindowById(H_boost);

      flowchartChildEnd("RGBHa max");
      flowchartParentEnd("RGBHa_max_Ha");
}

function RGBHa_screen_Ha(RGB_id, nb_channel_id)
{
      var testmode = par.debug.val;

      util.addProcessingStepAndStatusInfo("RGBHa screen(Ha, R) channel on image " + RGB_id + " using using boost factor " + par.RGBHa_Combine_BoostFactor.val);

      flowchartParentBegin("RGBHa_screen_Ha");
      flowchartChildBegin("RGBHa max");

      console.writeln("RGBHa_screen_Ha, create boosted Ha");
      var H_boost = runPixelMathSingleMapping(
                        nb_channel_id,
                        "RGBHa:H boost",
                        nb_channel_id + " * " + par.RGBHa_Combine_BoostFactor.val);
      H_boost = util.windowRename(H_boost, nb_channel_id + "_boosted");
      util.findWindow(H_boost).show();
      util.add_test_image(H_boost, "RGBHa_screen_Ha_boosted", testmode);

      // This formula is from VisibleDark YouTube channel
      console.writeln("RGBHa_screen_Ha, runPixelMathRGBMapping");
      runPixelMathRGBMapping(
            null, 
            util.findWindow(RGB_id), 
            "combine($T[0], " + H_boost + ", op_screen())",
            "$T[1]", 
            "iif($T[0]<"+ H_boost + ",$T[2]+0.05*" + H_boost + ",$T[2])");

      util.closeOneWindowById(nb_channel_id);
      util.closeOneWindowById(H_boost);

      flowchartChildEnd("RGBHa max");
      flowchartParentEnd("RGBHa_screen_Ha");
}

function create_HRR(nb_channel_id, rgb_channel_id)
{
      var P = new ChannelCombination;
      P.colorSpace = ChannelCombination.prototype.RGB;
      P.channels = [ // enabled, id
            [true, nb_channel_id],
            [true, rgb_channel_id],
            [true, rgb_channel_id]
      ];

      P.executeGlobal();
      printProcessValues(P);
      
      return ImageWindow.activeWindow;
}

function create_continuum_subtracted_image(hrr_win)
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
      P.newImageColorSpace = PixelMath.prototype.Gray;
      P.newImageSampleFormat = PixelMath.prototype.SameAsTarget;

      P.executeOn(hrr_win.mainView);
      printProcessValues(P);
}

function normalize_image(imgWin)
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
      P.newImageColorSpace = PixelMath.prototype.SameAsTarget;
      P.newImageSampleFormat = PixelMath.prototype.SameAsTarget;

      P.executeOn(imgWin.mainView);
      printProcessValues(P);
}

function convert_to_grayscale(imgWin)
{
      var P = new ConvertToGrayscale;

      P.executeOn(imgWin.mainView);
      printProcessValues(P);
}

function boost_Ha(imgWin, boost_factor)
{
      var P = new ExponentialTransformation;
      P.functionType = ExponentialTransformation.prototype.PIP;
      P.order = par.RGBHa_boost.val;
      P.sigma = 0.00;
      P.useLightnessMask = true;

      P.executeOn(imgWin.mainView);
      printProcessValues(P);
}

function HRR_stretch(imgWin, targetBackground)
{
      engine.runHistogramTransformSTFex(imgWin, null, false, targetBackground, false, true);
}

// Continuum Subtract for linear images
// Sort of support non-linear too bvut I guess result are no good
// For the meyhod is describe in website https://www.nightphotons.com/guides/advanced-narrowband-combination
// Some help and ideas also from ContinuumSubtraction.js script by Franklin Marek
function RGBHa_ContinuumSubtract(nb_channel_id, rgb_channel_id, rgb_is_linear, testmode)
{
      var nb_channel_win = util.findWindow(nb_channel_id);
      var rgb_channel_win = util.findWindow(rgb_channel_id);
      var nb_channel_nonlinear = util.getKeywordValue(nb_channel_win, "AutoIntegrateNonLinear");
      var rgb_channel_nonlinear = util.getKeywordValue(rgb_channel_win, "AutoIntegrateNonLinear");

      if (rgb_is_linear && nb_channel_nonlinear != null) {
            console.writeln("RGBHa_ContinuumSubtract, rgb_channel_nonlinear is " + rgb_channel_nonlinear + ", nb_channel_nonlinear is " + nb_channel_nonlinear);
            save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
            util.throwFatalError("RGBHa_ContinuumSubtract, no AutoIntegrateNonLinear keyword found for Ha channel");
      }
      if (rgb_is_linear && rgb_channel_nonlinear != null) {
            console.writeln("RGBHa_ContinuumSubtract, rgb_channel_nonlinear is " + rgb_channel_nonlinear + ", nb_channel_nonlinear is " + nb_channel_nonlinear);
            save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
            util.throwFatalError("RGBHa_ContinuumSubtract, RGB channel is linear but no AutoIntegrateNonLinear keyword found");
      }
      if ((nb_channel_nonlinear == null) != (rgb_channel_nonlinear == null)) {
            console.writeln("RGBHa_ContinuumSubtract, rgb_channel_nonlinear is " + rgb_channel_nonlinear + ", nb_channel_nonlinear is " + nb_channel_nonlinear);
            save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
            util.throwFatalError("RGBHa_ContinuumSubtract, Ha and RGB images are not in the same state");
      }

      /* Check for smoothing for RGB channel.
       * It is already checked for Ha channel.
       */
      if (par.RGBHa_smoothen_background.val) {
            if (par.smoothbackground.val == 0) {
                  console.writeln("RGBHa_ContinuumSubtract, smoothen background on " + rgb_channel_id);
                  smoothBackgroundBeforeGC(util.findWindow(rgb_channel_id), par.RGBHa_smoothen_background_value.val), rgb_is_linear;
            } else {
                  console.writeln("RGBHa_ContinuumSubtract, smoothen background on " + rgb_channel_id + " skipped because smoothbackground is " + par.smoothbackground.val);
            }
      }

      /* Check for gradient correction  for RGB channel.
       * It is already checked for Ha channel.
       */
      if (par.RGBHa_gradient_correction.val) {
            if (!par.GC_on_lights.val) {
                  console.writeln("RGBHa_ContinuumSubtract, gradient correction on " + rgb_channel_id);
                  rgb_channel_id = runGradientCorrection(rgb_channel_win, true);
                  util.add_test_image(rgb_channel_id, "rgb_channel_id_gc", testmode);
            } else {
                  // We have already done gradient correction on lights
                  console.writeln("RGBHa_ContinuumSubtract, gradient correction on " + rgb_channel_id + " skipped because GC_on_lights is enabled");
            }
      }

      /* Create HRR.
       */
      console.writeln("RGBHa_ContinuumSubtract, create HRR");
      var hrr_win = create_HRR(nb_channel_id, rgb_channel_id);

      var hrr_id = ppar.win_prefix + "Integration_HRR";
      hrr_win.mainView.id = hrr_id;
      if (!rgb_is_linear) {
            util.setFITSKeyword(hrr_win, "AutoIntegrateNonLinear", rgb_channel_nonlinear, "");
      }
      util.add_test_image(hrr_id, "Integration_HRR_uncalibrated", testmode);

      /* Do BackgroundNeutralization.
       */
      console.writeln("RGBHa_ContinuumSubtract, HRR, background neutralization on " + hrr_id);
      var roi = runBackgroundNeutralization(hrr_win);
      util.add_test_image(hrr_id, "Integration_HRR_bn", testmode);

      /* Do color calibration.
       */
      console.writeln("RGBHa_ContinuumSubtract, HRR, color calibration on " + hrr_id);
      runColorCalibrationProcess(hrr_win, roi);
      util.add_test_image(hrr_id, "Integration_HRR_cc", testmode);

      /* Now we have calibrated HRR image.
       */
      util.add_test_image(hrr_id, "Integration_HRR_calibrated", testmode);

      /* Optionally remove stars.
       */
      if (par.RGBHa_remove_stars.val && !RGBHa_H_enhanced_info.starless) {
            if (!par.use_starxterminator.val && !par.use_starnet2.val) {
                  save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
                  util.throwFatalError("RGBHa_remove_stars is set but neither StarNet nor StarXterminator is enabled");
            }
            console.writeln("RGBHa_ContinuumSubtract, remove stars on " + hrr_id);
            removeStars(hrr_win, true, false, null, null, false);
            util.add_test_image(hrr_id, "Integration_HRR_starless", testmode);
            RGBHa_H_enhanced_info.starless = true;
      }

      /* Do continuum subtraction.
       */
      var node = flowchartOperation("Pixelmath:RGBHa, HRR continuum subtract");
      console.writeln("RGBHa_ContinuumSubtract, continuum subtraction using PixelMath");
      var enhanced_channel_id = ppar.win_prefix + "Integration_H_NB_enhanced";

      create_continuum_subtracted_image(hrr_win);

      /* Convert to grayscale.
       */
      console.writeln("RGBHa_ContinuumSubtract, convert enhanced H image to grayscale" + enhanced_channel_id);
      convert_to_grayscale(hrr_win);

      var enhanced_channel_win = hrr_win;
      enhanced_channel_win.mainView.id = enhanced_channel_id;

      util.add_test_image(enhanced_channel_id, "Integration_H_NB_enhanced_linear", testmode);

      if (par.RGBHa_combine_time.val != 'SPCC linear') {
            /* Stretch image to make it non-linear.
             */
            if (rgb_is_linear) {
                  // Stretch image to make it non-linear
                  console.writeln("RGBHa_ContinuumSubtract, linked AutoSTF on " + enhanced_channel_id);
                  HRR_stretch(enhanced_channel_win, par.STF_targetBackground.val);
                  rgb_channel_nonlinear = "Auto STF";
                  rgb_is_linear = false;
                  util.setFITSKeyword(enhanced_channel_win, "AutoIntegrateNonLinear", rgb_channel_nonlinear, "");
                  util.add_test_image(enhanced_channel_id, "Integration_H_NB_enhanced_nonlinear", testmode);
            }

            /* Normalize image.
             */
            console.writeln("RGBHa_ContinuumSubtract, normalize image using PixelMath");
            normalize_image(enhanced_channel_win);

            // It is totally unclear to me why this needs to be done twice to get proper results???
            // When running on desktop it works with only one run.
            util.add_test_image(enhanced_channel_id, "Integration_H_NB_enhanced_normalized_1st", testmode);
            normalize_image(enhanced_channel_win);

            util.add_test_image(enhanced_channel_id, "Integration_H_NB_enhanced_normalized", testmode);

            /* Optionally do noise reduction.
             */
            if (par.RGBHa_noise_reduction.val) {
                  console.writeln("RGBHa_ContinuumSubtract, remove noise");
                  runNoiseReduction(enhanced_channel_win, null, true);
                  util.add_test_image(nb_channel_id, "Integration_H_NB_enhanced_denoise", testmode);
            }

            /* Optionally boost image.
             */
            if (par.RGBHa_boost.val > 0) {
                  console.writeln("RGBHa_ContinuumSubtract, boost image using value " + par.RGBHa_boost.val);
                  boost_Ha(enhanced_channel_win, par.RGBHa_boost.val);

                  util.add_test_image(enhanced_channel_id, "Integration_H_NB_enhanced_boostHa", testmode);
            }
      }

      engine_end_process(node);

      console.writeln("RGBHa_ContinuumSubtract, enhanced H image " + enhanced_channel_id);

      return enhanced_channel_id;
}

// Create Ha image in linear stage
// Subtract R channel from Ha
function RGBHa_init(RGB_id, rgb_is_linear, testmode)
{
      if (par.debug.val) {
            testmode = true;
      }

      var RGB_win = util.findWindow(RGB_id);
      var RGB_nonlinear = util.getKeywordValue(RGB_win, "AutoIntegrateNonLinear");

      if (rgb_is_linear && RGB_nonlinear != null) {
            save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
            util.throwFatalError("RGBHa_init, no AutoIntegrateNonLinear keyword found for RGB image");
      }

      RGBHa_H_enhanced_info.starless = false;
      RGBHa_H_enhanced_info.mapping_done = false;

      util.addProcessingStepAndStatusInfo("Run Ha mapping init using " + par.RGBHa_prepare_method.val);

      if (par.RGBHa_combine_time.val == 'SPCC linear') {
            if (!rgb_is_linear) {
                  save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
                  util.throwFatalError("RGBHa_combine_time is SPCC linear but RGB image is not linear");
            }
            if (!par.use_spcc.val) {
                  save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
                  util.throwFatalError("RGBHa_combine_time is SPCC linear but SPCC is not enabled");
            }
      }

      var node = null;
      flowchartParentBegin("RGBHa init");
      flowchartChildBegin("RGBHa prepare H");

      console.writeln("RGBHa_init, prepare Ha");
      var nb_channel_id = RGBHaPrepareHa(rgb_is_linear, testmode);

      console.writeln("RGBHa_init, " + par.RGBHa_prepare_method.val);

      switch (par.RGBHa_prepare_method.val) {
            case 'Continuum Subtract':
                  if (RGB_win.mainView.image.isColor) {
                        console.writeln("RGBHa_init, extract R channel from " + RGB_id);
                        var rgb_channel_id = extractRGBchannel(RGB_id, 'R');
                  } else {
                        console.writeln("RGBHa_init, use channel image " + RGB_id);
                        var rgb_channel_id = util.copyWindow(util.findWindow("Integration_R"), util.ensure_win_prefix("Integration_R_RGBHa")).mainView.id;
                  }
                  global.temporary_windows[global.temporary_windows.length] = rgb_channel_id;
                  util.add_test_image(rgb_channel_id, "rgb_channel_id_init", testmode);
            
                  var enhanced_channel_id = RGBHa_ContinuumSubtract(nb_channel_id, rgb_channel_id, rgb_is_linear, testmode);

                  var enhanced_channel_win = util.findWindow(enhanced_channel_id);

                  util.closeOneWindowById(nb_channel_id);
                  util.closeOneWindowById(rgb_channel_id);
                  break;

            default:
                  if (par.RGBHa_remove_stars.val && !RGBHa_H_enhanced_info.starless) {
                        if (!par.use_starxterminator.val && !par.use_starnet2.val) {
                              save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
                              util.throwFatalError("RGBHa_remove_stars is set but neither StarNet nor StarXterminator is enabled");
                        }
                        console.writeln("RGBHa_init, remove stars on " + nb_channel_id);
                        removeStars(util.findWindow(nb_channel_id), true, false, null, null, false);
                        util.add_test_image(nb_channel_id, "nb_channel_id_starless", testmode);
                        RGBHa_H_enhanced_info.starless = true;
                  }
                  var enhanced_channel_id = nb_channel_id;
                  var enhanced_channel_win = util.findWindow(enhanced_channel_id);
                  if (rgb_is_linear && par.RGBHa_combine_time.val != 'SPCC linear') {
                        enhanced_channel_win = runHistogramTransform(enhanced_channel_win, null, false, 'H').win;
                        enhanced_channel_id = enhanced_channel_win.mainView.id;
                  }
                  break;
      }

      console.writeln("RGBHa_init, created enhanced H image " + enhanced_channel_id);

      guiUpdatePreviewWin(enhanced_channel_win);
      enhanced_channel_win.show();

      iconized_image_ids.push(enhanced_channel_id);

      flowchartChildEnd("RGBHa prepare H");
      flowchartParentEnd("RGBHa init");

      engine_end_process(node);

      RGBHa_H_enhanced_info.nb_channel_id = enhanced_channel_id; // Set Ha for RGBHa_mapping

      if (par.RGBHa_combine_time.val == 'SPCC linear') {
            console.writeln("RGBHa_init, " + par.RGBHa_combine_time.val + ", do RGBHa_mapping");
            RGBHa_mapping(RGB_id);
      }
}

// Do the actual mapping using combined non-linear image
// unless 'SPCC linear' is selected
function RGBHa_mapping(RGB_id)
{
      if (RGBHa_H_enhanced_info.mapping_done) {
            return;
      }
      RGBHa_H_enhanced_info.mapping_done = true;

      var RGB_win = util.findWindow(RGB_id);
      var RGB_nonlinear = util.getKeywordValue(RGB_win, "AutoIntegrateNonLinear");

      var testmode = par.debug.val;
      var nb_channel_id = RGBHa_H_enhanced_info.nb_channel_id; // Ha

      var nb_channel_win = util.findWindow(nb_channel_id);
      var nb_channel_nonlinear = util.getKeywordValue(nb_channel_win, "AutoIntegrateNonLinear");

      if ((nb_channel_nonlinear == null) != (RGB_nonlinear == null) && !global.get_flowchart_data) {
            console.writeln("nb_channel_nonlinear " + nb_channel_nonlinear + ", RGB_nonlinear " + RGB_nonlinear); 
            save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
            util.throwFatalError("RGBHa_mapping, Ha and RGB images are not in the same linear/non-linear state");
      }
      if (par.RGBHa_combine_time.val == 'SPCC linear' && nb_channel_nonlinear != null && !global.get_flowchart_data) {
            save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
            util.throwFatalError("RGBHa_mapping, Ha image is not linear but RGBHa_combine_time is SPCC linear");
      }

      util.addProcessingStepAndStatusInfo("Run Ha mapping " + par.RGBHa_combine_method.val + " on R using " + nb_channel_id);
      
      flowchartParentBegin("RGBHa mapping");
      flowchartChildBegin("RGBHa combine");

      console.writeln("RGBHa_mapping, " + par.RGBHa_combine_method.val);

      util.add_test_image(RGB_id, "rgb_channel_id_before_mapping", testmode);

      switch (par.RGBHa_combine_method.val) {
            case 'Add':
                  console.writeln("RGBHa_mapping, runPixelMathRGBMapping");
                  runPixelMathRGBMapping(
                        null, 
                        util.findWindow(RGB_id), 
                        "$T * " + (1 - par.RGBHa_Add_BoostFactor.val) + " + " + nb_channel_id + " * " + par.RGBHa_Add_BoostFactor.val,
                        "$T", 
                        "$T");
                  break;

            case 'Bright structure add':
                  var R = par.RGBHa_Combine_BoostFactor.val;
                  var G = 0.0;
                  var B = 0.05 * par.RGBHa_Combine_BoostFactor.val;
                  var m = 0.999;

                  // This formula is from Night Photons web site
                  console.writeln("RGBHa_mapping, runPixelMathRGBMapping");
                  runPixelMathRGBMapping(
                        null, 
                        util.findWindow(RGB_id), 
                        "$T[0] * ~"+ R + " + "+ R + " * mtf(~" + m + ", (mtf(" + m + ", $T[0]) + mtf(" + m + ", " + nb_channel_id + ")))",
                        "$T[1] * ~"+ G + " + "+ G + " * mtf(~" + m + ", (mtf(" + m + ", $T[1]) + mtf(" + m + ", " + nb_channel_id + ")))", 
                        "$T[2] * ~"+ B + " + "+ B + " * mtf(~" + m + ", (mtf(" + m + ", $T[2]) + mtf(" + m + ", " + nb_channel_id + ")))");
                  break;

            case 'Max':
                  console.writeln("RGBHa_mapping, RGBHa_max_Ha");
                  RGBHa_max_Ha(RGB_id, nb_channel_id);
                  break;

            case 'Screen':
                  console.writeln("RGBHa_mapping, RGBHa_screen_Ha");
                  RGBHa_screen_Ha(RGB_id, nb_channel_id);
                  break;

            case 'Med subtract add':
                  console.writeln("RGBHa_mapping, runPixelMathRGBMapping");
                  runPixelMathRGBMapping(
                        null, 
                        util.findWindow(RGB_id), 
                        "$T[0] + " + par.RGBHa_Combine_BoostFactor.val + " * (" + nb_channel_id + " - Med(" + nb_channel_id + "))",
                        "$T[1]", 
                        "$T[2] + " + (par.RGBHa_Combine_BoostFactor.val * 0.2) + " * (" + nb_channel_id + " - Med(" + nb_channel_id + "))");
                  break;

            case 'None':
                  break;

            default:
                  util.throwFatalError("Invalid RGBHa method " + par.RGBHa_combine_method.val + " for RGBHa mapping");
      }

      if (par.RGBHa_combine_time.val == 'SPCC linear') {
            console.writeln("RGBHa_mapping, " + par.RGBHa_combine_time.val + ", do color calibration");
            runColorCalibration(util.findWindow(RGB_id), 'linear');
      }

      flowchartChildEnd("RGBHa add H");
      flowchartParentEnd("RGBHa mapping");
}

function testRGBHaMapping1(savelog)
{
      if (savelog) {
            console.beginLog();
      }

      util.addProcessingStep("Test Ha mapping to RGB");

      global.is_processing = global.processing_state.extra_processing;

      util.closeOneWindowById(ppar.win_prefix + "Integration_HRR");
      util.closeOneWindowById(ppar.win_prefix + "Integration_HRR_uncalibrated");
      util.closeOneWindowById(ppar.win_prefix + "Integration_HRR_calibrated");
      util.closeOneWindowById(ppar.win_prefix + "Integration_HRR_background");
      util.closeOneWindowById(ppar.win_prefix + "Integration_H_NB_enhanced");
      util.closeOneWindowById(ppar.win_prefix + "RGBHa_ContinuumSubtractTemp");
      util.closeOneWindowById(ppar.win_prefix + "IntegratiIntegration_HRR_starlessT_medT");
      util.closeOneWindowById(ppar.win_prefix + "Integration_H_NB_enhanced_linear");
      util.closeOneWindowById(ppar.win_prefix + "Integration_H_NB_enhanced_nonlinear");
      util.closeOneWindowById(ppar.win_prefix + "Integration_H_NB_enhanced_normalized");
      util.closeOneWindowById(ppar.win_prefix + "Integration_H_NB_enhanced_normalized_1st");
      util.closeOneWindowById(ppar.win_prefix + "Integration_H_NB_enhanced_boostHa");
      util.closeOneWindowById(ppar.win_prefix + "Integration_H_NB_enhanced_denoise");
      util.closeOneWindowById(ppar.win_prefix + "RGBHa_RGB_mapped");
      util.closeOneWindowById(ppar.win_prefix + "RGBHa_RGB_original_HT");
      util.closeOneWindowById(ppar.win_prefix + "Integration_H_NB_med");
      util.closeOneWindowById(ppar.win_prefix + "Integration_R_NB_med");
      util.closeOneWindowById(ppar.win_prefix + "Integration_R_RGBHa");
      util.closeOneWindowById(ppar.win_prefix + "nb_channel_id_prepared");
      util.closeOneWindowById(ppar.win_prefix + "nb_channel_id_starless");
      util.closeOneWindowById(ppar.win_prefix + "rgb_channel_id_gc");
      util.closeOneWindowById(ppar.win_prefix + "rgb_channel_id_stretched");
      util.closeOneWindowById(ppar.win_prefix + "nb_channel_id_init");
      util.closeOneWindowById(ppar.win_prefix + "nb_channel_id_crop");
      util.closeOneWindowById(ppar.win_prefix + "nb_channel_id_linearfit");
      util.closeOneWindowById(ppar.win_prefix + "nb_channel_id_gc");
      util.closeOneWindowById(ppar.win_prefix + "nb_channel_id_denoise");
      util.closeOneWindowById(ppar.win_prefix + "nb_channel_id_stretched");
      util.closeOneWindowById(ppar.win_prefix + "rgb_channel_id_init");
      util.closeOneWindowById(ppar.win_prefix + "Integration_HRR_bn");
      util.closeOneWindowById(ppar.win_prefix + "Integration_HRR_cc");
      util.closeOneWindowById(ppar.win_prefix + "Integration_HRR_stretched");
      util.closeOneWindowById(ppar.win_prefix + "RGBHa_max_Ha_boosted");
      util.closeOneWindowById(ppar.win_prefix + "RGBHa_screen_Ha_boosted");
      util.closeOneWindowById(ppar.win_prefix + "rgb_channel_id_gc");
      util.closeOneWindowById(ppar.win_prefix + "H_to_R_boost");
      util.closeOneWindowById(ppar.win_prefix + "H_to_B_boost");
      util.closeOneWindowById(ppar.win_prefix + "Integration_H_map");
      util.closeOneWindowById(ppar.win_prefix + "Integration_R_map");
      util.closeOneWindowById(ppar.win_prefix + "Integration_G_map");
      util.closeOneWindowById(ppar.win_prefix + "Integration_B_map");
      
      engine.flowchartReset();
      flowchartInit();

      findIntegratedChannelAndRGBImages(false);

      if (par.RGBHa_test_value.val == 'Continuum') {
            RGBHa_ContinuumSubtract(H_id, R_id, true, true);

      } else {
            if (par.use_spcc.val) {
                  initSPCCvalues();
            }
      
            if (par.crop_to_common_area.val) {
                  findCropInformationAutoContinue();
            }
            var color_win = util.findWindow(ppar.win_prefix + "RGBHa_RGB_original");

            if (R_id != null && G_id != null && B_id != null) {
                  var images = [R_id, G_id, B_id];
                  console.writeln("testRGBHaMapping, create _map images");
                  copyToMapImages(images);
                  if (par.crop_to_common_area.val) {
                        for (var i = 0; i < images.length; i++) {
                              CropImageIf(images[i]);
                        }
                  }
                  linear_fit_rerefence_id = images[0];
            }
            if (color_win == null) {
                  if (RGB_color_id == null) {
                        // Try to create color image from channel images
                        console.writeln("testRGBHaMapping, create color image from channel images");
                        if (R_id != null && G_id != null && B_id != null) {
                              console.writeln("testRGBHaMapping, create RGB image from " + images);
                              linearFitArray(linear_fit_rerefence_id, images);
                              if (par.use_GC_on_L_RGB.val) {
                                    for (var i = 0; i < images.length; i++) {
                                          if (par.smoothbackground.val > 0) {
                                                smoothBackgroundBeforeGC(util.findWindow(images[i]), par.smoothbackground.val, true);
                                          }
                                          images[i] = runGradientCorrection(util.findWindow(images[i]), true);
                                    }
                              }
                              color_win = CombineRGBimageEx(ppar.win_prefix + "RGBHa_RGB_original", images);
                              color_win.show();
                              if (par.use_background_neutralization.val) {
                                    runBackgroundNeutralization(color_win);
                              }
                              if (par.use_spcc.val) {
                                    runImageSolver(color_win.mainView.id);
                              }
                              runColorCalibration(color_win, 'linear');
                        } else {
                              util.throwFatalError("Could not find or create RGB image");
                        }
                  } else {
                        console.writeln("testRGBHaMapping, use existing color image " + RGB_color_id);
                        color_win = util.copyWindow(util.findWindow(RGB_color_id), ppar.win_prefix + "RGBHa_RGB_original");
                  }
            }

            checkWinFilePath(color_win);

            var color_win_HT = util.copyWindow(color_win, ppar.win_prefix + "RGBHa_RGB_original_HT");
            console.writeln("testRGBHaMapping, stretch image " + color_win_HT.mainView.id);
            color_win_HT = runHistogramTransform(color_win_HT, null, false, 'RGB').win;

            var test_win = util.copyWindow(color_win, ppar.win_prefix + "RGBHa_RGB_mapped");

            RGBHa_init(test_win.mainView.id, true, true);

            test_win = runHistogramTransform(test_win, null, false, 'RGB').win;
            
            RGBHa_mapping(test_win.mainView.id);

            util.closeWindowsFromArray(images);
      }

      util.addProcessingStep("Ha mapping to RGB processing completed");
      if (savelog) {
            engine.writeProcessingStepsAndEndLog(null, true, ppar.win_prefix + "AutoRGBHa");
      }

      for (var i = 0; i < iconized_image_ids.length; i++) {
            util.windowIconizeAndKeywordif(iconized_image_ids[i]);
      }
      for (var i = 0; i < global.test_image_ids.length; i++) {
            util.windowIconizeAndKeywordif(global.test_image_ids[i]);
      }
      
      flowchartDone();

      global.is_processing = global.processing_state.none;

      console.noteln("Testing completed");
}

function testRGBHaMapping()
{
      if (par.RGBHa_test_value.val == 'All mappings') {
            console.beginLog();
            for (var i = 0; i < gui.RGBHa_prepare_method_values.length; i++) {
                  par.RGBHa_prepare_method.val = gui.RGBHa_prepare_method_values[i];
                  for (var j = 0; j < gui.RGBHa_combine_method_values.length; j++) {
                        par.RGBHa_combine_method.val = gui.RGBHa_combine_method_values[j];
                        console.noteln("Testing RGBHa mapping with prepare method " + par.RGBHa_prepare_method.val + " and combine method " + par.RGBHa_combine_method.val);
                        // Run test
                        testRGBHaMapping1(false);
                        // Rename final result based on methods
                        var test_win = util.findWindow(ppar.win_prefix + "RGBHa_RGB_mapped");
                        test_win.mainView.id = ppar.win_prefix + "RGBHa_RGB_mapped_" + util.mapBadWindowNameChars(par.RGBHa_prepare_method.val) + "_" + util.mapBadWindowNameChars(par.RGBHa_combine_method.val);
                        checkCancel();
                  }
            }
            engine.writeProcessingStepsAndEndLog(null, true, ppar.win_prefix + "AutoRGBHa_AllMappings");
      } else {
            testRGBHaMapping1(true);
      }
}

function extraHaMapping(extraWin)
{
      H_id = findIntegratedChannelImage("H", true, null);
      if (H_id == null) {
            save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
            util.throwFatalError("Could not find integrated H image");
      }

      RGBHa_init(extraWin.mainView.id, false, false);
      RGBHa_mapping(extraWin.mainView.id);
      if (!par.debug.val) {
            for (var i = 0; i < iconized_image_ids.length; i++) {
                  util.closeOneWindowById(iconized_image_ids[i]);
            }
      }
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
function ProcessRGBimage(RGBmapping)
{
      util.addProcessingStepAndStatusInfo("Process RGB image, RGB stretched is " + RGBmapping.stretched);

      var RGB_processed_HT_id;

      if (preprocessed_images == global.start_images.L_RGB_HT ||
            preprocessed_images == global.start_images.RGB_HT) 
      {
            /* We already have run HistogramTransformation. */
            util.addProcessingStep("Start from image " + RGB_HT_start_win.mainView.id);
            let win = util.copyWindow(RGB_HT_start_win, ppar.win_prefix + "Integration_RGB_HT");
            RGB_processed_HT_id = win.mainView.id;
            if (preprocessed_images == global.start_images.RGB_HT) {
                  ColorEnsureMask(RGB_processed_HT_id, true, false);
            }
            RGBmapping.stretched = true;
      } else {
            var gc_done;
            if (preprocessed_images == global.start_images.RGB_GC) {
                  /* We have gradient corrected integrated image. */
                  util.addProcessingStep("Start from image " + RGB_GC_start_win.mainView.id);
                  let win = util.copyWindow(RGB_GC_start_win, ppar.win_prefix + "Integration_RGB_processed");
                  RGB_processed_id = win.mainView.id;
                  if (par.solve_image.val || par.use_spcc.val) {
                        runImageSolver(RGB_processed_id);
                  }
                  gc_done = false;
            } else {
                  if (preprocessed_images == global.start_images.RGB) {
                        // start from integrated RGB image
                        util.addProcessingStep("Start from image " + RGB_color_id);
                        RGB_win = util.copyWindow(util.findWindow(RGB_color_id), ppar.win_prefix + "Integration_RGB_map");
                  }
                  if (checkNoiseReduction(is_color_files ? 'color' : 'RGB', 'integrated')) {
                        runNoiseReduction(RGB_win, mask_win, !RGBmapping.stretched);
                  }
                  if (par.bxt_correct_only_before_cc.val && par.use_blurxterminator.val) {
                        runBlurXTerminator(RGB_win, true);
                  }
                  if (par.solve_image.val || par.use_spcc.val) {
                        runImageSolver(RGB_win.mainView.id);
                  }
                  if (par.use_GC_on_L_RGB.val
                      || (is_color_files && par.GC_before_channel_combination.val && !par.use_GC_on_L_RGB_stretched.val)) 
                  {
                        console.writeln("GC RGB");
                        if (par.smoothbackground.val > 0) {
                              smoothBackgroundBeforeGC(RGB_win, par.smoothbackground.val, true);
                        }
                        RGB_processed_id = runGradientCorrection(RGB_win, false);
                  } else {
                        console.writeln("No GC for RGB");
                        RGB_processed_id = noGradientCorrectionCopyWin(RGB_win);
                  }
                  gc_done = true;
            }

            if (par.use_background_neutralization.val && !par.use_spcc.val) {
                  /* Without SPCC, run background neutralization before CC. */
                  runBackgroundNeutralization(ImageWindow.windowById(RGB_processed_id));
            }
            if (!gc_done && par.bxt_correct_only_before_cc.val && par.use_blurxterminator.val) {
                  runBlurXTerminator(RGB_win, true);
            }
            /* Color calibration on RGB
            */
            runColorCalibration(ImageWindow.windowById(RGB_processed_id), 'linear');
            if (par.use_background_neutralization.val && par.use_spcc.val) {
                  /* With SPCC, run background neutralization after CC. */
                  runBackgroundNeutralization(ImageWindow.windowById(RGB_processed_id));
            }

            if (par.use_RGBNB_Mapping.val) {
                  /* Do RGBNB mapping on combined and color calibrated RGB image. */
                  RGB_processed_id = doRGBNBmapping(RGB_processed_id);
            }

            if (is_color_files || !is_luminance_images) {
                  /* Color or narrowband or RGB. */
                  ColorEnsureMask(RGB_processed_id, RGBmapping.stretched, false);
            }
            if (process_narrowband && par.linear_increase_saturation.val > 0) {
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
                        increaseSaturation(ImageWindow.windowById(RGB_processed_id), mask_win);
                  }
            }

            if (!RGBmapping.stretched) {
                  if (!par.skip_sharpening.val) {
                        if (par.use_blurxterminator.val) {
                              runBlurXTerminator(ImageWindow.windowById(RGB_processed_id), false);
                        } else if (par.use_graxpert_deconvolution.val) {
                              runGraXpertDeconvolution(ImageWindow.windowById(RGB_processed_id));
                        }
                  }
                  /* Check noise reduction only after BlurXTerminator. */
                  if (checkNoiseReduction(is_color_files ? 'color' : 'RGB', 'processed')) {
                        runNoiseReduction(ImageWindow.windowById(RGB_processed_id), mask_win, !RGBmapping.stretched);
                  }
                  if (par.use_RGBHa_Mapping.val) {
                        /* Initialize RGBHa mapping using combined and color calibrated linear RGB image. */
                        RGBHa_init(RGB_processed_id, true, false);
                  }
      
                  if (par.remove_stars_before_stretch.val) {
                        RGB_stars_win = removeStars(util.findWindow(RGB_processed_id), true, true, null, null, par.unscreen_stars.val);
                        if (RGB_stars_win != null) {
                              util.windowRename(RGB_stars_win.mainView.id, ppar.win_prefix + "Integration_RGB_stars");
                        }
                        if (!is_luminance_images) {
                              // use starless RGB image as mask
                              ColorEnsureMask(RGB_processed_id, false, true);
                        }
                  }

                  if (save_processed_images) {
                        saveProcessedImage(RGB_processed_id, RGB_processed_id);
                  }
                  if (par.save_stretched_starless_channel_images.val && is_color_files) {
                        extractChannelsAndSaveStarlessImages(RGB_processed_id);
                  }
            
                  /* On RGB image run HistogramTransform to stretch image to non-linear
                  */
                  RGB_processed_HT_id = util.ensure_win_prefix(util.replacePostfixOrAppend(RGB_processed_id, ["_processed"], "_HT"));
                  var stf = runHistogramTransform(
                              util.copyWindow(
                                    ImageWindow.windowById(RGB_processed_id), 
                                    RGB_processed_HT_id), 
                              null,
                              true,
                              'RGB');
                  RGBmapping.stretched = true;

                  if (par.remove_stars_stretched.val) {
                        RGB_stars_HT_win = removeStars(util.findWindow(RGB_processed_HT_id), false, true, null, null, par.unscreen_stars.val);
                        if (!is_luminance_images) {
                              // use starless RGB image as mask
                              ColorEnsureMask(RGB_processed_HT_id, true, true);
                        }
                  }
            } else {
                  /* Image is not really linear any more but anyway check for noise reduction. */
                  if (checkNoiseReduction(is_color_files ? 'color' : 'RGB', 'processed')) {
                        runNoiseReduction(ImageWindow.windowById(RGB_processed_id), mask_win, !RGBmapping.stretched);
                  }
                  RGB_processed_HT_id = RGB_processed_id;
                 
            }
      }
      if (par.use_GC_on_L_RGB_stretched.val) {
            if (par.smoothbackground.val > 0) {
                  smoothBackgroundBeforeGC(util.findWindow(RGB_processed_HT_id), par.smoothbackground.val, false);
            }
            runGradientCorrection(util.findWindow(RGB_processed_HT_id), true);
      }
      /* If we have non-stretched stars image stretch it.
       */
      if (RGB_stars_win != null)  {
            let stars_id = util.ensure_win_prefix(RGB_processed_HT_id + "_stars");
            runHistogramTransform(
                  util.copyWindow(RGB_stars_win, stars_id), 
                  stf,
                  true,
                  'stars');
            RGB_stars_HT_win = util.findWindow(stars_id);
      } else if (RGB_stars_HT_win != null)  {
            RGB_stars_HT_win.mainView.id =  RGB_processed_HT_id + "_stars";
      }

      if (process_narrowband && par.non_linear_increase_saturation.val > 0) {
            /* Default 1 means no increase with narrowband. */
            var non_linear_increase_saturation = par.non_linear_increase_saturation.val - 1;
      } else {
            var non_linear_increase_saturation = par.non_linear_increase_saturation.val;
      }
      if (non_linear_increase_saturation > 0) {
            /* Add saturation on RGB
            */
            for (var i = 0; i < non_linear_increase_saturation; i++) {
                  increaseSaturation(ImageWindow.windowById(RGB_processed_HT_id), mask_win);
            }
      }
      console.writeln("ProcessRGBimage done");
      return RGB_processed_HT_id;
}

function invertImage(targetView)
{
      console.writeln("invertImage");
      var node = flowchartOperation("Invert");

      var P = new Invert;

      targetView.beginProcess(UndoFlag_NoSwapFile);
      P.executeOn(targetView, true);
      targetView.endProcess();

      printProcessValues(P);
      engine_end_process(node);
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
      util.closeOneWindowById("AutoStarFixMask");
      var node = flowchartOperation("StarMask");

      var P = new StarMask;
      P.midtonesBalance = 0.80000;        // default: 0.50000
      P.waveletLayers = 8;
      P.smoothness = 8;

      imgView.beginProcess(UndoFlag_NoSwapFile);
      P.executeOn(imgView, false);
      imgView.endProcess();

      printProcessValues(P);
      engine_end_process(node);

      star_fix_mask_win = ImageWindow.activeWindow;

      util.windowRenameKeepif(star_fix_mask_win.mainView.id, ppar.win_prefix + "AutoStarFixMask", true);
      star_fix_mask_win_id = star_fix_mask_win.mainView.id;

      util.addProcessingStep("Created star fix mask " + star_fix_mask_win.mainView.id);
}

function extraRemoveMagentaColor(targetWin)
{
      addExtraProcessingStep("Remove magenta color");

      invertImage(targetWin.mainView);
      runSCNR(targetWin, true);
      invertImage(targetWin.mainView);

      guiUpdatePreviewWin(targetWin);
}

/* Do a rough fix on magenta stars by inverting the image, applying
 * SCNR to remove the now green cast on stars and then inverting back.
 * If we are not removing all green case we use mask to protect
 * other areas than stars.
 */
function extraFixNarrowbandStarColor(targetWin)
{
      var use_mask;

      if (par.skip_star_fix_mask.val || global.get_flowchart_data) {
            use_mask = false;
      } else if (!par.run_narrowband_SCNR.val || par.leave_some_green.val) {
            // If we do not remove all green we use mask protect
            // other than stars.
            use_mask = true;
      } else {
            // We want all green removed, do not use mask on stars either.
            use_mask = false;
      }

      addExtraProcessingStep("Fix narrowband star color");

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

      runSCNR(targetWin, true);

      if (use_mask) {
            targetWin.removeMask();
      }

      invertImage(targetWin.mainView);

      guiUpdatePreviewWin(targetWin);
}

function addExtraProcessingStep(txt)
{
      global.extra_processing_info.push(txt);
      util.addProcessingStepAndStatusInfo("Processing: " + txt);
}

function extraFixStarCores(targetWin)
{
      console.writeln("extraFixStarCores:create star mask");

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
      P.mode = StarMask.prototype.StarMask;

      P.executeOn(targetWin.mainView, false);

      printProcessValues(P);

      console.writeln("extraFixStarCores:set star mask");

      star_fix_mask_win = ImageWindow.activeWindow;

      setMaskChecked(targetWin, star_fix_mask_win);
      targetWin.maskInverted = false;

      // Blur star cores
      console.writeln("extraFixStarCores:blur star cores");
      var P = new Convolution;
      P.mode = Convolution.prototype.Parametric;
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

      printProcessValues(P);
           
      // Cleanup
      targetWin.removeMask();
      star_fix_mask_win.forceClose();
}

// When start removal is run we do some things differently
// - We make a copy of the starless image
// - We make a copy of the stars image
// - Operations like HDMT and LHE are run on the starless image
// - Star reduction is done on the stars image
// - Optionally in the end starless and stars images are combined together
function extraRemoveStars(parent, imgWin, apply_directly)
{
      addExtraProcessingStep("Remove stars, unscreen " + par.extra_unscreen_stars.val);

      /* Close old star mask. If needed we create a new one from
       * the stars image.
       */
      util.closeOneWindowById(util.ensure_win_prefix("AutoStarMask"));

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

      if (par.extra_combine_stars.val || !apply_directly) {
            /* Make a copy of the starless image.
            */
            console.writeln("extraRemoveStars copy " + imgWin.mainView.id + " to " + imgWin.mainView.id + "_starless");
            var copywin = util.copyWindow(imgWin, util.ensure_win_prefix(imgWin.mainView.id + "_starless"));
      } else {
            /* We do not combine images so just rename old image.
             */
            var copywin = imgWin;
            copywin.mainView.id = util.ensure_win_prefix(copywin.mainView.id + "_starless");
            global.extra_target_image = copywin.mainView.id;
      }
      setFinalImageKeyword(copywin);
      util.addProcessingStep("Starless image " + copywin.mainView.id);
      copywin.show();

      // guiUpdatePreviewWin(copywin);

      if (gui) {
            gui.update_extra_target_image_window_list(global.extra_target_image);
      }

      // return possibly new starless image for further processing
      return { starless_win: copywin, stars_id: stars_win_id };
}

function extraDarkerBackground(imgWin, maskWin)
{
      addExtraProcessingStep("Darker background");
      var node = flowchartOperation("CurvesTransformation");

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

      printProcessValues(P);
      engine_end_process(node);

      // guiUpdatePreviewWin(imgWin);
}

function extraDarkerHighlights(imgWin, maskWin)
{
      addExtraProcessingStep("Darker highlights");
      var node = flowchartOperation("CurvesTransformation");

      var P = new CurvesTransformation;
      P.K = [ // x, y
            [0.00000, 0.00000],
            [0.53366, 0.44200],
            [0.80952, 0.69400],
            [1.00000, 1.00000]
      ];

      imgWin.mainView.beginProcess(UndoFlag_NoSwapFile);

      /* Darken only bright parts of the image. */
      setMaskChecked(imgWin, maskWin);
      imgWin.maskInverted = false;

      P.executeOn(imgWin.mainView, false);

      imgWin.removeMask();

      imgWin.mainView.endProcess();

      printProcessValues(P);
      engine_end_process(node);

      // guiUpdatePreviewWin(imgWin);
}

function extraAdjustChannels(imgWin)
{
      if (par.extra_adjust_channels_only_k.val) {
            addExtraProcessingStep("Adjust all channels, K " + par.extra_adjust_R.val);
      } else {
            addExtraProcessingStep("Adjust channels, R " + par.extra_adjust_R.val + ", G " + par.extra_adjust_G.val + ", B " + par.extra_adjust_B.val);
      }
      var node = flowchartOperation("PixelMath:adjust channels");

      var P = new PixelMath;

      if (par.extra_adjust_channels_only_k.val || (par.extra_adjust_G.val == 0 && par.extra_adjust_B.val == 0)) {
            P.expression = "$T * " + par.extra_adjust_R.val;
            P.useSingleExpression = true;
      } else {
            P.expression = "$T[0] * " + par.extra_adjust_R.val;
            P.expression1 = "$T[1] * " + par.extra_adjust_G.val;
            P.expression2 = "$T[2] * " + par.extra_adjust_B.val;
            P.useSingleExpression = false;
      }
      P.showNewImage = false;
      P.createNewImage = false;
      P.newImageId = "";
      P.newImageColorSpace = PixelMath.prototype.RGB;

      imgWin.mainView.beginProcess(UndoFlag_NoSwapFile);
      P.executeOn(imgWin.mainView);
      imgWin.mainView.endProcess();

      printProcessValues(P);
      engine_end_process(node);
}

function extraHDRMultiscaleTransform(imgWin, maskWin)
{
      addExtraProcessingStep("HDRMultiscaleTransform, color " + par.extra_HDRMLT_color.val + ", layers " + par.extra_HDRMLT_layers.val + ", iterations " + par.extra_HDRMLT_iterations.val + ", overdrive " + par.extra_HDRMLT_overdrive.val);

      var failed = false;
      var hsChannels = null;
      var iChannel = null;

      var node = flowchartOperation("HDRMultiscaleTransform");

      try {
            var P = new HDRMultiscaleTransform;
            P.numberOfLayers = par.extra_HDRMLT_layers.val;
            P.medianTransform = true;
            P.numberOfIterations = par.extra_HDRMLT_iterations.val;
            P.overdrive = par.extra_HDRMLT_overdrive.val;
            P.deringing = false;
            P.toLightness = true;
            P.luminanceMask = true;
            if (par.extra_HDRMLT_color.val == 'Preserve hue') {
                  P.preserveHue = true;
            } else {
                  P.preserveHue = false;
            }

            if (par.extra_HDRMLT_color.val == 'Color corrected') {
                  if (global.pixinsight_version_num < 1080812) {
                        hsChannels = extractHSchannels(imgWin);
                  } else {
                        P.toIntensity = true;
                        P.toLightness = false;
                  }
            }

            imgWin.mainView.beginProcess(UndoFlag_NoSwapFile);

            /* Transform only light parts of the image. */
            setMaskChecked(imgWin, maskWin);
            imgWin.maskInverted = false;
            
            P.executeOn(imgWin.mainView, false);

            imgWin.removeMask();

            imgWin.mainView.endProcess();

            printProcessValues(P);
            engine_end_process(node);

            if (par.extra_HDRMLT_color.val == 'Color corrected'
                && global.pixinsight_version_num < 1080812) 
            {
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
                  engine_end_process(null);
            }
            // guiUpdatePreviewWin(imgWin);
      } catch (err) {
            failed = true;
            util.addCriticalStatus(err.toString());
      }
      if (hsChannels != null) {
            util.closeOneWindow(hsChannels[0]);
            util.closeOneWindow(hsChannels[1]);
      }
      if (iChannel != null) {
            util.closeOneWindow(iChannel);
      }
      if (failed) {
            util.throwFatalError("HDRMultiscaleTransform failed");
      }
}

function extraLocalHistogramEqualization(imgWin, maskWin)
{
      addExtraProcessingStep("LocalHistogramEqualization, radius " + par.extra_LHE_kernelradius.val);
      var node = flowchartOperation("LocalHistogramEqualization");

      var P = new LocalHistogramEqualization;
      P.radius = par.extra_LHE_kernelradius.val;
      P.slopeLimit = par.extra_LHE_contrastlimit.val;
      P.amount = 1.000;
      
      imgWin.mainView.beginProcess(UndoFlag_NoSwapFile);

      var adjusttype = par.extra_LHE_adjusttype.val;
      if (par.extra_range_mask.val) {
            adjusttype = 'range_mask';
      }

      switch (adjusttype) {
            case 'All':
                  /* Transform whole image. */
                  break;
            case 'Lights':
                  /* Transform only light parts of the image. */
                  setMaskChecked(imgWin, maskWin);
                  imgWin.maskInverted = false;
                  break;
            case 'Darks':
                  /* Transform only dark parts of the image. */
                  setMaskChecked(imgWin, maskWin);
                  imgWin.maskInverted = true;
                  break;
            case 'range_mask':
                  /* User created mask. */
                  setMaskChecked(imgWin, maskWin);
                  imgWin.maskInverted = false;
                  break;
            default:
                  util.throwFatalError("Invalid LocalHistogramEqualization mask type " + par.extra_LHE_adjusttype.val);
      }
      
      P.executeOn(imgWin.mainView, false);

      if (par.extra_LHE_adjusttype.val != 'All') {
            imgWin.removeMask();
      }

      imgWin.mainView.endProcess();

      printProcessValues(P);
      engine_end_process(node);

      // guiUpdatePreviewWin(imgWin);
}

function extraExponentialTransformation(imgWin, maskWin)
{
      addExtraProcessingStep("ExponentialTransformation, order " + par.extra_ET_order.val);
      var node = flowchartOperation("ExponentialTransformation");

      var P = new ExponentialTransformation;
      P.functionType = ExponentialTransformation.prototype.PIP;
      P.order = par.extra_ET_order.val;
      P.sigma = 0.00;
      
      imgWin.mainView.beginProcess(UndoFlag_NoSwapFile);

      var adjusttype = par.extra_ET_adjusttype.val;
      if (par.extra_range_mask.val) {
            adjusttype = 'range_mask';
      }

      switch (adjusttype) {
            case 'All':
                  /* Transform whole image. */
                  break;
            case 'Lights':
                  /* Transform only light parts of the image. */
                  setMaskChecked(imgWin, maskWin);
                  imgWin.maskInverted = false;
                  P.useLightnessMask = true;
                  break;
            case 'Darks':
                  /* Transform only dark parts of the image. */
                  setMaskChecked(imgWin, maskWin);
                  imgWin.maskInverted = true;
                  P.useLightnessMask = false;
                  break;
            case 'range_mask':
                  /* User created mask. */
                  setMaskChecked(imgWin, maskWin);
                  imgWin.maskInverted = false;
                  break;
            default:
                  util.throwFatalError("Invalid ExponentialTransformation mask type " + par.extra_LHE_adjusttype.val);
      }

      P.executeOn(imgWin.mainView, false);

      if (par.extra_ET_adjusttype.val != 'All') {
            imgWin.removeMask();
      }

      imgWin.mainView.endProcess();

      printProcessValues(P);
      engine_end_process(node);

      // guiUpdatePreviewWin(imgWin);
}

function createNewStarMaskWin(imgWin)
{
      var node = flowchartOperation("StarMask");

      var P = new StarMask;
      P.midtonesBalance = 0.80000;        // default: 0.50000
      P.waveletLayers = 5;                // default: 5
      P.largeScaleGrowth = 1;             //  default: 2
      P.smoothness = 8;                   // default: 16

      imgWin.mainView.beginProcess(UndoFlag_NoSwapFile);
      P.executeOn(imgWin.mainView, false);
      imgWin.mainView.endProcess();

      printProcessValues(P);
      engine_end_process(node);

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
      util.closeOneWindowById("AutoStarMask");

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

      runPixelMathSingleMappingEx(combined_id, "combine stars+starless", expression, false, symbols);
}

function extraSmallerStars(imgWin, is_star_image)
{
      var use_mask = true;
      var targetWin = imgWin;

      if (global.get_flowchart_data) {
            use_mask = false;
      }
      if (use_mask) {
            createStarMaskIf(imgWin);
      }

      addExtraProcessingStep("Smaller stars on stars image using " + par.extra_smaller_stars_iterations.val + " iterations");
      var node = flowchartOperation("MorphologicalTransformation");

      if (global.get_flowchart_data) {
            return;
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

      printProcessValues(P);
      engine_end_process(node);

      // guiUpdatePreviewWin(targetWin);
}

function extraContrast(imgWin)
{
      console.writeln("Increase contrast");
      var node = flowchartOperation("CurvesTransformation:contrast");

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

      printProcessValues(P);
      engine_end_process(node);

      // guiUpdatePreviewWin(imgWin);
}

function extraStretch(win)
{
      addExtraProcessingStep("Stretch image using " + par.image_stretching.val);

      win = runHistogramTransform(win, null, win.mainView.image.isColor, 'RGB').win;
      return win;
}

// Run unlinked AUtoSTF to image
function extraAutoSTF(win)
{
      addExtraProcessingStep("AutoSTF on image");

      engine.runHistogramTransformSTFex(win, null, win.mainView.image.isColor, DEFAULT_AUTOSTRETCH_TBGND, true, true);

      return win;
}

function extraAdjustShadows(win, perc)
{
      addExtraProcessingStep("Adjust shadows, " + perc + "%");

      adjustShadows(win, perc);

      // guiUpdatePreviewWin(win);
}

function smoothBackground(win, val, factor)
{
      var mapping = "iif($T<" + val + "," + val + "-(" + val + "-$T)*" + factor + ",$T)";

      runPixelMathSingleMappingEx(win.mainView.id, "smooth background", mapping, false, null);
}

function extraSmoothBackground(win, val, factor)
{
      addExtraProcessingStep("Background smoothing with value " + val + " and factor " + factor);

      smoothBackground(win, val, factor);

      // guiUpdatePreviewWin(win);
}

function extraEnhanceShadows(win)
{
      addExtraProcessingStep("Enhance shadows");

      var mapping = "ln(1+$T)";

      runPixelMathSingleMappingEx(win.mainView.id, "enhance shadows", mapping, false, null, true);
}

function extraEnhanceHighlights(win)
{
      addExtraProcessingStep("Enhance highlights");

      var mapping = "exp($T)";

      runPixelMathSingleMappingEx(win.mainView.id, "enhance highlights", mapping, false, null, true);
}

function extraGamma(win)
{
      addExtraProcessingStep("Gamma correction with value " + par.extra_gamma_value.val);

      var mapping = "$T ^ " + par.extra_gamma_value.val;

      runPixelMathSingleMappingEx(win.mainView.id, "gamma correction", mapping, false, null, false);
}

function autoContrast(win, contrast_limit_low, contrast_limit_high)
{
      console.writeln("autoContrast: image " + win.mainView.id + ", low limit " + contrast_limit_low + ", high limit " + contrast_limit_high);

      if (global.get_flowchart_data) {
            var node = flowchartOperation("PixelMath:autocontrast");
            return;
      }

      var low_adjust = getAdjustPoint(win, contrast_limit_low);
      var high_adjust = getAdjustPoint(win, contrast_limit_high);

      var mapping = "($T-" + low_adjust.normalizedAdjustPoint + ")*(1/(" + high_adjust.normalizedAdjustPoint + "-" + low_adjust.normalizedAdjustPoint + "))";
      console.writeln("autoContrast: mapping " + mapping);

      runPixelMathSingleMappingEx(win.mainView.id, "autocontrast", mapping, false, null);
}

function extraAutoContrastChannel(imgWin, channel, contrast_limit_low, contrast_limit_high)
{
      console.writeln("Auto contrast on channel " + channel + ", low limit " + contrast_limit_low + ", high limit " + contrast_limit_high);

      // extract channel data
      var ch_id = extractRGBchannel(imgWin.mainView.id, channel);
      var ch_win = util.findWindow(ch_id);

      autoContrast(ch_win, contrast_limit_low, contrast_limit_high);

      return ch_id;
}

function extraAutoContrast(win, contrast_limit_low, contrast_limit_high, channels)
{
      if (channels) {
            addExtraProcessingStep("Auto contrast channels with low limit " + contrast_limit_low + ", high limit " + contrast_limit_high);

            var R_id = extraAutoContrastChannel(win, 'R', contrast_limit_low, contrast_limit_high);
            var G_id = extraAutoContrastChannel(win, 'G', contrast_limit_low, contrast_limit_high);
            var B_id = extraAutoContrastChannel(win, 'B', contrast_limit_low, contrast_limit_high);

            runPixelMathRGBMapping(null, win, R_id, G_id, B_id);

            util.closeOneWindowById(R_id);
            util.closeOneWindowById(G_id);
            util.closeOneWindowById(B_id);

      } else {
            addExtraProcessingStep("Auto contrast with low limit " + contrast_limit_low + ", high limit " + contrast_limit_high);

            autoContrast(win, contrast_limit_low, contrast_limit_high);
      }
}

function extraNoiseReduction(win, mask_win)
{
      if (par.extra_noise_reduction_strength.val == 0) {
            return;
      }
      addExtraProcessingStep("Noise reduction");

      runNoiseReductionEx(
            win, 
            mask_win, 
            par.extra_noise_reduction_strength.val,
            false);

      // guiUpdatePreviewWin(win);
}

function extraACDNR(extraWin, mask_win)
{
      addExtraProcessingStep("ACDNR noise reduction");
      if (par.ACDNR_noise_reduction.val == 0.0) {
            util.addProcessingStep("Extra ACDNR noise reduction not done, StdDev value is zero");
            return;
      }

      runACDNRReduceNoise(extraWin, mask_win);

      // guiUpdatePreviewWin(extraWin);
}

function extraColorNoise(extraWin)
{
      addExtraProcessingStep("Color noise reduction");
      runColorReduceNoise(extraWin);
}

function combineLowPassandHighPass(extraWin, low_pass_win, high_pass_win)
{
      var node = flowchartOperation("PixelMath:combine high pass and low pass");

      console.writeln("combineLowPassandHighPass: run PixelMath on " + extraWin.mainView.id + "to create high pass sharpened image");
      var P = new PixelMath;
      P.expression = low_pass_win.mainView.id + " + " + high_pass_win.mainView.id + " - 0.5"; // Subtract 0.5 we added earlier
      P.useSingleExpression = true;
      P.createNewImage = false;
      // P.rescale = false;
      // P.truncate = false;

      P.executeOn(extraWin.mainView, false);

      printProcessValues(P);
      engine_end_process(node);
}

function extraHighPassSharpen(extraWin, mask_win)
{
      addExtraProcessingStep("High pass sharpening");

      if (par.extra_highpass_sharpen_combine_only.val) {
            console.writeln("extraHighPassSharpen: only combine high pass and low pass images into " + extraWin.mainView.id);
            var str = extraWin.mainView.id;
            if (str.indexOf("_lowpass") != -1) {
                  var low_pass_id = str.split("_lowpass")[0] + "_lowpass";
                  var high_pass_id = low_pass_id.replace("_lowpass", "_highpass");
            } else if (str.indexOf("_highpass") != -1) {
                  var high_pass_id = str.split("_highpass")[0] + "_highpass";
                  var low_pass_id = high_pass_id.replace("_highpass", "_lowpass");
            } else {
                  util.throwFatalError("Invalid image name " + str + ", name should include _lowpass or _highpass");
            }
            var high_pass_win = util.findWindow(high_pass_id);
            if (high_pass_win == null) {
                  util.throwFatalError("High pass image " + high_pass_id + " not found");
            }
            var low_pass_win = util.findWindow(low_pass_id);
            if (low_pass_win == null) {
                  util.throwFatalError("Low pass image " + low_pass_id + " not found");
            }
            combineLowPassandHighPass(extraWin, low_pass_win, high_pass_win)
            return;
      }

      // ---------------------------------------------
      // Generate low pass filtered image
      // ---------------------------------------------
      var node = flowchartOperation("PixelMath:low pass image");

      console.writeln("extraHighPassSharpen: copy low pass image from " + extraWin.mainView.id + " to " + util.ensure_win_prefix(extraWin.mainView.id + "_lowpass"));
      var low_pass_win = util.forceCopyWindow(extraWin, util.ensure_win_prefix(extraWin.mainView.id + "_lowpass"));

      console.writeln("extraHighPassSharpen: run ATrousWaveletTransform on " + low_pass_win.mainView.id + ", layers " + par.extra_highpass_sharpen_layers.val);

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
      for (var i = 0; i < par.extra_highpass_sharpen_layers.val; i++) {
            layers[i][0] = false;
      }

      var P = new ATrousWaveletTransform;
      P.layers = layers; // enabled, biasEnabled, bias, noiseReductionEnabled, noiseReductionThreshold, noiseReductionAmount, noiseReductionIterations

      P.executeOn(low_pass_win.mainView, false);

      printProcessValues(P);
      engine_end_process(node);

      // ---------------------------------------------
      // Generate high pass filtered image by subtract low pass from original image
      // ---------------------------------------------
      var node = flowchartOperation("PixelMath:high pass image");

      console.writeln("extraHighPassSharpen: copy low pass image from " + extraWin.mainView.id + " to " + util.ensure_win_prefix(extraWin.mainView.id + "_highpass"));
      var high_pass_win = util.forceCopyWindow(extraWin, util.ensure_win_prefix(extraWin.mainView.id + "_highpass"));

      console.writeln("extraHighPassSharpen: run PixelMath on " + high_pass_win.mainView.id + " to create high pass image");
      var P = new PixelMath;
      P.expression = "$T - " + low_pass_win.mainView.id + " + 0.5"; // Add 0.5 so it looks the same as in photoshop
      P.useSingleExpression = true;
      P.createNewImage = false;
      // P.rescale = false;
      // P.truncate = false;

      P.executeOn(high_pass_win.mainView, false);

      printProcessValues(P);
      engine_end_process(node);

      if (par.extra_highpass_sharpen_noise_reduction.val) {
            console.writeln("extraHighPassSharpen: run noise reduction on " + high_pass_win.mainView.id);
            extraNoiseReduction(high_pass_win, null);
      }

      // ---------------------------------------------
      // Sharpen the high pass image
      // ---------------------------------------------
      if (par.extra_highpass_sharpen_method.val == 'MLT' || par.extra_highpass_sharpen_method.val == 'Default') {
            console.writeln("extraHighPassSharpen: use MultiscaleLinearTransform to sharpen " + high_pass_win.mainView.id);
            for (var i = 0; i < par.extra_sharpen_iterations.val; i++) {
                  runMultiscaleLinearTransformSharpen(high_pass_win, mask_win);
            }
      } else if (par.extra_highpass_sharpen_method.val == 'UnsharpMask') {
            console.writeln("extraHighPassSharpen: use UnsharpMask to sharpen " + high_pass_win.mainView.id);
            extraUnsharpMask(high_pass_win, mask_win);
      } else if (par.extra_highpass_sharpen_method.val == 'BlurXTerminator') {
            console.writeln("extraHighPassSharpen: use BlurXTerminator to sharpen " + high_pass_win.mainView.id);
            runBlurXTerminator(high_pass_win, false);
      } else if (par.extra_highpass_sharpen_method.val == 'None') {
            console.writeln("extraHighPassSharpen: no sharpening on " + high_pass_win.mainView.id);
      } else {
            util.throwFatalError("Invalid high pass sharpening method " + par.extra_highpass_sharpen_method.val);
      }

      // ---------------------------------------------
      // Create new image by combining high pass and low pass images
      // ---------------------------------------------'
      combineLowPassandHighPass(extraWin, low_pass_win, high_pass_win);

      // Cleanup
      if (!par.extra_highpass_sharpen_keep_images.val) {
            util.closeOneWindow(low_pass_win);
            util.closeOneWindow(high_pass_win);
      }
}

function extraUnsharpMask(extraWin, mask_win)
{
      addExtraProcessingStep("UnsharpMask using StdDev " + par.extra_unsharpmask_stddev.val + ", amount " + par.extra_unsharpmask_amount.val);
      var node = flowchartOperation("UnsharpMask:sharpen");

      var P = new UnsharpMask;
      P.sigma = par.extra_unsharpmask_stddev.val;
      P.amount = par.extra_unsharpmask_amount.val;
      P.useLuminance = true;

      if (mask_win != null) {
            /* Sharpen only light parts of the image. */
            setMaskChecked(extraWin, mask_win);
            extraWin.maskInverted = false;
      }

      extraWin.mainView.beginProcess(UndoFlag_NoSwapFile);
      P.executeOn(extraWin.mainView, false);
      extraWin.mainView.endProcess();

      printProcessValues(P);
      engine_end_process(node);

      if (mask_win != null) {
            extraWin.removeMask();
      }

      // guiUpdatePreviewWin(extraWin);
}

function extraClarity(extraWin, mask_win)
{
      addExtraProcessingStep("Clarity using StdDev " + par.extra_clarity_stddev.val + ", amount " + par.extra_clarity_amount.val + (par.extra_clarity_mask.val ? " using a mask" : ""));

      if (!par.extra_clarity_mask.val) {
            mask_win = null;
      }
      var node = flowchartOperation("UnsharpMask:clarity");

      var P = new UnsharpMask;
      P.sigma = par.extra_clarity_stddev.val;
      P.amount = par.extra_clarity_amount.val;
      P.useLuminance = true;

      if (mask_win != null) {
            /* Sharpen only light parts of the image. */
            setMaskChecked(extraWin, mask_win);
            extraWin.maskInverted = false;
      }

      extraWin.mainView.beginProcess(UndoFlag_NoSwapFile);
      P.executeOn(extraWin.mainView, false);
      extraWin.mainView.endProcess();

      printProcessValues(P);
      engine_end_process(node);

      if (mask_win != null) {
            extraWin.removeMask();
      }

      // guiUpdatePreviewWin(extraWin);
}

function extraSharpen(extraWin, mask_win)
{
      if (par.use_blurxterminator.val) {
            addExtraProcessingStep("Sharpening using BlurXTerminator");
            runBlurXTerminator(extraWin, false);
      } else if (par.use_graxpert_deconvolution.val) {
            runGraXpertDeconvolution(extraWin);
      } else {
            addExtraProcessingStep("Sharpening using MLT with " + par.extra_sharpen_iterations.val + " iterations");
            for (var i = 0; i < par.extra_sharpen_iterations.val; i++) {
                  runMultiscaleLinearTransformSharpen(extraWin, mask_win);
            }
      }
      // guiUpdatePreviewWin(extraWin);
}

function extraSaturation(extraWin, mask_win)
{
      addExtraProcessingStep("Saturation using " + par.extra_saturation_iterations.val + " iterations");

      for (var i = 0; i < par.extra_saturation_iterations.val; i++) {
            increaseSaturation(extraWin, mask_win);
      }
      // guiUpdatePreviewWin(extraWin);
}

function extraBandingReduction(extraWin)
{
      addExtraProcessingStep("Banding reduction");

      runBandingReduction(extraWin);
}

function extraGradientCorrection(extraWin)
{
      if (par.extra_GC_method.val == 'Auto') {
            var gc_method = getDefaultGradientCorrectionMethod();
      } else {
            var gc_method = par.extra_GC_method.val;
      }
      if (gc_method == 'GraXpert') {
            addExtraProcessingStep("Extract background using GraXpert, correction " + par.graxpert_correction.val + ', smoothing ' + par.graxpert_smoothing.val);
      } else if (gc_method == 'ABE') {
            addExtraProcessingStep("Extract background using ABE, degree " + par.ABE_degree.val + ", correction " + par.ABE_correction.val);
      } else if (gc_method == 'MultiscaleGradientCorrection') {
            addExtraProcessingStep("Extract background using MultiscaleGradientCorrection");
      } else {
            addExtraProcessingStep("Extract background using GradientCorrection" +
                                    (par.gc_smoothness.val != par.gc_smoothness.def ? ", Smoothness " + par.gc_smoothness.val : "") + 
                                    (par.gc_automatic_convergence.val != par.gc_automatic_convergence.def ? ', Automatic convergence ' + par.gc_automatic_convergence.val : "") +
                                    (par.gc_structure_protection.val != par.gc_structure_protection.def ? ", Structure Protection " + par.gc_structure_protection.val : "") +
                                    (par.gc_protection_threshold.val != par.gc_protection_threshold.def ? ", Protection threshold " + par.gc_protection_threshold.val : "") + 
                                    (par.gc_protection_amount.val != par.gc_protection_amount.def ? ", Protection amount " + par.gc_protection_amount.val : ""));
      }
      var id = runGradientCorrection(extraWin, true, gc_method);
      // guiUpdatePreviewWin(extraWin);
      return id;
}

function extraSHOHueShift(imgWin)
{
      addExtraProcessingStep("SHO hue shift");
      var node = flowchartOperation("CurvesTransformation:SHOhueshift");

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

      engine_end_process(null);

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

      engine_end_process(null);

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
      engine_end_process(node);
      // guiUpdatePreviewWin(imgWin);
}

function extraColorizeChannelCurves(imgWin, channel, ch_id, curves_R, curves_G, curves_B)
{
      console.writeln("extraColorizeChannelCurves: " + imgWin.mainView.id + " channel: " + channel);

      var ch_win = util.findWindow(ch_id); 
      var ch_mask_win = newMaskWindow(ch_win, "auto_tmp_mask_" + channel, true);

      var node = flowchartOperation("ConvertToRGBColor");

      // convert to RGB
      var P = new ConvertToRGBColor;
      ch_win.mainView.beginProcess(UndoFlag_NoSwapFile);
      P.executeOn(ch_win.mainView);
      ch_win.mainView.endProcess();

      engine_end_process(node);

      runNoiseReductionEx(ch_win, ch_mask_win, 4, false);

      var node = flowchartOperation("CurvesTransformation");

      // run curves transformation with a mask
      var P = new CurvesTransformation;

      if (curves_R != null) {
            P.R = curves_R;
      }
      if (curves_G != null) {
            P.G = curves_G;
      }
      if (curves_B != null) {
            P.B = curves_B;
      }

      ch_win.mainView.beginProcess(UndoFlag_NoSwapFile);
      /* Colorize only light parts of the image. */
      setMaskChecked(ch_win, ch_mask_win);
      ch_win.maskInverted = false;
      
      for (var i = 0; i < 2; i++) {
            P.executeOn(ch_win.mainView, false);
      }

      ch_win.removeMask();
      ch_win.mainView.endProcess();

      engine_end_process(node);

      guiUpdatePreviewWin(ch_win);

      util.closeOneWindowById(ch_mask_win.mainView.id);

      return ch_win;
}

function extraColorizedSHO(imgWin, channel, ch_id)
{
      addExtraProcessingStep("Colorized SHO");

      switch (channel) {
            case 'R':
                  var curves_S_R = [ // x, y
                        [0.00000, 0.00000],
                        [0.39901, 0.63800],
                        [1.00000, 1.00000]
                  ];
                  var curves_S_B = [ // x, y
                        [0.00000, 0.00000],
                        [0.52709, 0.46200],
                        [1.00000, 1.00000]
                  ];
                  var id = extraColorizeChannelCurves(imgWin, "R", ch_id, curves_S_R, null, curves_S_B).mainView.id;
                  break;
            case 'G':      
                  var curves_H_R = [ // x, y
                        [0.00000, 0.00000],
                        [0.43186, 0.58200],
                        [1.00000, 1.00000]
                  ];
                  var curves_H_G = [ // x, y
                        [0.00000, 0.00000],
                        [0.14614, 0.14600],
                        [0.72578, 0.76000],
                        [1.00000, 1.00000]
                  ];
                  var curves_H_B = [ // x, y
                        [0.00000, 0.00000],
                        [0.54023, 0.45400],
                        [1.00000, 1.00000]
                  ];
                  var id = extraColorizeChannelCurves(imgWin, "G", ch_id, curves_H_R, curves_H_G, curves_H_B).mainView.id;
                  break;
            case 'B':
                  var curves_O_R = [ // x, y
                        [0.00000, 0.00000],
                        [0.52874, 0.46400],
                        [1.00000, 1.00000]
                  ];
                  var curves_O_G = [ // x, y
                        [0.00000, 0.00000],
                        [0.51560, 0.47200],
                        [1.00000, 1.00000]
                  ];
                  var curves_O_B = [ // x, y
                        [0.00000, 0.00000],
                        [0.42200, 0.61400],
                        [1.00000, 1.00000]
                  ];
                  var id = extraColorizeChannelCurves(imgWin, "B", ch_id, curves_O_R, curves_O_G, curves_O_B).mainView.id;
                  break;
            default:
                  util.throwFatalError("Invalid channel " + channel);
                  break;
      }

     return util.findWindow(id);
}

function getColorizeChannels(imgWin)
{
      var channel_wins = [];

      if (par.colorized_integrated_images.val) {
            console.writeln("getColorizeChannels: colorized integrated images");
            var win = util.findWindow(ppar.win_prefix + "Integration_S");
            if (win == null) {
                  util.throwFatalError("getColorizeChannels: Integration_S window not found");
            }
            channel_wins.push(util.copyWindowEx(win, ppar.win_prefix + "Integration_S_colorized", true));

            win = util.findWindow(ppar.win_prefix + "Integration_H");
            if (win == null) {
                  util.throwFatalError("getColorizeChannels: Integration_H window not found");
            }
            channel_wins.push(util.copyWindowEx(win, ppar.win_prefix + "Integration_H_colorized", true));
            
            win = util.findWindow(ppar.win_prefix + "Integration_O");
            if (win == null) {
                  util.throwFatalError("getColorizeChannels: Integration_O window not found");
            }
            channel_wins.push(util.copyWindowEx(win, ppar.win_prefix + "Integration_O_colorized", true));

      } else {
            console.writeln("getColorizeChannels: colorized RGB channels");

            var id = extractRGBchannel(imgWin.mainView.id, 'R');
            var win = util.findWindow(id);
            channel_wins.push(win);

            id = extractRGBchannel(imgWin.mainView.id, 'G');
            win = util.findWindow(id);
            channel_wins.push(win);

            id = extractRGBchannel(imgWin.mainView.id, 'B');
            win = util.findWindow(id);
            channel_wins.push(win);
      }

      return channel_wins;
}

// Colourise is not a standard process so we need to use PixelMath
function extraColorizeChannelUsingColourise(ch_win, channel)
{
      var node = flowchartOperation("Colourise");

      var P = new Colourise;

      switch (channel) {
            case 'R':
                  P.hue = par.narrowband_colorized_R_hue.val;
                  P.saturation = par.narrowband_colorized_R_sat.val;
                  P.shadows = 0.000;
                  P.midtones = 1 - par.narrowband_colorized_R_weight.val / 2;
                  break;
            case 'G':
                  P.hue = par.narrowband_colorized_G_hue.val;
                  P.saturation = par.narrowband_colorized_G_sat.val;
                  P.shadows = 0.000;
                  P.midtones = 1 - par.narrowband_colorized_G_weight.val / 2;
                  break;
            case 'B':
                  P.hue = par.narrowband_colorized_B_hue.val;
                  P.saturation = par.narrowband_colorized_B_sat.val;
                  P.shadows = 0.000;
                  P.midtones = 1 - par.narrowband_colorized_B_weight.val / 2;
                  break;
            default:
                  util.throwFatalError("extraColorizeChannelUsingColourise: Invalid channel " + channel);
                  break;
      }
      console.writeln("Colorize channel " + channel + " using Colourise, hue " + P.hue + ", saturation " + P.saturation + ", midtones " + P.midtones);

      ch_win.mainView.beginProcess(UndoFlag_NoSwapFile);
      P.executeOn(ch_win.mainView);
      ch_win.mainView.endProcess();

      engine_end_process(node);

      return ch_win;
}

function extraColorizeChannelUsingPixelMath(ch_win, channel)
{
      var midtones = 0.5;

      switch (channel) {
            case 'R':
                  console.writeln("Colorize channel R using PixelMath, hue " + par.narrowband_colorized_R_hue.val + ", saturation " + par.narrowband_colorized_R_sat.val);
                  var rgb = RGBColorSystem.hsiToRGB(par.narrowband_colorized_R_hue.val, par.narrowband_colorized_R_sat.val, midtones);
                  console.writeln("R " + rgb[0] + ", G " + rgb[1] + ", B " + rgb[2]);
                  break;
            case 'G':
                  console.writeln("Colorize channel G using PixelMath, hue " + par.narrowband_colorized_G_hue.val + ", saturation " + par.narrowband_colorized_G_sat.val);
                  var rgb = RGBColorSystem.hsiToRGB(par.narrowband_colorized_G_hue.val, par.narrowband_colorized_G_sat.val, midtones);
                  console.writeln("R " + rgb[0] + ", G " + rgb[1] + ", B " + rgb[2]);
                  break;
            case 'B':
                  console.writeln("Colorize channel B using PixelMath, hue " + par.narrowband_colorized_B_hue.val + ", saturation " + par.narrowband_colorized_B_sat.val);
                  var rgb = RGBColorSystem.hsiToRGB(par.narrowband_colorized_B_hue.val, par.narrowband_colorized_B_sat.val, midtones);
                  console.writeln("R " + rgb[0] + ", G " + rgb[1] + ", B " + rgb[2]);
                  break;
            default:
                  util.throwFatalError("extraColorizeChannelUsingPixelMath: Invalid channel " + channel);
                  break;
      }

      var node = flowchartOperation("PixelMath:colorize");

      var P = new PixelMath;
      P.expression = ch_win.mainView.id + "*" + rgb[0];
      P.expression1 = ch_win.mainView.id + "*" + rgb[1];
      P.expression2 = ch_win.mainView.id + "*" + rgb[2];
      P.useSingleExpression = false;
      P.createNewImage = true;
      P.newImageId = ch_win.mainView.id + "_colorized";
      P.showNewImage = true;
      // P.rescale = false;
      // P.truncate = false;
      P.newImageColorSpace = PixelMath.prototype.RGB;

      console.writeln("extraColorizeChannelUsingPixelMath: mean before " + ch_win.mainView.image.mean());

      P.executeOn(ch_win.mainView);

      engine_end_process(node);

      util.closeOneWindow(ch_win);

      ch_win = util.findWindow(P.newImageId);

      console.writeln("extraColorizeChannelUsingPixelMath: mean after " + ch_win.mainView.image.mean());

      return ch_win;
}

function extraColorizePixelMathChannelsWeightedMapping(channel)
{
      var midtones = 0.5;

      switch (channel) {
            case 'R':
                  console.writeln("Colorize channel R using PixelMathChannel, hue " + par.narrowband_colorized_R_hue.val + ", saturation " + par.narrowband_colorized_R_sat.val);
                  var rgb = RGBColorSystem.hsiToRGB(par.narrowband_colorized_R_hue.val, par.narrowband_colorized_R_sat.val, midtones);
                  var weight = par.narrowband_colorized_R_weight.val;
                  console.writeln("R " + rgb[0] + ", G " + rgb[1] + ", B " + rgb[2]);
                  break;
            case 'G':
                  console.writeln("Colorize channel G using PixelMathChannel, hue " + par.narrowband_colorized_G_hue.val + ", saturation " + par.narrowband_colorized_G_sat.val);
                  var rgb = RGBColorSystem.hsiToRGB(par.narrowband_colorized_G_hue.val, par.narrowband_colorized_G_sat.val, midtones);
                  var weight = par.narrowband_colorized_G_weight.val;
                  console.writeln("R " + rgb[0] + ", G " + rgb[1] + ", B " + rgb[2]);
                  break;
            case 'B':
                  console.writeln("Colorize channel B using PixelMathChannel, hue " + par.narrowband_colorized_B_hue.val + ", saturation " + par.narrowband_colorized_B_sat.val);
                  var rgb = RGBColorSystem.hsiToRGB(par.narrowband_colorized_B_hue.val, par.narrowband_colorized_B_sat.val, midtones);
                  var weight = par.narrowband_colorized_B_weight.val;
                  console.writeln("R " + rgb[0] + ", G " + rgb[1] + ", B " + rgb[2]);
                  break;
            default:
                  util.throwFatalError("extraColorizeChannelUsingPixelMath: Invalid channel " + channel);
                  break;
      }
      var weighted_mapping = "((" + "$T[0]" + "*" + rgb[0] + "+$T[1]" + "*" + rgb[1] + "+$T[2]" + "*" + rgb[2] + ")" + "*" + weight + ")";
      console.writeln("extraColorizePixelMathChannelsWeightedMapping: " + weighted_mapping);
      return weighted_mapping;
}

function extraColorizedNarrowbandImages(imgWin)
{
      console.writeln("extraColorizedNarrowbandImages " + imgWin.mainView.id + ", mapping " + par.narrowband_colorized_mapping.val + ", combine " + par.narrowband_colorized_combine.val);
      let node = flowchartOperation("Colorize");

      var weighted_mapping = [];

      if (par.narrowband_colorized_method.val == 'D:PixelMathChannels') {
            var channel_wins = [];
            weighted_mapping[0] = extraColorizePixelMathChannelsWeightedMapping('R');
            weighted_mapping[1] = extraColorizePixelMathChannelsWeightedMapping('G');
            weighted_mapping[2] = extraColorizePixelMathChannelsWeightedMapping('B');
      } else {
            var channel_wins = getColorizeChannels(imgWin);
            if (par.narrowband_colorized_linear_fit.val) {
                  console.writeln("extraColorizedNarrowbandImages, linear fit");
                  var R_id = channel_wins[0].mainView.id;
                  var G_id = channel_wins[1].mainView.id;
                  var B_id = channel_wins[2].mainView.id;
                  linearFitArray(R_id, [ G_id, B_id ]);
            }

            switch (par.narrowband_colorized_method.val) {
                  case 'Colourise':
                        // Not used since it is not a standard process
                        channel_wins[0] = extraColorizeChannelUsingColourise(channel_wins[0], 'R');
                        channel_wins[1] = extraColorizeChannelUsingColourise(channel_wins[1], 'G');
                        channel_wins[2] = extraColorizeChannelUsingColourise(channel_wins[2], 'B');
                        break;
                  case 'PixelMath':
                        channel_wins[0] = extraColorizeChannelUsingPixelMath(channel_wins[0], 'R');
                        channel_wins[1] = extraColorizeChannelUsingPixelMath(channel_wins[1], 'G');
                        channel_wins[2] = extraColorizeChannelUsingPixelMath(channel_wins[2], 'B');
                        break;
                  case 'D:Curves':
                        channel_wins[0] = extraColorizedSHO(channel_wins[0], 'R', channel_wins[0].mainView.id);
                        channel_wins[1] = extraColorizedSHO(channel_wins[1], 'G', channel_wins[1].mainView.id);
                        channel_wins[2] = extraColorizedSHO(channel_wins[2], 'B', channel_wins[2].mainView.id);
                        break;
                  default:
                        util.throwFatalError("extraColorizedNarrowbandImages: Invalid narrowband colorized method " + par.narrowband_colorized_method.val);
                        break;
            }

            for (var i = 0; i < 3; i++) {
                  var ch = par.narrowband_colorized_mapping.val.charAt(i);
                  switch (ch) {
                        case 'R':
                              if (par.narrowband_colorized_method.val == 'PixelMath') {
                                    weighted_mapping.push("(" + channel_wins[0].mainView.id + "*" + par.narrowband_colorized_R_weight.val + ")");
                              } else {
                                    weighted_mapping.push(channel_wins[0].mainView.id);
                              }
                              break;
                        case 'G':
                              if (par.narrowband_colorized_method.val == 'PixelMath') {
                                    weighted_mapping.push("(" + channel_wins[1].mainView.id + "*" + par.narrowband_colorized_G_weight.val + ")");
                              } else {
                                    weighted_mapping.push(channel_wins[1].mainView.id);
                              }
                              break;
                        case 'B':
                              if (par.narrowband_colorized_method.val == 'PixelMath') {
                                    weighted_mapping.push("(" + channel_wins[2].mainView.id + "*" + par.narrowband_colorized_B_weight.val + ")");
                              } else {
                                    weighted_mapping.push(channel_wins[2].mainView.id);
                              }
                              break;
                        default:
                              util.throwFatalError("extraColorizedNarrowbandImages: Invalid narrowband colorized mapping channel " + ch);
                              break;
                  }
            }
      }

      // Get weighted mappings
      var R_id = weighted_mapping[0];
      var G_id = weighted_mapping[1];
      var B_id = weighted_mapping[2];
      
      switch (par.narrowband_colorized_combine.val) {
            case 'Channels':
                  // merge as RGB channels
                  runPixelMathRGBMapping(null, imgWin, R_id, G_id, B_id);
                  var formula = null;
                  break;
            case 'Screen':
                  var formula = "1-(1-"+R_id+")*(1-"+G_id+")*(1-"+B_id+")";
                  break;
            case 'Sum':
                  var formula = R_id + "+" + G_id + "+" + B_id;
                  break;
            case 'Mean':
                  var formula = "(" + R_id + "+" + G_id + "+" + B_id + ")/3";
                  break;
            case 'Max':
                  var formula = "max(" + R_id + "," + G_id + "," + B_id + ")";
                  break;
            case 'Median':
                  var formula = "med(" + R_id + "," + G_id + "," + B_id + ")";
                  break;
            default:
                  util.throwFatalError("Invalid narrowband colorized combine method " + par.narrowband_colorized_combine.val);
                  break;
      }

      if (formula != null) {
            console.writeln("extraColorizedNarrowbandImages, PixelMath formula " + formula);
            var P = new PixelMath;
            P.expression = formula;
            P.useSingleExpression = true;
            P.createNewImage = false;
            P.showNewImage = true;
            // P.rescale = false;
            //P.truncate = false;
            P.newImageColorSpace = PixelMath.prototype.RGB;

            P.executeOn(imgWin.mainView);
            engine_end_process(null);
      }

      var need_rescale = false;
      for (var i = 0; i < 3; i++) {
            imgWin.mainView.image.selectedChannel = i;
            var max = imgWin.mainView.image.maximum();
            var min = imgWin.mainView.image.minimum();
            if (max > 1.0 || min < 0.0) {
                  console.writeln("Rescale image, channel " + i + ", max " + max + ", min " + min);
                  need_rescale = true;
                  break;
            }
      }
      imgWin.mainView.image.resetSelections();

      if (need_rescale) {
            var P = new Rescale;
            P.mode = Rescale.prototype.RGBK;
            P.executeOn(imgWin.mainView);
      }
      engine_end_process(node);

      return channel_wins;
}

function extraColorizedNarrowband(imgWin)
{
      var stepinfo = "";
      if (par.narrowband_colorized_R_hue.val != par.narrowband_colorized_R_hue.def 
          || par.narrowband_colorized_G_hue.val != par.narrowband_colorized_G_hue.def
          || par.narrowband_colorized_B_hue.val != par.narrowband_colorized_B_hue.def) 
      {
            if (stepinfo != "") {
                  stepinfo = stepinfo + ", ";
            }
            stepinfo = stepinfo + "hue R " + par.narrowband_colorized_R_hue.val + ", G " + par.narrowband_colorized_G_hue.val + ", B " + par.narrowband_colorized_B_hue.val;
      }
      if (par.narrowband_colorized_R_sat.val != par.narrowband_colorized_R_sat.def
          || par.narrowband_colorized_G_sat.val != par.narrowband_colorized_G_sat.def
          || par.narrowband_colorized_B_sat.val != par.narrowband_colorized_B_sat.def)
      {
            if (stepinfo != "") {
                  stepinfo = stepinfo + ", ";
            }
            stepinfo = stepinfo + "sat R " + par.narrowband_colorized_R_sat.val + ", G " + par.narrowband_colorized_G_sat.val + ", B " + par.narrowband_colorized_B_sat.val;
      }
      if (par.narrowband_colorized_R_weight.val != par.narrowband_colorized_R_weight.def
          || par.narrowband_colorized_G_weight.val != par.narrowband_colorized_G_weight.def
          || par.narrowband_colorized_B_weight.val != par.narrowband_colorized_B_weight.def)
      {
            if (stepinfo != "") {
                  stepinfo = stepinfo + ", ";
            }
            stepinfo = stepinfo + "weight R " + par.narrowband_colorized_R_weight.val + ", G " + par.narrowband_colorized_G_weight.val + ", B " + par.narrowband_colorized_B_weight.val;
      }
      if (par.narrowband_colorized_mapping.val != par.narrowband_colorized_mapping.def
          || par.narrowband_colorized_combine.val != par.narrowband_colorized_combine.def
          || par.narrowband_colorized_method.val != par.narrowband_colorized_method.def)
      {
            if (stepinfo != "") {
                  stepinfo = stepinfo + ", ";
            }
            stepinfo = stepinfo + "mapping " + par.narrowband_colorized_mapping.val + ", " + par.narrowband_colorized_combine.val + ", " + par.narrowband_colorized_method.val + ", linear fit " + par.narrowband_colorized_linear_fit.val;
      }
      if (stepinfo != "") {
            stepinfo = "Colorize " + stepinfo;
      } else {
            stepinfo = "Colorize defaults";
      }
      addExtraProcessingStep(stepinfo);

      var channel_images = engine.extraColorizedNarrowbandImages(imgWin);

      // close channel images
      for (var i = 0; i < channel_images.length; i++) {
            util.closeOneWindow(channel_images[i]);
      }
}

function findNarrowBandPalette(name)
{
      for (var i = 0; i < global.narrowBandPalettes.length; i++) {
            if (global.narrowBandPalettes[i].name == name) {
                  return global.narrowBandPalettes[i];
            }
      }
      util.throwFatalError("Could not find narrowband palette " + name);
      return null;
}

function useStretchedNarrowBandData(name)
{
      for (var i = 0; i < global.narrowBandPalettes.length; i++) {
            if (global.narrowBandPalettes[i].name == name) {
                  return global.narrowBandPalettes[i].stretched;
            }
      }
      return false;
}

// Run hue shift on narrowband image to shift red more to yellow/orange.
function narrowbandRedToOrangeHueShift(imgWin)
{
      util.addProcessingStepAndStatusInfo("Red hue shift to orange on " + imgWin.mainView.id);
      
      var P = new CurvesTransformation;
      P.H = [ // x, y
            [0.00000, 0.00000],
            [0.14614, 0.17400],
            [0.33990, 0.33400],
            [0.50082, 0.49800],
            [0.74713, 0.75000],
            [1.00000, 1.00000]
      ];
      
      imgWin.mainView.beginProcess(UndoFlag_NoSwapFile);

      P.executeOn(imgWin.mainView, false);

      imgWin.mainView.endProcess();

      engine_end_process(null);
}

// increase saturation on yellow/orange and blue
function narrowbandOrangeBlueSaturation(imgWin)
{
      util.addProcessingStepAndStatusInfo("Orange and blue color saturation on " + imgWin.mainView.id);

      var P = new ColorSaturation;
      P.HS = [ // x, y
            [0.00000, 0.00000],
            [0.19444, 0.51542],
            [0.32639, -0.01322],
            [0.69097, 0.77974],
            [0.88194, 0.01322],
            [1.00000, 0.00000]
      ];

      imgWin.mainView.beginProcess(UndoFlag_NoSwapFile);

      P.executeOn(imgWin.mainView, false);

      imgWin.mainView.endProcess();

      engine_end_process(null);
}

function extraOrangeBlueColors(imgWin)
{
      addExtraProcessingStep("Orange/blue colors");
      narrowbandRedToOrangeHueShift(imgWin);
      narrowbandOrangeBlueSaturation(imgWin);
}

function runExtraNarrowbandMapping(imgWin, source_palette_name, target_palette)
{
      console.writeln("runExtraNarrowbandMapping, from " + source_palette_name + " to " + target_palette.name);

      switch (source_palette_name) {
            case 'HOO':
                  var mappings = [
                        [ 'H', extractRGBchannel(imgWin.mainView.id, 'R') ], 
                        [ 'O', extractRGBchannel(imgWin.mainView.id, 'G') ]
                  ];
                  break;
            case 'SHO':
                  var mappings = [
                        [ 'S', extractRGBchannel(imgWin.mainView.id, 'R') ], 
                        [ 'H', extractRGBchannel(imgWin.mainView.id, 'G') ], 
                        [ 'O', extractRGBchannel(imgWin.mainView.id, 'B') ]
                  ];
                  break;
            default:
                  util.throwFatalError("Invalid source palette " + source_palette_name);
      }

      var RGBNB_R_mapping = target_palette.R;
      for (var i = 0; i < mappings.length; i++) {
            RGBNB_R_mapping = replaceMappingImageNamesExt(RGBNB_R_mapping, mappings[i][0], mappings[i][1], "", null, null);
      }
      var RGBNB_G_mapping = target_palette.G;
      for (var i = 0; i < mappings.length; i++) {
            RGBNB_G_mapping = replaceMappingImageNamesExt(RGBNB_G_mapping, mappings[i][0], mappings[i][1], "", null, null);
      }
      var RGBNB_B_mapping = target_palette.B;
      for (var i = 0; i < mappings.length; i++) {
            RGBNB_B_mapping = replaceMappingImageNamesExt(RGBNB_B_mapping, mappings[i][0], mappings[i][1], "", null, null);
      }

      runPixelMathRGBMapping(null, imgWin, RGBNB_R_mapping, RGBNB_G_mapping, RGBNB_B_mapping);

      for (var i = 0; i < mappings.length; i++) {
            util.closeOneWindowById(mappings[i][1]);
      }
      util.addProcessingStepAndStatusInfo("runExtraNarrowbandMapping, mapping complete");
}

function extraForaxx(imgWin, source_palette_name)
{
      addExtraProcessingStep("Foraxx mapping using " + source_palette_name + " palette");

      switch (source_palette_name) {
            case 'HOO':
                  var dynamic_palette = findNarrowBandPalette("Dynamic HOO");
                  break;
            case 'SHO':
                  var dynamic_palette = findNarrowBandPalette("Dynamic SHO");
                  break;
            default:
                  util.throwFatalError("Invalid Foraxx palette " + source_palette_name);
      }

      runExtraNarrowbandMapping(imgWin, source_palette_name, dynamic_palette);

      if (source_palette_name == 'SHO') {
            runSCNR(imgWin, false);
            extraOrangeBlueColors(imgWin);
      }
}

function extraNarrowbandMapping(imgWin, source_palette_name, target_palette_name)
{
      addExtraProcessingStep("Narrowband mapping from " + source_palette_name + " to " + target_palette_name);

      var target_palette = findNarrowBandPalette(target_palette_name);

      runExtraNarrowbandMapping(imgWin, source_palette_name, target_palette);
}

// Rename and save palette batch image
function narrowbandPaletteBatchFinalImage(palette_name, winId, extra)
{
      // rename and save image using palette name
      console.writeln("narrowbandPaletteBatchFinalImage:rename " + winId + " using " + palette_name);
      var palette_image = util.mapBadChars(palette_name);
      palette_image = ppar.win_prefix + "Auto_" + palette_image;
      if (extra) {
            palette_image = palette_image + "_extra";
      }
      palette_image = util.windowRenameKeepifEx(winId, palette_image, true, true);
      console.writeln("narrowbandPaletteBatchFinalImage:new name " + palette_image);
      // set final image keyword so it easy to save all file e.g. as 16 bit TIFF
      console.writeln("narrowbandPaletteBatchFinalImage:set final image keyword");
      setFinalImageKeyword(ImageWindow.windowById(palette_image));
      // save image
      console.writeln("narrowbandPaletteBatchFinalImage:save image " + palette_image);
      saveProcessedWindow(palette_image);
      util.addProcessingStep("Narrowband palette batch final image " + palette_image);
      return palette_image;
}

// Run through all narrowband palette options
function autointegrateNarrowbandPaletteBatch(parent, auto_continue)
{
      console.writeln("autointegrateNarrowbandPaletteBatch");
      if (par.use_narrowband_multiple_mappings.val) {
            var current_mappings = par.narrowband_multiple_mappings_list.val.split(",");
            for (var i = 0; i < current_mappings.length; i++) {
                  var found = false;
                  for (var j = 0; j < global.narrowBandPalettes.length; j++) {
                        if (current_mappings[i].trim() == global.narrowBandPalettes[j].name) {
                              found = true;
                              break;
                        }
                  }
                  if (!found) {
                        util.throwFatalError("Unknow narrowband mapping " + current_mappings[i].trim());
                  }
            }
      }
      var batch_image_cnt = 0;
      for (var i = 0; i < global.narrowBandPalettes.length; i++) {
            console.writeln("autointegrateNarrowbandPaletteBatch loop ", i);
            var run_this = false;
            if (par.use_narrowband_multiple_mappings.val) {
                  for (var j = 0; j < current_mappings.length; j++) {
                        if (global.narrowBandPalettes[i].name == current_mappings[j].trim()) {
                              run_this = true;
                              break;
                        }
                  }
            } else {
                  run_this = global.narrowBandPalettes[i].all;
            }
            if (run_this) {
                  if (auto_continue) {
                        util.ensureDialogFilePath("narrowband batch result files");
                        var txt = "Narrowband palette " + global.narrowBandPalettes[i].name + " batch autocontinue";
                  } else {
                        var txt = "Narrowband palette " + global.narrowBandPalettes[i].name + " batch run";
                  }
                  par.custom_R_mapping.val = global.narrowBandPalettes[i].R;
                  par.custom_G_mapping.val = global.narrowBandPalettes[i].G;
                  par.custom_B_mapping.val = global.narrowBandPalettes[i].B;
                  util.addProcessingStepAndStatusInfo("Narrowband palette " + global.narrowBandPalettes[i].name + " batch using " + par.custom_R_mapping.val + ", " + par.custom_G_mapping.val + ", " + par.custom_B_mapping.val);

                  flowchartReset();

                  var succ = engine.autointegrateProcessingEngine(parent, auto_continue, util.is_narrowband_option(), txt);
                  if (!succ) {
                        util.addProcessingStep("Narrowband palette batch could not process all palettes");
                  }
                  // rename and save the final image
                  var image_name = narrowbandPaletteBatchFinalImage(global.narrowBandPalettes[i].name, ppar.win_prefix + "AutoRGB", false);
                  util.batchWindowSetPosition(image_name, batch_image_cnt);
                  batch_image_cnt++;
                  if (util.findWindow(ppar.win_prefix + "AutoRGB_extra") != null) {
                        image_name = narrowbandPaletteBatchFinalImage(global.narrowBandPalettes[i].name, ppar.win_prefix + "AutoRGB_extra", true);
                        util.batchWindowSetPosition(image_name, batch_image_cnt);
                        batch_image_cnt++;
                  }
                  // next runs are always auto_continue
                  console.writeln("autointegrateNarrowbandPaletteBatch:set auto_continue = true");
                  auto_continue = true;
                  // close all but integrated images
                  console.writeln("autointegrateNarrowbandPaletteBatch:close all windows, keep integrated images");
                  engine.closeAllWindows(true, true);
            }
            if (global.cancel_processing) {
                  console.writeln("Processing cancelled!");
                  break;
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
      stars_id = findStarImageIdEx(starless_id, starless_id.replace(/starless_[1-9]*/g, "stars"), false);
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
            if (par.extra_combine_stars_image.val != "" && par.extra_combine_stars_image.val != 'Auto') {
                  stars_id = par.extra_combine_stars_image.val;           
            } else {
                  stars_id = findStarImageId(starless_id);
            }
      }
      if (stars_id == null) {
            util.throwFatalError("Could not find starless image for star image " + starless_id);
      }
      util.addProcessingStepAndStatusInfo("Combining " + starless_id + " and " + stars_id + " using " + stars_combine);
      switch (stars_combine) {
            case 'Screen':
                  var new_id = runPixelMathSingleMappingEx(
                                    starless_id, 
                                    "combine stars+starless",
                                    "combine(" + starless_id + ", " + stars_id + ", op_screen())",
                                    createNewImage);
                  break;
            case 'Lighten':
                  var new_id = runPixelMathSingleMappingEx(
                                    starless_id, 
                                    "combine stars+starless",
                                    "max(" + starless_id + ", " + stars_id + ")",
                                    createNewImage);
                  break;
            case 'Add':
            default:
                  var new_id = runPixelMathSingleMappingEx(
                                    starless_id, 
                                    "combine stars+starless",
                                    starless_id + " + " + stars_id,
                                    createNewImage);
                  break;
      }

      if (par.extra_combine_stars_reduce.val != 'None') {
            smallerStarsBillsPixelmathMethod(new_id, starless_id);
      }

      return new_id;
}

function extraAnnotateImage(extraWin, apply_directly)
{
      addExtraProcessingStep("Annotate image " + extraWin.mainView.id);

      let engine = new AnnotationEngine;
      engine.Init(extraWin);
      engine.graphicsScale = par.extra_annotate_image_scale.val;
      if (apply_directly) {
            engine.outputMode = Output_Overlay;
      }
      try {
            engine.Render();
      } catch (ex) {
            util.throwFatalError( "*** Annotate image error: " + ex.toString() );
      }

      var annotatedImgWin = util.findWindow(extraWin.mainView.id + "_Annotated");
      
      if (apply_directly) {
            extraWin.mainView.beginProcess(UndoFlag_NoSwapFile);
            extraWin.mainView.image.blend(util.getWindowBitmap(annotatedImgWin));
            extraWin.mainView.endProcess();
            util.closeOneWindow(annotatedImgWin);
      }

      return annotatedImgWin;
}

function extraAddSignature(extraWin)
{
      addExtraProcessingStep("Add signature " + par.extra_signature_path.val + " to image " + extraWin.mainView.id);

      if (par.extra_signature_path.val == "") {
            util.throwFatalError("No signature path specified");
      }

      var signatureWin = util.openImageWindowFromFile(par.extra_signature_path.val, true);

      var extra_bmp = util.getWindowBitmap(extraWin);
      console.writeln("extraAddSignature: extra_bmp " + extra_bmp.width + "x" + extra_bmp.height);
      var extra_height = extraWin.mainView.image.height;
      var signature_height = signatureWin.mainView.image.height;
      var signature_width = signatureWin.mainView.image.width;
      if (par.extra_signature_scale.val != 0) {
            var scale = (par.extra_signature_scale.val / 100) * extra_height / signature_height;
      } else {
            var scale = 1;
      }
      console.writeln("extraAddSignature: scale " + scale);
      var signature_bmp = util.getWindowBitmap(signatureWin).scaledTo(scale * signature_width, scale * signature_height);
      console.writeln("extraAddSignature: scaled signature_bmp " + signature_bmp.width + "x" + signature_bmp.height);

      var graphics = new Graphics(extra_bmp);
      switch (par.extra_signature_position.val) {
            case 'Top left':
                  var signature_x = 0;
                  var signature_y = 0;
                  break;
            case 'Top middle':
                  var signature_x = (extra_bmp.width - signature_bmp.width) / 2;
                  var signature_y = 0;
                  break;
            case 'Top right':
                  var signature_x = extra_bmp.width - signature_bmp.width;
                  var signature_y = 0;
                  break;
            case 'Bottom left':
                  var signature_x = 0;
                  var signature_y = extra_height - signature_bmp.height;
                  break;
            case 'Bottom middle':
                  var signature_x = (extra_bmp.width - signature_bmp.width) / 2;
                  var signature_y = extra_height - signature_bmp.height;
                  break;
            case 'Bottom right':
                  var signature_x = extra_bmp.width - signature_bmp.width;
                  var signature_y = extra_height - signature_bmp.height;
                  break;
            default:
                  util.throwFatalError("Invalid signature position " + par.extra_signature_position.val);
                  break;
      }
      graphics.drawBitmap(signature_x, signature_y, signature_bmp);
      console.writeln("extraAddSignature: drawBitmap " + signature_bmp.width + "x" + signature_bmp.height + " at 0, " + (extra_height - signature_bmp.height));
      graphics.end();

      extraWin.mainView.beginProcess(UndoFlag_NoSwapFile);
      extraWin.mainView.image.blend(extra_bmp);
      extraWin.mainView.endProcess();

      util.closeOneWindow(signatureWin);

      return extraWin;
}

function extraRotate(imgWin)
{
      addExtraProcessingStep("Rotate image " + imgWin.mainView.id + " " + par.extra_rotate_degrees.val + " degrees");

      var P = new FastRotation;
      switch (par.extra_rotate_degrees.val) {
            case '90':
                  P.mode = FastRotation.prototype.Rotate90CW;
                  break;
            case '180':
                  P.mode = FastRotation.prototype.Rotate180;
                  break;
            case '-90':
                  P.mode = FastRotation.prototype.Rotate90CCW;
                  break;
            default:
                  util.throwFatalError("Invalid rotate degrees " + par.extra_rotate_degrees.val);
                  break;
      }
      P.noGUIMessages = true;

      imgWin.mainView.beginProcess(UndoFlag_NoSwapFile);

      P.executeOn(imgWin.mainView, false);

      imgWin.mainView.endProcess();
}

function find_range_mask()
{
      var mask_win = util.findWindow('range_mask');
      if (mask_win == null) {
            util.throwFatalError("Could not find range_mask");
      }
      return mask_win;
}

function extraOptionCompleted(param)
{
      console.writeln("extraOptionCompleted " + param.name);
      if (par.extra_auto_reset.val && engine.extraApply) {
            if (param.reset != undefined) {
                  console.writeln("extraOptionCompleted reset " + param.name);
                  param.val = false;
                  param.reset();
            }
      }
      util.addProcessingStepAndStatusInfo("Completed: " + global.extra_processing_info[global.extra_processing_info.length - 1]);
      checkCancel();
}

function extraProcessing(parent, id, apply_directly)
{
      console.noteln("Extra processing " + id + ", apply directly " + apply_directly);

      global.extra_processing_info = [];

      var extra_id = id;
      var extra_stars_id = null;
      var extra_starless_id = null;
      var need_L_mask = par.extra_darker_background.val || 
                        par.extra_darker_hightlights.val ||
                        par.extra_ET.val || 
                        par.extra_HDRMLT.val || 
                        par.extra_LHE.val ||
                        (par.extra_noise_reduction.val && !(par.use_noisexterminator.val || par.use_graxpert_denoise.val || par.use_deepsnr.val)) ||
                        par.extra_ACDNR.val ||
                        (par.extra_sharpen.val && !par.use_blurxterminator.val && !par.use_graxpert_deconvolution.val) ||
                        par.extra_unsharpmask.val ||
                        (par.extra_highpass_sharpen.val && !par.extra_highpass_sharpen_combine_only.val) ||
                        par.extra_saturation.val ||
                        (par.extra_clarity.val && par.extra_clarity_mask.val);

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

      if (par.extra_rotate.val) {
            extraRotate(extraWin);
            extraOptionCompleted(par.extra_rotate);
      }

      if (par.extra_stretch.val) {
            extraWin = extraStretch(extraWin);
            extraOptionCompleted(par.extra_stretch);
      }
      if (par.extra_autostf.val) {
            extraWin = extraAutoSTF(extraWin);
            extraOptionCompleted(par.extra_autostf);
      }
      if (process_narrowband) {
            if (par.run_foraxx_mapping.val) {
                  extraForaxx(extraWin, par.foraxx_palette.val);
                  extraOptionCompleted(par.run_foraxx_mapping);
            }
            if (par.run_extra_narrowband_mapping.val) {
                  extraNarrowbandMapping(extraWin, par.extra_narrowband_mapping_source_palette.val, par.extra_narrowband_mapping_target_palette.val);
                  extraOptionCompleted(par.run_extra_narrowband_mapping);
            }
            if (par.run_orangeblue_colors.val) {
                  extraOrangeBlueColors(extraWin);
                  extraOptionCompleted(par.run_orangeblue_colors);
            }
            if (par.run_orange_hue_shift.val) {
                  extraNarrowbandOrangeHueShift(extraWin.mainView);
                  extraOptionCompleted(par.run_orange_hue_shift);
            }
            if (par.run_hue_shift.val) {
                  extraSHOHueShift(extraWin);
                  extraOptionCompleted(par.run_hue_shift);
            }
            if (par.run_colorized_narrowband.val) {
                  extraColorizedNarrowband(extraWin);
                  extraOptionCompleted(par.run_colorized_narrowband);
            }
            if (par.leave_some_green.val) {
                  addExtraProcessingStep("Leave some green, amount " + par.leave_some_green_amount.val);
                  runSCNR(extraWin, false);
                  extraOptionCompleted(par.run_narrowband_SCNR);
                  extraOptionCompleted(par.leave_some_green);
            } else if (par.run_narrowband_SCNR.val) {
                  addExtraProcessingStep("Remove green cast");
                  runSCNR(extraWin, false);
                  extraOptionCompleted(par.run_narrowband_SCNR);
                  extraOptionCompleted(par.leave_some_green);
            }
            if (par.remove_magenta_color.val) {
                  extraRemoveMagentaColor(extraWin);
                  extraOptionCompleted(par.remove_magenta_color);
            }
            if (par.fix_narrowband_star_color.val) {
                  extraFixNarrowbandStarColor(extraWin);
                  extraOptionCompleted(par.fix_narrowband_star_color);
            }
      }
      if (par.extra_remove_stars.val) {
            let res = extraRemoveStars(parent, extraWin, apply_directly);
            extraWin = res.starless_win;
            extra_starless_id = extraWin.mainView.id;
            extra_stars_id = res.stars_id;
            console.writeln("extra_starless_id " + extra_starless_id + ", extra_stars_id " + extra_stars_id);
            extraOptionCompleted(par.extra_remove_stars);
      }
      if (par.extra_fix_star_cores.val) {
            addExtraProcessingStep("Fix star cores");
            extraFixStarCores(extraWin);
            extraOptionCompleted(par.extra_fix_star_cores);
      }
      if (par.extra_ha_mapping.val) {
            addExtraProcessingStep("Ha mapping");
            extraHaMapping(extraWin);
            extraOptionCompleted(par.extra_ha_mapping);
      }
      if (par.extra_smoothbackground.val) {
            extraSmoothBackground(extraWin, par.extra_smoothbackgroundval.val, par.extra_smoothbackgroundfactor.val);
            extraOptionCompleted(par.extra_smoothbackground);
      }
      if (par.extra_banding_reduction.val) {
            extraBandingReduction(extraWin);
            extraOptionCompleted(par.extra_banding_reduction);
      }
      if (par.extra_GC.val) {
            let abe_id = extraGradientCorrection(extraWin);
            extraWin = ImageWindow.windowById(abe_id);
            extraOptionCompleted(par.extra_GC);
      }
      if (need_L_mask) {
            // Try find mask window
            // If we need to create a mask do it after we
            // have removed the stars
            if (par.extra_range_mask.val) {
                  mask_win = find_range_mask();
            } else if (par.extra_force_new_mask.val) {
                  mask_win = null;
            } else {
                  mask_win = maskIsCompatible(extraWin, mask_win);
                  if (mask_win == null) {
                        mask_win = maskIsCompatible(extraWin, util.findWindow(ppar.win_prefix +"AutoMask"));
                  }
            }
            if (mask_win == null) {
                  mask_win_id = ppar.win_prefix + "AutoMask";
                  util.closeOneWindowById(mask_win_id);
                  flowchartMaskBegin("New mask:extra");
                  mask_win = newMaskWindow(extraWin, mask_win_id, false);
                  flowchartMaskEnd("New mask:extra");
            }
            console.writeln("Use mask " + mask_win.mainView.id);
      }
      if (par.extra_shadowclipping.val) {
            extraAdjustShadows(extraWin, par.extra_shadowclippingperc.val);
            extraOptionCompleted(par.extra_shadowclipping);
      }
      if (par.extra_darker_background.val) {
            extraDarkerBackground(extraWin, mask_win);
            extraOptionCompleted(par.extra_darker_background);
      }
      if (par.extra_darker_hightlights.val) {
            extraDarkerHighlights(extraWin, mask_win);
            extraOptionCompleted(par.extra_darker_hightlights);
      }
      if (par.extra_shadow_enhance.val) {
            extraEnhanceShadows(extraWin);
            extraOptionCompleted(par.extra_shadow_enhance);
      }
      if (par.extra_highlight_enhance.val) {
            extraEnhanceHighlights(extraWin);
            extraOptionCompleted(par.extra_highlight_enhance);
      }
      if (par.extra_gamma.val) {
            extraGamma(extraWin);
            extraOptionCompleted(par.extra_gamma);
      }
      if (par.extra_normalize_channels.val) {
            extraNormalizeImage(extraWin);
            extraOptionCompleted(par.extra_normalize_channels);
      }
      if (par.extra_adjust_channels.val) {
            extraAdjustChannels(extraWin);
            extraOptionCompleted(par.extra_adjust_channels);
      }
      if (par.extra_ET.val) {
            extraExponentialTransformation(extraWin, mask_win);
            extraOptionCompleted(par.extra_ET);
      }
      if (par.extra_HDRMLT.val) {
            extraHDRMultiscaleTransform(extraWin, mask_win);
            extraOptionCompleted(par.extra_HDRMLT);
      }
      if (par.extra_LHE.val) {
            extraLocalHistogramEqualization(extraWin, mask_win);
            extraOptionCompleted(par.extra_LHE);
      }
      if (par.extra_contrast.val) {
            addExtraProcessingStep("Increase contrast, iterations " + par.extra_contrast_iterations.val);
            for (var i = 0; i < par.extra_contrast_iterations.val; i++) {
                  extraContrast(extraWin);
            }
            extraOptionCompleted(par.extra_contrast);
      }
      if (par.extra_auto_contrast.val) {
            extraAutoContrast(extraWin, par.extra_auto_contrast_limit_low.val, par.extra_auto_contrast_limit_high.val, par.extra_auto_contrast_channels.val);
            extraOptionCompleted(par.extra_auto_contrast);
      }
      if (par.extra_noise_reduction.val) {
            extraNoiseReduction(extraWin, mask_win);
            extraOptionCompleted(par.extra_noise_reduction);
      }
      if (par.extra_ACDNR.val) {
            extraACDNR(extraWin, mask_win);
            extraOptionCompleted(par.extra_ACDNR);
      }
      if (par.extra_color_noise.val) {
            extraColorNoise(extraWin);
            extraOptionCompleted(par.extra_color_noise);
      }
      if (par.extra_unsharpmask.val) {
            extraUnsharpMask(extraWin, mask_win);
            extraOptionCompleted(par.extra_unsharpmask);
      }
      if (par.extra_sharpen.val) {
            extraSharpen(extraWin, mask_win);
            extraOptionCompleted(par.extra_sharpen);
      }
      if (par.extra_highpass_sharpen.val) {
            extraHighPassSharpen(extraWin, mask_win);
            extraOptionCompleted(par.extra_highpass_sharpen);
      }
      if (par.extra_saturation.val) {
            extraSaturation(extraWin, mask_win);
            extraOptionCompleted(par.extra_saturation);
      }
      if (par.extra_clarity.val) {
            extraClarity(extraWin, mask_win);
            extraOptionCompleted(par.extra_clarity);
      }
      if (par.extra_smaller_stars.val) {
            if (par.extra_remove_stars.val) {
                  extraSmallerStars(ImageWindow.windowById(extra_stars_id), true);
            } else {
                  extraSmallerStars(extraWin, false);
            }
            extraOptionCompleted(par.extra_smaller_stars);
      }
      if (par.extra_star_noise_reduction.val) {
            addExtraProcessingStep("Star noise reduction");
            if (par.extra_remove_stars.val) {
                  starReduceNoise(ImageWindow.windowById(extra_stars_id));
            } else {
                  starReduceNoise(extraWin);
            }
            extraOptionCompleted(par.extra_star_noise_reduction);
      }
      if (par.extra_combine_stars.val) {
            /* Restore stars by combining starless image and stars. */
            addExtraProcessingStep("Combine stars and starless images using " + par.extra_combine_stars_mode.val + ", reduce stars by " + par.extra_combine_stars_reduce.val);
            var new_image_id = combineStarsAndStarless(
                                    par.extra_combine_stars_mode.val,
                                    extraWin.mainView.id, // starless
                                    extra_stars_id);
            // Close original window that was created before stars were removed
            util.closeOneWindowById(extra_id);
            // restore original final image name
            var new_name = extra_id;
            console.writeln("Rename " + new_image_id + " as " + new_name);
            util.windowRename(new_image_id, new_name);
            extraWin = ImageWindow.windowById(new_name);
            extraWin.show();
            extraOptionCompleted(par.extra_combine_stars);
      }
      if (par.extra_color_calibration.val) {
            addExtraProcessingStep("Color calibration");
            runColorCalibrationProcess(extraWin);
            extraOptionCompleted(par.extra_color_calibration);
      }
      if (par.extra_solve_image.val) {
            addExtraProcessingStep("Image solver");
            runImageSolver(extraWin.mainView.id);
            extraOptionCompleted(par.extra_solve_image);
      }
      if (par.extra_annotate_image.val) {
            addExtraProcessingStep("Annotate image");
            let annotatedImgWin = extraAnnotateImage(extraWin, apply_directly);
            if (!apply_directly) {
                  // There is a new window with the annotated image
                  extraWin = annotatedImgWin;
            }
            extraOptionCompleted(par.extra_annotate_image);
      }
      if (par.extra_signature.val) {
            addExtraProcessingStep("Add signature");
            extraAddSignature(extraWin);
            extraOptionCompleted(par.extra_signature);
      }
      extra_id = extraWin.mainView.id;
      if (apply_directly) {
            var final_win = ImageWindow.windowById(extraWin.mainView.id);
            guiUpdatePreviewWin(final_win);
            saveExtraProcessingHistoryToImage(final_win);
            setFinalImageKeyword(final_win);
      } else {
            var final_win = ImageWindow.windowById(extra_id);
            guiUpdatePreviewWin(final_win);
            saveExtraProcessingHistoryToImage(final_win);
            setFinalImageKeyword(final_win);
            saveProcessedWindow(extra_id); /* Extra window */
            if (par.extra_remove_stars.val) {
                  saveProcessedWindow(extra_starless_id);      /* Extra starless window */
                  saveProcessedWindow(extra_stars_id);         /* Extra stars window */
            }
      }
      console.writeln("Extra processing done " + extra_id);

      return [ extra_id, extra_starless_id, extra_stars_id ];

}

/* Copy gradient corrected channel images to map images.
 */
function copyGCtoMapImage(win, base_id)
{
      var map_id = ppar.win_prefix + base_id + "_map";
      console.writeln("copyGCtoMapImage: " + win.mainView.id + " to " + map_id);
      util.copyWindow(win, map_id);
      global.temporary_windows[global.temporary_windows.length] = map_id;
      return map_id;
}

/* Map gradient corrected channel images to start images.
 */
function mapGCchannels()
{
      if (L_GC_start_win != null) {
            L_id = copyGCtoMapImage(L_GC_start_win, "Integration_L");
      }
      if (R_GC_start_win != null) {
            R_id = copyGCtoMapImage(R_GC_start_win, "Integration_R");
      }
      if (G_GC_start_win != null) {
            G_id = copyGCtoMapImage(G_GC_start_win, "Integration_G");
      }
      if (B_GC_start_win != null) {
            B_id = copyGCtoMapImage(B_GC_start_win, "Integration_B");
      }
      if (H_GC_start_win != null) {
            H_id = copyGCtoMapImage(H_GC_start_win, "Integration_H");
      }
      if (S_GC_start_win != null) {
            S_id = copyGCtoMapImage(S_GC_start_win, "Integration_S");
      }
      if (O_GC_start_win != null) {
            O_id = copyGCtoMapImage(O_GC_start_win, "Integration_O");
      }
      if (RGB_GC_start_win != null) {
            RGB_id = copyGCtoMapImage(RGB_GC_start_win, "Integration_RGB");
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

function pointIsValidCrop(p)
{
      if (par.crop_use_rejection_low.val) {
            return p <= par.crop_rejection_low_limit.val;
      } else {
            return p > 0.0;
      }
}

// Find borders starting from a mid point and going up/down
function find_up_down(image,col)
{
      let row_mid = Math.floor(image.height / 2);
      let row_up = 0;
      let cnt = 0;
      for (let row=row_mid; row>=0; row--) {
            let p = image.sample(col, row);
            if (!pointIsValidCrop(p)) {
                  cnt++;
                  console.writeln("find up: non-valid pixel at col ", col, " row ", row, " cnt ", cnt, " p ", p);
            } else {
                  cnt = 0;
            }
            if (cnt > par.crop_tolerance.val) {
                  row_up = row+1;
                  console.writeln("find up: over tolerance value ", par.crop_tolerance.val, " crop edge at row ", row_up, " (", row_up, " pixels from top)");
                  break;
            }
      }
      let row_down = image.height-1;
      cnt = 0;
      for (let row=row_mid; row<image.height; row++) {
            let p = image.sample(col, row);
            if (!pointIsValidCrop(p)) {
                  cnt++;
                  console.writeln("find down: non-valid pixel at col ", col, " row ", row, " cnt ", cnt, " p ", p);
            } else {
                  cnt = 0;
            }
            if (cnt > par.crop_tolerance.val) {
                  row_down = row-1;
                  console.writeln("find down: over tolerance value ", par.crop_tolerance.val, " crop edge at row ", row_down, " (", image.height-1-row_down, " pixels from bottom)");
                  break;
            }
      }
      if (par.debug.val) console.writeln("DEBUG find_up_down: at col ", col," extent up=", row_up, ", down=", row_down);
      return [row_up, row_down];
}

// Find borders starting from a mid point and going left/right
function find_left_right(image,row)
{
      let col_mid = Math.floor(image.width / 2);
      let col_left = 0;
      let cnt = 0;
      for (let col=col_mid; col>=0; col--) {
            let p = image.sample(col, row);
            if (!pointIsValidCrop(p)) {
                  cnt++;
                  console.writeln("find left: non-valid pixel at col ", col, " row ", row, " cnt ", cnt, " p ", p);
            } else {
                  cnt = 0;
            }
            if (cnt > par.crop_tolerance.val) {
                  console.writeln("find left: over tolerance value ", par.crop_tolerance.val, " crop edge at col ", col_left, " (", col_left, " pixels from left)");
                  col_left = col+1;
                  break;
            }
      }
      let col_right = image.width-1;
      for (let col=col_mid; col<image.width; col++) {
            let p= image.sample(col, row);
            if (!pointIsValidCrop(p)) {
                  cnt++;
                  console.writeln("find right: non-valid pixel at col ", col, " row ", row, " cnt ", cnt);
            } else {
                  cnt = 0;
            }
            if (cnt > par.crop_tolerance.val) {
                  col_right = col-1;
                  console.writeln("find right: over tolerance value ", par.crop_tolerance.val, " crop edge at col ", col_right, " (", image.width-1-col_right, " pixels from right)");
                  break;
            }
      }
      if (par.debug.val) console.writeln("DEBUG find_left_right: at row ", row," extent left=", col_left, ", right=", col_right);
      return [col_left, col_right];
}

function findMaximalBoundingBox(lowClipImage)
{
      let col_mid = Math.floor(lowClipImage.width / 2);
      let row_mid = Math.floor(lowClipImage.height / 2);
      if (par.debug.val) {
            console.writeln("DEBUG findMaximalBoundingBox col_mid=",col_mid,",row_mid=",row_mid);
      }

      // Check that the starting point is valid
      let p = lowClipImage.sample(col_mid, row_mid);
      if (!pointIsValidCrop(p)) {
            col_mid = Math.floor(lowClipImage.width / 2) + 10;
            row_mid = Math.floor(lowClipImage.height / 2) + 10;
            p = lowClipImage.sample(col_mid, row_mid);
      }
      if (!pointIsValidCrop(p)) {
            col_mid = Math.floor(lowClipImage.width / 2) - 10;
            row_mid = Math.floor(lowClipImage.height / 2) - 10;
            p = lowClipImage.sample(col_mid, row_mid);
      }
      if (p > par.crop_rejection_low_limit.val) {
            // Could also accept a % of rejection
            return { box: null, crop_errors: "Middle pixel not valid in integration of lowest value for Crop, possibly not enough overlap" };
      }

      // Find extent of black area at mid points (the black points nearest to the border)
      var [top,bottom] = find_up_down(lowClipImage,col_mid);
      var [left,right] = find_left_right(lowClipImage,row_mid);

      if (par.debug.val) {
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
function findBounding_box(lowClipImageWindow)
{
      let image = lowClipImageWindow.mainView.image;
      let crop_success = true;
      let crop_errors = "";

      console.noteln("Finding valid bounding box for image ", lowClipImageWindow.mainView.id, 
            " (", image.width, "x" , image.height + ")");

      let res = findMaximalBoundingBox(image);
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

      left_top_valid = pointIsValidCrop(image.sample(left_top));
      right_top_valid =  pointIsValidCrop(image.sample(right_top));
      left_bottom_valid =  pointIsValidCrop(image.sample(left_bottom));
      right_bottom_valid =  pointIsValidCrop(image.sample(right_bottom));

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
                                    left_top_valid = pointIsValidCrop(image.sample(left_top)); 
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
                                    right_bottom_valid = pointIsValidCrop(image.sample(right_bottom)); 
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
                                    left_bottom_valid = pointIsValidCrop(image.sample(left_bottom)); 
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
                                    right_top_valid = pointIsValidCrop(image.sample(right_top)); 
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

      // Show the valid points for par.debug.val - NOTE: The borders may be smaller as once a point is found as valid, it is not
      // recalculated.
      if (par.debug.val) console.writeln("DEBUG findBounding_box - valid points LT=",left_top,",RT=",right_top,",LB=",left_bottom,",RB=",right_bottom)

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
                  left_col_valid = left_col_valid && pointIsValidCrop(image.sample(left_col,i));
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
                  right_col_valid = right_col_valid && pointIsValidCrop(image.sample(right_col,i));
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
                  top_row_valid = top_row_valid && pointIsValidCrop(image.sample(i,top_row));
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
                  bottom_row_valid = bottom_row_valid && pointIsValidCrop(image.sample(i,bottom_row));
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
function CropImageIf(id)
{
      if (par.debug.val) console.writeln("CropImageIf ", id);
      var window = util.findWindow(id);
      var truncate_amount = crop_truncate_amount;
      if (window == null) { 
            return false;
      }
      if (truncate_amount == null) {
            return false;
      }
      if (util.findKeywordName(window, "AutoCrop")) {
            console.writeln("Image ", window.mainView.id, " already cropped, skipping crop");
            return true;
      }
      var node = flowchartOperation("Crop");
      if (global.get_flowchart_data) {
            util.setFITSKeyword(window, "AutoCrop", "true", "Image cropped by AutoIntegrate");
            return true;
      }

      let [left_truncate,top_truncate,right_truncate,bottom_truncate] = truncate_amount;
      console.writeln("Truncate image ", window.mainView.id, " by: top ", top_truncate, ", bottom, ", 
            bottom_truncate, ", left ", left_truncate, ", right ",right_truncate);
      
      let crop = CreateCrop(left_truncate,top_truncate,right_truncate,bottom_truncate);

      window.mainView.beginProcess(UndoFlag_NoSwapFile);  
      crop.executeOn(window.mainView, false);  
      window.mainView.endProcess();

      // Add keyword to indicate that the image has been cropped
      util.setFITSKeyword(window, "AutoCrop", "true", "Image cropped by AutoIntegrate");

      engine_end_process(node, window, "Crop");

      if (par.save_cropped_images.val) {
            var win_id = window.mainView.id;
            var crop_id = util.replacePostfixOrAppend(win_id, ["_map"], "_crop");
            console.writeln("Save cropped image " + win_id + " as " + crop_id);
            util.copyWindowEx(window, crop_id, true);
            save_id_list.push([win_id, crop_id]);
      }

      return true;
}

function calculate_crop_amount(lowClipImageName, integratedImageName, crop_auto_continue)
{
      let crop_errors = "";
      let lowClipImageWindow = util.findWindowOrFile(lowClipImageName);
      if (lowClipImageWindow == null) {
            util.throwFatalError("Crop failed to find image " + lowClipImageName);
      }
      let integratedImageWindow = util.findWindow(integratedImageName);
      if (integratedImageWindow == null) {
            util.throwFatalError("Crop failed to find image " + integratedImageWindow);
      }

      if (crop_auto_continue && !par.cropinfo_only.val) {
            let preview = lowClipImageWindow.previewById("crop");
            if (preview.isNull) {
                  util.throwFatalError("Error: crop preview not found from " + lowClipImageWindow.mainView.id);
            }
            var rect = lowClipImageWindow.previewRect(preview);
            var success = true;
            var bounding_box = [ rect.x0, rect.x1, rect.y0, rect.y1 ];
            console.writeln("Using crop preview bounding box " + JSON.stringify(bounding_box));
      } else {
            var res = findBounding_box(lowClipImageWindow);
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
            if (par.cropinfo_only.val && lowClipImageName != integratedImageName) {
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
      if (x_truncate_percent > par.crop_check_limit.val || y_truncate_percent > par.crop_check_limit.val || area_truncate_percent > par.crop_check_limit.val) {
            if (crop_errors != "") {
                  crop_errors = crop_errors + "\n";
            }      
            crop_errors = crop_errors + "Warning: Cropped more than " + par.crop_check_limit.val + "% of the image, please check the crop preview. " + crop_suggestion_txt;
            crop_errors = crop_errors + "\n" + "Warning: " + txt;
      } else {
            console.noteln(txt);
      }

      return { success: success,  truncate_amount: truncate_amount, crop_errors: crop_errors };
}

// Find the crop area and crop all channel images
function createCropInformationEx()
{
      // Make integration low
      let all_images = make_full_image_list();
      console.noteln("Finding common area for ",all_images.images.length, " images (all channels) ")
      let images = all_images.images;
      if (images == null || images.length == 0) {
            return;
      }
      if (global.get_flowchart_data) {
            crop_truncate_amount = "Yes";
            crop_lowClipImageName = ppar.win_prefix + "LowRejectionMap_ALL";
            return;
      }

      var res = runImageIntegrationForCrop(images);

      if (par.crop_use_rejection_low.val && !global.get_flowchart_data) {
            /* Use low rejection map to calculate crop. 
             */
            let integratedImageName = res.integrated_image_id;
            let integratedImageWindow = util.findWindow(integratedImageName);
            if (integratedImageWindow == null) {
                  util.throwFatalError("Crop failed to find image " + integratedImageName);
            }
            let lowClipImageName = res.rejection_map_id;
            let lowClipImageWindow = util.findWindow(lowClipImageName);
            if (lowClipImageWindow == null) {
                  util.throwFatalError("Crop failed to find image " + lowClipImageName);
            }
            var res = calculate_crop_amount(lowClipImageName, integratedImageName, false);
            if (res.success) {
                  util.addWarningStatus(res.crop_errors);
            } else {      
                  util.addCriticalStatus(res.crop_errors);
                  util.addCriticalStatus("No cropping done. "+ crop_suggestion_txt); 
            }

            if (!par.cropinfo_only.val) {
                  // Close low rejection map window
                  util.closeOneWindow(lowClipImageWindow);
            }

            crop_truncate_amount = res.truncate_amount;
            crop_lowClipImageName = integratedImageName; // crop info is saved to integrated image

      } else {
            /* Use integrated image to calculate crop. 
             */
            let lowClipImageName = res.integrated_image_id;
            let lowClipImageWindow = util.findWindow(lowClipImageName);
            if (lowClipImageWindow == null) {
                  util.throwFatalError("Crop failed to find image " + lowClipImageName);
            }

            // Make a copy of the integrated image
            lowClipImageWindowCopy = util.copyWindowEx(lowClipImageWindow, util.ensure_win_prefix(lowClipImageName + "_tmp"), true);

            var res = calculate_crop_amount(lowClipImageWindowCopy.mainView.id, lowClipImageWindowCopy.mainView.id, false);
            if (!res.success) {
                  // Try with noise reduction
                  console.noteln("Crop failed, trying with noise reduction for cropped image");
                  // Close copy image since we have added crop preview into image
                  util.closeOneWindow(lowClipImageWindowCopy);
                  // Make a new copy
                  lowClipImageWindowCopy = util.copyWindowEx(lowClipImageWindow, util.ensure_win_prefix(lowClipImageName + "_tmp2"), true);
                  // Run noise reduction
                  runMultiscaleLinearTransformReduceNoise(lowClipImageWindowCopy, null, 4);
                  // Crop again
                  res = calculate_crop_amount(lowClipImageWindowCopy.mainView.id, lowClipImageWindowCopy.mainView.id, false);
                  if (res.success) {
                        util.addWarningStatus("Crop succeeded after noise reduction but please check the crop amount in file " + lowClipImageName + ". If needed, adjust the crop manually and rerun the script using AutoContinue.");
                  }
            }
            if (res.success) {
                  util.addWarningStatus(res.crop_errors);
            } else {      
                  util.addCriticalStatus(res.crop_errors);
                  util.addCriticalStatus("No cropping done. " + crop_suggestion_txt); 
            }

            // Close original window
            util.closeOneWindow(lowClipImageWindow);

            // Rename copy to original name
            lowClipImageWindowCopy.mainView.id = lowClipImageName;

            crop_truncate_amount = res.truncate_amount;
            crop_lowClipImageName = lowClipImageName;       // save the name for saving to disk
      }
      // Autostretch for the convenience of the user
      ApplyAutoSTF(
            util.findWindow(crop_lowClipImageName).mainView,
            DEFAULT_AUTOSTRETCH_SCLIP,
            DEFAULT_AUTOSTRETCH_TBGND,
            false,
            false);
      
      save_id_list.push([crop_lowClipImageName, crop_lowClipImageName]);  /* LowRejectionMap_ALL */
      crop_lowClipImage_changed = false;

      console.noteln("Generated data for cropping");
}

function createCropInformation()
{
      util.addProcessingStepAndStatusInfo("Cropping all channel images to fully integrated area");

      createCropInformationEx();

      /* Luminance image may have been copied earlier in CreateChannelImages()
       * so we try to crop it here.
       */
      if (luminance_id != null) {
            flowchartParentBegin("L");
            flowchartChildBegin("L");
            if (CropImageIf(luminance_id)) {
                  if (0) {
                        // Do not save cropped luminance image, it can be saved with Save cropped images option.
                        // For stretching, it is better to use _processed images.
                        let L_win_crop = util.copyWindow(util.findWindow(luminance_id), util.ensure_win_prefix("Integration_L_crop"));
                        luminance_crop_id = L_win_crop.mainView.id;
                  }
            }
            flowchartChildEnd("L");
            flowchartParentEnd("L");
      }
}

function findCropInformationAutoContinue()
{
      util.addProcessingStepAndStatusInfo("Cropping all channel images to fully integrated area in AutoContinue");
      let lowClipImageName = autocontinue_prefix + "LowRejectionMap_ALL";
      crop_lowClipImageName = lowClipImageName;       // save the name for minimizing
      var res = calculate_crop_amount(lowClipImageName, lowClipImageName, true);
      crop_truncate_amount = res.truncate_amount;
      if (res.success) {
            util.addWarningStatus(res.crop_errors);
      } else {
            util.addCriticalStatus(res.crop_errors);
      }
}

function createCropInformationAutoContinue()
{
      if (preprocessed_images != global.start_images.RGB
          && preprocessed_images != global.start_images.L_R_G_B)
      {
            console.writeln("Crop ignored in AutoContinue, only integrated channel images can be cropped.") ;
            return;
      }
      findCropInformationAutoContinue();
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
       if (engine.biasFileNames == null) {
             engine.biasFileNames = [];
       }
       if (engine.flatdarkFileNames == null) {
             engine.flatdarkFileNames = [];
       }
       if (engine.flatFileNames == null) {
             engine.flatFileNames = [];
       }
       if (engine.darkFileNames == null) {
             engine.darkFileNames = [];
       }
       if (engine.biasFileNames.length == 0
           && engine.flatdarkFileNames.length == 0
           && engine.flatFileNames.length == 0
           && engine.darkFileNames.length == 0)
       {
             // do not calibrate
             util.addProcessingStep("calibrateEngine, no bias, flat or dark files");
             return [ engine.lightFileNames , '' ];
       }
 
       util.addProcessingStepAndStatusInfo("Image calibration");
 
       util.ensureDir(global.outputRootDir);
       util.ensureDir(util.combinePath(global.outputRootDir, global.AutoMasterDir));
       util.ensureDir(util.combinePath(global.outputRootDir, global.AutoOutputDir));
       util.ensureDir(util.combinePath(global.outputRootDir, global.AutoCalibratedDir));
 
       if (global.get_flowchart_data) {
            // Filter files for global.get_flowchart_data.
            engine.flatFileNames = flowchartFilterFiles(engine.flatFileNames, global.pages.FLATS);
      }

       // Collect filter files
       var filtered_flats = engine.getFilterFiles(engine.flatFileNames, global.pages.FLATS, '');
 
       is_color_files = filtered_flats.color_files;
 
       if (engine.flatFileNames.length > 0 && engine.lightFileNames.length > 0) {
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
             util.addProcessingStep("calibrateEngine use existing master bias files " + engine.biasFileNames);
             var masterbiasPath = engine.biasFileNames;
       } else if (engine.biasFileNames.length == 1) {
             util.addProcessingStep("calibrateEngine use existing master bias " + engine.biasFileNames[0]);
             var masterbiasPath = engine.biasFileNames[0];
       } else if (engine.biasFileNames.length > 0) {
             util.addProcessingStep("calibrateEngine generate master bias using " + engine.biasFileNames.length + " files");
             // integrate bias images
             var biasimages = filesForImageIntegration(engine.biasFileNames);
             var masterbiasid = runImageIntegrationBiasDarks(biasimages, ppar.win_prefix + "AutoMasterBias", "bias");
 
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
             util.addProcessingStep("calibrateEngine use existing master flat dark files " + engine.flatdarkFileNames);
             var masterflatdarkPath = engine.darkFileNames;
       } else if (engine.flatdarkFileNames.length == 1) {
             util.addProcessingStep("calibrateEngine use existing master flat dark " + engine.flatdarkFileNames[0]);
             var masterflatdarkPath = engine.flatdarkFileNames[0];
       } else if (engine.flatdarkFileNames.length > 0) {
             util.addProcessingStep("calibrateEngine generate master flat dark using " + engine.flatdarkFileNames.length + " files");
             // integrate flat dark images
             var flatdarkimages = filesForImageIntegration(engine.flatdarkFileNames);
             var masterflatdarkid = runImageIntegrationBiasDarks(flatdarkimages, ppar.win_prefix + "AutoMasterFlatDark", "flatdark");
             setImagetypKeyword(util.findWindow(masterflatdarkid), "Master flat dark");
             var masterflatdarkPath = saveMasterWindow(global.outputRootDir, masterflatdarkid);
             guiUpdatePreviewId(masterflatdarkid);
       } else {
             util.addProcessingStep("calibrateEngine no master flat dark");
             var masterflatdarkPath = null;
       }
 
       if (par.dark_master_files.val) {
             util.addProcessingStep("calibrateEngine use existing master dark files " + engine.darkFileNames);
             var masterdarkPath = engine.darkFileNames;
       } else if (engine.darkFileNames.length == 1) {
             util.addProcessingStep("calibrateEngine use existing master dark " + engine.darkFileNames[0]);
             var masterdarkPath = engine.darkFileNames[0];
       } else if (engine.darkFileNames.length > 0) {
             util.addProcessingStep("calibrateEngine generate master dark using " + engine.darkFileNames.length + " files");
             if (par.pre_calibrate_darks.val && masterbiasPath != null) {
                   // calibrate dark frames with bias
                   var darkcalFileNames = runCalibrateDarks(engine.darkFileNames, masterbiasPath);
                   var darkimages = filesForImageIntegration(darkcalFileNames);
             } else {
                   var darkimages = filesForImageIntegration(engine.darkFileNames);
             }
             // generate master dark file
             var masterdarkid = runImageIntegrationBiasDarks(darkimages, ppar.win_prefix + "AutoMasterDark", "dark");
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
       flowchartParentBegin("Flats");
       for (var i = 0; i < filtered_flats.allfilesarr.length; i++) {
             var filterFiles = filtered_flats.allfilesarr[i].files;
             var filterName = filtered_flats.allfilesarr[i].filter;
             flowchartChildBegin(filterName);
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
             flowchartChildEnd(filterName);
       }
       flowchartParentEnd("Flats");
 
       util.addProcessingStepAndStatusInfo("Image calibration, calibrate light images");
       var calibratedLightFileNames = [];
       flowchartParentBegin("Calibrate lights");
       for (var i = 0; i < filtered_lights.allfilesarr.length; i++) {
             var filterFiles = filtered_lights.allfilesarr[i].files;
             var filterName = filtered_lights.allfilesarr[i].filter;
             flowchartChildBegin(filterName);
             if (filterFiles.length > 0) {
                   // calibrate light frames with master bias, master dark and master flat
                   // optionally master dark can be left out
                   let fileProcessedStatus = getFileProcessedStatusCalibrated(fileNamesFromFilearr(filterFiles), '_c');
                   if (fileProcessedStatus.unprocessed.length == 0) {
                        var node = flowchartOperation("ImageCalibration:lights");
                        calibratedLightFileNames = calibratedLightFileNames.concat(fileProcessedStatus.processed);
                        engine_end_process(node);
                   } else {
                         util.addProcessingStep("calibrateEngine calibrate " + filterName + " lights for " + fileProcessedStatus.unprocessed.length + " files");
                         let lightcalimages = fileNamesToEnabledPath(fileProcessedStatus.unprocessed);
 
                         let lightcalFileNames = runCalibrateLights(lightcalimages, masterbiasPath, masterdarkPath, masterflatPath[i]);
 
                         calibratedLightFileNames = calibratedLightFileNames.concat(lightcalFileNames, fileProcessedStatus.processed);
                   }
             }
             flowchartChildEnd(filterName);
       }
       flowchartParentEnd("Calibrate lights");
 
       // We now have calibrated light images
       // We now proceed with cosmetic correction and
       // after that debayering in case of OSC/RAW files
 
       console.writeln("calibrateEngine, return calibrated images, calibratedLightFileNames[0] " + calibratedLightFileNames[0]);
 
       util.runGarbageCollection();
 
       return [ calibratedLightFileNames, '_c' ];
}
 
/***************************************************************************
 * 
 *    extraProcessingEngine
 * 
 */
 function extraProcessingEngine(parent, extra_target_image, extra_narrowband)
 {
       engineInit();
       engine.flowchartReset();

       global.is_processing = global.processing_state.extra_processing;
       global.cancel_processing = false;
       medianFWHM = null;

       process_narrowband = extra_narrowband;

       mask_win = null;
       mask_win_id = null;
       star_mask_win = null;
       star_mask_win_id = null;
       star_fix_mask_win = null;
       star_fix_mask_win_id = null;
       global.processing_steps = "";
       global.processing_warnings = "";

       iconized_image_ids = [];
       save_id_list = [];

       global.test_image_ids = [];

       console.noteln("Start extra processing...");
       guiUpdatePreviewId(extra_target_image);
       if (gui) {
            gui.switchtoPreviewTab();
       }
 
       var extra_wins = extraProcessing(parent, extra_target_image, true);
 
       console.noteln("extraProcessingEngine " + extra_target_image + " completed.");
 
       util.windowIconizeAndKeywordif(mask_win_id, false, true);             /* AutoMask window */
       util.windowIconizeAndKeywordif(star_mask_win_id, false, true);        /* AutoStarMask or star_mask window */
       util.windowIconizeAndKeywordif(star_fix_mask_win_id, false, true);    /* AutoStarFixMask or star_fix_mask window */

       console.noteln("extraProcessingEngine " + extra_target_image + " completed2.");

       for (var i = 0; i < extra_wins.length; i++) {
            util.windowIconizeFindPosition(extra_wins[i]);
       }

       console.noteln("Processing steps:");
       console.writeln(global.processing_steps);
       console.writeln("");
       if (global.processing_warnings.length > 0) {
            console.warningln("Processing warnings:");
            console.warningln(global.processing_warnings);
            console.writeln("");
       }
       if (global.processing_errors.length > 0) {
            console.criticalln("Processing errors:");
            console.criticalln(global.processing_errors);
            console.writeln("");
            global.processing_errors = "";
       }
       util.closeTempWindows();
       console.noteln("Extra processing completed.");

       global.is_processing = global.processing_state.none;
 
       util.runGarbageCollection();
}

function engineInit()
{
      util.init_pixinsight_version();
      if (global.AutoOutputDir == null) {
            util.setDefaultDirs();
      }
      initSPCCvalues();
      creating_mask = false;
}

// Check possible conflicting settings before stating the processing
// Nete that function checkOptions does similar things a bit later
function check_engine_processing()
{
      if (global.extra_target_image != "Auto" && global.extra_target_image != null) {
            console.criticalln("Extra processing target image can be used only with Apply button!");
            return false;
      }
      if (util.findWindowStartsWith("FastIntegrationMaster") != null) {
            console.criticalln("FastIntegrationMaster window found, please close it before running AutoIntegrate.");
            return false;
      }
      return true;
}

function save_images_in_save_id_list()
{
      for (var i = 0; i < save_id_list.length; i++) {
            if (save_id_list[i][0] != save_id_list[i][1]) {
                  // We have made a copy of the image to save_id_list[i][1]
                  saveProcessedWindow(save_id_list[i][1]);
                  util.closeOneWindowById(save_id_list[i][1]);
            } else {
                  saveProcessedWindow(save_id_list[i][0], save_id_list[i][1]);
            }
       }
       save_id_list = [];
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
function autointegrateProcessingEngine(parent, auto_continue, autocontinue_narrowband, txt)
{
       if (!check_engine_processing()) {
            return false;
       }

       if (!global.get_flowchart_data) {
            console.beginLog();
       }
       console.show();

       stepno = 1;

       if (par.fast_mode.val) {
            if (ppar.win_prefix == "")  {
                  ppar.win_prefix = "fast_";
            }
       }

      // Save file list locally. In case of par.fast_mode wer make a new copy of the list
      engine.lightFileNames = filterFilesForFastMode(global.lightFileNames, auto_continue, global.pages.LIGHTS);
      engine.darkFileNames = filterFilesForFastMode(global.darkFileNames, auto_continue, global.pages.DARKS);
      engine.biasFileNames = filterFilesForFastMode(global.biasFileNames, auto_continue, global.pages.BIAS);
      engine.flatdarkFileNames = filterFilesForFastMode(global.flatdarkFileNames, auto_continue, global.pages.FLAT_DARKS);
      engine.flatFileNames = filterFilesForFastMode(global.flatFileNames, auto_continue, global.pages.FLATS);

      flowchartInit("AutoIntegrate");

       util.runGarbageCollection();
 
       global.is_processing = global.processing_state.processing;
       global.cancel_processing = false;
       global.flowchart_image = null;
 
       var LRGB_processed_HT_id = null;
       var RGB_processed_HT_id = null;
       var LRGB_Combined = null;
 
       is_rgb_files = false;
       is_narrowband_files = false;
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
       iconized_debug_image_ids = [];
       iconized_image_ids = [];
       RGB_color_id = null;
       RGB_win_id = null;
       script_start_time = Date.now();
       mask_win = null;
       star_mask_win = null;
       star_fix_mask_win = null;
       ssweight_set = false;
       crop_truncate_amount = null;
       crop_lowClipImageName = null;
       crop_lowClipImage_changed = false;
       autocontinue_prefix = "";
       medianFWHM = null;
       linear_fit_rerefence_id = null;
       solved_imageId = null;
 
       RGB_stars_win = null;
       RGB_stars_HT_win = null;
       RGB_stars = [];

       save_id_list = [];
 
       global.processed_channel_images = [];
       global.test_image_ids = [];
 
       luminance_crop_id = null;
       
       engineInit();
 
       global.processingDate = new Date;
       global.processing_steps = "";
       global.processing_errors = "";
       global.processing_warnings = "";
       global.all_windows = [];
       global.iconPoint = null;
       linear_fit_done = false;
       spcc_color_calibration_done = false;
       H_in_R_channel = false;
       process_narrowband = autocontinue_narrowband;
       is_luminance_images = false;
       var starless_id = null;
       var stars_id = null;
 
       if (gui) {
            gui.switchtoPreviewTab();
       }
 
       console.noteln("--------------------------------------");
       var processing_info = getProcessingInfo();
       for (var i = 0; i < processing_info.header.length; i++) {
            util.addProcessingStep(processing_info.header[i]);
       }
       for (var i = 0; i < processing_info.options.length; i++) {
            util.addProcessingStep(processing_info.options[i]);
       }
       if (global.user_selected_best_image != null) {
             util.addProcessingStep("User selected best image: " + global.user_selected_best_image);
       }
       for (var i = 0; i < global.user_selected_reference_image.length; i++) {
             util.addProcessingStep("User selected reference image for filter " + global.user_selected_reference_image[i][1] + 
             " : " + global.user_selected_reference_image[i][0]);
       }
       console.noteln("--------------------------------------");
       util.addProcessingStepAndStatusInfo("Start processing : " + txt);
       console.writeln("auto_continue : " + auto_continue + ", autocontinue_narrowband : " + autocontinue_narrowband);
 
       if (gui) {
            gui.close_undo_images();
       }
 
       targetTypeSetup();
       checkOptions();
 
      /********************************************************************
       * CreateChannelImages
       * 
       * Create images for each L, R, G and B channels, or Color image. 
       ********************************************************************/
       let create_channel_images_ret = CreateChannelImages(parent, auto_continue);
       if (create_channel_images_ret == retval.ERROR) {
             console.criticalln("Failed!");
             console.endLog();
             global.is_processing = global.processing_state.none;
             return false;
       }
 
       /********************************************************************
        * Crop information
        * 
        * Crop all channel support images (the *_map images) to an area
        * covered by all source images.
        ********************************************************************/
       if (create_channel_images_ret == retval.SUCCESS || 
           (par.cropinfo_only.val && create_channel_images_ret == retval.INCOMPLETE)) 
       {
             /* If requested, we crop all channel support images (the *_map images)
              * to an area covered by all source images.
              */ 
             if (! auto_continue) {
                   if (par.crop_to_common_area.val || par.cropinfo_only.val) {
                         createCropInformation();
                   } else {
                         console.warningln("Images are not cropped to common area, borders may be of lower quality");
                   }
             } else  {
                   if (par.crop_to_common_area.val || par.cropinfo_only.val) {
                         createCropInformationAutoContinue();
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
 
       var do_extra_processing = false;
       if (par.calibrate_only.val) {
             preprocessed_images = global.start_images.CALIBRATE_ONLY;
       } else if (preprocessed_images == global.start_images.FINAL) {
            /********************************************************************
             * We have a final image, just run run possible extra processing steps
             ********************************************************************/
             do_extra_processing = true;
             LRGB_processed_HT_id = final_win.mainView.id;
             guiUpdatePreviewId(LRGB_processed_HT_id);
       } else if (!par.image_weight_testing.val 
                  && !par.debayer_only.val 
                  && !par.binning_only.val
                  && !par.extract_channels_only.val
                  && !par.integrate_only.val 
                  && !par.cropinfo_only.val 
                  && preprocessed_images != global.start_images.FINAL) 
       {
            /********************************************************************
             * Process RGB image.
             ********************************************************************/
             do_extra_processing = true;
             /* processRGB flag means we have channel images from LRGBHSO */
             var processRGB = !is_color_files && 
                              !par.monochrome_image.val &&
                              (preprocessed_images == global.start_images.NONE ||
                               preprocessed_images == global.start_images.L_R_G_B_GC ||
                               preprocessed_images == global.start_images.L_R_G_B);
             var RGBmapping = { combined: false, stretched: false, channel_noise_reduction: false };
 
             util.runGarbageCollection();

             if (is_color_files) {
                  if (par.GC_before_channel_combination.val) {
                        util.addCriticalStatus("Option <i>Gradient correction on channel images</i> is not supported for color images."); 
                  }
             }
 
             if (preprocessed_images == global.start_images.L_R_G_B_GC) {
                   mapGCchannels();
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
             } else if (is_color_files && 
                        (preprocessed_images == global.start_images.NONE ||
                         preprocessed_images == global.start_images.RGB))
            {
                   mapColorImage("Integration_RGB", "Integration_RGB_map");
                   CropImageIf(RGB_win_id);
             }
 
             if (!is_color_files && is_luminance_images) {
                   /* Process and stretch L image from linear to non-linear.
                    * This need to be run early as we create a mask from
                    * L image.
                    */
                   flowchartParentBegin("LRGB");
                   flowchartChildBegin("L");

                   LRGBEnsureMask(null);
                   ProcessLimage(RGBmapping);
                   
                   flowchartChildEnd("L");
                   flowchartChildBegin("RGB");
                   var processed_l_image = true;

             } else {
                  var processed_l_image = false;
             }

             if (processRGB && !RGBmapping.combined) {
                   CombineRGBimage(RGB_processed_HT_id);
                   RGBmapping.combined = true;
             }
             if (RGB_stars.length > 0) {
                   RGB_stars_win = combineRGBStars(RGB_stars);
             }
 
             if (par.monochrome_image.val) {
                   console.writeln("monochrome image, rename windows")
                   LRGB_processed_HT_id = util.windowRename(L_processed_HT_win.mainView.id, ppar.win_prefix + "AutoMono");
                   guiUpdatePreviewId(LRGB_processed_HT_id);
                   if (processed_l_image) {
                        flowchartChildEnd("RGB");
                        flowchartParentEnd("LRGB");
                   }
 
             } else if (!par.channelcombination_only.val) {
 
                   /* Process and stretch RGB image from linear to non-linear.
                    */
                   RGB_processed_HT_id = ProcessRGBimage(RGBmapping);

                   if (checkNoiseReduction(is_color_files ? 'color' : 'RGB', 'nonlinear')) {
                         runNoiseReduction(ImageWindow.windowById(RGB_processed_HT_id), mask_win, false);
                   }
                   if (processed_l_image) {
                        flowchartChildEnd("RGB");
                        flowchartParentEnd("LRGB");
                   }
       
                   if (is_color_files || !is_luminance_images) {
                         /* Keep RGB_processed_HT_id separate from LRGB_processed_HT_id which
                          * will be the final result file.
                          */
                         console.writeln("Color file or no luminance, make a copy of " + RGB_processed_HT_id);
                         LRGB_processed_HT_id = "copy_" + RGB_processed_HT_id;
                         util.copyWindow(
                               ImageWindow.windowById(RGB_processed_HT_id), 
                               LRGB_processed_HT_id);
                   } else {
                         /* LRGB files. Combine L and RGB images.
                         */
                         LRGB_processed_HT_id = runLRGBCombination(
                                                      RGB_processed_HT_id,
                                                      L_processed_HT_id);
                         LRGB_Combined = LRGB_processed_HT_id;
                         util.copyWindow(
                               ImageWindow.windowById(LRGB_processed_HT_id), 
                               "copy_" + LRGB_processed_HT_id);
                         LRGB_processed_HT_id = "copy_" + LRGB_processed_HT_id;
                   }
                   if (RGB_stars_HT_win != null) {
                         stars_id = RGB_stars_HT_win.mainView.id;
                   }
             
                   /* Optional ACDNR noise reduction for RGB. Used mostly to reduce black
                    * spots left from previous noise reduction.
                    */
                   runACDNRReduceNoise(ImageWindow.windowById(LRGB_processed_HT_id), mask_win);
 
                   /* Optional color noise reduction for RGB.
                    */
                   if (par.use_color_noise_reduction.val) {
                         runColorReduceNoise(ImageWindow.windowById(LRGB_processed_HT_id));
                   }
 
                   if (stars_id != null && !par.skip_star_noise_reduction.val) {
                         starReduceNoise(ImageWindow.windowById(stars_id));
                   }
 
                   if (!process_narrowband && !par.use_RGBNB_Mapping.val  && !par.skip_SCNR.val && !par.comet_align.val) {
                         /* Remove green cast, run SCNR
                          */
                         runSCNR(ImageWindow.windowById(LRGB_processed_HT_id), false);
                         if (stars_id != null) {
                               runSCNR(ImageWindow.windowById(stars_id), false);
                         }
                   }
           
                   /* Sharpen image, use mask to sharpen mostly the light parts of image.
                   */
                   if (par.skip_sharpening.val) {
                         console.writeln("No sharpening on " + LRGB_processed_HT_id);
                   } else if (par.use_blurxterminator.val || par.use_graxpert_deconvolution.val) {
                        /* We have already applied BlurXTerminator on linear image. */
                  } else {
                         runMultiscaleLinearTransformSharpen(
                               ImageWindow.windowById(LRGB_processed_HT_id),
                               mask_win);
                         if (stars_id != null) {
                               runMultiscaleLinearTransformSharpen(
                                     ImageWindow.windowById(stars_id),
                                     null);
                         }
                   }
 
                  if (!par.use_RGBNB_Mapping.val) {
                        /* Color calibration on RGB
                         */
                        runColorCalibration(ImageWindow.windowById(LRGB_processed_HT_id), 'nonlinear');
                        if (stars_id != null) {
                              runColorCalibration(ImageWindow.windowById(stars_id), 'nonlinear');
                        }
                  } 

                  if (par.use_RGBHa_Mapping.val) {
                        RGBHa_mapping(LRGB_processed_HT_id);
                  }

                   /* Rename some windows. Need to be done before iconize.
                   */
                   if (!is_color_files && is_luminance_images) {
                         /* LRGB files */
                         if (par.RRGB_image.val) {
                               LRGB_processed_HT_id = util.windowRename(LRGB_processed_HT_id, ppar.win_prefix + "AutoRRGB");
                         } else {
                               LRGB_processed_HT_id = util.windowRename(LRGB_processed_HT_id, ppar.win_prefix + "AutoLRGB");
                         }
                   } else {
                         /* Color or narrowband or RGB files */
                         LRGB_processed_HT_id = util.windowRename(LRGB_processed_HT_id, ppar.win_prefix + "AutoRGB");
                   }
                   guiUpdatePreviewId(LRGB_processed_HT_id);
             } else {
                   if (processed_l_image) {
                        flowchartChildEnd("RGB");
                        flowchartParentEnd("LRGB");
                   }
            }
             if (stars_id != null) {
                   console.writeln("Stars image is " + stars_id);
                   setFinalImageKeyword(ImageWindow.windowById(stars_id));
                   stars_id = util.windowRename(stars_id, LRGB_processed_HT_id + "_stars");
       
                   starless_id = LRGB_processed_HT_id + "_starless";
                   console.writeln("Rename " + LRGB_processed_HT_id + " as " + starless_id);
                   util.windowRename(LRGB_processed_HT_id, starless_id);
                   var new_image = combineStarsAndStarless(
                                     par.stars_combine.val,
                                     starless_id, 
                                     stars_id);
                   // restore original final image name
                   console.writeln("Rename " + new_image + " as " + LRGB_processed_HT_id);
                   util.windowRename(new_image, LRGB_processed_HT_id);
                   ImageWindow.windowById(LRGB_processed_HT_id).show();
       
                   setFinalImageKeyword(ImageWindow.windowById(starless_id));
       
                   saveProcessedWindow(stars_id);
                   saveProcessedWindow(starless_id);

                   guiUpdatePreviewId(LRGB_processed_HT_id);
             }
             if (par.save_stretched_starless_channel_images.val) {
                  createStarsImageFromFinalImage(LRGB_processed_HT_id);
             }
       }
 
       console.writeln("Basic processing completed");
       flowchartDone();

       save_images_in_save_id_list();
 
       if (do_extra_processing && (util.is_extra_option() || util.is_narrowband_option())) {
             extraProcessing(parent, LRGB_processed_HT_id, false);
       }
 
       util.ensureDialogFilePath("processed files");
 
       if (global.substack_number > 0) {
            console.writeln("Substack number " + global.substack_number);
            /* Rename image based on substack number. */
            let numstr = global.substack_number.toString();
            while (numstr.length < 3) {
                  numstr = "0" + numstr;
            }
            let stackname = util.ensure_win_prefix("Stack_" + numstr + "_" + RGB_color_id);
            util.addProcessingStep("Substack mode, rename " + RGB_color_id + " to " + stackname);
            RGB_color_id = util.windowRenameKeepifEx(RGB_color_id, stackname, true, true);
            saveProcessedWindow(RGB_color_id);          /* Final renamed substack integrated image. */
       }
       if (crop_lowClipImage_changed) {
             saveProcessedWindow(crop_lowClipImageName);  /* LowRejectionMap_ALL */
       }
       if (preprocessed_images < global.start_images.L_R_G_B_GC) {
             // We have generated integrated images, save them
             console.writeln("Save processed windows");
             saveProcessedWindow(L_id);                    /* Integration_L */
             saveProcessedWindow(R_id);                    /* Integration_R */
             saveProcessedWindow(G_id);                    /* Integration_G */
             saveProcessedWindow(B_id);                    /* Integration_B */
             saveProcessedWindow(H_id);                    /* Integration_H */
             saveProcessedWindow(S_id);                    /* Integration_S */
             saveProcessedWindow(O_id);                    /* Integration_O */
             saveProcessedWindow(RGB_color_id);            /* Integration_RGB */
             if (luminance_crop_id != null) {
                   saveProcessedWindow(luminance_crop_id); /* Integration_L_crop */
             }
       }
       if (preprocessed_images <= global.start_images.L_R_G_B_GC && RGB_win_id != null && !RGB_win_id.endsWith("_map")) {
             // We have generated RGB image, save it
             console.writeln("Save generated RGB image");
             saveProcessedWindow(RGB_win_id);              /* Integration_RGB_combined */
       }
       if (preprocessed_images < global.start_images.FINAL && LRGB_processed_HT_id != null) {
             console.writeln("Save final image");
             // set final image keyword so it easy to save all file e.g. as 16 bit TIFF
             setFinalImageKeyword(ImageWindow.windowById(LRGB_processed_HT_id));
             // save processing options
             saveProcessingHistoryToImage(ImageWindow.windowById(LRGB_processed_HT_id));
             // We have generated final image, save it
             global.run_results.final_image_file = saveProcessedWindow(LRGB_processed_HT_id);  /* Final image. */
             if (global.get_flowchart_data) {
                  util.closeOneWindowById(LRGB_processed_HT_id);
             }
             var iconize_final_image = true;
       } else {
            var iconize_final_image = false;
      }
 
       /* All done, do cleanup on windows on screen 
        */
       util.addProcessingStepAndStatusInfo("Engine processing completed");
 
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
       util.windowIconizeAndKeywordif(RGB_color_id);            /* Integration_RGB */
       if (crop_lowClipImageName != null) {
             util.windowIconizeif(crop_lowClipImageName);       /* LowRejectionMap_ALL */
       }
       if (RGB_win_id != null && RGB_win_id.endsWith("_map")) {
            // close map window
            util.closeOneWindowById(RGB_win_id);
            RGB_win_id = null;
       } else {
            util.windowIconizeAndKeywordif(RGB_win_id);         /* Integration_RGB_combined */
       }
       util.windowIconizeAndKeywordif(luminance_crop_id);       /* Integration_L_crop */
 
       if (RGB_stars_win != null) {
             util.windowIconizeAndKeywordif(RGB_stars_win.mainView.id); /* Integration_RGB_stars (linear) */
       }
       if (RGB_stars_HT_win != null) {
             setFinalImageKeyword(ImageWindow.windowById(RGB_stars_HT_win.mainView.id));   /* Integration_RGB_stars (non-linear) */
       }

       for (var i = 0; i < iconized_debug_image_ids.length; i++) {
            if (par.debug.val) {
                  util.windowIconizeAndKeywordif(iconized_debug_image_ids[i]);
            } else {
                  util.closeOneWindowById(iconized_debug_image_ids[i]);
            }
      }
      for (var i = 0; i < iconized_image_ids.length; i++) {
            util.windowIconizeAndKeywordif(iconized_image_ids[i]);
      }
      for (var i = 0; i < global.test_image_ids.length; i++) {
            util.windowIconizeAndKeywordif(global.test_image_ids[i]);
      }
 
       for (var i = 0; i < global.processed_channel_images.length; i++) {
             util.windowIconizeAndKeywordif(global.processed_channel_images[i]);
       }
 
       util.windowIconizeAndKeywordif(L_processed_id);
       util.windowIconizeAndKeywordif(RGB_processed_id);
 
       closeAllWindowsFromArray(RGB_stars);
 
       util.windowIconizeAndKeywordif(RGB_processed_HT_id);
       util.windowIconizeAndKeywordif(L_processed_HT_id);
       util.windowIconizeAndKeywordif(LRGB_Combined);           /* LRGB Combined image */
       util.windowIconizeAndKeywordif(mask_win_id);             /* AutoMask window */
       util.windowIconizeAndKeywordif(star_mask_win_id);        /* AutoStarMask or star_mask window */
       util.windowIconizeAndKeywordif(star_fix_mask_win_id);    /* AutoStarFixMask or star_fix_mask window */

       if (iconize_final_image) {
            util.windowIconizeif(LRGB_processed_HT_id, true);
       }
       if (stars_id != null) {
            util.windowIconizeif(stars_id, true);
       }
       if (starless_id != null) {
            util.windowIconizeif(starless_id, true);
       }

       if (par.batch_mode.val) {
             /* Rename image based on first file directory name. 
              * First check possible device in Windows (like c:)
              */
             var fname = engine.lightFileNames[0];
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
             fname = util.ensure_win_prefix(fname);
             util.addProcessingStep("Batch mode, rename " + LRGB_processed_HT_id + " to " + fname);
             LRGB_processed_HT_id = util.windowRenameKeepifEx(LRGB_processed_HT_id, fname, true, true);
             saveProcessedWindow(LRGB_processed_HT_id);          /* Final renamed batch image. */
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
       util.addProcessingStepAndStatusInfo("Script completed, time "+(end_time-script_start_time)/1000+" sec");
       console.noteln("======================================");


       console.writeln("--------------------------------------");
       if (global.flowchartData != null) {
            // Print flowchart
            engine.flowchartPrint(global.flowchartData);
            if (par.flowchart_saveimage.val && global.flowchart_image != null && gui) {
                  // Save flowchart image
                  var flowchart_imagename = util.ensure_win_prefix("AutoIntegrateFlowchart");
                  var flowchart_win = util.createWindowFromBitmap(global.flowchart_image.render(), flowchart_imagename);
                  saveProcessedWindow(flowchart_win.mainView.id, null, ".jpg");
                  util.closeOneWindow(flowchart_win);
                  global.flowchart_image = null;
            }
       }
 
       if (preprocessed_images != global.start_images.FINAL
           && par.autosave_setup.val 
           && full_run
           && create_channel_images_ret == retval.SUCCESS
           && !global.get_flowchart_data)
       {
             let json_file = "AutosaveSetup.json";
             if (par.win_prefix_to_log_files.val) {
                   json_file = util.ensure_win_prefix(json_file);
             }
             util.saveJsonFileEx(parent, true, json_file);
       }
       if (alignedFiles != null) {
            console.writeln("--------------------------------------");
            console.noteln("Aligned files:");
            for (var i = 0; i < alignedFiles.length; i++) {
                  console.writeln(alignedFiles[i]);
            }
      }

       console.writeln("--------------------------------------");
       console.noteln("Processing steps:");
       console.writeln(global.processing_steps);
       console.writeln("--------------------------------------");
       var processingOptions = getChangedProcessingOptions();
       if (processingOptions.length > 0) {
             console.writeln("Processing options:");
             for (var i = 0; i < processingOptions.length; i++) {
                   console.writeln(processingOptions[i][0] + " " + processingOptions[i][1]);
             }
       } else {
             util.addProcessingStep("Default processing options were used");
 
       }
       console.writeln("--------------------------------------");
       if (global.processing_warnings.length > 0) {
            console.warningln("Processing warnings:");
            console.warningln(global.processing_warnings);
            console.writeln("");
       }
       if (global.processing_errors.length > 0) {
            console.criticalln("Processing errors:");
            console.criticalln(global.processing_errors);
       }

       solved_imageId = null;

       engine.lightFileNames = null;
       engine.darkFileNames = null;
       engine.biasFileNames = null;
       engine.flatdarkFileNames = null;
       engine.flatFileNames = null;
 
       console.writeln("Run Garbage Collection");
       util.runGarbageCollection();
 
       console.noteln("Engine processing completed.");

       if (!global.get_flowchart_data && preprocessed_images != global.start_images.FINAL) {
            engine.writeProcessingStepsAndEndLog(alignedFiles, auto_continue, null, false);
            console.noteln("Console output is written into file " + logfname);
      }

       global.is_processing = global.processing_state.none;

       return true;
}
 
function printProcessValues(obj)
{
      if (par.print_process_values.val 
          && !global.get_flowchart_data
          && global.is_processing != global.processing_state.none)
      {
            console.writeln(obj.toSource());
      }
}

function printProcessDefaultValues(name, obj)
{
      console.writeln("Default values for " + name);
      console.writeln(obj.toSource());
}

function getProcessDefaultValues()
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
            try {
                  printProcessDefaultValues("new StarXTerminator", new StarXTerminator);
            } catch (e) {
                  console.criticalln("StarXTerminator not available");
            }
      }
      if (par.use_noisexterminator.val) {
            try {
                  printProcessDefaultValues("new NoiseXTerminator", new NoiseXTerminator);
            } catch (e) {
                  console.criticalln("StarXTerminator not available");
            }
      }
      if (par.use_starnet2.val) {
            try {
                  printProcessDefaultValues("new StarNet2", new StarNet2);
            } catch (e) {
                  console.criticalln("StarNet2 not available");
            }
      }
      try {
            printProcessDefaultValues("new StarNet", new StarNet);
      } catch (e) {
            console.criticalln("StarNet not available");
      }
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
      printProcessDefaultValues("new ArcsinhStretch", new ArcsinhStretch);
      try {
            printProcessDefaultValues("new GeneralizedHyperbolicStretch", new GeneralizedHyperbolicStretch);
      } catch (e) {
            console.criticalln("GeneralizedHyperbolicStretch not available");
      }
      try {
            printProcessDefaultValues("new StarXTerminator", new StarXTerminator);
      } catch (e) {
            console.criticalln("StarXTerminator not available");
      }
      try {
            printProcessDefaultValues("new NoiseXTerminator", new NoiseXTerminator);
      } catch (e) {
            console.criticalln("NoiseXTerminator not available");
      }
      try {
            printProcessDefaultValues("new BlurXTerminator", new BlurXTerminator);
      } catch (e) {
            console.criticalln("BlurXTerminator not available");
      }
      printProcessDefaultValues("new SpectrophotometricColorCalibration", new SpectrophotometricColorCalibration);
      // printProcessDefaultValues("new Colourise", new Colourise);
      printProcessDefaultValues("new GradientCorrection", new GradientCorrection);
      printProcessDefaultValues("new FastIntegration", new FastIntegration);
      printProcessDefaultValues("new SpectrophotometricFluxCalibration", new SpectrophotometricFluxCalibration);
      printProcessDefaultValues("new MultiscaleGradientCorrection", new MultiscaleGradientCorrection);

      engine.writeProcessingStepsAndEndLog(null, false, "AutoProcessDefaults_" + global.pixinsight_version_str, false);
}

/* Interface functions.
 */

// Setup
this.setGUI = setGUI;

// Main interface functions
this.extraProcessingEngine = extraProcessingEngine;
this.autointegrateProcessingEngine = autointegrateProcessingEngine;
this.autointegrateNarrowbandPaletteBatch = autointegrateNarrowbandPaletteBatch;

// Flowchart
this.flowchartPrint = flowchartPrint;
this.flowchartReset = flowchartReset;
this.closeAllWindows = closeAllWindows;

// Utility processing functions
this.subframeSelectorMeasure = subframeSelectorMeasure;
this.runHistogramTransformSTFex = runHistogramTransformSTFex;
this.autoStretch = autoStretch;
this.extraColorizedNarrowbandImages = extraColorizedNarrowbandImages;

this.openImageFiles = openImageFiles;
this.openDirectoryFiles = openDirectoryFiles;
this.getFilterFiles = getFilterFiles;
this.getImagetypFiles = getImagetypFiles;

this.writeProcessingStepsAndEndLog = writeProcessingStepsAndEndLog;
this.getProcessDefaultValues = getProcessDefaultValues;
this.getChangedProcessingOptions = getChangedProcessingOptions;
this.autocontinueHasNarrowband = autocontinueHasNarrowband;

this.testRGBNBmapping = testRGBNBmapping;
this.testRGBHaMapping = testRGBHaMapping;

}  /* AutoIntegrateEngine*/

AutoIntegrateEngine.prototype = new Object;
