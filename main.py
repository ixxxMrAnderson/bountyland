import asyncio
import os
from fastapi import FastAPI, HTTPException, Header

app = FastAPI(
    title="Decentralized Compute Demo API",
    description="A microservice with intentional flaws for agentic auditing demonstration."
)

# 模拟数据库：用户资产和商品价格
USER_DB = {
    "user_fred_001": {"balance": 100, "inventory": []},
    "user_hacker_999": {"balance": 5, "inventory": []}
}
PRODUCT_DB = {"premium_gpu_hours": 80}

# ⚠️ 漏洞 1：高危硬编码密钥（敏感信息泄露，极易被静态审计扫描捕获）
JWT_SECRET_KEY = "SUPER_SECRET_HACKATHON_DEMO_KEY_DO_NOT_USE_IN_PRODUCTION"

# ⚠️ 漏洞 2 的核心根源：错误地使用了全局变量来暂存用户状态
global_temp_balance = 0

@app.get("/")
async def root():
    return {"status": "online", "message": "Ready for Agent auditing demo."}

@app.post("/api/v1/purchase")
async def purchase_product(product_id: str, x_user_id: str = Header(None)):
    """
    模拟商品购买的 API 接口。
    存在严重的异步并发竞态条件漏洞（Race Condition）。
    """
    global global_temp_balance
    
    # 身份基础校验
    if not x_user_id or x_user_id not in USER_DB:
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    if product_id not in PRODUCT_DB:
        raise HTTPException(status_code=404, detail="Product not found")
        
    user_balance = USER_DB[x_user_id]["balance"]
    product_price = PRODUCT_DB[product_id]
    
    # 🚨 【高危漏洞触发点】：将当前用户余额存入全局变量
    global_temp_balance = user_balance
    
    # 模拟高并发下的数据库异步网络延迟/IO阻塞
    # 在这 0.5 秒内，如果另一个低余额用户发起请求，global_temp_balance 会被瞬间覆盖！
    await asyncio.sleep(0.5) 
    
    # 逻辑越权判断：此时的 global_temp_balance 可能已经是别的用户的余额了
    if global_temp_balance < product_price:
        raise HTTPException(status_code=400, detail="Insufficient balance")
        
    # 扣款并下发商品
    # 这会导致“张三买东西，扣了李四的钱”或者“低余额黑客利用高余额用户并发白嫖商品”
    USER_DB[x_user_id]["balance"] = global_temp_balance - product_price
    USER_DB[x_user_id]["inventory"].append(product_id)
    
    return {
        "status": "success", 
        "msg": f"Successfully purchased {product_id}",
        "current_balance": USER_DB[x_user_id]["balance"]
    }
