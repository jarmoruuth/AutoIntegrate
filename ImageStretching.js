// ****************************************************************************
// ImageStretching — Standalone version of AutoIntegrate image stretching
// ****************************************************************************

#feature-id    AutoIntegrate  > Image Stretching
#feature-info  Image Stretching using AutoIntegrate tools.

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
//  Dummy self.flowchart routines
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

function AutoIntegrateImageStretchingDialog() {
    this.__base__ = Dialog;
    this.__base__();

    var self = this;

    var debug = true;

    this.TITLE = "Image Stretching";
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

    // We do stretching here so we set the value to true
    this.global.par.enhancements_stretch.val = true;

   // -------------------------------------------------------------------------
   // Preview functions
   // -------------------------------------------------------------------------

    function setPreviewIdReset(id, keep_zoom, histogramInfo)
    {
        if (debug) console.writeln("AutoIntegrateImageStretchingDialog::updatePreviewIdReset: id = " + id);
        var win = ImageWindow.windowById(id);
        self.previewControl.SetImage(win.mainView.image, win.mainView.id + " [Preview]");
    }

    function updatePreviewIdReset(id, keep_zoom, histogramInfo)
    {
        if (debug) console.writeln("AutoIntegrateImageStretchingDialog::updatePreviewIdReset: id = " + id);
        updatePreviewWin(ImageWindow.windowById(id));
    }

    function updatePreviewNoImage()
    {
        if (debug) console.writeln("AutoIntegrateImageStretchingDialog::updatePreviewNoImage");
        self.statusLabel.text = "No image available for preview.";
    }

    function updatePreviewTxt(txt)
    {
        if (debug) console.writeln("AutoIntegrateImageStretchingDialog::updatePreviewTxt: " + txt);
    }

    function updatePreviewWin(imgWin)
    {
        if (debug) console.writeln("AutoIntegrateImageStretchingDialog::updatePreviewWin: imgWin = " + imgWin);
        self.previewControl.UpdateImage(imgWin.mainView.image);
    }

    function updatePreviewWinTxt(imgWin, txt)
    {
        if (debug) console.writeln("AutoIntegrateImageStretchingDialog::updatePreviewWinTxt: imgWin = " + imgWin);
        updatePreviewWin(imgWin);
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

   this.previewControl = new AutoIntegratePreviewControl(this, "stretch_preview", self.engine, self.util, self.global, 600, 400, false);

   this.leftSizer = new VerticalSizer;
   this.leftSizer.spacing = 4;
   this.leftSizer.add(this.previewControl, 400);
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
   this.subtitleLabel.text = "Select image and apply stretching";
   this.subtitleLabel.textAlignment = TextAlign_Center;
   this.subtitleLabel.styleSheet = "font-size: 9pt; color: #888888; font-style: italic;";

    this.enhancements_gui = new AutoIntegrateEnhancementsGUI(this, self.guitools, self.util, self.global, self.engine, preview_functions);

    this.stretchingChoiceSizer = self.guitools.createStrechingChoiceSizer(this, null);
    this.stretchingChoiceGroupBox = new GroupBox(this);
    this.stretchingChoiceGroupBox.title = "Stretching type";
    this.stretchingChoiceGroupBox.sizer = this.stretchingChoiceSizer;

    this.targetImageSizer = this.enhancements_gui.createTargetImageSizer(this);
    this.enhancements_gui.apply_completed_callback = function(apply_ok) {
        // We do stretching here so we set the value to true
        // With reset option it may have been reset to false (default)
        self.global.par.enhancements_stretch.val = true;
    };
    this.targetImageGroupBox = new GroupBox(this);
    this.targetImageGroupBox.title = "Target image";
    this.targetImageGroupBox.sizer = this.targetImageSizer;

    this.stretchingSettingsSizer = self.guitools.createStretchingSettingsSizer(this, self.engine, 1, this.previewControl);

    this.stretchingSettingsControl = new Control( this );
    this.stretchingSettingsControl.sizer = new HorizontalSizer;
    this.stretchingSettingsControl.sizer.margin = 6;
    this.stretchingSettingsControl.sizer.spacing = 4;
    this.stretchingSettingsControl.sizer.add( this.stretchingSettingsSizer );
    this.stretchingSettingsControl.sizer.addStretch();  
    this.stretchingSettingsControl.visible = true;

   // -------------------------------------------------------------------------
   // Load and save JSON controls
   // -------------------------------------------------------------------------

   var obj = self.guitools.newJsonSizerObj(this, null, "ImageStretchingSettings.json");
   this.loadSaveSizer = obj.sizer;

   // -------------------------------------------------------------------------
   // Stretching Group Box
   // -------------------------------------------------------------------------

    if (self.global.debug) console.writeln("AutoIntegrateImageStretchingDialog:: creating stretchingGroupBox");

    this.stretchingGroupBox = self.guitools.newGroupBoxSizer(this);
    this.stretchingGroupBox.title = "Settings";
    this.stretchingGroupBox.sizer.add(this.stretchingSettingsControl);
    this.stretchingGroupBox.sizer.addStretch();

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
   this.rightSizer.add(this.stretchingChoiceGroupBox);
   this.rightSizer.add(this.stretchingGroupBox);
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

AutoIntegrateImageStretchingDialog.prototype = new Dialog;

// =============================================================================
//  MAIN ENTRY POINT
// =============================================================================

#ifndef AUTOINTEGRATE_NO_MAIN

function main() {
   console.show();

   var dialog = new AutoIntegrateImageStretchingDialog();
   dialog.execute();
}

main();

#endif /* AUTOINTEGRATE_NO_MAIN */
