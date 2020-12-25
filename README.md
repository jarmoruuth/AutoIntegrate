# AutoIntegrate

PixInsight script to integrate FITS and other image files. Script automates initial steps of image 
processing in PixInsight.

Script has a GUI interface where some processing options can be selected.

After running the script there will be integrated light images and automatically processed 
final image. LRGB, color and narrowband files are accepted.

This script is targeted for use with files that are already calibrated and files. More details 
of processing the files can be found from the header block of the source code or from 
page https://ruuth.xyz/AutoIntegrateInfo.html

Steps to run the script

1. Open script editor in PixInsight
2. Open file AutoIntegrate.js
3. Press F9 to run the script in the editor
4. When script Dialog opens, click AutoRun
5. In the file dialog, select all *.fit files and wait until script completes.

It is also possible to run manually background extraction, histogram transformations or
other steps on the integrated images and then continue automatic processing from there. 

This product is based on software from the PixInsight project, developed by Pleiades Astrophoto and its contributors (https://pixinsight.com/).
