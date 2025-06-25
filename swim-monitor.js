const dotenv = require("dotenv");
dotenv.config();

const axios = require("axios");
const schedule = require("node-schedule");

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

// 상태 저장용
let previousState = {};

const sendDiscordNotification = async (message) => {
  try {
    await axios.post(DISCORD_WEBHOOK_URL, {
      content: message,
    });
  } catch (err) {
    console.error("❌ 디스코드 전송 실패:", err.message);
  }
};

const monitor = async () => {
  try {
    const response = await axios.post(
      "https://g.gfmc.kr/api/v3/frnt/gfmcs/lctr/list",
      {
        orgNo: "1",
        tOrgNo: "1",
        ctgGubun: "1",
        comCtgNm: "",
        comCtgCd: "216",
        outerComCtgCd: "216",
        edcStatus: "",
        strDayInfo: "",
        hourBankInfo: "",
        edcTargetAgeInfo: "",
        filterContsYn: "",
        memNo: "",
        pageIndex: "1",
        pageUnit: "9",
        edcPrgmNo: "",
        chkCtgLv2: "216",
        searchKeyword: "",
      },
      { headers: { "Content-Type": "application/json" } }
    );

    const list = response.data?.data?.list;
    if (!list) {
      console.log("❌ 강좌 목록 없음");
      return;
    }

    for (const item of list) {
      const name = item.edcPrgmNm;
      const total = item.statApplyCnt;
      const online = item.statApplyOnCnt;
      const offline = item.statApplyOffCnt;
      const applied = online + offline;
      const remain = total - applied;

      const prevRemain = previousState[name] ?? -1;

      if (remain > 0 && remain !== prevRemain) {
        const message = `📢 **[${name}]** 잔여좌석 **${remain}석** 발생!`;
        console.log(message);
        await sendDiscordNotification(message);
      }

      previousState[name] = remain;
    }
  } catch (err) {
    console.error("🚨 모니터링 실패:", err.message);
  }
};

// 랜덤 딜레이 추가
const runMonitorWithRandomDelay = async () => {
  await monitor(); // 한 번 실행

  // 55~75초 사이 랜덤 delay (ms)
  const delay = 55000 + Math.floor(Math.random() * 20000);

  setTimeout(runMonitorWithRandomDelay, delay);
};

// 시작 알림
sendDiscordNotification("✅ 수영 강좌 모니터링 실행 중 ✅").then(() => {
  console.log("⏱ 모니터링 시작됨 (1분 간격)");
  runMonitorWithRandomDelay();
});

// 종료 알림
process.on("SIGINT", async () => {
  await sendDiscordNotification("❌ 수영 강좌 모니터링 종료됨 ❌");
  console.log("🔻 종료됨");
  process.exit();
});

process.on("SIGTERM", async () => {
  await sendDiscordNotification("❌ 수영 강좌 모니터링 종료됨 ❌");
  console.log("🔻 종료됨");
  process.exit();
});
