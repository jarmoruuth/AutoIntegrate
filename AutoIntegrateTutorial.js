// AutoIntegrate Tutorial and Welcome systems
// - AutoIntegrateCreditsDialog
// - AutoIntegrateWelcomeDialog
// - AutoIntegrateTutorialManagerDialog
// - AutoIntegrateTutorialSystem

// ============================================================================
// Welcome Dialog with Credits - First Run Experience
// ============================================================================

// ============================================================================
// Credits Dialog
// ============================================================================

function AutoIntegrateCreditsDialog(global) {
        this.__base__ = Dialog;
        this.__base__();

        this.global = global;
        
        this.windowTitle = "About AutoIntegrate";
        this.minWidth = 500;
        this.minHeight = 450;
        
        // Header
        this.headerLabel = new Label(this);
        this.headerLabel.text = "AutoIntegrate";
        this.headerLabel.styleSheet = 
            "QLabel { " +
            "  font-size: 24px; " +
            "  font-weight: bold; " +
            "  color: #2C3E50; " +
            "  padding: 15px; " +
            "}";
        this.headerLabel.textAlignment = TextAlign_Center;
        
        this.versionLabel = new Label(this);
        this.versionLabel.text = this.global.autointegrate_version;
        this.versionLabel.styleSheet = 
            "QLabel { " +
            "  font-size: 12px; " +
            "  color: #7F8C8D; " +
            "  padding: 5px; " +
            "}";
        this.versionLabel.textAlignment = TextAlign_Center;
        
        // Credits text
        this.creditsText = new TextBox(this);
        this.creditsText.readOnly = true;
        this.creditsText.styleSheet = 
            "QTextEdit { " +
            "  background-color: #FFFFFF; " +
            "  border: 1px solid #BDC3C7; " +
            "  border-radius: 3px; " +
            "  padding: 10px; " +
            "}";
        this.creditsText.setMinSize(450, 280);
        
        this.creditsText.text = 
            "This product is based on software from the PixInsight project, developed\n" +
            "by Pleiades Astrophoto and its contributors (https://pixinsight.com/)\n" +
            "\n" +
            "Copyright (c) 2018-2025 Jarmo Ruuth\n" +
            "Copyright (c) 2022 Jean-Marc Lugrin\n" +
            "Copyright (c) 2021 rob pfile\n" +
            "Copyright (c) 2013 Andres del Pozo\n" +
            "Copyright (C) 2009-2013 Georg Viehoever\n" +
            "Copyright (c) 2019 Vicent Peris\n" +
            "Copyright (c) 2003-2020 Pleiades Astrophoto S.L.\n" +
            "\n" +
            "This script is distributed under the terms of the\n" +
            "PixInsight Software License Agreement.";
        
        // Close button
        this.closeButton = new PushButton(this);
        this.closeButton.text = "Close";
        this.closeButton.icon = this.scaledResource(":/icons/close.png");
        this.closeButton.defaultButton = true;
        var creditsDialog = this;
        this.closeButton.onClick = function() {
            creditsDialog.ok();
        };
        
        var buttonSizer = new HorizontalSizer;
        buttonSizer.addStretch();
        buttonSizer.add(this.closeButton);
        
        // Main layout
        this.sizer = new VerticalSizer;
        this.sizer.margin = 10;
        this.sizer.spacing = 6;
        this.sizer.add(this.headerLabel);
        this.sizer.add(this.versionLabel);
        this.sizer.add(this.creditsText, 100);
        this.sizer.addSpacing(6);
        this.sizer.add(buttonSizer);
        
        this.adjustToContents();
}

AutoIntegrateCreditsDialog.prototype = new Dialog;

// ============================================================================
// Welcome Dialog
// ============================================================================

function AutoIntegrateWelcomeDialog(global) {
        this.__base__ = Dialog;
        this.__base__();

        this.global = global;
        
        this.windowTitle = "Welcome to AutoIntegrate";
        this.minWidth = 600;
        this.minHeight = 500;
        
        // Header with logo/title
        this.headerLabel = new Label(this);
        this.headerLabel.text = "🌟 Welcome to AutoIntegrate! 🌟";
        this.headerLabel.styleSheet = 
            "QLabel { " +
            "  font-size: 20px; " +
            "  font-weight: bold; " +
            "  color: #2C3E50; " +
            "  padding: 20px; " +
            "  background: qlineargradient(x1:0, y1:0, x2:1, y2:0, " +
            "    stop:0 #E8F4F8, stop:1 #D5E8F0); " +
            "  border-radius: 5px; " +
            "}";
        this.headerLabel.textAlignment = TextAlign_Center;
        
        // Welcome message
        this.welcomeText = new TextBox(this);
        this.welcomeText.readOnly = true;
        this.welcomeText.styleSheet = 
            "QTextEdit { " +
            "  background-color: #FFFFFF; " +
            "  border: 1px solid #BDC3C7; " +
            "  border-radius: 3px; " +
            "  padding: 10px; " +
            "}";
        this.welcomeText.text = 
            "Welcome to AutoIntegrate!\n\n" +
            
            "AutoIntegrate automates the PixInsight workflow for calibrating, aligning, and " +
            "integrating your astrophotography images. Whether you're processing galaxies, nebulae, " +
            "or star clusters, AutoIntegrate simplifies the process.\n\n" +
            
            "Get started by:\n" +
            "1. Adding your light frames and optionally calibration files\n" +
            "2. Selecting your target type\n" +
            "3. Clicking Run!\n\n" +
            
            "For best results, we recommend starting with the 'Getting Started' tutorial below.";
        this.welcomeText.setMinSize(550, 250);
        
        // Tutorials section
        this.tutorialsGroupBox = new GroupBox(this);
        this.tutorialsGroupBox.title = "🎓 Tutorials";
        this.tutorialsGroupBox.sizer = new VerticalSizer;
        this.tutorialsGroupBox.sizer.margin = 10;
        this.tutorialsGroupBox.sizer.spacing = 6;
        
        this.tutorialLabel = new Label(this.tutorialsGroupBox);
        this.tutorialLabel.text = "Learn AutoIntegrate with interactive tutorials:";
        this.tutorialLabel.wordWrapping = true;
        
        this.gettingStartedButton = new PushButton(this.tutorialsGroupBox);
        this.gettingStartedButton.text = "▶ Getting Started Tutorial (Recommended)";
        this.gettingStartedButton.icon = this.scaledResource(":/icons/play.png");
        this.gettingStartedButton.styleSheet = 
            "QPushButton { " +
            "  background: rgb(46, 204, 113); " +
            "  color: white; " +
            "  font-weight: bold; " +
            "  padding: 8px 16px; " +
            "  text-align: left; " +
            "}" +
            "QPushButton:hover { " +
            "  background: rgb(39, 174, 96); " +
            "}";
        var welcomeDialog = this;
        this.gettingStartedButton.onClick = function() {
            welcomeDialog.selectedTutorial = "getting-started";
            welcomeDialog.ok();
        };
        
        this.allTutorialsButton = new PushButton(this.tutorialsGroupBox);
        this.allTutorialsButton.text = "View All Tutorials";
        this.allTutorialsButton.icon = this.scaledResource(":/icons/book.png");
        this.allTutorialsButton.onClick = function() {
            welcomeDialog.selectedTutorial = "show-manager";
            welcomeDialog.ok();
        };
        
        this.tutorialsGroupBox.sizer.add(this.tutorialLabel);
        this.tutorialsGroupBox.sizer.addSpacing(4);
        this.tutorialsGroupBox.sizer.add(this.gettingStartedButton);
        this.tutorialsGroupBox.sizer.add(this.allTutorialsButton);
        
        // Resources section
        this.resourcesGroupBox = new GroupBox(this);
        this.resourcesGroupBox.title = "📚 Resources";
        this.resourcesGroupBox.sizer = new VerticalSizer;
        this.resourcesGroupBox.sizer.margin = 10;
        this.resourcesGroupBox.sizer.spacing = 4;
        
        this.resourcesLabel = new Label(this.resourcesGroupBox);
        this.resourcesLabel.text = "Additional help and documentation:";
        
        // Documentation link
        this.docsButton = new PushButton(this.resourcesGroupBox);
        this.docsButton.text = "📖 Online Documentation";
        this.docsButton.toolTip = "Open AutoIntegrate documentation in browser";
        this.docsButton.onClick = function() {
            Console.writeln("Documentation: " + global.autointegrateinfo_link);
            Dialog.openBrowser(global.autointegrateinfo_link);
        };
        
        // Forum link
        this.forumButton = new PushButton(this.resourcesGroupBox);
        this.forumButton.text = "💬 Support Forum";
        this.forumButton.toolTip = "Visit the AutoIntegrate forum for help and discussion";
        this.forumButton.onClick = function() {
            Console.writeln("Forum: https://forums.ruuth.xyz/");
            Dialog.openBrowser("https://forums.ruuth.xyz/");
        };
        
        // Video tutorials link
        this.videoButton = new PushButton(this.resourcesGroupBox);
        this.videoButton.text = "🎥 Video Tutorials";
        this.videoButton.toolTip = "Watch video guides on YouTube";
        this.videoButton.onClick = function() {
            Console.writeln("Videos: https://www.youtube.com/watch?v=so8T765h-Kc");
            Dialog.openBrowser("https://www.youtube.com/watch?v=so8T765h-Kc");
        };
        
        // Credits button
        this.creditsButton = new PushButton(this.resourcesGroupBox);
        this.creditsButton.text = "Credits";
        this.creditsButton.toolTip = "View credits and version information";
        this.creditsButton.onClick = function() {
            var credits = new AutoIntegrateCreditsDialog(global);
            credits.execute();
        };
        
        this.resourcesGroupBox.sizer.add(this.resourcesLabel);
        this.resourcesGroupBox.sizer.addSpacing(4);
        
        var resourceButtonSizer1 = new HorizontalSizer;
        resourceButtonSizer1.spacing = 6;
        resourceButtonSizer1.add(this.docsButton);
        resourceButtonSizer1.add(this.forumButton);
        
        var resourceButtonSizer2 = new HorizontalSizer;
        resourceButtonSizer2.spacing = 6;
        resourceButtonSizer2.add(this.videoButton);
        // resourceButtonSizer2.add(this.creditsButton);
        
        this.resourcesGroupBox.sizer.add(resourceButtonSizer1);
        this.resourcesGroupBox.sizer.add(resourceButtonSizer2);
        
        // Show on startup checkbox
        this.showOnStartupCheckBox = new CheckBox(this);
        this.showOnStartupCheckBox.checked = false;  // Disabled by default
        
        this.showOnStartupLabel = new Label(this);
        this.showOnStartupLabel.text = "Show this welcome screen on startup";
        this.showOnStartupLabel.cursor = new Cursor(StdCursor_PointingHand);
        this.showOnStartupLabel.onMousePress = function() {
            welcomeDialog.showOnStartupCheckBox.checked = !welcomeDialog.showOnStartupCheckBox.checked;
        };
        
        var showOnStartupSizer = new HorizontalSizer;
        showOnStartupSizer.spacing = 4;
        showOnStartupSizer.add(this.showOnStartupCheckBox);
        showOnStartupSizer.add(this.showOnStartupLabel);
        showOnStartupSizer.addStretch();
        
        // Bottom buttons
        this.skipButton = new PushButton(this);
        this.skipButton.text = "Skip - Start Using AutoIntegrate";
        this.skipButton.icon = this.scaledResource(":/icons/forward.png");
        this.skipButton.onClick = function() {
            welcomeDialog.selectedTutorial = null;
            welcomeDialog.ok();
        };
        
        this.closeButton = new PushButton(this);
        this.closeButton.text = "Close";
        this.closeButton.icon = this.scaledResource(":/icons/close.png");
        this.closeButton.onClick = function() {
            welcomeDialog.selectedTutorial = null;
            welcomeDialog.cancel();
        };
        
        var buttonSizer = new HorizontalSizer;
        buttonSizer.spacing = 6;
        buttonSizer.add(this.creditsButton);
        buttonSizer.addStretch();
        buttonSizer.add(this.skipButton);
        buttonSizer.add(this.closeButton);
        
        // Main layout
        this.sizer = new VerticalSizer;
        this.sizer.margin = 10;
        this.sizer.spacing = 10;
        this.sizer.add(this.headerLabel);
        this.sizer.add(this.welcomeText);
        this.sizer.add(this.tutorialsGroupBox);
        this.sizer.add(this.resourcesGroupBox);
        this.sizer.addSpacing(6);
        this.sizer.add(showOnStartupSizer);
        this.sizer.add(buttonSizer);
        
        this.adjustToContents();
        
        // Store selected tutorial
        this.selectedTutorial = null;
}

AutoIntegrateWelcomeDialog.prototype = new Dialog;

AutoIntegrateWelcomeDialog.prototype.saveShowOnStartup = function() {
        if (!this.global.do_not_write_settings) {
            Settings.write("AutoIntegrate_ShowWelcomeOnStartup", DataType_Boolean, this.showOnStartupCheckBox.checked);
        }
};

// ============================================================================
// Tutorial Manager - Dialog to select and launch tutorials
// ============================================================================

function AutoIntegrateTutorialManagerDialog(parentDialog) {
      this.__base__ = Dialog;
      this.__base__();
      
      this.parentDialog = parentDialog;
      this.windowTitle = "AutoIntegrate Tutorials";
      this.minWidth = 500;
      this.minHeight = 400;

      this.useAdvancedOptions = false;
      
      // Title
      this.titleLabel = new Label(this);
      this.titleLabel.text = "Welcome to AutoIntegrate Tutorials";
      this.titleLabel.styleSheet = 
            "QLabel { " +
            "  font-size: 16px; " +
            "  font-weight: bold; " +
            "  color: #2C3E50; " +
            "  padding: 10px; " +
            "}";
      
      // Description
      this.descLabel = new Label(this);
      this.descLabel.text = "Select a tutorial to learn about AutoIntegrate features:";
      this.descLabel.wordWrapping = true;
      this.descLabel.styleSheet = "QLabel { padding: 5px 10px; color: #7F8C8D; }";
      
      // Tutorial list
      this.tutorialList = new TreeBox(this);
      this.tutorialList.alternateRowColor = true;
      this.tutorialList.setMinHeight(250);
      this.tutorialList.headerVisible = false;
      this.tutorialList.numberOfColumns = 1;
      
      var manager = this;
      this.tutorialList.onNodeDoubleClicked = function(node) {
            manager.launchSelectedTutorial();
      };
      
      // Populate tutorials
      this.populateTutorials();
      
      // Buttons
      this.startButton = new PushButton(this);
      this.startButton.text = "Start Tutorial";
      this.startButton.icon = this.scaledResource(":/icons/play.png");
      this.startButton.defaultButton = true;
      this.startButton.styleSheet = 
            "QPushButton { " +
            "  background: rgb(46, 204, 113); " +
            "  color: white; " +
            "  font-weight: bold; " +
            "  padding: 8px 20px; " +
            "}";
      this.startButton.onClick = function() {
            manager.launchSelectedTutorial();
      };
      
      this.closeButton = new PushButton(this);
      this.closeButton.text = "Close";
      this.closeButton.icon = this.scaledResource(":/icons/close.png");
      this.closeButton.onClick = function() {
            manager.cancel();
      };
      
      if (this.useAdvancedOptions) {
            // Mark as completed checkbox
            this.markCompletedCheckBox = new CheckBox(this);
            this.markCompletedCheckBox.checked = false;
            
            this.markCompletedLabel = new Label(this);
            this.markCompletedLabel.text = "Mark selected as completed";
            this.markCompletedLabel.cursor = new Cursor(StdCursor_PointingHand);
            this.markCompletedLabel.onMousePress = function() {
                  manager.markCompletedCheckBox.checked = !manager.markCompletedCheckBox.checked;
                  if (manager.markCompletedCheckBox.checked) {
                        manager.markSelectedAsCompleted();
                  }
            };
            
            var markCompletedSizer = new HorizontalSizer;
            markCompletedSizer.spacing = 4;
            markCompletedSizer.add(this.markCompletedCheckBox);
            markCompletedSizer.add(this.markCompletedLabel);
            markCompletedSizer.addStretch();
      }      
      // Button sizer
      var buttonSizer = new HorizontalSizer;
      buttonSizer.spacing = 6;
      buttonSizer.addStretch();
      buttonSizer.add(this.startButton);
      buttonSizer.add(this.closeButton);
      
      // Main layout
      this.sizer = new VerticalSizer;
      this.sizer.margin = 10;
      this.sizer.spacing = 10;
      this.sizer.add(this.titleLabel);
      this.sizer.add(this.descLabel);
      this.sizer.add(this.tutorialList, 100);
      if (this.useAdvancedOptions) {
            this.sizer.add(markCompletedSizer);
      }
      this.sizer.add(buttonSizer);
      
      this.adjustToContents();
}

AutoIntegrateTutorialManagerDialog.prototype = new Dialog;

// Define available tutorials
AutoIntegrateTutorialManagerDialog.prototype.getTutorials = function() {
      return [
        {
            id: "getting-started",
            name: "Getting Started",
            description: "Learn the basics of AutoIntegrate: adding files, configuring settings, and processing your first images.",
            difficulty: "Beginner",
            duration: "5 minutes",
            icon: "🚀"
        },
        {
            id: "file-management",
            name: "File Management",
            description: "Master organizing your light frames, calibration frames (bias, darks, flats), and output files.",
            difficulty: "Beginner",
            duration: "3 minutes",
            icon: "📁"
        },
        {
            id: "processing-settings",
            name: "Processing Settings",
            description: "Explore processing options including cropping, gradient correction and stretching.",
            difficulty: "Intermediate",
            duration: "7 minutes",
            icon: "⚙️"
        },
        {
            id: "comet-processing",
            name: "Comet Processing",
            description: "Learn how to process comet images using specialized techniques.",
            difficulty: "Advanced",
            duration: "10 minutes",
            icon: "☄️"
        }
      ];
};

// Populate the tutorial list
AutoIntegrateTutorialManagerDialog.prototype.populateTutorials = function() {
      this.tutorialList.clear();
      
      var tutorials = this.getTutorials();
      
      for (var i = 0; i < tutorials.length; i++) {
            var tutorial = tutorials[i];
            var isCompleted = this.isTutorialCompleted(tutorial.id);
            
            var node = new TreeBoxNode(this.tutorialList);
            
            // Format: Icon Name - Description
            if (this.useAdvancedOptions) {
                  var displayText = tutorial.icon + "  " + tutorial.name;
            } else {
                  var displayText = tutorial.name;
            }
            if (isCompleted) {
                  displayText = "✓ " + displayText + " (Completed)";
            }
            
            node.setText(0, displayText);
            node.tutorialId = tutorial.id;
            node.tutorialData = tutorial;
            
            if (this.useAdvancedOptions) {
                  // Style based on difficulty
                  if (isCompleted) {
                        node.setIcon(0, this.scaledResource(":/icons/ok.png"));
                  } else if (tutorial.difficulty === "Beginner") {
                        node.setIcon(0, this.scaledResource(":/icons/information.png"));
                  } else if (tutorial.difficulty === "Advanced") {
                        node.setIcon(0, this.scaledResource(":/icons/warning.png"));
                  }
            }            
            // Set tooltip with full info
            node.setToolTip(0, 
                  tutorial.name + "\n\n" +
                  tutorial.description + 
                  this.useAdvancedOptions 
                        ? "\n\n" +
                          "Difficulty: " + tutorial.difficulty + "\n" +
                          "Duration: " + tutorial.duration
                        : ""
            );
      }
      
      // Select first tutorial by default
      if (this.tutorialList.numberOfChildren > 0) {
            this.tutorialList.currentNode = this.tutorialList.child(0);
      }
};

// Check if tutorial is completed
AutoIntegrateTutorialManagerDialog.prototype.isTutorialCompleted = function(tutorialId) {
      if (this.useAdvancedOptions === false) {
            return false;
      }
      var key = "AutoIntegrate_Tutorial_" + tutorialId + "_Completed";
      return Settings.read(key, DataType_Boolean);
};

// Mark tutorial as completed
AutoIntegrateTutorialManagerDialog.prototype.markTutorialCompleted = function(tutorialId) {
      if (this.useAdvancedOptions === false) {
            return;
      }
      var key = "AutoIntegrate_Tutorial_" + tutorialId + "_Completed";
      Settings.write(key, DataType_Boolean, true);
};

// Mark selected tutorial as completed
AutoIntegrateTutorialManagerDialog.prototype.markSelectedAsCompleted = function() {
      var node = this.tutorialList.currentNode;
      if (!node) {
            return;
      }
      
      this.markTutorialCompleted(node.tutorialId);
      this.populateTutorials();
      
      Console.noteln("Tutorial marked as completed: " + node.tutorialData.name);
};

// Reset all tutorials
AutoIntegrateTutorialManagerDialog.prototype.resetAllTutorials = function() {
      var tutorials = this.getTutorials();
      for (var i = 0; i < tutorials.length; i++) {
            var key = "AutoIntegrate_Tutorial_" + tutorials[i].id + "_Completed";
            Settings.remove(key);
      }
      this.populateTutorials();
};

// Launch selected tutorial
AutoIntegrateTutorialManagerDialog.prototype.launchSelectedTutorial = function() {
      var node = this.tutorialList.currentNode;
      if (!node) {
            var msg = new MessageBox(
                  "Please select a tutorial from the list.",
                  "No Tutorial Selected",
                  StdIcon_Information,
                  StdButton_Ok
            );
            msg.execute();
            return;
      }
      
      var tutorialId = node.tutorialId;
      
      // Close this dialog
      this.ok();
      
      // Launch the specific tutorial
      if (this.parentDialog && this.parentDialog.startTutorialById) {
            this.parentDialog.startTutorialById(tutorialId);
      }
};

// ============================================================================
// Tutorial System for AutoIntegrate
// ============================================================================

function AutoIntegrateTutorialSystem(dialog) {
      this.dialog = dialog;
      this.global = dialog.global;
      this.currentStep = 0;
      this.isActive = false;
      this.steps = [];

      // Overlay to dim the background
      this.overlay = new Control(dialog);
      this.overlay.visible = false;
      this.overlay.cursor = new Cursor(StdCursor_Arrow);
      this.overlay.styleSheet = "QWidget { background-color: rgba(0, 0, 0, 128); }";

      // Tutorial tooltip
      this.tooltip = new Control(dialog);
      this.tooltip.visible = false;
      this.tooltip.setFixedSize(300, 300);

      // Tooltip content
      this.tooltipText = new Label(this.tooltip);
      this.tooltipText.wordWrapping = true;
      this.tooltipText.styleSheet = "QLabel { color: #FFFFFF; padding: 10px; }";

      this.tooltipTitle = new Label(this.tooltip);
      this.tooltipTitle.styleSheet = "QLabel { color: #FFFFFF; font-weight: bold; font-size: 12px; padding: 10px; background: #0066CC; }";

      // Navigation buttons

      // Next button - Blue with white text
      this.nextButton = new PushButton(this.tooltip);
      this.nextButton.text = "Next";
      this.nextButton.defaultButton = true;
      this.nextButton.styleSheet = "QPushButton { color: #FFFFFF; }";
      var self = this;
      this.nextButton.onClick = function() {
            self.nextStep();
      };

      // Previous button - Gray with white text
      this.prevButton = new PushButton(this.tooltip);
      this.prevButton.text = "Previous";
      this.prevButton.styleSheet = "QPushButton { color: #FFFFFF; }";
      this.prevButton.onClick = function() {
            self.previousStep();
      };

      // Skip button - Red/Orange with white text
      this.skipButton = new PushButton(this.tooltip);
      this.skipButton.text = "Skip Tutorial";
      this.skipButton.styleSheet = "QPushButton { color: #FFFFFF; }";
      
      this.skipButton.onClick = function() {
            self.endTutorial();
      };

      // Counter label
      this.counterLabel = new Label(this.tooltip);
      this.counterLabel.styleSheet = "QLabel { color: #FFFFFF; }";

      // Layout tooltip
      var buttonSizer = new HorizontalSizer;
      buttonSizer.spacing = 4;
      buttonSizer.add(this.prevButton);
      buttonSizer.addStretch();
      buttonSizer.add(this.counterLabel);
      buttonSizer.addStretch();
      buttonSizer.add(this.nextButton);

      var tooltipSizer = new VerticalSizer;
      tooltipSizer.margin = 0;
      tooltipSizer.spacing = 8;
      tooltipSizer.add(this.tooltipTitle);
      tooltipSizer.add(this.tooltipText);
      tooltipSizer.addStretch();
      tooltipSizer.add(buttonSizer);
      tooltipSizer.add(this.skipButton);

      this.tooltip.sizer = tooltipSizer;
      this.tooltip.styleSheet = "QWidget { background: #2C3E50; border: 2px solid #3498DB; border-radius: 5px; }";

      // Highlight frame
      this.highlightFrame = new Control(dialog);
      this.highlightFrame.visible = false;
      this.highlightFrame.styleSheet = "QWidget { border: 3px solid #FFD700; background: transparent; border-radius: 3px; }";

      // Blink timer for highlighted elements
      this.blinkTimer = new Timer();
      this.blinkTimer.interval = 0.5;
      this.blinkCount = 0;
      this.blinkTimer.onTimeout = function() {
            if (self.blinkCount % 2 === 0) {
                  self.highlightFrame.styleSheet = "QWidget { border: 3px solid #FFD700; background: rgba(255, 215, 0, 50); border-radius: 3px; }";
            } else {
                  self.highlightFrame.styleSheet = "QWidget { border: 3px solid #FFD700; background: transparent; border-radius: 3px; }";
            }
            self.blinkCount++;

            if (self.blinkCount >= 6) {
                  self.blinkTimer.stop();
                  self.highlightFrame.styleSheet = "QWidget { border: 3px solid #FFD700; background: rgba(255, 215, 0, 30); border-radius: 3px; }";
            }
      };
}

// Define tutorial steps
AutoIntegrateTutorialSystem.prototype.defineSteps = function(steps) {
      this.steps = steps;
};

// Start tutorial
AutoIntegrateTutorialSystem.prototype.start = function() {
      this.isActive = true;
      this.currentStep = 0;
      // this.hideSections(); Maybe better to leave as is
      this.showSelectedSections();
      this.showStep(0);
};

AutoIntegrateTutorialSystem.prototype.hideSections = function() {
      for (var i = 0; i < this.global.sectionBars.length; i++) {
            this.global.sectionBars[i].aiControl.hide();
      }
};

AutoIntegrateTutorialSystem.prototype.showSelectedSections = function() {
      for (var step = 0; step < this.steps.length; step++) {
            if (this.steps[step].sectionBars === undefined || this.steps[step].sectionBars === null) {
                  continue;
            }
            var sectionBarsToShow = this.steps[step].sectionBars;
            for (var i = 0; i < this.global.sectionBars.length; i++) {
                  for (var j = 0; j < sectionBarsToShow.length; j++) {
                        if (sectionBarsToShow[j] === this.global.sectionBars[i].aiName) {
                              this.global.sectionBars[i].aiControl.show();
                              processEvents();  // Force UI update
                        }
                  }
            }
      }
      this.dialog.adjustToContents();
      processEvents();  // Force UI update
};

// Show specific step
AutoIntegrateTutorialSystem.prototype.showStep = function(stepIndex) {
      if (stepIndex < 0 || stepIndex >= this.steps.length) {
            this.endTutorial();
            return;
      }

      this.currentStep = stepIndex;
      var step = this.steps[stepIndex];

      // AUTO-SWITCH TO TAB if specified
      if (step.switchToTab !== undefined && step.switchToTab !== null) {
            // console.writeln("Tutorial: Switching to tab index " + step.switchToTab);
            this.dialog.mainTabBox.currentPageIndex = step.switchToTab;
            processEvents();  // Force UI update
      }
      // Update tooltip content
      this.tooltipTitle.text = step.title;
      this.tooltipText.text = step.description;
      this.counterLabel.text = "Step " + (stepIndex + 1) + " of " + this.steps.length;

      // Update button states
      this.prevButton.enabled = stepIndex > 0;
      this.nextButton.text = (stepIndex === this.steps.length - 1) ? "Finish" : "Next";

      // Show overlay
      this.overlay.visible = true;
      this.overlay.setFixedSize(this.dialog.width, this.dialog.height);
      this.overlay.move(0, 0);
      this.overlay.bringToFront();

      // Highlight target element
      if (step.named_target) {
            if (step.named_target == "coordinatesCopyFirstButton") {
                  if (this.global.use_preview && this.global.ppar.preview.side_preview_visible && this.dialog.sidePreviewObj) {
                        step.target = this.dialog.sidePreviewObj.control.coordinatesCopyFirstButton;
                  }
            }
      }
      if (step.target) {
            this.highlightElement(step.target);
      } else {
            this.highlightFrame.visible = false;
      }

      // Position tooltip
      this.positionTooltip(step.target, step.tooltipPosition);

      // Show tooltip
      this.tooltip.visible = true;
      this.tooltip.bringToFront();

      // Start blink animation
      this.blinkCount = 0;
      this.blinkTimer.start();

      // Bring target to front if needed
      if (step.target) {
            step.target.bringToFront();
      }

      processEvents();
};

// Highlight an element
AutoIntegrateTutorialSystem.prototype.highlightElement = function(element) {
      if (!element) {
            this.highlightFrame.visible = false;
            return;
      }
      
      // Get element's global screen position
      var globalPos = element.localToGlobal(new Point(0, 0));
      
      // Get dialog's global screen position
      var dialogGlobal = this.dialog.localToGlobal(new Point(0, 0));

      // Calculate relative position
      var x = globalPos.x - dialogGlobal.x;
      var y = globalPos.y - dialogGlobal.y;
      
      // Set highlight frame size and position
      this.highlightFrame.setFixedSize(element.width + 6, element.height + 6);
      this.highlightFrame.move(x - 3, y - 3);
      this.highlightFrame.visible = true;
      this.highlightFrame.bringToFront();
};

// Position tooltip relative to target
AutoIntegrateTutorialSystem.prototype.positionTooltip2 = function(target, position) {
      position = position || "left";

      var tooltipWidth = 300;
      var tooltipHeight = 300;
      var margin = 20;

      var x, y;

      target = this.dialog.mainTabBox;
      position = "left";

      if (target) {
            var pos = target.localToGlobal(target.position);
            var dialogPos = this.dialog.localToGlobal(this.dialog.position);
            var targetX = pos.x - dialogPos.x;
            var targetY = pos.y - dialogPos.y;

            switch (position) {
                  case "right":
                        x = targetX + target.width + margin;
                        y = targetY;
                        break;
                  case "left":
                        x = targetX - tooltipWidth - margin;
                        y = targetY;
                        break;
                  case "top":
                        x = targetX;
                        y = targetY - tooltipHeight - margin;
                        break;
                  case "bottom":
                        x = targetX;
                        y = targetY + target.height + margin;
                        break;
                  case "center":
                  default:
                        x = (this.dialog.width - tooltipWidth) / 2;
                        y = (this.dialog.height - tooltipHeight) / 2;
                        break;
            }
      } else {
            // Center if no target
            x = (this.dialog.width - tooltipWidth) / 2;
            y = (this.dialog.height - tooltipHeight) / 2;
      }

      // Keep within dialog bounds
      x = Math.max(10, Math.min(x, this.dialog.width - tooltipWidth - 10));
      y = Math.max(10, Math.min(y, this.dialog.height - tooltipHeight - 10));

      this.tooltip.move(x, y);
};

AutoIntegrateTutorialSystem.prototype.positionTooltip = function(target, position) {
      position = position || "right";
      
      var tooltipWidth = 320;
      var tooltipHeight = 180;
      var margin = 20;
      
      var x, y;

      target = this.dialog.mainTabBox;
      position = "left";
    
    if (target) {
        // Use the same method as highlightElement
        var targetGlobal = target.localToGlobal(new Point(0, 0));
        var dialogGlobal = this.dialog.localToGlobal(new Point(0, 0));
        var targetX = targetGlobal.x - dialogGlobal.x;
        var targetY = targetGlobal.y - dialogGlobal.y;
        
        switch (position) {
            case "right":
                x = targetX + target.width + margin;
                y = targetY;
                break;
            case "left":
                x = targetX - tooltipWidth - margin;
                y = targetY;
                break;
            case "top":
                x = targetX;
                y = targetY - tooltipHeight - margin;
                break;
            case "bottom":
                x = targetX;
                y = targetY + target.height + margin;
                break;
            case "top-right":
                x = targetX + target.width + margin;
                y = targetY - tooltipHeight - margin;
                break;
            case "bottom-right":
                x = targetX + target.width + margin;
                y = targetY + target.height + margin;
                break;
            case "top-left":
                x = targetX - tooltipWidth - margin;
                y = targetY - tooltipHeight - margin;
                break;
            case "bottom-left":
                x = targetX - tooltipWidth - margin;
                y = targetY + target.height + margin;
                break;
            case "center":
            default:
                x = (this.dialog.width - tooltipWidth) / 2;
                y = (this.dialog.height - tooltipHeight) / 2;
                break;
        }
        
        // Center vertically relative to target for left/right positions
        if (position === "right" || position === "left") {
            y = targetY + (target.height / 2) - (tooltipHeight / 2);
        }
        
        // Center horizontally relative to target for top/bottom positions
        if (position === "top" || position === "bottom") {
            x = targetX + (target.width / 2) - (tooltipWidth / 2);
        }
    } else {
        // Center if no target
        x = (this.dialog.width - tooltipWidth) / 2;
        y = (this.dialog.height - tooltipHeight) / 2;
    }
    
    // Keep within dialog bounds
    x = Math.max(10, Math.min(x, this.dialog.width - tooltipWidth - 10));
    y = Math.max(10, Math.min(y, this.dialog.height - tooltipHeight - 10));
    
    this.tooltip.move(x, y);
};

// Navigate to next step
AutoIntegrateTutorialSystem.prototype.nextStep = function() {
      this.blinkTimer.stop();
      if (this.currentStep < this.steps.length - 1) {
            this.showStep(this.currentStep + 1);
      } else {
            this.endTutorial();
      }
};

// Navigate to previous step
AutoIntegrateTutorialSystem.prototype.previousStep = function() {
      this.blinkTimer.stop();
      if (this.currentStep > 0) {
            this.showStep(this.currentStep - 1);
      }
};

// End tutorial
AutoIntegrateTutorialSystem.prototype.endTutorial = function() {
    this.isActive = false;
    this.blinkTimer.stop();
    this.overlay.visible = false;
    this.tooltip.visible = false;
    this.highlightFrame.visible = false;
    
    // Mark tutorial as completed
    if (this.currentTutorialId &&  !this.dialog.global.do_not_write_settings) {
        var key = "AutoIntegrate_Tutorial_" + this.currentTutorialId + "_Completed";
        Settings.write(key, DataType_Boolean, true);
        Console.noteln("Tutorial completed: " + this.currentTutorialId);
    }
    
    processEvents();
};

// Check if tutorial should be shown
AutoIntegrateTutorialSystem.prototype.shouldShowTutorial = function() {
      if (this.dialog.global.do_not_read_settings) {
            return true;
      } else {
            var shown = Settings.read("AutoIntegrate_TutorialShown", DataType_Boolean);
            return !shown;
      }
};
