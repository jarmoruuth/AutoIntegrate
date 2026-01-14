// ****************************************************************************
// GradientCorrection — Standalone version of AutoIntegrate gradient correction
// ****************************************************************************

#feature-id    AutoIntegrate  > Gradient Correction
#feature-info  Gradient Correction using AutoIntegrate tools.

#include <pjsr/NumericControl.jsh>
#include <pjsr/Sizer.jsh>
#include <pjsr/FrameStyle.jsh>
#include <pjsr/TextAlign.jsh>
#include <pjsr/StdButton.jsh>
#include <pjsr/StdIcon.jsh>
#include <pjsr/UndoFlag.jsh>
#include <pjsr/SampleType.jsh>
#include <pjsr/ColorSpace.jsh>
#include <pjsr/SectionBar.jsh>
#include <pjsr/StdCursor.jsh>

#ifndef NO_SOLVER_LIBRARY
#define NO_SOLVER_LIBRARY
#endif
#ifndef AUTOINTEGRATE_STANDALONE
#define AUTOINTEGRATE_STANDALONE
#endif

#include "AutoIntegrateGlobal.js"
#include "AutoIntegrateUtil.js"
#include "AutoIntegrateGUITools.js"
#include "AutoIntegrateEnhancementsGUI.js"
#include "AutoIntegrateEngine.js"
#include "AutoIntegratePreview.js"

// =============================================================================
//  Dummy flowchart routines
// =============================================================================

#ifndef AUTOINTEGRATEDUMMYFLOWCHART
#define AUTOINTEGRATEDUMMYFLOWCHART

function AutoIntegrateDummyFlowchart()
{
    this.__base__ = Object;
    this.__base__();
 
    this.flowchartOperation = function () {};
    this.flowchartOperationEnd = function () {};
    this.flowchartParentBegin = function () {};
    this.flowchartParentEnd = function () {};
    this.flowchartChildBegin = function () {};
    this.flowchartChildEnd = function () {};
    this.flowchartMaskBegin = function () {};
    this.flowchartMaskEnd = function () {};
    this.flowchartInit = function () {};
    this.flowchartDone = function () {};
    this.flowchartReset = function () {};
    this.flowchartPrint = function () {};
}

AutoIntegrateDummyFlowchart.prototype = new Object;

#endif /* AUTOINTEGRATEDUMMYFLOWCHART */

// =============================================================================
//  DIALOG WITH PREVIEW
// =============================================================================

function AutoIntegrateGradientCorrectionDialog() {
    this.__base__ = Dialog;
    this.__base__();

    var self = this;

    var debug = false;

    this.TITLE = "Gradient Correction";
    this.VERSION = "1.00";

    this.windowTitle = this.TITLE + " v" + this.VERSION;
    this.minWidth = 1000;

    this.global = new AutoIntegrateGlobal();

    this.global.debug = debug;
    for (let i = 0; i < jsArguments.length; i++) {
        if (jsArguments[i] == "do_not_read_settings") {
            console.writeln("do_not_read_settings");
            this.global.do_not_read_settings = true;
        }
    }

    this.util = new AutoIntegrateUtil(this.global);
    this.flowchart = new AutoIntegrateDummyFlowchart();
    this.engine = new AutoIntegrateEngine(this.global, this.util, this.flowchart);
    this.guitools = new AutoIntegrateGUITools(this, this.global, this.util, this.engine);

    // Read parameter default settings from persistent module settings.
    // These can be saved using the AutoIntegrate script.
    this.util.initStandalone();

    // We do gradient correction here so we set the value to true
    this.global.par.enhancements_GC.val = true;

    // Store original image for reset functionality
    this.previewImage = null;
    this.autoSTFPreviewImage = null;
    this.autoSTF = true;
    this.previewTxt = "[Preview Image]";

   // -------------------------------------------------------------------------
   // Preview functions
   // -------------------------------------------------------------------------

    function setPreviewImage()
    {
        if (debug) console.writeln("AutoIntegrateGradientCorrectionDialog::setPreviewImage");
        if (self.autoSTF) {
            self.previewControl.SetImage(self.autoSTFPreviewImage, self.previewTxt);
        } else {
            self.previewControl.SetImage(self.previewImage, self.previewTxt);
        }
    }

    function updatePreviewImage()
    {
        if (debug) console.writeln("AutoIntegrateGradientCorrectionDialog::updatePreviewImage");
        if (self.autoSTF) {
            self.previewControl.UpdateImage(self.autoSTFPreviewImage);
        } else {
            self.previewControl.UpdateImage(self.previewImage);
        }
    }

    function newPreviewImage(imgWin, txt = null)
    {
        if (txt == null) {
            txt = imgWin.mainView.id + " [Preview]";
        }
        self.previewTxt = txt;
        self.previewImage = imgWin.mainView.image;
        // make a stretched copy of the image for AutoSTF preview
        var tempWindow = self.util.copyWindowEx(imgWin, "tmp_preview_window", true);
        self.engine.autoStretch(tempWindow);
        self.autoSTFPreviewImage = new Image(tempWindow.mainView.image);
        tempWindow.forceClose();
    }

    function setPreviewIdReset(id, keep_zoom, histogramInfo)
    {
        if (debug) console.writeln("AutoIntegrateGradientCorrectionDialog::setPreviewIdReset: id = " + id);
        var win = ImageWindow.windowById(id);
        newPreviewImage(win, win.mainView.id + " [Preview]");
        setPreviewImage();
    }

    function updatePreviewIdReset(id, keep_zoom, histogramInfo)
    {
        if (debug) console.writeln("AutoIntegrateGradientCorrectionDialog::updatePreviewIdReset: id = " + id);
        updatePreviewWinTxt(ImageWindow.windowById(id));
    }

    function updatePreviewNoImage()
    {
        if (debug) console.writeln("AutoIntegrateGradientCorrectionDialog::updatePreviewNoImage");
        self.statusLabel.text = "No image available for preview.";
    }

    function updatePreviewTxt(txt)
    {
        if (debug) console.writeln("AutoIntegrateGradientCorrectionDialog::updatePreviewTxt: " + txt);
    }

    function updatePreviewWin(imgWin)
    {
        if (debug) console.writeln("AutoIntegrateGradientCorrectionDialog::updatePreviewWin: imgWin = " + imgWin);
        updatePreviewWinTxt(imgWin);
    }

    function updatePreviewWinTxt(imgWin, txt = null)
    {
        if (debug) console.writeln("AutoIntegrateGradientCorrectionDialog::updatePreviewWinTxt: imgWin = " + imgWin);
        newPreviewImage(imgWin, txt);
        updatePreviewImage();
    }

    var preview_functions = {
        setPreviewIdReset: setPreviewIdReset,
        updatePreviewIdReset: updatePreviewIdReset,
        updatePreviewTxt: updatePreviewTxt,
        updatePreviewNoImage: updatePreviewNoImage,
        createCombinedMosaicPreviewWin: null,
        updatePreviewWin: updatePreviewWin,
        updatePreviewWinTxt: updatePreviewWinTxt,
   };

   // -------------------------------------------------------------------------
   // Left Side: Preview Control
   // -------------------------------------------------------------------------

    this.autoSTFCheckBox = new CheckBox(this);
    this.autoSTFCheckBox.text = "AutoSTF";
    this.autoSTFCheckBox.toolTip = "Automatically apply Screen Transfer Function (STF) to preview image.";
    this.autoSTFCheckBox.checked = true;
    this.autoSTFCheckBox.onCheck = function(checked) {
        self.autoSTF = checked;
        // Update preview
        setPreviewImage();
    };

    this.previewButtonsSizer = new HorizontalSizer;
    this.previewButtonsSizer.spacing = 4;
    this.previewButtonsSizer.addStretch();
    this.previewButtonsSizer.add(this.autoSTFCheckBox);

   this.previewControl = new AutoIntegratePreviewControl(this, "gradient_correction_preview", self.engine, self.util, self.global, 600, 400, false);

   this.leftSizer = new VerticalSizer;
   this.leftSizer.spacing = 4;
   this.leftSizer.add(this.previewControl, 400);
   this.leftSizer.add(this.previewButtonsSizer, 400);

   // -------------------------------------------------------------------------
   // Status
   // -------------------------------------------------------------------------

   this.statusLabel = new Label(this);
   this.statusLabel.text = "";
   this.statusLabel.textAlignment = TextAlign_Center;
   this.statusLabel.styleSheet = "color: #AAAAAA;";

   // -------------------------------------------------------------------------
   // Right Side: Title and Controls
   // -------------------------------------------------------------------------

   this.titleLabel = new Label(this);
   this.titleLabel.text = this.TITLE + " v" + this.VERSION;
   this.titleLabel.textAlignment = TextAlign_Center;
   this.titleLabel.styleSheet = "font-size: 14pt; font-weight: bold; color: #4488FF;";

   this.subtitleLabel = new Label(this);
   this.subtitleLabel.text = "Select image and apply gradient correction";
   this.subtitleLabel.textAlignment = TextAlign_Center;
   this.subtitleLabel.styleSheet = "font-size: 9pt; color: #888888; font-style: italic;";

    this.enhancements_gui = new AutoIntegrateEnhancementsGUI(this, self.guitools, self.util, self.global, self.engine, preview_functions);

   // -------------------------------------------------------------------------
   // Gradient correction method
   // -------------------------------------------------------------------------

    this.gradientCorrectionChoiceSizer = self.guitools.createGradientCorrectionChoiceSizer(this, "Gradient correction method:");
    this.gradientCorrectionChoiceGroupBox = new GroupBox(this);
    this.gradientCorrectionChoiceGroupBox.title = "Gradient correction method";
    this.gradientCorrectionChoiceGroupBox.sizer = this.gradientCorrectionChoiceSizer;

   // -------------------------------------------------------------------------
   // Target image
   // -------------------------------------------------------------------------

    this.enhancements_gui.target_image_selected_callback = function(target_image_id) {
        if (debug) console.writeln("AutoIntegrateGradientCorrectionDialog:: target_image_selected_callback: target_image_id = " + target_image_id);
        self.guitools.exclusionAreasTargetImageName = target_image_id;
    }
    this.targetImageSizer = this.enhancements_gui.createTargetImageSizer(this);
    this.enhancements_gui.apply_completed_callback = function(apply_ok) {
        // We do gradient correction here so we set the value to true
        // With reset option it may have been reset to false (default)
        self.global.par.enhancements_GC.val = true;
    };
    this.targetImageGroupBox = new GroupBox(this);
    this.targetImageGroupBox.title = "Target image";
    this.targetImageGroupBox.sizer = this.targetImageSizer;

   // -------------------------------------------------------------------------
   // Gradient correction Settings
   // -------------------------------------------------------------------------

    this.createGradientCorrectionSizer = self.guitools.createGradientCorrectionSizer(this);
    this.createGraXpertGradientCorrectionSection = self.guitools.createGraXpertGradientCorrectionSizer(this);

    this.gradientCorrectionSettingsControl = new Control( this );
    this.gradientCorrectionSettingsControl.sizer = new VerticalSizer;
    this.gradientCorrectionSettingsControl.sizer.margin = 6;
    this.gradientCorrectionSettingsControl.sizer.spacing = 4;
    this.gradientCorrectionSettingsControl.sizer.add( this.createGradientCorrectionSizer );
    this.gradientCorrectionSettingsControl.sizer.add( this.createGraXpertGradientCorrectionSection.section );
    this.gradientCorrectionSettingsControl.sizer.add( this.createGraXpertGradientCorrectionSection.control );
    this.gradientCorrectionSettingsControl.sizer.addStretch();  
    this.gradientCorrectionSettingsControl.visible = true;

   // -------------------------------------------------------------------------
   // Load and save JSON controls
   // -------------------------------------------------------------------------

   var obj = self.guitools.newJsonSizerObj(this, null, "GradientCorrectionSettings.json");
   this.loadSaveSizer = obj.sizer;

   // -------------------------------------------------------------------------
   // Stretching Group Box
   // -------------------------------------------------------------------------

    if (self.global.debug) console.writeln("AutoIntegrateGradientCorrectionDialog:: creating gradientCorrectionGroupBox");

    this.gradientCorrectionGroupBox = self.guitools.newGroupBoxSizer(this);
    this.gradientCorrectionGroupBox.title = "Settings";
    this.gradientCorrectionGroupBox.sizer.add(this.gradientCorrectionSettingsControl);
    this.gradientCorrectionGroupBox.sizer.addStretch();

   // -------------------------------------------------------------------------
   // Buttons
   // -------------------------------------------------------------------------

   this.resetButton = new PushButton(this);
   this.resetButton.text = "Reset";
   this.resetButton.toolTip = "Reset all parameters to defaults.";
   this.resetButton.onClick = function() {
        self.util.setParameterDefaults();
   };

   this.closeButton = new PushButton(this);
    this.closeButton.text = "Close";
    this.closeButton.icon = this.scaledResource(":/icons/close.png");
    this.closeButton.onClick = function() {
        self.ok();
    };

    this.buttonsSizer = new HorizontalSizer;
    this.buttonsSizer.spacing = 6;
    this.buttonsSizer.add(this.resetButton);
    this.buttonsSizer.addStretch();
    this.buttonsSizer.add(this.closeButton);

   // -------------------------------------------------------------------------
   // Right Side Layout
   // -------------------------------------------------------------------------

   this.rightSizer = new VerticalSizer;
   this.rightSizer.spacing = 8;
   this.rightSizer.add(this.titleLabel);
   this.rightSizer.add(this.subtitleLabel);
   this.rightSizer.add(this.statusLabel);
   this.rightSizer.add(this.loadSaveSizer);
   this.rightSizer.add(this.targetImageGroupBox);
   this.rightSizer.add(this.gradientCorrectionChoiceGroupBox);
   this.rightSizer.add(this.gradientCorrectionGroupBox);
   this.rightSizer.add(this.buttonsSizer);

   // -------------------------------------------------------------------------
   // Main Layout (Preview on Left, Controls on Right)
   // -------------------------------------------------------------------------

   this.sizer = new HorizontalSizer;
   this.sizer.margin = 8;
   this.sizer.spacing = 8;
   this.sizer.add(this.leftSizer);
   this.sizer.add(this.rightSizer);
}

AutoIntegrateGradientCorrectionDialog.prototype = new Dialog;

// =============================================================================
//  MAIN ENTRY POINT
// =============================================================================

#ifndef AUTOINTEGRATE_NO_MAIN

function main() {
   console.show();

   var dialog = new AutoIntegrateGradientCorrectionDialog();
   dialog.execute();
}

main();

#endif /* AUTOINTEGRATE_NO_MAIN */
