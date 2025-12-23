/*

    AutoIntegrate image enhancements module. Previously called extra processing.

*/

#ifndef NO_SOLVER_LIBRARY
#include "../AdP/SearchCoordinatesDialog.js"
#endif

#include "AutoIntegrateExclusionArea.js"
#include "AutoIntegrateMetricsVisualizer.js"
#include "AutoIntegrateTutorial.js"

function AutoIntegrateSelectStarsImageDialog( util )
{
      this.__base__ = Dialog;
      this.__base__();
      this.restyle();
   
      this.labelWidth = this.font.width( "Object identifier:M" );
      this.editWidth = this.font.width( 'M' )*40;

      this.starsImageLabel = new Label( this );
      this.starsImageLabel.text = "Select stars image:"
   
      this.starsImageComboBox = new ComboBox( this );
      this.starsImageComboBox.minItemCharWidth = 20;

      this.window_list = util.getWindowListReverse();
      if (this.window_list.length == 0) {
            this.name = "";
      } else {
            this.name = this.window_list[0];
            for (var i = 0; i < this.window_list.length; i++) {
                  this.starsImageComboBox.addItem( this.window_list[i] );
            }
      }

      this.starsImageComboBox.onItemSelected = function( itemIndex )
      {
            this.dialog.name = this.dialog.window_list[itemIndex];
      };

      // Common Buttons
      this.ok_Button = new PushButton( this );
      this.ok_Button.text = "OK";
      this.ok_Button.icon = this.scaledResource( ":/icons/ok.png" );
      this.ok_Button.onClick = function()
      {
            this.dialog.ok();
      };

      this.cancel_Button = new PushButton( this );
      this.cancel_Button.text = "Cancel";
      this.cancel_Button.icon = this.scaledResource( ":/icons/cancel.png" );
      this.cancel_Button.onClick = function()
      {
            this.dialog.cancel();
      };

      this.buttons_Sizer = new HorizontalSizer;
      this.buttons_Sizer.spacing = 6;
      this.buttons_Sizer.addStretch();
      this.buttons_Sizer.add( this.ok_Button );
      this.buttons_Sizer.add( this.cancel_Button );

      this.sizer = new VerticalSizer;
      this.sizer.margin = 6;
      this.sizer.spacing = 4;
      this.sizer.add( this.starsImageLabel );
      this.sizer.add( this.starsImageComboBox );
      this.sizer.add( this.buttons_Sizer );
   
      this.windowTitle = "Select stars image";
      this.adjustToContents();
      this.setFixedSize();
}

AutoIntegrateSelectStarsImageDialog.prototype = new Dialog;

function AutoIntegrateHueColors(par)
{
      this.__base__ = Frame;
      this.__base__();
   
      this.hueColorsBitmap = new Bitmap( File.extractDrive( #__FILE__ ) + File.extractDirectory( #__FILE__ ) + "/hue.png" );

      function drawHueLine(g, bmp_startpos, bmp_width, bmp_height, hue)
      {
            // console.writeln("drawHueLine " + hue + " " + bmp_startpos + " " + bmp_width + " " + bmp_height);
            var line_x = bmp_startpos + hue * bmp_width;
            g.drawLine(line_x, 0, line_x, bmp_height);
      }

      this.onPaint = function(x0, y0, x1, y1) {
            // console.writeln("AutoIntegrateHueColors onPaint");
            var width = this.width;
            var height = this.height;
            var pos = 23;
            var bmp_width = (100 - pos) * width / 100;
            var bmp_startpos = pos * width / 100;

            var bmp = this.hueColorsBitmap.scaledTo(bmp_width, height);

            var graphics = new Graphics(this);
            graphics.drawBitmap(bmp_startpos, 0, bmp);
            graphics.pen = new Pen(0xFFFFFFFF,0);      // white
            drawHueLine(graphics, bmp_startpos, bmp_width, height, par.narrowband_colorized_R_hue.val);
            drawHueLine(graphics, bmp_startpos, bmp_width, height, par.narrowband_colorized_G_hue.val);
            drawHueLine(graphics, bmp_startpos, bmp_width, height, par.narrowband_colorized_B_hue.val);
            graphics.end();
      }
}

AutoIntegrateHueColors.prototype = new Frame;
