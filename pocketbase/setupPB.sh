#!/bin/bash

# Set default values if environment variables are not already set
TARGETOS=${TARGETOS:-$(uname | tr '[:upper:]' '[:lower:]')}
TARGETARCH=${TARGETARCH:-$(uname -m)}
TARGETVARIANT=""

echo "🚀 Starting PocketBase setup..."
echo "Detected OS: $TARGETOS"
echo "Detected Architecture: $TARGETARCH"

# Remove pb_data directory if it exists
if [ -d "pocketbase/pb_data" ]; then
	echo "🗑️ Removing existing pb_data directory..."
	rm -rf pocketbase/pb_data
else
	echo "ℹ️ No existing pb_data directory found."
fi

# Remove the pocketbase executable if it exists
if [ -f "pocketbase/pocketbase" ]; then
	echo "🗑️ Removing existing PocketBase executable..."
	rm pocketbase/pocketbase
else
	echo "ℹ️ No existing PocketBase executable found."
fi

# Install unzip and wget if they are not already installed based on the OS
if [[ "$TARGETOS" == "linux" ]]; then
	echo "🔍 Checking for required tools (unzip, wget) on Linux..."
	if ! command -v unzip &>/dev/null; then
		echo "🔄 Installing unzip..."
		apt-get update
		apt-get install -y unzip
	else
		echo "✅ unzip is already installed."
	fi
	if ! command -v wget &>/dev/null; then
		echo "🔄 Installing wget..."
		apt-get update
		apt-get install -y wget
	else
		echo "✅ wget is already installed."
	fi
elif [[ "$TARGETOS" == "darwin" ]]; then
	echo "🔍 Checking for required tools (unzip, wget) on macOS..."
	if ! command -v unzip &>/dev/null; then
		echo "🔄 Installing unzip..."
		brew install unzip
	else
		echo "✅ unzip is already installed."
	fi
	if ! command -v wget &>/dev/null; then
		echo "🔄 Installing wget..."
		brew install wget
	else
		echo "✅ wget is already installed."
	fi
fi

# Specify PocketBase version
VERSION=${VERSION:-0.22.20}
echo "🛠️ Using PocketBase version: $VERSION"

# Set architecture based on uname output for the GitHub Action runner
if [[ "$TARGETARCH" == "x86_64" ]]; then
	TARGETARCH="amd64"
elif [[ "$TARGETARCH" == "aarch64" ]]; then
	TARGETARCH="arm64"
fi

# Construct the URL for downloading PocketBase
BUILDX_ARCH="${TARGETOS}_${TARGETARCH}${TARGETVARIANT}"
POCKETBASE_URL="https://github.com/pocketbase/pocketbase/releases/download/v${VERSION}/pocketbase_${VERSION}_${BUILDX_ARCH}.zip"

# Download and unzip PocketBase
echo "📥 Downloading PocketBase from ${POCKETBASE_URL}..."
if wget $POCKETBASE_URL -O pocketbase/pocketbase.zip; then
	echo "✅ Download successful."
else
	echo "🚨 Error downloading PocketBase from ${POCKETBASE_URL}."
	exit 1
fi

echo "📦 Unzipping PocketBase..."
if unzip pocketbase/pocketbase.zip -d pocketbase; then
	echo "✅ Unzip successful."
else
	echo "🚨 Error unzipping PocketBase."
	exit 1
fi

chmod +x pocketbase/pocketbase

# Remove ChangeLog and LICENSE files
echo "🗑️ Removing unnecessary files (CHANGELOG.md, LICENSE)..."
rm pocketbase/CHANGELOG.md pocketbase/LICENSE pocketbase/LICENSE.md pocketbase/pocketbase.zip

# Ensure pb_migrations exists; if not, exit with an error
if [ ! -d "pocketbase/pb_migrations" ]; then
	echo "🚨 Error: pocketbase/pb_migrations directory not found. Please ensure the directory exists."
	exit 1
fi

chmod +x pocketbase/pocketbase

echo "🎉 PocketBase setup complete!"
