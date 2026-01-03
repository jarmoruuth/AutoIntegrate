// ****************************************************************************
// VeraLux Preview Control
// Simplified preview control for VeraLux HyperMetric Stretch
//
// Based on AutoIntegratePreviewControl
// Adapted by Jarmo Ruuth (2025)
// Original preview code Copyright (C) 2013, Andres del Pozo
// ****************************************************************************

#include <pjsr/StdCursor.jsh>
#include <pjsr/UndoFlag.jsh>

function BasicPreviewControl(parentDialog, name, size_x, size_y)
{
   this.__base__ = Frame;
   this.__base__(parentDialog);

   this.name = name;
   var self = this;

   // Set image window and bitmap
   this.SetImage = function(image, txt)
   {
      console.writeln(this.name + ": SetImage - " + image.width + "x" + image.height);
      if (this.image) {
         this.image.free();
      }
      this.image = new Image(image);
      this.bitmap = this.image.render();
      this.scaledBitmap = null;
      this.SetZoomOutLimit();
      this.UpdateZoom(-100);
      if (txt) {
         this.image_name_Label.text = txt;
      } else {
         this.image_name_Label.text = "";
      }
   }

   // Update image window and bitmap
   this.UpdateImage = function(image, txt)
   {
      console.writeln(this.name + ": UpdateImage - " + image.width + "x" + image.height);
      if (this.zoom == this.zoomOutLimit) {
         this.SetImage(image, txt);
      } else {
         if (this.image) {
            this.image.free();
         }
         this.image = new Image(image);
         this.bitmap = this.image.render();
         this.scaledBitmap = null;
         var newZoom = (this.zoom == this.zoomOutLimit) ? -100 : this.zoom;
         this.SetZoomOutLimit();
         this.UpdateZoom(newZoom);
         if (txt) {
            this.image_name_Label.text = txt;
         } else {
            this.image_name_Label.text = "";
         }
      }
   }

   this.UpdateZoom = function(newZoom, refPoint)
   {
      if (!this.bitmap && !this.image) {
         return;
      }
      if (newZoom < this.zoomOutLimit) {
         newZoom = this.zoomOutLimit;
      } else if (newZoom >= 1) {
         newZoom = 1;
      }

      if (newZoom == this.zoom && this.scaledBitmap) {
         return;
      }

      if (refPoint == null) {
         refPoint = new Point(this.scrollbox.viewport.width / 2, this.scrollbox.viewport.height / 2);
      }

      var imgx = null;
      if (this.scrollbox.maxHorizontalScrollPosition > 0 || this.zoom == this.zoomOutLimit) {
         imgx = (refPoint.x + this.scrollbox.horizontalScrollPosition) / this.scale;
      }

      var imgy = null;
      if (this.scrollbox.maxVerticalScrollPosition > 0 || this.zoom == this.zoomOutLimit) {
         imgy = (refPoint.y + this.scrollbox.verticalScrollPosition) / this.scale;
      }

      this.zoom = newZoom;
      this.scale = this.zoom;
      this.scaledBitmap = null;

      if (this.zoom >= 1) {
         this.zoomVal_Label.text = "1:1";
      } else {
         this.zoomVal_Label.text = format("1:%d", Math.ceil(1 / this.zoom));
      }

      if (this.bitmap) {
         if (this.zoom > this.zoomOutLimit) {
            this.scaledBitmap = this.bitmap.scaled(this.scale);
         } else {
            this.scaledBitmap = this.bitmap.scaled(0.98 * this.scale);
         }
      } else {
         this.scaledBitmap = {width: this.image.width * this.scale, height: this.image.height * this.scale};
      }

      this.scrollbox.maxHorizontalScrollPosition = Math.max(0, this.scaledBitmap.width - this.scrollbox.viewport.width);
      this.scrollbox.maxVerticalScrollPosition = Math.max(0, this.scaledBitmap.height - this.scrollbox.viewport.height);

      if (this.scrollbox.maxHorizontalScrollPosition > 0 && imgx != null) {
         this.scrollbox.horizontalScrollPosition = (imgx * this.scale) - refPoint.x;
      }
      if (this.scrollbox.maxVerticalScrollPosition > 0 && imgy != null) {
         this.scrollbox.verticalScrollPosition = (imgy * this.scale) - refPoint.y;
      }

      this.scrollbox.viewport.update();
   }

   // Zoom buttons
   this.zoomIn_Button = new ToolButton(this);
   this.zoomIn_Button.icon = this.scaledResource(":/icons/zoom-in.png");
   this.zoomIn_Button.setScaledFixedSize(20, 20);
   this.zoomIn_Button.toolTip = "Zoom in";
   this.zoomIn_Button.onClick = function() {
      self.UpdateZoom(self.zoom + self.zoomOutLimit);
   };

   this.zoomOut_Button = new ToolButton(this);
   this.zoomOut_Button.icon = this.scaledResource(":/icons/zoom-out.png");
   this.zoomOut_Button.setScaledFixedSize(20, 20);
   this.zoomOut_Button.toolTip = "Zoom out";
   this.zoomOut_Button.onClick = function() {
      self.UpdateZoom(self.zoom - self.zoomOutLimit);
   };

   this.zoom11_Button = new ToolButton(this);
   this.zoom11_Button.icon = this.scaledResource(":/icons/zoom-1-1.png");
   this.zoom11_Button.setScaledFixedSize(20, 20);
   this.zoom11_Button.toolTip = "Zoom 1:1";
   this.zoom11_Button.onClick = function() {
      self.UpdateZoom(1);
   };

   this.zoomFit_Button = new ToolButton(this);
   this.zoomFit_Button.icon = this.scaledResource(":/icons/zoom.png");
   this.zoomFit_Button.setScaledFixedSize(20, 20);
   this.zoomFit_Button.toolTip = "Zoom fit";
   this.zoomFit_Button.onClick = function() {
      self.UpdateZoom(-100);
   };

   this.image_name_Label = new Label(this);
   this.image_name_Label.text = "";
   this.image_name_Label.textAlignment = TextAlign_Right | TextAlign_VertCenter;

   this.buttons_Sizer = new HorizontalSizer;
   this.buttons_Sizer.add(this.zoomIn_Button);
   this.buttons_Sizer.add(this.zoomOut_Button);
   this.buttons_Sizer.add(this.zoom11_Button);
   this.buttons_Sizer.add(this.zoomFit_Button);
   this.buttons_Sizer.addStretch();
   this.buttons_Sizer.addSpacing(12);
   this.buttons_Sizer.add(this.image_name_Label);

   this.zoom = 1;
   this.scale = 1;
   this.zoomOutLimit = -100;
   this.scrollbox = new ScrollBox(this);
   this.scrollbox.autoScroll = true;
   this.scrollbox.tracking = true;
   this.scrollbox.cursor = new Cursor(StdCursor_Arrow);

   this.scroll_Sizer = new HorizontalSizer;
   this.scroll_Sizer.add(this.scrollbox);

   this.SetZoomOutLimit = function()
   {
      var scaleX = this.scrollbox.viewport.width / this.image.width;
      var scaleY = this.scrollbox.viewport.height / this.image.height;
      var scale = Math.min(scaleX, scaleY);
      this.zoomOutLimit = scale;
   }

   this.scrollbox.onHorizontalScrollPosUpdated = function(newPos)
   {
      this.viewport.update();
   }

   this.scrollbox.onVerticalScrollPosUpdated = function(newPos)
   {
      this.viewport.update();
   }

   this.forceRedraw = function()
   {
      this.scrollbox.viewport.update();
   };

   this.setSize = function(w, h)
   {
      this.setScaledMinSize(w, h);
      this.width = w;
      this.height = h;
   }

   this.scrollbox.viewport.onMouseWheel = function(x, y, delta, buttonState, modifiers)
   {
      var preview = this.parent.parent;
      preview.UpdateZoom(preview.zoom + (delta > 0 ? preview.zoomOutLimit : -preview.zoomOutLimit), new Point(x, y));
   }

   this.scrollbox.viewport.onMouseMove = function(x, y, buttonState, modifiers)
   {
      var preview = this.parent.parent;

      if (!preview.image) {
         return;
      }

      var p = preview.transform(x, y, preview);

      var xval = Math.floor(p.x);
      if (xval < 0) {
         xval = 0;
      } else if (xval >= preview.image.width) {
         xval = preview.image.width - 1;
      }
      preview.Xval_Label.text = xval.toString();

      var yval = Math.floor(p.y);
      if (yval < 0) {
         yval = 0;
      } else if (yval >= preview.image.height) {
         yval = preview.image.height - 1;
      }
      preview.Yval_Label.text = yval.toString();

      try {
         var val = preview.image.sample(Math.floor(p.x), Math.floor(p.y));
         preview.SampleVal_Label.text = val.toFixed(5);
      } catch(err) {
      }
   }

   this.scrollbox.viewport.onResize = function(wNew, hNew, wOld, hOld)
   {
      var preview = this.parent.parent;
      if (preview.image && preview.scaledBitmap != null) {
         this.parent.maxHorizontalScrollPosition = Math.max(0, preview.scaledBitmap.width - wNew);
         this.parent.maxVerticalScrollPosition = Math.max(0, preview.scaledBitmap.height - hNew);
         var newZoom = (preview.zoom == preview.zoomOutLimit) ? -100 : preview.zoom;
         preview.SetZoomOutLimit();
         preview.UpdateZoom(newZoom);
      }
      this.update();
   }

   this.scrollbox.viewport.onPaint = function(x0, y0, x1, y1)
   {
      var preview = this.parent.parent;
      var graphics = new VectorGraphics(this);
      
      // Background
      var background_color = 0xff202020; // dark grey
      var border_color = 0xffffffff;     // white

      graphics.fillRect(x0, y0, x1, y1, new Brush(background_color));
      
      if (preview.scaledBitmap != null) {
         var offsetX = this.parent.maxHorizontalScrollPosition > 0 ? 
            -this.parent.horizontalScrollPosition : 
            (this.width - preview.scaledBitmap.width) / 2;
         var offsetY = this.parent.maxVerticalScrollPosition > 0 ? 
            -this.parent.verticalScrollPosition : 
            (this.height - preview.scaledBitmap.height) / 2;
         
         graphics.translateTransformation(offsetX, offsetY);
         
         if (preview.bitmap) {
            graphics.drawBitmap(0, 0, preview.scaledBitmap);
         } else {
            graphics.fillRect(0, 0, preview.scaledBitmap.width, preview.scaledBitmap.height, new Brush(0xff000000));
         }
         
         graphics.pen = new Pen(border_color, 0);
         graphics.drawRect(-1, -1, preview.scaledBitmap.width + 1, preview.scaledBitmap.height + 1);
      }
      
      graphics.end();
   }

   this.transform = function(x, y, preview)
   {
      if (!preview.scaledBitmap) {
         return new Point(x, y);
      }
      
      var scrollbox = preview.scrollbox;
      var ox = scrollbox.maxHorizontalScrollPosition > 0 ? 
         -scrollbox.horizontalScrollPosition : 
         (scrollbox.viewport.width - preview.scaledBitmap.width) / 2;
      var oy = scrollbox.maxVerticalScrollPosition > 0 ? 
         -scrollbox.verticalScrollPosition : 
         (scrollbox.viewport.height - preview.scaledBitmap.height) / 2;
      
      var coordPx = new Point((x - ox) / preview.scale, (y - oy) / preview.scale);
      return new Point(coordPx.x, coordPx.y);
   }

   // Coordinate labels
   this.zoomLabel_Label = new Label(this);
   this.zoomLabel_Label.textAlignment = TextAlign_Left | TextAlign_VertCenter;
   this.zoomLabel_Label.text = "Zoom:";
   
   this.zoomVal_Label = new Label(this);
   this.zoomVal_Label.textAlignment = TextAlign_Left | TextAlign_VertCenter;
   this.zoomVal_Label.text = "1:1";

   this.Xlabel_Label = new Label(this);
   this.Xlabel_Label.textAlignment = TextAlign_Left | TextAlign_VertCenter;
   this.Xlabel_Label.text = "X:";
   
   this.Xval_Label = new Label(this);
   this.Xval_Label.textAlignment = TextAlign_Left | TextAlign_VertCenter;
   this.Xval_Label.text = "---";
   
   this.Ylabel_Label = new Label(this);
   this.Ylabel_Label.textAlignment = TextAlign_Left | TextAlign_VertCenter;
   this.Ylabel_Label.text = "Y:";
   
   this.Yval_Label = new Label(this);
   this.Yval_Label.textAlignment = TextAlign_Left | TextAlign_VertCenter;
   this.Yval_Label.text = "---";
   
   this.SampleLabel_Label = new Label(this);
   this.SampleLabel_Label.textAlignment = TextAlign_Left | TextAlign_VertCenter;
   this.SampleLabel_Label.text = "Val:";
   
   this.SampleVal_Label = new Label(this);
   this.SampleVal_Label.textAlignment = TextAlign_Left | TextAlign_VertCenter;
   this.SampleVal_Label.text = "---";

   this.coords_Frame = new Frame(this);
   this.coords_Frame.backgroundColor = 0xffffffff;
   this.coords_Frame.sizer = new HorizontalSizer;
   this.coords_Frame.sizer.margin = 2;
   this.coords_Frame.sizer.spacing = 4;
   this.coords_Frame.sizer.add(this.zoomLabel_Label);
   this.coords_Frame.sizer.add(this.zoomVal_Label);
   this.coords_Frame.sizer.addSpacing(6);
   this.coords_Frame.sizer.add(this.Xlabel_Label);
   this.coords_Frame.sizer.add(this.Xval_Label);
   this.coords_Frame.sizer.addSpacing(6);
   this.coords_Frame.sizer.add(this.Ylabel_Label);
   this.coords_Frame.sizer.add(this.Yval_Label);
   this.coords_Frame.sizer.addSpacing(6);
   this.coords_Frame.sizer.add(this.SampleLabel_Label);
   this.coords_Frame.sizer.add(this.SampleVal_Label);
   this.coords_Frame.sizer.addStretch();

   this.sizer = new VerticalSizer;
   this.sizer.add(this.buttons_Sizer);
   this.sizer.add(this.scroll_Sizer);
   this.sizer.add(this.coords_Frame);

   this.setScaledMinSize(size_x, size_y);
}

BasicPreviewControl.prototype = new Frame;
