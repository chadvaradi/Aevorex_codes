#!/usr/bin/env python3
"""
Aevorex Modular Server Launcher
Indítja a megfelelő modult a backend servereivel
"""

import sys
import os
import subprocess
from pathlib import Path

# Projekt gyökér meghatározása
PROJECT_ROOT = Path(__file__).parent.absolute()
MODULES_DIR = PROJECT_ROOT / "modules"

# Konfiguráció betöltése a port meghatározásához
try:
    # A 'modules' könyvtárat hozzáadjuk a sys.path-hoz, hogy a config import működjön
    sys.path.insert(0, str(PROJECT_ROOT))
    from modules.financehub.backend.config import settings
    FINANCEHUB_PORT = settings.UVICORN.PORT
    print(f"✅ Successfully loaded configuration. FinanceHub port set to: {FINANCEHUB_PORT}")
except (ImportError, AttributeError) as e:
    print(f"⚠️  Could not load port from config: {e}. Using default port 8084.")
    FINANCEHUB_PORT = 8084

def start_financehub_frontend():
    """FinanceHUB StockAnalysis frontend with custom server for proper MIME types"""
    print("🎨 Starting FinanceHUB StockAnalysis Frontend Server...")
    
    try:
        stockanalysis_frontend_path = MODULES_DIR / "financehub" / "stockanalysis"
        if not stockanalysis_frontend_path.exists():
            print(f"❌ FinanceHub StockAnalysis directory not found: {stockanalysis_frontend_path}")
            return False
        
        # Use our custom server script
        server_script = stockanalysis_frontend_path / "server.py"
        if not server_script.exists():
            print(f"❌ Custom server script not found: {server_script}")
            return False
        
        os.chdir(stockanalysis_frontend_path)
        print(f"📁 Serving FinanceHub StockAnalysis from: {stockanalysis_frontend_path}")
        print("🔧 Using custom server with proper MIME types...")
        
        subprocess.run([
            sys.executable, "server.py", "8001"
        ], check=True)
        
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ FinanceHub StockAnalysis frontend server failed: {e}")
        return False
    except KeyboardInterrupt:
        print("⏹️ FinanceHub StockAnalysis frontend server stopped")
        return True
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

def start_financehub(port=None):
    """FinanceHUB backend indítása FastAPI-val"""
    print("💰 Starting FinanceHUB Backend Server...")
    
    # Port kezelés: Elsőbbséget élvez a parancssori argumentum,
    # majd a config fájl, végül a default.
    if port is None:
        port = FINANCEHUB_PORT
    port = str(port)
    
    try:
        # Projekt gyökérkönyvtár meghatározása
        original_cwd = os.getcwd()
        project_root = Path(__file__).parent.resolve()  # Aevorex_codes gyökér
        financehub_root = project_root / "modules" / "financehub"
        backend_dir = financehub_root / "backend"
        
        print(f"📁 Project root: {project_root}")
        print(f"📁 FinanceHUB root: {financehub_root}")
        print(f"📁 Backend directory: {backend_dir}")
        
        # Ellenőrzések
        if not backend_dir.exists():
            print(f"❌ Backend directory not found: {backend_dir}")
            return False
        
        main_py_path = backend_dir / "main.py"
        if not main_py_path.exists():
            print(f"❌ main.py not found: {main_py_path}")
            return False
        
        # Working directory váltás a backend könyvtárra
        os.chdir(backend_dir)
        print(f"🔄 Changed working directory to: {backend_dir}")
        
        # Környezeti változók beállítása
        env = os.environ.copy()
        current_pythonpath = env.get('PYTHONPATH', '')
        
        # Projekt gyökér és FinanceHUB gyökér hozzáadása a PYTHONPATH-hoz
        paths_to_add = [str(project_root), str(financehub_root)]
        if current_pythonpath:
            env['PYTHONPATH'] = f"{':'.join(paths_to_add)}:{current_pythonpath}"
        else:
            env['PYTHONPATH'] = ':'.join(paths_to_add)
        
        print(f"🔧 PYTHONPATH set to: {env['PYTHONPATH']}")
        
        # Launch Uvicorn
        print(f"⚡ Starting Uvicorn server on port {port}...")
        
        # Build command with dynamic reload directories
        backend_main_module = "main"  # FastAPI app definition in main.py
        cmd = [
            sys.executable,
            "-m",
            "uvicorn",
            f"{backend_main_module}:app",
            "--host",
            "0.0.0.0",
            "--port",
            str(port),
        ]
        
        # Add reload options only if enabled
        if "--reload" in sys.argv:
            cmd.append("--reload")
        
        # Uvicorn indítása a backend könyvtárból
        result = subprocess.run(cmd, env=env, check=False)
        
        return result.returncode == 0
        
    except subprocess.CalledProcessError as e:
        print(f"❌ Backend start failed: {e}")
        return False
    except KeyboardInterrupt:
        print("⏹️ Server stopped by user")
        return True
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False
    finally:
        # Visszatérés az eredeti working directory-ba
        os.chdir(original_cwd)

def start_mainpage():
    """MainPage static server indítása"""
    print("🏠 Starting MainPage Server...")
    
    try:
        # Simple HTTP server a mainpage-hez
        mainpage_path = MODULES_DIR / "mainpage" / "frontend"
        if mainpage_path.exists():
            os.chdir(mainpage_path)
            print(f"📁 Serving MainPage from: {mainpage_path}")
            subprocess.run([
                sys.executable, "-m", "http.server", "3000"
            ], check=True)
        else:
            print(f"❌ MainPage directory not found: {mainpage_path}")
            return False
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ MainPage server failed: {e}")
        return False
    except KeyboardInterrupt:
        print("⏹️ MainPage server stopped")
        return True

def start_healthhub_medical():
    """HealthHUB Medical AI frontend server"""
    print("🏥 Starting HealthHUB Medical AI Server...")
    
    try:
        medical_path = MODULES_DIR / "healthhub" / "medical-ai"
        if medical_path.exists():
            os.chdir(medical_path)
            print(f"📁 Serving HealthHUB Medical AI from: {medical_path}")
            subprocess.run([
                sys.executable, "-m", "http.server", "3001"
            ], check=True)
        else:
            print(f"❌ HealthHUB Medical AI directory not found: {medical_path}")
            return False
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ HealthHUB Medical AI server failed: {e}")
        return False
    except KeyboardInterrupt:
        print("⏹️ HealthHUB Medical AI server stopped")
        return True

def start_contenthub_creator():
    """ContentHUB Hub server - új moduláris architektúra"""
    print("📝 Starting ContentHUB Hub Server...")
    
    try:
        hub_path = MODULES_DIR / "contenthub" / "hub"
        if not hub_path.exists():
            print(f"❌ ContentHUB Hub directory not found: {hub_path}")
            return False
            
        os.chdir(hub_path)
        
        # 🔧 AUTOMATIKUS CSS BUILD
        build_script = hub_path / "build_contenthub_css.py"
        if build_script.exists():
            print("🎨 Building CSS bundle automatically...")
            try:
                result = subprocess.run([
                    sys.executable, "build_contenthub_css.py"
                ], check=True, capture_output=True, text=True)
                print("✅ CSS bundle built successfully!")
                if result.stdout:
                    print(f"📝 Build output: {result.stdout.strip()}")
            except subprocess.CalledProcessError as e:
                print(f"⚠️ CSS build failed: {e}")
                if e.stdout:
                    print(f"📝 Build stdout: {e.stdout}")
                if e.stderr:
                    print(f"❌ Build stderr: {e.stderr}")
                print("🔄 Continuing with server start...")
        else:
            print(f"⚠️ CSS build script not found: {build_script}")
        
        print(f"📁 Serving ContentHUB Hub from: {hub_path}")
        print("🎯 Available at: http://localhost:3002")
        print("🔗 Hub modules accessible from main interface")
        subprocess.run([
            sys.executable, "-m", "http.server", "3002"
        ], check=True)
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ ContentHUB Hub server failed: {e}")
        return False
    except KeyboardInterrupt:
        print("⏹️ ContentHUB Hub server stopped")
        return True

def start_contenthub_module(module_name):
    """Indítja az adott ContentHUB kismodult"""
    print(f"📝 Starting ContentHUB {module_name.title()} Module...")
    
    try:
        module_path = MODULES_DIR / "contenthub" / "smallmodules" / module_name
        if module_path.exists():
            os.chdir(module_path)
            print(f"📁 Serving ContentHUB {module_name.title()} from: {module_path}")
            # Dynamic port allocation based on module
            port_map = {
                "prompt-studio": 3021,
                "caption-master": 3022,
                "visual-prompter": 3023,
                "audio-scripter": 3024,
                "brand-templater": 3025,
                "workflow-manager": 3026
            }
            port = port_map.get(module_name, 3020)
            print(f"🎯 Available at: http://localhost:{port}")
            subprocess.run([
                sys.executable, "-m", "http.server", str(port)
            ], check=True)
        else:
            print(f"❌ ContentHUB {module_name} module not found: {module_path}")
            return False
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ ContentHUB {module_name} module failed: {e}")
        return False
    except KeyboardInterrupt:
        print(f"⏹️ ContentHUB {module_name} module stopped")
        return True

def start_aihub_chatbot():
    """AIHUB Chatbot frontend server"""
    print("🤖 Starting AIHUB Chatbot Server...")
    
    try:
        chatbot_path = MODULES_DIR / "aihub" / "chatbot"
        if chatbot_path.exists():
            os.chdir(chatbot_path)
            print(f"📁 Serving AIHUB Chatbot from: {chatbot_path}")
            subprocess.run([
                sys.executable, "-m", "http.server", "3003"
            ], check=True)
        else:
            print(f"❌ AIHUB Chatbot directory not found: {chatbot_path}")
            return False
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ AIHUB Chatbot server failed: {e}")
        return False
    except KeyboardInterrupt:
        print("⏹️ AIHUB Chatbot server stopped")
        return True

def show_status():
    """Megmutatja az elérhető modulokat és portokat"""
    print("🌟 Aevorex Modular Platform Status")
    print("=" * 50)
    
    modules_status = []
    
    # Ellenőrizzük az egyes modulokat
    for module_name, submodule, port, description in [
        ("mainpage", "", "3000", "Main Landing Page"),
        ("financehub", "backend", str(FINANCEHUB_PORT), "Financial Analysis (FastAPI)"),
        ("financehub", "stockanalysis", "8001", "Stock Analysis Frontend"),
        ("aihub", "chatbot", "3003", "AI Chatbot Frontend"),
        ("healthhub", "medical-ai", "3001", "Medical AI Frontend"),
        ("contenthub", "hub", "3002", "Content Hub (Main Interface)"),
        ("contenthub", "prompt-studio", "3021", "Prompt Studio Module"),
        ("contenthub", "caption-master", "3022", "Caption Master Module"),
        ("contenthub", "visual-prompter", "3023", "Visual Prompter Module")
    ]:
        if submodule:
            module_path = MODULES_DIR / module_name / submodule
            display_name = f"{module_name}/{submodule}"
        else:
            module_path = MODULES_DIR / module_name / "frontend"
            display_name = module_name
        
        status = "✅" if module_path.exists() else "❌"
        url = f"http://localhost:{port}" if status == "✅" else "N/A"
        
        modules_status.append(f"{status} {display_name:20} | {port:4} | {description:25} | {url}")
    
    print("\n📊 Available Modules:")
    print("Status | Module               | Port | Description              | URL")
    print("-" * 80)
    for status in modules_status:
        print(status)
    
    print(f"\n📁 Project Root: {PROJECT_ROOT}")
    print(f"📂 Modules Directory: {MODULES_DIR}")
    print(f"\n💡 New modular structure:")
    print("   - financehub/stockanalysis  (main stock analysis)")
    print("   - financehub/portfolio      (future: portfolio management)")
    print("   - financehub/watchlist      (future: watchlist features)")
    print("   - aihub/chatbot            (main AI chat interface)")
    print("   - aihub/models             (future: model management)")
    print("   - healthhub/medical-ai     (main medical AI)")
    print("   - contenthub/hub           (main content hub interface)")
    print("   - contenthub/smallmodules  (specialized content tools)")

def main():
    print("🌟 Aevorex Modular Platform Launcher")
    print("=" * 50)
    
    if len(sys.argv) < 2:
        print("Usage: python start_server.py [module|command] [--port PORT]")
        print("\nAvailable modules:")
        print("  financehub                - Financial analysis backend (port 8000)")
        print("  financehub-stockanalysis  - Stock analysis frontend (port 8001)")
        print("  aihub-chatbot            - AI chatbot frontend (port 3003)")
        print("  healthhub-medical        - Medical AI frontend (port 3001)")
        print("  contenthub-creator       - Content hub main interface (port 3002)")
        print("  contenthub-prompt        - Prompt Studio module (port 3021)")
        print("  contenthub-caption       - Caption Master module (port 3022)")
        print("  contenthub-visual        - Visual Prompter module (port 3023)")
        print("  contenthub-audio         - Audio Scripter module (port 3024)")
        print("  contenthub-brand         - Brand Templater module (port 3025)")
        print("  contenthub-workflow      - Workflow Manager module (port 3026)")
        print("  mainpage                 - Main landing page (port 3000)")
        print("\nLegacy commands (deprecated):")
        print("  financehub-frontend      - Use financehub-stockanalysis instead")
        print("  healthhub               - Use healthhub-medical instead")
        print("  contenthub              - Use contenthub-creator instead")
        print("  aihub                   - Use aihub-chatbot instead")
        print("\nCommands:")
        print("  status                  - Show platform status")
        print("  all                     - Show all available modules")
        print("\nOptions:")
        print("  --port PORT             - Specify custom port (for financehub backend)")
        return
    
    command = sys.argv[1].lower()
    
    # Port argumentum kezelése
    custom_port = None
    if "--port" in sys.argv:
        try:
            port_index = sys.argv.index("--port")
            if port_index + 1 < len(sys.argv):
                custom_port = sys.argv[port_index + 1]
                print(f"🔧 Using custom port: {custom_port}")
            else:
                print("⚠️ --port parameter requires a value, using default port")
        except (ValueError, IndexError):
            print("⚠️ Invalid --port parameter, using default port")
    
    if command == "financehub":
        start_financehub(port=custom_port)
    elif command == "financehub-stockanalysis" or command == "financehub-frontend":
        start_financehub_frontend()
    elif command == "aihub-chatbot" or command == "aihub":
        start_aihub_chatbot()
    elif command == "healthhub-medical" or command == "healthhub":
        start_healthhub_medical()
    elif command == "contenthub-creator" or command == "contenthub":
        start_contenthub_creator()
    elif command.startswith("contenthub-"):
        module_name = command.replace("contenthub-", "")
        module_map = {
            "prompt": "prompt-studio",
            "caption": "caption-master", 
            "visual": "visual-prompter",
            "audio": "audio-scripter",
            "brand": "brand-templater",
            "workflow": "workflow-manager"
        }
        actual_module = module_map.get(module_name)
        if actual_module:
            start_contenthub_module(actual_module)
        else:
            print(f"❌ Unknown ContentHUB module: {module_name}")
            print("Available modules: prompt, caption, visual, audio, brand, workflow")
    elif command == "mainpage":
        start_mainpage()
    elif command == "status":
        show_status()
    elif command == "all":
        show_status()
    else:
        print(f"❌ Unknown module/command: {command}")
        print("Run 'python start_server.py' without arguments to see available options.")

if __name__ == "__main__":
    main() 