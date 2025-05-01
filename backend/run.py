from app import create_app, socketio

app = create_app()

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000,debug=True) //2025.5.1调试模式socketio.run(app, debug=True)-->socketio.run(app, host='0.0.0.0', port=5000, debug=True)
