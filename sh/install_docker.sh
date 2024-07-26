#!/bin/bash

# 更新软件包索引
sudo apt update

# 安装必要的软件包，允许 apt 使用 HTTPS
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common

# 添加 Docker 的官方 GPG 密钥
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# 设置 Docker 的稳定版存储库
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 更新软件包索引，包含新添加的 Docker 包
sudo apt update

# 安装 Docker CE（社区版）
sudo apt install -y docker-ce

# 启动 Docker 并将其设置为开机自启动
sudo systemctl start docker
sudo systemctl enable docker

# 验证 Docker 是否安装成功
docker_version=$(sudo docker --version)
if [[ $docker_version == Docker* ]]; then
  echo "Docker 安装成功：$docker_version"
else
  echo "Docker 安装失败，请检查上述步骤是否有误。"
  exit 1
fi

# 可选：将当前用户添加到 docker 组，以便非 root 用户也能运行 Docker 命令
sudo usermod -aG docker $USER
echo "请重新登录以使用户组变更生效。"

echo "Docker 安装完成！"
