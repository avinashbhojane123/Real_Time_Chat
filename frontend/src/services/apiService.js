import axios from 'axios';

export async function uploadFileApi(baseUrl, file) {
  const formData = new FormData();
  formData.append('file', file);
  const cleanApiUrl = (baseUrl || '').replace(/\/+$/, '');

  const token =
    (typeof sessionStorage !== 'undefined' &&
      sessionStorage.getItem('sessionAuthToken')) ||
    '';

  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    headers['x-session-token'] = token;
  }

  const res = await axios.post(`${cleanApiUrl}/upload`, formData, { headers });
  return res.data;
}

export async function joinRoomApi(baseUrl, nickname, passcode) {
  const cleanApiUrl = (baseUrl || '').trim().replace(/\/+$/, '');
  const res = await axios.post(`${cleanApiUrl}/rooms/join`, {
    nickname: nickname.trim(),
    passcode: passcode.trim(),
  });
  return res.data;
}
