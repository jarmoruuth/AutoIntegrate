# AutoIntegrate

PixInsight script to integrate FITS image files. Script automates initial steps of image 
processing in PixInsight.

Script has a GUI interface where some processing options can be selected.

NOTE! The use of new SubframeSelector process breaks the GUI so you can only close 
the script dialog after processing. This is what is normally done so it does not change 
the functionality, only the look and feel. Also SubframeSelector leaves Measurements and
Expressions windows open and those must be closed manually.

After running the script there will be integrated light images and automatically processed 
final image. Both LRGB and color files are accepted. Files must have .fit extension. 

This script is targeted for use with Slooh.com where .fit files are already calibrated and 
files have keywords that tell if they are L, R, G or B files or color files. More details of 
processing the files can be found from the header block of the source code.

Steps to run the script

1. Open script editor in PixInsight
2. Open file AutoIntegrate.js
3. Press F9 to run the script in the editor
4. When script Dialog opens, click AutoRun
4. In the file dialog, open all *.fit files and wait until script completes.

It is also possible to run manually background extraction, histogram transformations or
other steps on the integrated images and then continue automatic processing from there. 
For more details see header block in the source code.

PixInsight scripts that come with the product were a great help when developing this script. 
Website Light Vortex Astronomy (http://www.lightvortexastronomy.com/) was a great place to 
find details and best practises when using PixInsight.
