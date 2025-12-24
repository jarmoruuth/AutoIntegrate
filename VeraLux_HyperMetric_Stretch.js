// ****************************************************************************
// VeraLux — HyperMetric Stretch with Preview
// Photometric Hyperbolic Stretch Engine for PixInsight
//
// This version is converted from the original Python implementation,
// adapted for PixInsight JavaScript Runtime by Jarmo Ruuth using
// Claude AI (2025).
//
// All problems and bugs are likely due to the conversion process and
// not present in the original implementation.
//
// Original Python version Author: Riccardo Paterniti (2025)
// Original Python version contact: https://veralux.space/
// ****************************************************************************
//
// (c) 2025 Riccardo Paterniti
// VeraLux — HyperMetric Stretch
// SPDX-License-Identifier: GPL-3.0-or-later
// Version 1.3.0 (PixInsight JavaScript Port with Preview)
//
// Credits / Origin
// ----------------
//   • Original Python version implementation by Riccardo Paterniti (2025)
//   • Inspired by: The "True Color" methodology of Dr. Roger N. Clark
//   • Math basis: Inverse Hyperbolic Stretch (IHS) & Vector Color Preservation
//   • Sensor Science: Hardware-specific Quantum Efficiency weighting
//   • PixInsight port: Converted from Python/Siril implementation using Claude AI (2025)
//   • Python Source Repository: https://gitlab.com/free-astro/siril-scripts/-/blob/main/processing/VeraLux_HyperMetric_Stretch.py?ref_type=heads
//
// ****************************************************************************

#feature-id    AutoIntegrate  > VeraLux HyperMetric Stretch
#feature-info  Photometric Hyperbolic Stretch Engine with True Color preservation and Preview.\
               <br/><br/>\
               Version 1.3.0\
               <br/><br/>\
               Copyright (c) 2025 Riccardo Paterniti. Released under GPL-3.0-or-later.\
               <br/><br/>\
               Original Python version contact: https://veralux.space/

#include <pjsr/NumericControl.jsh>
#include <pjsr/Sizer.jsh>
#include <pjsr/FrameStyle.jsh>
#include <pjsr/TextAlign.jsh>
#include <pjsr/StdButton.jsh>
#include <pjsr/StdIcon.jsh>
#include <pjsr/UndoFlag.jsh>
#include <pjsr/SampleType.jsh>
#include <pjsr/ColorSpace.jsh>

#include "AutoIntegrateVeraLuxHMS.js"
#include "BasicPreviewControl.js"

#define TITLE   "VeraLux HyperMetric Stretch"

// =============================================================================
//  DIALOG WITH PREVIEW
// =============================================================================

function VeraLuxPreviewDialog(veralux) {
   this.__base__ = Dialog;
   this.__base__();

   var parameters = veralux.parameters;
   var SENSOR_PROFILES = veralux.getSensorProfiles();

   var self = this;

   this.windowTitle = TITLE + " v" + VERALUX_VERSION;
   this.minWidth = 1000;

   // Store original image for reset functionality
   this.originalImage = null;
   this.previewImage = null;
   this.selectedWindow = null;

   // -------------------------------------------------------------------------
   // Helper functions
   // -------------------------------------------------------------------------

   this.updateProfileInfo = function() {
      var profile = SENSOR_PROFILES[parameters.sensorProfile];
      if (profile) {
         var w = profile.weights;
         this.profileInfoLabel.text = format("%s (R:%.2f G:%.2f B:%.2f)",
            profile.description, w[0], w[1], w[2]);
      }
   };

   this.updateModeUI = function() {
      var isReady = parameters.processingMode === "Ready-to-Use";
      this.readyToUseSection.visible = isReady;
      this.scientificSection.visible = !isReady;

      if (isReady) {
         this.modeInfoLabel.text = "✓ Ready-to-Use: Unified Color Strategy enabled.";
      } else {
         this.modeInfoLabel.text = "✓ Scientific: Full manual parameter control.";
      }

      this.adjustToContents();
   };

   this.updateStrategyFeedback = function() {
      var val = parameters.colorStrategy;
      var params = parameters.getEffectiveParams();

      if (val < 0) {
         this.strategyFeedbackLabel.text = format("Action: Noise Cleaning (Shadow Conv: %.1f)", params.shadow);
      } else if (val > 0) {
         this.strategyFeedbackLabel.text = format("Action: Highlight Softening (Grip: %.2f)", params.grip);
      } else {
         this.strategyFeedbackLabel.text = "Balanced (Pure Vector)";
      }
   };

   this.getOpenWindows = function() {
      var windows = [];
      var allWindows = ImageWindow.windows;
      for (var i = 0; i < allWindows.length; i++) {
         if (!allWindows[i].isNull && !allWindows[i].mainView.isNull) {
            windows.push(allWindows[i]);
         }
      }
      return windows;
   };

   this.updateImageList = function() {
      this.imageComboBox.clear();
      var windows = this.getOpenWindows();
      
      if (windows.length === 0) {
         this.imageComboBox.addItem("<No images>");
         this.previewButton.enabled = false;
         this.resetButton.enabled = false;
         this.processButton.enabled = false;
         return;
      }

      for (var i = 0; i < windows.length; i++) {
         this.imageComboBox.addItem(windows[i].mainView.id);
      }

      this.previewButton.enabled = true;
      this.resetButton.enabled = true;
      this.processButton.enabled = true;
   };

   this.loadOriginalImage = function() {
      var windows = this.getOpenWindows();
      if (windows.length === 0 || this.imageComboBox.currentItem < 0) {
         return false;
      }

      this.selectedWindow = windows[this.imageComboBox.currentItem];
      var sourceImage = this.selectedWindow.mainView.image;

      // Create a copy of the original image
      if (this.originalImage) {
         this.originalImage.free();
      }
      this.originalImage = new Image(sourceImage);

      // Create preview image (copy of original)
      if (this.previewImage) {
         this.previewImage.free();
      }
      this.previewImage = new Image(sourceImage);

      // Update preview control
      this.previewControl.SetImage(this.previewImage, this.selectedWindow.mainView.id);

      this.statusLabel.text = "Loaded: " + this.selectedWindow.mainView.id;
      return true;
   };

   this.resetPreview = function() {
      if (!this.originalImage) {
         this.statusLabel.text = "No image loaded.";
         return;
      }

      // Reset preview image to original
      if (this.previewImage) {
         this.previewImage.free();
      }
      this.previewImage = new Image(this.originalImage);

      this.previewControl.UpdateImage(this.previewImage, this.selectedWindow.mainView.id);
      this.statusLabel.text = "Preview reset to original image.";
   };

   this.applyPreview = function() {
      if (!this.previewImage || !this.selectedWindow) {
         this.statusLabel.text = "No image loaded for preview.";
         return;
      }

      console.show();
      console.writeln("Applying VeraLux stretch to preview...");

      this.previewButton.enabled = false;
      this.statusLabel.text = "Processing preview...";
      processEvents();

      try {
         // Get effective parameters
         var effectiveParams = parameters.getEffectiveParams();

         var logD;
         if (parameters.useAutoD) {
            console.writeln("Auto-solving Log D for preview...");
            var weights = SENSOR_PROFILES[parameters.sensorProfile].weights;
            logD = veralux.VeraLuxCore.solveLogD(
               this.previewImage,
               parameters.targetBg,
               parameters.protectB,
               weights,
               parameters.useAdaptiveAnchor
            );
            this.logDControl.setValue(logD);
            parameters.logD = logD;
         } else {
            logD = parameters.logD;
         }

         var procParams = {
            sensorProfile: parameters.sensorProfile,
            processingMode: parameters.processingMode,
            targetBg: parameters.targetBg,
            logD: logD,
            protectB: parameters.protectB,
            convergencePower: parameters.convergencePower,
            colorGrip: effectiveParams.grip,
            shadowConvergence: effectiveParams.shadow,
            useAdaptiveAnchor: parameters.useAdaptiveAnchor
         };

         console.writeln("Preview Parameters:");
         console.writeln(format("  Log D: %.2f", procParams.logD));
         console.writeln(format("  Color Grip: %.2f", procParams.colorGrip));
         console.writeln(format("  Shadow Conv: %.2f", procParams.shadowConvergence));

         // Create a temporary view for processing
         var tempWindow = new ImageWindow(
            this.previewImage.width,
            this.previewImage.height,
            this.previewImage.numberOfChannels,
            32,
            true,
            this.previewImage.colorSpace != ColorSpace_Gray,
            "VeraLux_temp"
         );

         tempWindow.mainView.beginProcess(UndoFlag_NoSwapFile);
         tempWindow.mainView.image.assign(this.previewImage);
         tempWindow.mainView.endProcess();

         // Process the temp view
         tempWindow.mainView.beginProcess(UndoFlag_NoSwapFile);
         veralux.processVeraLux(tempWindow.mainView, procParams, function(msg) {
            console.writeln(msg);
            processEvents();
         });
         tempWindow.mainView.endProcess();

         // Copy result back to preview image
         this.previewImage.free();
         this.previewImage = new Image(tempWindow.mainView.image);
         tempWindow.forceClose();

         // Update preview
         this.previewControl.UpdateImage(this.previewImage, this.selectedWindow.mainView.id + " [Preview]");

         this.statusLabel.text = "Preview updated successfully.";
         console.writeln("Preview processing complete.");

      } catch (error) {
         this.statusLabel.text = "Error during preview: " + error.message;
         console.criticalln("Preview Error: " + error.message);
      }

      this.previewButton.enabled = true;
   };

   this.processFinal = function() {
      if (!this.selectedWindow) {
         this.statusLabel.text = "No image selected.";
         return;
      }

      console.show();
      console.writeln("Creating final processed image...");

      this.processButton.enabled = false;
      processEvents();

      try {
         var sourceWindow = this.selectedWindow;

         // Create new window with processed result
         var targetWindow = new ImageWindow(
            sourceWindow.mainView.image.width,
            sourceWindow.mainView.image.height,
            sourceWindow.mainView.image.numberOfChannels,
            sourceWindow.mainView.window.bitsPerSample,
            sourceWindow.mainView.window.isFloatSample,
            sourceWindow.mainView.image.colorSpace != ColorSpace_Gray,
            sourceWindow.mainView.id + "_VeraLux"
         );

         targetWindow.mainView.beginProcess(UndoFlag_NoSwapFile);
         targetWindow.mainView.image.assign(sourceWindow.mainView.image);
         targetWindow.mainView.endProcess();

         targetWindow.keywords = sourceWindow.keywords;
         targetWindow.show();

         // Execute the stretch
         veralux.execute(targetWindow);

         this.statusLabel.text = "Final image created: " + targetWindow.mainView.id;
         console.writeln("Final processing complete.");

      } catch (error) {
         this.statusLabel.text = "Error during final processing: " + error.message;
         console.criticalln("Processing Error: " + error.message);
      }

      this.processButton.enabled = true;
   };

   // -------------------------------------------------------------------------
   // Left Side: Preview Control
   // -------------------------------------------------------------------------

   this.previewControl = new BasicPreviewControl(this, "veralux_preview", 400, 400);

   // Image selection
   this.imageLabel = new Label(this);
   this.imageLabel.text = "Select Image:";
   this.imageLabel.textAlignment = TextAlign_Right | TextAlign_VertCenter;
   this.imageLabel.minWidth = 80;

   this.imageComboBox = new ComboBox(this);
   this.imageComboBox.toolTip = "Select an image to preview stretch parameters.";
   this.imageComboBox.onItemSelected = function(index) {
      self.loadOriginalImage();
   };

   this.refreshButton = new ToolButton(this);
   this.refreshButton.icon = this.scaledResource(":/icons/reload.png");
   this.refreshButton.setScaledFixedSize(24, 24);
   this.refreshButton.toolTip = "Refresh image list";
   this.refreshButton.onClick = function() {
      self.updateImageList();
   };

   this.imageSelectSizer = new HorizontalSizer;
   this.imageSelectSizer.spacing = 4;
   this.imageSelectSizer.add(this.imageLabel);
   this.imageSelectSizer.add(this.imageComboBox, 100);
   this.imageSelectSizer.add(this.refreshButton);

   // Preview buttons
   this.previewButton = new PushButton(this);
   this.previewButton.text = "Update Preview";
   this.previewButton.icon = this.scaledResource(":/icons/play.png");
   this.previewButton.toolTip = "Apply stretch to preview image.";
   this.previewButton.onClick = function() {
      self.applyPreview();
   };

   this.resetPreviewButton = new PushButton(this);
   this.resetPreviewButton.text = "Reset Preview";
   this.resetPreviewButton.icon = this.scaledResource(":/icons/reload.png");
   this.resetPreviewButton.toolTip = "Reset preview to original image.";
   this.resetPreviewButton.onClick = function() {
      self.resetPreview();
   };

   this.previewButtonsSizer = new HorizontalSizer;
   this.previewButtonsSizer.spacing = 4;
   this.previewButtonsSizer.add(this.previewButton, 50);
   this.previewButtonsSizer.add(this.resetPreviewButton, 50);

   this.leftSizer = new VerticalSizer;
   this.leftSizer.spacing = 4;
   this.leftSizer.add(this.imageSelectSizer);
   this.leftSizer.add(this.previewControl, 100);
   this.leftSizer.add(this.previewButtonsSizer);

   // -------------------------------------------------------------------------
   // Right Side: Title and Controls
   // -------------------------------------------------------------------------

   this.titleLabel = new Label(this);
   this.titleLabel.text = TITLE + " v" + VERALUX_VERSION;
   this.titleLabel.textAlignment = TextAlign_Center;
   this.titleLabel.styleSheet = "font-size: 14pt; font-weight: bold; color: #4488FF;";

   this.subtitleLabel = new Label(this);
   this.subtitleLabel.text = "Requirement: Linear Data • Color Calibration (SPCC) Applied";
   this.subtitleLabel.textAlignment = TextAlign_Center;
   this.subtitleLabel.styleSheet = "font-size: 9pt; color: #888888; font-style: italic;";

   this.copyrightLabel = new Label(this);
   this.copyrightLabel.text = "Original Python implementation (c) 2025 Riccardo Paterniti";
   this.copyrightLabel.textAlignment = TextAlign_Center;
   this.copyrightLabel.styleSheet = "font-size: 9pt; color: #888888; font-style: italic;";

   // -------------------------------------------------------------------------
   // Section 0: Processing Mode
   // -------------------------------------------------------------------------

   this.modeGroupBox = new GroupBox(this);
   this.modeGroupBox.title = "0. Processing Mode";

   this.readyToUseRadio = new RadioButton(this.modeGroupBox);
   this.readyToUseRadio.text = "Ready-to-Use (Aesthetic)";
   this.readyToUseRadio.toolTip = "Produces an aesthetic, export-ready image with adaptive expansion and soft-clipping.";
   this.readyToUseRadio.checked = parameters.processingMode === "Ready-to-Use";
   this.readyToUseRadio.onCheck = function(checked) {
      if (checked) {
         parameters.processingMode = "Ready-to-Use";
         self.updateModeUI();
      }
   };

   this.scientificRadio = new RadioButton(this.modeGroupBox);
   this.scientificRadio.text = "Scientific (Preserve)";
   this.scientificRadio.toolTip = "Produces 100% mathematically consistent output. Ideal for manual tone mapping.";
   this.scientificRadio.checked = parameters.processingMode === "scientific";
   this.scientificRadio.onCheck = function(checked) {
      if (checked) {
         parameters.processingMode = "Scientific";
         self.updateModeUI();
      }
   };

   this.modeInfoLabel = new Label(this.modeGroupBox);
   this.modeInfoLabel.styleSheet = "color: #888888; font-size: 9pt;";

   this.modeGroupBoxSizer = new VerticalSizer;
   this.modeGroupBoxSizer.margin = 6;
   this.modeGroupBoxSizer.spacing = 4;
   this.modeGroupBoxSizer.add(this.readyToUseRadio);
   this.modeGroupBoxSizer.add(this.scientificRadio);
   this.modeGroupBoxSizer.add(this.modeInfoLabel);
   this.modeGroupBox.sizer = this.modeGroupBoxSizer;

   // -------------------------------------------------------------------------
   // Section 1: Sensor Calibration
   // -------------------------------------------------------------------------

   this.sensorGroupBox = new GroupBox(this);
   this.sensorGroupBox.title = "1. Sensor Calibration";

   this.profileLabel = new Label(this.sensorGroupBox);
   this.profileLabel.text = "Sensor Profile:";
   this.profileLabel.textAlignment = TextAlign_Right | TextAlign_VertCenter;

   this.profileComboBox = new ComboBox(this.sensorGroupBox);
   this.profileComboBox.toolTip = "Defines the Luminance coefficients (Weights) used for the stretch.";
   for (var key in SENSOR_PROFILES) {
      if (SENSOR_PROFILES.hasOwnProperty(key)) {
         this.profileComboBox.addItem(key);
      }
   }
   this.profileComboBox.currentItem = this.profileComboBox.findItem(parameters.sensorProfile);
   this.profileComboBox.onItemSelected = function(index) {
      parameters.sensorProfile = self.profileComboBox.itemText(index);
      self.updateProfileInfo();
   };

   this.profileInfoLabel = new Label(this.sensorGroupBox);
   this.profileInfoLabel.styleSheet = "color: #888888; font-size: 9pt;";

   this.sensorProfileSizer = new HorizontalSizer;
   this.sensorProfileSizer.spacing = 4;
   this.sensorProfileSizer.add(this.profileLabel);
   this.sensorProfileSizer.add(this.profileComboBox, 100);

   this.sensorGroupBoxSizer = new VerticalSizer;
   this.sensorGroupBoxSizer.margin = 6;
   this.sensorGroupBoxSizer.spacing = 4;
   this.sensorGroupBoxSizer.add(this.sensorProfileSizer);
   this.sensorGroupBoxSizer.add(this.profileInfoLabel);
   this.sensorGroupBox.sizer = this.sensorGroupBoxSizer;

   // Top row (Mode + Sensor)
   this.topRowSizer = new HorizontalSizer;
   this.topRowSizer.spacing = 8;
   this.topRowSizer.add(this.modeGroupBox);
   this.topRowSizer.add(this.sensorGroupBox);

   // -------------------------------------------------------------------------
   // Section 2: Stretch Engine & Calibration
   // -------------------------------------------------------------------------

   this.stretchGroupBox = new GroupBox(this);
   this.stretchGroupBox.title = "2. Stretch Engine & Calibration";

   // Target Background
   this.targetBgControl = new NumericControl(this.stretchGroupBox);
   this.targetBgControl.label.text = "Target Bg:";
   this.targetBgControl.label.minWidth = 60;
   this.targetBgControl.setRange(0.0, 0.50);
   this.targetBgControl.slider.setRange(0.0, 500.0);
   this.targetBgControl.slider.scaledMinWidth = 200;
   this.targetBgControl.setPrecision(2);
   this.targetBgControl.setValue(parameters.targetBg);
   this.targetBgControl.toolTip = "Target background median (0.05-0.50). Standard is 0.20.";
   this.targetBgControl.onValueUpdated = function(value) {
      parameters.targetBg = value;
   };

   // Adaptive Anchor checkbox
   this.adaptiveAnchorCheckBox = new CheckBox(this.stretchGroupBox);
   this.adaptiveAnchorCheckBox.text = "Adaptive Anchor";
   this.adaptiveAnchorCheckBox.toolTip = "Analyzes histogram shape to find true signal start. Recommended for images with gradients.";
   this.adaptiveAnchorCheckBox.checked = parameters.useAdaptiveAnchor;
   this.adaptiveAnchorCheckBox.onCheck = function(checked) {
      parameters.useAdaptiveAnchor = checked;
   };

   // Auto-Calculate checkbox
   this.autoCalcCheckBox = new CheckBox(this.stretchGroupBox);
   this.autoCalcCheckBox.text = "⚡ Auto-Calc Log D";
   this.autoCalcCheckBox.toolTip = "Automatically calculate optimal Stretch Factor (Log D) when updating preview.";
   this.autoCalcCheckBox.checked = parameters.useAutoD;
   this.autoCalcCheckBox.onCheck = function(checked) {
      parameters.useAutoD = checked;
   };

   this.calibRowSizer = new HorizontalSizer;
   this.calibRowSizer.spacing = 4;
   this.calibRowSizer.add(this.targetBgControl);
   this.calibRowSizer.addSpacing(8);
   this.calibRowSizer.add(this.adaptiveAnchorCheckBox);
   this.calibRowSizer.addStretch();
   this.calibRowSizer.add(this.autoCalcCheckBox);

   // Log D control
   this.logDControl = new NumericControl(this.stretchGroupBox);
   this.logDControl.label.text = "Log D:";
   this.logDControl.label.minWidth = 60;
   this.logDControl.setRange(0, 7);
   this.logDControl.slider.setRange(0, 700);
   this.logDControl.slider.scaledMinWidth = 200;
   this.logDControl.setPrecision(2);
   this.logDControl.setValue(parameters.logD);
   this.logDControl.toolTip = "Hyperbolic Intensity (Log D). Controls the strength of the stretch.";
   this.logDControl.onValueUpdated = function(value) {
      parameters.logD = value;
   };

   // Protect B control
   this.protectBControl = new NumericControl(this.stretchGroupBox);
   this.protectBControl.label.text = "Protect b:";
   this.protectBControl.label.minWidth = 60;
   this.protectBControl.setRange(0.1, 15);
   this.protectBControl.slider.setRange(1, 150);
   this.protectBControl.slider.scaledMinWidth = 200;
   this.protectBControl.setPrecision(1);
   this.protectBControl.setValue(parameters.protectB);
   this.protectBControl.toolTip = "Highlight Protection. Controls the 'knee' of the hyperbolic curve.";
   this.protectBControl.onValueUpdated = function(value) {
      parameters.protectB = value;
   };

   this.stretchGroupBoxSizer = new VerticalSizer;
   this.stretchGroupBoxSizer.margin = 6;
   this.stretchGroupBoxSizer.spacing = 4;
   this.stretchGroupBoxSizer.add(this.calibRowSizer);
   this.stretchGroupBoxSizer.add(this.logDControl);
   this.stretchGroupBoxSizer.add(this.protectBControl);
   this.stretchGroupBox.sizer = this.stretchGroupBoxSizer;

   // -------------------------------------------------------------------------
   // Section 3: Physics & Color Engine
   // -------------------------------------------------------------------------

   this.physicsGroupBox = new GroupBox(this);
   this.physicsGroupBox.title = "3. Physics & Color Engine";

   // Convergence Power
   this.convergenceControl = new NumericControl(this.physicsGroupBox);
   this.convergenceControl.label.text = "Star Core Recovery:";
   this.convergenceControl.label.minWidth = 120;
   this.convergenceControl.setRange(1, 10);
   this.convergenceControl.slider.setRange(10, 100);
   this.convergenceControl.slider.scaledMinWidth = 150;
   this.convergenceControl.setPrecision(1);
   this.convergenceControl.setValue(parameters.convergencePower);
   this.convergenceControl.toolTip = "Controls how quickly saturated colors transition to white.";
   this.convergenceControl.onValueUpdated = function(value) {
      parameters.convergencePower = value;
   };

   // Ready-to-Use Section (Unified Color Strategy)
   this.readyToUseSection = new Control(this.physicsGroupBox);

   this.colorStrategyLabel = new Label(this.readyToUseSection);
   this.colorStrategyLabel.text = "Color Strategy:";
   this.colorStrategyLabel.textAlignment = TextAlign_Right | TextAlign_VertCenter;
   this.colorStrategyLabel.minWidth = 120;

   this.colorStrategySlider = new Slider(this.readyToUseSection);
   this.colorStrategySlider.setRange(-100, 100);
   this.colorStrategySlider.value = parameters.colorStrategy;
   this.colorStrategySlider.toolTip = "Left: Clean Noise | Center: Balanced | Right: Soften Highlights. Double-click to reset.";
   this.colorStrategySlider.onValueUpdated = function(value) {
      parameters.colorStrategy = value;
      self.updateStrategyFeedback();
   };

   this.strategyFeedbackLabel = new Label(this.readyToUseSection);
   this.strategyFeedbackLabel.styleSheet = "color: #888888; font-size: 8pt; font-style: italic;";

   this.readyToUseSizer = new VerticalSizer;
   this.readyToUseSizer.margin = 0;
   this.readyToUseSizer.spacing = 2;

   this.strategyRowSizer = new HorizontalSizer;
   this.strategyRowSizer.spacing = 4;
   this.strategyRowSizer.add(this.colorStrategyLabel);
   this.strategyRowSizer.add(this.colorStrategySlider, 100);

   this.readyToUseSizer.add(this.strategyRowSizer);
   this.readyToUseSizer.add(this.strategyFeedbackLabel);
   this.readyToUseSection.sizer = this.readyToUseSizer;

   // Scientific Section (Full Manual Control)
   this.scientificSection = new Control(this.physicsGroupBox);

   this.colorGripControl = new NumericControl(this.scientificSection);
   this.colorGripControl.label.text = "Color Grip (Global):";
   this.colorGripControl.label.minWidth = 120;
   this.colorGripControl.setRange(0, 1);
   this.colorGripControl.slider.setRange(0, 100);
   this.colorGripControl.slider.scaledMinWidth = 150;
   this.colorGripControl.setPrecision(2);
   this.colorGripControl.setValue(parameters.colorGrip);
   this.colorGripControl.toolTip = "Controls vector color preservation. 1.0 = Pure VeraLux.";
   this.colorGripControl.onValueUpdated = function(value) {
      parameters.colorGrip = value;
   };

   this.shadowConvControl = new NumericControl(this.scientificSection);
   this.shadowConvControl.label.text = "Shadow Conv. (Noise):";
   this.shadowConvControl.label.minWidth = 120;
   this.shadowConvControl.setRange(0, 3);
   this.shadowConvControl.slider.setRange(0, 300);
   this.shadowConvControl.slider.scaledMinWidth = 150;
   this.shadowConvControl.setPrecision(1);
   this.shadowConvControl.setValue(parameters.shadowConvergence);
   this.shadowConvControl.toolTip = "Damps vector preservation in shadows to prevent color noise.";
   this.shadowConvControl.onValueUpdated = function(value) {
      parameters.shadowConvergence = value;
   };

   this.scientificSizer = new VerticalSizer;
   this.scientificSizer.margin = 0;
   this.scientificSizer.spacing = 4;
   this.scientificSizer.add(this.colorGripControl);
   this.scientificSizer.add(this.shadowConvControl);
   this.scientificSection.sizer = this.scientificSizer;

   this.physicsGroupBoxSizer = new VerticalSizer;
   this.physicsGroupBoxSizer.margin = 6;
   this.physicsGroupBoxSizer.spacing = 4;
   this.physicsGroupBoxSizer.add(this.convergenceControl);
   this.physicsGroupBoxSizer.add(this.readyToUseSection);
   this.physicsGroupBoxSizer.add(this.scientificSection);
   this.physicsGroupBox.sizer = this.physicsGroupBoxSizer;

   // -------------------------------------------------------------------------
   // Status
   // -------------------------------------------------------------------------

   this.statusLabel = new Label(this);
   this.statusLabel.text = "Ready. Select image and configure parameters.";
   this.statusLabel.textAlignment = TextAlign_Center;
   this.statusLabel.styleSheet = "color: #AAAAAA;";

   // -------------------------------------------------------------------------
   // Buttons
   // -------------------------------------------------------------------------

   this.newInstanceButton = new ToolButton(this);
   this.newInstanceButton.icon = this.scaledResource(":/process-interface/new-instance.png");
   this.newInstanceButton.setScaledFixedSize(24, 24);
   this.newInstanceButton.toolTip = "New Instance";
   this.newInstanceButton.onMousePress = function() {
      this.hasFocus = true;
      this.pushed = false;
      this.dialog.newInstance();
   };

   this.resetButton = new PushButton(this);
   this.resetButton.text = "Reset";
   this.resetButton.toolTip = "Reset all parameters to defaults.";
   this.resetButton.onClick = function() {
      parameters.reset();
      self.updateControls();
   };

   this.helpButton = new PushButton(this);
   this.helpButton.text = "?";
   this.helpButton.setFixedWidth(25);
   this.helpButton.toolTip = veralux.getHelpText();
   this.helpButton.onClick = function() {
      new MessageBox(veralux.getHelpText(), "Veralux help", StdIcon_Information ).execute();
   };

   this.processButton = new PushButton(this);
   this.processButton.text = "Process Final";
   this.processButton.icon = this.scaledResource(":/icons/power.png");
   this.processButton.toolTip = "Create final processed image (does not overwrite original).";
   this.processButton.onClick = function() {
      self.processFinal();
   };

   this.closeButton = new PushButton(this);
   this.closeButton.text = "Close";
   this.closeButton.icon = this.scaledResource(":/icons/close.png");
   this.closeButton.onClick = function() {
      self.ok();
   };

   this.buttonsSizer = new HorizontalSizer;
   this.buttonsSizer.spacing = 6;
   this.buttonsSizer.add(this.newInstanceButton);
   this.buttonsSizer.add(this.helpButton);
   this.buttonsSizer.add(this.resetButton);
   this.buttonsSizer.addStretch();
   this.buttonsSizer.add(this.processButton);
   this.buttonsSizer.add(this.closeButton);

   // -------------------------------------------------------------------------
   // Right Side Layout
   // -------------------------------------------------------------------------

   this.rightSizer = new VerticalSizer;
   this.rightSizer.spacing = 8;
   this.rightSizer.add(this.titleLabel);
   this.rightSizer.add(this.subtitleLabel);
   this.rightSizer.add(this.copyrightLabel);
   this.rightSizer.add(this.topRowSizer);
   this.rightSizer.add(this.stretchGroupBox);
   this.rightSizer.add(this.physicsGroupBox);
   this.rightSizer.add(this.statusLabel);
   this.rightSizer.add(this.buttonsSizer);

   // -------------------------------------------------------------------------
   // Main Layout (Preview on Left, Controls on Right)
   // -------------------------------------------------------------------------

   this.sizer = new HorizontalSizer;
   this.sizer.margin = 8;
   this.sizer.spacing = 8;
   this.sizer.add(this.leftSizer);
   this.sizer.add(this.rightSizer);

   // -------------------------------------------------------------------------
   // Methods
   // -------------------------------------------------------------------------

   this.updateControls = function() {
      this.readyToUseRadio.checked = parameters.processingMode === "Ready-to-Use";
      this.scientificRadio.checked = parameters.processingMode === "Scientific";
      this.profileComboBox.currentItem = this.profileComboBox.findItem(parameters.sensorProfile);
      this.targetBgControl.setValue(parameters.targetBg);
      this.adaptiveAnchorCheckBox.checked = parameters.useAdaptiveAnchor;
      this.autoCalcCheckBox.checked = parameters.useAutoD;
      this.logDControl.setValue(parameters.logD);
      this.protectBControl.setValue(parameters.protectB);
      this.convergenceControl.setValue(parameters.convergencePower);
      this.colorGripControl.setValue(parameters.colorGrip);
      this.shadowConvControl.setValue(parameters.shadowConvergence);
      this.colorStrategySlider.value = parameters.colorStrategy;

      this.updateProfileInfo();
      this.updateModeUI();
      this.updateStrategyFeedback();
   };

   // Initialize
   this.updateImageList();
   this.updateControls();
   
   // Load first image if available
   if (this.imageComboBox.numberOfItems > 0 && 
       this.imageComboBox.itemText(0) !== "<No images>") {
      this.loadOriginalImage();
   }
}

VeraLuxPreviewDialog.prototype = new Dialog;

// =============================================================================
//  MAIN ENTRY POINT
// =============================================================================

function main() {
   console.hide();

   var veralux = new AutoIntegrateVeraLuxHMS();

   var dialog = new VeraLuxPreviewDialog(veralux);
   dialog.execute();
}

main();