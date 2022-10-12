/* 

Linear Defect Detection from LinearDefectDetection.js script.

    Slightly modifies by Jarmo Ruuth for AutoIntegrate script.

   Copyright (c) 2019 Vicent Peris (OAUV). All Rights Reserved.

   Redistribution and use in both source and binary forms, with or without
   modification, is permitted provided that the following conditions are met:
   
   1. All redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
   
   2. All redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.
   
   3. Neither the names "PixInsight" and "Pleiades Astrophoto", nor the names
      of their contributors, may be used to endorse or promote products derived
      from this software without specific prior written permission. For written
      permission, please contact info@pixinsight.com.
  
   4. All products derived from this software, in any form whatsoever, must
      reproduce the following acknowledgment in the end-user documentation
      and/or other materials provided with the product:
  
      "This product is based on software from the PixInsight project, developed
      by Pleiades Astrophoto and its contributors (https://pixinsight.com/)."
   
      Alternatively, if that is where third-party acknowledgments normally
      appear, this acknowledgment must be reproduced in the product itself.
  
   THIS SOFTWARE IS PROVIDED BY PLEIADES ASTROPHOTO AND ITS CONTRIBUTORS
   "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED
   TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
   PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL PLEIADES ASTROPHOTO OR ITS
   CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
   EXEMPLARY OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, BUSINESS
   INTERRUPTION; PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; AND LOSS OF USE,
   DATA OR PROFITS) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
   CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
   ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
   POSSIBILITY OF SUCH DAMAGE.

   This product is based on software from the PixInsight project, developed
   by Pleiades Astrophoto and its contributors (https://pixinsight.com/).

*/

function LDDEngine( win, detectColumns, detectPartialLines,
    layersToRemove, rejectionLimit, imageShift,
    detectionThreshold, partialLineDetectionThreshold )
{
    console.writeln("LDDEngine");
    let WI = new DefineWindowsAndImages( win, detectPartialLines );

    // Generate the small-scale image by subtracting
    // the large-scale components of the image.
    MultiscaleIsolation( WI.referenceSSImage, null, layersToRemove );

    // Build a list of lines in the image.
    // This can include entire or partial rows or columns.
    if ( layersToRemove < 7 )
    layersToRemove = 7;
    let partialLines;
    if ( detectPartialLines )
        partialLines = new PartialLineDetection( detectColumns, WI.referenceImageCopy,
                    layersToRemove - 3, imageShift,
                    partialLineDetectionThreshold );

    let maxPixelPara, maxPixelPerp;
    if ( detectColumns )
    {
        maxPixelPara = WI.referenceImage.height - 1;
        maxPixelPerp = WI.referenceImage.width - 1;
    }
    else
    {
        maxPixelPara = WI.referenceImage.width - 1;
        maxPixelPerp = WI.referenceImage.height - 1;
    }

    let lines;
    if ( detectPartialLines )
        lines = new LineList( true,
                        partialLines.columnOrRow,
                        partialLines.startPixel,
                        partialLines.endPixel,
                        maxPixelPara, maxPixelPerp );
    else
        lines = new LineList( true, [], [], [], maxPixelPara, maxPixelPerp );

    // Calculate the median value of each line in the image.
    // Create a model image with the lines filled
    // by their respective median values.
    console.writeln( "<end><cbr><br>Analyzing " + lines.columnOrRow.length + " lines in the image<br>" );
    let lineValues = new Array;
    for ( let i = 0; i < lines.columnOrRow.length; ++i )
    {
        let lineRect;
        if ( detectColumns )
        {
            lineRect = new Rect( 1, lines.endPixel[i] - lines.startPixel[i] + 1 );
            lineRect.moveTo( lines.columnOrRow[i], lines.startPixel[i] );
        }
        else
        {
            lineRect = new Rect( lines.endPixel[i] - lines.startPixel[i] + 1, 1 );
            lineRect.moveTo( lines.startPixel[i], lines.columnOrRow[i] );
        }

        let lineStatistics = new IterativeStatistics( WI.referenceSSImage, lineRect, rejectionLimit );
        WI.lineModelImage.selectedRect = lineRect;
        WI.lineModelImage.apply( lineStatistics.median );
        lineValues.push( lineStatistics.median );
    }
    WI.referenceSSImage.resetSelections();
    WI.lineModelImage.resetSelections();

    // Build the detection map image
    // and the list of detected line defects.
    this.detectedColumnOrRow = new Array;
    this.detectedStartPixel = new Array;
    this.detectedEndPixel = new Array;
    let lineModelMedian = WI.lineModelImage.median();
    let lineModelMAD = WI.lineModelImage.MAD();
    let lineRect;
    for ( let i = 0; i < lineValues.length; ++i )
    {
        if ( detectColumns )
        {
            lineRect = new Rect( 1, lines.endPixel[i] - lines.startPixel[i] + 1 );
            lineRect.moveTo( lines.columnOrRow[i], lines.startPixel[i] );
        }
        else
        {
            lineRect = new Rect( lines.endPixel[i] - lines.startPixel[i] + 1, 1 );
            lineRect.moveTo( lines.startPixel[i], lines.columnOrRow[i] );
        }

        WI.lineDetectionImage.selectedRect = lineRect;
        let sigma = Math.abs( lineValues[i] - lineModelMedian ) / ( lineModelMAD * 1.4826 );
        WI.lineDetectionImage.apply( parseInt( sigma ) / ( detectionThreshold + 1 ) );
        if ( sigma >= detectionThreshold )
        {
            this.detectedColumnOrRow.push( lines.columnOrRow[i] );
            this.detectedStartPixel.push( lines.startPixel[i] );
            this.detectedEndPixel.push( lines.endPixel[i] );
        }
    }

    // Transfer the resulting images to their respective windows.
    WI.lineDetectionImage.resetSelections();
    WI.lineDetectionImage.truncate( 0, 1 );
    WI.lineModelImage.apply( WI.referenceImage.median(), ImageOp_Add );

    WI.lineModelWindow.mainView.beginProcess();
    WI.lineModelWindow.mainView.image.apply( WI.lineModelImage );
    WI.lineModelWindow.mainView.endProcess();

    WI.lineDetectionWindow.mainView.beginProcess();
    WI.lineDetectionWindow.mainView.image.apply( WI.lineDetectionImage );
    WI.lineDetectionWindow.mainView.endProcess();

    // Free memory space taken by working images.
    WI.referenceImage.free();
    WI.referenceSSImage.free();
    WI.lineModelImage.free();
    WI.lineDetectionImage.free();
    if ( detectPartialLines )
        WI.referenceImageCopy.free();
    util.closeOneWindow(WI.lineModelWindow.mainView.id);
    util.closeOneWindow(WI.lineDetectionWindow.mainView.id);
    util.closeOneWindow("partial_line_detection");
}

// ----------------------------------------------------------------------------

/*
* Function to subtract the large-scale components from an image using the
* median wavelet transform.
*/
function MultiscaleIsolation( image, LSImage, layersToRemove )
{
    // Generate the large-scale components image.
    // First we generate the array that defines
    // the states (enabled / disabled) of the scale layers.
    let scales = new Array;
    for ( let i = 0; i < layersToRemove; ++i )
        scales.push( 1 );

    // The scale layers are an array of images.
    // We use the medianWaveletTransform. This algorithm is less prone
    // to show vertical patterns in the large-scale components.
    let multiscaleTransform = new Array;
    multiscaleTransform = image.medianWaveletTransform( layersToRemove-1, 0, scales );
    // We subtract the last layer to the image.
    // Please note that this image has negative pixel values.
    image.apply( multiscaleTransform[layersToRemove-1], ImageOp_Sub );
    // Generate a large-scale component image
    // if the respective input image is not null.
    if ( LSImage != null )
        LSImage.apply( multiscaleTransform[layersToRemove-1] );
    // Remove the multiscale layers from memory.
    for ( let i = 0; i < multiscaleTransform.length; ++i )
        multiscaleTransform[i].free();
}

/*
* Function to create a list of vertical or horizontal lines in an image. It
* can combine entire rows or columns and fragmented ones, if an array of
* partial sections is specified in the input par. This list is used to
* input the selected regions in the IterativeStatistics function.
*/
function LineList( correctEntireImage, partialColumnOrRow, partialStartPixel, partialEndPixel, maxPixelPara, maxPixelPerp )
{
    this.columnOrRow = new Array;
    this.startPixel = new Array;
    this.endPixel = new Array;

    if ( !correctEntireImage )
    {
        this.columnOrRow = partialColumnOrRow;
        this.startPixel = partialStartPixel;
        this.endPixel = partialEndPixel;
    }
    else
    {
        if ( partialColumnOrRow.length == 0 )
        partialColumnOrRow.push( maxPixelPerp + 1 );

        let iPartial = 0;
        for ( let i = 0; i <= maxPixelPerp; ++i )
        {
            if ( iPartial < partialColumnOrRow.length )
            {
                if ( i < partialColumnOrRow[iPartial] && correctEntireImage )
                {
                    this.columnOrRow.push( i );
                    this.startPixel.push( 0 );
                    this.endPixel.push( maxPixelPara );
                }
                else
                {
                    // Get the partial column or row.
                    this.columnOrRow.push( partialColumnOrRow[iPartial] );
                    this.startPixel.push( partialStartPixel[iPartial] );
                    this.endPixel.push( partialEndPixel[iPartial] );
                    if ( partialStartPixel[iPartial] > 0 )
                    {
                        this.columnOrRow.push( partialColumnOrRow[iPartial] );
                        this.startPixel.push( 0 );
                        this.endPixel.push( partialStartPixel[iPartial] - 1 );
                    }
                    if ( partialEndPixel[iPartial] < maxPixelPara )
                    {
                        this.columnOrRow.push( partialColumnOrRow[iPartial] );
                        this.startPixel.push( partialEndPixel[iPartial] + 1 );
                        this.endPixel.push( maxPixelPara );
                    }
                    // In some cases, there can be more than one section of
                    // the same column or row in the partial defect list.
                    // In that case, i (which is the current column or row number)
                    // shouldn't increase because we are repeating
                    // the same column or row.
                    i = partialColumnOrRow[iPartial];
                    ++iPartial;
                }
            }
            else if ( correctEntireImage )
            {
                this.columnOrRow.push( i );
                this.startPixel.push( 0 );
                this.endPixel.push( maxPixelPara );
            }
        }
    }
}

/*
* Function to calculate the median and MAD of a selected image area with
* iterative outlier rejection in the high end of the distribution. Useful to
* reject bright objects in a background-dominated image, especially if the
* input image is the output image of MultiscaleIsolation.
*/
function IterativeStatistics( image, rectangle, rejectionLimit )
{
    image.selectedRect = rectangle;
    let formerHighRejectionLimit = 1000;
    // The initial currentHighRejectionLimit value is set to 0.99 because
    // the global rejection sets the rejected pixels to 1. This way, those
    // pixels are already rejected in the first iteration.
    let currentHighRejectionLimit = 0.99;
    let j = 0;
    while ( formerHighRejectionLimit / currentHighRejectionLimit > 1.001 || j < 10 )
    {
        // Construct the statistics object to rectangle statistics.
        // These statistics are updated with the new high rejection limit
        // calculated at the end of the iteration.
        let iterativeRectangleStatistics = new ImageStatistics;
        let irs =  iterativeRectangleStatistics 
        {
            irs.medianEnabled = true;
            irs.lowRejectionEnabled = false;
            irs.highRejectionEnabled = true;
            irs.rejectionHigh = currentHighRejectionLimit;
        }
        iterativeRectangleStatistics.generate( image );
        this.median = iterativeRectangleStatistics.median;
        this.MAD = iterativeRectangleStatistics.mad;
        formerHighRejectionLimit = currentHighRejectionLimit;
        currentHighRejectionLimit = parseFloat( this.median + ( iterativeRectangleStatistics.mad * 1.4826 * rejectionLimit ) );
        ++j;
    }
    image.resetSelections();
}

/*
* Function to detect defective partial columns or rows in an image.
*/
function PartialLineDetection( detectColumns, image, layersToRemove, imageShift, threshold )
{
    if ( ( detectColumns ? image.height : image.width ) < imageShift * 4 )
        throw new Error( "imageShift parameter too high for the current image size" );


    // Create a small-scale component image and its image window.
    // SSImage will be the main view of the small-scale component
    // image window because we need to apply a
    // MorphologicalTransformation instance to it.
    this.SSImageWindow = new ImageWindow( image.width,
                image.height,
                image.numberOfChannels,
                32, true, false,
                "partial_line_detection" );

    // The initial small-scale component image is the input image.
    this.SSImage = new Image( image.width,
                        image.height,
                        image.numberOfChannels,
                        image.colorSpace,
                        image.bitsPerSample,
                        SampleType_Real );

    this.SSImage.apply( image );

    // Subtract the large-scale components to the image.
    console.noteln( "<end><cbr><br>* Isolating small-scale image components..." );
    console.flush();
    MultiscaleIsolation( this.SSImage, null, layersToRemove );

    // The clipping mask is an image to reject the highlights
    // of the processed small-scale component image. The initial
    // state of this image is the small-scale component image
    // after removing the large-scale components. We simply
    // binarize this image at 5 sigmas above the image median.
    // This way, the bright structures are white and the rest
    // of the image is pure black. We'll use this image
    // at the end of the processing.
    let clippingMask = new Image( image.width,
                            image.height,
                            image.numberOfChannels,
                            image.colorSpace,
                            image.bitsPerSample,
                            SampleType_Real );

    clippingMask.apply( this.SSImage );
    clippingMask.binarize( clippingMask.MAD() * 5 );

    // Apply a morphological transformation process
    // to the small-scale component image.
    // The structuring element is a line in the direction
    // of the lines to be detected.
    console.noteln( "<end><cbr><br>* Processing small-scale component image..." );
    console.flush();
    let structure;
    if ( detectColumns )
        structure =
        [[
        0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0
        ]];
    else
        structure =
        [[
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
        1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
        ]];

    console.writeln( "<end><cbr>Applying morphological median transformation..." );
    console.flush();
    for ( let i = 0; i < 5; ++i )
        this.SSImage.morphologicalTransformation( 4, structure, 0, 0, 1 );

    // Shift a clone of the small-scale component image
    // after the morphological transformation. We then subtract
    // the shifted image from its parent image. In the resulting
    // image, those linear structures with a sudden change
    // of contrast over the column or row will result in a bright
    // line at the origin of the defect. This lets us
    // to detect the defective partial columns or rows.
    let shiftedSSImage = new Image( image.width,
        image.height,
        image.numberOfChannels,
        image.colorSpace,
        32, SampleType_Real );

    shiftedSSImage.apply( this.SSImage );
    detectColumns ? shiftedSSImage.shiftBy( 0, -imageShift )
    : shiftedSSImage.shiftBy( imageShift, 0 );
    this.SSImage.apply( shiftedSSImage, ImageOp_Sub );
    shiftedSSImage.free();

    // Subtract again the large-scale components
    // of this processed small-scale component image.
    // This will give a cleaner result before binarizing.
    console.writeln( "<end><cbr>Isolating small-scale image components..." );
    console.flush();
    MultiscaleIsolation( this.SSImage, null, layersToRemove - 3 );

    // Binarize the image to isolate the partial line detection structures.
    console.writeln( "<end><cbr>Isolating partial line defects..." );
    console.flush();
    let imageMedian = this.SSImage.median();
    let imageMAD = this.SSImage.MAD();
    this.SSImage.binarize( imageMedian + imageMAD*threshold );
    // Now, we subtract the binarized the clipping mask from this processed
    // small-scale component image. This removes the surviving linear structures
    // coming from bright objects in the image.
    this.SSImage.apply( clippingMask, ImageOp_Sub );
    this.SSImage.truncate( 0, 1 );

    // We apply a closure operation with the same structuring element.
    // This process removes short surviving lines coming from
    // the image noise while keeping the long ones
    console.writeln( "<end><cbr>Applying morphological closure transformation..." );
    console.flush();
    this.SSImage.morphologicalTransformation( 2, structure, 0, 0, 1 );

    // Detect the defective partial rows or columns. We select
    // those columns or rows having a minimum number of white pixels.
    // The minimum is half of the image shift and it is calculated
    // by comparing the mean pixel value to the length of the line.
    // Then, we find the maximum position to set the origin of the defect.
    // The maximum position is the start of the white line but the origin
    // of the defect is the end of the white line. To solve this,
    // we first mirror the image.
    console.noteln( "<end><cbr><br>* Detecting partial line defects..." );
    console.flush();
    let maxPixelPerp, maxPixelPara, lineRect;
    if ( detectColumns )
    {
        this.SSImage.mirrorVertical();
        maxPixelPerp = this.SSImage.width - 1;
        maxPixelPara = this.SSImage.height - 1;
        lineRect = new Rect( 1, this.SSImage.height );
    }
    else
    {
        this.SSImage.mirrorHorizontal();
        maxPixelPerp = this.SSImage.height - 1;
        maxPixelPara = this.SSImage.width - 1;
        lineRect = new Rect( this.SSImage.width, 1 );
    }

    this.columnOrRow = new Array;
    this.startPixel = new Array;
    this.endPixel = new Array;
    for ( let i = 0; i <= maxPixelPerp; ++i )
    {
        detectColumns ? lineRect.moveTo( i, 0 )
        : lineRect.moveTo( 0, i );

        var lineMeanPixelValue = this.SSImage.mean( lineRect );
        // The equation at right sets the minimum length of the line
        // to trigger a defect detection.
        if ( lineMeanPixelValue > ( imageShift / ( ( maxPixelPara + 1 - imageShift * 2 ) * 2 ) ) )
        {
            this.columnOrRow.push( i )
            detectColumns  ? this.startPixel.push( maxPixelPara - parseInt( this.SSImage.maximumPosition( lineRect ).toArray()[1] ) )
            : this.startPixel.push( maxPixelPara - parseInt( this.SSImage.maximumPosition( lineRect ).toArray()[0] ) );
            this.endPixel.push( maxPixelPara );
        }
    }

    detectColumns ? this.SSImage.mirrorVertical() : this.SSImage.mirrorHorizontal();

    this.SSImageWindow.mainView.beginProcess();
    this.SSImageWindow.mainView.image.apply( this.SSImage );
    this.SSImageWindow.mainView.endProcess();
    this.SSImageWindow.show();
}

/*
* These are the image windows and images that will be used by the script
* engine.
*/
function DefineWindowsAndImages( win, detectPartialLines )
{
    // Define the working image windows and images.
    this.referenceImageWindow = win;

    this.referenceImage = new Image( this.referenceImageWindow.mainView.image.width,
            this.referenceImageWindow.mainView.image.height,
            this.referenceImageWindow.mainView.image.numberOfChannels,
            this.referenceImageWindow.mainView.image.colorSpace,
            32, SampleType_Real );

    this.referenceImage.apply( this.referenceImageWindow.mainView.image );

    if ( detectPartialLines )
    {
        this.referenceImageCopy = new Image( this.referenceImageWindow.mainView.image.width,
                this.referenceImageWindow.mainView.image.height,
                this.referenceImageWindow.mainView.image.numberOfChannels,
                this.referenceImageWindow.mainView.image.colorSpace,
                32, SampleType_Real );

        this.referenceImageCopy.apply( this.referenceImageWindow.mainView.image );
    }

    this.referenceSSImage = new Image( this.referenceImage.width,
            this.referenceImage.height,
            this.referenceImage.numberOfChannels,
            this.referenceImage.colorSpace,
            32, SampleType_Real );

    this.referenceSSImage.apply( this.referenceImage );

    this.lineModelWindow = new ImageWindow( this.referenceImage.width,
                this.referenceImage.height,
                this.referenceImage.numberOfChannels,
                32, true, false, "line_model" );

    this.lineModelImage = new Image( this.referenceImage.width,
            this.referenceImage.height,
            this.referenceImage.numberOfChannels,
            this.referenceImage.colorSpace,
            32, SampleType_Real );

    this.lineDetectionWindow = new ImageWindow( this.referenceImage.width,
                    this.referenceImage.height,
                    this.referenceImage.numberOfChannels,
                    32, true, false, "line_detection" );

    this.lineDetectionImage = new Image( this.referenceImage.width,
                this.referenceImage.height,
                this.referenceImage.numberOfChannels,
                this.referenceImage.colorSpace,
                32, SampleType_Real );
}

/*
* LDDOutput the list of detected lines to console and text file.
*/
function LDDOutput( detectColumns, detectedLines, threshold, outputDir )
{
    console.writeln( "LDDOutput" );
    var defects = [];
    if ( detectedLines.detectedColumnOrRow.length > 0 )
    {
        console.noteln( "Detected lines" );
        console.noteln(  "--------------" );
        for ( let i = 0; i < detectedLines.detectedColumnOrRow.length; ++i )
        {
            var oneDefect = 
            [ 
                true,                                     // defectEnabled
                !detectColumns,                           // defectIsRow
                detectedLines.detectedColumnOrRow[i],     // defectAddress
                true,                                     // defectIsRange
                detectedLines.detectedStartPixel[i],      // defectBegin
                detectedLines.detectedEndPixel[i]         // defectEnd
            ];
            if (i == 0) {
                console.noteln(  oneDefect );
            }
            defects[defects.length] = oneDefect;
            console.noteln( "detectColumns=" + detectColumns + " " +
            detectedLines.detectedColumnOrRow[i] + " " +
            detectedLines.detectedStartPixel[i] + " " +
            detectedLines.detectedEndPixel[i] );
        }
        console.noteln( "Detected defect lines: " + detectedLines.detectedColumnOrRow.length );
    }
    else
    {
        console.warningln( "No defect was detected. Try lowering the threshold value." );
    }
    return defects;
}

