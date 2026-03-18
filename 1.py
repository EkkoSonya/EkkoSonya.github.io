import os
import requests

API_KEY = os.getenv("LLM_API_KEY")
BASE_URL = os.getenv("LLM_BASE_URL")
MODEL = os.getenv("LLM_MODEL")

def test_chat_llm_api():
    if not API_KEY:
        raise ValueError("未读取到 LLM_API_KEY，请先设置环境变量")

    url = f"{BASE_URL}/v1/chat/completions"

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {API_KEY}"
    }

    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": "请简单回复：API 测试成功"}
        ],
        "temperature": 0
    }

    try:
        response = requests.post(url, headers=headers, json=payload, timeout=60)

        print("状态码:", response.status_code)
        print("响应内容:", response.text)

        if response.status_code == 200:
            data = response.json()
            print("接口调用成功")
            print("模型回复:", data["choices"][0]["message"]["content"])
        else:
            print("接口调用失败")

    except requests.exceptions.RequestException as e:
        print("请求异常:", e)

def test_response_llm_api():
    if not API_KEY:
        raise ValueError("未读取到 LLM_API_KEY")
    if not BASE_URL:
        raise ValueError("未读取到 LLM_BASE_URL")
    if not MODEL:
        raise ValueError("未读取到 LLM_MODEL")

    url = f"{BASE_URL}/v1/responses"

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {API_KEY}"
    }

    payload = {
        "model": MODEL,
        "input": "请简单回复：API 测试成功"
    }

    response = requests.post(url, headers=headers, json=payload, timeout=30)

    print("状态码:", response.status_code)
    print("响应内容:", response.text)

if __name__ == "__main__":
    test_chat_llm_api()