// ****************************************************************************
// ImageStretching — Standalone version of AutoIntegrate image stretching
// ****************************************************************************

#feature-id    AutoIntegrate  > Stretching
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

#define NO_SOLVER_LIBRARY
#define AUTOINTEGRATE_STANDALONE

#include "AutoIntegrateGlobal.js"
#include "AutoIntegrateUtil.js"
#include "AutoIntegrateGUITools.js"
#include "AutoIntegrateEnhancementsGUI.js"
#include "AutoIntegrateEngine.js"
#include "AutoIntegratePreview.js"

// =============================================================================
//  Dummy flowchart routines
// =============================================================================

function AutoIntegrateDummyFlowchart()
{
    this.__base__ = Object;
    this.__base__();
 
    this.flowchartOperation = function () {};
    this.flowchartOperationEnd = function () {};;
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

// =============================================================================
//  DIALOG WITH PREVIEW
// =============================================================================

function ImageStretchingDialog() {
    this.__base__ = Dialog;
    this.__base__();

    var self = this;

    var debug = true;

    this.TITLE = "Image Stretching";
    this.VERSION = "1.00";

    this.windowTitle = this.TITLE + " v" + this.VERSION;
    this.minWidth = 1000;

    this.rootingArr = [];

    var global = new AutoIntegrateGlobal();
    var util = new AutoIntegrateUtil(global);
    var flowchart = new AutoIntegrateDummyFlowchart();
    var engine = new AutoIntegrateEngine(global, util, flowchart);
    var guitools = new AutoIntegrateGUITools(this, global, util);

    // Read parameter default settings from persistent module settings.
    // These can be saved using the AutoIntegrate script.
    util.readParametersFromPersistentModuleSettings();

    // We do stretching here so we set the value to true
    global.par.enhancements_stretch.val = true;

    // Store original image for reset functionality
    this.originalImage = null;
    this.previewImage = null;
    this.selectedWindow = null;

   // -------------------------------------------------------------------------
   // Preview functions
   // -------------------------------------------------------------------------

    function setPreviewIdReset(id, keep_zoom, histogramInfo)
    {
        if (debug) console.writeln("ImageStretchingDialog::updatePreviewIdReset: id = " + id);
        var win = ImageWindow.windowById(id);
        self.previewControl.SetImage(win.mainView.image, win.mainView.id + " [Preview]");
    }

    function updatePreviewIdReset(id, keep_zoom, histogramInfo)
    {
        if (debug) console.writeln("ImageStretchingDialog::updatePreviewIdReset: id = " + id);
        updatePreviewWin(ImageWindow.windowById(id));
    }

    function updatePreviewNoImage()
    {
        if (debug) console.writeln("ImageStretchingDialog::updatePreviewNoImage");
        this.statusLabel.text = "No image available for preview.";
    }

    function updatePreviewTxt(txt)
    {
        if (debug) console.writeln("ImageStretchingDialog::updatePreviewTxt: " + txt);
    }

    function updatePreviewWin(imgWin)
    {
        if (debug) console.writeln("ImageStretchingDialog::updatePreviewWin: imgWin = " + imgWin);
        self.previewControl.UpdateImage(imgWin.mainView.image, imgWin.mainView.id + " [Preview]");
    }

    var preview_functions = {
        setPreviewIdReset: setPreviewIdReset,
        updatePreviewIdReset: updatePreviewIdReset,
        updatePreviewTxt: updatePreviewTxt,
        updatePreviewNoImage: updatePreviewNoImage,
        createCombinedMosaicPreviewWin: null,
        updatePreviewWin: updatePreviewWin

   };

   // -------------------------------------------------------------------------
   // Left Side: Preview Control
   // -------------------------------------------------------------------------

   this.previewControl = new AutoIntegratePreviewControl(this, "stretch_preview", engine, util, global, 600, 400, false);

   this.leftSizer = new VerticalSizer;
   this.leftSizer.spacing = 4;
   this.leftSizer.add(this.previewControl, 400);

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

    this.enhancements_gui = new AutoIntegrateEnhancementsGUI(this, guitools, util, global, engine, preview_functions);

    this.stretchingChoiceSizer = this.enhancements_gui.createStrechingChoiceSizer(this, null);
    this.stretchingChoiceGroupBox = new GroupBox(this);
    this.stretchingChoiceGroupBox.title = "Stretching type";
    this.stretchingChoiceGroupBox.sizer = this.stretchingChoiceSizer;

    this.targetImageSizer = this.enhancements_gui.createTargetImageSizer(this);
    this.enhancements_gui.apply_completed_callback = function(apply_ok) {
        // We do stretching here so we set the value to true
        // With reset option it may have been reset to false (default)
        global.par.enhancements_stretch.val = true;
    };
    this.targetImageGroupBox = new GroupBox(this);
    this.targetImageGroupBox.title = "Target image";
    this.targetImageGroupBox.sizer = this.targetImageSizer;

    this.stretchingSettingsSizer = guitools.createStretchingSettingsSizer(this, engine);

    this.stretchingSettingsControl = new Control( this );
    this.stretchingSettingsControl.sizer = new HorizontalSizer;
    this.stretchingSettingsControl.sizer.margin = 6;
    this.stretchingSettingsControl.sizer.spacing = 4;
    this.stretchingSettingsControl.sizer.add( this.stretchingSettingsSizer );
    this.stretchingSettingsControl.sizer.addStretch();  
    this.stretchingSettingsControl.visible = true;

   // -------------------------------------------------------------------------
   // Stretching Group Box
   // -------------------------------------------------------------------------

    if (global.debug) console.writeln("ImageStretchingDialog:: creating stretchingGroupBox");

    this.stretchingGroupBox = guitools.newGroupBoxSizer(this);
    guitools.newSectionBarAdd(this, this.stretchingGroupBox, this.stretchingSettingsControl, "Settings", "StretchingSettings");
    this.stretchingGroupBox.sizer.addStretch();

   // -------------------------------------------------------------------------
   // Status
   // -------------------------------------------------------------------------

   this.statusLabel = new Label(this);
   this.statusLabel.text = "";
   this.statusLabel.textAlignment = TextAlign_Center;
   this.statusLabel.styleSheet = "color: #AAAAAA;";

   // -------------------------------------------------------------------------
   // Buttons
   // -------------------------------------------------------------------------

    this.closeButton = new PushButton(this);
    this.closeButton.text = "Close";
    this.closeButton.icon = this.scaledResource(":/icons/close.png");
    this.closeButton.onClick = function() {
        self.ok();
    };

    this.buttonsSizer = new HorizontalSizer;
    this.buttonsSizer.spacing = 6;
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

ImageStretchingDialog.prototype = new Dialog;

// =============================================================================
//  MAIN ENTRY POINT
// =============================================================================

function main() {
   console.show();

   var dialog = new ImageStretchingDialog();
   dialog.execute();
}

main();
