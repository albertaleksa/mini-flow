.PHONY: help install run test

UV ?= uv

help:
	@printf 'Targets:\n  make install  Install backend dependencies\n  make run      Start the backend with auto-reload\n  make test     Run backend tests\n'

install:
	cd backend && $(UV) sync

run:
	cd backend && $(UV) run uvicorn app.main:app --reload

test:
	cd backend && $(UV) run pytest
