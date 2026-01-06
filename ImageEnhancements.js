// ****************************************************************************
// ImageEnhancements — Standalone version of AutoIntegrate image enhancements
// ****************************************************************************

#feature-id    AutoIntegrate  > Image Enhancements
#feature-info  Image Enhancements using AutoIntegrate tools.

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

function AutoIntegrateImageEnhancementsDialog() {
    this.__base__ = Dialog;
    this.__base__();

    var self = this;

    var debug = true;

    this.TITLE = "Image Enhancements";
    this.VERSION = "1.00";

    this.windowTitle = this.TITLE + " v" + this.VERSION;
    this.minWidth = 1000;

    var global = new AutoIntegrateGlobal();
    this.global = global;

    var util = new AutoIntegrateUtil(global);
    this.util = util;

    var flowchart = new AutoIntegrateDummyFlowchart();
    var engine = new AutoIntegrateEngine(global, util, flowchart);
    var guitools = new AutoIntegrateGUITools(this, global, util, engine);

    // Read parameter default settings from persistent module settings.
    // These can be saved using the AutoIntegrate script.
    util.initStandalone();

   // -------------------------------------------------------------------------
   // Status
   // -------------------------------------------------------------------------

   this.statusLabel = new Label(this);
   this.statusLabel.text = "";
   this.statusLabel.textAlignment = TextAlign_Center;
   this.statusLabel.styleSheet = "color: #AAAAAA;";

   // -------------------------------------------------------------------------
   // Preview functions
   // -------------------------------------------------------------------------

    function setPreviewIdReset(id, keep_zoom, histogramInfo)
    {
        if (debug) console.writeln("AutoIntegrateImageEnhancementsDialog::updatePreviewIdReset: id = " + id);
        var win = ImageWindow.windowById(id);
        self.previewControl.SetImage(win.mainView.image, win.mainView.id + " [Preview]");
    }

    function updatePreviewIdReset(id, keep_zoom, histogramInfo)
    {
        if (debug) console.writeln("AutoIntegrateImageEnhancementsDialog::updatePreviewIdReset: id = " + id);
        updatePreviewWin(ImageWindow.windowById(id));
    }

    function updatePreviewNoImage()
    {
        if (debug) console.writeln("AutoIntegrateImageEnhancementsDialog::updatePreviewNoImage");
        self.statusLabel.text = "No image available for preview.";
    }

    function updatePreviewTxt(txt)
    {
        if (debug) console.writeln("AutoIntegrateImageEnhancementsDialog::updatePreviewTxt: " + txt);
    }

    function updatePreviewWin(imgWin)
    {
        if (debug) console.writeln("AutoIntegrateImageEnhancementsDialog::updatePreviewWin: imgWin = " + imgWin);
        self.previewControl.SetImage(imgWin.mainView.image, imgWin.mainView.id + " [Preview]");
    }

    function updatePreviewWinTxt(imgWin, txt)
    {
        if (debug) console.writeln("AutoIntegrateImageEnhancementsDialog::updatePreviewWinTxt: imgWin = " + imgWin);
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

   this.previewControl = new AutoIntegratePreviewControl(this, "enhancements_preview", engine, util, global, 600, 400, false);

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
   this.subtitleLabel.text = "Select image and apply enhancements";
   this.subtitleLabel.textAlignment = TextAlign_Center;
   this.subtitleLabel.styleSheet = "font-size: 9pt; color: #888888; font-style: italic;";

   this.enhancements_gui = new AutoIntegrateEnhancementsGUI(this, guitools, util, global, engine, preview_functions);
   this.enhancements_gui.setPreviewControl(this.previewControl);

    this.enhancementsGUIControls = this.enhancements_gui.createEnhancementsGUIControls(this);
    this.enhancementsGUIControls.narrowbandColorizationControl.visible = false;

    this.toolsControl = guitools.createImageToolsControl(this);
    this.toolsControl.visible = false;

    this.GraXpertPathSizer = guitools.createGraXpertPathSizer(this);

    this.GraXpertPathControl = new Control( this );
    this.GraXpertPathControl.sizer = new HorizontalSizer;
    this.GraXpertPathControl.sizer.margin = 6;
    this.GraXpertPathControl.sizer.spacing = 4;
    this.GraXpertPathControl.sizer.add( this.GraXpertPathSizer );
    this.GraXpertPathControl.sizer.addStretch();
    this.GraXpertPathControl.visible = false;

   // -------------------------------------------------------------------------
   // Load and save JSON controls
   // -------------------------------------------------------------------------

   var obj = guitools.newJsonSizerObj(this, null, "ImageEnhancementsSettings.json");
   this.loadSaveSizer = obj.sizer;

   // -------------------------------------------------------------------------
   // Enhancements Group Box
   // -------------------------------------------------------------------------

    if (global.debug) console.writeln("AutoIntegrateImageEnhancementsDialog:: creating enhancementsGroupBox");

    this.enhancementsGroupBox = guitools.newGroupBoxSizer(this);
    guitools.newSectionBarAdd(this, this.enhancementsGroupBox, this.enhancementsGUIControls.targetImageControl, "Target image for enhancements", "EnhancementsTarget");
    guitools.newSectionBarAdd(this, this.enhancementsGroupBox, this.enhancementsGUIControls.optionsControl, "Misc options", "EnhancementsOptions");
    guitools.newSectionBarAdd(this, this.enhancementsGroupBox, this.enhancementsGUIControls.narrowbandControl, "Narrowband enhancements", "Enhancements2");
    guitools.newSectionBarAdd(this, this.enhancementsGroupBox, this.enhancementsGUIControls.genericControl, "Generic enhancements", "Enhancements1");
    guitools.newSectionBarAdd(this, this.enhancementsGroupBox, this.toolsControl, "Tools", "EnhancementsTools");
    guitools.newSectionBarAdd(this, this.enhancementsGroupBox, this.GraXpertPathControl, "GraXpert Path", "GraXpertPath");
    this.enhancementsGroupBox.sizer.addStretch();

   // -------------------------------------------------------------------------
   // Buttons
   // -------------------------------------------------------------------------

    this.resetButton = new PushButton(this);
    this.resetButton.text = "Reset";
    this.resetButton.toolTip = "Reset all parameters to defaults.";
    this.resetButton.onClick = function() {
            util.setParameterDefaults();
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
   this.rightSizer.add(this.enhancementsGroupBox);
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

AutoIntegrateImageEnhancementsDialog.prototype = new Dialog;

// =============================================================================
//  MAIN ENTRY POINT
// =============================================================================

#ifndef AUTOINTEGRATE_NO_MAIN

function main() {
   console.show();

   var dialog = new AutoIntegrateImageEnhancementsDialog();
   dialog.execute();
}

main();

#endif  // AUTOINTEGRATE_NO_MAIN
