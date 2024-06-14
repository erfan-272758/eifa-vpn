package main

import (
	"bytes"
	"encoding/json"
	"io"
	"io/ioutil"
	"log"
	"net/http"
	"strings"
)

func main() {
	http.HandleFunc("/proxy", handleProxyRequest)
	log.Fatal(http.ListenAndServe(":8081", nil))
}

type RequestBody struct {
	URL     string            `json:"url"`
	Method  string            `json:"method"`
	Body    interface{}       `json:"body"`
	Headers map[string]string `json:"headers"`
}

func handleProxyRequest(w http.ResponseWriter, r *http.Request) {
	authHeader := r.Header.Get("Authorization")
	if authHeader != "Basic YWRtaW46YWRtaW4=" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	if r.Method != http.MethodPost && r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var requestBody RequestBody
	err := json.NewDecoder(r.Body).Decode(&requestBody)
	if err != nil && err != io.EOF {
		http.Error(w, "Failed to decode request body", http.StatusBadRequest)
		return
	}

	if requestBody.Method == http.MethodPost && requestBody.Body == nil {
		http.Error(w, "Request body is required for POST method", http.StatusBadRequest)
		return
	}

	if requestBody.Method == http.MethodPost {
		requestBodyBytes, err := json.Marshal(requestBody.Body)
		if err != nil {
			http.Error(w, "Failed to marshal request body", http.StatusInternalServerError)
			return
		}

		req, err := http.NewRequest(http.MethodPost, requestBody.URL, bytes.NewBuffer(requestBodyBytes))
		if err != nil {
			log.Println("Failed to create request", err)
			http.Error(w, "Failed to create request", http.StatusInternalServerError)
			return
		}

		req.Body = ioutil.NopCloser(strings.NewReader(string(requestBodyBytes)))
		req.Header.Set("Content-Type", "application/json")

		for key, value := range requestBody.Headers {
			req.Header.Set(key, value)
		}

		client := http.DefaultClient
		resp, err := client.Do(req)
		if err != nil {
			log.Println("Failed to send request", err)
			http.Error(w, "Failed to send request", http.StatusInternalServerError)
			return
		}
		defer resp.Body.Close()

		// Copy the response headers to the proxy response
		for key, values := range resp.Header {
			for _, value := range values {
				w.Header().Add(key, value)
			}
		}

		w.WriteHeader(resp.StatusCode)
		_, err = io.Copy(w, resp.Body)
		if err != nil {
			log.Println("Failed to write response:", err)
		}
		return
	}

	if requestBody.Method == http.MethodGet {

		req, err := http.NewRequest(requestBody.Method, requestBody.URL, nil)
		if err != nil {
			log.Println("Failed to create request", err)
			http.Error(w, "Failed to create request", http.StatusInternalServerError)
			return
		}

		for key, value := range requestBody.Headers {
			req.Header.Set(key, value)
		}

		client := http.DefaultClient
		resp, err := client.Do(req)
		if err != nil {
			log.Println("Failed to send request", err)
			http.Error(w, "Failed to send request", http.StatusInternalServerError)
			return
		}
		defer resp.Body.Close()

		// Copy the response headers to the proxy response
		for key, values := range resp.Header {
			for _, value := range values {
				w.Header().Add(key, value)
			}
		}

		w.WriteHeader(resp.StatusCode)
		_, err = io.Copy(w, resp.Body)
		if err != nil {
			log.Println("Failed to write response:", err)
		}
		return
	}
}
