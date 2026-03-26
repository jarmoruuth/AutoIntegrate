/*
        GUI utility functions for AutoIntegrate script

Interface functions:

    See end of the file.

Interface objects:

    AutoIntegrateGUITools

This product is based on software from the PixInsight project, developed
by Pleiades Astrophoto and its contributors (https://pixinsight.com/).

*/

#ifndef AUTOINTEGRATEGUITOOLS_JS
#define AUTOINTEGRATEGUITOOLS_JS

#include "AutoIntegrateExclusionArea.js"

class AutoIntegrateGUITools extends Object
{
    constructor(parent, global, util, engine) {
        super();

this.parent = parent;
if (global.debug) console.writeln("AutoIntegrateGUITools");
this.global = global;
this.par = global.par;
this.util = util;
this.engine = engine;

this.preview_control = null;

this.starless_and_stars_combine_values = [ 'Add', 'Screen', 'Lighten' ];
this.histogram_stretch_type_values = [ 'Median', 'Peak' ];
this.STF_linking_values = [ 'Auto', 'Linked', 'Unlinked' ];
this.adjust_shadows_values = [ 'none', 'before', 'after', 'both' ];
this.graxpert_correction_values = [ 'Subtraction', 'Division' ];
this.ABE_correction_values = [ 'Subtraction', 'Division' ];
this.mgc_scale_valuestxt = [ '128', '192', '256', '384', '512', '768', '1024', '1536', '2048', '3072', '4096', '6144', '8192' ];
this.mas_scale_valuestxt = [ '8', '16', '32', '64', '128', '192', '256', '384', '512', '768', '1024' ];

this.exclusionAreasComboBox = null;             // For updating exclusion image list
this.exclusionAreasTargetImageName = "Auto";    // Current exclusion image
this.exclusion_area_image_window_list = null;
this.exclusionAreaCountLabel = null;

this.current_preview = {
      image: null,
      txt: null,
      image_versions: [],     // 0 = original image, 1 = stretched image { image, txt, newimage }
      imgWin: null,           // Sometimes we keep preview window, but often can be null
      resampled: false
};

this.Foraxx_credit = "Foraxx and Dynamic palettes, credit https://thecoldestnights.com/2020/06/PixInsight-dynamic-narrowband-combinations-with-pixelmath/";
this.unscreen_tooltip = "<p>Use unscreen method to get stars image as described by Russell Croman.</p>" +
                        "<p>Unscreen method usually keeps star colors more correct than simple star removal. It is " + 
                        "recommended to use Screen method when combining star and starless images back together.<p>";
this.stars_combine_operations_Tooltip =    "<p>Possible combine operations are:</p>" +
                                          "<ul>" + 
                                          "<li>Add - Use stars+starless formula in Pixelmath</li>" +
                                          "<li>Screen - Similar to screen in Photoshop</li>" +
                                          "<li>Lighten - Similar to lighten in Photoshop</li>" +
                                          "</ul>";
this. noiseReductionToolTipCommon = "<p>AI based noise reduction using NoiseXTerminator, GraXpert denoise or DeepSNR do not use a mask.</p> " +
                                    "<p>Default noise reduction using MultiscaleLinerTransform is done using a luminance mask to target noise " + 
                                    "reduction on darker areas of the image.</p>";
this. ACDNR_StdDev_tooltip =  "<p>A mild ACDNR noise reduction with StdDev value between 1.0 and 2.0 can be useful to smooth image and reduce black spots " + 
                              "left from previous noise reduction.</p>";
this.adjust_type_toolTip = "<ul>" +
                              "<li>Lights adjust only light parts of the image.</li>" +
                              "<li>Darks adjust only dark parts of the image.</li>" +
                              "<li>All adjust the whole image.</li>" +
                              "</ul>";
this.clippedPixelsToolTip = "<p>Show clipped pixels in the preview image.</p>" + 
                            "<p>Pixels with value 0 are shown as black, pixels with value 1 are shown as white. Other pixels are shown as gray.</p>" +
                            "<p>This tool is useful to see which pixels are clipped when adjusting shadows or highlights.</p>" +
                            "<p>You can get back to normal preview by clicking the button again.</p>";

#ifdef AUTOINTEGRATE_STANDALONE
this.MGCToolTip =  "<p>When MultiscaleGradientCorrection is selected, image must be plate solved. Optionally SpectrophotometricFluxCalibration is run automatically for the image.</p>" +
                   "<p>MultiscaleGradientCorrection may fail if the image is not part of the sky area in the MARS database. " + 
                   "</p>";
#else
this.MGCToolTip =  "<p>When MultiscaleGradientCorrection is selected, image solving and SpectrophotometricFluxCalibration are run automatically for the image.</p>" +
                   "<p>MultiscaleGradientCorrection may fail if the image is not part of the sky area in the MARS database. " + 
                   "In that case the script reverts to another gradient correction method. If other gradient correction methods " + 
                   "are checked then they are selected in the following order: GraXpert, ABE, DBE, GradientCorrection." + 
                   "</p>";
#endif

this.BXT_no_PSF_tip = "Sometimes on starless images PSF value can not be calculated. Then a manual value should be given or BlurXTerminator should not be used.";
this.skip_reset_tooltip = "<p>Note that this parameter is not reset or saved to Json file.</p>";   

this.adjustShadowsToolTip = "<p>Select if shadows are adjusted before, after or before and after stretch.</p>" +
                           "<p>Value zero just moves the histogram to the left without clipping any pixels.</p>";
this.narrowbandToolTip = 
      "<p>" +
      "Color palette used to map SII, Ha and OIII to R, G and B" +
      "</p><p>" +
      "There is a list of predefined mapping that can be used, some examples are below. For more details " +
      "see the tooltip for palette combo box." +
      "</p><p>" +
      "SHO - SII=R, Ha=G, OIII=B  (Hubble)<br>" +
      "HOS - Ha=R, OIII=G, SII=B (CFHT)<br>" +
      "HOO - Ha=R, OIII=G, OIII=B (if there is SII it is ignored)" +
      "</p><p>" +
      "Mapping formulas are editable and other palettes can use any combination of channel images." +
      "</p><p>" +
      "Special keywords H, S, O, R, G and B are recognized and replaced " +
      "with corresponding channel image names. Otherwise these formulas " +
      "are passed directly to the PixelMath process." +
      "</p><p>" +
      "Option All runs all narrowband palettes in a batch mode and creates images with names Auto_+palette-name. You can use " +
      "enhancements options, then also images with name Auto_+palette-name+_enh are created. Images are saved as .xisf files. " +
      "Use Save batch result files buttons to save them all in a different format. " + 
      "To use All option all HSO filters must be available." +
      "</p>";

#ifdef AUTOINTEGRATE_STANDALONE
this.postprocessing_section = "";
#else
this.postprocessing_section = "Postprocessing / ";
#endif                               

this.histogramStretchToolTip = "Using a simple histogram transformation to get histogram median or peak to the target value. " + 
                               "Works best with images that are processed with the Crop to common area option.";

this.stretchingTootip = 
            "<p>Select how image is stretched from linear to non-linear.</p>" +
            "<ul>" +
            "<li><p>Auto STF - Use Auto Screen Transfer Function to stretch image to non-linear.<br>" + 
                 "For galaxies and other small but bright objects you should adjust <i>targetBackground</i> in <i>" + this.postprocessing_section + "AutoSTF settings</i> section to a smaller value, like 0.10</i><br>" +
                 "Parameters are set in <i>" + this.postprocessing_section + "AutoSTF settings</i> section.</p></li>" +
            "<li><p>MultiscaleAdaptiveStretch - Use MultiscaleAdaptiveStretch to stretch image to non-linear.<br>" + 
                 "You can adjust settings in <i>" + this.postprocessing_section + "MultiscaleAdaptiveStretch</i> section.</p></li>" +
            "<li><p>Masked Stretch - Use MaskedStretch to stretch image to non-linear.<br>" + 
                   "Useful when AutoSTF generates too bright images, like on some galaxies.<br>" + 
                   "Parameters are set in <i>" + this.postprocessing_section + "Masked stretch settings</i> section</p></li>" +
            "<li><p>VeraLuxHMS - Use VeraLux Hypermetric Stretch to stretch image to non-linear.<br>" + 
                   "VeraLuxHMS can work well on many targets and can create saturated results.<br>" + 
                   "Parameters are set in <i>" + this.postprocessing_section + "VeraLux HMS Stretch</i> section</p></li>" +
            "<li><p>Masked+Histogram Stretch - Use MaskedStretch with a Histogram Stretch prestretch to stretch image to non-linear.<br>" + 
                   "Prestretch help with stars that can be too pointlike with Masked Stretch.<br>" +
                   "Parameters are set in <i>" + this.postprocessing_section + "Masked stretch settings</i> and <i>" + this.postprocessing_section + "Histogram stretching settings</i> sections</p></li>" +
            "<li><p>Histogram stretch - " + this.histogramStretchToolTip + "<br>" + 
                   "Parameters are set in <i>" + this.postprocessing_section + "Histogram stretching settings</i> section</p></li>" +
            "<li><p>Arcsinh Stretch - Use ArcsinhStretch to stretch image to non-linear.<br>" + 
                   "Can be useful when stretching stars to keep good star color.<br>" + 
                   "Parameters are set in <i>" + this.postprocessing_section + "Arcsinh stretch settings</i> section</p></li>" +
            "</ul>" +
            "<p>There are also some experimental stretches.</p>" +
            "<ul>" +
            "<li><p>Logarithmic stretch - Parameters are set in <i>" + this.postprocessing_section + "Other stretching settings</i> section</p></li>" +
            "<li><p>Asinh+Histogram stretch - Parameters are set in <i>" + this.postprocessing_section + "Arcsinh stretch settings</i> and <i>" + this.postprocessing_section + "Histogram stretching settings</i> sections</p></li>" +
            "<li><p>Square root stretch - Parameters are set in <i>" + this.postprocessing_section + "Other stretching settings</i> section</p></li>" +
            "<li><p>Shadow stretch - Parameters are set in <i>" + this.postprocessing_section + "Other stretching settings</i> section</p></li>" +
            "<li><p>Highlight stretch - Parameters are set in <i>" + this.postprocessing_section + "Other stretching settings</i> section</p></li>" +
            "<li><p>None - No stretching, mainly for generating _HT files to be used with AutoContinue.</p></li>" +
            "</ul>" + 
#ifndef AUTOINTEGRATE_STANDALONE
            "<p>See <i>" + this.postprocessing_section + "Stretching settings</i> section for stretching specific parameters.</p>" +
            "<p>Note that when non-default <i>Target</i> type is selected then this option is disabled.</p>" +
#endif
            ""
            ;

} // constructor

newVerticalSizer(margin, add_stretch, items, spacing)
{
      var sizer = new VerticalSizer;
      sizer.textAlignment = TextAlignment.Left | TextAlignment.VertCenter;
      if (margin > 0) {
            sizer.margin = margin;
      }
      if (spacing != null) {
            sizer.spacing = spacing;
      } else {
            sizer.spacing = 4;
      }
      for (var i = 0; i < items.length; i++) {
            sizer.add(items[i]);
      }
      if (add_stretch) {
            sizer.addStretch();
      }
      return sizer;
}

newHorizontalSizer(margin, add_stretch, items, spacing)
{
      var sizer = new HorizontalSizer;
      sizer.textAlignment = TextAlignment.Left | TextAlignment.VertCenter;
      sizer.margin = margin;
      if (spacing != null) {
            sizer.spacing = spacing;
      } else {
            sizer.spacing = 4;
      }
      for (var i = 0; i < items.length; i++) {
            sizer.add(items[i]);
      }
      if (add_stretch) {
            sizer.addStretch();
      }
      return sizer;
}

 newCheckBoxEx( parent, checkboxText, param, toolTip, onClick, updatedCallback = null)
 {
       var cb = new CheckBox( parent );
       cb.text = checkboxText;
       cb.aiParam = param;
       try {
            cb.checked = cb.aiParam.val;
      } catch(err) {    
            console.criticalln("newCheckBoxEx: " + err);
            console.criticalln("Text: " + param.name);
            console.criticalln("Parameter name: " + checkboxText);
            console.criticalln("Parameter type: " + param.type);
            console.criticalln("Parameter value: " + param.val);
            console.criticalln("CheckBox value not set");
      }
       if (onClick != null) {
             cb.onClick = onClick;
       } else {
             cb.onClick = (checked) => { 
                  cb.aiParam.val = checked;
                  if (updatedCallback != null) {
                        updatedCallback();
                  }
             }
       }
       if ( typeof toolTip !== 'undefined' && toolTip != null ) {
             cb.toolTip = this.util.formatToolTip(toolTip);
       }
 
       cb.aiParam.reset = () => {
             cb.checked = cb.aiParam.val;
       };
       this.util.recordParam(param);
 
       return cb;
 }
 
 newCheckBox( parent, checkboxText, param, toolTip, updatedCallback = null)
 {
       return this.newCheckBoxEx(parent, checkboxText, param, toolTip, null, updatedCallback);
 }

 newPparCheckBox( parent, checkboxText, pparam, val, toolTip, onClick )
 {
       var cb = new CheckBox( parent );
       cb.aiParam = pparam;
       cb.text = checkboxText;
       cb.checked = val;
       cb.onClick = onClick;
       cb.toolTip = this.util.formatToolTip(toolTip);
 
       return cb;
 }
 
newGroupBox( parent, title, toolTip )
{
      var gb = new GroupBox( parent );
      if ( typeof title !== 'undefined' && title != null ) { 
            gb.title = title; 
      }
      if ( typeof toolTip !== 'undefined' && toolTip != null ) { 
            gb.toolTip = this.util.formatToolTip(toolTip);
      }

      return gb;
}

newSectionLabel(parent, text)
{
      var lbl = new Label( parent );
      lbl.useRichText = true;
      lbl.text = '<p style="color:SlateBlue"><b>' + text + "</b></p>";

      return lbl;
}

newLabel(parent, text, tip, align_left)
{
      var lbl = new Label( parent );
      lbl.text = text;
      if (align_left) {
            lbl.textAlignment = TextAlignment.Left|TextAlignment.VertCenter;
      } else {
            lbl.textAlignment = TextAlignment.Right|TextAlignment.VertCenter;
      }
      if (tip != null) {
            lbl.toolTip = this.util.formatToolTip(tip);
      }

      return lbl;
}

newTextEdit(parent, param, tooltip)
{
      var edt = new Edit( parent );
      edt.aiParam = param;
      edt.onTextUpdated = (value) => { 
            edt.aiParam.val = value; 
      };
      edt.text = edt.aiParam.val;
      edt.toolTip = this.util.formatToolTip(tooltip);
      edt.aiParam.reset = () => {
            edt.text = edt.aiParam.val;
      };
      this.util.recordParam(param);
      return edt;
}

newPparTextEdit(parent, pparam, val, tooltip, onTextUpdated)
{
      var edt = new Edit( parent );
      edt.aiParam = pparam;
      edt.onTextUpdated = onTextUpdated;
      edt.text = val;
      edt.toolTip = this.util.formatToolTip(tooltip);
      return edt;
}

newNumericEditPrecision(parent, txt, param, min, max, tooltip, precision, updatedCallback = null)
{
      var edt = new NumericEdit( parent );
      edt.label.text = txt;
      edt.label.textAlignment = TextAlignment.Left|TextAlignment.VertCenter;
      edt.real = true;
      edt.edit.setFixedWidth( 6 * parent.font.width( "0" ) );
      edt.aiParam = param;
      edt.onValueUpdated = (value) => { 
            edt.aiParam.val = value; 
      };
      edt.setPrecision( precision );
      edt.setRange(min, max);
      edt.setValue(edt.aiParam.val);
      edt.toolTip = this.util.formatToolTip(tooltip);
      edt.aiParam.reset = () => {
            edt.setValue(edt.aiParam.val);
            if (updatedCallback != null) {
                  updatedCallback();
            }
      };
      edt.textAlignment = TextAlignment.Left|TextAlignment.VertCenter;
      this.util.recordParam(param);
      return edt;
}

newNumericEdit(parent, txt, param, min, max, tooltip)
{
      return this.newNumericEditPrecision(parent, txt, param, min, max, tooltip, 2)
}

newRGBNBNumericEdit(parent, txt, param, tooltip)
{
      return this.newNumericEdit(parent, txt, param, 0.1, 999, tooltip);
}

newNumericControlPrecision(parent, txt, param, min, max, tooltip, precision, updatedCallback = null)
{
      var edt = new NumericControl( parent );
      edt.label.text = txt;
      edt.label.textAlignment = TextAlignment.Left|TextAlignment.VertCenter;
      edt.aiParam = param;
      edt.onValueUpdated = function(value) { 
            edt.aiParam.val = value; 
            if (updatedCallback != null) {
                  updatedCallback();
            }
      };
      edt.setPrecision( precision );
      edt.setRange(min, max);
      if (precision == 1) {
            edt.slider.setRange(10 * min, 10 * max);
      } else if (precision == 3) {
            edt.slider.setRange(1000 * min, 1000 * max);
      } else {
            // Default to 2 decimal places
            edt.slider.setRange(100 * min, 100 * max);
      }
      edt.setValue(edt.aiParam.val);
      edt.toolTip = this.util.formatToolTip(tooltip);
      edt.aiParam.reset = () => {
            edt.setValue(edt.aiParam.val);
            if (updatedCallback != null) {
                  updatedCallback();
            }
      };
      edt.textAlignment = TextAlignment.Left|TextAlignment.VertCenter;
      this.util.recordParam(param);
      return edt;
}

newNumericControl(parent, txt, param, min, max, tooltip)
{
      return this.newNumericControlPrecision(parent, txt, param, min, max, tooltip, 2)
}

newNumericControl2(parent, txt, param, min, max, tooltip, updatedCallback)
{
      return this.newNumericControlPrecision(parent, txt, param, min, max, tooltip, 2, updatedCallback)
}

newNumericControl3(parent, txt, param, min, max, tooltip, updatedCallback)
{
      return this.newNumericControlPrecision(parent, txt, param, min, max, tooltip, 3, updatedCallback)
}

newSpinBox(parent, param, min, max, tooltip)
{
      var edt = new SpinBox( parent );
      edt.minValue = min;
      edt.maxValue = max;
      edt.aiParam = param;
      edt.value = edt.aiParam.val;
      edt.toolTip = this.util.formatToolTip(tooltip);
      edt.onValueUpdated = function( value )
      {
            edt.aiParam.val = value;
      };

      edt.aiParam.reset = () => {
            edt.value = edt.aiParam.val;
      };
      this.util.recordParam(param);

      return edt;
}

newPparSpinBox(parent, pparam, val, min, max, tooltip, onValueUpdated)
{
      var edt = new SpinBox( parent );
      edt.minValue = min;
      edt.maxValue = max;
      edt.aiParam = pparam;
      edt.value = val;
      edt.toolTip = this.util.formatToolTip(tooltip);
      edt.onValueUpdated = onValueUpdated;

      return edt;
}

addArrayToComboBox(cb, arr)
{
      for (var i = 0; i < arr.length; i++) {
            cb.addItem( arr[i] );
      }
}

newComboBox(parent, param, valarray, tooltip, updatedCallback = null)
{
      var cb = new ComboBox( parent );
      cb.toolTip = this.util.formatToolTip(tooltip);
      this.addArrayToComboBox(cb, valarray);
      cb.aiParam = param;
      cb.aiValarray = valarray;
      cb.currentItem = valarray.indexOf(cb.aiParam.val);
      cb.onItemSelected = function( itemIndex ) {
            cb.aiParam.val = cb.aiValarray[itemIndex];
            if (updatedCallback != null) {
                  updatedCallback();
            }
      };

      cb.aiParam.reset = () => {
            cb.currentItem = cb.aiValarray.indexOf(cb.aiParam.val);
      }
      this.util.recordParam(param);
      
      return cb;
}

newComboBoxIndex(parent, param, valarray, tooltip)
{
      var cb = new ComboBox( parent );
      cb.toolTip = this.util.formatToolTip(tooltip);
      cb.aiParam = param;
      cb.aiValarray = valarray;
      this.addArrayToComboBox(cb, cb.aiValarray);
      cb.currentItem = cb.aiParam.val;
      cb.onItemSelected = function( itemIndex ) {
            cb.aiParam.val = itemIndex;
      };

      cb.aiParam.reset = () => {
            cb.currentItem = cb.aiParam.val;
      }
      this.util.recordParam(param);
      
      return cb;
}

newComboBoxStrvalsToInt(parent, param, valarray, tooltip)
{
      var cb = new ComboBox( parent );
      cb.toolTip = this.util.formatToolTip(tooltip);
      cb.aiParam = param;
      cb.aiValarray = valarray;
      this.addArrayToComboBox(cb, cb.aiValarray);
      cb.currentItem = valarray.indexOf(cb.aiParam.val.toString());
      cb.onItemSelected = function( itemIndex ) {
            cb.aiParam.val = parseInt(cb.aiValarray[itemIndex]);
      };

      cb.aiParam.reset = () => {
            cb.currentItem = cb.aiValarray.indexOf(cb.aiParam.val.toString());
      }
      this.util.recordParam(param);
      
      return cb;
}

newComboBoxpalette(parent, param, valarray, tooltip)
{
      var cb = new ComboBox( parent );
      cb.enabled = true;
      cb.editEnabled = true;
      cb.aiParam = param;
      cb.aiValarray = valarray;
      this.addArrayToComboBox(cb, cb.aiValarray);
      cb.toolTip = this.util.formatToolTip(tooltip);
      cb.onEditTextUpdated = () => { 
            cb.aiParam.val = cb.editText.trim(); 
      };
      cb.aiParam.reset = () => {
            cb.editText = cb.aiParam.val;
      }
      this.util.recordParam(param);
      return cb;
}

newPushOrToolButton(parent, icon, txt, tooltip, action, toolbutton)
{
      if (toolbutton) {
            var button = new ToolButton( parent );
      } else {
            var button = new PushButton( parent );
            button.text = txt;
      }
      button.onClick = action;
      if (icon) {
            button.icon = parent.scaledResource( icon );
      }
      button.toolTip = this.util.formatToolTip(tooltip);

      return button;
}

newGroupBoxSizer(parent)
{
      var gb = this.newGroupBox( parent );
      gb.sizer = new VerticalSizer;
      gb.sizer.margin = 4;
      gb.sizer.spacing = 4;

      return gb;
}

getSectionVisible(name, control)
{
      if (this.global.do_not_read_settings) {
            return;
      }
      if (this.global.ppar.savedInterfaceVersion <= 0) {
            // Migrate from old settings
            var oldname = name;
            var tempSetting = Settings.read(oldname, DataType.Boolean);
            if (Settings.lastReadOK) {
                  if (this.global.debug) console.writeln("AutoIntegrate: migrated from old settings " + oldname + "=" + tempSetting);
                  control.visible = tempSetting;
                  if (!this.global.do_not_write_settings) {
                        Settings.write("AutoIntegrate" + "/" + name, DataType.Boolean, control.visible);
                        Settings.remove(name);
                  }
            }
      } else {
            var key = "AutoIntegrate" + "/" + name;
            var tempSetting = Settings.read(key, DataType.Boolean);
            if (Settings.lastReadOK) {
                  if (this.global.debug) console.writeln("AutoIntegrate: read section from settings " + key + "=" + tempSetting);
                  control.visible = tempSetting;
            }
      }
}

newSectionBarAdd(parent, groupbox, control, title, name, level = 1)
{
      var sb = new SectionBar(parent, title);
      sb.setSection(control);
      sb.onToggleSection = function(bar, beginToggle) {
            if (!parent.global.do_not_write_settings) {
                  Settings.write("AutoIntegrate" + "/" + name, DataType.Boolean, control.visible);
            }
            parent.ensureLayoutUpdated();
            parent.adjustToContents();
      };
      sb.aiControl = control;
      sb.aiName = name;
      control.aiName = name;
      if (level == 2) {
            sb.backgroundColor = this.global.sectionBackgroundColor;
      }

      this.getSectionVisible(name, control);

      if (groupbox) {
            groupbox.sizer.add( sb );
            groupbox.sizer.add( control );
      }

      this.global.rootingArr.push(sb);
      this.global.sectionBarControls.push(control);
      this.global.sectionBars.push(sb);

      return sb;
}

newSectionBarAddArray(parent, groupbox, title, name, objarray, level = 1)
{
      var ProcessingControl = new Control( parent );
      ProcessingControl.sizer = new VerticalSizer;
      ProcessingControl.sizer.margin = 6;
      ProcessingControl.sizer.spacing = 4;
      for (var i = 0; i < objarray.length; i++) {
            ProcessingControl.sizer.add( objarray[i] );
      }
      // hide this section by default
      ProcessingControl.visible = false;

      parent.global.rootingArr.push(ProcessingControl);

      var sb = this.newSectionBarAdd(parent, groupbox, ProcessingControl, title, name, level);

      return { section: sb, control: ProcessingControl };
}

createGraXpertPathSizer(parent)
{
      var graxpertPathLabel = this.newLabel(parent, "Path",
            "<p>Path to GraXpert executable.</p>" +
            "<p><b>NOTE!</b> Parameter is automatically saved the persistent module settings. " +
            "The value is automatically restored when the script starts.</p>"
#ifndef AUTOINTEGRATE_STANDALONE
            + this.skip_reset_tooltip
#endif
            );
      var graxpertPathEdit = this.newTextEdit(parent, this.par.graxpert_path, graxpertPathLabel.toolTip);
      var graxpertPathButton = new ToolButton( parent );
      graxpertPathButton.icon = parent.scaledResource(":/icons/select-file.png");
      graxpertPathButton.toolTip = graxpertPathLabel.toolTip;
      graxpertPathButton.setScaledFixedSize( 20, 20 );
      graxpertPathButton.onClick = () =>
      {
            var ofd = new OpenFileDialog;
            ofd.multipleSelections = false;
            if (!ofd.execute()) {
                  return;
            }
            graxpertPathEdit.text = ofd.fileName;
            this.par.graxpert_path.val = ofd.fileName;
            // Save path immediately
            this.util.writeParameterToSettings(this.par.graxpert_path);
            console.writeln("GraXpert path set to: " + ofd.fileName);
      };

      // Path sizer
      var graxpertPathSizer = this.newHorizontalSizer(6, true, [ graxpertPathLabel, graxpertPathEdit, graxpertPathButton ]);

      return graxpertPathSizer;
}


createImageToolsControl(parent)
{
      if (this.global.debug) console.writeln("AutoIntegrateGUITools::createImageToolsControl");

#ifndef AUTOINTEGRATE_STANDALONE
      if (this.global.is_gc_process) {
            var use_abe_CheckBox = this.newCheckBox(parent, "ABE", this.par.use_abe,
            "<p>Run AutomaticBackgroundExtractor (ABE) to correct gradients in images.</p>" +
            "</p>By default no gradient correction is done. To use ABE for gradient correction you need to also check one of " +
            "the gradient correction options in the <i>Settings / Image processing parameters</i> section.</p>" +
            "<p>Settings for ABE are in <i>Postprocessing / ABE settings</i> section.</p>");
      }
      var use_dbe_CheckBox = this.newCheckBox(parent, "DBE", this.par.use_dbe,
            "<p>Use DynamicBackgroundExtraction (DBE) to correct gradients in images.</p>" +
            "</p>By default no gradient correction is done. To use DBE for gradient correction you need to also check one of " +
            "the gradient correction options in the <i>Settings / Image processing parameters</i> section.</p>" +
            "<p>Sample points are automatically generated for DBE. Settings for DBE are in <i>Postprocessing / DBE settings</i> section.</p>");

      if (this.global.is_mgc_process) {
            var use_multiscalegradientcorrection_CheckBox = this.newCheckBox(parent, "MultiscaleGradientCorrection", this.par.use_multiscalegradientcorrection, 
                  "<p>Use MultiscaleGradientCorrection instead of GradientCorrection process to correct gradients in images.</p>" +
                  "</p>By default no gradient correction is done. To use MultiscaleGradientCorrection for gradient correction you need to also check one of " +
                  "the gradient correction options in the <i>Settings / Image processing parameters</i> section.</p>" +
                  "<p>Settings for MultiscaleGradientCorrection are in <i>Postprocessing / Gradient correction</i> section.</p>" +
                  "<p>Note that you need to set up MARS database settings using the PixInsight MultiscaleGradientCorrection process before " +
                  "using this option.</p>" +
                  this.MGCToolTip);
      }
#endif // AUTOINTEGRATE_STANDALONE

      this.use_StarXTerminator_CheckBox = this.newCheckBox(parent, "StarXTerminator", this.par.use_starxterminator,
            "<p>Use StarXTerminator to remove stars from an image.</p>" +
            "<p>You can change some StarXTerminator settings in the <i>Tools / StarXTerminator</i> section.</p>" );
      var use_noisexterminator_CheckBox = this.newCheckBox(parent, "NoiseXTerminator", this.par.use_noisexterminator,
            "<p>Use NoiseXTerminator for noise reduction.</p>" +
            "<p>You can change noise reduction settings in the <i>Postprocessing / Noise reduction</i> section.</p>" );
      var use_starnet2_CheckBox = this.newCheckBox(parent, "StarNet2", this.par.use_starnet2,
            "<p>Use StarNet2 to remove stars from an image.</p>" );
      var use_deepsnr_CheckBox = this.newCheckBox(parent, "DeepSNR", this.par.use_deepsnr,
            "<p>Use DeepSNR for noise reduction.</p>" +
            "<p>Note that with DeepSNR increasing the noise reduction strength value will decrease the noise reduction.</p>" );
      var use_blurxterminator_CheckBox = this.newCheckBox(parent, "BlurXTerminator", this.par.use_blurxterminator, 
            "<p>Use BlurXTerminator for sharpening and deconvolution.</p>" +
            "<p>BlurXTerminator is applied on the linear image just before it is stretched to non-linear. Enhancements " +
            "option for sharpening can be used to apply BlurXTerminator on non-linear image.</p>" +
            "<p>Some options for BlurXTerminator can be adjusted in the <i>Tools / BlurXTerminator</i> section.</p>" +
            "<p>When using BlurXTerminator it is recommended to do noise reduction after BluxXTerminator " + 
            "by checking option <i>Combined image noise reduction</i> or <i>Non-linear noise reduction</i>. " + 
            "But it is always good to experiment what " +
            "is best for your own data.</p>" + 
            "<p>" + this.BXT_no_PSF_tip + "</p>");

var GraXpert_note = "<p><b>NOTE!</b> A path to GraXpert file must be set in the <i>Tools / GraXpert</i> section before it can be used.</p>" +
                    "<p><b>NOTE2!</b> You need to manually start GraXpert once to ensure that the correct AI model is loaded into your computer.</p>";

#ifndef AUTOINTEGRATE_STANDALONE
      if (this.global.is_gc_process) {
            var use_graxpert_toolTip = "<p>Use GraXpert instead of GradientCorrection process to correct gradients in images.</p>";
      } else {
            var use_graxpert_toolTip = "<p>Use GraXpert instead of AutomaticBackgroundExtractor (ABE) to correct gradients in images.</p>";
      }
      use_graxpert_toolTip += "</p>By default no gradient correction is done. To use GraXpert for gradient correction you need to also check one of " +
                              "the gradient correction options in the <i>Settings / Image processing parameters</i> section.</p>";
      
      var use_graxpert_CheckBox = this.newCheckBox(parent, "GraXpert gradient", this.par.use_graxpert,
            use_graxpert_toolTip +
            "<p>GraXpert always uses the AI background model. In the <i>Tools / GraXpert</i> section " +
            "it is possible to set some settings.</p>" +
            GraXpert_note);
#endif // AUTOINTEGRATE_STANDALONE

      var use_graxpert_denoise_CheckBox = this.newCheckBox(parent, "GraXpert denoise", this.par.use_graxpert_denoise,
            "<p>Use GraXpert for noise reduction.</p>" +
            "<p>In the <i>Tools / GraXpert</i> section it is possible to set some settings.</p>" +
            GraXpert_note);

      var use_graxpert_deconvolution_CheckBox = this.newCheckBox(parent, "GraXpert deconvolution", this.par.use_graxpert_deconvolution,
            "<p>Use GraXpert deconvolution for stellar and non-stellar sharpening.</p>" +
            "<p>In the <i>Tools / GraXpert</i> section it is possible to set some settings.</p>" +
            GraXpert_note);

#ifndef AUTOINTEGRATE_STANDALONE
      // Tools set 1, gradient correction
      var imageToolsSet1SectionLabel = this.newSectionLabel(parent, "Gradient correction");
      imageToolsSet1SectionLabel.toolTip = "<p>Select tools for gradient correction if you do not want to use the default gradient correction.</p>";
      var imageToolsSet1 = new VerticalSizer;
      imageToolsSet1.margin = 6;
      imageToolsSet1.spacing = 4;
      imageToolsSet1.add( imageToolsSet1SectionLabel );
      if (this.global.is_gc_process || this.global.is_mgc_process) {
            if (this.global.is_gc_process) {
                  imageToolsSet1.add( use_abe_CheckBox );
            }
            imageToolsSet1.add( use_dbe_CheckBox );
            if (this.global.is_mgc_process) {
                  imageToolsSet1.add( use_multiscalegradientcorrection_CheckBox );
            }
      }
      imageToolsSet1.add( use_graxpert_CheckBox );
      imageToolsSet1.addStretch();
#endif // AUTOINTEGRATE_STANDALONE

      // Tools set 2, noise removal
      var imageToolsSet2SectionLabel = this.newSectionLabel(parent, "Noise removal");
      imageToolsSet2SectionLabel.toolTip = "<p>Select tools for noise removal if you do not want to use the default noise removal.</p>" + 
                                                "<p>Note that these are external tools and you need to have them installed and set up correctly.</p>";
      var imageToolsSet2 = new VerticalSizer;
      imageToolsSet2.margin = 6;
      imageToolsSet2.spacing = 4;
      imageToolsSet2.add( imageToolsSet2SectionLabel );
      imageToolsSet2.add( use_noisexterminator_CheckBox );
      imageToolsSet2.add( use_graxpert_denoise_CheckBox );
      imageToolsSet2.add( use_deepsnr_CheckBox );
      imageToolsSet2.addStretch();

      // Tools set 3, star removal
      var imageToolsSet3SectionLabel = this.newSectionLabel(parent, "Star removal");
      imageToolsSet3SectionLabel.toolTip = "<p>Select tools for star removal.</p>" + 
                                                "<p>Note that these are external tools and you need to have them installed and set up correctly.</p>";
      var imageToolsSet3 = new VerticalSizer;
      imageToolsSet3.margin = 6;
      imageToolsSet3.spacing = 4;
      imageToolsSet3.add( imageToolsSet3SectionLabel );
      imageToolsSet3.add( this.use_StarXTerminator_CheckBox );
      imageToolsSet3.add( use_starnet2_CheckBox );
      imageToolsSet3.addStretch();

      // Tools set 4, deconvolution
      var imageToolsSet4SectionLabel = this.newSectionLabel(parent, "Deconvolution/sharpening");
      imageToolsSet4SectionLabel.toolTip = "<p>Select tools for deconvolution and sharpening if you do not want to use the default sharpening.</p>" + 
                                                "<p>Note that these are external tools and you need to have them installed and set up correctly.</p>";
      var imageToolsSet4 = new VerticalSizer;
      imageToolsSet4.margin = 6;
      imageToolsSet4.spacing = 4;
      imageToolsSet4.add( imageToolsSet4SectionLabel );
      imageToolsSet4.add( use_blurxterminator_CheckBox );
      imageToolsSet4.add( use_graxpert_deconvolution_CheckBox );
      imageToolsSet4.addStretch();

      // Create separate sizer for tools so we use Vertical sizer in tools control.
      // We may add more items below tools.
      var imageToolsSizer = new HorizontalSizer;
      imageToolsSizer = new HorizontalSizer;
      imageToolsSizer.margin = 6;
      imageToolsSizer.spacing = 4;
#ifndef AUTOINTEGRATE_STANDALONE
      imageToolsSizer.add( imageToolsSet1 );  // Tools set 1, gradient correction
#endif
      imageToolsSizer.add( imageToolsSet2 );  // Tools set 2, noise removal
      imageToolsSizer.add( imageToolsSet3 );  // Tools set 3, star removal
      imageToolsSizer.add( imageToolsSet4 );  // Tools set 4, deconvolution/sharpening
      imageToolsSizer.addStretch();

      // Tools this.par.
      var imageToolsControl = new Control( parent );
      imageToolsControl.sizer = new VerticalSizer;
      imageToolsControl.sizer.margin = 6;
      imageToolsControl.sizer.spacing = 4;
      imageToolsControl.sizer.add( imageToolsSizer );  // Tools set 2, noise removal
      imageToolsControl.sizer.addStretch();

      return imageToolsControl;
}

createStrechingChoiceSizer(parent, update_parameter_dependencies_callback)
{
      this.stretchingComboBox = this.newComboBox(parent, this.par.image_stretching, this.global.image_stretching_values, this.stretchingTootip);
      if (update_parameter_dependencies_callback != null) {
            update_parameter_dependencies_callback(parent);
      }

      this.stretchingLabel = this.newLabel(parent, "Stretching", this.stretchingTootip, true);

      var stretchingHelpTips = new ToolButton( parent );
      stretchingHelpTips.icon = parent.scaledResource( ":/icons/help.png" );
      stretchingHelpTips.setScaledFixedSize( 20, 20 );
      stretchingHelpTips.toolTip = this.stretchingTootip;
      stretchingHelpTips.onClick = () => {
            new MessageBox(this.stretchingTootip, "Stretching", StdIcon.Information).execute();
      }

      this.stretchingSizer = this.newHorizontalSizer(4, true, [ this.stretchingLabel, this.stretchingComboBox ]);
      this.stretchingSizer.addStretch();
      this.stretchingSizer.add( stretchingHelpTips );

      return this.stretchingSizer;
}

createClippedSizer(parent, preview_control)
{
      var enhancementsClippedPixelsLabel = this.newLabel( parent, "Clipped", this.clippedPixelsToolTip);
      var enhancementsSetClippedPixelsButton = new ToolButton( parent );
      enhancementsSetClippedPixelsButton.icon = parent.scaledResource(":/icons/clap.png");
      enhancementsSetClippedPixelsButton.toolTip = this.clippedPixelsToolTip;
      enhancementsSetClippedPixelsButton.setScaledFixedSize( 20, 20 );
      enhancementsSetClippedPixelsButton.onClick = () => {
            if (preview_control != null) {
                  preview_control.showClippedImage();
            } else if (this.preview_control != null) {
                  this.preview_control.showClippedImage();
            } else {
                  console.writeln("No preview control available to show clipped pixels.");
            }
      };

      var enhancementsSetClippedPixelsSizer = new HorizontalSizer;
      enhancementsSetClippedPixelsSizer.spacing = 4;
      enhancementsSetClippedPixelsSizer.add( enhancementsClippedPixelsLabel );
      enhancementsSetClippedPixelsSizer.add( enhancementsSetClippedPixelsButton );
      enhancementsSetClippedPixelsSizer.addStretch();

      return enhancementsSetClippedPixelsSizer;
}

createStretchingSettingsSizer(parent, engine, level, preview_control = null)
{
      if (this.global.debug) console.writeln("AutoIntegrateGUITools::createStretchingSettingsSizer");

      /* Generic settings.
       */
      var STFLinkLabel = new Label( parent );
      STFLinkLabel.text = "Link RGB channels";
      STFLinkLabel.textAlignment = TextAlignment.Left|TextAlignment.VertCenter;
      STFLinkLabel.toolTip = 
      "<p>" +
      "RGB channel linking in image stretching." +
      "</p><p>" +
      "Auto option uses the following defaults:" + 
      "</p>" +
      "<ul>" +
      "<li>RGB images using mono camera with separate filters for RGB channels use linked stretching.</li>" + 
      "<li>Color OSC/DSLR images use unlinked stretching.</li>" +
      "<li>Narrowband images use unlinked stretching. But if linear fit or color calibration is done with narrowband images, then linked stretching is used.</li>" +
      "<p>" +
      "Note that some stretching methods do not support unlinked channels." +
      "</p>";
      
      var STFComboBox = this.newComboBox(parent, this.par.STF_linking, this.STF_linking_values, STFLinkLabel.toolTip);

      var stretchAdjustShadowsLabel = this.newLabel(parent, "Adjust shadows", this.adjustShadowsToolTip, true);
      var stretchAdjustShadowsComboBox = this.newComboBox(parent, this.par.stretch_adjust_shadows, this.adjust_shadows_values, this.adjustShadowsToolTip);
      var stretchAdjustShadowsControl = this.newNumericControlPrecision(parent, "%", this.par.stretch_adjust_shadows_perc, 0, 99,
            "<p>Percentage of shadows adjustment.</p>" +
            "<p>Value zero just moves the histogram to the left without clipping any pixels.</p>", 
            3);

      if (preview_control != null) {
            var clippedSizer = this.createClippedSizer(parent, preview_control);
      }

      var StretchGenericSizer = new HorizontalSizer;
      StretchGenericSizer.spacing = 4;
      StretchGenericSizer.margin = 6;
      StretchGenericSizer.toolTip = STFLinkLabel.toolTip;
      StretchGenericSizer.add( STFLinkLabel );
      StretchGenericSizer.add( STFComboBox );
      StretchGenericSizer.add( stretchAdjustShadowsLabel );
      StretchGenericSizer.add( stretchAdjustShadowsComboBox );
      StretchGenericSizer.add( stretchAdjustShadowsControl );
      if (preview_control != null) {
            StretchGenericSizer.addSpacing(10);
            StretchGenericSizer.add( clippedSizer );
      }
      StretchGenericSizer.addStretch();
                                    
      var StretchGenericSection = this.newSectionBarAddArray(parent, null, "Generic settings", "Stretching_Generic_Settings_Section",
                                          [ StretchGenericSizer ], level);
      StretchGenericSection.control.visible = true;

      /* MultiscaleAdaptiveStretch (MAS).
       */
      var MASTargetBackgroundControl = this.newNumericControl(parent, "Target Background", this.par.MAS_targetBackground, 0, 1,
            "<p>MAS targetBackground value. Usually values between 0.1 and 0.250 work best. Possible values are between 0 and 0.50.</p>");
      var MASAggressivenessControl = this.newNumericControl(parent, "Aggressiveness", this.par.MAS_aggressiveness, 0, 1,
            "<p>Controls the black point clipping. Higher values produce Better background but may loose some details.Possible values are between 0 and 1.</p>");
      var MASDynamicRangeCompression = this.newNumericControl(parent, "Dynamic Range Compression", this.par.MAS_dynamicRangeCompression, 0, 1,
            "<p>MAS dynamic range compression value. Higher values produce softer contrast in highlights. Possible values are between 0 and 1.</p>");

      var MASStretchSizer0 = new HorizontalSizer;
      MASStretchSizer0.spacing = 4;
      MASStretchSizer0.add( MASTargetBackgroundControl );
      MASStretchSizer0.addStretch();

      var MASStretchSizer1 = new HorizontalSizer;
      MASStretchSizer1.spacing = 4;
      // MASStretchSizer1.margin = 6;
      MASStretchSizer1.add( MASAggressivenessControl );
      MASStretchSizer1.add( MASDynamicRangeCompression );
      MASStretchSizer1.addStretch();

      var MASBackgroundReferenceCheckbox = this.newCheckBox(parent, "Background Reference", this.par.MAS_backgroundReference,
            "<p>If checked automatically finds and uses a background reference.</p>");

      var MASContrastRecoveryCheckbox = this.newCheckBox(parent, "Contrast Recovery", this.par.MAS_contrastRecovery,
            "<p>Enable or disable MAS contrast recovery.</p>" +
            "<p>Contrast recovery can help to recover some contrast lost during stretching.</p>");
      var MASScaleSeparationLabel = this.newLabel(parent, "Scale Separation",
            "<p>MAS scale separation value.</p>" +
            "<p>Smaller value protects smaller elements from local local contrast enhancements.</p>");
      var MASScaleSeparationComboBox = this.newComboBox(parent, this.par.MAS_scaleSeparation, this.mas_scale_valuestxt, MASScaleSeparationLabel.toolTip);
      var MASContrastRecoveryIntensity = this.newNumericControl(parent, "Intensity", this.par.MAS_contrastRecoveryIntensity, 0, 1,
            "<p>MAS contrast recovery intensity.</p>");

      var MASColorSaturationCheckBox = this.newCheckBox(parent, "Color Saturation", this.par.MAS_colorSaturation,
            "<p>Enable or disable MAS color saturation.</p>" +
            "<p>Color saturation can help to improve color saturation lost during stretching.</p>");
      var MASColorSaturationAmount = this.newNumericControl(parent, "Amount", this.par.MAS_colorSaturation_amount, 0, 1,
            "<p>MAS color saturation amount.</p>" +
            "<p>Controls the intensity of the saturation enhancements. Higher values produce stronger color saturation.</p>");
      var MASColorSaturationBoost = this.newNumericControl(parent, "Boost", this.par.MAS_colorSaturation_boost, 0, 1,
            "<p>MAS color saturation boost.</p>" +
            "<p>Higher values target more on lower saturation levels.</p>");
      var MASColorSaturationLightnessCheckBox = this.newCheckBox(parent, "Lightness mask", this.par.MAS_colorSaturation_lightness,
            "<p>Enable or disable MAS color saturation affecting lightness.</p>" +
            "<p>If enabled color saturation affects are masked using a lightness mask.</p>");

      var MASColorSaturationSizer1 = new HorizontalSizer;
      MASColorSaturationSizer1.spacing = 4;
      // MASColorSaturationSizer1.margin = 6; 
      MASColorSaturationSizer1.addSpacing(20);
      MASColorSaturationSizer1.add( MASColorSaturationAmount );
      MASColorSaturationSizer1.add( MASColorSaturationBoost );
      MASColorSaturationSizer1.add( MASColorSaturationLightnessCheckBox );
      MASColorSaturationSizer1.addStretch();
      
      var MASStretchSizer = new VerticalSizer;
      MASStretchSizer.spacing = 4;
      MASStretchSizer.margin = 6;
      MASStretchSizer.add( MASStretchSizer0 );
      MASStretchSizer.add( MASStretchSizer1 );
      MASStretchSizer.addStretch();
      MASStretchSizer.addSpacing(8);
      MASStretchSizer.add( MASBackgroundReferenceCheckbox );

      var MASContrastSizer1 = new HorizontalSizer;
      MASContrastSizer1.spacing = 4;
      MASContrastSizer1.margin = 6;
      MASContrastSizer1.add( MASScaleSeparationLabel );
      MASContrastSizer1.add( MASScaleSeparationComboBox );
      MASContrastSizer1.add( MASContrastRecoveryIntensity );
      MASContrastSizer1.addStretch();

      var MASContrastSizer = new VerticalSizer;
      MASContrastSizer.spacing = 4;
      MASContrastSizer.margin = 6;
      MASContrastSizer.add( MASContrastRecoveryCheckbox );
      MASContrastSizer.add( MASContrastSizer1 );
      MASContrastSizer.addStretch();

      var MASColorSaturationSizer = new VerticalSizer;
      MASColorSaturationSizer.spacing = 4;
      MASColorSaturationSizer.margin = 6; 
      MASColorSaturationSizer.add( MASColorSaturationCheckBox );
      MASColorSaturationSizer.add( MASColorSaturationSizer1 );
      MASColorSaturationSizer.addStretch();

      var MASSection = this.newSectionBarAddArray(parent, null, "MultiscaleAdaptiveStretch settings", "Stretching_MAS_Section",
                              [ MASStretchSizer, MASContrastSizer, MASColorSaturationSizer ], level);
      MASSection.control.visible = true;

      /* Auto STF.
       */
      var STFTargetBackgroundControl = this.newNumericControl(parent, "Target Background", this.par.STF_targetBackground, 0, 1,
            "<p>STF targetBackground value. If you get too bright image lowering this value can help.</p>" +
            "<p>Usually values between 0.1 and 0.250 work best. Possible values are between 0 and 1.</p>");

      var STFSizer = new HorizontalSizer;
      STFSizer.spacing = 4;
      STFSizer.margin = 6;
      STFSizer.toolTip = STFTargetBackgroundControl.toolTip;
      STFSizer.add( STFTargetBackgroundControl );
      STFSizer.addStretch();

      var autoSTFSection = this.newSectionBarAddArray(parent, null, "Auto STF settings", "Stretching_Auto_STF_Section",
                              [ STFSizer ], level);
      autoSTFSection.control.visible = true;

      /* Masked.
       */
      var MaskedStretchTargetBackgroundEdit = this.newNumericControl(parent, "Target Background", this.par.MaskedStretch_targetBackground, 0, 1,
            "<p>Masked Stretch targetBackground value. Usually values between 0.05 and 0.2 work best. Possible values are between 0 and 1.</p>");
      var MaskedStretchPrestretchTargetEdit = this.newNumericControl(parent, "Prestretch target", this.par.MaskedStretch_prestretch_target, 0, 1,
            "<p>Masked Stretch prestretch target value if Masked+Histogram Stretch is used.</p>" +
            "<p>Target value is a target median value. Using a prestretch can help with too pointlike stars.</p>");

      var MaskedStretchSizer = new HorizontalSizer;
      MaskedStretchSizer.spacing = 4;
      MaskedStretchSizer.margin = 6;
      MaskedStretchSizer.add( MaskedStretchTargetBackgroundEdit );
      MaskedStretchSizer.add( MaskedStretchPrestretchTargetEdit );
      MaskedStretchSizer.addStretch();
      
      var MaskedStretchSection = this.newSectionBarAddArray(parent, null, "Masked Stretch settings", "Stretching_Masked_Stretch_Section",
                                    [ MaskedStretchSizer ], level);

      /* Arcsinh.
       */
      var Arcsinh_stretch_factor_Edit = this.newNumericControl(parent, "Stretch Factor", this.par.Arcsinh_stretch_factor, 1, 1000,
            "<p>Arcsinh Stretch Factor value. Smaller values are usually better than really big ones.</p>" +
            "<p>For some smaller but bright targets like galaxies it may be useful to increase stretch factor and iterations. A good starting point could be 100 and 5.</p>" +
            "<p>Useful for stretching stars to keep star colors. Depending on the star combine method you may need to use different values. For less stars you can use a smaller value.</p>");
      var Arcsinh_black_point_Control = this.newNumericControlPrecision(parent, "Black point value %", this.par.Arcsinh_black_point, 0, 99,
            "<p>Arcsinh Stretch black point value.</p>" +
            "<p>The value is given as percentage of shadow pixels, that is, how many pixels are on the left side of the histogram.</p>",
            4);
      var Arcsinh_iterations_tooltip = "Number of iterations used to get the requested stretch factor."
      var Arcsinh_iterations_Label = this.newLabel(parent, "Iterations", Arcsinh_iterations_tooltip);
      var Arcsinh_iterations_SpinBox = this.newSpinBox(parent, this.par.Arcsinh_iterations, 1, 10, Arcsinh_iterations_tooltip);

      var ArcsinhSizer = new HorizontalSizer;
      ArcsinhSizer.spacing = 4;
      ArcsinhSizer.margin = 6;
      ArcsinhSizer.add( Arcsinh_stretch_factor_Edit );
      ArcsinhSizer.add( Arcsinh_black_point_Control );
      ArcsinhSizer.add( Arcsinh_iterations_Label );
      ArcsinhSizer.add( Arcsinh_iterations_SpinBox );
      ArcsinhSizer.addStretch();

      var ArcsinhSection = this.newSectionBarAddArray(parent, null, "Arcsinh Stretch settings", "Stretching_Arcsinh_Stretch_Section",
                              [ ArcsinhSizer ], level);

      /* VeraLuxHMS.
       */
      var veraluxProcessingModeLabel = this.newLabel(parent, "Processing Mode",
                                          "VeraLux processing mode selection.\n" +
                                          "Ready-to-Use (Aesthetic)\n" +
                                          "Produces an aesthetic, export-ready image with adaptive expansion and soft-clipping.\n" +
                                          "Scientific (Preserve)\n" +
                                          "Produces 100% mathematically consistent output. Ideal for manual tone mapping.",
                                          true);
      var veraluxProcessingMode = this.newComboBox(parent, this.par.veralux_processing_mode, [ "Ready-to-Use", "Scientific" ],
                                          veraluxProcessingModeLabel.toolTip);
      var veraluxSensorProfileLabel = this.newLabel(parent, "Sensor Profile",
                                          "VeraLux sensor profile selection.\n" +
                                          "Defines the Luminance coefficients (Weights) used for the stretch.",
                                          true);
      var veraluxSensorProfile = this.newComboBox(parent, this.par.veralux_sensor_profile, engine.veralux.getSensorProfileNames(true),
                                          veraluxSensorProfileLabel.toolTip);
      var veraluxTargetEdit = this.newNumericControl(parent, "Target Bg:", this.par.veralux_target_bg, 0.00, 1.00, "Target background median (0.05-0.50). Standard is 0.20.");
      var veraluxAdaptiveAnchorCheckBox = this.newCheckBox(parent, "Adaptive Anchor", this.par.veralux_adaptive_anchor,
                                          "Analyzes histogram shape to find true signal start. Recommended for images with gradients.");
      var veraluxAutoCalcDCheckBox = this.newCheckBox(parent, "Auto-Calc Log D", this.par.veralux_auto_calc_D,
                                          "Analyzes image to find optimal Stretch Factor (Log D).");
      var veraluxAutoCalcDLabel = this.newLabel(parent, "(-)", "", true);
      this.global.veraluxAutoCalcDLabel = veraluxAutoCalcDLabel;
      var veraluxValDEdit = this.newNumericControl(parent, "Log D:", this.par.veralux_D_value, 0.0, 7.0,
                                          "Hyperbolic Intensity (Log D, 0.1-15). Controls the strength of the stretch.");
      var veraluxbEdit = this.newNumericControl(parent, "Protect b:", this.par.veralux_b_value, 0.1, 15,
                                          "Highlight Protection. Controls the 'knee of the hyperbolic curve.");
      var veraluxStarCoreRecoveryEdit = this.newNumericControl(parent, "Star Core Recovery:", this.par.veralux_convergence_power, 1, 10,
                                          "Controls how quickly saturated colors transition to white (1-10).");

      var veraluxReadyToUseLabel = this.newLabel(parent, "Ready-to-Use settings", "Setting for VeraLux Ready-to-Use mode.", true);
      var veraluxColorStrategyEdit = this.newNumericControl(parent, "Color Strategy:", this.par.veralux_color_strategy, -100, 100,
                                          "Negative: Clean Noise | Center: Balanced | Positive: Soften Highlights.\n" +
                                          "Only for Ready-to-Use mode. Value can be between -100 and 100.");

      var veraluxScientificLabel = this.newLabel(parent, "Scientific settings", "Setting for VeraLux Scientific mode.", true);
      var veraluxColorGripEdit = this.newNumericControl(parent, "Color Grip:", this.par.veralux_color_grip, 0, 1,
                                          "Controls vector color preservation. 1.0 = Pure VeraLux (0-1).\n" +
                                          "Only for Scientific mode.");
      var veraluxShadowConvEdit = this.newNumericControl(parent, "Shadow Convergence (Noise)  :", this.par.veralux_shadow_convergence, 0, 3,
                                          "Damps vector preservation in shadows to prevent color noise (0-3).\n" +
                                          "Only for Scientific mode.");

      var veraluxHelpTips = new ToolButton( parent );
      veraluxHelpTips.icon = parent.scaledResource( ":/icons/help.png" );
      veraluxHelpTips.setScaledFixedSize( 20, 20 );
      veraluxHelpTips.toolTip = engine.veralux.getHelpText();
      veraluxHelpTips.onClick = () =>
      {
            new MessageBox(engine.veralux.getHelpText(), "VeraLux help", StdIcon.Information ).execute();
      }

      var veraluxSizer1 = this.newHorizontalSizer(0, true, [ veraluxProcessingModeLabel, veraluxProcessingMode, veraluxSensorProfileLabel, veraluxSensorProfile, veraluxHelpTips ]);
      var veraluxSizer2 = this.newHorizontalSizer(0, true, [ veraluxTargetEdit, veraluxAdaptiveAnchorCheckBox, veraluxAutoCalcDCheckBox, veraluxAutoCalcDLabel  ]);
      var veraluxSizer3 = this.newHorizontalSizer(0, true, [ veraluxValDEdit, veraluxbEdit, veraluxStarCoreRecoveryEdit ]);
      var veraluxSizer4 = this.newHorizontalSizer(0, true, [ veraluxReadyToUseLabel, veraluxColorStrategyEdit ]);
      var veraluxSizer5 = this.newHorizontalSizer(0, true, [ veraluxScientificLabel, veraluxColorGripEdit, veraluxShadowConvEdit ]);
      var VeraLuxHMSSizer = this.newVerticalSizer(6, true, [ veraluxSizer1, veraluxSizer2, veraluxSizer3, veraluxSizer4, veraluxSizer5 ]);

      var veraluxSection = this.newSectionBarAddArray(parent, null, "VeraLux HMS Stretch settings", "Stretching_VeraLux_HMS_Section",
                                    [ VeraLuxHMSSizer ], level);

      /* Histogram stretching.
       */
      var histogramTypeLabel = this.newLabel(parent, "Target type", "Target type specifies what value calculated from histogram is tried to get close to Target value.");
      var histogramTypeComboBox = this.newComboBox(parent, this.par.histogram_stretch_type, this.histogram_stretch_type_values, histogramTypeLabel.toolTip);
      var histogramTargetValue_Control = this.newNumericControl(parent, "Target value", this.par.histogram_stretch_target, 0, 1,
            "<p>Target value specifies where we try to get the the value calculated using Target type.</p>" +
            "<p>Usually values between 0.1 and 0.250 work best. Possible values are between 0 and 1.</p>" +
            "<p>For very bright objects like galaxies you should try with 0.1 while more uniform objects " +
            "like large nebulas or dust you should try with 0.25.</p>");

      var histogramStretchingSizer = new HorizontalSizer;
      histogramStretchingSizer.spacing = 4;
      histogramStretchingSizer.margin = 6;
      histogramStretchingSizer.add( histogramTypeLabel );
      histogramStretchingSizer.add( histogramTypeComboBox );
      histogramStretchingSizer.add( histogramTargetValue_Control );
      histogramStretchingSizer.addStretch();

      var histogramStretchingSection = this.newSectionBarAddArray(parent, null, "Histogram stretching settings", "StretchingHistogram",
                                          [ histogramStretchingSizer ], level);

      /* Other stretching.
       */
      var otherStrechingTargetValue_Control = this.newNumericControl(parent, "Target value", this.par.other_stretch_target, 0, 1,
            "<p>Target value specifies where we try to get the the histogram median value.</p>" +
            "<p>Usually values between 0.1 and 0.250 work best. Possible values are between 0 and 1.</p>" +
            "<p>For very bright objects like galaxies you should try with 0.1 while more uniform objects " +
            "like large nebulas or dust you should try with 0.25.</p>");

      var otherStrechingTargetValueSizer = new HorizontalSizer;
      otherStrechingTargetValueSizer.spacing = 4;
      otherStrechingTargetValueSizer.margin = 6;
      otherStrechingTargetValueSizer.add( otherStrechingTargetValue_Control );
      otherStrechingTargetValueSizer.addStretch();
      var otherStretchingSection = this.newSectionBarAddArray(parent, null, "Other stretching settings", "StretchingOther",
                                    [ otherStrechingTargetValueSizer ], level);

      var stretchingSettingsSizer = new VerticalSizer;
      stretchingSettingsSizer.margin = 6;
      stretchingSettingsSizer.spacing = 4;
      stretchingSettingsSizer.add( StretchGenericSection.section );
      stretchingSettingsSizer.add( StretchGenericSection.control );
      stretchingSettingsSizer.add( autoSTFSection.section );
      stretchingSettingsSizer.add( autoSTFSection.control );
      stretchingSettingsSizer.add( MASSection.section );
      stretchingSettingsSizer.add( MASSection.control );
      stretchingSettingsSizer.add( MaskedStretchSection.section );
      stretchingSettingsSizer.add( MaskedStretchSection.control );
      stretchingSettingsSizer.add( veraluxSection.section );
      stretchingSettingsSizer.add( veraluxSection.control );
      stretchingSettingsSizer.add( ArcsinhSection.section );
      stretchingSettingsSizer.add( ArcsinhSection.control );
      stretchingSettingsSizer.add( histogramStretchingSection.section );
      stretchingSettingsSizer.add( histogramStretchingSection.control );
      stretchingSettingsSizer.add( otherStretchingSection.section );
      stretchingSettingsSizer.add( otherStretchingSection.control );
      stretchingSettingsSizer.addStretch();

      return stretchingSettingsSizer;
}

createNarrowbandCustomPaletteSizer(parent)
{
      if (this.global.debug) console.writeln("AutoIntegrateGUITools::narrowbandCustomPaletteSizer");

      this.narrowbandCustomPalette_ComboBox = new ComboBox( parent );
      for (var i = 0; i < this.global.narrowBandPalettes.length; i++) {
            this.narrowbandCustomPalette_ComboBox.addItem( this.global.narrowBandPalettes[i].name );
            if (this.global.narrowBandPalettes[i].name == this.par.narrowband_mapping.val) {
                  this.narrowbandCustomPalette_ComboBox.currentItem = i;
            }
      }
      this.narrowbandCustomPalette_ComboBox.toolTip = 
            "<p>" +
            "List of predefined color palettes. You can also edit mapping input boxes to create your own mapping." +
            "</p><p>" +
            "Dynamic palettes are the same as Foraxx options in <i>Enhancements / Narrowband enhancements</i> section. " + 
            "With Dynamic palettes the script automatically uses non-linear data>." +
            "</p><p>" +
            this.Foraxx_credit + 
            "</p><p>" +
            "L-eXtreme SHO palette was posted by Alessio Pariani to Astrobin forums. It is an example mapping for the L-eXtreme filter." +
            "</p>" +
            this.narrowbandToolTip;
      this.narrowbandCustomPalette_ComboBox.onItemSelected = (itemIndex) => {
            this.narrowbandCustomPalette_R_ComboBox.editText = this.global.narrowBandPalettes[itemIndex].R;
            this.narrowbandCustomPalette_G_ComboBox.editText = this.global.narrowBandPalettes[itemIndex].G;
            this.narrowbandCustomPalette_B_ComboBox.editText = this.global.narrowBandPalettes[itemIndex].B;
            this.par.narrowband_mapping.val = this.global.narrowBandPalettes[itemIndex].name;
            this.par.custom_R_mapping.val = this.narrowbandCustomPalette_R_ComboBox.editText;
            this.par.custom_G_mapping.val = this.narrowbandCustomPalette_G_ComboBox.editText;
            this.par.custom_B_mapping.val = this.narrowbandCustomPalette_B_ComboBox.editText;
      };
      this.narrowbandCustomPalette_ComboBox = this.narrowbandCustomPalette_ComboBox;
      this.par.narrowband_mapping.reset = () => {
            for (var i = 0; i < this.global.narrowBandPalettes.length; i++) {
                  if (this.global.narrowBandPalettes[i].name == this.par.narrowband_mapping.val) {
                        this.narrowbandCustomPalette_ComboBox.currentItem = i;
                        break;
                  }
            }
      };

      /* Create Editable boxes for R, G and B mapping. 
       */
      this.narrowbandCustomPalette_R_Label = new Label( parent );
      this.narrowbandCustomPalette_R_Label.text = "R";
      this.narrowbandCustomPalette_R_Label.textAlignment = TextAlignment.Right|TextAlignment.VertCenter;
      this.narrowbandCustomPalette_R_Label.toolTip = 
            "<p>" +
            "Mapping for R channel. Use one of the predefined mappings or edit and create your own mapping." +
            "</p>" +
            this.narrowbandToolTip;

      this.narrowbandCustomPalette_R_ComboBox = this.newComboBoxpalette(parent, this.par.custom_R_mapping, [this.par.custom_R_mapping.val, "0.75*H + 0.25*S"], this.narrowbandCustomPalette_R_Label.toolTip);

      this.narrowbandCustomPalette_G_Label = new Label( parent );
      this.narrowbandCustomPalette_G_Label.text = "G";
      this.narrowbandCustomPalette_G_Label.textAlignment = TextAlignment.Right|TextAlignment.VertCenter;
      this.narrowbandCustomPalette_G_Label.toolTip = 
            "<p>" +
            "Mapping for G channel. Use one of the predefined mappings or edit and create your own mapping." +
            "</p>" +
            this.narrowbandToolTip;

      this.narrowbandCustomPalette_G_ComboBox = this.newComboBoxpalette(parent, this.par.custom_G_mapping, [this.par.custom_G_mapping.val, "0.50*S + 0.50*O"], this.narrowbandCustomPalette_G_Label.toolTip);

      this.narrowbandCustomPalette_B_Label = new Label( parent );
      this.narrowbandCustomPalette_B_Label.text = "B";
      this.narrowbandCustomPalette_B_Label.textAlignment = TextAlignment.Right|TextAlignment.VertCenter;
      this.narrowbandCustomPalette_B_Label.toolTip = 
            "<p>" +
            "Mapping for B channel. Use one of the predefined mappings or edit and create your own mapping." +
            "</p>" +
            this.narrowbandToolTip;

      this.narrowbandCustomPalette_B_ComboBox = this.newComboBoxpalette(parent, this.par.custom_B_mapping, [this.par.custom_B_mapping.val, "0.30*H + 0.70*O"], this.narrowbandCustomPalette_B_Label.toolTip);

      this.narrowbandCustomPalette_Sizer = new HorizontalSizer;
      this.narrowbandCustomPalette_Sizer.margin = 6;
      this.narrowbandCustomPalette_Sizer.spacing = 4;
      this.narrowbandCustomPalette_Sizer.toolTip = this.narrowbandToolTip;
      this.narrowbandCustomPalette_Sizer.add( this.narrowbandCustomPalette_ComboBox );
      this.narrowbandCustomPalette_Sizer.add( this.narrowbandCustomPalette_R_Label );
      this.narrowbandCustomPalette_Sizer.add( this.narrowbandCustomPalette_R_ComboBox );
      this.narrowbandCustomPalette_Sizer.add( this.narrowbandCustomPalette_G_Label );
      this.narrowbandCustomPalette_Sizer.add( this.narrowbandCustomPalette_G_ComboBox );
      this.narrowbandCustomPalette_Sizer.add( this.narrowbandCustomPalette_B_Label );
      this.narrowbandCustomPalette_Sizer.add( this.narrowbandCustomPalette_B_ComboBox );
      this.narrowbandCustomPalette_Sizer.addStretch();

      return this.narrowbandCustomPalette_Sizer;
}

loadJsonFile(parent, loadJsonFileCallback)
{
      console.writeln("loadJsonFile");
      var pagearray = this.engine.openImageFiles("Json", false, true, false);
      if (pagearray == null) {
            return;
      }
      if (loadJsonFileCallback != null) {
            loadJsonFileCallback(parent, pagearray);
      }
}

newJsonSizerObj(parent, loadJsonFileCallback, json_filename = null)
{
      // Load and save
      this.jsonLabel = new Label( parent );
      this.jsonLabel.text = "Setup file";
      this.jsonLabel.toolTip = "<p>Reading script setup from a file, saving script setup to a file.</p>";
      this.jsonLabel.textAlignment = TextAlignment.Left|TextAlignment.VertCenter;
      
      this.jsonLoadButton = new ToolButton( parent );
      this.jsonLoadButton.icon = parent.scaledResource(":/icons/select-file.png");
      this.jsonLoadButton.toolTip = "<p>Read script setup from a Json file.</p>";
      this.jsonLoadButton.setScaledFixedSize( 20, 20 );
      this.jsonLoadButton.onClick = () =>
      {
            if (this.global.debug) console.writeln("AutoIntegrateGUITools::newJsonSizerObj::jsonLoadButton::onClick");
            this.loadJsonFile(parent, loadJsonFileCallback);
      };
      this.jsonSaveWithSettingsButton = new ToolButton( parent );
      this.jsonSaveWithSettingsButton.icon = parent.scaledResource(":/toolbar/file-project-save.png");
      this.jsonSaveWithSettingsButton.toolTip = "<p>Save current settings and file lists to a Json file. All non-default settings are saved. " + 
                                            "Current window prefix and output directory is also saved.</p>" + 
                                            "<p>Images names from all pages are saved including light and calibration files. Checked status for files is saved</p>";
      this.jsonSaveWithSettingsButton.setScaledFixedSize( 20, 20 );
      this.jsonSaveWithSettingsButton.onClick = () =>
      {
            if (this.global.debug) console.writeln("AutoIntegrateGUITools::newJsonSizerObj::jsonSaveWithSettingsButton::onClick");
            this.util.saveJsonFile(parent, true, json_filename);
      };

      this.jsonSizer = new HorizontalSizer;
      this.jsonSizer.add( this.jsonLabel );
      this.jsonSizer.add( this.jsonLoadButton );
      this.jsonSizer.add( this.jsonSaveWithSettingsButton );
      this.jsonSizer.addStretch();

      return { sizer: this.jsonSizer, label: this.jsonLabel };
}

createGradientCorrectionChoiceSizer(parent, label_txt = null)
{
      if (this.global.debug) console.writeln("AutoIntegrateGUITools::createGradientCorrectionChoiceSizer");

      if (label_txt != null) {
            this.GC_choice_Label = this.newLabel( parent, "Gradient correction method", "<p>Gradient correction method to be used.</p>" );
      }
      this.GC_values_ComboBox = this.newComboBox(parent, this.par.enhancements_GC_method, this.global.enhancements_gradient_correction_values, 
            "<p>Gradient correction method to be used.</p>"
      );
      this.GC_choice_Sizer = new HorizontalSizer;
      this.GC_choice_Sizer.spacing = 4;
      this.GC_choice_Sizer.margin = 6;
      if (label_txt != null) {
            this.GC_choice_Sizer.add( this.GC_choice_Label );
      }
      this.GC_choice_Sizer.add( this.GC_values_ComboBox );
      this.GC_choice_Sizer.addStretch();

      return this.GC_choice_Sizer;
}

getExclusionAreas() 
{
      console.writeln("Exclusion areas: " + JSON.stringify(this.global.exclusion_areas));
      var tmpname = "AutoIntegrateExclusionAreas";
      if (this.exclusionAreasTargetImageName == tmpname) {
            console.criticalln("Exclusion areas target image name cannot be the same as temporary image name: " + tmpname);
            return;
      }
      this.util.closeOneWindowById(tmpname);
      if (this.exclusionAreasTargetImageName == "Auto") {
            console.writeln("Exclusion areas target image is set to Auto, using the current image.");
            if (this.current_preview.image == null) {
                  console.criticalln("Exclusion areas target preview image is not set, cannot use Auto.");
                  return;
            }
            console.writeln("Preview image size " + this.current_preview.image.width + "x" + this.current_preview.image.height);
            var win = this.util.createWindowFromImage(this.current_preview.image, tmpname, true);
            if (win == null) {
                  console.criticalln("Exclusion areas target preview image window not found for Auto");
                  return;
            }
      } else {
            console.writeln("Exclusion areas target image is set to: " + this.exclusionAreasTargetImageName);
            var target_win = this.util.findWindow(this.exclusionAreasTargetImageName);
            if (target_win == null) {
                  console.criticalln("Exclusion areas target image window not found: " + this.exclusionAreasTargetImageName);
                  return;
            }
            var win = this.util.copyWindow(target_win, tmpname);
            if (win == null) {
                  console.criticalln("Exclusion areas target image window not found: " + this.exclusionAreasTargetImageName);
                  return;
            }
      }
      if (this.engine.imageIsLinear(win)) {
            console.writeln("Exclusion areas target image is linear, stretching the image.");
            this.engine.autoStretch(win);
      }

      console.writeln("Opening Exclusion Area dialog for target image: " + this.exclusionAreasTargetImageName);
      let exclusionArea = new AutoIntegrateExclusionArea(this.global, this.util, this.engine, win, this.global.exclusion_areas);
      if (exclusionArea.execute()) {
            var exclusion_areas = exclusionArea.getExclusionAreas();
            if (this.current_preview.imgWin != null) {
                  // We have saved original image window, scale exclusion areas to the original image size
                  this.global.exclusion_areas = this.util.getScaledExclusionAreas(exclusion_areas, this.current_preview.imgWin, false);
            } else {
                  this.global.exclusion_areas = this.util.getScaledExclusionAreas(exclusion_areas, win, false);
            }
            this.exclusionAreaCountLabel.text = "Count: " + this.global.exclusion_areas.polygons.length;

            console.writeln("Exclusion areas selected, exclusion areas: " + JSON.stringify(this.global.exclusion_areas));
      } else {
            console.writeln("No changes");
      }
      this.util.closeOneWindow(win);
}

createGradientCorrectionSizer(parent, level = 1)
{
      if (this.global.debug) console.writeln("AutoIntegrateGUITools::createGradientCorrectionSizer");

      this.GC_output_background_model_CheckBox = this.newCheckBox(parent, "Output background model", this.par.GC_output_background_model, "<p>If checked the background model is created.</p>");
      this.GC_commonSettingsSizer = this.newVerticalSizer(6, true, [this.GC_output_background_model_CheckBox], 6);

      this.GC_commonSettingsSection = this.newSectionBarAddArray(parent, null, "Common settings", "GC_common_Settings_Section",
                                          [ this.GC_commonSettingsSizer ], level);
      this.GC_commonSettingsSection.control.visible = true;

      /*
            GradientCorrection settings
      */
      if (this.global.is_gc_process) {
            this.gc_automatic_convergence_CheckBox = this.newCheckBox(parent, "Automatic convergence", this.par.gc_automatic_convergence, "<p>Run multiple iterations until difference between two models is small enough.</p>");
            this.gc_scale_Edit = this.newNumericEdit(parent, "Scale", this.par.gc_scale, 1, 10, "<p>Model scale.</p><p>Higher values generate smoother models.</p>");
            this.gc_smoothness_Edit = this.newNumericEdit(parent, "Smoothness", this.par.gc_smoothness, 0, 1, "<p>Model smoothness.</p>");
            this.GCGroupBoxSizer1 = this.newVerticalSizer(2, true, [this.gc_automatic_convergence_CheckBox, this.gc_scale_Edit, this.gc_smoothness_Edit]);

            this.gc_structure_protection_CheckBox = this.newCheckBox(parent, "Structure Protection", this.par.gc_structure_protection, "<p>Prevent overcorrecting on image structures.</p>");
            this.gc_protection_threshold_Edit = this.newNumericEdit(parent, "Protection threshold", this.par.gc_protection_threshold, 0, 1, "<p>Decreasing this value prevents overcorrecting dimmer structures.</p>");
            this.gc_protection_amount_Edit = this.newNumericEdit(parent, "Protection amount", this.par.gc_protection_amount, 0.1, 1, "<p>Increasing this value prevents overcorrecting significant structures.</p>");
            this.GCGroupBoxSizer2 = this.newVerticalSizer(2, true, [this.gc_structure_protection_CheckBox, this.gc_protection_threshold_Edit, this.gc_protection_amount_Edit]);

            this.gc_simplified_model_CheckBox = this.newCheckBox(parent, "Simplified Model", this.par.gc_simplified_model, "<p>If checked use a simplified model that is extracted before multiscale model.</p>");
            this.gc_simplified_model_degree_Label = this.newLabel(parent, "Simplified Model degree", "Model degree for simplified model.", true);
            this.gc_simplified_model_degree_SpinBox = this.newSpinBox(parent, this.par.gc_simplified_model_degree, 1, 8, this.gc_simplified_model_degree_Label.toolTip);
            this.gc_simplified_model_degree_Sizer = this.newHorizontalSizer(2, true, [this.gc_simplified_model_degree_Label, this.gc_simplified_model_degree_SpinBox]);
            this.GCGroupBoxSizer3 = this.newVerticalSizer(2, true, [this.gc_simplified_model_CheckBox, this.gc_simplified_model_degree_Sizer]);

            this.GCGroupBoxSizer = this.newHorizontalSizer(6, true, [this.GCGroupBoxSizer1, this.GCGroupBoxSizer2, this.GCGroupBoxSizer3], 12);

            this.GCSettingsSection = this.newSectionBarAddArray(parent, null, "GradientCorrection settings", "GC_Settings_Section",
                                          [ this.GCGroupBoxSizer ], level);
      }

      /*
            MultiscaleGradientCorrection settings
      */
      if (this.global.is_mgc_process) {
            this.mgc_scale_Label = this.newLabel(parent, "Gradient scale", "<p>Gradient model scale.</p>", true);
            this.mgc_scale_ComboBox = this.newComboBox(parent, this.par.mgc_scale, this.mgc_scale_valuestxt, this.mgc_scale_Label.toolTip);
            this.mgs_scale_factor_Edit = this.newNumericEditPrecision(parent, "Scale", this.par.mgc_scale_factor, 0.1, 10, "Scale factor for all channels.", 4);
            this.mgc_strucure_separation_Label = this.newLabel(parent, "Structure separation", "Structure separation for MultiscaleGradientCorrection.", true);
            this.mgc_strucure_separation_SpinBox = this.newSpinBox(parent, this.par.mgc_structure_separation, 1, 5, this.mgc_strucure_separation_Label.toolTip);
            this.mgc_SpectrophotometricFluxCalibration_CheckBox = this.newCheckBox(parent, "SpectrophotometricFluxCalibration", this.par.mgc_SpectrophotometricFluxCalibration, "<p>If checked run SpectrophotometricFluxCalibration before MultiscaleGradientCorrection.</p>");

            this.MGCGroupBoxSizer0 = this.newHorizontalSizer(6, true, [this.mgc_scale_Label, this.mgc_scale_ComboBox, this.mgs_scale_factor_Edit,
                                                                  this.mgc_strucure_separation_Label, this.mgc_strucure_separation_SpinBox,], 12);
            this.MGCGroupBoxSizer1 = this.newHorizontalSizer(6, true, [this.mgc_SpectrophotometricFluxCalibration_CheckBox ], 12);

            this.MGCGroupBoxSizer = this.newVerticalSizer(6, true, [this.MGCGroupBoxSizer0, this.MGCGroupBoxSizer1]);

            this.MGCSettingsSection = this.newSectionBarAddArray(parent, null, "MultiscaleGradientCorrection settings", "MGC_Settings_Section",
                                          [ this.MGCGroupBoxSizer ], level);
      }
      
      /*
            ABE settings
      */
      this.ABEDegreeLabel = this.newLabel(parent, "Function degree", "Function degree can be changed if ABE results are not good enough.", true);
      this.ABEDegreeSpinBox = this.newSpinBox(parent, this.par.ABE_degree, 0, 100, this.ABEDegreeLabel.toolTip);
      this.ABECorrectionLabel = this.newLabel(parent, "Correction", "Correction method for ABE.", true);
      this.ABECorrectionComboBox = this.newComboBox(parent, this.par.ABE_correction, this.ABE_correction_values, this.ABECorrectionLabel.toolTip);

      this.ABEDegreeSizer = this.newHorizontalSizer(0, true, [this.ABEDegreeLabel, this.ABEDegreeSpinBox]);
      this.ABECorrectionSizer = this.newHorizontalSizer(0, true, [this.ABECorrectionLabel, this.ABECorrectionComboBox]);

      this.ABEnormalize_CheckBox = this.newCheckBox(parent, "Normalize", this.par.ABE_normalize, "<p>If checked sets the normalize flag. Normalizing is more likely to keep the original color balance.</p>");

      this.smoothBackgroundEdit = this.newNumericEditPrecision(parent, "| Smoothen background %", this.par.smoothbackground, 0, 100,
            "<p>Gives the limit value as percentage of shadows that is used for shadow " +
            "smoothing. Smoothing is done before gradient correction.</p>" +
            "<p>Usually values below 50 work best. Possible values are between 0 and 100. " +
            "Zero values does not do smoothing.</p>" +
            "<p>Smoothening should be used only in extreme cases with very uneven background " +
            "because a lot of shadow detail may get lost.</p>",
            4);
      this.smoothBackgroundSizer = new HorizontalSizer;
      this.smoothBackgroundSizer.spacing = 4;
      // this.smoothBackgroundSizer.margin = 2;
      this.smoothBackgroundSizer.add( this.smoothBackgroundEdit );
      this.smoothBackgroundSizer.addStretch();

      this.ABEMainSizer = this.newHorizontalSizer(2, true, [this.ABEDegreeSizer, this.ABECorrectionSizer, this.ABEnormalize_CheckBox, this.smoothBackgroundSizer]);

      this.ABESettingsSection = this.newSectionBarAddArray(parent, null, "ABE settings", "ABE_Settings_Section",
                                                [ this.ABEMainSizer ], level);
            
      /*
            DBE settings
      */
      this.dbe_use_background_neutralization_CheckBox = this.newCheckBox(parent, "Background neutralization", this.par.dbe_use_background_neutralization, "<p>If checked background neutralization is run before DBE on color images.</p>");
      this.dbe_use_abe_CheckBox = this.newCheckBox(parent, "ABE", this.par.dbe_use_abe, "<p>If checked ABE with degree one is run before DBE.</p>");
      this.dbe_normalize_CheckBox = this.newCheckBox(parent, "Normalize", this.par.dbe_normalize, "<p>If checked sets the normalize flag. Normalizing is more likely to keep the original color balance.</p>");
      this.dbe_samples_per_row_Label = this.newLabel(parent, "Samples per row/col", "Number of sample points placed for each row and column.", true);
      this.dbe_samples_per_row_SpinBox = this.newSpinBox(parent, this.par.dbe_samples_per_row, 5, 20, this.dbe_samples_per_row_Label.toolTip);
      this.dbe_min_weight_Edit = this.newNumericEdit(parent, "Min weight", this.par.dbe_min_weight, 0, 1, "<p>Minimum sample weight to be included in the samples.");

      this.DBESizer1 = this.newHorizontalSizer(2, true, [this.dbe_use_background_neutralization_CheckBox, this.dbe_use_abe_CheckBox,
                                                    this.dbe_normalize_CheckBox ]);
      this.DBESizer11 = this.newHorizontalSizer(2, true, [this.dbe_samples_per_row_Label, this.dbe_samples_per_row_SpinBox, this.dbe_min_weight_Edit ]);

#ifndef AUTOINTEGRATE_STANDALONE
      this.exclusionAreaImageLabel = this.newLabel(parent, "Image:");
      this.exclusionAreasComboBox = new ComboBox( parent );
      this.exclusionAreasComboBox.minItemCharWidth = 20;
      this.exclusionAreasComboBox.onItemSelected = (itemIndex) =>
      {
            this.exclusionAreasTargetImageName = this.exclusion_area_image_window_list[itemIndex];
      };
#endif

      this.exclusionAreasButton = new PushButton( parent );
      this.exclusionAreasButton.text = "Exclusion areas";
      this.exclusionAreasButton.toolTip = "<p>Select exclusion areas for DBE.</p>";
      this.exclusionAreasButton.onClick = () => {
            try {
                  this.getExclusionAreas();
            } catch (e) {
                  console.criticalln("Exclusion areas: " + e);
            }
      };
      this.exclusionAreaCountLabel = this.newLabel(parent, "Count: " + this.global.exclusion_areas.polygons.length);

#ifdef AUTOINTEGRATE_STANDALONE
      this.DBESizer2 = this.newHorizontalSizer(2, true, [this.exclusionAreasButton, this.exclusionAreaCountLabel ]);
#else
      this.DBESizer2 = this.newHorizontalSizer(2, true, [this.exclusionAreasButton, this.exclusionAreaCountLabel, this.exclusionAreaImageLabel, this.exclusionAreasComboBox ]);
#endif

      this.DBEMainSizer = this.newVerticalSizer(2, true, [ this.DBESizer1, this.DBESizer11, this.DBESizer2 ]);

      this.DBESettingsSection = this.newSectionBarAddArray(parent, null, "DBE settings", "DBE_Settings_Section",
                                          [ this.DBEMainSizer ], level);
      this.DBESettingsSection.control.visible = true;

      /*
            Final sizer.
      */
      var processes = [];
      processes.push(this.GC_commonSettingsSection.section);
      processes.push(this.GC_commonSettingsSection.control);
      if (this.global.is_gc_process) {
            processes.push(this.GCSettingsSection.section);
            processes.push(this.GCSettingsSection.control);
      }
      processes.push(this.ABESettingsSection.section);
      processes.push(this.ABESettingsSection.control);
      processes.push(this.DBESettingsSection.section);
      processes.push(this.DBESettingsSection.control);
      if (this.global.is_mgc_process) {
            processes.push(this.MGCSettingsSection.section);
            processes.push(this.MGCSettingsSection.control);
      }

      this.GCSizer = this.newVerticalSizer(0, true, processes);

      return this.GCSizer;
}

createGraXpertGradientCorrectionSizer(parent)
{
      if (this.global.debug) console.writeln("AutoIntegrateGUITools::createGraXpertGradientCorrectionSizer");

      this.graxpertCorrectionLabel = this.newLabel(parent, "Gradient correction", "Correction method for GraXpert.", true);
      this.graxpertCorrectionComboBox = this.newComboBox(parent, this.par.graxpert_correction, this.graxpert_correction_values, this.graxpertCorrectionLabel.toolTip);
      this.graxpertSmoothingEdit = this.newNumericEdit(parent, "Smoothing", this.par.graxpert_smoothing, 0, 1, "Smoothing for GraXpert gradient correction.");
      this.graxpertGradientCorrectionSizer1 = this.newHorizontalSizer(2, true, [this.graxpertCorrectionLabel, this.graxpertCorrectionComboBox, this.graxpertSmoothingEdit]);

#ifdef AUTOINTEGRATE_STANDALONE
      this.GraXpertPathSizer = this.createGraXpertPathSizer(parent)
      this.graxpertGradientCorrectionSizer = this.newVerticalSizer(2, true, [this.graxpertGradientCorrectionSizer1, this.GraXpertPathSizer]);
      this.graxpertSettingsSection = this.newSectionBarAddArray(parent, null, "GraXpert settings", "GraXpert_Settings_Section",
                                                [ this.graxpertGradientCorrectionSizer ]);
      return this.graxpertSettingsSection;
#else
      this.graxpertGradientCorrectionLabel = this.newSectionLabel(parent, "Gradient correction settings");
      this.graxpertGradientCorrectionSizer = this.newVerticalSizer(2, true, [this.graxpertGradientCorrectionLabel, this.graxpertGradientCorrectionSizer1]);
      return this.graxpertGradientCorrectionSizer;
#endif
     
}
 
/* Function
this.newVerticalSizer = newVerticalSizer;
this.newHorizontalSizer = newHorizontalSizer;
this.newCheckBox = newCheckBox;
this.newCheckBoxEx = newCheckBoxEx;
this.newPparCheckBox = newPparCheckBox;
this.newGroupBox = newGroupBox;
this.newSectionLabel = newSectionLabel;
this.newLabel = newLabel;
this.newTextEdit = newTextEdit;
this.newPparTextEdit = newPparTextEdit;
this.newNumericEdit = newNumericEdit;
this.newNumericEditPrecision = newNumericEditPrecision;
this.newRGBNBNumericEdit = newRGBNBNumericEdit;
this.newNumericControl2 = newNumericControl2;
this.newNumericControl3 = newNumericControl3;
this.newSpinBox = newSpinBox;
this.newPparSpinBox = newPparSpinBox;
this.newComboBox = newComboBox;
this.newComboBoxIndex = newComboBoxIndex;
this.addArrayToComboBox = addArrayToComboBox;
this.newComboBoxStrvalsToInt = newComboBoxStrvalsToInt;
this.newComboBoxpalette = newComboBoxpalette;
this.newPushOrToolButton = newPushOrToolButton;
this.newGroupBoxSizer = newGroupBoxSizer;
this.newSectionBarAdd = newSectionBarAdd;
this.newSectionBarAddArray = newSectionBarAddArray;
this.getSectionVisible = getSectionVisible;

this.createImageToolsControl = createImageToolsControl;
this.createGraXpertPathSizer = createGraXpertPathSizer;
this.createStrechingChoiceSizer = createStrechingChoiceSizer;
this.createStretchingSettingsSizer = createStretchingSettingsSizer;
this.createClippedSizer = createClippedSizer;
this.createNarrowbandCustomPaletteSizer = createNarrowbandCustomPaletteSizer;
this.newJsonSizerObj = newJsonSizerObj;
this.createGradientCorrectionChoiceSizer = createGradientCorrectionChoiceSizer;
this.createGradientCorrectionSizer = createGradientCorrectionSizer;
this.createGraXpertGradientCorrectionSizer = createGraXpertGradientCorrectionSizer;
this.getExclusionAreas = getExclusionAreas;
*/

}
#endif // AUTOINTEGRATEGUITOOLS_JS
