//
// GUI utility functions for AutoIntegrate script
//

function AutoIntegrateGUITools( parent, global, util )
{

if (global.debug) console.writeln("AutoIntegrateGUITools");

this.__base__ = Object;
this.__base__();

this.starless_and_stars_combine_values = [ 'Add', 'Screen', 'Lighten' ];

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
                              "<p>Pixels with value 0 are shown as black, pixels with value 1 are shown as white. Other pixels are shown as gray.</p>";


function newVerticalSizer(margin, add_stretch, items)
{
      var sizer = new VerticalSizer;
      sizer.textAlignment = TextAlign_Left | TextAlign_VertCenter;
      if (margin > 0) {
            sizer.margin = margin;
      }
      sizer.spacing = 4;
      for (var i = 0; i < items.length; i++) {
            sizer.add(items[i]);
      }
      if (add_stretch) {
            sizer.addStretch();
      }
      return sizer;
}

function newHorizontalSizer(margin, add_stretch, items, spacing)
{
      var sizer = new HorizontalSizer;
      sizer.textAlignment = TextAlign_Left | TextAlign_VertCenter;
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

 function newCheckBoxEx( parent, checkboxText, param, toolTip, onClick, updatedCallback = null)
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
             cb.onClick = function(checked) { 
                  cb.aiParam.val = checked;
                  if (updatedCallback != null) {
                        updatedCallback();
                  }
             }
       }
       if ( typeof toolTip !== 'undefined' && toolTip != null ) {
             cb.toolTip = util.formatToolTip(toolTip);
       }
 
       cb.aiParam.reset = function() {
             cb.checked = cb.aiParam.val;
       };
 
       return cb;
 }
 
 function newCheckBox( parent, checkboxText, param, toolTip, updatedCallback = null)
 {
       return newCheckBoxEx(parent, checkboxText, param, toolTip, null, updatedCallback);
 }
 function newGenericCheckBox( parent, checkboxText, param, val, toolTip, onClick )
 {
       var cb = new CheckBox( parent );
       cb.aiParam = param;
       cb.text = checkboxText;
       cb.checked = val;
       cb.onClick = onClick;
       cb.toolTip = util.formatToolTip(toolTip);
 
       return cb;
 }
 
function newGroupBox( parent, title, toolTip )
{
      var gb = new GroupBox( parent );
      if ( typeof title !== 'undefined' && title != null ) { 
            gb.title = title; 
      }
      if ( typeof toolTip !== 'undefined' && toolTip != null ) { 
            gb.toolTip = util.formatToolTip(toolTip);
      }

      return gb;
}

function newSectionLabel(parent, text)
{
      var lbl = new Label( parent );
      lbl.useRichText = true;
      lbl.text = '<p style="color:SlateBlue"><b>' + text + "</b></p>";

      return lbl;
}

function newLabel(parent, text, tip, align_left)
{
      var lbl = new Label( parent );
      lbl.text = text;
      if (align_left) {
            lbl.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      } else {
            lbl.textAlignment = TextAlign_Right|TextAlign_VertCenter;
      }
      if (tip != null) {
            lbl.toolTip = util.formatToolTip(tip);
      }

      return lbl;
}

function newTextEdit(parent, param, tooltip)
{
      var edt = new Edit( parent );
      edt.aiParam = param;
      edt.onTextUpdated = function(value) { 
            edt.aiParam.val = value; 
      };
      edt.text = edt.aiParam.val;
      edt.toolTip = util.formatToolTip(tooltip);
      edt.aiParam.reset = function() {
            edt.text = edt.aiParam.val;
      };
      return edt;
}

function newGenericTextEdit(parent, param, val, tooltip, onTextUpdated)
{
      var edt = new Edit( parent );
      edt.aiParam = param;
      edt.onTextUpdated = onTextUpdated;
      edt.text = val;
      edt.toolTip = util.formatToolTip(tooltip);
      return edt;
}

function newNumericEditPrecision(parent, txt, param, min, max, tooltip, precision, updatedCallback = null)
{
      var edt = new NumericEdit( parent );
      edt.label.text = txt;
      edt.label.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      edt.real = true;
      edt.edit.setFixedWidth( 6 * parent.font.width( "0" ) );
      edt.aiParam = param;
      edt.onValueUpdated = function(value) { 
            edt.aiParam.val = value; 
      };
      edt.setPrecision( precision );
      edt.setRange(min, max);
      edt.setValue(edt.aiParam.val);
      edt.toolTip = util.formatToolTip(tooltip);
      edt.aiParam.reset = function() {
            edt.setValue(edt.aiParam.val);
            if (updatedCallback != null) {
                  updatedCallback();
            }
      };
      edt.textAlignment = TextAlign_Left|TextAlign_VertCenter;
      return edt;
}

function newNumericEdit(parent, txt, param, min, max, tooltip)
{
      return newNumericEditPrecision(parent, txt, param, min, max, tooltip, 2)
}

function newRGBNBNumericEdit(parent, txt, param, tooltip)
{
      return newNumericEdit(parent, txt, param, 0.1, 999, tooltip);
}

function newNumericControlEx(parent, txt, param, prec, min, max, tooltip, updatedCallback)
{
      var edt = new NumericControl( parent );
      edt.label.text = txt;
      edt.setRange(min, max);
      if (prec == 3) {
            edt.setPrecision(3);
            edt.slider.setRange(0.0, 1000.0);
      } else {
            edt.setPrecision(2);
            edt.slider.setRange(0.0, 100.0);
      }
      edt.aiParam = param;
      edt.setValue(edt.aiParam.val);
      edt.onValueUpdated = function(value) { 
            edt.aiParam.val = value;
            // console.writeln("NumericControl " + txt + " " + value);
            if (updatedCallback != null) {
                  // console.writeln("NumericControl " + txt + " callback");
                  updatedCallback();
            }
      };
      edt.toolTip = util.formatToolTip(tooltip);
      edt.aiParam.reset = function() {
            edt.setValue(edt.aiParam.val);
            if (updatedCallback != null) {
                  updatedCallback();
            }
      };
      return edt;
}

function newNumericControl2(parent, txt, param, min, max, tooltip, updatedCallback)
{
      return newNumericControlEx(parent, txt, param, 2, min, max, tooltip, updatedCallback)
}

function newNumericControl3(parent, txt, param, min, max, tooltip, updatedCallback)
{
      return newNumericControlEx(parent, txt, param, 3, min, max, tooltip, updatedCallback)
}

function newSpinBox(parent, param, min, max, tooltip)
{
      var edt = new SpinBox( parent );
      edt.minValue = min;
      edt.maxValue = max;
      edt.aiParam = param;
      edt.value = edt.aiParam.val;
      edt.toolTip = util.formatToolTip(tooltip);
      edt.onValueUpdated = function( value )
      {
            edt.aiParam.val = value;
      };

      edt.aiParam.reset = function() {
            edt.value = edt.aiParam.val;
      };

      return edt;
}

function newGenericSpinBox(parent, param, val, min, max, tooltip, onValueUpdated)
{
      var edt = new SpinBox( parent );
      edt.minValue = min;
      edt.maxValue = max;
      edt.aiParam = param;
      edt.value = val;
      edt.toolTip = util.formatToolTip(tooltip);
      edt.onValueUpdated = onValueUpdated;

      return edt;
}

function addArrayToComboBox(cb, arr)
{
      for (var i = 0; i < arr.length; i++) {
            cb.addItem( arr[i] );
      }
}

function newComboBox(parent, param, valarray, tooltip, updatedCallback = null)
{
      var cb = new ComboBox( parent );
      cb.toolTip = util.formatToolTip(tooltip);
      addArrayToComboBox(cb, valarray);
      cb.aiParam = param;
      cb.aiValarray = valarray;
      cb.currentItem = valarray.indexOf(cb.aiParam.val);
      cb.onItemSelected = function( itemIndex ) {
            cb.aiParam.val = cb.aiValarray[itemIndex];
            if (updatedCallback != null) {
                  updatedCallback();
            }
      };

      cb.aiParam.reset = function() {
            cb.currentItem = cb.aiValarray.indexOf(cb.aiParam.val);
      }
      
      return cb;
}

function newComboBoxIndex(parent, param, valarray, tooltip)
{
      var cb = new ComboBox( parent );
      cb.toolTip = util.formatToolTip(tooltip);
      cb.aiParam = param;
      cb.aiValarray = valarray;
      addArrayToComboBox(cb, cb.aiValarray);
      cb.currentItem = cb.aiParam.val;
      cb.onItemSelected = function( itemIndex ) {
            cb.aiParam.val = itemIndex;
      };

      cb.aiParam.reset = function() {
            cb.currentItem = cb.aiParam.val;
      }
      
      return cb;
}

function newComboBoxStrvalsToInt(parent, param, valarray, tooltip)
{
      var cb = new ComboBox( parent );
      cb.toolTip = util.formatToolTip(tooltip);
      cb.aiParam = param;
      cb.aiValarray = valarray;
      addArrayToComboBox(cb, cb.aiValarray);
      cb.currentItem = valarray.indexOf(cb.aiParam.val.toString());
      cb.onItemSelected = function( itemIndex ) {
            cb.aiParam.val = parseInt(cb.aiValarray[itemIndex]);
      };

      cb.aiParam.reset = function() {
            cb.currentItem = cb.aiValarray.indexOf(cb.aiParam.val.toString());
      }
      
      return cb;
}

function newComboBoxpalette(parent, param, valarray, tooltip)
{
      var cb = new ComboBox( parent );
      cb.enabled = true;
      cb.editEnabled = true;
      cb.aiParam = param;
      cb.aiValarray = valarray;
      addArrayToComboBox(cb, cb.aiValarray);
      cb.toolTip = util.formatToolTip(tooltip);
      cb.onEditTextUpdated = function() { 
            cb.aiParam.val = cb.editText.trim(); 
      };
      cb.aiParam.reset = function() {
            cb.editText = cb.aiParam.val;
      }
      return cb;
}

function newPushOrToolButton(parent, icon, txt, tooltip, action, toolbutton)
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
      button.toolTip = util.formatToolTip(tooltip);

      return button;
}

function newGroupBoxSizer(parent)
{
      var gb = new newGroupBox( parent );
      gb.sizer = new VerticalSizer;
      gb.sizer.margin = 4;
      gb.sizer.spacing = 4;

      return gb;
}

function getSectionVisible(name, control)
{
      if (global.do_not_read_settings) {
            return;
      }
      var tempSetting = Settings.read(name, DataType_Boolean);
      if (Settings.lastReadOK) {
            // console.writeln("AutoIntegrate: read from settings " + name + "=" + tempSetting);
            control.visible = tempSetting;
      }
}

function newSectionBarAdd(parent, groupbox, control, title, name)
{
      var sb = new SectionBar(parent, title);
      sb.setSection(control);
      sb.onToggleSection = function(bar, beginToggle) {
            if (!global.do_not_write_settings) {
                  Settings.write(name, DataType_Boolean, control.visible);
            }
            parent.adjustToContents();
      };
      sb.aiControl = control;
      sb.aiName = name;
      parent.rootingArr.push(sb);

      getSectionVisible(name, control);

      groupbox.sizer.add( sb );
      groupbox.sizer.add( control );

      global.sectionBarControls.push(control);
      global.sectionBars.push(sb);
}

function newSectionBarAddArray(parent, groupbox, title, name, objarray)
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

      parent.rootingArr.push(ProcessingControl);

      newSectionBarAdd(parent, groupbox, ProcessingControl, title, name);
}

this.newVerticalSizer = newVerticalSizer;
this.newHorizontalSizer = newHorizontalSizer;
this.newCheckBox = newCheckBox;
this.newCheckBoxEx = newCheckBoxEx;
this.newGenericCheckBox = newGenericCheckBox;
this.newGroupBox = newGroupBox;
this.newSectionLabel = newSectionLabel;
this.newLabel = newLabel;
this.newTextEdit = newTextEdit;
this.newGenericTextEdit = newGenericTextEdit;
this.newNumericEdit = newNumericEdit;
this.newNumericEditPrecision = newNumericEditPrecision;
this.newRGBNBNumericEdit = newRGBNBNumericEdit;
this.newNumericControl2 = newNumericControl2;
this.newNumericControl3 = newNumericControl3;
this.newSpinBox = newSpinBox;
this.newGenericSpinBox = newGenericSpinBox;
this.newComboBox = newComboBox;
this.newComboBoxIndex = newComboBoxIndex;
this.addArrayToComboBox = addArrayToComboBox;
this.newComboBoxStrvalsToInt = newComboBoxStrvalsToInt;
this.newComboBoxpalette = newComboBoxpalette;
this.newPushOrToolButton = newPushOrToolButton;
this.newGroupBoxSizer = newGroupBoxSizer;
this.newSectionBarAdd = newSectionBarAdd;
this.newSectionBarAddArray = newSectionBarAddArray;

}

AutoIntegrateGUITools.prototype = new Object;
