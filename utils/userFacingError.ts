function getRawErrorMessage(error: unknown) {
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = error.message;

    if (typeof message === "string" && message.trim().length > 0) {
      return message.trim();
    }
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message.trim();
  }

  return null;
}

export function getUserFacingSupabaseMessage(error: unknown, fallbackMessage: string) {
  const rawMessage = getRawErrorMessage(error);

  if (!rawMessage) {
    return fallbackMessage;
  }

  const normalizedMessage = rawMessage.replace(/\s+/g, " ").trim();

  if (/failed to fetch|fetch failed|networkerror|network request failed/i.test(normalizedMessage)) {
    return "서버에 연결하지 못했습니다. 네트워크 상태와 Supabase 설정을 확인해주세요.";
  }

  if (/permission denied|not authorized|forbidden|row-level security|jwt/i.test(normalizedMessage)) {
    return "이 작업을 수행할 권한이 없습니다. 로그인 상태 또는 권한 설정을 확인해주세요.";
  }

  if (/duplicate key/i.test(normalizedMessage)) {
    return "중복된 데이터가 있어 요청을 처리하지 못했습니다.";
  }

  if (/foreign key/i.test(normalizedMessage)) {
    return "연결된 기준 정보가 없어 요청을 처리하지 못했습니다. 프로젝트나 경비 유형을 다시 확인해주세요.";
  }

  if (/invalid input syntax/i.test(normalizedMessage)) {
    return "입력값 형식이 올바르지 않습니다. 입력한 내용을 다시 확인해주세요.";
  }

  return normalizedMessage.length > 220
    ? `${normalizedMessage.slice(0, 220).trim()}...`
    : normalizedMessage;
}
