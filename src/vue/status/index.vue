<template>
  <div class='status-container'>
    <el-tabs v-model="activePanel" @tab-click="changePannel">
      <el-tab-pane label="dashBoard" name="dashBoard">
        <el-row style="height:45vh">
          <el-col :span="24">
            Queries:
            <div id="queries"></div>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="12">
            Traffic:
            <div id="traffic"></div>
          </el-col>
          <el-col :span="12">
            Server Sessions:
            <div id="sessions"></div>
          </el-col>
        </el-row>

      </el-tab-pane>
      <el-tab-pane label="processList" name="processList">
        <el-table :data="process.list" style="width: 100%">
          <el-table-column :label="field" v-for="(field,index) in process.fields" :key="index" align="center">
            <template slot-scope="scope">
              <span v-text='scope.row[field]'></span>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script>
import { Chart } from "@antv/g2";

import { getVscodeEvent } from "../util/vscode";
let vscodeEvent;

export default {
  name: "status",
  data() {
    return {
      activePanel: "dashBoard",
      process: {
        fields: [],
        list: [],
        lock: false
      },
      dashBoard: {
        sessions: { data: [], lock: false, chart: null, previous: null },
        queries: { data: [], lock: false, chart: null, previous: null },
        traffic: { data: [], lock: false, chart: null, previous: null }
      }
    };
  },
  destroyed(){
      vscodeEvent.destroy()
  },
  mounted() {
    vscodeEvent = getVscodeEvent();
    function createChart(id, data) {
      const chart = new Chart({
        container: id,
        autoFit: true,
        height: 300
      });
      chart.data(data);
      chart
        .line()
        .position("now*value")
        .color("type")
        .size(2);
      chart.render();
      return chart;
    }

    function loadChart(id, chartOption, data, before) {
      const copy = JSON.parse(JSON.stringify(data));
      if (!chartOption.previous) {
        chartOption.previous = copy;
      }
      chartOption.data.push(...data);
      if (before) {
        before(data, chartOption.previous);
      }
      chartOption.previous = copy;
      if (!chartOption.chart) {
        chartOption.chart = createChart(id, chartOption.data);
      } else {
        if (chartOption.data.length >= data.length * 100) {
          for (let index = 0; index < data.length; index++) {
            chartOption.data.shift();
          }
        }
        chartOption.chart.changeData(chartOption.data);
      }
      chartOption.lock = false;
    }

    vscodeEvent
      .on("processList", data => {
        this.process.fields = data.fields;
        this.process.list = data.list;
      })
      .on("dashBoard", data => {
        loadChart("sessions", this.dashBoard.sessions, data.sessions);
        loadChart(
          "queries",
          this.dashBoard.queries,
          data.queries,
          (data, previous) => {
            for (let index = 0; index < previous.length; index++) {
              data[index].value = data[index].value - previous[index].value;
            }
          }
        );
        loadChart(
          "traffic",
          this.dashBoard.traffic,
          data.traffic,
          (data, previous) => {
            for (let index = 0; index < previous.length; index++) {
              data[index].value =
                (data[index].value - previous[index].value) / 1000 + "kb";
            }
          }
        );
      });

    vscodeEvent.emit("init");
    this.sendLoadProcessList();
    this.sendLoadDashBoard();
    setInterval(() => {
      this.sendLoadProcessList();
      this.sendLoadDashBoard();
    }, 1000);
  },
  methods: {
    sendLoadProcessList() {
      vscodeEvent.emit("processList");
    },
    sendLoadDashBoard() {
      if (this.dashBoard.sessions.lock) return;
      this.dashBoard.sessions.lock = true;
      vscodeEvent.emit("dashBoard");
    },
    changePannel() {
      switch (this.activePanel) {
        case "processList":
          this.sendLoadProcessList();
          break;
        case "dashBoard":
          this.sendLoadDashBoard();
          break;
      }
    }
  }
};
</script>

<style scoped>
.status-container {
  padding: 20px;
  /* background-color: var(--vscode-editor-background); */
  background-color: #f7f7f7 !important;
  font-family: "Helvetica Neue", Helvetica, "PingFang SC", "Hiragino Sans GB",
    "Microsoft YaHei", Arial, sans-serif;
}
</style>