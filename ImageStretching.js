// ****************************************************************************
// ImageStretching — Standalone version of AutoIntegrate image stretching
// ****************************************************************************

#engine v8
#feature-id    AutoIntegrate  > Image Stretching
#feature-info  Image Stretching using AutoIntegrate tools.

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
//  Dummy this.flowchart routines
// =============================================================================

#ifndef AUTOINTEGRATEDUMMYFLOWCHART
#define AUTOINTEGRATEDUMMYFLOWCHART

class AutoIntegrateDummyFlowchart extends Object
{
    constructor() {
        super();
    }

    flowchartOperation() {};
    flowchartOperationEnd() {};
    flowchartParentBegin() {};
    flowchartParentEnd() {};
    flowchartChildBegin() {};
    flowchartChildEnd() {};
    flowchartMaskBegin() {};
    flowchartMaskEnd() {};
    flowchartInit() {};
    flowchartDone() {};
    flowchartReset() {};
    flowchartPrint() {};
}

#endif /* AUTOINTEGRATEDUMMYFLOWCHART */

// =============================================================================
//  DIALOG WITH PREVIEW
// =============================================================================

class AutoIntegrateImageStretchingDialog extends Dialog {
    TITLE = "Image Stretching";
    VERSION = "1.01";

    constructor() {
        super();

        this.windowTitle = this.TITLE + " v" + this.VERSION;
        // this.minWidth = 1000;

        this.global = new AutoIntegrateGlobal();
        for (let i = 0; i < Runtime.jsArguments.length; i++) {
            if (Runtime.jsArguments[i] == "do_not_read_settings") {
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

        this.initGUI();
    }

   // -------------------------------------------------------------------------
   // Preview functions
   // -------------------------------------------------------------------------

    setPreviewIdReset(id, keep_zoom, histogramInfo)
    {
        if (this.global.debug) console.writeln("AutoIntegrateImageStretchingDialog::updatePreviewIdReset: id = " + id);
        var win = ImageWindow.windowById(id);
        this.previewControl.SetImage(win.mainView.image, win.mainView.id + " [Preview]");
    }

    updatePreviewIdReset(id, keep_zoom, histogramInfo)
    {
        if (this.global.debug) console.writeln("AutoIntegrateImageStretchingDialog::updatePreviewIdReset: id = " + id);
        this.updatePreviewWin(ImageWindow.windowById(id));
    }

    updatePreviewNoImage()
    {
        if (this.global.debug) console.writeln("AutoIntegrateImageStretchingDialog::updatePreviewNoImage");
        this.statusLabel.text = "No image available for preview.";
    }

    updatePreviewTxt(txt)
    {
        if (this.global.debug) console.writeln("AutoIntegrateImageStretchingDialog::updatePreviewTxt: " + txt);
    }

    updatePreviewWin(imgWin)
    {
        if (this.global.debug) console.writeln("AutoIntegrateImageStretchingDialog::updatePreviewWin: imgWin = " + imgWin);
        this.previewControl.UpdateImage(imgWin.mainView.image);
    }

    updatePreviewWinTxt(imgWin, txt)
    {
        if (this.global.debug) console.writeln("AutoIntegrateImageStretchingDialog::updatePreviewWinTxt: imgWin = " + imgWin);
        this.updatePreviewWin(imgWin);
    }

    initGUI() {

    var preview_functions = {
        setPreviewIdReset: (id, keep_zoom, histogramInfo) => this.setPreviewIdReset(id, keep_zoom, histogramInfo),
        updatePreviewIdReset: (id, keep_zoom, histogramInfo) => this.updatePreviewIdReset(id, keep_zoom, histogramInfo),
        updatePreviewTxt: (txt) => this.updatePreviewTxt(txt),
        updatePreviewNoImage: () => this.updatePreviewNoImage(),
        createCombinedMosaicPreviewWin: null,
        updatePreviewWin: (imgWin) => this.updatePreviewWin(imgWin),
        updatePreviewWinTxt: (imgWin, txt) => this.updatePreviewWinTxt(imgWin, txt),
   };

   // -------------------------------------------------------------------------
   // Left Side: Preview Control
   // -------------------------------------------------------------------------

   this.previewControl = new AutoIntegratePreviewControl(this, "stretch_preview", this.engine, this.util, this.global, 600, 600, false);

   this.leftSizer = new VerticalSizer;
   this.leftSizer.spacing = 4;
   this.leftSizer.add(this.previewControl, 600);
   // -------------------------------------------------------------------------
   // Status
   // -------------------------------------------------------------------------

   this.statusLabel = new Label(this);
   this.statusLabel.text = "";
   this.statusLabel.textAlignment = TextAlignment.Center;
   this.statusLabel.styleSheet = "color: #AAAAAA;";

   // -------------------------------------------------------------------------
   // Right Side: Title and Controls
   // -------------------------------------------------------------------------

   this.titleLabel = new Label(this);
   this.titleLabel.text = this.TITLE + " v" + this.VERSION;
   this.titleLabel.textAlignment = TextAlignment.Center;
   this.titleLabel.styleSheet = "font-size: 14pt; font-weight: bold; color: #4488FF;";

   this.subtitleLabel = new Label(this);
   this.subtitleLabel.text = "Select image and apply stretching";
   this.subtitleLabel.textAlignment = TextAlignment.Center;
   this.subtitleLabel.styleSheet = "font-size: 9pt; color: #888888; font-style: italic;";

    this.enhancements_gui = new AutoIntegrateEnhancementsGUI(this, this.guitools, this.util, this.global, this.engine, preview_functions);

    this.stretchingChoiceSizer = this.guitools.createStrechingChoiceSizer(this, null);
    this.stretchingChoiceGroupBox = new GroupBox(this);
    this.stretchingChoiceGroupBox.title = "Stretching type";
    this.stretchingChoiceGroupBox.sizer = this.stretchingChoiceSizer;

    this.targetImageSizer = this.enhancements_gui.createTargetImageSizer(this);
    this.enhancements_gui.apply_completed_callback = function(apply_ok) {
        // We do stretching here so we set the value to true
        // With reset option it may have been reset to false (default)
        this.global.par.enhancements_stretch.val = true;
    };
    this.targetImageGroupBox = new GroupBox(this);
    this.targetImageGroupBox.title = "Target image";
    this.targetImageGroupBox.sizer = this.targetImageSizer;

    this.stretchingSettingsSizer = this.guitools.createStretchingSettingsSizer(this, this.engine, 1, this.previewControl);

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

   var obj = this.guitools.newJsonSizerObj(this, null, "ImageStretchingSettings.json");
   this.loadSaveSizer = obj.sizer;

   // -------------------------------------------------------------------------
   // Stretching Group Box
   // -------------------------------------------------------------------------

    if (this.global.debug) console.writeln("AutoIntegrateImageStretchingDialog:: creating stretchingGroupBox");

    this.stretchingGroupBox = this.guitools.newGroupBoxSizer(this);
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
        this.util.setParameterDefaults();
   };

   this.closeButton = new PushButton(this);
    this.closeButton.text = "Close";
    this.closeButton.icon = this.scaledResource(":/icons/close.png");
    this.closeButton.onClick = function() {
        console.writeln("Closing dialog");
        this.dialog.ok();
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
}

// =============================================================================
//  MAIN ENTRY POINT
// =============================================================================

#ifndef AUTOINTEGRATE_NO_MAIN

function  main() {
   console.show();

   CoreApplication.ensureMinimumVersion( 1, 9, 4 );

   var dialog = new AutoIntegrateImageStretchingDialog();
   dialog.execute();
}

main();

#endif /* AUTOINTEGRATE_NO_MAIN */
