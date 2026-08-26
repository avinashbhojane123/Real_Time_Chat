import axios from 'axios';

export async function uploadFileApi(baseUrl, file) {
  const formData = new FormData();
  formData.append('file', file);
  const cleanApiUrl = (baseUrl || '').replace(/\/+$/, '');
  const res = await axios.post(`${cleanApiUrl}/upload`, formData);
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
