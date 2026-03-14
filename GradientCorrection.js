// ****************************************************************************
// GradientCorrection — Standalone version of AutoIntegrate gradient correction
// ****************************************************************************

#engine v8
#feature-id    AutoIntegrate  > Gradient Correction
#feature-info  Gradient Correction using AutoIntegrate tools.

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

class AutoIntegrateGradientCorrectionDialog extends Dialog {
    constructor() {
        super();

    this.TITLE = "Gradient Correction";
    this.VERSION = "1.00";

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

    // We do gradient correction here so we set the value to true
    this.global.par.enhancements_GC.val = true;

    // Store original image for reset functionality
    this.previewImage = null;
    this.autoSTFPreviewImage = null;
    this.autoSTF = true;
    this.previewTxt = "[Preview Image]";

    this.initGUI();

} // End of constructor

   // -------------------------------------------------------------------------
   // Preview functions
   // -------------------------------------------------------------------------

    setPreviewImage()
    {
        if (this.global.debug) console.writeln("AutoIntegrateGradientCorrectionDialog::setPreviewImage");
        if (this.autoSTF) {
            this.previewControl.SetImage(this.autoSTFPreviewImage, this.previewTxt);
        } else {
            this.previewControl.SetImage(this.previewImage, this.previewTxt);
        }
    }

    updatePreviewImage()
    {
        if (this.global.debug) console.writeln("AutoIntegrateGradientCorrectionDialog::updatePreviewImage");
        if (this.autoSTF) {
            this.previewControl.UpdateImage(this.autoSTFPreviewImage);
        } else {
            this.previewControl.UpdateImage(this.previewImage);
        }
    }

    newPreviewImage(imgWin, txt = null)
    {
        if (txt == null) {
            txt = imgWin.mainView.id + " [Preview]";
        }
        this.previewTxt = txt;
        this.previewImage = imgWin.mainView.image;
        // make a stretched copy of the image for AutoSTF preview
        var tempWindow = this.util.copyWindowEx(imgWin, "tmp_preview_window", true);
        this.engine.autoStretch(tempWindow);
        this.autoSTFPreviewImage = new Image(tempWindow.mainView.image);
        tempWindow.forceClose();
    }

    setPreviewIdReset(id, keep_zoom, histogramInfo)
    {
        if (this.global.debug) console.writeln("AutoIntegrateGradientCorrectionDialog::setPreviewIdReset: id = " + id);
        var win = ImageWindow.windowById(id);
        this.newPreviewImage(win, win.mainView.id + " [Preview]");
        this.setPreviewImage();
    }

    updatePreviewIdReset(id, keep_zoom, histogramInfo)
    {
        if (this.global.debug) console.writeln("AutoIntegrateGradientCorrectionDialog::updatePreviewIdReset: id = " + id);
        this.updatePreviewWinTxt(ImageWindow.windowById(id));
    }

    updatePreviewNoImage()
    {
        if (this.global.debug) console.writeln("AutoIntegrateGradientCorrectionDialog::updatePreviewNoImage");
        this.statusLabel.text = "No image available for preview.";
    }

    updatePreviewTxt(txt)
    {
        if (this.global.debug) console.writeln("AutoIntegrateGradientCorrectionDialog::updatePreviewTxt: " + txt);
    }

    updatePreviewWin(imgWin)
    {
        if (this.global.debug) console.writeln("AutoIntegrateGradientCorrectionDialog::updatePreviewWin: imgWin = " + imgWin);
        this.updatePreviewWinTxt(imgWin);
    }

    updatePreviewWinTxt(imgWin, txt = null)
    {
        if (this.global.debug) console.writeln("AutoIntegrateGradientCorrectionDialog::updatePreviewWinTxt: imgWin = " + imgWin);
        this.newPreviewImage(imgWin, txt);
        this.updatePreviewImage();
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

    this.autoSTFCheckBox = new CheckBox(this);
    this.autoSTFCheckBox.text = "AutoSTF";
    this.autoSTFCheckBox.toolTip = "Automatically apply Screen Transfer Function (STF) to preview image.";
    this.autoSTFCheckBox.checked = true;
    this.autoSTFCheckBox.onCheck = function(checked) {
        this.autoSTF = checked;
        // Update preview
        this.setPreviewImage();
    };

    this.previewButtonsSizer = new HorizontalSizer;
    this.previewButtonsSizer.spacing = 4;
    this.previewButtonsSizer.addStretch();
    this.previewButtonsSizer.add(this.autoSTFCheckBox);

   this.previewControl = new AutoIntegratePreviewControl(this, "gradient_correction_preview", this.engine, this.util, this.global, 600, 600, false);

   this.leftSizer = new VerticalSizer;
   this.leftSizer.spacing = 4;
   this.leftSizer.add(this.previewControl, 600);
   this.leftSizer.add(this.previewButtonsSizer, 600);

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
   this.subtitleLabel.text = "Select image and apply gradient correction";
   this.subtitleLabel.textAlignment = TextAlignment.Center;
   this.subtitleLabel.styleSheet = "font-size: 9pt; color: #888888; font-style: italic;";

    this.enhancements_gui = new AutoIntegrateEnhancementsGUI(this, this.guitools, this.util, this.global, this.engine, preview_functions);

   // -------------------------------------------------------------------------
   // Gradient correction method
   // -------------------------------------------------------------------------

    this.gradientCorrectionChoiceSizer = this.guitools.createGradientCorrectionChoiceSizer(this, "Gradient correction method:");
    this.gradientCorrectionChoiceGroupBox = new GroupBox(this);
    this.gradientCorrectionChoiceGroupBox.title = "Gradient correction method";
    this.gradientCorrectionChoiceGroupBox.sizer = this.gradientCorrectionChoiceSizer;

   // -------------------------------------------------------------------------
   // Target image
   // -------------------------------------------------------------------------

    this.enhancements_gui.target_image_selected_callback = function(target_image_id) {
        if (this.global.debug) console.writeln("AutoIntegrateGradientCorrectionDialog:: target_image_selected_callback: target_image_id = " + target_image_id);
        this.guitools.exclusionAreasTargetImageName = target_image_id;
    }
    this.targetImageSizer = this.enhancements_gui.createTargetImageSizer(this);
    this.enhancements_gui.apply_completed_callback = function(apply_ok) {
        // We do gradient correction here so we set the value to true
        // With reset option it may have been reset to false (default)
        this.global.par.enhancements_GC.val = true;
    };
    this.targetImageGroupBox = new GroupBox(this);
    this.targetImageGroupBox.title = "Target image";
    this.targetImageGroupBox.sizer = this.targetImageSizer;

   // -------------------------------------------------------------------------
   // Gradient correction Settings
   // -------------------------------------------------------------------------

    this.createGradientCorrectionSizer = this.guitools.createGradientCorrectionSizer(this);
    this.createGraXpertGradientCorrectionSection = this.guitools.createGraXpertGradientCorrectionSizer(this);

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

   var obj = this.guitools.newJsonSizerObj(this, null, "GradientCorrectionSettings.json");
   this.loadSaveSizer = obj.sizer;

   // -------------------------------------------------------------------------
   // Stretching Group Box
   // -------------------------------------------------------------------------

    if (this.global.debug) console.writeln("AutoIntegrateGradientCorrectionDialog:: creating gradientCorrectionGroupBox");

    this.gradientCorrectionGroupBox = this.guitools.newGroupBoxSizer(this);
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

} // End of initGUI()

}

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
