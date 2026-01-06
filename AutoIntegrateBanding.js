/*
   CanonBandingReduction.js v0.9.1
   Reduces Banding in Canon DSLR images.

   Copied from CanonBandingReduction.js script.
   Renamed by Jarmo Ruuth for AutoIntegrate script.

   The problem has been discussed for example in http://tech.groups.yahoo.com/group/digital_astro/message/126102,
   cannot be fixed by image normalization with flats or darks, is not caused by problems in power supplies or
   electromagnetic noise, and affects different camera exemplars to differing extents.

   The general idea is to fix this by flattening the background looking at the median of each row. Additional
   tweaks try to avoid overcorrection caused by bright sections of the image. See BandingEngine.doit() for the details.

   This works very nicely for my Canon EOS40D. Let me know how it works for yours. Feel free to improve the script!

   Copyright (C) 2009-2013 Georg Viehoever

   This program is free software: you can redistribute it and/or modify it
   under the terms of the GNU General Public License as published by the
   Free Software Foundation, version 3 of the License.

   This program is distributed in the hope that it will be useful, but WITHOUT
   ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
   FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for
   more details.

   You should have received a copy of the GNU General Public License along with
   this program.  If not, see <http://www.gnu.org/licenses/>.
*/

/// @class Does the work using the params in data.
///
/// GUI functions are in a separate class, so this engine
/// can be used on its own. Use the different set..() function
/// to set the parameters, because these also schedule necessary recomputations.
/// Use getResult() to trigger processing and retrieve
/// result

#ifndef AUTOINTEGRATEBANDING_JS
#define AUTOINTEGRATEBANDING_JS

function AutoIntegrateBandingEngine() {

    var DEBUGGING_MODE_ON = true;

    // init members
    this.targetImage=null;  // image to which operation is done
    this.convertedTargetImage=null;  // target image converted to float or doubles
    this.fixupImage=null;   // image that contains the fix values, assuming dAmount 1.0
    this.resultImage=null;  //result image
 
    //numeric params with their defaults
    this.dAmount=1.0; // image is fixed by adding fixImage*dAmount
    this.bDoHighlightProtect=false;  // toggle for protection from bright pixels
    this.dSigma=1.0;  //factor for sigma in hihglight protection
 
    /// retrieve settings from previous runs, stored in Parameters
    this.importParameters = function() {
       if ( Parameters.has( "amount" ) )
          this.dAmount = Parameters.getReal( "amount" );
       if ( Parameters.has( "highlightProtect" ) )
          this.bDoHighlightProtect = Parameters.getBoolean( "highlightProtect" );
       if ( Parameters.has( "sigma" ) )
          this.dSigma = Parameters.getReal( "sigma" );
    };
 
    /// Store current settings for use with later runs.
    this.exportParameters = function() {
       Parameters.set( "amount", this.dAmount );
       Parameters.set( "highlightProtect", this.bDoHighlightProtect );
       Parameters.set( "sigma", this.dSigma );
    };
 
    // flags to show if something needs to be recomputed. Managed by set...() and do...() functions
    this.bRedoConvert=true;
    this.bRedoStatistics=true;
    this.bRedoResult=true;
 
    /// function to set new target image
    this.setTargetImage=function(targetImage){
       if (this.targetImage!=targetImage){
          console.writeln("Setting targetImage=",targetImage);
          this.targetImage=targetImage;
          this.bRedoConvert=true;
          this.bRedoStatistics=true;
          this.bRedoResult=true;
       }  //if setting changed
    };  //setTargetImage()
 
    /// function to set new amount value
    this.setAmount=function(amountValue){
       if (this.dAmount!=amountValue){
          this.dAmount=amountValue;
          this.bRedoResult=true;
       }  //if setting changed
    };  //setAmount()
 
    /// function to set highlightProtect mode
    this.setHighlightProtect=function(doHighlightProtect,sigmaValue){
       if ( DEBUGGING_MODE_ON ){
          console.writeln("SetHighlightProtect=",doHighlightProtect,sigmaValue);
       }
       if((this.bDoHighlightProtect!=doHighlightProtect)||
          (doHighlightProtect &&(this.dSigma!=sigmaValue))){
          //something relevant changed
          this.bDoHighlightProtect=doHighlightProtect;
          this.dSigma=sigmaValue;
          this.bRedoStatistics=true;
          this.bRedoResult=true;
       }  //if changed
    };  //setHighlightProtect()
 
    /// set status function that is called by time consuming operations for progress reporting and cancel query
    ///
    /// Operations include the image statistics and the actual correction. Can be used for progress reporting and canceling long operations.
    /// @param statusFunction is a function that receives a string (that can be displayed somewhere)
    ///        and that returns a boolean. The boolean is true if operation can continue, if false
    ///        the opertion is aborted ASAP. bForceUpdate can be used to force a GUI update.
    ///        If ==null, a default function doing nothing is set.
    this.setStatusFunction=function(statusFunction) {
       if (statusFunction==null){
          // set default doing nothing
          this.statusFunction=function(statusString,bForceUpdate) {
             if ( DEBUGGING_MODE_ON ){
                console.writeln("statusFunction, string=",statusString, "bForceUpdate=",bForceUpdate);
             }
             return true;
          }  //statusFunction()
       }else{
          this.statusFunction=statusFunction;
       }
    };  //function setStatusFunction()
 
    // set default status function
    this.setStatusFunction(null);
 
    /// function converts target image to float type if necessary
    this.doConvertImage=function(){
       if ( DEBUGGING_MODE_ON ){
          console.writeln("BandingEngine.doConvertImage(), targetImage=",this.targetImage);
       }
       if(!this.statusFunction("Converting image to float type",true)) return;
 
       if (this.bRedoConvert){
          if (this.targetImage.isNull){
             if ( DEBUGGING_MODE_ON ){
                console.writeln("doConvertImage(). targetImage is null");
             }
             this.convertedImage=null;
          }else{
             // convert image to floating point format, since int would not handle negatives or overflows
             if ( this.targetImage.sampleType == SampleType_Integer ){
                this.convertedImage = new Image( this.targetImage.width, this.targetImage.height,
                                  this.targetImage.numberOfChannels, this.targetImage.colorSpace,
                                  (this.targetImage.bitsPerSample < 32) ? 32 : 64, SampleType_Real );
                this.targetImage.resetSelections();
                this.convertedImage.resetSelections()
                this.convertedImage.assign( this.targetImage );
             }else{
                // no conversion required
                this.targetImage.resetSelections();
                this.convertedImage=this.targetImage;
             }  //if conversion necessary
          }  //if target=null
          this.bRedoConvert=false;
          this.statusFunction("Conversion done",true);
       }  // if redoConvert
       if ( DEBUGGING_MODE_ON ){
          console.writeln("BandingEngine.doConvertImage() done");
       }
    };  //convertImage()
 
    /// do statistics and medians if necessary. Create fixImage.
    this.doStatistics=function(){
       if ( DEBUGGING_MODE_ON ){
          var now=Date.now();
          console.writeln("BandingEngine.doStatistics()");
       }
       if (this.bRedoStatistics){
          this.doConvertImage();
          var targetImage=this.convertedImage;
          if (targetImage.isNull) return;
 
          this.fixImage=new Image( targetImage.width, targetImage.height,
                                  targetImage.numberOfChannels, targetImage.colorSpace,
                                  targetImage.bitsPerSample, SampleType_Real );
          var fixImage=this.fixImage;
          targetImage.resetSelections();
          fixImage.resetSelections();
 
          var targetHeight=targetImage.height;
          var targetWidth=targetImage.width;
          // for each channel, determine global statistics (average, deviation).
          // for each line, determine line average (bounded by possible highlight protection).
          for (var chan=0; chan<targetImage.numberOfChannels;++chan){
             targetImage.resetSelections();
             targetImage.selectedChannel=chan;
             fixImage.selectedChannel=chan;
 
             var rGBGlobalMedian=targetImage.median();
             //estimate noise
             //var globalSigma=targetImage.stdDev();
             //According to  http://en.wikipedia.org/wiki/Median_absolute_deviation,
             //this is a more robust estimator for sigma than stdDev(). Inspection of typical
             //images appears to confirm that.
             // FIXME maybe use new noise estimate functionality as used by imageIntegration.
             var dGlobalSigma=1.4826*targetImage.avgDev();
 
             // construct statistics object. If highlight protect, ignore unusually bright pixels.
             var aStatistic=new ImageStatistics;
             if ( DEBUGGING_MODE_ON ){
                console.writeln("BandingEngine.doStatistics(), dGlobalSigma=",dGlobalSigma,", dSigma=",this.dSigma, ", doHiglightProtect=",this.bDoHighlightProtect);
             }
             with (aStatistic){
                medianEnabled=true;
                varianceEnabled=false;
                lowRejectionEnabled=false;
                highRejectionEnabled=this.bDoHighlightProtect;
                rejectionHigh=rGBGlobalMedian+this.dSigma*dGlobalSigma;
             }  //with aStatistic
             //now determine the medians for each row.
             var lineRect=new Rect(targetWidth,1);
             for (var row=0; row<targetHeight;++row) {
                var statusString="Computing statistics for channel "+chan+", row "+row;
                if(!this.statusFunction(statusString,false)) {
                   return;
                }
                lineRect.moveTo(0,row);
                targetImage.selectedRect=lineRect;
                fixImage.selectedRect=lineRect;
                aStatistic.generate(targetImage);
                var rGBRowMedian=aStatistic.median;
                // store fix factor into fixImage
                var fixFactor=rGBGlobalMedian-rGBRowMedian;
                fixImage.fill(fixFactor);  //much faster than apply()!
             }  // for row
          }  //for channel
 
 
          targetImage.resetSelections();
          fixImage.resetSelections();
          this.bRedoStatistics=false;
 
          // if you are interested in seeing the image used for fixing the banding, replace
          // the false with true. Note that you can no longer use it for fixing due to the
          // fixImage.normalize();
          if ( false ){
             fixImage.normalize();
             var wtmp = new ImageWindow( 1000, 1000, 3,
                                  fixImage.bitsPerSample, fixImage.sampleType == SampleType_Real, fixImage.isColor,"FixImage" );
             var v = wtmp.mainView;
 
             v.beginProcess( UndoFlag_NoSwapFile );
             v.image.assign( fixImage );
             v.endProcess();
             wtmp.bringToFront();
          }
 
          this.statusFunction("Statistics done",true)
       }  // if RedoStatistics
       if ( DEBUGGING_MODE_ON ){
          console.writeln("BandingEngine.doStatistics() done");
          console.writeln("BandingEngine.doStatistics() required time [ms]=",Date.now()-now);
       }
    };  //doStatistics()
 
    /// compute the result, doing only the necessary recomputations.
    this.doResult=function(){
       if ( DEBUGGING_MODE_ON ){
          console.writeln("BandingEngine.doResult()");
       }
       if (this.bRedoResult){
          this.doStatistics();
          var targetImage=this.convertedImage;
          if (targetImage.isNull) return;
 
          if(!this.statusFunction("Fixing image",true)) {
             return;
          }
          this.resultImage=new Image( targetImage.width, targetImage.height,
                                  targetImage.numberOfChannels, targetImage.colorSpace,
                                  targetImage.bitsPerSample, SampleType_Real );
          targetImage.resetSelections();
          var resultImage=this.resultImage;
          this.fixImage.resetSelections();
          resultImage.resetSelections();
          resultImage.assign(this.fixImage);
          var dAmount=this.dAmount;
          resultImage.apply(dAmount,ImageOp_Mul);
          resultImage.apply(targetImage,ImageOp_Add);
          // if necessary: rescale data into range from 0.0-1.0
          if(!this.statusFunction("Normalizing image",true)) return;
 
          //resultImage.normalize();
          //I dont want a normalization here, since this drastically changes the range of the original image.
          //I just clip the values between 0.0 and 1.1.
          var clipImage=new Image( targetImage.width, targetImage.height,
                                  targetImage.numberOfChannels, targetImage.colorSpace,
                                  targetImage.bitsPerSample, SampleType_Real );
          clipImage.fill(0.0);
          resultImage.apply(clipImage,ImageOp_Max);
          clipImage.fill(1.0);
          resultImage.apply(clipImage,ImageOp_Min);
          this.statusFunction("Fixing image done",true);
          this.bRedoResult=false;
       }  //if RedoResult
       if ( DEBUGGING_MODE_ON ){
          console.writeln("BandingEngine.doResult() done");
       }
    };  //doResult()
 
    /// get the current result, doing recomputations if necessary
    this.getResult=function(){
       if ( DEBUGGING_MODE_ON ){
          console.writeln("BandingEngine.getResult()");
       }
       this.doResult();
       if(!this.statusFunction("Processing done",true)){
          this.statusFunction("Processing aborted",true);
       }
       if ( DEBUGGING_MODE_ON ){
          console.writeln("BandingEngine.getResult() done");
       }
       return this.resultImage;
    };  //getResult()
 
    // get the last computed result. If there is no valid result,
    // return null. No recompute is done, even if it would be necessary
    this.getLastResult=function(){
       if ( DEBUGGING_MODE_ON ){
          console.writeln("BandingEngine.getLastResult()");
       }
       return this.resultImage;
       var result=null;
       if (!this.bRedoResult){
          result=this.getResult();
       }
       if ( DEBUGGING_MODE_ON ){
          console.writeln("BandingEngine.getLastResult() done");
       }
       return result;
    };  // function getLastResult()
 
    /// do the actual work on target view
    this.doit=function(targetView){
       this.doResult();
       // Tell the core application that we are going to change this view.
       // Without doing this, we'd have just read-only access to the view's image.
       targetView.beginProcess();
       targetView.image.resetSelections();
       targetView.image.assign( this.resultImage );
       // end transaction
       targetView.endProcess();
     };   //function doit
}  //class AutoIntegrateBandingEngine

#endif  /* AUTOINTEGRATEBANDING_JS */
