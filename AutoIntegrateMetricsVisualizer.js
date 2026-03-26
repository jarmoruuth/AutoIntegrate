// AutoIntegrate Astro Image Metrics Visualizer Dialog
// For SubFrame Selector metrics visualization
// Converted to V8 / ES6 class syntax

#ifndef AUTOINTEGRATEMETRICSVISUALIZER_JS
#define AUTOINTEGRATEMETRICSVISUALIZER_JS

// ---- PlotControl ----
// Defined before AstroMetricsDialog because it is instantiated there.
// Needs a reference to the outer visualizer for shared state (metricsFilteredOut etc.)

class AutoIntegrateMetricsVisualizerPlotControl extends Control {

    constructor(parent, metrics, stats, color, visualizer) {
        super(parent);

        this.visualizer = visualizer;     // reference to AutoIntegrateMetricsVisualizer instance
        this.metrics    = metrics;
        this.title      = metrics.name;
        this.data       = metrics.data;
        this.filter_high = metrics.filter_high;
        this.stats      = stats;
        this.plotColor  = color || 0xFF0066CC;
        this.margin     = 40;
        this.preferredWidth  = 500;
        this.preferredHeight = 250;
        this.plot_limit = metrics.limit || 0.0;
        this.limitEdit  = null;   // linked later
        this.dataLabel  = null;   // linked later

        this.toolTip =
            "<p>Plot for " + this.title + " metric.<br>" +
            "Set a limit to filter out values.<br>" +
            "Current limit: " + this.plot_limit.toFixed(8) +
            (this.filter_high ? " (Max)" : " (Min)") + "<p>" +
            "<p>Gray points indicate values filtered out by outliers.<br>" +
            "White points indicate values filtered out by the current limits.</p>" +
            "<p>Green lines indicate one sigma limits.<br>" +
            "Red lines indicate two sigma limits.</p>" +
            "<p><b>Double-click on the plot to set the limit at that Y-axis value.</b></p>";

        if (this.title === 'None') {
            this.enabled = false;
        }

        this.setMinSize(this.preferredWidth, this.preferredHeight);

        // Calculate data statistics
        this.minValue = Math.min.apply(Math, this.data);
        this.maxValue = Math.max.apply(Math, this.data);
        this.range    = this.maxValue - this.minValue;

        // Keep as regular function: PI sets 'this' to the control in event handlers
        this.onMouseDoubleClick = function(x, y, button, buttonState, modifiers) {
            let plotX      = this.margin;
            let plotY      = this.margin;
            let plotWidth  = this.width  - 2 * this.margin;
            let plotHeight = this.height - 2 * this.margin;

            if (x >= plotX && x <= plotX + plotWidth &&
                y >= plotY && y <= plotY + plotHeight)
            {
                let normalizedY = (plotY + plotHeight - y) / plotHeight;
                let dataValue   = this.minValue + (normalizedY * this.range);

                this.plot_limit      = dataValue;
                this.metrics.limit   = dataValue;

                if (this.limitEdit) {
                    this.limitEdit.setValue(dataValue);
                }

                // Access dialog via visualizer reference
                this.visualizer.dialog.updateData();

                console.writeln("Limit set to " + dataValue.toFixed(8) + " for " + this.title);
            }
        };

        // Keep as regular function: 'this' = the control throughout
        this.onPaint = function(x0, y0, x1, y1) {
            let metricsFilteredOut = this.visualizer.metricsFilteredOut;
            let alwaysFilteredOut  = this.visualizer.alwaysFilteredOut;
            let stats              = this.stats;

            let graphics = new Graphics(this);
            graphics.fillRect(this.boundsRect, new Brush(0xFF2D2D30));

            let plotX      = this.margin;
            let plotY      = this.margin;
            let plotWidth  = this.width  - 2 * this.margin;
            let plotHeight = this.height - 2 * this.margin;

            graphics.fillRect(new Rect(plotX, plotY, plotX + plotWidth, plotY + plotHeight),
                              new Brush(0xFF1E1E1E));

            graphics.pen = new Pen(0xFF404040, 1);
            graphics.drawRect(plotX, plotY, plotX + plotWidth, plotY + plotHeight);

            graphics.pen  = new Pen(0xFFFFFFFF);
            graphics.font = new Font("Arial", 12);
            let titleWidth = graphics.font.width(this.title);
            graphics.drawText((this.width - titleWidth) / 2, 20, this.title);

            graphics.pen = new Pen(0xFF404040, 1);
            for (let i = 1; i < 5; i++) {
                let y = plotY + (plotHeight * i / 5);
                graphics.drawLine(plotX, y, plotX + plotWidth, y);
            }

            if (this.range > 0) {
                let oneSigma    = stats.mean + stats.stdDev;
                let twoSigma    = stats.mean + (stats.stdDev * 2);
                let oneSigmaY   = plotY + plotHeight - (plotHeight * (oneSigma  - this.minValue) / this.range);
                let twoSigmaY   = plotY + plotHeight - (plotHeight * (twoSigma  - this.minValue) / this.range);
                if (oneSigmaY > plotY) {
                    graphics.pen = new Pen(0xFF008000, 1);
                    graphics.drawLine(plotX, oneSigmaY, plotX + plotWidth, oneSigmaY);
                }
                if (twoSigmaY > plotY) {
                    graphics.pen = new Pen(0xFFCD5C5C, 1);
                    graphics.drawLine(plotX, twoSigmaY, plotX + plotWidth, twoSigmaY);
                }
                let oneSigmaLow    = stats.mean - stats.stdDev;
                let twoSigmaLow    = stats.mean - (stats.stdDev * 2);
                let oneSigmaLowY   = plotY + plotHeight - (plotHeight * (oneSigmaLow - this.minValue) / this.range);
                let twoSigmaLowY   = plotY + plotHeight - (plotHeight * (twoSigmaLow - this.minValue) / this.range);
                if (oneSigmaLowY < plotY + plotHeight) {
                    graphics.pen = new Pen(0xFF008000, 1);
                    graphics.drawLine(plotX, oneSigmaLowY, plotX + plotWidth, oneSigmaLowY);
                }
                if (twoSigmaLowY < plotY + plotHeight) {
                    graphics.pen = new Pen(0xFFCD5C5C, 1);
                    graphics.drawLine(plotX, twoSigmaLowY, plotX + plotWidth, twoSigmaLowY);
                }
            }

            if (this.plot_limit !== 0.0 && this.range > 0) {
                let limitY = plotY + plotHeight - (plotHeight * (this.plot_limit - this.minValue) / this.range);
                if (limitY >= plotY && limitY <= plotY + plotHeight) {
                    graphics.pen = new Pen(0xFFFFFF00, 2);
                    graphics.drawLine(plotX, limitY, plotX + plotWidth, limitY);

                    graphics.font = new Font("Arial", 10);
                    let limitLabel  = "Limit: " + this.plot_limit.toFixed(4);
                    let labelWidth  = graphics.font.width(limitLabel);
                    graphics.fillRect(
                        new Rect(plotX + plotWidth - labelWidth - 10, limitY - 12,
                                 plotX + plotWidth - 5,               limitY - 2),
                        new Brush(0xFF2D2D30));
                    graphics.pen = new Pen(0xFFFFFF00);
                    graphics.drawText(plotX + plotWidth - labelWidth - 8, limitY - 2, limitLabel);
                }
            }

            if (this.data.length > 0) {
                graphics.pen          = new Pen(this.plotColor, 2);
                graphics.antialiasing = true;

                let points       = [];
                let accept_count = 0;

                for (let i = 0; i < this.data.length; i++) {
                    let x              = plotX + (plotWidth * i / (this.data.length - 1));
                    let normalizedValue = (this.data[i] - this.minValue) / this.range;
                    let y              = plotY + plotHeight - (plotHeight * normalizedValue);

                    if (this.plot_limit === 0.0) {
                        accept_count++;
                    } else if (this.filter_high) {
                        if (this.data[i] <= this.plot_limit) { accept_count++; }
                    } else {
                        if (this.data[i] >= this.plot_limit) { accept_count++; }
                    }
                    points.push(new Point(x, y));
                }

                for (let i = 0; i < points.length; i++) {
                    if (alwaysFilteredOut[i]) {
                        graphics.brush = new Brush(0xffC0C0C0);
                    } else if (metricsFilteredOut[i]) {
                        graphics.brush = new Brush(0xFFFFFFFF);
                    } else {
                        graphics.brush = new Brush(this.plotColor);
                    }
                    graphics.fillCircle(points[i], 2);
                }

                graphics.pen  = new Pen(0xFFCCCCCC);
                graphics.font = new Font("Arial", 8);

                for (let i = 0; i <= 5; i++) {
                    let value = (i === 0) ? this.minValue
                              : (i === 5) ? this.maxValue
                              : this.minValue + (this.range * i / 5);
                    let y = plotY + plotHeight - (plotHeight * i / 5);
                    let label = (this.range < 10)    ? value.toFixed(4)
                              : (this.range < 100)   ? value.toFixed(3)
                              : (this.range < 1000)  ? value.toFixed(2)
                              : value.toFixed(1);
                    graphics.drawText(5, y, label);
                }

                if (this.dataLabel) {
                    this.dataLabel.text = accept_count + " / " + this.data.length;
                }
            } else {
                if (this.dataLabel) {
                    this.dataLabel.text = "";
                }
            }

            graphics.end();
        };
    }
}

// ---- StatsControl ----

class AutoIntegrateMetricsVisualizerStatsControl extends Control {

    constructor(parent, title, data) {
        super(parent);

        this.title = title;
        this.data  = data;

        if (title === 'None') {
            this.visible = false;
            return;
        }

        let sum      = this.data.reduce((a, b) => a + b, 0);
        this.mean    = sum / this.data.length;
        this.min     = Math.min.apply(Math, this.data);
        this.max     = Math.max.apply(Math, this.data);

        let variance = this.data.reduce((acc, val) => acc + Math.pow(val - this.mean, 2), 0)
                       / this.data.length;
        this.stdDev  = Math.sqrt(variance);

        this.titleLabel = new Label(this);
        this.titleLabel.text           = this.title + " Statistics:";
        this.titleLabel.textAlignment  = TextAlignment.Left | TextAlignment.VertCenter;
        this.titleLabel.styleSheet     = "font-weight: bold;";

        this.meanLabel = new Label(this);
        this.meanLabel.text           = "Mean: " + this.mean.toFixed(8);
        this.meanLabel.textAlignment  = TextAlignment.Left | TextAlignment.VertCenter;

        this.minLabel = new Label(this);
        this.minLabel.text            = "Min: " + this.min.toFixed(8);
        this.minLabel.textAlignment   = TextAlignment.Left | TextAlignment.VertCenter;

        this.maxLabel = new Label(this);
        this.maxLabel.text            = "Max: " + this.max.toFixed(8);
        this.maxLabel.textAlignment   = TextAlignment.Left | TextAlignment.VertCenter;

        this.stdDevLabel = new Label(this);
        this.stdDevLabel.text         = "Std Dev: " + this.stdDev.toFixed(8);
        this.stdDevLabel.textAlignment = TextAlignment.Left | TextAlignment.VertCenter;

        this.sizer = new VerticalSizer;
        this.sizer.margin  = 6;
        this.sizer.spacing = 2;
        this.sizer.add(this.titleLabel);
        this.sizer.addSpacing(4);
        this.sizer.add(this.meanLabel);
        this.sizer.add(this.minLabel);
        this.sizer.add(this.maxLabel);
        this.sizer.add(this.stdDevLabel);
        this.sizer.addStretch();
    }
}

// ---- AstroMetricsDialog ----

class AutoIntegrateMetricsVisualizerDialog extends Dialog {

    constructor(visualizer) {
        super();

        this.visualizer  = visualizer;   // reference to AutoIntegrateMetricsVisualizer
        let metricsData  = visualizer.metricsData;

        this.windowTitle = visualizer.WINDOW_TITLE;

        if (visualizer.numberOfDataSets > 2) {
            this.minHeight = 780;
        } else {
            this.minHeight = 600;
        }

        this.subtitleLabel = new Label(this);
        this.subtitleLabel.text          = "Update limit value or double click on the plot to set limit.";
        this.subtitleLabel.textAlignment = TextAlignment.Center;
        this.subtitleLabel.styleSheet    = "font-size: 9pt; color: #888888; font-style: italic;";

        this.totalLabel = AutoIntegrateMetricsVisualizerDialog.newLabel(this);
        this.totalLabel.textAlignment = TextAlignment.Center;
        this.totalLabel.styleSheet    = "font-size: 9pt; color: #888888; font-style: italic;";

        this.totatitleLabelSizer = new VerticalSizer;
        this.totatitleLabelSizer.add(this.subtitleLabel);
        this.totatitleLabelSizer.add(this.totalLabel);
        this.totatitleLabelSizer.addStretch();

        // Statistics panels
        this.data1Stats = new AutoIntegrateMetricsVisualizerStatsControl(this, metricsData[0].name, metricsData[0].data);
        this.data2Stats = new AutoIntegrateMetricsVisualizerStatsControl(this, metricsData[1].name, metricsData[1].data);
        this.data3Stats = new AutoIntegrateMetricsVisualizerStatsControl(this, metricsData[2].name, metricsData[2].data);
        this.data4Stats = new AutoIntegrateMetricsVisualizerStatsControl(this, metricsData[3].name, metricsData[3].data);

        // Plot controls — pass visualizer so plots can access shared state
        this.data1Plot = new AutoIntegrateMetricsVisualizerPlotControl(this, metricsData[0], this.data1Stats, 0xFF00AA00, visualizer);
        this.data2Plot = new AutoIntegrateMetricsVisualizerPlotControl(this, metricsData[1], this.data2Stats, 0xFFFF6600, visualizer);
        this.data3Plot = new AutoIntegrateMetricsVisualizerPlotControl(this, metricsData[2], this.data3Stats, 0xFF0066FF, visualizer);
        this.data4Plot = new AutoIntegrateMetricsVisualizerPlotControl(this, metricsData[3], this.data4Stats, 0xFFCC0066, visualizer);

        // Limit edit controls
        this.data1LimitEdit = AutoIntegrateMetricsVisualizerDialog.newLimitEdit(this, metricsData[0].name, this.data1Plot, visualizer);
        this.data2LimitEdit = AutoIntegrateMetricsVisualizerDialog.newLimitEdit(this, metricsData[1].name, this.data2Plot, visualizer);
        this.data3LimitEdit = AutoIntegrateMetricsVisualizerDialog.newLimitEdit(this, metricsData[2].name, this.data3Plot, visualizer);
        this.data4LimitEdit = AutoIntegrateMetricsVisualizerDialog.newLimitEdit(this, metricsData[3].name, this.data4Plot, visualizer);

        // Link plots to their limit edits
        this.data1Plot.limitEdit = this.data1LimitEdit;
        this.data2Plot.limitEdit = this.data2LimitEdit;
        this.data3Plot.limitEdit = this.data3LimitEdit;
        this.data4Plot.limitEdit = this.data4LimitEdit;

        // Data count labels
        this.data1Label = AutoIntegrateMetricsVisualizerDialog.newLabel(this);
        this.data1Plot.dataLabel = this.data1Label;
        this.data2Label = AutoIntegrateMetricsVisualizerDialog.newLabel(this);
        this.data2Plot.dataLabel = this.data2Label;
        this.data3Label = AutoIntegrateMetricsVisualizerDialog.newLabel(this);
        this.data3Plot.dataLabel = this.data3Label;
        this.data4Label = AutoIntegrateMetricsVisualizerDialog.newLabel(this);
        this.data4Plot.dataLabel = this.data4Label;

        // Limit edit sizers
        this.data1LimitEditSizer = new HorizontalSizer;
        this.data1LimitEditSizer.addSpacing(4);
        this.data1LimitEditSizer.add(this.data1LimitEdit);
        this.data1LimitEditSizer.addSpacing(20);
        this.data1LimitEditSizer.add(this.data1Label);
        this.data1LimitEditSizer.addStretch();

        this.data2LimitEditSizer = new HorizontalSizer;
        this.data2LimitEditSizer.addSpacing(4);
        this.data2LimitEditSizer.add(this.data2LimitEdit);
        this.data2LimitEditSizer.addSpacing(20);
        this.data2LimitEditSizer.add(this.data2Label);
        this.data2LimitEditSizer.addStretch();

        this.data3LimitEditSizer = new HorizontalSizer;
        this.data3LimitEditSizer.addSpacing(4);
        this.data3LimitEditSizer.add(this.data3LimitEdit);
        this.data3LimitEditSizer.addSpacing(20);
        this.data3LimitEditSizer.add(this.data3Label);
        this.data3LimitEditSizer.addStretch();

        this.data4LimitEditSizer = new HorizontalSizer;
        this.data4LimitEditSizer.addSpacing(4);
        this.data4LimitEditSizer.add(this.data4LimitEdit);
        this.data4LimitEditSizer.addSpacing(20);
        this.data4LimitEditSizer.add(this.data4Label);
        this.data4LimitEditSizer.addStretch();

        // Hide empty metrics
        if (metricsData[1].data.length === 0) {
            this.data2Plot.hide();
            this.data2Stats.hide();
            this.data2LimitEdit.hide();
        }
        if (metricsData[2].data.length === 0) {
            this.data3Plot.hide();
            this.data3Stats.hide();
            this.data3LimitEdit.hide();
        }
        if (metricsData[3].data.length === 0) {
            this.data4Plot.hide();
            this.data4Stats.hide();
            this.data4LimitEdit.hide();
        }

        // Plots group
        this.plotsGroupBox       = new GroupBox(this);
        this.plotsGroupBox.title = "Metrics Visualization";
        this.plotsGroupBox.sizer = new VerticalSizer;

        this.data1Plotsizer = new VerticalSizer;
        this.data1Plotsizer.add(this.data1Plot);
        this.data1Plotsizer.addSpacing(4);
        this.data1Plotsizer.add(this.data1LimitEditSizer);

        this.data2Plotsizer = new VerticalSizer;
        this.data2Plotsizer.add(this.data2Plot);
        this.data2Plotsizer.addSpacing(4);
        this.data2Plotsizer.add(this.data2LimitEditSizer);

        this.data3Plotsizer = new VerticalSizer;
        this.data3Plotsizer.add(this.data3Plot);
        this.data3Plotsizer.addSpacing(4);
        this.data3Plotsizer.add(this.data3LimitEditSizer);

        this.data4Plotsizer = new VerticalSizer;
        this.data4Plotsizer.add(this.data4Plot);
        this.data4Plotsizer.addSpacing(4);
        this.data4Plotsizer.add(this.data4LimitEditSizer);

        this.topRowSizer = new HorizontalSizer;
        this.topRowSizer.addSpacing(20);
        this.topRowSizer.add(this.data1Plotsizer);
        this.topRowSizer.addSpacing(10);
        this.topRowSizer.add(this.data2Plotsizer);

        this.bottomRowSizer = new HorizontalSizer;
        this.bottomRowSizer.addSpacing(20);
        this.bottomRowSizer.add(this.data3Plotsizer);
        this.bottomRowSizer.addSpacing(10);
        this.bottomRowSizer.add(this.data4Plotsizer);

        this.plotsGroupBox.sizer.add(this.topRowSizer);
        this.plotsGroupBox.sizer.addSpacing(10);
        this.plotsGroupBox.sizer.add(this.bottomRowSizer);
        this.plotsGroupBox.sizer.addSpacing(4);

        // Stats group
        this.statsGroupBox       = new GroupBox(this);
        this.statsGroupBox.title = "Statistics Summary";
        this.statsGroupBox.sizer = new HorizontalSizer;
        this.statsGroupBox.sizer.add(this.data1Stats);
        this.statsGroupBox.sizer.add(this.data2Stats);
        this.statsGroupBox.sizer.add(this.data3Stats);
        this.statsGroupBox.sizer.add(this.data4Stats);

        this.okButton      = new PushButton(this);
        this.okButton.text = "OK";
        this.okButton.icon = this.scaledResource(":/icons/ok.png");
        this.okButton.onClick = () => {
            if ((new MessageBox(
                    "Do you really want to close " + this.visualizer.WINDOW_TITLE + " and apply limits?",
                    this.visualizer.WINDOW_TITLE,
                    StdIcon.Warning, StdButton.Yes, StdButton.No)).execute() === StdButton.Yes)
            {
                this.ok();
            }
        };

        this.cancelButton      = new PushButton(this);
        this.cancelButton.text = "Cancel";
        this.cancelButton.icon = this.scaledResource(":/icons/cancel.png");
        this.cancelButton.onClick = () => {
            this.cancel();
        };

        this.buttonsRowSizer = new HorizontalSizer;
        this.buttonsRowSizer.addStretch();
        this.buttonsRowSizer.add(this.okButton);
        this.buttonsRowSizer.addSpacing(10);
        this.buttonsRowSizer.add(this.cancelButton);

        // Main sizer
        this.sizer = new VerticalSizer;
        this.sizer.margin  = 6;
        this.sizer.spacing = 4;
        this.sizer.add(this.totatitleLabelSizer);
        this.sizer.add(this.subtitleLabel);
        this.sizer.add(this.plotsGroupBox);
        this.sizer.add(this.statsGroupBox);
        this.sizer.add(this.buttonsRowSizer);
        this.sizer.addStretch();

        this.ensureLayoutUpdated();
        this.adjustToContents();
    }

    // ---- Instance methods (replaces AstroMetricsDialog.updateData = function() pattern) ----

    updateData() {
        this.updateFilteredOut();
        this.data1Plot.repaint();
        this.data2Plot.repaint();
        this.data3Plot.repaint();
        this.data4Plot.repaint();
    }

    updateFilteredOut() {
        let metricsData     = this.visualizer.metricsData;
        let alwaysFilteredOut = this.visualizer.alwaysFilteredOut;

        this.visualizer.metricsFilteredOut = [];
        let metricsFilteredOut = this.visualizer.metricsFilteredOut;

        for (let i = 0; i < metricsData.length; i++) {
            for (let j = 0; j < metricsData[i].data.length; j++) {
                metricsFilteredOut[j] = false;
            }
        }

        for (let i = 0; i < metricsData.length; i++) {
            let metric = metricsData[i];
            if (metric.name === 'None') { continue; }
            if (metric.limit === 0.0)  { continue; }

            if (metric.filter_high) {
                for (let j = 0; j < metric.data.length; j++) {
                    if (metric.data[j] > metric.limit) { metricsFilteredOut[j] = true; }
                }
            } else {
                for (let j = 0; j < metric.data.length; j++) {
                    if (metric.data[j] < metric.limit) { metricsFilteredOut[j] = true; }
                }
            }
        }

        let accepted = 0;
        for (let i = 0; i < metricsFilteredOut.length; i++) {
            if (!metricsFilteredOut[i] && !alwaysFilteredOut[i]) { accepted++; }
        }
        this.totalLabel.text = "Accepted Frames: " + accepted + " / " + metricsFilteredOut.length;
    }

    // ---- Static factory helpers (replaces free functions newLimitEdit / newLabel) ----

    static newLimitEdit(parent, title, plot, visualizer) {
        let limitEdit = new NumericEdit(parent);

        if (title === 'None') {
            limitEdit.enabled = false;
        }

        limitEdit.real             = true;
        limitEdit.textAlignment    = TextAlignment.Left | TextAlignment.VertCenter;
        limitEdit.label.text       = title + " Limit" + (plot.filter_high ? " (Max)" : " (Min)");
        limitEdit.label.textAlignment = TextAlignment.Left | TextAlignment.VertCenter;
        limitEdit.minWidth         = 50;
        limitEdit.setPrecision(8);
        limitEdit.setRange(0, 1000000);
        limitEdit.setValue(plot.plot_limit || 0.0);
        limitEdit.plot             = plot;
        limitEdit.visualizer       = visualizer;

        limitEdit.toolTip = plot.filter_high
            ? "Set the maximum value for " + title + " metric. Values above this limit will be filtered out."
            : "Set the minimum value for " + title + " metric. Values below this limit will be filtered out.";

        // Regular function: PI sets 'this' = the NumericEdit control
        limitEdit.onValueUpdated = function(value) {
            this.plot.plot_limit    = value;
            this.plot.metrics.limit = value;
            this.visualizer.dialog.updateData();
        };

        return limitEdit;
    }

    static newLabel(parent) {
        let lbl = new Label(parent);
        lbl.text           = "";
        lbl.textAlignment  = TextAlignment.Right | TextAlignment.VertCenter;
        return lbl;
    }
}

// ---- AutoIntegrateMetricsVisualizer (outer class / entry point) ----

class AutoIntegrateMetricsVisualizer extends Object {

    // Class fields
    static WINDOW_TITLE = "AutoIntegrate Metrics Visualizer";

    metricsData = [
        { name: "fwhm",         data: [2.1, 2.3, 1.8, 2.5, 2.0, 2.2, 1.9, 2.4, 2.1, 1.7],  limit: 0.0, filter_high: true  },
        { name: "eccentricity", data: [0.15,0.22,0.18,0.28,0.12,0.19,0.16,0.25,0.14,0.11], limit: 0.0, filter_high: true  },
        { name: "snr",          data: [45.2,38.7,52.1,33.8,48.9,41.3,46.7,35.2,49.8,54.3], limit: 0.0, filter_high: true  },
        { name: "stars",        data: [0.85,0.72,0.91,0.65,0.88,0.78,0.83,0.69,0.87,0.93], limit: 0.0, filter_high: false }
    ];

    metricsFilteredOut = [];
    alwaysFilteredOut  = [];
    numberOfDataSets   = 0;
    dialog             = null;

    constructor(global) {
        super();
        this.global = global;
        this.WINDOW_TITLE = AutoIntegrateMetricsVisualizer.WINDOW_TITLE;
    }

    main(data, filtered_out) {
        this.metricsData      = data;
        this.alwaysFilteredOut = filtered_out || [];

        this.numberOfDataSets = 0;
        for (let i = 0; i < this.metricsData.length; i++) {
            if (this.metricsData[i].data.length > 0) {
                this.numberOfDataSets++;
            }
        }

        this.dialog = new AutoIntegrateMetricsVisualizerDialog(this);
        this.dialog.updateFilteredOut();

        return this.dialog.execute();
    }
}

#endif  /* AUTOINTEGRATEMETRICSVISUALIZER_JS */