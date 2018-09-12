# AutoIntegrate

PixInsight script to integrate FITS image files. Script automates initial steps of image processing in PixInsight.

After running the script there will be integrated light images and automatically processed final image. Both 
LRGB and color files are accepted. Files must have .fit extension. 

This script is targeted for use with Slooh.com where .fit files are already calibrated and files have keywords 
that tell if they are L, R, G or B file or color files. More details for processing the files can be found from
the header block of the source code.

Steps to run the script

1. Run built in SubframeSelector script to measure and output subframes. Make sure 
   SSWEIGHT keyword is embedded into target images
2. Open script editor in PixInsight
3. Open file AutoIntegrate.js
4. Press F9 to run the script in the editor
5. Open all *_a.fit files and wait until the script completes.

It is also possible to run manually background extraction and/or histogram transformations on the
integrated images and then continue automatic processing from there. For more details see header 
block in the source code.

PixInsight scripts that come with the product were a great help when developing this script. Web site 
Light Vortex Astronomy (http://www.lightvortexastronomy.com/) was a great place to find details and best 
practises when using PixInsight.
