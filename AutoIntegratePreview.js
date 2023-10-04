/***************************************************************************
 * 
 *    AutoIntegrateMaxPreviewDialog
 * 
 * Show image preview in max size view.,
 * 
 */
function AutoIntegrateMaxPreviewDialog(par, imgWin, image, txt)
{
      this.__base__ = Dialog;
      this.__base__();
      this.restyle();

      if (this.availableScreenRect != undefined) {
            var screen_width = this.availableScreenRect.width;
            var screen_height = this.availableScreenRect.height;
       } else {
            console.criticalln("AutoIntegrateMaxPreviewDialog: availableScreenRect is undefined, using Full HD (1920x1080) as default");
            var screen_width = 1920;
            var screen_height = 1080;
       }

       var preview_width = parseInt(screen_width - screen_width / 10);
       var preview_height = parseInt(screen_height - screen_height / 10);

       console.writeln("AutoIntegrateMaxPreviewDialog: screen_width ", screen_width, ", screen_height ", screen_height + ", preview_width ", preview_width, ", preview_height ", preview_height);

      this.maxPreviewControl = new AutoIntegratePreviewControl(this, par, preview_width, preview_height, false, true);

      this.maxPreviewControl.SetImage(imgWin, image, txt);
   
      this.sizer = new VerticalSizer;
      this.sizer.margin = 6;
      this.sizer.spacing = 4;
      this.sizer.add( this.maxPreviewControl );
   
      this.windowTitle = "Max preview";
      this.adjustToContents();
      this.setFixedSize();
}

AutoIntegrateMaxPreviewDialog.prototype = new Dialog;

/***************************************************************************
 * 
 *    AutoIntegratePreviewControl
 * 
 * Slightly modified by Jarmo Ruuth for AutoIntegrate script.
 * 
 * Copyright (C) 2013, Andres del Pozo
 * 
 * This product is based on software from the PixInsight project, developed
 * by Pleiades Astrophoto and its contributors (https://pixinsight.com/).
 */
function AutoIntegratePreviewControl(parentDialog, par, size_x, size_y, is_histogram, disable_max_preview)
{
       this.__base__ = Frame;
       this.__base__(parentDialog);

       this.maxPreview = !disable_max_preview;

       // Set image window and bitmap
       this.SetImage = function(imgWin, image, txt)
       {
             //console.writeln("SetImage");
             this.image = image;
             this.imgWin = imgWin;
             this.metadata = image;
             this.scaledImage = null;
             this.SetZoomOutLimit();
             this.UpdateZoom(-100);
             if (txt) {
                  this.image_name_Label.text = txt;
             } else if (imgWin != null) {
                  this.image_name_Label.text = imgWin.mainView.fullId;
            } else {
                  this.image_name_Label.text = "";
            }
      }
 
       // Update image window and bitmap
       this.UpdateImage = function(imgWin, image, txt)
       {
             //console.writeln("UpdateImage");
             if (this.zoom == this.zoomOutLimit) {
                   this.SetImage(imgWin, image, txt);
             } else {
                   this.image = image;
                   this.imgWin = imgWin;
                   this.metadata = image;
                   this.scaledImage = null;
                   this.SetZoomOutLimit();
                   this.UpdateZoom(this.zoom);
                   if (txt) {
                        this.image_name_Label.text = txt;
                   } else if (imgWin != null) {
                        this.image_name_Label.text = imgWin.mainView.fullId;
                  } else {
                        this.image_name_Label.text = "";
                  }
            }
       }
 
       this.UpdateZoom = function (newZoom, refPoint)
       {
             if (newZoom < this.zoomOutLimit) {
                   newZoom = this.zoomOutLimit;
             } else if (newZoom >= 1) {
                   newZoom = 1;
             }
             if (newZoom == this.zoom && this.scaledImage) {
                   return;
             }
 
             if(refPoint==null) {
                   refPoint=new Point(this.scrollbox.viewport.width/2, this.scrollbox.viewport.height/2);
             }
             var imgx=null;
             if(this.scrollbox.maxHorizontalScrollPosition>0 || this.zoom == this.zoomOutLimit) {
                   imgx=(refPoint.x+this.scrollbox.horizontalScrollPosition)/this.scale;
             }
             // imgx and imgy are in this.image coordinates (i.e. 1:1 scale)
             var imgy=null;
             if(this.scrollbox.maxVerticalScrollPosition>0 || this.zoom == this.zoomOutLimit) {
                   imgy=(refPoint.y+this.scrollbox.verticalScrollPosition)/this.scale;
             }
 
             this.zoom = newZoom;
             this.scale = this.zoom;
             this.scaledImage = null;
             if (!is_histogram) {
                  if (this.zoom >= 1) {
                        this.zoomVal_Label.text = "1:1";
                  } else {
                        this.zoomVal_Label.text = format("1:%d", Math.ceil(1 / this.zoom));
                  }
            }
             if (this.image) {
                   if (this.zoom > this.zoomOutLimit) {
                         this.scaledImage = this.image.scaled(this.scale);
                   } else {
                         this.scaledImage = this.image.scaled(0.98 * this.scale);
                   }
             } else {
                   this.scaledImage = {width:this.metadata.width * this.scale, height:this.metadata.height * this.scale};
             }
             this.scrollbox.maxHorizontalScrollPosition = Math.max(0, this.scaledImage.width - this.scrollbox.viewport.width);
             this.scrollbox.maxVerticalScrollPosition = Math.max(0, this.scaledImage.height - this.scrollbox.viewport.height);
 
             if(this.scrollbox.maxHorizontalScrollPosition>0 && imgx!=null) {
                   this.scrollbox.horizontalScrollPosition = (imgx*this.scale)-refPoint.x;
             }
             if(this.scrollbox.maxVerticalScrollPosition>0 && imgy!=null) {
                   this.scrollbox.verticalScrollPosition = (imgy*this.scale)-refPoint.y;
             }
 
             this.scrollbox.viewport.update();
       }
 
       if (!is_histogram) {
            this.zoomIn_Button = new ToolButton( this );
            this.zoomIn_Button.icon = this.scaledResource( ":/icons/zoom-in.png" );
            this.zoomIn_Button.setScaledFixedSize( 20, 20 );
            this.zoomIn_Button.toolTip = "Zoom in";
            this.zoomIn_Button.onMousePress = function()
            {
                  this.parent.UpdateZoom(this.parent.zoom + this.parent.zoomOutLimit);
            };
      
            this.zoomOut_Button = new ToolButton( this );
            this.zoomOut_Button.icon = this.scaledResource( ":/icons/zoom-out.png" );
            this.zoomOut_Button.setScaledFixedSize( 20, 20 );
            this.zoomOut_Button.toolTip = "Zoom out";
            this.zoomOut_Button.onMousePress = function()
            {
                  this.parent.UpdateZoom(this.parent.zoom - this.parent.zoomOutLimit);
            };
      
            this.zoom11_Button = new ToolButton( this );
            this.zoom11_Button.icon = this.scaledResource( ":/icons/zoom-1-1.png" );
            this.zoom11_Button.setScaledFixedSize( 20, 20 );
            this.zoom11_Button.toolTip = "Zoom 1:1";
            this.zoom11_Button.onMousePress = function()
            {
                  this.parent.UpdateZoom(1);
            };
      
            this.zoomFit_Button = new ToolButton( this );
            this.zoomFit_Button.icon = this.scaledResource( ":/icons/zoom.png" );
            this.zoomFit_Button.setScaledFixedSize( 20, 20 );
            this.zoomFit_Button.toolTip = "Zoom fit";
            this.zoomFit_Button.onMousePress = function()
            {
                  this.parent.UpdateZoom(-100);
            };

            if (this.maxPreview) {
                  this.maxPreview_Button = new ToolButton( this );
                  this.maxPreview_Button.icon = this.scaledResource( ":/real-time-preview/full-view.png" );
                  this.maxPreview_Button.setScaledFixedSize( 20, 20 );
                  this.maxPreview_Button.toolTip = "Open a new dialog to view the image in (almost) full screen size.";
                  this.maxPreview_Button.onMousePress = function()
                  {
                        let maxPreviewDialog = new AutoIntegrateMaxPreviewDialog(par, this.parent.imgWin, this.parent.image, this.parent.image_name_Label.text);
                        maxPreviewDialog.execute();
                        gc(false);
                  };
            }
            this.image_name_Label = new Label( this );
            this.image_name_Label.text = "";
            this.image_name_Label.textAlignment = TextAlign_Right | TextAlign_VertCenter;

            this.buttons_Sizer = new HorizontalSizer;
            this.buttons_Sizer.add( this.zoomIn_Button );
            this.buttons_Sizer.add( this.zoomOut_Button );
            this.buttons_Sizer.add( this.zoom11_Button );
            this.buttons_Sizer.add( this.zoomFit_Button );
            if (this.maxPreview) {
                  this.buttons_Sizer.addSpacing( 12 );
                  this.buttons_Sizer.add( this.maxPreview_Button );
            }
            this.buttons_Sizer.addStretch();
            this.buttons_Sizer.addSpacing( 12 );
            this.buttons_Sizer.add( this.image_name_Label );
       } 
       this.zoom = 1;
       this.scale = 1;
       this.zoomOutLimit = -100;
       this.scrollbox = new ScrollBox(this);
       this.scrollbox.autoScroll = true;
       this.scrollbox.tracking = true;
       this.scrollbox.cursor = new Cursor(StdCursor_Arrow);
 
       this.scroll_Sizer = new HorizontalSizer;
       this.scroll_Sizer.add( this.scrollbox );
 
       this.SetZoomOutLimit = function()
       {
             var scaleX = this.scrollbox.viewport.width/this.metadata.width;
             var scaleY = this.scrollbox.viewport.height/this.metadata.height;
             var scale = Math.min(scaleX,scaleY);
             this.zoomOutLimit = scale;
             //console.writeln("scale ", scale, ", this.zoomOutLimit ", this.zoomOutLimit);
       }
 
       this.scrollbox.onHorizontalScrollPosUpdated = function (newPos)
       {
             this.viewport.update();
       }
       this.scrollbox.onVerticalScrollPosUpdated = function (newPos)
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
             this.heigth = h;
       }
 
       this.scrollbox.viewport.onMouseWheel = function (x, y, delta, buttonState, modifiers)
       {
             var preview = this.parent.parent;
             preview.UpdateZoom(preview.zoom + (delta > 0 ? preview.zoomOutLimit : -preview.zoomOutLimit), new Point(x,y));
       }
 
       this.scrollbox.viewport.onMousePress = function ( x, y, button, buttonState, modifiers )
       {
             var preview = this.parent.parent;
             var p =  preview.transform(x, y, preview);
             if(preview.onCustomMouseDown)
             {
                   preview.onCustomMouseDown.call(this, p.x, p.y, button, buttonState, modifiers )
             }
       }
 
       this.scrollbox.viewport.onMouseMove = function ( x, y, buttonState, modifiers )
       {
             var preview = this.parent.parent;
             var p =  preview.transform(x, y, preview);
             if (!is_histogram) {
                  var val = Math.floor(p.x);
                  if (val < 0) {
                        val = 0;
                  } else if (val >= preview.metadata.width) {
                        val = preview.metadata.width - 1;
                  }
                  preview.Xval_Label.text = val.toString();
                  var val = Math.floor(p.y);
                  if (val < 0) {
                        val = 0;
                  } else if (val >= preview.metadata.height) {
                        val = preview.metadata.height - 1;
                  }
                  preview.Yval_Label.text = val.toString();
                  try {
                        var val = preview.imgWin.mainView.image.sample(Math.floor(p.x), Math.floor(p.y));
                        preview.SampleVal_Label.text = val.toFixed(5);
                  } catch(err) {
                  }
            }
             if(preview.onCustomMouseMove)
             {
                   preview.onCustomMouseMove.call(this, p.x, p.y, buttonState, modifiers )
             }
       }
 
       this.scrollbox.viewport.onMouseRelease = function (x, y, button, buttonState, modifiers)
       {
             var preview = this.parent.parent;
 
             var p =  preview.transform(x, y, preview);

             if (preview.zoom == 1) {
                  preview.coordinatesEdit.text = Math.floor(p.x).toString() + "," + Math.floor(p.y).toString();
             }

             if(preview.onCustomMouseUp)
             {
                   preview.onCustomMouseUp.call(this, p.x, p.y, button, buttonState, modifiers )
             }
       }
 
       this.scrollbox.viewport.onResize = function (wNew, hNew, wOld, hOld)
       {
             var preview = this.parent.parent;
             if(preview.metadata && preview.scaledImage != null)
             {
                   this.parent.maxHorizontalScrollPosition = Math.max(0, preview.scaledImage.width - wNew);
                   this.parent.maxVerticalScrollPosition = Math.max(0, preview.scaledImage.height - hNew);
                   preview.SetZoomOutLimit();
                   preview.UpdateZoom(preview.zoom);
             }
             this.update();
       }
 
       this.scrollbox.viewport.onPaint = function (x0, y0, x1, y1)
       {
             var preview = this.parent.parent;
             var graphics = new VectorGraphics(this);
 
             graphics.fillRect(x0,y0, x1, y1, new Brush(0xff202020));
             if (preview.scaledImage != null) {
                   var offsetX = this.parent.maxHorizontalScrollPosition>0 ? -this.parent.horizontalScrollPosition : (this.width-preview.scaledImage.width)/2;
                   var offsetY = this.parent.maxVerticalScrollPosition>0 ? -this.parent.verticalScrollPosition: (this.height-preview.scaledImage.height)/2;
                   graphics.translateTransformation(offsetX, offsetY);
                   if(preview.image)
                         graphics.drawBitmap(0, 0, preview.scaledImage);
                   else
                         graphics.fillRect(0, 0, preview.scaledImage.width, preview.scaledImage.height, new Brush(0xff000000));
                   graphics.pen = new Pen(0xffffffff,0);
                   graphics.drawRect(-1, -1, preview.scaledImage.width + 1, preview.scaledImage.height + 1);
             }
 
             if(preview.onCustomPaint)
             {
                   graphics.antialiasing = true;
                   graphics.scaleTransformation(preview.scale,preview.scale);
                   preview.onCustomPaint.call(this, graphics, x0, y0, x1, y1);
             }
             graphics.end();
       }
 
       this.transform = function(x, y, preview)
       {
             var scrollbox = preview.scrollbox;
             var ox = 0;
             var oy = 0;
             ox = scrollbox.maxHorizontalScrollPosition>0 ? -scrollbox.horizontalScrollPosition : (scrollbox.viewport.width-preview.scaledImage.width)/2;
             oy = scrollbox.maxVerticalScrollPosition>0 ? -scrollbox.verticalScrollPosition: (scrollbox.viewport.height-preview.scaledImage.height)/2;
             var coordPx = new Point((x - ox) / preview.scale, (y - oy) / preview.scale);
             return new Point(coordPx.x, coordPx.y);
       }
 
       this.center = function()
       {
             var preview = this;
             var scrollbox = preview.scrollbox;
             var x = scrollbox.viewport.width / 2;
             var y = scrollbox.viewport.height / 2;
             var p =  this.transform(x, y, preview);
             return p;
       }

       if (is_histogram) {
            this.histLabel =new Label(this);
            this.histLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
            this.histLabel.text = "Histogram";
       } else {
            this.zoomLabel_Label =new Label(this);
            this.zoomLabel_Label.textAlignment = TextAlign_Left|TextAlign_VertCenter;
            this.zoomLabel_Label.text = "Zoom:";
            this.zoomVal_Label =new Label(this);
            this.zoomVal_Label.textAlignment = TextAlign_Left|TextAlign_VertCenter;
            this.zoomVal_Label.text = "1:1";
      
            this.Xlabel_Label = new Label(this);
            this.Xlabel_Label.textAlignment = TextAlign_Left|TextAlign_VertCenter;
            this.Xlabel_Label .text = "X:";
            this.Xval_Label = new Label(this);
            this.Xval_Label.textAlignment = TextAlign_Left|TextAlign_VertCenter;
            this.Xval_Label.text = "---";
            this.Ylabel_Label = new Label(this);
            this.Ylabel_Label.textAlignment = TextAlign_Left|TextAlign_VertCenter;
            this.Ylabel_Label.text = "Y:";
            this.Yval_Label = new Label(this);
            this.Yval_Label.textAlignment = TextAlign_Left|TextAlign_VertCenter;
            this.Yval_Label.text = "---";
            this.SampleLabel_Label = new Label(this);
            this.SampleLabel_Label.textAlignment = TextAlign_Left|TextAlign_VertCenter;
            this.SampleLabel_Label.text = "Val:";
            this.SampleVal_Label = new Label(this);
            this.SampleVal_Label.textAlignment = TextAlign_Left|TextAlign_VertCenter;
            this.SampleVal_Label.text = "---";

            if (this.maxPreview) {
                  this.coordinatesLabel = new Label(this);
                  this.coordinatesLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
                  this.coordinatesLabel.text = "X,Y:";
                  this.coordinatesLabel.toolTip = "Zoom to 1:1 view and click left mouse button to fill coordinates to the coordinates box.";
                  this.coordinatesEdit = new Edit(this);
                  this.coordinatesEdit.toolTip = "Zoom to 1:1 view and click left mouse button to fill coordinates to the coordinates box.";
                  
                  this.coordinatesCopyFirstButton = new ToolButton( this );
                  this.coordinatesCopyFirstButton.icon = parentDialog.scaledResource( ":/icons/left.png" );
                  this.coordinatesCopyFirstButton.onClick = function () {
                        var preview = this.parent.parent;
                        if (preview.coordinatesEdit.text != "") {
                              parentDialog.cometAlignFirstXY.text = preview.coordinatesEdit.text;
                              par.comet_first_xy.val = preview.coordinatesEdit.text;
                        }
                  };
                  this.coordinatesCopyFirstButton.toolTip = "Copy coordinates to comet first image X₀,Y₀ coordinates.";

                  this.coordinatesCopyLastButton = new ToolButton( this );
                  this.coordinatesCopyLastButton.icon = parentDialog.scaledResource( ":/icons/right.png" );
                  this.coordinatesCopyLastButton.onClick = function () {
                        var preview = this.parent.parent;
                        if (preview.coordinatesEdit.text != "") {
                              parentDialog.cometAlignLastXY.text = preview.coordinatesEdit.text;
                              par.comet_last_xy.val = preview.coordinatesEdit.text;
                        }
                  };
                  this.coordinatesCopyLastButton.toolTip = "Copy coordinates to comet last image X₁,Y₁ coordinates.";
            }
      } 
      this.coords_Frame = new Frame(this);
      this.coords_Frame.backgroundColor = 0xffffffff;
      this.coords_Frame.sizer = new HorizontalSizer;
      this.coords_Frame.sizer.margin = 2;
      this.coords_Frame.sizer.spacing = 4;
      if (is_histogram) {
            this.coords_Frame.sizer.add(this.histLabel);
      } else {
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
            if (this.maxPreview) {
                  this.coords_Frame.sizer.addStretch();
                  this.coords_Frame.sizer.add(this.coordinatesLabel);
                  this.coords_Frame.sizer.add(this.coordinatesEdit);
                  this.coords_Frame.sizer.add(this.coordinatesCopyFirstButton);
                  this.coords_Frame.sizer.add(this.coordinatesCopyLastButton);
            }
       }
       this.coords_Frame.sizer.addStretch();
       this.sizer = new VerticalSizer;
       if (!is_histogram) {
            this.sizer.add(this.buttons_Sizer);
       }
       this.sizer.add(this.scroll_Sizer);
       this.sizer.add(this.coords_Frame);
 
       var width_overhead = this.scrollbox.viewport.width;
       var heigth_overhead = this.scrollbox.viewport.height;
 
       this.setScaledMinSize(size_x + width_overhead + 6, size_y + heigth_overhead + 6);
}
 
AutoIntegratePreviewControl.prototype = new Frame;
