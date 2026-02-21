import asyncio
import httpx

async def main():
    async with httpx.AsyncClient(base_url='http://127.0.0.1:8000/api') as client:
        r = await client.post('/auth/login?venue_id=venue-caviar-bull&pin=1234')
        if r.status_code != 200:
            print('Login failed:', r.text)
            return
            
        token = r.json().get('token')
        headers = {'Authorization': f'Bearer {token}'}
        
        payload = {
            'venue_id': 'venue-caviar-bull',
            'order_type': 'dine_in',
            'table_id': 'counter-1'
        }
        
        for i in range(10):
            res = await client.post('/orders', json=payload, headers=headers)
            print(f'Request {i+1}: {res.status_code}', res.text if res.status_code != 201 else '')

asyncio.run(main())
