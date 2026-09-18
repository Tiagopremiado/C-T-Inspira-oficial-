# 1. Login as comando
echo "Login comando:"
RES=$(curl -s -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"username":"comando@inspira.com","password":"inspira2026"}')
echo $RES
TOKEN=$(echo $RES | jq -r .token)

# 2. Get Equipe
echo "\nGet Equipe:"
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/equipe | jq .

# 3. Create new user
echo "\nCreate user:"
CREATE_RES=$(curl -s -X POST http://localhost:3000/api/equipe -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"email":"teste2@inspira.com","password":"password123","nome_completo":"Teste Dois","whatsapp":"11999999999","funcao":"Instrutor"}')
echo $CREATE_RES
UID=$(echo $CREATE_RES | jq -r .user.id)

# 4. Login as new user
echo "\nLogin new user:"
RES2=$(curl -s -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"username":"teste2@inspira.com","password":"password123"}')
echo $RES2
TOKEN2=$(echo $RES2 | jq -r .token)

# 5. New user tries to get equipe (should fail)
echo "\nGet Equipe as new user:"
curl -s -H "Authorization: Bearer $TOKEN2" http://localhost:3000/api/equipe

# 6. Block user
echo "\n\nBlock user:"
curl -s -X PATCH http://localhost:3000/api/equipe/$UID -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"status":"Bloqueado"}'

# 7. Try login again
echo "\n\nLogin blocked user:"
curl -s -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"username":"teste2@inspira.com","password":"password123"}'

