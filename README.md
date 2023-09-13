# AutoIntegrate

PixInsight script to process FITS, RAW and other image files. Script automates initial steps of image 
processing in PixInsight.

Script has a GUI interface where some processing options can be selected.

After running the script there will be integrated light images and automatically processed 
final image. LRGB, color/OSC/DSLR and narrowband files are accepted.

Script can be used for both calibrated and non-calibrated images. More details 
of processing the files can be found from the header block of the source code or from 
page https://ruuth.xyz/AutoIntegrateInfo.html

It is possible to automatically install and update AutoIntegrate script by adding it to 
the PixInsight update repository. Whenever PixInsight is started it will then check for 
updates to AutoIntegrate. To enable automatic updates you need to add the following Url 
to the PixInsight Resources/Updates/Manage Repositories.

https://ruuth.xyz/autointegrate/

Alternatively the script can be run from the PixInsight Script Editor.

Note that starting from AutoIntegrate version 1.56 there is a dependency to ImageSolver script
in PixInsight distribution. This means that ImageSolver files must be in the ../AdP
directory relative to AutoIntegrate directory. You can do this by creating a ../AdP
directory and copying the contents of Pixinsight-install-directory/src/scripts/AdP
there.

1. Download source code zip from GitHub and unzip the contents.
2. Open Script Editor in PixInsight
3. Open file AutoIntegrate.js
4. Press F9 to run the script in the editor
5. Add files with add buttons
6. Click Run and wait until the script completes

This product is based on software from the PixInsight project, developed by Pleiades Astrophoto and its contributors (https://pixinsight.com/).
