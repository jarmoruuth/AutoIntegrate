/*
      AutoIntegrate Enhancements Engine.

      Image enhancements processing functions for AutoIntegrate script.

      Copyright (c) 2018-2026 Jarmo Ruuth.

*/

#ifndef AUTOINTEGRATEENHANCEMENTSENGINE_JS
#define AUTOINTEGRATEENHANCEMENTSENGINE_JS

class AutoIntegrateEnhancementsEngine extends Object
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

      this.engine.engine_end_process(node);
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

      /* Normalize black point and brightness on all channels based on a reference channel.
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
            this.engine.setNewMaskWindow(this.engine.newMaskWindow(imgWin, "AutoNormalizeMask", false, true));
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
            this.engine.setMaskChecked(imgWin, this.engine.mask_win);
            /* Normalize only light parts of the image. */
            imgWin.maskInverted = false;
      }

      P.executeOn(imgWin.mainView);

      if (this.par.enhancements_normalize_channels_mask.val) {
            imgWin.removeMask();
            this.util.closeOneWindow(this.engine.mask_win);
      }
      imgWin.mainView.endProcess();

      this.engine.engine_end_process(node);
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

      this.engine.printAndSaveProcessValues(P, "blur");
      this.engine.engine_end_process(null);
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

      this.engine.engine_end_process(node);

      this.engine.guiUpdatePreviewId(imgView.id);
}

enhancementsHaMapping(enhancementsWin)
{
      this.engine.H_id = this.engine.findIntegratedChannelImage("H", true, null);
      if (this.engine.H_id == null) {
            this.engine.save_images_in_save_id_list(); // Save images so we can retur with AutoContinue
            this.util.throwFatalError("Could not find integrated H image");
      }

      this.engine.RGBHa_init(enhancementsWin.mainView.id, false, false);
      this.engine.RGBHa_mapping(enhancementsWin.mainView.id);
      if (!this.par.debug.val) {
            for (var i = 0; i < this.engine.iconized_image_ids.length; i++) {
                  this.util.closeOneWindowById(this.engine.iconized_image_ids[i]);
            }
      }
}

invertImage(targetView)
{
      console.writeln("invertImage");
      var node = this.flowchart.flowchartOperation("Invert");

      var P = new Invert;

      targetView.beginProcess(UndoFlag.NoSwapFile);
      P.executeOn(targetView, true);
      targetView.endProcess();

      this.engine.printAndSaveProcessValues(P, this.engine.findChannelFromNameIf(targetView.id), targetView.id);
      this.engine.engine_end_process(node);
}

// Mask used when fixing star colors in narrowband images.
createStarFixMask(imgView)
{
      if (this.global.debug) console.writeln("createStarFixMask, force_new_mask is " + this.par.enhancements_force_new_mask.val);
      if (!this.par.enhancements_force_new_mask.val) {
            if (this.engine.star_fix_mask_win == null) {
                  this.engine.star_fix_mask_win = this.util.findWindow(this.ppar.win_prefix + "star_fix_mask");
            }
            if (this.engine.star_fix_mask_win == null) {
                  this.engine.star_fix_mask_win = this.util.findWindow(this.ppar.win_prefix + "AutoStarFixMask");
            }
            if (this.engine.star_fix_mask_win != null) {
                  // Use already created start mask
                  console.writeln("Use existing star mask " + this.engine.star_fix_mask_win.mainView.id);
                  this.engine.star_fix_mask_win_id = this.engine.star_fix_mask_win.mainView.id;
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

      this.engine.printAndSaveProcessValues(P, "", imgView.id);
      this.engine.engine_end_process(node);

      this.engine.star_fix_mask_win = ImageWindow.activeWindow;

      this.util.windowRenameKeepif(this.engine.star_fix_mask_win.mainView.id, this.ppar.win_prefix + "AutoStarFixMask", true);
      this.engine.star_fix_mask_win_id = this.engine.star_fix_mask_win.mainView.id;

      this.util.addProcessingStep("Created star fix mask " + this.engine.star_fix_mask_win.mainView.id);
}

enhancementsRemoveMagentaColor(targetWin)
{
      this.addEnhancementsStep("Remove magenta color");

      this.invertImage(targetWin.mainView);
      this.engine.runSCNR(targetWin, true);
      this.invertImage(targetWin.mainView);

      this.engine.guiUpdatePreviewWin(targetWin);
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
            this.util.addProcessingStep("Using mask " + this.engine.star_fix_mask_win.mainView.id + " when fixing star colors");
            this.engine.setMaskChecked(targetWin, this.engine.star_fix_mask_win);
            targetWin.maskInverted = false;
      }      

      this.engine.runSCNR(targetWin, true);

      if (use_mask) {
            targetWin.removeMask();
      }

      this.invertImage(targetWin.mainView);

      this.engine.guiUpdatePreviewWin(targetWin);
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

      this.engine.printAndSaveProcessValues(P, "", targetWin.mainView.id);

      console.writeln("enhancementsFixStarCores:set star mask");

      this.engine.star_fix_mask_win = ImageWindow.activeWindow;

      this.engine.setMaskChecked(targetWin, this.engine.star_fix_mask_win);
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

      this.engine.printAndSaveProcessValues(P, "", targetWin.mainView.id);
           
      // Cleanup
      targetWin.removeMask();
      this.engine.star_fix_mask_win.forceClose();
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

      let stars_win = this.engine.removeStars(imgWin, false, true, null, this.util.ensure_win_prefix(imgWin.mainView.id + "_stars_tmp"), this.par.enhancements_unscreen_stars.val);
      let stars_win_id = this.util.ensure_win_prefix(imgWin.mainView.id + "_stars");
      if (stars_win.mainView.id != stars_win_id) {
            console.writeln("enhancementsRemoveStars, rename " + stars_win.mainView.id + " to " + stars_win_id);
            stars_win.mainView.id = stars_win_id;
      }
      stars_win.show();

      var FITSkeywords = this.engine.getTargetFITSKeywordsForPixelmath(imgWin);
     this.engine.setTargetFITSKeywordsForPixelmath(stars_win, FITSkeywords);

      this.util.ensureDir(this.global.outputRootDir);

      this.engine.setFinalImageKeyword(stars_win);
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
      this.engine.setFinalImageKeyword(copywin);
      this.util.addProcessingStep("Starless image " + copywin.mainView.id);
      copywin.show();

      // this.guiUpdatePreviewWin(copywin);

      if (this.engine.gui) {
            this.engine.gui.update_enhancements_target_image_window_list(this.global.enhancements_target_image_id);
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
      this.engine.setMaskChecked(imgWin, maskWin);
      imgWin.maskInverted = true;
      
      P.executeOn(imgWin.mainView, false);

      imgWin.removeMask();

      imgWin.mainView.endProcess();

      this.engine.printAndSaveProcessValues(P, "", imgWin.mainView.id);
      this.engine.engine_end_process(node);

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
      this.engine.setMaskChecked(imgWin, maskWin);
      imgWin.maskInverted = false;

      P.executeOn(imgWin.mainView, false);

      imgWin.removeMask();

      imgWin.mainView.endProcess();

      this.engine.printAndSaveProcessValues(P, "", imgWin.mainView.id);
      this.engine.engine_end_process(node);

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

      var P = this.engine.runPixelMathExpressions(imgWin, this.enhancementsAdjustChannelsExpressions());

      this.engine.printAndSaveProcessValues(P, "", imgWin.mainView.id);
      this.engine.engine_end_process(node);
}

// PixelMath expressions for adjust channels, one expression for all channels or one per RGB channel
enhancementsAdjustChannelsExpressions()
{
      if (this.par.enhancements_adjust_channels_only_k.val || (this.par.enhancements_adjust_G.val == 0 && this.par.enhancements_adjust_B.val == 0)) {
            return [ "$T * " + this.par.enhancements_adjust_R.val ];
      } else {
            return [ "$T[0] * " + this.par.enhancements_adjust_R.val,
                     "$T[1] * " + this.par.enhancements_adjust_G.val,
                     "$T[2] * " + this.par.enhancements_adjust_B.val ];
      }
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
                        hsChannels = this.engine.extractHSchannels(imgWin);
                  } else {
                        P.toIntensity = true;
                        P.toLightness = false;
                  }
            }

            imgWin.mainView.beginProcess(UndoFlag.NoSwapFile);

            /* Transform only light parts of the image. */
            this.engine.setMaskChecked(imgWin, maskWin);
            imgWin.maskInverted = false;
            
            P.executeOn(imgWin.mainView, false);

            imgWin.removeMask();

            imgWin.mainView.endProcess();

            this.engine.printAndSaveProcessValues(P, "", imgWin.mainView.id);
            this.engine.engine_end_process(node);

            if (this.par.enhancements_HDRMLT_color.val == 'Color corrected'
                && this.global.pixinsight_version_num < 1080812) 
            {
                  iChannel = this.engine.extractIchannel(imgWin);

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
                  this.engine.engine_end_process(null);
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
                  this.engine.setMaskChecked(imgWin, maskWin);
                  imgWin.maskInverted = false;
                  break;
            case 'Darks':
                  /* Transform only dark parts of the image. */
                  this.engine.setMaskChecked(imgWin, maskWin);
                  imgWin.maskInverted = true;
                  break;
            case 'range_mask':
                  /* User created mask. */
                  this.engine.setMaskChecked(imgWin, maskWin);
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

      this.engine.printAndSaveProcessValues(P, "", imgWin.mainView.id);
      this.engine.engine_end_process(node);

      // this.guiUpdatePreviewWin(imgWin);
}

enhancementsExponentialTransformation(imgWin, maskWin)
{
      this.addEnhancementsStep("ExponentialTransformation, order " + this.par.enhancements_ET_order.val);
      var node = this.flowchart.flowchartOperation("ExponentialTransformation");

      var adjusttype = this.par.enhancements_ET_adjusttype.val;
      if (this.par.enhancements_range_mask.val) {
            adjusttype = 'range_mask';
      }

      var P = this.runExponentialTransformation(imgWin, maskWin, this.par.enhancements_ET_order.val, adjusttype);

      this.engine.printAndSaveProcessValues(P, "", imgWin.mainView.id);
      this.engine.engine_end_process(node);

      // this.guiUpdatePreviewWin(imgWin);
}

// Run ExponentialTransformation using a mask selected by adjusttype, no logging, returns the process
runExponentialTransformation(imgWin, maskWin, order, adjusttype)
{
      var P = new ExponentialTransformation;
      P.functionType = ExponentialTransformation.PIP;
      P.order = order;
      P.sigma = 0.00;

      imgWin.mainView.beginProcess(UndoFlag.NoSwapFile);

      switch (adjusttype) {
            case 'All':
                  /* Transform whole image. */
                  break;
            case 'Lights':
                  /* Transform only light parts of the image. */
                  this.engine.setMaskChecked(imgWin, maskWin);
                  imgWin.maskInverted = false;
                  P.useLightnessMask = true;
                  break;
            case 'Darks':
                  /* Transform only dark parts of the image. */
                  this.engine.setMaskChecked(imgWin, maskWin);
                  imgWin.maskInverted = true;
                  P.useLightnessMask = false;
                  break;
            case 'range_mask':
                  /* User created mask. */
                  this.engine.setMaskChecked(imgWin, maskWin);
                  imgWin.maskInverted = false;
                  break;
            default:
                  this.util.throwFatalError("Invalid ExponentialTransformation mask type " + adjusttype);
      }

      P.executeOn(imgWin.mainView, false);

      if (adjusttype != 'All') {
            imgWin.removeMask();
      }

      imgWin.mainView.endProcess();

      return P;
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

      this.engine.printAndSaveProcessValues(P, "", imgWin.mainView.id);
      this.engine.engine_end_process(node);

      return ImageWindow.activeWindow;
}

createStarMaskIf(imgWin)
{
      if (!this.par.enhancements_force_new_mask.val) {
            this.engine.star_mask_win = this.engine.maskIsCompatible(imgWin, this.engine.star_mask_win);
            if (this.engine.star_mask_win == null) {
                  this.engine.star_mask_win = this.engine.maskIsCompatible(imgWin, this.util.findWindow(this.ppar.win_prefix + "star_mask"));
            }
            if (this.engine.star_mask_win == null) {
                  this.engine.star_mask_win = this.engine.maskIsCompatible(imgWin, this.util.findWindow(this.ppar.win_prefix + "AutoStarMask"));
            }
            if (this.engine.star_mask_win != null) {
                  // Use already created start mask
                  console.writeln("Use existing star mask " + this.engine.star_mask_win.mainView.id);
                  this.engine.star_mask_win_id = this.engine.star_mask_win.mainView.id;
                  return;
            }
      }
      this.util.closeOneWindowById("AutoStarMask");

      this.engine.star_mask_win = this.createNewStarMaskWin(imgWin);

      this.util.windowRenameKeepif(this.engine.star_mask_win.mainView.id, "AutoStarMask", true);

      this.util.addProcessingStep("Created star mask " + this.engine.star_mask_win.mainView.id);
      this.engine.star_mask_win_id = this.engine.star_mask_win.mainView.id;
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

      this.engine.runPixelMathSingleMappingEx(combined_id, "combine stars+starless", expression, false, symbols);
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
            this.engine.setMaskChecked(targetWin, this.engine.star_mask_win);
            targetWin.maskInverted = false;
      }
      
      P.executeOn(targetWin.mainView, false);

      if (use_mask) {
            targetWin.removeMask();
      }

      targetWin.mainView.endProcess();

      this.engine.printAndSaveProcessValues(P, "", targetWin.mainView.id);
      this.engine.engine_end_process(node);

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

      this.engine.printAndSaveProcessValues(P, "", imgWin.mainView.id);
      this.engine.engine_end_process(node);

      // this.guiUpdatePreviewWin(imgWin);
}

// Curve points for CurvesTransformation P.K from enhancements curves sliders
enhancementsCurvesPoints()
{
      var scale = 0.20;

      var hl_adj = this.par.enhancements_curves_highlights.val * scale;
      var lt_adj = this.par.enhancements_curves_lights.val * scale;
      var dk_adj = this.par.enhancements_curves_darks.val * scale;
      var sh_adj = this.par.enhancements_curves_shadows.val * scale;

      function clamp01(v) { return Math.max(0, Math.min(1, v)); }

      var pts = [
            [0.00000, 0.00000],
            [0.25000, clamp01(0.25000 + sh_adj)],
            [0.37500, clamp01(0.37500 + dk_adj)],
            [0.62500, clamp01(0.62500 + lt_adj)],
            [0.75000, clamp01(0.75000 + hl_adj)],
            [1.00000, 1.00000]
      ];

      // Enforce monotonically increasing y to prevent solarization
      for (var i = 1; i < pts.length - 1; i++) {
            pts[i][1] = Math.max(pts[i - 1][1], Math.min(pts[i + 1][1], pts[i][1]));
      }

      return pts;
}

runCurvesTransformationPoints(imgWin, pts)
{
      var P = new CurvesTransformation;
      P.K = pts;

      imgWin.mainView.beginProcess(UndoFlag.NoSwapFile);
      P.executeOn(imgWin.mainView, false);
      imgWin.mainView.endProcess();

      return P;
}

enhancementsApplyCurves(imgWin)
{
      this.addEnhancementsStep("Curves adjustment");
      var node = this.flowchart.flowchartOperation("CurvesTransformation:curves_adjust");

      var P = this.runCurvesTransformationPoints(imgWin, this.enhancementsCurvesPoints());

      this.engine.printAndSaveProcessValues(P, "", imgWin.mainView.id);
      this.engine.engine_end_process(node);
}

enhancementsStretch(win)
{
      this.addEnhancementsStep("Stretch image using " + this.engine.local_image_stretching);

      win = this.engine.runHistogramTransform(win, win.mainView.image.isColor, 'RGB');
      return win;
}

// Run unlinked AUtoSTF to image
enhancementsAutoSTF(win)
{
      this.addEnhancementsStep("AutoSTF on image");

      this.engine.runAutoSTFex(
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

      this.engine.adjustShadows(win, perc);

      // this.guiUpdatePreviewWin(win);
}

enhancementsSmoothBackground(win, val, factor)
{
      this.addEnhancementsStep("Background smoothing with value " + val + " and factor " + factor);

      this.engine.smoothBackground(win, val, factor);

      // this.guiUpdatePreviewWin(win);
}

enhancementsEnhanceShadows(win)
{
      this.addEnhancementsStep("Enhance shadows");

      var mapping = "ln(1+$T)";

      this.engine.runPixelMathSingleMappingEx(win.mainView.id, "enhance shadows", mapping, false, null, true);
}

enhancementsEnhanceHighlights(win)
{
      this.addEnhancementsStep("Enhance highlights");

      var mapping = "exp($T)";

      this.engine.runPixelMathSingleMappingEx(win.mainView.id, "enhance highlights", mapping, false, null, true);
}

enhancementsGamma(win)
{
      this.addEnhancementsStep("Gamma correction with value " + this.par.enhancements_gamma_value.val);

      this.engine.runPixelMathSingleMappingEx(win.mainView.id, "gamma correction", this.enhancementsGammaExpression(), false, null, false);
}

enhancementsGammaExpression()
{
      return "$T ^ " + this.par.enhancements_gamma_value.val;
}

enhancementsAutoContrastChannel(imgWin, channel, contrast_limit_low, contrast_limit_high)
{
      console.writeln("Auto contrast on channel " + channel + ", low limit " + contrast_limit_low + ", high limit " + contrast_limit_high);

      // extract channel data
      var ch_id = this.engine.extractRGBchannel(imgWin.mainView.id, channel);
      var ch_win = this.util.findWindow(ch_id);

      this.engine.autoContrast(ch_win, contrast_limit_low, contrast_limit_high);

      return ch_id;
}

enhancementsAutoContrast(win, contrast_limit_low, contrast_limit_high, channels)
{
      if (channels) {
            this.addEnhancementsStep("Auto contrast channels with low limit " + contrast_limit_low + ", high limit " + contrast_limit_high);

            this.engine.R_id = this.enhancementsAutoContrastChannel(win, 'R', contrast_limit_low, contrast_limit_high);
            this.engine.G_id = this.enhancementsAutoContrastChannel(win, 'G', contrast_limit_low, contrast_limit_high);
            this.engine.B_id = this.enhancementsAutoContrastChannel(win, 'B', contrast_limit_low, contrast_limit_high);

            this.engine.runPixelMathRGBMapping(null, win, this.engine.R_id, this.engine.G_id, this.engine.B_id);

            this.util.closeOneWindowById(this.engine.R_id);
            this.util.closeOneWindowById(this.engine.G_id);
            this.util.closeOneWindowById(this.engine.B_id);

      } else {
            this.addEnhancementsStep("Auto contrast with low limit " + contrast_limit_low + ", high limit " + contrast_limit_high);

            this.engine.autoContrast(win, contrast_limit_low, contrast_limit_high);
      }
}

enhancementsNoiseReduction(win, mask_win)
{
      this.addEnhancementsStep("Noise reduction using " + this.engine.getNoiseReductionName());

      this.engine.runNoiseReductionEx(
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

      this.engine.runACDNRReduceNoise(enhancementsWin, mask_win);

      // this.guiUpdatePreviewWin(enhancementsWin);
}

enhancementsColorNoise(enhancementsWin)
{
      this.addEnhancementsStep("Color noise reduction");
      this.engine.runColorReduceNoise(enhancementsWin);
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

      this.engine.printAndSaveProcessValues(P, "", enhancementsWin.mainView.id);
      this.engine.engine_end_process(node);
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

      this.engine.printAndSaveProcessValues(P, "", low_pass_win.mainView.id);
      this.engine.engine_end_process(node);

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

      this.engine.printAndSaveProcessValues(P, "", high_pass_win.mainView.id);
      this.engine.engine_end_process(node);

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
                  this.engine.runMultiscaleLinearTransformSharpen(high_pass_win, mask_win);
            }
      } else if (this.par.enhancements_highpass_sharpen_method.val == 'UnsharpMask') {
            console.writeln("enhancementsHighPassSharpen: use UnsharpMask to sharpen " + high_pass_win.mainView.id);
            this.enhancementsUnsharpMask(high_pass_win, mask_win);
      } else if (this.par.enhancements_highpass_sharpen_method.val == 'BlurXTerminator') {
            console.writeln("enhancementsHighPassSharpen: use BlurXTerminator to sharpen " + high_pass_win.mainView.id);
            this.engine.runBlurXTerminator(high_pass_win, false);
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

      var P = this.runUnsharpMask(enhancementsWin, mask_win, this.par.enhancements_unsharpmask_stddev.val, this.par.enhancements_unsharpmask_amount.val);

      this.engine.printAndSaveProcessValues(P, "", enhancementsWin.mainView.id);
      this.engine.engine_end_process(node);

      // this.guiUpdatePreviewWin(enhancementsWin);
}

// Run UnsharpMask, optionally using a mask to sharpen only light parts of the image.
// No logging, returns the process.
runUnsharpMask(imgWin, maskWin, sigma, amount)
{
      var P = new UnsharpMask;
      P.sigma = sigma;
      P.amount = amount;
      P.useLuminance = true;

      if (maskWin != null) {
            /* Sharpen only light parts of the image. */
            this.engine.setMaskChecked(imgWin, maskWin);
            imgWin.maskInverted = false;
      }

      imgWin.mainView.beginProcess(UndoFlag.NoSwapFile);
      P.executeOn(imgWin.mainView, false);
      imgWin.mainView.endProcess();

      if (maskWin != null) {
            imgWin.removeMask();
      }

      return P;
}

enhancementsClarity(enhancementsWin, mask_win)
{
      this.addEnhancementsStep("Clarity using StdDev " + this.par.enhancements_clarity_stddev.val + ", amount " + this.par.enhancements_clarity_amount.val + (this.par.enhancements_clarity_mask.val ? " using a mask" : ""));

      if (!this.par.enhancements_clarity_mask.val) {
            mask_win = null;
      }
      var node = this.flowchart.flowchartOperation("UnsharpMask:clarity");

      var P = this.runUnsharpMask(enhancementsWin, mask_win, this.par.enhancements_clarity_stddev.val, this.par.enhancements_clarity_amount.val);

      this.engine.printAndSaveProcessValues(P, "", enhancementsWin.mainView.id);
      this.engine.engine_end_process(node);

      // this.guiUpdatePreviewWin(enhancementsWin);
}

enhancementsSharpen(enhancementsWin, mask_win)
{
      if (this.par.use_blurxterminator.val) {
            this.addEnhancementsStep("Sharpening using BlurXTerminator");
            this.engine.runBlurXTerminator(enhancementsWin, false);
      } else if (this.par.use_graxpert_deconvolution.val) {
            this.engine.runGraXpertDeconvolution(enhancementsWin);
      } else {
            this.addEnhancementsStep("Sharpening using MLT with " + this.par.enhancements_sharpen_iterations.val + " iterations");
            for (var i = 0; i < this.par.enhancements_sharpen_iterations.val; i++) {
                  this.engine.runMultiscaleLinearTransformSharpen(enhancementsWin, mask_win);
            }
      }
      // this.guiUpdatePreviewWin(enhancementsWin);
}

enhancementsSaturation(enhancementsWin, mask_win)
{
      var increase = !this.par.enhancements_less_saturation.val;
      var amount = this.par.enhancements_saturation_amount.val;
      this.addEnhancementsStep((increase ? "Increase" : "Decrease") + " saturation using amount " + amount);
      var node = this.flowchart.flowchartOperation(this.par.use_chrominance.val ? "CurvesTransformation:chrominance" : "CurvesTransformation:saturation");

      var P = this.runSaturationAmount(enhancementsWin, mask_win, amount, increase);

      if (P != null) {
            this.engine.printAndSaveProcessValues(P, this.par.use_chrominance.val ? "chrominance" : "saturation", enhancementsWin.mainView.id);
      }
      this.engine.engine_end_process(node);

      // this.guiUpdatePreviewWin(enhancementsWin);
}

// Saturation curve with strength 0-1. Strength 1 is the same curve that
// increaseSaturation and decreaseSaturation use.
saturationCurvePoints(increase, strength)
{
      if (this.par.use_chrominance.val) {
            var pt = increase ? [0.48604, 0.51200] : [0.51396, 0.4880];
      } else {
            var pt = increase ? [0.68734, 0.83204] : [0.49261, 0.41734];
      }
      return [ [0.00000, 0.00000], [pt[0], pt[0] + strength * (pt[1] - pt[0])], [1.00000, 1.00000] ];
}

// Change saturation by amount. Integer part of amount runs the full saturation
// curve that many times, fractional part runs a weaker curve once, so integer
// amounts match the old iterations. Mask is used only when increasing saturation.
// No logging, returns the last process or null.
runSaturationAmount(imgWin, maskWin, amount, increase)
{
      if (!increase) {
            maskWin = null; // No mask when decreasing saturation
      }
      var strengths = [];
      var iterations = Math.floor(amount + 0.001);
      for (var i = 0; i < iterations; i++) {
            strengths.push(1);
      }
      if (amount - iterations > 0.001) {
            strengths.push(amount - iterations);
      }

      if (maskWin != null) {
            /* Saturate only light parts of the image. */
            this.engine.setMaskChecked(imgWin, maskWin);
            imgWin.maskInverted = false;
      }

      var P = null;
      for (var i = 0; i < strengths.length; i++) {
            P = new CurvesTransformation;
            if (this.par.use_chrominance.val) {
                  P.c = this.saturationCurvePoints(increase, strengths[i]);
            } else {
                  P.S = this.saturationCurvePoints(increase, strengths[i]);
            }
            imgWin.mainView.beginProcess(UndoFlag.NoSwapFile);
            P.executeOn(imgWin.mainView, false);
            imgWin.mainView.endProcess();
      }

      if (maskWin != null) {
            imgWin.removeMask();
      }

      return P;
}

enhancementsHighlightColor(enhancementsWin)
{
      this.addEnhancementsStep("Enhance highlight color");
      var node = this.flowchart.flowchartOperation("PixelMath:enhance highlight color");

      if (this.global.get_flowchart_data) {
            return;
      }

      var lWin = this.engine.extractLchannel(enhancementsWin);

      this.engine.autoContrast(lWin, 20, 100);

      this.engine.setMaskChecked(enhancementsWin, lWin);
      enhancementsWin.maskInverted = false;

      var P = new PixelMath;
      P.expression = "combine($T, $T, op_mul())";
      P.useSingleExpression = true;
      P.showNewImage = false;
      P.createNewImage = false;
      P.newImageId = "";
      P.newImageColorSpace = PixelMath.RGB;

      enhancementsWin.mainView.beginProcess(UndoFlag.NoSwapFile);
      P.executeOn(enhancementsWin.mainView);
      enhancementsWin.mainView.endProcess();

      this.engine.printAndSaveProcessValues(P, "enhance highlight color", enhancementsWin.mainView.id);
      this.engine.engine_end_process(node);

      enhancementsWin.removeMask();
      this.util.closeOneWindow(lWin);
}

enhancementsBandingReduction(enhancementsWin)
{
      this.addEnhancementsStep("Banding reduction");

      this.engine.runBandingReduction(enhancementsWin);
}

enhancementsBackgroundNeutralization(enhancementsWin)
{
      this.addEnhancementsStep("Background neutralization");

      this.engine.runBackgroundNeutralization(enhancementsWin);
}

enhancementsGradientCorrection(enhancementsWin)
{
      if (this.par.enhancements_GC_method.val == 'Auto') {
            var gc_method = this.engine.getDefaultGradientCorrectionMethod();
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
      var id = this.engine.runGradientCorrection(enhancementsWin, true, gc_method);
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

      this.engine.engine_end_process(null);

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

      this.engine.engine_end_process(null);

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
      this.engine.engine_end_process(node);
      // this.guiUpdatePreviewWin(imgWin);
}

enhancementsSelectiveColor(imgWin)
{
      this.addEnhancementsStep("Selective Color");
      this.engine.selectiveColor.apply(imgWin.mainView);
      this.engine.engine_end_process(null);
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

      this.engine.engine_end_process(null);
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

      this.engine.engine_end_process(null);
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
            RGBNB_R_mapping = this.engine.replaceMappingImageNamesExt(RGBNB_R_mapping, mappings[i][0], mappings[i][1], "", null, null);
      }
      var RGBNB_G_mapping = target_palette.G;
      for (var i = 0; i < mappings.length; i++) {
            RGBNB_G_mapping = this.engine.replaceMappingImageNamesExt(RGBNB_G_mapping, mappings[i][0], mappings[i][1], "", null, null);
      }
      var RGBNB_B_mapping = target_palette.B;
      for (var i = 0; i < mappings.length; i++) {
            RGBNB_B_mapping = this.engine.replaceMappingImageNamesExt(RGBNB_B_mapping, mappings[i][0], mappings[i][1], "", null, null);
      }

      this.engine.runPixelMathRGBMapping(null, imgWin, RGBNB_R_mapping, RGBNB_G_mapping, RGBNB_B_mapping);
}

runEnhancementsNarrowbandMappingRGB(imgWin, source_palette_name, target_palette)
{
      console.writeln("runEnhancementsNarrowbandMappingRGB, from " + source_palette_name + " to " + target_palette.name);

      switch (source_palette_name) {
            case 'HOO':
                  var mappings = [
                        [ 'H', this.engine.extractRGBchannel(imgWin.mainView.id, 'R') ], 
                        [ 'O', this.engine.extractRGBchannel(imgWin.mainView.id, 'G') ]
                  ];
                  break;
            case 'SHO':
                  var mappings = [
                        [ 'S', this.engine.extractRGBchannel(imgWin.mainView.id, 'R') ], 
                        [ 'H', this.engine.extractRGBchannel(imgWin.mainView.id, 'G') ], 
                        [ 'O', this.engine.extractRGBchannel(imgWin.mainView.id, 'B') ]
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
                  var dynamic_palette = this.engine.findNarrowBandPalette("Dynamic HOO");
                  break;
            case 'SHO':
                  var dynamic_palette = this.engine.findNarrowBandPalette("Dynamic SHO");
                  break;
            default:
                  this.util.throwFatalError("Invalid Foraxx palette " + source_palette_name);
      }

      this.runEnhancementsNarrowbandMappingRGB(imgWin, source_palette_name, dynamic_palette);

      if (source_palette_name == 'SHO') {
            this.engine.runSCNR(imgWin, false);
            this.enhancementsOrangeBlueColors(imgWin);
      }
}

enhancementsNarrowbandMappingRGB(imgWin, source_palette_name, target_palette_name)
{
      this.addEnhancementsStep("Narrowband mapping from " + source_palette_name + " to " + target_palette_name);

      var target_palette = this.engine.findNarrowBandPalette(target_palette_name);

      this.runEnhancementsNarrowbandMappingRGB(imgWin, source_palette_name, target_palette);
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
      this.engine.setNewMaskWindow(this.util.findWindow('range_mask'));
      if (this.engine.mask_win == null) {
            this.util.throwFatalError("Could not find range_mask");
      }
      return this.engine.mask_win;
}

enhancementsOptionCompleted(param)
{
      console.writeln("enhancementsOptionCompleted " + param.name);
      if (this.par.enhancements_auto_reset.val && this.engine.enhancementsApply) {
            if (param.reset != undefined) {
                  console.writeln("enhancementsOptionCompleted reset " + param.name);
                  param.val = false;
                  param.reset();
            }
      }
      this.util.addProcessingStepAndStatusInfo("Completed: " + this.global.enhancements_info[this.global.enhancements_info.length - 1]);
      this.engine.checkCancel();
}

enhancementsProcessing(parent, id, apply_directly)
{
      console.noteln("Enhancements processing " + id + ", apply directly " + apply_directly + ", process_narrowband " + this.engine.process_narrowband);

      this.global.enhancements_info = [];

      this.engine.resolveAutoTools();

      var enhancements_image_id = id;
      var enhancements_stars_image_id = null;
      var enhancements_starless_image_id = null;
      var need_L_mask = this.par.enhancements_darker_background.val || 
                        this.par.enhancements_darker_highlights.val ||
                        this.par.enhancements_ET.val || 
                        this.par.enhancements_HDRMLT.val || 
                        this.par.enhancements_LHE.val ||
                        (this.par.enhancements_noise_reduction.val && !(this.par.use_noisexterminator.val || this.par.use_graxpert_denoise.val || this.par.use_deepsnr.val || this.par.use_mldenoise.val)) ||
                        this.par.enhancements_ACDNR.val ||
                        (this.par.enhancements_sharpen.val && !this.par.use_blurxterminator.val && !this.par.use_graxpert_deconvolution.val) ||
                        this.par.enhancements_unsharpmask.val ||
                        (this.par.enhancements_highpass_sharpen.val && !this.par.enhancements_highpass_sharpen_combine_only.val) ||
                        this.par.enhancements_saturation.val ||
                        (this.par.enhancements_clarity.val && this.par.enhancements_clarity_mask.val);

      var enhancementsWin = ImageWindow.windowById(id);

      enhancements_stars_image_id = null;

      this.engine.checkWinFilePathForOutputDir(enhancementsWin);
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
      if (this.engine.process_narrowband) {
            if (this.par.run_foraxx_mapping.val) {
                  this.enhancementsForaxx(enhancementsWin, this.par.foraxx_palette.val);
                  this.enhancementsOptionCompleted(this.par.run_foraxx_mapping);
            }
            if (this.par.run_enhancements_narrowband_mapping.val) {
                  this.enhancementsNarrowbandMappingRGB(enhancementsWin, this.par.enhancements_narrowband_mapping_source_palette.val, this.par.enhancements_narrowband_mapping_target_palette.val);
                  this.enhancementsOptionCompleted(this.par.run_enhancements_narrowband_mapping);
            }
            if (this.engine.standalone_narrowband_mappings != null) {
                  this.runEnhancementsNarrowbandMappingChannels(enhancementsWin, this.engine.standalone_narrowband_mappings.target_palette, this.engine.standalone_narrowband_mappings.mappings);
                  this.engine.standalone_narrowband_mappings = null;
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
                  this.engine.runSCNR(enhancementsWin, false);
                  this.enhancementsOptionCompleted(this.par.run_narrowband_SCNR);
                  this.enhancementsOptionCompleted(this.par.leave_some_green);
            } else if (this.par.run_narrowband_SCNR.val) {
                  this.addEnhancementsStep("Remove green cast");
                  this.engine.runSCNR(enhancementsWin, false);
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
      if (this.par.enhancements_curves.val) {
            this.enhancementsApplyCurves(enhancementsWin);
            this.enhancementsOptionCompleted(this.par.enhancements_curves);
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
                  this.engine.setNewMaskWindow(this.find_range_mask());
            } else if (this.par.enhancements_force_new_mask.val) {
                  this.engine.setNewMaskWindow(null);
            } else {
                  this.engine.setNewMaskWindow(this.engine.maskIsCompatible(enhancementsWin, this.engine.mask_win));
                  if (this.engine.mask_win == null) {
                        this.engine.setNewMaskWindow(this.engine.maskIsCompatible(enhancementsWin, this.util.findWindow(this.ppar.win_prefix +"AutoMask")));
                  }
            }
            if (this.engine.mask_win == null) {
                  this.flowchart.flowchartMaskBegin("New mask:enhancements");
                  this.global.creating_mask = true;
                  this.engine.setNewMaskWindow(this.engine.newMaskWindow(enhancementsWin, this.ppar.win_prefix + "AutoMask", false));
                  this.flowchart.flowchartMaskEnd("New mask:enhancements");
                  this.global.creating_mask = false;
            }
            console.writeln("Use mask " + this.engine.mask_win.mainView.id);
      }
      if (this.par.enhancements_shadowclipping.val) {
            this.enhancementsAdjustShadows(enhancementsWin, this.par.enhancements_shadowclippingperc.val);
            this.enhancementsOptionCompleted(this.par.enhancements_shadowclipping);
      }
      if (this.par.enhancements_darker_background.val) {
            this.enhancementsDarkerBackground(enhancementsWin, this.engine.mask_win);
            this.enhancementsOptionCompleted(this.par.enhancements_darker_background);
      }
      if (this.par.enhancements_darker_highlights.val) {
            this.enhancementsDarkerHighlights(enhancementsWin, this.engine.mask_win);
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
            this.enhancementsExponentialTransformation(enhancementsWin, this.engine.mask_win);
            this.enhancementsOptionCompleted(this.par.enhancements_ET);
      }
      if (this.par.enhancements_HDRMLT.val) {
            this.enhancementsHDRMultiscaleTransform(enhancementsWin, this.engine.mask_win);
            this.enhancementsOptionCompleted(this.par.enhancements_HDRMLT);
      }
      if (this.par.enhancements_LHE.val) {
            this.enhancementsLocalHistogramEqualization(enhancementsWin, this.engine.mask_win);
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
            this.enhancementsNoiseReduction(enhancementsWin, this.engine.mask_win);
            this.enhancementsOptionCompleted(this.par.enhancements_noise_reduction);
      }
      if (this.par.enhancements_ACDNR.val) {
            this.enhancementsACDNR(enhancementsWin, this.engine.mask_win);
            this.enhancementsOptionCompleted(this.par.enhancements_ACDNR);
      }
      if (this.par.enhancements_color_noise.val) {
            this.enhancementsColorNoise(enhancementsWin);
            this.enhancementsOptionCompleted(this.par.enhancements_color_noise);
      }
      if (this.par.enhancements_unsharpmask.val) {
            this.enhancementsUnsharpMask(enhancementsWin, this.engine.mask_win);
            this.enhancementsOptionCompleted(this.par.enhancements_unsharpmask);
      }
      if (this.par.enhancements_sharpen.val) {
            this.enhancementsSharpen(enhancementsWin, this.engine.mask_win);
            this.enhancementsOptionCompleted(this.par.enhancements_sharpen);
      }
      if (this.par.enhancements_highpass_sharpen.val) {
            this.enhancementsHighPassSharpen(enhancementsWin, this.engine.mask_win);
            this.enhancementsOptionCompleted(this.par.enhancements_highpass_sharpen);
      }
      if (this.par.enhancements_saturation.val) {
            this.enhancementsSaturation(enhancementsWin, this.engine.mask_win);
            this.enhancementsOptionCompleted(this.par.enhancements_saturation);
      }
      if (this.par.enhancements_highlight_color.val) {
            this.enhancementsHighlightColor(enhancementsWin);
            this.enhancementsOptionCompleted(this.par.enhancements_highlight_color);
      }
      if (this.par.enhancements_clarity.val) {
            this.enhancementsClarity(enhancementsWin, this.engine.mask_win);
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
                  this.engine.starReduceNoise(ImageWindow.windowById(enhancements_stars_image_id));
            } else {
                  this.engine.starReduceNoise(enhancementsWin);
            }
            this.enhancementsOptionCompleted(this.par.enhancements_star_noise_reduction);
      }
      if (this.par.enhancements_combine_stars.val) {
            /* Restore stars by combining starless image and stars. */
            this.addEnhancementsStep("Combine stars and starless images using " + this.par.enhancements_combine_stars_mode.val + ", reduce stars by " + this.par.enhancements_combine_stars_reduce.val);
            var new_image_id = this.engine.combineStarsAndStarless(
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
            this.engine.runColorCalibrationProcess(enhancementsWin);
            this.enhancementsOptionCompleted(this.par.enhancements_color_calibration);
      }
      if (this.par.enhancements_solve_image.val) {
            this.addEnhancementsStep("Image solver");
            this.engine.imageSolver.runImageSolver(enhancementsWin.mainView.id);
            this.enhancementsOptionCompleted(this.par.enhancements_solve_image);
      }
      if (this.par.enhancements_annotate_image.val) {
            this.addEnhancementsStep("Annotate image");
            let autoIntegrateAnnotateImage = new AutoIntegrateAnnotateImage(this.util, this.engine);
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
            this.engine.final_win = ImageWindow.windowById(enhancementsWin.mainView.id);
            this.engine.guiUpdatePreviewWin(this.engine.final_win);
            this.engine.saveEnhancementsHistoryToImage(this.engine.final_win);
            this.engine.setFinalImageKeyword(this.engine.final_win);
      } else {
            this.engine.final_win = ImageWindow.windowById(enhancements_image_id);
            this.engine.guiUpdatePreviewWin(this.engine.final_win);
            this.engine.saveEnhancementsHistoryToImage(this.engine.final_win);
            this.engine.setFinalImageKeyword(this.engine.final_win);
            this.engine.saveProcessedWindow(enhancements_image_id); /* Enhancements window */
            if (this.par.enhancements_remove_stars.val) {
                  this.engine.saveProcessedWindow(enhancements_starless_image_id);      /* Enhancements starless window */
                  this.engine.saveProcessedWindow(enhancements_stars_image_id);         /* Enhancements stars window */
            }
      }
      console.writeln("Enhancements processing done " + enhancements_image_id);

      return [ enhancements_image_id, enhancements_starless_image_id, enhancements_stars_image_id ];

}
 
/***************************************************************************
 * 
 *    enhancementsProcessingEngine
 * 
 */
enhancementsProcessingEngine(parent, enhancements_target_image, enhancements_narrowband)
{
       this.engine.get_local_copies_of_parameters();

       this.engine.engineInit();
       this.flowchart.flowchartReset();

       this.global.is_processing = this.global.processing_state.enhancements_processing;
       this.global.cancel_processing = false;
       this.engine.medianFWHM = null;

       this.engine.process_narrowband = enhancements_narrowband;

       this.engine.setNewMaskWindow(null);
       this.engine.star_mask_win_id = null;
       this.engine.star_fix_mask_win = null;
       this.engine.star_fix_mask_win_id = null;
       this.global.processing_steps = "";
       this.global.processing_warnings = "";

       this.engine.iconized_image_ids = [];
       this.engine.save_id_list = [];

       this.global.test_image_ids = [];

       console.noteln("");
       console.noteln("Start enhancements processing...");
       this.engine.guiUpdatePreviewId(enhancements_target_image);
 
       var enhancements_wins = this.enhancementsProcessing(parent, enhancements_target_image, true);
 
       console.noteln("enhancementsProcessingEngine " + enhancements_target_image + " completed.");
 
       this.engine.setNewMaskWindow(null);                                                    /* AutoMask window is always closed */
       this.engine.endProcessingIconizeAndKeywordif(this.engine.star_mask_win_id, false, true);      /* AutoStarMask or star_mask window */
       this.engine.endProcessingIconizeAndKeywordif(this.engine.star_fix_mask_win_id, false, true);  /* AutoStarFixMask or star_fix_mask window */

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

} // class AutoIntegrateEnhancementsEngine

#endif  /* AUTOINTEGRATEENHANCEMENTSENGINE_JS */
