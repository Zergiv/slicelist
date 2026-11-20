"""Errores del lector, compartidos entre YouTube Music y Spotify."""


class ReaderError(Exception):
    def __init__(self, code: str, status: int):
        super().__init__(code)
        self.code = code
        self.status = status
