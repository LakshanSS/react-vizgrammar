/*
 * Copyright (c) 2018, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
 *
 * WSO2 Inc. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React from 'react';
import { VictoryLine, VictoryTooltip, VictoryScatter } from 'victory';
import _ from 'lodash';
import { timeFormat } from 'd3';
import BaseChart from './BaseChart';
import ChartContainer from './ChartContainer';
import BarChart from './BarChart';
import LegendComponent from './LegendComponent';
import lightTheme from './resources/themes/victoryLightTheme';
import darkTheme from './resources/themes/victoryDarkTheme';

/**
 * Class to handle the visualization of line charts.
 */
export default class LineChart extends BaseChart {
    constructor(props) {
        super(props);
        this.sortDataBasedOnConfig = this.sortDataBasedOnConfig.bind(this);
        this.handleMouseEvent = this.handleMouseEvent.bind(this);
        this.handleLegendInteraction = this.handleLegendInteraction.bind(this);
    }

    /**
     * Generate the chart components in the case where there's only Line charts defined in the chart config.
     * @param {Array} chartArray - Array containing objects that has the information to visualize each area chart.
     * @param {String} xScale - xAxis scale to be used in the charts.
     * @param {Object} dataSets - object containing arrays of data after classification.
     * @param {Object} config - object containing user provided chart configuration
     * @param {Function} onClick - function to be executed on click event
     * @param {Array} ignoreArray - array that contains dataSets to be ignored in rendering the components.
     * @returns {{chartComponents: Array, legendComponents: Array}}
     */
    static getLineChartComponent(chartArray, xScale, dataSets, config, onClick, ignoreArray, currentTheme) {
        const chartComponents = [];
        const legendComponents = [];

        chartArray.forEach((chart, chartIndex) => {
            _.keys(chart.dataSetNames).forEach((dsName) => {
                legendComponents.push({
                    name: dsName,
                    symbol: { fill: _.indexOf(ignoreArray, dsName) > -1 ? '#d3d3d3' : chart.dataSetNames[dsName] },
                    chartIndex,
                });
                if (_.indexOf(ignoreArray, dsName) === -1) {
                    chartComponents.push(...LineChart
                        .getComponent(config, chartIndex, xScale, dataSets[dsName], chart.dataSetNames[dsName],
                            onClick, currentTheme));
                }
            });
        });

        return { chartComponents, legendComponents };
    }

    /**
     * Generate a single Line chart component to be visualized.
     * @param {Object} config - Chart configuration provided by the user.
     * @param {Number} chartIndex - Index of the chart definition in the chart Array.
     * @param {String} xScale - Scale to be used in the xAxis when plotting the chart.
     * @param {Array} data - Array of objects that containing the dataset to be plotted using this chart component.
     * @param {String} color - Color the chart should be plotted in.
     * @param {Function} onClick - Function to be executed in the case of an click event.
     * @returns {Element}
     */
    static getComponent(config, chartIndex, xScale, data, color, onClick, currentTheme) {
        return [
            (<VictoryLine
                key={`lineChart-${chartIndex}`}
                style={{
                    data: {
                        strokeWidth: config.charts[chartIndex].style ?
                            config.charts[chartIndex].style.strokeWidth || currentTheme.line.style.data.strokeWidth
                            : currentTheme.line.style.data.strokeWidth,
                        stroke: color,
                    },
                }}
                animate={config.animate ? { onEnter: { duration: 100 } } : null}
                data={data}
                name="blacked"
            />),
            (<VictoryScatter
                key={`lineScatter-${chartIndex}`}
                style={{
                    data: {
                        fill: color,
                    },
                }}
                data={data}
                labels={
                    (() => {
                        if (xScale === 'time' && config.tipTimeFormat) {
                            return (d) => {
                                return `${config.x} : ${timeFormat(config.tipTimeFormat)(new Date(d.x))}\n` +
                                    `${config.charts[chartIndex].y} : ${Number(d.y).toFixed(2)}`;
                            };
                        } else {
                            return (d) => {
                                if (isNaN(d.x)) {
                                    return `${config.x} : ${d.x}\n${config.charts[chartIndex].y} : ${Number(d.y)
                                        .toFixed(2)}`;
                                } else {
                                    return `${config.x} : ${Number(d.x).toFixed(2)}\n` +
                                        `${config.charts[chartIndex].y} : ${Number(d.y).toFixed(2)}`;
                                }
                            };
                        }
                    })()
                }
                labelComponent={
                    <VictoryTooltip
                        pointerLength={4}
                        cornerRadius={2}
                        flyoutStyle={{
                            fill: currentTheme.tooltip.style.flyout.fill,
                            fillOpacity: currentTheme.tooltip.style.flyout.fillOpacity,
                            strokeWidth: currentTheme.tooltip.style.flyout.strokeWidth
                        }}
                        style={{ fill: currentTheme.tooltip.style.labels.fill }}
                    />
                }
                size={(
                    config.charts[chartIndex].style ?
                        config.charts[chartIndex].style.markRadius || currentTheme.scatter.style.data.markRadius
                        : currentTheme.scatter.style.data.markRadius
                )}
                events={[{
                    target: 'data',
                    eventHandlers: {
                        onClick: () => {
                            return [{ target: 'data', mutation: onClick }];
                        },
                    },
                }]}
            />),
        ];
    }

    render() {
        const { config, height, width, yDomain, theme } = this.props;
        const { chartArray, dataSets, xScale, ignoreArray } = this.state;
        const currentTheme = theme === 'light' ? lightTheme : darkTheme;

        const { chartComponents, legendComponents } =
            LineChart.getLineChartComponent(chartArray, xScale, dataSets, config, this.handleMouseEvent, ignoreArray,
                currentTheme);

        return (
            <ChartContainer
                width={width}
                height={height}
                xScale={xScale}
                config={config}
                horizontal={BarChart.isHorizontal(config)}
                yDomain={yDomain}
                theme={theme}
            >
                {
                    config.legend === true ?
                        <LegendComponent
                            height={height}
                            width={width}
                            legendItems={legendComponents}
                            interaction={this.handleLegendInteraction}
                            config={config}
                            theme={theme}
                        /> : null

                }
                {chartComponents}
            </ChartContainer>
        );
    }
}
