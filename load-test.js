import http from "k6/http";
import { sleep, check } from "k6";

export const options = {
  stages: [
    { duration: "30s", target: 20 },
    { duration: "1m", target: 20 },
    { duration: "30s", target: 0 },
  ],
};

export default function () {
  const url = "https://yira-api-production.up.railway.app/api/v1/ia/chat";
  const payload = JSON.stringify({
    userId: "USER_TEST_ISO",
    message: "Bonjour Coach, test de charge en cours.",
    niveau: "N1"
  });

  const params = {
    headers: { "Content-Type": "application/json" },
  };

  const res = http.post(url, payload, params);

  check(res, {
    "Statut 201 (Succes)": (r) => r.status === 201,
  });

  sleep(1);
}