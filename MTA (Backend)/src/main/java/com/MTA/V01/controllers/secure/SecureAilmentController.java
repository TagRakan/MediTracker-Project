package com.MTA.V01.controllers.secure;

import com.MTA.V01.payload.requests.AddAilmentRequest;
import com.MTA.V01.services.controllers.AilmentServices;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@CrossOrigin(origins = {"https://meditracker.fit","http://meditracker.fit", "smrtnmedi.netlify.app","https://www.meditracker.fit","http://meditracker.fit"}, maxAge = 3600)
@RequestMapping("/api/protected/ailment")
public class SecureAilmentController {

    @Autowired
    AilmentServices ailmentServices;

    @GetMapping("users/get/{id}")
    public ResponseEntity<?> getUserAilments(@PathVariable("id") Long userId){
        return ailmentServices.getUserAilments(userId);
    }

    @PostMapping("/users/add/{id}")
    public ResponseEntity<?> addUserAilment(@PathVariable("id") Long userId, @RequestBody @Valid AddAilmentRequest addAilmentRequest){
        return ailmentServices.addUserAilment(userId, addAilmentRequest);
    }

    @PutMapping("/users/update/{userId}/{ailmentId}")
    public ResponseEntity<?> updateUserAilment(@PathVariable("ailmentId") Long ailmentId, @PathVariable("userId") Long userId, @RequestBody @Valid AddAilmentRequest addAilmentRequest){
        return ailmentServices.updateUserAilment(ailmentId,userId,addAilmentRequest);
    }

    @DeleteMapping("/user/delete/{id}")
    public ResponseEntity<?> removeUserAilment(@PathVariable("id") Long ailmentId){
        return ailmentServices.removeUserAilment(ailmentId);
    }
}
