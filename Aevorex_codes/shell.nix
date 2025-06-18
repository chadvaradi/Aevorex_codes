let
  pkgs = import <nixpkgs> {};
in
  pkgs.mkShell {
    buildInputs = [
      pkgs.python311Full
      pkgs.python311Packages.fastapi
      pkgs.python311Packages.jinja2
      pkgs.python311Packages.uvicorn
      pkgs.python311Packages.python-dotenv
      pkgs.python311Packages.httpx
    ];

    shellHook = ''
      export PYTHONPATH=$PWD
      echo "✅ AEVOREX fejlesztői környezet aktiválva."
    '';
  }